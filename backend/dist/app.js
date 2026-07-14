"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const account_routes_1 = __importDefault(require("./routes/account.routes"));
const markets_routes_1 = __importDefault(require("./routes/markets.routes"));
const trades_routes_1 = __importDefault(require("./routes/trades.routes"));
const support_routes_1 = __importDefault(require("./routes/support.routes"));
const education_routes_1 = __importDefault(require("./routes/education.routes"));
const affiliate_routes_1 = __importDefault(require("./routes/affiliate.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
}));
app.use(express_1.default.json());
app.get("/", (_req, res) => {
    res.json({ message: "Bright Trade API is running" });
});
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.use("/api/auth", auth_routes_1.default);
app.use("/api/account", account_routes_1.default);
app.use("/api/markets", markets_routes_1.default);
app.use("/api/trades", trades_routes_1.default);
app.use("/api/support", support_routes_1.default);
app.use("/api/education", education_routes_1.default);
app.use("/api/affiliate", affiliate_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
exports.default = app;
