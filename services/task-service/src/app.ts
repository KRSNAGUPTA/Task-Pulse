import express from "express";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import taskRoutes from "./routes/task.route.js";
import { authenticateUser } from "./middlewares/auth.middleware.js";

const app = express();

// Number of reverse proxies in front of this service.
app.set("trust proxy", 1); // client -> gateway -> server

const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));

app.use(express.json({ limit: "100kb" }));

app.use((req, _res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body, { replaceWith: "_" });
  if (req.params) mongoSanitize.sanitize(req.params, { replaceWith: "_" });
  next();
});

// Limit per authenticated user, as the request is coming via the gateway
// and exp using trust proxy 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min/User
  limit:  300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? ipKeyGenerator(req.ip ?? "unknown"),
});

app.get("/", (_req, res) => {
  res.status(200).json({ message: "Task Service API!" });
});

app.use("/api/task", authenticateUser, limiter, taskRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ message: "Malformed JSON body" });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ message: "Request body too large" });
    return;
  }
  console.error("Server Error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

export default app;