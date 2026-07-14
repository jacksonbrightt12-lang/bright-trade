"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get("/", auth_1.requireAuth, async (req, res) => {
    const tickets = await prisma_1.prisma.supportTicket.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
    });
    res.json({
        tickets: tickets.map((t) => ({
            id: t.id,
            subject: t.subject,
            message: t.message,
            status: t.status.toLowerCase().replace("_", " "),
            createdAt: t.createdAt,
        })),
    });
});
router.post("/", auth_1.requireAuth, async (req, res) => {
    const { subject, message } = req.body;
    if (!subject || !message) {
        res.status(400).json({ error: "Subject and message are required" });
        return;
    }
    const ticket = await prisma_1.prisma.supportTicket.create({
        data: { userId: req.user.id, subject, message },
    });
    res.status(201).json({
        ticket: {
            id: ticket.id,
            subject: ticket.subject,
            status: ticket.status,
            createdAt: ticket.createdAt,
        },
    });
});
exports.default = router;
