"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const auth_2 = require("../lib/auth");
const router = (0, express_1.Router)();
router.get("/stats", auth_1.requireAuth, auth_1.requireAdmin, async (_req, res) => {
    const [users, deposits, withdrawals, openPositions, pendingTickets] = await Promise.all([
        prisma_1.prisma.user.count(),
        prisma_1.prisma.transaction.aggregate({
            where: { type: "DEPOSIT", status: "COMPLETED" },
            _sum: { amount: true },
        }),
        prisma_1.prisma.transaction.aggregate({
            where: { type: "WITHDRAWAL", status: "COMPLETED" },
            _sum: { amount: true },
        }),
        prisma_1.prisma.position.count({ where: { status: "OPEN" } }),
        prisma_1.prisma.supportTicket.count({ where: { status: "OPEN" } }),
    ]);
    const recentUsers = await prisma_1.prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            fullName: true,
            email: true,
            isVerified: true,
            createdAt: true,
        },
    });
    res.json({
        stats: {
            totalUsers: users,
            totalDeposits: Number(deposits._sum.amount ?? 0),
            totalWithdrawals: Math.abs(Number(withdrawals._sum.amount ?? 0)),
            openTrades: openPositions,
            pendingTickets,
        },
        recentUsers,
    });
});
router.get("/users", auth_1.requireAuth, auth_1.requireAdmin, async (_req, res) => {
    const users = await prisma_1.prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isVerified: true,
            createdAt: true,
        },
    });
    res.json({ users });
});
router.get("/accounts", auth_1.requireAuth, auth_1.requireAdmin, async (_req, res) => {
    const accounts = await prisma_1.prisma.account.findMany({
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
    });
    res.json({
        accounts: accounts.map((account) => ({
            id: account.id,
            type: account.type,
            balance: Number(account.balance),
            currency: account.currency,
            user: {
                id: account.user.id,
                fullName: account.user.fullName,
            },
        })),
    });
});
router.get("/transactions", auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    const type = req.query.type?.toUpperCase();
    const whereClause = type && type !== "ALL" ? { type: type } : {};
    const transactions = await prisma_1.prisma.transaction.findMany({
        where: whereClause,
        include: { account: { include: { user: { select: { id: true, fullName: true } } } } },
        orderBy: { createdAt: "desc" },
    });
    res.json({
        transactions: transactions.map((transaction) => ({
            id: transaction.id,
            type: transaction.type.toLowerCase(),
            title: transaction.type === "DEPOSIT"
                ? "Deposit"
                : transaction.type === "WITHDRAWAL"
                    ? "Withdrawal"
                    : "Trade",
            description: transaction.description,
            amount: Number(transaction.amount),
            date: transaction.createdAt,
            status: transaction.status,
            method: transaction.method,
            user: {
                id: transaction.account.user.id,
                fullName: transaction.account.user.fullName,
            },
        })),
    });
});
router.get("/trades", auth_1.requireAuth, auth_1.requireAdmin, async (_req, res) => {
    const positions = await prisma_1.prisma.position.findMany({
        include: { account: { include: { user: { select: { id: true, fullName: true } } } } },
        orderBy: { openedAt: "desc" },
    });
    res.json({
        positions: positions.map((position) => ({
            id: position.id,
            symbol: position.instrumentId,
            type: position.type,
            volume: Number(position.volume),
            openPrice: Number(position.openPrice),
            currentPrice: Number(position.closePrice ?? position.openPrice),
            pnl: Number(position.pnl),
            openTime: position.openedAt,
            status: position.status,
            user: {
                id: position.account.user.id,
                fullName: position.account.user.fullName,
            },
        })),
    });
});
router.get("/support", auth_1.requireAuth, auth_1.requireAdmin, async (_req, res) => {
    const tickets = await prisma_1.prisma.supportTicket.findMany({
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
    });
    res.json({
        tickets: tickets.map((ticket) => ({
            id: ticket.id,
            subject: ticket.subject,
            message: ticket.message,
            status: ticket.status.toLowerCase().replace("_", " "),
            createdAt: ticket.createdAt,
            user: {
                id: ticket.user.id,
                fullName: ticket.user.fullName,
            },
        })),
    });
});
router.patch('/support/:id', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const { status } = req.body;
    if (!status) {
        res.status(400).json({ error: 'Status is required' });
        return;
    }
    const normalized = status.toUpperCase().replace(' ', '_');
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(normalized)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
    }
    try {
        const ticket = await prisma_1.prisma.supportTicket.update({
            where: { id },
            data: { status: normalized },
        });
        res.json({
            ticket: {
                id: ticket.id,
                subject: ticket.subject,
                message: ticket.message,
                status: ticket.status.toLowerCase().replace('_', ' '),
                createdAt: ticket.createdAt,
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Unable to update ticket status' });
    }
});
router.delete('/support/:id', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    try {
        await prisma_1.prisma.supportTicket.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Unable to delete support ticket' });
    }
});
router.delete("/users/:id", auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    try {
        await prisma_1.prisma.user.delete({ where: { id } });
        res.json({ success: true, message: 'User deleted' });
    }
    catch (err) {
        res.status(400).json({ error: 'Unable to delete user' });
    }
});
router.delete("/accounts/:id", auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    try {
        await prisma_1.prisma.account.delete({ where: { id } });
        res.json({ success: true, message: 'Account deleted' });
    }
    catch (err) {
        res.status(400).json({ error: 'Unable to delete account' });
    }
});
router.post("/users", auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { fullName, email, password, phone, role } = req.body;
        if (!fullName || !email || !password) {
            res.status(400).json({ error: 'fullName, email and password are required' });
            return;
        }
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }
        const passwordHash = await (0, auth_2.hashPassword)(password);
        const referralCode = (0, auth_2.generateReferralCode)();
        const user = await prisma_1.prisma.user.create({
            data: {
                fullName,
                email,
                phone,
                passwordHash,
                referralCode,
                role: role === 'ADMIN' ? 'ADMIN' : 'USER',
                isVerified: true,
                accounts: { create: [{ type: 'DEMO', balance: 10000 }] },
            },
            select: { id: true, fullName: true, email: true, role: true, isVerified: true, createdAt: true },
        });
        res.status(201).json({ user });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Unable to create user' });
    }
});
router.post('/accounts', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { userId, type = 'DEMO', balance = 0, currency = 'USD' } = req.body;
        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const account = await prisma_1.prisma.account.create({
            data: { userId, type: type, balance: balance, currency },
        });
        res.status(201).json({ account: { id: account.id, type: account.type, balance: Number(account.balance), currency: account.currency, user: { id: user.id, fullName: user.fullName } } });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Unable to create account' });
    }
});
exports.default = router;
