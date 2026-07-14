"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSTRUMENT_CONFIG = void 0;
exports.ensureInstruments = ensureInstruments;
exports.updateMarketPrices = updateMarketPrices;
exports.startPriceEngine = startPriceEngine;
exports.getLiveCandleUpdate = getLiveCandleUpdate;
exports.getQuoteForSymbol = getQuoteForSymbol;
exports.calculatePnL = calculatePnL;
exports.generateCandles = generateCandles;
const client_1 = require("@prisma/client/runtime/client");
const prisma_1 = require("../lib/prisma");
exports.INSTRUMENT_CONFIG = [
    { symbol: "EURUSD", name: "Euro / US Dollar", category: "FOREX", base: "EUR", quote: "USD", frankfurterFrom: "EUR", frankfurterTo: "USD" },
    { symbol: "GBPUSD", name: "British Pound / US Dollar", category: "FOREX", base: "GBP", quote: "USD", frankfurterFrom: "GBP", frankfurterTo: "USD" },
    { symbol: "USDJPY", name: "US Dollar / Japanese Yen", category: "FOREX", base: "USD", quote: "JPY", frankfurterFrom: "USD", frankfurterTo: "JPY" },
    { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", category: "FOREX", base: "AUD", quote: "USD", frankfurterFrom: "AUD", frankfurterTo: "USD" },
    { symbol: "USDCHF", name: "US Dollar / Swiss Franc", category: "FOREX", base: "USD", quote: "CHF", frankfurterFrom: "USD", frankfurterTo: "CHF" },
    { symbol: "USDCAD", name: "US Dollar / Canadian Dollar", category: "FOREX", base: "USD", quote: "CAD", frankfurterFrom: "USD", frankfurterTo: "CAD" },
    { symbol: "XAUUSD", name: "Gold / US Dollar", category: "COMMODITIES", base: "XAU", quote: "USD", staticPrice: 2350 },
    { symbol: "US500", name: "S&P 500 Index", category: "INDICES", base: "US", quote: "USD", staticPrice: 5420 },
    { symbol: "US30", name: "Dow Jones Index", category: "INDICES", base: "US", quote: "USD", staticPrice: 39100 },
];
const previousPrices = new Map();
const liveCandleCache = new Map();
let priceEngineRunning = false;
const YAHOO_SYMBOL_MAP = {
    EURUSD: "EURUSD=X",
    GBPUSD: "GBPUSD=X",
    USDJPY: "USDJPY=X",
    AUDUSD: "AUDUSD=X",
    USDCHF: "USDCHF=X",
    USDCAD: "USDCAD=X",
    XAUUSD: "XAUUSD=X",
    US500: "%5EGSPC",
    US30: "%5EDJI",
};
async function fetchYahooQuote(symbol) {
    const yahooSymbol = YAHOO_SYMBOL_MAP[symbol];
    if (!yahooSymbol)
        return null;
    try {
        const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSymbol}`);
        if (!res.ok)
            return null;
        const data = await res.json();
        const quote = data?.quoteResponse?.result?.[0];
        if (!quote)
            return null;
        const price = Number(quote.regularMarketPrice ?? quote.bid ?? quote.ask ?? null);
        if (!price || Number.isNaN(price))
            return null;
        const bid = Number(quote.bid ?? price);
        const ask = Number(quote.ask ?? price);
        const changePct = Number(quote.regularMarketChangePercent ?? 0);
        return { bid, ask, price, changePct };
    }
    catch {
        return null;
    }
}
async function fetchFrankfurterRate(from, to) {
    try {
        const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
        if (!res.ok)
            return null;
        const data = (await res.json());
        return data.rates[to] ?? null;
    }
    catch {
        return null;
    }
}
async function fetchGoldPrice() {
    try {
        const res = await fetch("https://api.metals.live/v1/spot/gold");
        if (!res.ok)
            return null;
        const data = (await res.json());
        return data[0]?.[1] ?? null;
    }
    catch {
        return null;
    }
}
function applySpread(mid, category) {
    const spread = category === "FOREX" ? 0.00015 : category === "COMMODITIES" ? 0.5 : 1.2;
    return { bid: mid - spread / 2, ask: mid + spread / 2 };
}
function calcChangePct(symbol, price) {
    const prev = previousPrices.get(symbol);
    if (!prev) {
        previousPrices.set(symbol, price);
        return 0;
    }
    const change = ((price - prev) / prev) * 100;
    previousPrices.set(symbol, price);
    return Number(change.toFixed(4));
}
async function resolveInstrumentPrice(config) {
    const yahooQuote = await fetchYahooQuote(config.symbol);
    if (yahooQuote) {
        return yahooQuote.price;
    }
    if (config.frankfurterFrom && config.frankfurterTo) {
        return fetchFrankfurterRate(config.frankfurterFrom, config.frankfurterTo);
    }
    if (config.symbol === "XAUUSD") {
        return fetchGoldPrice();
    }
    const existing = await prisma_1.prisma.marketQuote.findFirst({
        where: { instrument: { symbol: config.symbol } },
    });
    if (existing)
        return Number(existing.bid);
    return config.staticPrice ?? null;
}
async function ensureInstruments() {
    for (const config of exports.INSTRUMENT_CONFIG) {
        const instrument = await prisma_1.prisma.instrument.upsert({
            where: { symbol: config.symbol },
            update: { name: config.name, category: config.category },
            create: {
                symbol: config.symbol,
                name: config.name,
                category: config.category,
                base: config.base,
                quote: config.quote,
            },
        });
        const existingQuote = await prisma_1.prisma.marketQuote.findUnique({
            where: { instrumentId: instrument.id },
        });
        if (!existingQuote) {
            const price = (await resolveInstrumentPrice(config)) ?? config.staticPrice ?? 1;
            const { bid, ask } = applySpread(price, config.category);
            await prisma_1.prisma.marketQuote.create({
                data: {
                    instrumentId: instrument.id,
                    bid: new client_1.Decimal(bid),
                    ask: new client_1.Decimal(ask),
                    changePct: new client_1.Decimal(0),
                },
            });
            previousPrices.set(config.symbol, price);
        }
    }
}
async function updateMarketPrices() {
    const updates = [];
    for (const config of exports.INSTRUMENT_CONFIG) {
        const instrument = await prisma_1.prisma.instrument.findUnique({
            where: { symbol: config.symbol },
            include: { quoteData: true },
        });
        if (!instrument?.quoteData)
            continue;
        let mid = await resolveInstrumentPrice(config);
        if (mid === null) {
            mid = Number(instrument.quoteData.bid);
            const jitter = (Math.random() - 0.5) * mid * 0.0002;
            mid += jitter;
        }
        const changePct = calcChangePct(config.symbol, mid);
        const { bid, ask } = applySpread(mid, config.category);
        await prisma_1.prisma.marketQuote.update({
            where: { instrumentId: instrument.id },
            data: {
                bid: new client_1.Decimal(bid),
                ask: new client_1.Decimal(ask),
                changePct: new client_1.Decimal(changePct),
            },
        });
        updates.push({ symbol: config.symbol, bid, ask, changePct });
    }
    return updates;
}
function startPriceEngine(onUpdate) {
    if (priceEngineRunning)
        return;
    priceEngineRunning = true;
    const tick = async () => {
        try {
            const updates = await updateMarketPrices();
            onUpdate(updates);
        }
        catch (err) {
            console.error("Price engine error:", err);
        }
    };
    void tick();
    setInterval(() => void tick(), 5000);
}
function timeframeToYahooInterval(timeframe) {
    switch (timeframe) {
        case 'M1':
            return { interval: '1m', range: '1d' };
        case 'M5':
            return { interval: '5m', range: '5d' };
        case 'M15':
            return { interval: '15m', range: '1mo' };
        case 'M30':
            return { interval: '30m', range: '1mo' };
        case 'H1':
            return { interval: '60m', range: '2mo' };
        case 'H4':
            return { interval: '90m', range: '3mo' };
        case 'D1':
            return { interval: '1d', range: '1y' };
        default:
            return { interval: '30m', range: '1mo' };
    }
}
async function fetchYahooCandles(symbol, timeframe, limit) {
    const yahooSymbol = YAHOO_SYMBOL_MAP[symbol];
    if (!yahooSymbol)
        return null;
    const { interval, range } = timeframeToYahooInterval(timeframe);
    try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`);
        if (!res.ok)
            return null;
        const data = await res.json();
        const quote = data?.chart?.result?.[0];
        if (!quote || !quote.timestamp || !quote.indicators?.quote?.[0])
            return null;
        const timestamps = quote.timestamp;
        const quotes = quote.indicators.quote[0];
        const candles = [];
        for (let i = 0; i < timestamps.length && candles.length < limit; i += 1) {
            const ts = timestamps[i];
            const open = quotes.open?.[i];
            const high = quotes.high?.[i];
            const low = quotes.low?.[i];
            const close = quotes.close?.[i];
            const volume = quotes.volume?.[i] ?? 0;
            if ([open, high, low, close].some((v) => v == null || Number.isNaN(v)))
                continue;
            candles.push({
                timestamp: new Date(ts * 1000),
                open: Number(open),
                high: Number(high),
                low: Number(low),
                close: Number(close),
                volume: Number(volume),
            });
        }
        return candles.slice(-limit);
    }
    catch {
        return null;
    }
}
function timeframeToMs(timeframe) {
    switch (timeframe) {
        case 'M1':
            return 60_000;
        case 'M5':
            return 5 * 60_000;
        case 'M15':
            return 15 * 60_000;
        case 'M30':
            return 30 * 60_000;
        case 'H1':
            return 60 * 60_000;
        case 'H4':
            return 4 * 60 * 60_000;
        case 'D1':
            return 24 * 60 * 60_000;
        default:
            return 30 * 60_000;
    }
}
function getCurrentCandleTimestamp(timeframe, now = Date.now()) {
    const duration = timeframeToMs(timeframe);
    return Math.floor(now / duration) * duration;
}
function normalizeSymbol(symbol) {
    return symbol.replace('/', '');
}
function mapToCandleUpdate(symbol, timeframe, candle) {
    return {
        symbol: normalizeSymbol(symbol),
        timeframe,
        timestamp: candle.timestamp.valueOf(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
    };
}
function updateCandleForPrice(candle, price, currentTimestamp) {
    if (candle.timestamp !== currentTimestamp) {
        return {
            ...candle,
            timestamp: currentTimestamp,
            open: candle.close,
            high: Math.max(candle.close, price),
            low: Math.min(candle.close, price),
            close: price,
        };
    }
    return {
        ...candle,
        high: Math.max(candle.high, price),
        low: Math.min(candle.low, price),
        close: price,
    };
}
async function loadLatestCandle(symbol, timeframe) {
    const normalized = normalizeSymbol(symbol);
    const instrument = await prisma_1.prisma.instrument.findUnique({
        where: { symbol: normalized },
        include: { quoteData: true },
    });
    if (!instrument?.quoteData)
        return null;
    const yahooCandles = await fetchYahooCandles(normalized, timeframe, 1);
    if (yahooCandles && yahooCandles.length > 0) {
        return mapToCandleUpdate(normalized, timeframe, yahooCandles[yahooCandles.length - 1]);
    }
    const existing = await prisma_1.prisma.candle.findFirst({
        where: { instrumentId: instrument.id },
        orderBy: { timestamp: 'desc' },
    });
    if (existing) {
        return {
            symbol: normalized,
            timeframe,
            timestamp: existing.timestamp.valueOf(),
            open: Number(existing.open),
            high: Number(existing.high),
            low: Number(existing.low),
            close: Number(existing.close),
            volume: Number(existing.volume),
        };
    }
    const mid = Number(instrument.quoteData.bid);
    return {
        symbol: normalized,
        timeframe,
        timestamp: getCurrentCandleTimestamp(timeframe),
        open: mid,
        high: mid,
        low: mid,
        close: mid,
        volume: 0,
    };
}
async function getLiveCandleUpdate(symbol, timeframe, currentPrice) {
    const normalized = normalizeSymbol(symbol);
    const roomKey = `${normalized}:${timeframe}`;
    const currentTimestamp = getCurrentCandleTimestamp(timeframe);
    const cached = liveCandleCache.get(roomKey);
    if (cached && cached.timestamp === currentTimestamp) {
        const updated = updateCandleForPrice(cached, currentPrice, currentTimestamp);
        liveCandleCache.set(roomKey, updated);
        return updated;
    }
    const candle = await loadLatestCandle(normalized, timeframe);
    if (!candle)
        return null;
    const updated = updateCandleForPrice(candle, currentPrice, currentTimestamp);
    liveCandleCache.set(roomKey, updated);
    return updated;
}
async function getQuoteForSymbol(symbol) {
    return prisma_1.prisma.instrument.findUnique({
        where: { symbol: symbol.replace("/", "") },
        include: { quoteData: true },
    });
}
function calculatePnL(type, volume, openPrice, currentPrice, category) {
    const multiplier = category === "FOREX" ? 100000 : category === "COMMODITIES" ? 100 : 1;
    const diff = type === "BUY" ? currentPrice - openPrice : openPrice - currentPrice;
    return Number((diff * volume * multiplier).toFixed(2));
}
async function generateCandles(symbol, limit = 50, timeframe = 'M30') {
    const instrument = await prisma_1.prisma.instrument.findUnique({
        where: { symbol: symbol.replace("/", "") },
        include: { quoteData: true },
    });
    if (!instrument?.quoteData)
        return [];
    const yahooCandles = await fetchYahooCandles(instrument.symbol, timeframe, limit);
    if (yahooCandles && yahooCandles.length > 0) {
        return yahooCandles;
    }
    const current = Number(instrument.quoteData.bid);
    const existing = await prisma_1.prisma.candle.findMany({
        where: { instrumentId: instrument.id },
        orderBy: { timestamp: "desc" },
        take: limit,
    });
    if (existing.length < limit) {
        const now = Date.now();
        const candles = [];
        let price = current * 0.998;
        for (let i = limit; i >= 1; i--) {
            const open = price;
            const close = price * (1 + (Math.random() - 0.48) * 0.002);
            const high = Math.max(open, close) * (1 + Math.random() * 0.001);
            const low = Math.min(open, close) * (1 - Math.random() * 0.001);
            const timestamp = new Date(now - i * 60_000);
            candles.push({
                instrumentId: instrument.id,
                timestamp,
                open: new client_1.Decimal(open),
                high: new client_1.Decimal(high),
                low: new client_1.Decimal(low),
                close: new client_1.Decimal(close),
                volume: new client_1.Decimal(Math.random() * 1000),
            });
            price = close;
        }
        await prisma_1.prisma.candle.createMany({ data: candles, skipDuplicates: true });
    }
    const latest = await prisma_1.prisma.candle.findMany({
        where: { instrumentId: instrument.id },
        orderBy: { timestamp: "asc" },
        take: limit,
    });
    const lastCandle = latest[latest.length - 1];
    if (lastCandle) {
        const close = Number(lastCandle.close);
        const open = close;
        const high = Math.max(open, current);
        const low = Math.min(open, current);
        await prisma_1.prisma.candle.upsert({
            where: {
                instrumentId_timestamp: {
                    instrumentId: instrument.id,
                    timestamp: new Date(Math.floor(Date.now() / 60_000) * 60_000),
                },
            },
            update: {
                high: new client_1.Decimal(high),
                low: new client_1.Decimal(low),
                close: new client_1.Decimal(current),
            },
            create: {
                instrumentId: instrument.id,
                timestamp: new Date(Math.floor(Date.now() / 60_000) * 60_000),
                open: new client_1.Decimal(open),
                high: new client_1.Decimal(high),
                low: new client_1.Decimal(low),
                close: new client_1.Decimal(current),
                volume: new client_1.Decimal(100),
            },
        });
    }
    return prisma_1.prisma.candle.findMany({
        where: { instrumentId: instrument.id },
        orderBy: { timestamp: "asc" },
        take: limit,
    });
}
