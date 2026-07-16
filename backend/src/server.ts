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

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    await ensureInstruments();
    console.log("Market instruments ready");

    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
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
