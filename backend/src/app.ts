import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import accountRoutes from "./routes/account.routes";
import marketsRoutes from "./routes/markets.routes";
import tradesRoutes from "./routes/trades.routes";
import supportRoutes from "./routes/support.routes";
import educationRoutes from "./routes/education.routes";
import affiliateRoutes from "./routes/affiliate.routes";
import adminRoutes from "./routes/admin.routes";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (_req: express.Request, res: express.Response) => {
  res.json({ message: "Bright Trade API is running" });
});

app.get("/api/health", (_req: express.Request, res: express.Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/markets", marketsRoutes);
app.use("/api/trades", tradesRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/education", educationRoutes);
app.use("/api/affiliate", affiliateRoutes);
app.use("/api/admin", adminRoutes);

export default app;
