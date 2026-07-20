"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Populates the Learning Center with a starter set of trading-education resources.
 * Safe to re-run: it skips any title that already exists.
 *
 * Usage (from backend/):
 *   npm run seed-education
 */
const prisma_1 = require("../lib/prisma");
const courses = [
    {
        title: "Reading Candlestick Charts",
        description: "Learn how open, high, low and close combine into a single candle, and what body size and wick length tell you about buyer/seller pressure.",
        level: "Beginner",
        duration: "12 min",
        lessons: 5,
        category: "Technical Analysis",
        resourceType: "ARTICLE",
        resourceUrl: "https://www.investopedia.com/trading/candlestick-charting-what-is-it/",
        featured: true,
        author: "Bright Trade Team",
        tags: ["candlesticks", "charting", "basics"],
    },
    {
        title: "Common Candlestick Patterns",
        description: "A practical tour of doji, hammer, engulfing and pin bar patterns, with notes on where each tends to show up and how reliable it usually is.",
        level: "Beginner",
        duration: "18 min",
        lessons: 6,
        category: "Technical Analysis",
        resourceType: "ARTICLE",
        resourceUrl: "https://www.investopedia.com/articles/active-trading/092315/most-common-candlestick-patterns.asp",
        featured: true,
        author: "Bright Trade Team",
        tags: ["candlesticks", "patterns"],
    },
    {
        title: "Understanding Leverage and Margin",
        description: "How leverage multiplies both gains and losses, what a margin call actually means, and simple ways to size positions so one bad trade can't wipe out an account.",
        level: "Beginner",
        duration: "15 min",
        lessons: 4,
        category: "Risk Management",
        resourceType: "ARTICLE",
        resourceUrl: "https://www.investopedia.com/terms/l/leverage.asp",
        featured: true,
        author: "Bright Trade Team",
        tags: ["leverage", "margin", "risk"],
    },
    {
        title: "Setting Stop-Loss and Take-Profit Orders",
        description: "Why every position deserves a predefined exit, how to place SL/TP levels around support and resistance instead of arbitrary distances, and common mistakes to avoid.",
        level: "Beginner",
        duration: "10 min",
        lessons: 3,
        category: "Risk Management",
        resourceType: "ARTICLE",
        resourceUrl: "https://www.investopedia.com/terms/s/stop-lossorder.asp",
        featured: false,
        author: "Bright Trade Team",
        tags: ["stop-loss", "take-profit", "risk"],
    },
    {
        title: "Support and Resistance Fundamentals",
        description: "How to identify the price levels where buying or selling pressure has repeatedly shown up, and how traders use them to plan entries and exits.",
        level: "Beginner",
        duration: "14 min",
        lessons: 5,
        category: "Technical Analysis",
        resourceType: "ARTICLE",
        resourceUrl: "https://www.investopedia.com/trading/support-and-resistance-basics/",
        featured: false,
        author: "Bright Trade Team",
        tags: ["support", "resistance", "price-action"],
    },
    {
        title: "Moving Averages Explained",
        description: "The difference between simple and exponential moving averages, how crossovers are used as trend signals, and their limits in choppy markets.",
        level: "Intermediate",
        duration: "16 min",
        lessons: 5,
        category: "Technical Analysis",
        resourceType: "ARTICLE",
        resourceUrl: "https://www.investopedia.com/terms/m/movingaverage.asp",
        featured: false,
        author: "Bright Trade Team",
        tags: ["moving-average", "trend", "indicators"],
    },
    {
        title: "RSI and Momentum Basics",
        description: "What the Relative Strength Index measures, how overbought/oversold readings are typically interpreted, and why RSI works best combined with other confirmation.",
        level: "Intermediate",
        duration: "13 min",
        lessons: 4,
        category: "Technical Analysis",
        resourceType: "ARTICLE",
        resourceUrl: "https://www.investopedia.com/terms/r/rsi.asp",
        featured: false,
        author: "Bright Trade Team",
        tags: ["rsi", "momentum", "indicators"],
    },
    {
        title: "Forex Market Sessions and Liquidity",
        description: "How the Sydney, Tokyo, London and New York sessions overlap, why volatility and spreads shift throughout the day, and when major pairs tend to move most.",
        level: "Beginner",
        duration: "11 min",
        lessons: 4,
        category: "Market Structure",
        resourceType: "ARTICLE",
        resourceUrl: "https://www.investopedia.com/articles/forex/09/trading-forex-market-hours.asp",
        featured: false,
        author: "Bright Trade Team",
        tags: ["forex", "sessions", "liquidity"],
    },
    {
        title: "Position Sizing and the 1-2% Rule",
        description: "A framework for deciding how much to risk per trade based on account size and stop-loss distance, so a losing streak stays survivable.",
        level: "Intermediate",
        duration: "12 min",
        lessons: 3,
        category: "Risk Management",
        resourceType: "ARTICLE",
        resourceUrl: "https://www.investopedia.com/articles/trading/09/risk-management.asp",
        featured: false,
        author: "Bright Trade Team",
        tags: ["position-sizing", "risk"],
    },
    {
        title: "Trading Psychology: Managing FOMO and Revenge Trading",
        description: "Why emotional decision-making is the most common reason disciplined strategies fail in practice, and habits that help keep a trading plan intact under stress.",
        level: "Intermediate",
        duration: "17 min",
        lessons: 5,
        category: "Trading Psychology",
        resourceType: "ARTICLE",
        resourceUrl: "https://www.investopedia.com/articles/trading/02/110502.asp",
        featured: false,
        author: "Bright Trade Team",
        tags: ["psychology", "discipline"],
    },
    {
        title: "Building a Trading Plan",
        description: "The core pieces every trading plan needs: market focus, entry/exit rules, risk limits and a review process, plus a simple template to start from.",
        level: "Advanced",
        duration: "20 min",
        lessons: 6,
        category: "Strategy",
        resourceType: "ARTICLE",
        resourceUrl: "https://www.investopedia.com/articles/trading/04/042104.asp",
        featured: false,
        author: "Bright Trade Team",
        tags: ["strategy", "planning"],
    },
    {
        title: "Chart Timeframes: Matching Your Trading Style",
        description: "How scalping, day trading, swing trading and position trading map to different chart timeframes, and how to pick one that fits the time you actually have.",
        level: "Beginner",
        duration: "9 min",
        lessons: 3,
        category: "Market Structure",
        resourceType: "ARTICLE",
        resourceUrl: "https://www.investopedia.com/articles/trading/07/day-trading-fx.asp",
        featured: false,
        author: "Bright Trade Team",
        tags: ["timeframes", "trading-style"],
    },
];
async function main() {
    let created = 0;
    let skipped = 0;
    for (const course of courses) {
        const existing = await prisma_1.prisma.educationCourse.findFirst({ where: { title: course.title } });
        if (existing) {
            skipped += 1;
            continue;
        }
        await prisma_1.prisma.educationCourse.create({ data: course });
        created += 1;
    }
    console.log(`Seed complete: ${created} created, ${skipped} skipped (already existed).`);
    process.exit(0);
}
main().catch((error) => {
    console.error("Failed to seed education resources:", error);
    process.exit(1);
});
