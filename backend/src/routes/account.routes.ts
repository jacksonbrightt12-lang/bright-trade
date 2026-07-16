import { Router, type Request, type Response } from "express";
import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "../lib/prisma";
import { calculatePnL } from "../services/priceEngine";
import type { AuthRequest } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";

const router = Router();

async function getUserAccount(userId: string, accountType = "DEMO") {
  return prisma.account.findFirst({
    where: { userId, type: accountType as "DEMO" | "LIVE" },
    include: {
      positions: {
        where: { status: "OPEN" },
        include: { instrument: { include: { quoteData: true } } },
      },
    },
  });
}

async function computeAccountStats(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      positions: {
        where: { status: "OPEN" },
        include: { instrument: { include: { quoteData: true } } },
      },
    },
  });

  if (!account) return null;

  let unrealizedPnL = 0;
  let marginUsed = 0;

  for (const pos of account.positions) {
    const current = Number(pos.instrument.quoteData?.bid ?? pos.openPrice);
    const pnl = calculatePnL(
      pos.type,
      Number(pos.volume),
      Number(pos.openPrice),
      current,
      pos.instrument.category
    );
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

router.get("/summary", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountType = (req.query.accountType as string) || "DEMO";
  const account = await getUserAccount(req.user!.id, accountType);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const stats = await computeAccountStats(account.id);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayProfit = await prisma.transaction.aggregate({
    where: {
      accountId: account.id,
      type: "TRADE",
      createdAt: { gte: todayStart },
    },
    _sum: { amount: true },
  });

  const recentTransactions = await prisma.transaction.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const openPositions = account.positions.map((pos) => {
    const current = Number(pos.instrument.quoteData?.bid ?? pos.openPrice);
    const pnl = calculatePnL(
      pos.type,
      Number(pos.volume),
      Number(pos.openPrice),
      current,
      pos.instrument.category
    );
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

router.get("/accounts", requireAuth, async (req: AuthRequest, res: Response) => {
  const accounts = await prisma.account.findMany({
    where: { userId: req.user!.id },
    select: { id: true, type: true, balance: true, currency: true },
  });
  res.json({
    accounts: accounts.map((a) => ({
      ...a,
      balance: Number(a.balance),
    })),
  });
});

router.post("/deposit", requireAuth, async (req: AuthRequest, res: Response) => {
  const { amount, method, accountType = "DEMO" } = req.body as {
    amount?: number;
    method?: string;
    accountType?: string;
  };

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Valid amount is required" });
    return;
  }

  const account = await getUserAccount(req.user!.id, accountType);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const [updatedAccount, transaction] = await prisma.$transaction([
    prisma.account.update({
      where: { id: account.id },
      data: { balance: { increment: amount } },
    }),
    prisma.transaction.create({
      data: {
        accountId: account.id,
        type: "DEPOSIT",
        amount: new Decimal(amount),
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

router.post("/withdraw", requireAuth, async (req: AuthRequest, res: Response) => {
  const { amount, method, accountType = "DEMO" } = req.body as {
    amount?: number;
    method?: string;
    accountType?: string;
  };

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Valid amount is required" });
    return;
  }

  const account = await getUserAccount(req.user!.id, accountType);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  if (Number(account.balance) < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const [updatedAccount, transaction] = await prisma.$transaction([
    prisma.account.update({
      where: { id: account.id },
      data: { balance: { decrement: amount } },
    }),
    prisma.transaction.create({
      data: {
        accountId: account.id,
        type: "WITHDRAWAL",
        amount: new Decimal(-amount),
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

router.get("/transactions", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountType = (req.query.accountType as string) || "DEMO";
  const type = req.query.type as string | undefined;
  const account = await getUserAccount(req.user!.id, accountType);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      accountId: account.id,
      ...(type && type !== "all"
        ? { type: type.toUpperCase() as "DEPOSIT" | "WITHDRAWAL" | "TRADE" }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type.toLowerCase(),
      title:
        t.type === "DEPOSIT"
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

export default router;
