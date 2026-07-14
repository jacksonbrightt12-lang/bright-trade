"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
dotenv_1.default.config({ path: "../.env" });
dotenv_1.default.config();
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
            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);
            });
        });
        (0, priceEngine_1.startPriceEngine)((updates) => {
            io.to("markets").emit("prices:update", updates);
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
