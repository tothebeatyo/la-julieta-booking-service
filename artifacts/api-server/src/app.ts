import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import router from "./routes";
import webhookRouter from "./routes/webhook";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Webhook mounted at /webhook (no /api prefix) — MUST come before static files
app.use("/webhook", webhookRouter);

// All other API routes under /api — MUST come before static files
app.use("/api", router);

// Serve the compiled React admin dashboard for all other routes
const publicDir = path.resolve(__dirname, "public");
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA fallback — serve index.html for any unmatched route (Express 5 requires /*)
  app.get("/{*path}", (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

export default app;
