import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import webhookRouter from "./routes/webhook";
import { logger } from "./lib/logger";

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

// Webhook and API routes FIRST — highest priority
app.use("/webhook", webhookRouter);
app.use("/api", router);

// Serve the React frontend (chatbot-landing) build output
// Resolve relative to this file's location so it works in both dev (src/) and production (dist/)
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(currentDir, "../../chatbot-landing/dist/public");
logger.info({ publicDir }, "Static files directory");

if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA fallback — serve index.html for all unmatched routes
  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
} else {
  logger.warn({ publicDir }, "Frontend build not found — React app will not be served");
}

export default app;
