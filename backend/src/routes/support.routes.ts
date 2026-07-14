import { Router } from "express";
import { prisma } from "../lib/prisma";
import type { AuthRequest } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: req.user!.id },
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

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { subject, message } = req.body as { subject?: string; message?: string };
  if (!subject || !message) {
    res.status(400).json({ error: "Subject and message are required" });
    return;
  }

  const ticket = await prisma.supportTicket.create({
    data: { userId: req.user!.id, subject, message },
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

export default router;
