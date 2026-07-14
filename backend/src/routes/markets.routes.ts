import { Router } from "express";
import { prisma } from "../lib/prisma";
import { generateCandles } from "../services/priceEngine";

const router = Router();

function formatSymbol(symbol: string): string {
  if (symbol.includes("/")) return symbol;
  if (symbol.length === 6) return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  return symbol;
}

router.get("/", async (_req, res) => {
  const instruments = await prisma.instrument.findMany({
    include: { quoteData: true },
    orderBy: { symbol: "asc" },
  });

  res.json({
    markets: instruments.map((inst) => ({
      id: inst.id,
      symbol: formatSymbol(inst.symbol),
      rawSymbol: inst.symbol,
      name: inst.name,
      type: inst.category.toLowerCase(),
      price: Number(inst.quoteData?.bid ?? 0),
      ask: Number(inst.quoteData?.ask ?? 0),
      change: `${Number(inst.quoteData?.changePct ?? 0) >= 0 ? "+" : ""}${Number(inst.quoteData?.changePct ?? 0).toFixed(2)}%`,
      updatedAt: inst.quoteData?.updatedAt,
    })),
  });
});

router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.replace("/", "");
  const instrument = await prisma.instrument.findUnique({
    where: { symbol },
    include: { quoteData: true },
  });

  if (!instrument) {
    res.status(404).json({ error: "Market not found" });
    return;
  }

  res.json({
    market: {
      id: instrument.id,
      symbol: formatSymbol(instrument.symbol),
      rawSymbol: instrument.symbol,
      name: instrument.name,
      type: instrument.category.toLowerCase(),
      bid: Number(instrument.quoteData?.bid ?? 0),
      ask: Number(instrument.quoteData?.ask ?? 0),
      price: Number(instrument.quoteData?.bid ?? 0),
      change: Number(instrument.quoteData?.changePct ?? 0),
      updatedAt: instrument.quoteData?.updatedAt,
    },
  });
});

router.get("/:symbol/candles", async (req, res) => {
  const symbol = req.params.symbol.replace("/", "");
  const limit = Number(req.query.limit) || 50;
  const interval = String(req.query.interval ?? 'M30');
  const candles = await generateCandles(symbol, limit, interval);

  res.json({
    candles: candles.map((c) => ({
      timestamp: c.timestamp,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume),
    })),
  });
});

export default router;
