"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get("/stats", auth_1.requireAuth, async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.id },
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
exports.default = router;
