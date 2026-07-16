import { Router, type Request, type Response } from "express";
import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "../lib/prisma";
import { calculatePnL, getQuoteForSymbol } from "../services/priceEngine";
import type { AuthRequest } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";

const router = Router();

async function getAccount(userId: string, accountType = "DEMO") {
  return prisma.account.findFirst({
    where: { userId, type: accountType as "DEMO" | "LIVE" },
  });
}

router.get("/positions", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountType = (req.query.accountType as string) || "DEMO";
  const status = (req.query.status as string) || "OPEN";
  const account = await getAccount(req.user!.id, accountType);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const positions = await prisma.position.findMany({
    where: {
      accountId: account.id,
      status: status.toUpperCase() as "OPEN" | "CLOSED",
    },
    include: { instrument: { include: { quoteData: true } } },
    orderBy: { openedAt: "desc" },
  });

  res.json({
    positions: positions.map((pos) => {
      const current = Number(pos.instrument.quoteData?.bid ?? pos.openPrice);
      const pnl =
        pos.status === "OPEN"
          ? calculatePnL(
              pos.type,
              Number(pos.volume),
              Number(pos.openPrice),
              current,
              pos.instrument.category
            )
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

router.get("/orders", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountType = (req.query.accountType as string) || "DEMO";
  const account = await getAccount(req.user!.id, accountType);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const orders = await prisma.order.findMany({
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

router.post("/open", requireAuth, async (req: AuthRequest, res: Response) => {
  const {
    symbol,
    type,
    volume,
    stopLoss,
    takeProfit,
    orderType = "MARKET",
    limitPrice,
    accountType = "DEMO",
  } = req.body as {
    symbol?: string;
    type?: "BUY" | "SELL";
    volume?: number;
    stopLoss?: number;
    takeProfit?: number;
    orderType?: "MARKET" | "LIMIT";
    limitPrice?: number;
    accountType?: string;
  };

  if (!symbol || !type || !volume || volume <= 0) {
    res.status(400).json({ error: "Symbol, type, and volume are required" });
    return;
  }

  const account = await getAccount(req.user!.id, accountType);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const instrument = await getQuoteForSymbol(symbol);
  if (!instrument?.quoteData) {
    res.status(404).json({ error: "Instrument not found" });
    return;
  }

  const openPrice =
    orderType === "LIMIT" && limitPrice
      ? limitPrice
      : type === "BUY"
        ? Number(instrument.quoteData.ask)
        : Number(instrument.quoteData.bid);

  const marginRequired =
    volume *
    openPrice *
    (instrument.category === "FOREX" ? 100000 : 100) *
    0.01;

  if (Number(account.balance) < marginRequired) {
    res.status(400).json({ error: "Insufficient margin" });
    return;
  }

  if (orderType === "LIMIT") {
    const order = await prisma.order.create({
      data: {
        accountId: account.id,
        instrumentId: instrument.id,
        type,
        orderType: "LIMIT",
        volume: new Decimal(volume),
        price: new Decimal(openPrice),
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

  const position = await prisma.position.create({
    data: {
      accountId: account.id,
      instrumentId: instrument.id,
      type,
      volume: new Decimal(volume),
      openPrice: new Decimal(openPrice),
      stopLoss: stopLoss ? new Decimal(stopLoss) : undefined,
      takeProfit: takeProfit ? new Decimal(takeProfit) : undefined,
      status: "OPEN",
    },
    include: { instrument: true },
  });

  await prisma.account.update({
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

router.post("/positions/:id/close", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountType = (req.body.accountType as string) || "DEMO";
  const positionId = String(req.params.id);
  const account = await getAccount(req.user!.id, accountType);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const position = await prisma.position.findFirst({
    where: { id: positionId, accountId: account.id, status: "OPEN" },
  });

  if (!position) {
    res.status(404).json({ error: "Position not found" });
    return;
  }

  const instrument = await prisma.instrument.findUnique({
    where: { id: position.instrumentId },
    include: { quoteData: true },
  });

  if (!instrument) {
    res.status(404).json({ error: "Instrument not found" });
    return;
  }

  const closePrice = Number(instrument.quoteData?.bid ?? position.openPrice);
  const pnl = calculatePnL(
    position.type,
    Number(position.volume),
    Number(position.openPrice),
    closePrice,
    instrument.category
  );

  const marginReleased =
    Number(position.volume) *
    Number(position.openPrice) *
    (instrument.category === "FOREX" ? 100000 : 100) *
    0.01;

  const [updatedPosition] = await prisma.$transaction([
    prisma.position.update({
      where: { id: position.id },
      data: {
        status: "CLOSED",
        closePrice: new Decimal(closePrice),
        pnl: new Decimal(pnl),
        closedAt: new Date(),
      },
    }),
    prisma.account.update({
      where: { id: account.id },
      data: {
        balance: { increment: pnl },
        marginUsed: { decrement: marginReleased },
      },
    }),
    prisma.transaction.create({
      data: {
        accountId: account.id,
        type: "TRADE",
        amount: new Decimal(pnl),
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

router.delete("/orders/:id", requireAuth, async (req: AuthRequest, res) => {
  const accountType = (req.query.accountType as string) || "DEMO";
  const orderId = String(req.params.id);
  const account = await getAccount(req.user!.id, accountType);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, accountId: account.id, status: "PENDING" },
  });

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED" },
  });

  res.json({ message: "Order cancelled" });
});

export default router;
