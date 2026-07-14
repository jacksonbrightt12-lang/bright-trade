"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client/runtime/client");
const prisma_1 = require("../lib/prisma");
const priceEngine_1 = require("../services/priceEngine");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
async function getAccount(userId, accountType = "DEMO") {
    return prisma_1.prisma.account.findFirst({
        where: { userId, type: accountType },
    });
}
router.get("/positions", auth_1.requireAuth, async (req, res) => {
    const accountType = req.query.accountType || "DEMO";
    const status = req.query.status || "OPEN";
    const account = await getAccount(req.user.id, accountType);
    if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
    }
    const positions = await prisma_1.prisma.position.findMany({
        where: {
            accountId: account.id,
            status: status.toUpperCase(),
        },
        include: { instrument: { include: { quoteData: true } } },
        orderBy: { openedAt: "desc" },
    });
    res.json({
        positions: positions.map((pos) => {
            const current = Number(pos.instrument.quoteData?.bid ?? pos.openPrice);
            const pnl = pos.status === "OPEN"
                ? (0, priceEngine_1.calculatePnL)(pos.type, Number(pos.volume), Number(pos.openPrice), current, pos.instrument.category)
                : Number(pos.pnl);
            return {
                id: pos.id,
                symbol: pos.instrument.symbol.replace(/(.{3})(.{3})/, "$1/$2"),
                rawSymbol: pos.instrument.symbol,
                type: pos.type === "BUY" ? "Buy" : "Sell",
                volume: Number(pos.volume),
                openPrice: Number(pos.openPrice),
                currentPrice: current,
                pnl,
                stopLoss: pos.stopLoss ? Number(pos.stopLoss) : null,
                takeProfit: pos.takeProfit ? Number(pos.takeProfit) : null,
                openTime: pos.openedAt,
                status: pos.status.toLowerCase(),
            };
        }),
    });
});
router.get("/orders", auth_1.requireAuth, async (req, res) => {
    const accountType = req.query.accountType || "DEMO";
    const account = await getAccount(req.user.id, accountType);
    if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
    }
    const orders = await prisma_1.prisma.order.findMany({
        where: { accountId: account.id, status: "PENDING" },
        include: { instrument: true },
        orderBy: { createdAt: "desc" },
    });
    res.json({
        orders: orders.map((order) => ({
            id: order.id,
            symbol: order.instrument.symbol.replace(/(.{3})(.{3})/, "$1/$2"),
            type: order.type === "BUY" ? "Buy" : "Sell",
            volume: Number(order.volume),
            price: Number(order.price),
            orderType: order.orderType,
            createdTime: order.createdAt,
            status: order.status.toLowerCase(),
        })),
    });
});
router.post("/open", auth_1.requireAuth, async (req, res) => {
    const { symbol, type, volume, stopLoss, takeProfit, orderType = "MARKET", limitPrice, accountType = "DEMO", } = req.body;
    if (!symbol || !type || !volume || volume <= 0) {
        res.status(400).json({ error: "Symbol, type, and volume are required" });
        return;
    }
    const account = await getAccount(req.user.id, accountType);
    if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
    }
    const instrument = await (0, priceEngine_1.getQuoteForSymbol)(symbol);
    if (!instrument?.quoteData) {
        res.status(404).json({ error: "Instrument not found" });
        return;
    }
    const openPrice = orderType === "LIMIT" && limitPrice
        ? limitPrice
        : type === "BUY"
            ? Number(instrument.quoteData.ask)
            : Number(instrument.quoteData.bid);
    const marginRequired = volume *
        openPrice *
        (instrument.category === "FOREX" ? 100000 : 100) *
        0.01;
    if (Number(account.balance) < marginRequired) {
        res.status(400).json({ error: "Insufficient margin" });
        return;
    }
    if (orderType === "LIMIT") {
        const order = await prisma_1.prisma.order.create({
            data: {
                accountId: account.id,
                instrumentId: instrument.id,
                type,
                orderType: "LIMIT",
                volume: new client_1.Decimal(volume),
                price: new client_1.Decimal(openPrice),
                status: "PENDING",
            },
            include: { instrument: true },
        });
        res.status(201).json({
            order: {
                id: order.id,
                symbol: order.instrument.symbol,
                type: order.type,
                volume: Number(order.volume),
                price: Number(order.price),
                status: order.status,
            },
        });
        return;
    }
    const position = await prisma_1.prisma.position.create({
        data: {
            accountId: account.id,
            instrumentId: instrument.id,
            type,
            volume: new client_1.Decimal(volume),
            openPrice: new client_1.Decimal(openPrice),
            stopLoss: stopLoss ? new client_1.Decimal(stopLoss) : undefined,
            takeProfit: takeProfit ? new client_1.Decimal(takeProfit) : undefined,
            status: "OPEN",
        },
        include: { instrument: true },
    });
    await prisma_1.prisma.account.update({
        where: { id: account.id },
        data: { marginUsed: { increment: marginRequired } },
    });
    res.status(201).json({
        position: {
            id: position.id,
            symbol: position.instrument.symbol,
            type: position.type,
            volume: Number(position.volume),
            openPrice: Number(position.openPrice),
            status: position.status,
        },
    });
});
router.post("/positions/:id/close", auth_1.requireAuth, async (req, res) => {
    const accountType = req.body.accountType || "DEMO";
    const positionId = String(req.params.id);
    const account = await getAccount(req.user.id, accountType);
    if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
    }
    const position = await prisma_1.prisma.position.findFirst({
        where: { id: positionId, accountId: account.id, status: "OPEN" },
    });
    if (!position) {
        res.status(404).json({ error: "Position not found" });
        return;
    }
    const instrument = await prisma_1.prisma.instrument.findUnique({
        where: { id: position.instrumentId },
        include: { quoteData: true },
    });
    if (!instrument) {
        res.status(404).json({ error: "Instrument not found" });
        return;
    }
    const closePrice = Number(instrument.quoteData?.bid ?? position.openPrice);
    const pnl = (0, priceEngine_1.calculatePnL)(position.type, Number(position.volume), Number(position.openPrice), closePrice, instrument.category);
    const marginReleased = Number(position.volume) *
        Number(position.openPrice) *
        (instrument.category === "FOREX" ? 100000 : 100) *
        0.01;
    const [updatedPosition] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.position.update({
            where: { id: position.id },
            data: {
                status: "CLOSED",
                closePrice: new client_1.Decimal(closePrice),
                pnl: new client_1.Decimal(pnl),
                closedAt: new Date(),
            },
        }),
        prisma_1.prisma.account.update({
            where: { id: account.id },
            data: {
                balance: { increment: pnl },
                marginUsed: { decrement: marginReleased },
            },
        }),
        prisma_1.prisma.transaction.create({
            data: {
                accountId: account.id,
                type: "TRADE",
                amount: new client_1.Decimal(pnl),
                description: `Closed ${instrument.symbol} ${position.type}`,
                status: "COMPLETED",
            },
        }),
    ]);
    res.json({
        position: {
            id: updatedPosition.id,
            pnl,
            closePrice,
            status: "closed",
        },
    });
});
router.delete("/orders/:id", auth_1.requireAuth, async (req, res) => {
    const accountType = req.query.accountType || "DEMO";
    const orderId = String(req.params.id);
    const account = await getAccount(req.user.id, accountType);
    if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
    }
    const order = await prisma_1.prisma.order.findFirst({
        where: { id: orderId, accountId: account.id, status: "PENDING" },
    });
    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    await prisma_1.prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
    });
    res.json({ message: "Order cancelled" });
});
exports.default = router;
