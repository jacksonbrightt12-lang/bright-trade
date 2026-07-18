import path from "node:path";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

for (const envPath of [
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "..", ".env"),
  path.resolve(process.cwd(), ".env"),
]) {
  dotenv.config({ path: envPath });
}

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/brighttrade?schema=public";
process.env.JWT_SECRET ??= "dev-secret-key-for-development";

const PORT = process.env.PORT || 5000;

import app from "./app";
import { prisma } from "./lib/prisma";
import { ensureInstruments, startPriceEngine, getLiveCandleUpdate } from "./services/priceEngine";
import { hashPassword, generateReferralCode } from "./lib/auth";

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    // Seed admin user when environment provides credentials
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminFullName = process.env.ADMIN_FULLNAME ?? "Administrator";

      if (adminEmail && adminPassword) {
        const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
        const passwordHash = await hashPassword(adminPassword);
        if (!existing) {
          await prisma.user.create({
            data: {
              email: adminEmail,
              fullName: adminFullName,
              passwordHash,
              isVerified: true,
              role: "ADMIN",
              referralCode: generateReferralCode(),
              accounts: { create: [{ type: "LIVE", balance: 0 }] },
            },
          });
          console.log("Admin user created:", adminEmail);
        } else {
          await prisma.user.update({
            where: { id: existing.id },
            data: { role: "ADMIN", isVerified: true, passwordHash },
          });
          console.log("Admin user updated:", adminEmail);
        }
      }
    } catch (err) {
      console.error("Failed to seed admin user:", err);
    }

    await ensureInstruments();
    console.log("Market instruments ready");

    const httpServer = createServer(app);
    
    // Build Socket.io CORS origins from environment or use defaults for development
    const socketCorsOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
      : ["http://localhost:5173", "http://127.0.0.1:5173"];
    
    if (process.env.FRONTEND_URL) {
      socketCorsOrigins.push(process.env.FRONTEND_URL);
    }
    
    const io = new Server(httpServer, {
      cors: {
        origin: socketCorsOrigins,
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);
      socket.on("subscribe:markets", () => {
        socket.join("markets");
      });
      socket.on("subscribe:candles", ({ symbol, timeframe }: { symbol: string; timeframe: string }) => {
        const normalized = String(symbol ?? "").replace("/", "");
        if (normalized && timeframe) {
          socket.join(`candles:${normalized}:${timeframe}`);
        }
      });
      socket.on("unsubscribe:candles", ({ symbol, timeframe }: { symbol: string; timeframe: string }) => {
        const normalized = String(symbol ?? "").replace("/", "");
        if (normalized && timeframe) {
          socket.leave(`candles:${normalized}:${timeframe}`);
        }
      });
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    startPriceEngine(async (updates) => {
      io.to("markets").emit("prices:update", updates);

      const rooms = io.of("/").adapter.rooms;
      for (const room of rooms.keys()) {
        if (!room.startsWith("candles:")) continue;
        const parts = room.split(":");
        if (parts.length !== 3) continue;
        const [, symbol, timeframe] = parts;
        const update = updates.find((u) => u.symbol === symbol);
        if (!update) continue;

        const liveCandle = await getLiveCandleUpdate(symbol, timeframe, update.bid);
        if (!liveCandle) continue;
        io.to(room).emit("candles:update", liveCandle);
      }
    });

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

void bootstrap();
