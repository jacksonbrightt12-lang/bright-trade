"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client/runtime/client");
const prisma_1 = require("../lib/prisma");
const priceEngine_1 = require("../services/priceEngine");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
async function getUserAccount(userId, accountType = "DEMO") {
    return prisma_1.prisma.account.findFirst({
        where: { userId, type: accountType },
        include: {
            positions: {
                where: { status: "OPEN" },
                include: { instrument: { include: { quoteData: true } } },
            },
        },
    });
}
async function computeAccountStats(accountId) {
    const account = await prisma_1.prisma.account.findUnique({
        where: { id: accountId },
        include: {
            positions: {
                where: { status: "OPEN" },
                include: { instrument: { include: { quoteData: true } } },
            },
        },
    });
    if (!account)
        return null;
    let unrealizedPnL = 0;
    let marginUsed = 0;
    for (const pos of account.positions) {
        const current = Number(pos.instrument.quoteData?.bid ?? pos.openPrice);
        const pnl = (0, priceEngine_1.calculatePnL)(pos.type, Number(pos.volume), Number(pos.openPrice), current, pos.instrument.category);
        unrealizedPnL += pnl;
        marginUsed += Number(pos.volume) * current * (pos.instrument.category === "FOREX" ? 100000 : 100) * 0.01;
    }
    const balance = Number(account.balance);
    const equity = balance + unrealizedPnL;
    return {
        balance,
        equity: Number(equity.toFixed(2)),
        unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
        marginUsed: Number(marginUsed.toFixed(2)),
        freeMargin: Number((equity - marginUsed).toFixed(2)),
        accountType: account.type,
        currency: account.currency,
    };
}
router.get("/summary", auth_1.requireAuth, async (req, res) => {
    const accountType = req.query.accountType || "DEMO";
    const account = await getUserAccount(req.user.id, accountType);
    if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
    }
    const stats = await computeAccountStats(account.id);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayProfit = await prisma_1.prisma.transaction.aggregate({
        where: {
            accountId: account.id,
            type: "TRADE",
            createdAt: { gte: todayStart },
        },
        _sum: { amount: true },
    });
    const recentTransactions = await prisma_1.prisma.transaction.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: "desc" },
        take: 5,
    });
    const openPositions = account.positions.map((pos) => {
        const current = Number(pos.instrument.quoteData?.bid ?? pos.openPrice);
        const pnl = (0, priceEngine_1.calculatePnL)(pos.type, Number(pos.volume), Number(pos.openPrice), current, pos.instrument.category);
        return {
            id: pos.id,
            symbol: pos.instrument.symbol.replace(/(.{3})(.{3})/, "$1/$2"),
            type: pos.type === "BUY" ? "Buy" : "Sell",
            volume: Number(pos.volume),
            openPrice: Number(pos.openPrice),
            currentPrice: current,
            pnl,
            openTime: pos.openedAt,
            status: 'open',
        };
    });
    res.json({
        ...stats,
        profitToday: Number(todayProfit._sum.amount ?? 0),
        openPositions,
        recentTransactions: recentTransactions.map((t) => ({
            id: t.id,
            type: t.type.toLowerCase(),
            title: t.type === "DEPOSIT" ? "Deposit" : t.type === "WITHDRAWAL" ? "Withdrawal" : "Trade",
            description: t.description,
            amount: Number(t.amount),
            date: t.createdAt,
            status: t.status,
        })),
    });
});
router.get("/accounts", auth_1.requireAuth, async (req, res) => {
    const accounts = await prisma_1.prisma.account.findMany({
        where: { userId: req.user.id },
        select: { id: true, type: true, balance: true, currency: true },
    });
    res.json({
        accounts: accounts.map((a) => ({
            ...a,
            balance: Number(a.balance),
        })),
    });
});
router.post("/deposit", auth_1.requireAuth, async (req, res) => {
    const { amount, method, accountType = "DEMO" } = req.body;
    if (!amount || amount <= 0) {
        res.status(400).json({ error: "Valid amount is required" });
        return;
    }
    const account = await getUserAccount(req.user.id, accountType);
    if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
    }
    const [updatedAccount, transaction] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.account.update({
            where: { id: account.id },
            data: { balance: { increment: amount } },
        }),
        prisma_1.prisma.transaction.create({
            data: {
                accountId: account.id,
                type: "DEPOSIT",
                amount: new client_1.Decimal(amount),
                method: method || "bank",
                description: `Deposit via ${method || "bank transfer"}`,
                status: "COMPLETED",
            },
        }),
    ]);
    res.status(201).json({
        balance: Number(updatedAccount.balance),
        transaction: {
            id: transaction.id,
            amount: Number(transaction.amount),
            type: transaction.type,
            createdAt: transaction.createdAt,
        },
    });
});
router.post("/withdraw", auth_1.requireAuth, async (req, res) => {
    const { amount, method, accountType = "DEMO" } = req.body;
    if (!amount || amount <= 0) {
        res.status(400).json({ error: "Valid amount is required" });
        return;
    }
    const account = await getUserAccount(req.user.id, accountType);
    if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
    }
    if (Number(account.balance) < amount) {
        res.status(400).json({ error: "Insufficient balance" });
        return;
    }
    const [updatedAccount, transaction] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.account.update({
            where: { id: account.id },
            data: { balance: { decrement: amount } },
        }),
        prisma_1.prisma.transaction.create({
            data: {
                accountId: account.id,
                type: "WITHDRAWAL",
                amount: new client_1.Decimal(-amount),
                method: method || "bank",
                description: `Withdrawal via ${method || "bank transfer"}`,
                status: "COMPLETED",
            },
        }),
    ]);
    res.status(201).json({
        balance: Number(updatedAccount.balance),
        transaction: {
            id: transaction.id,
            amount: Number(transaction.amount),
            type: transaction.type,
            createdAt: transaction.createdAt,
        },
    });
});
router.get("/transactions", auth_1.requireAuth, async (req, res) => {
    const accountType = req.query.accountType || "DEMO";
    const type = req.query.type;
    const account = await getUserAccount(req.user.id, accountType);
    if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
    }
    const transactions = await prisma_1.prisma.transaction.findMany({
        where: {
            accountId: account.id,
            ...(type && type !== "all"
                ? { type: type.toUpperCase() }
                : {}),
        },
        orderBy: { createdAt: "desc" },
    });
    res.json({
        transactions: transactions.map((t) => ({
            id: t.id,
            type: t.type.toLowerCase(),
            title: t.type === "DEPOSIT"
                ? "Deposit"
                : t.type === "WITHDRAWAL"
                    ? "Withdrawal"
                    : "Trade Profit",
            description: t.description,
            amount: Number(t.amount),
            date: t.createdAt,
            status: t.status,
            method: t.method,
        })),
    });
});
exports.default = router;
