import { Router } from "express";
import { prisma } from "../lib/prisma";
import {
  comparePassword,
  generateReferralCode,
  generateVerificationCode,
  hashPassword,
  signToken,
} from "../lib/auth";
import type { AuthRequest } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, phone, password, referralCode } = req.body as {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
      referralCode?: string;
    };

    if (!fullName || !email || !password) {
      res.status(400).json({ error: "Full name, email, and password are required" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    let referredById: string | undefined;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode } });
      referredById = referrer?.id;
    }

    const passwordHash = await hashPassword(password);
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
        referralCode: generateReferralCode(),
        referredById,
        verification: {
          create: { code, expiresAt },
        },
        accounts: {
          create: [{ type: "DEMO", balance: 10000 }],
        },
      },
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`Verification code for ${email}: ${code}`);
    }

    res.status(201).json({
      message: "Account created. Please verify your email.",
      userId: user.id,
      ...(process.env.NODE_ENV === "development" ? { verificationCode: code } : {}),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body as { email?: string; code?: string };
    if (!email || !code) {
      res.status(400).json({ error: "Email and code are required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { verification: true },
    });

    if (!user?.verification) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.verification.code !== code) {
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }

    if (user.verification.expiresAt < new Date()) {
      res.status(400).json({ error: "Verification code expired" });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });
    await prisma.verificationCode.delete({ where: { userId: user.id } });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    res.json({
      message: "Email verified successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ error: "Please verify your email first", needsVerification: true });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      referralCode: true,
      createdAt: true,
    },
  });
  res.json({ user });
});

export default router;
