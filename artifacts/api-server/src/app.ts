import express, { type Express, type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { HttpError } from "./lib/supabase";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api", (_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
app.use("/api", rateLimit({ windowMs: 60000, limit: 240, standardHeaders: "draft-8", legacyHeaders: false }));
app.use(["/api/auth", "/api/inquiries", "/api/assistant", "/api/appointments", "/api/media"], rateLimit({
  windowMs: 60000, limit: 25, standardHeaders: "draft-8", legacyHeaders: false,
  skip: req => req.method === "GET", message: { error: "Too many requests. Please wait a minute." },
}));
app.use("/api", (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  const origin = req.get("origin");
  if (origin) {
    const allowed = [req.get("host"), req.get("x-forwarded-host"), process.env.APP_URL ? new URL(process.env.APP_URL).host : ""].filter(Boolean);
    try { if (!allowed.includes(new URL(origin).host)) throw new HttpError(403, "Cross-origin requests are not allowed."); }
    catch { next(new HttpError(403, "Cross-origin requests are not allowed.")); return; }
  }
  if (req.get("sec-fetch-site") === "cross-site") { next(new HttpError(403, "Cross-site requests are not allowed.")); return; }
  next();
});

app.use("/api", router);
const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Please check the form fields.", fields: error.issues.map(i => ({ field: i.path.join("."), message: i.message })) }); return;
  }
  if (error instanceof HttpError) { res.status(error.status).json({ error: error.message }); return; }
  req.log.error({ kind: error?.name || "Error", code: error?.code }, "Request failed");
  res.status(500).json({ error: "This request could not be completed. Please try again or contact reception." });
};
app.use(errorHandler);

export default app;
