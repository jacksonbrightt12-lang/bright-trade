"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
for (const envPath of [
    node_path_1.default.resolve(__dirname, ".env"),
    node_path_1.default.resolve(__dirname, "..", ".env"),
    node_path_1.default.resolve(process.cwd(), ".env"),
]) {
    dotenv_1.default.config({ path: envPath });
}
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/brighttrade?schema=public";
process.env.JWT_SECRET ??= "dev-secret-key-for-development";
const PORT = process.env.PORT || 5000;
const app_1 = __importDefault(require("./app"));
const prisma_1 = require("./lib/prisma");
const priceEngine_1 = require("./services/priceEngine");
async function bootstrap() {
    try {
        await prisma_1.prisma.$connect();
        console.log("Database connected");
        await (0, priceEngine_1.ensureInstruments)();
        console.log("Market instruments ready");
        const httpServer = (0, http_1.createServer)(app_1.default);
        const io = new socket_io_1.Server(httpServer, {
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
            socket.on("subscribe:candles", ({ symbol, timeframe }) => {
                const normalized = String(symbol ?? "").replace("/", "");
                if (normalized && timeframe) {
                    socket.join(`candles:${normalized}:${timeframe}`);
                }
            });
            socket.on("unsubscribe:candles", ({ symbol, timeframe }) => {
                const normalized = String(symbol ?? "").replace("/", "");
                if (normalized && timeframe) {
                    socket.leave(`candles:${normalized}:${timeframe}`);
                }
            });
            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);
            });
        });
        (0, priceEngine_1.startPriceEngine)(async (updates) => {
            io.to("markets").emit("prices:update", updates);
            const rooms = io.of("/").adapter.rooms;
            for (const room of rooms.keys()) {
                if (!room.startsWith("candles:"))
                    continue;
                const parts = room.split(":");
                if (parts.length !== 3)
                    continue;
                const [, symbol, timeframe] = parts;
                const update = updates.find((u) => u.symbol === symbol);
                if (!update)
                    continue;
                const liveCandle = await (0, priceEngine_1.getLiveCandleUpdate)(symbol, timeframe, update.bid);
                if (!liveCandle)
                    continue;
                io.to(room).emit("candles:update", liveCandle);
            }
        });
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
    catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}
void bootstrap();
