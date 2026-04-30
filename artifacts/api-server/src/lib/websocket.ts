import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { logger } from "./logger";

const adminClients = new Set<WebSocket>();

export function initWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    logger.info("Admin dashboard connected via WebSocket");
    adminClients.add(ws);

    ws.send(JSON.stringify({ type: "connected", message: "Real-time connection established" }));

    ws.on("close", () => {
      adminClients.delete(ws);
      logger.info("Admin dashboard disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket error");
      adminClients.delete(ws);
    });
  });

  logger.info("WebSocket server initialized at /ws");
}

export function broadcast(event: { type: string; data: unknown }): void {
  if (adminClients.size === 0) return;
  const payload = JSON.stringify(event);
  for (const client of adminClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
