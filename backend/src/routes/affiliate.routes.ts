import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import type { AuthRequest } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { referrals: true },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const referralCount = user.referrals.length;
  const earnings = referralCount * 25;

  res.json({
    referralCode: user.referralCode,
    referralLink: `${process.env.FRONTEND_URL || "http://localhost:5173"}/register?ref=${user.referralCode}`,
    totalReferrals: referralCount,
    activeReferrals: referralCount,
    totalEarnings: earnings,
    pendingEarnings: 0,
    commissionRate: "25%",
  });
});

export default router;
