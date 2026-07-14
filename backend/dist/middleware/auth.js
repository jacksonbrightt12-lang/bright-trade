"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
const auth_1 = require("../lib/auth");
const prisma_1 = require("../lib/prisma");
async function requireAuth(req, res, next) {
    try {
        const token = (0, auth_1.getTokenFromRequest)(req);
        if (!token) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }
        const payload = (0, auth_1.verifyToken)(token);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true, fullName: true, isVerified: true },
        });
        if (!user || !user.isVerified) {
            res.status(401).json({ error: "Invalid or unverified account" });
            return;
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
        };
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid token" });
    }
}
function requireAdmin(req, res, next) {
    if (req.user?.role !== "ADMIN") {
        res.status(403).json({ error: "Admin access required" });
        return;
    }
    next();
}
