import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { initWebSocket } from "./lib/websocket";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function runStartupDiagnostic(): Promise<void> {
  try {
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    logger.info({ tables: tables.rows.map((r: { table_name: string }) => r.table_name) }, "DB TABLES");

    const msgCount = await pool.query("SELECT COUNT(*) as total FROM messages");
    logger.info({ count: msgCount.rows[0] }, "MESSAGES COUNT");

    const clientCount = await pool.query("SELECT COUNT(*) as total FROM clients");
    logger.info({ count: clientCount.rows[0] }, "CLIENTS COUNT");

    const recentMsgs = await pool.query(
      "SELECT psid, direction, LEFT(content, 60) as content, created_at FROM messages ORDER BY created_at DESC LIMIT 5",
    );
    logger.info({ messages: recentMsgs.rows }, "RECENT MESSAGES");

    // Ensure messages table and indexes exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id        SERIAL PRIMARY KEY,
        psid      TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
        content   TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_messages_psid    ON messages(psid);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
    `);
    logger.info("Messages table ensured OK");
  } catch (err) {
    logger.error({ err }, "STARTUP DIAGNOSTIC FAILED");
  }
}

const server = createServer(app);
initWebSocket(server);

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  runStartupDiagnostic();
});
