import { Router, type Response } from "express";
import { prisma } from "../lib/prisma";
import type { AuthRequest } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";

const router = Router();

const serializeTicket = (ticket: any, viewer: "USER" | "ADMIN") => ({
  id: ticket.id,
  subject: ticket.subject,
  status: ticket.status.toLowerCase().replace("_", " "),
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  lastMessage: ticket.messages.at(-1)?.content ?? ticket.message,
  messages: ticket.messages.map((message: any) => ({
    id: message.id,
    sender: message.sender.toLowerCase(),
    content: message.content,
    createdAt: message.createdAt,
    isRead: message.isRead,
  })),
  unreadCount:
    viewer === "ADMIN"
      ? ticket.messages.filter((message: any) => message.sender === "USER" && !message.isRead).length
      : ticket.messages.filter((message: any) => message.sender === "ADMIN" && !message.isRead).length,
});

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: req.user!.id },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  res.json({
    conversations: tickets.map((ticket) => serializeTicket(ticket, "USER")),
  });
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { subject, message } = req.body as { subject?: string; message?: string };
  if (!subject || !message) {
    res.status(400).json({ error: "Subject and message are required" });
    return;
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: req.user!.id,
      subject,
      message,
      messages: {
        create: [{ sender: "USER", content: message }],
      },
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  res.status(201).json({
    conversation: serializeTicket(ticket, "USER"),
  });
});

router.post("/:id/messages", requireAuth, async (req: AuthRequest, res: Response) => {
  const ticketId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
  const { message } = req.body as { message?: string };

  if (!message?.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId: req.user!.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!ticket) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const created = await prisma.supportMessage.create({
    data: {
      ticketId,
      sender: "USER",
      content: message.trim(),
    },
  });

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { message: message.trim(), updatedAt: new Date() },
  });

  const refreshed = await prisma.supportTicket.findUniqueOrThrow({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  res.status(201).json({
    message: {
      id: created.id,
      sender: "user",
      content: created.content,
      createdAt: created.createdAt,
      isRead: created.isRead,
    },
    conversation: serializeTicket(refreshed, "USER"),
  });
});

router.patch("/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
  const ticketId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId: req.user!.id },
  });

  if (!ticket) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await prisma.supportMessage.updateMany({
    where: { ticketId, sender: "ADMIN", isRead: false },
    data: { isRead: true },
  });

  res.json({ success: true });
});

export default router;
