import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Simple session store (in-memory, cleared on restart)
const sessions = new Map<string, { expires: number }>();

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function authMiddleware(req: Request, res: Response, next: () => void): void {
  const token = req.headers["authorization"]?.replace("Bearer ", "") ?? req.query["token"] as string;
  const session = token ? sessions.get(token) : null;
  if (!session || session.expires < Date.now()) {
    if (token) sessions.delete(token);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// POST /api/admin/login
router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  const validUser = process.env["ADMIN_USERNAME"];
  const validPass = process.env["ADMIN_PASSWORD"];

  if (!validUser || !validPass) {
    res.status(500).json({ error: "Admin credentials not configured" });
    return;
  }

  if (username === validUser && password === validPass) {
    const token = generateToken();
    // 8-hour session
    sessions.set(token, { expires: Date.now() + 8 * 60 * 60 * 1000 });
    logger.info({ username }, "Admin login successful");
    res.json({ token });
  } else {
    logger.warn({ username }, "Admin login failed");
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// POST /api/admin/logout
router.post("/logout", (req: Request, res: Response) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

// GET /api/admin/clients
router.get("/clients", authMiddleware as unknown as (req: Request, res: Response) => void, async (req: Request, res: Response) => {
  try {
    const { status } = req.query as { status?: string };
    const query = status && status !== "all"
      ? { text: "SELECT * FROM clients WHERE status = $1 ORDER BY updated_at DESC", values: [status] }
      : { text: "SELECT * FROM clients ORDER BY updated_at DESC", values: [] };

    const result = await pool.query(query);
    res.json({ clients: result.rows });
  } catch (err) {
    logger.error({ err }, "Error fetching clients");
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// GET /api/admin/clients/:psid/messages
router.get("/clients/:psid/messages", authMiddleware as unknown as (req: Request, res: Response) => void, async (req: Request, res: Response) => {
  try {
    const { psid } = req.params;
    const result = await pool.query(
      "SELECT * FROM messages WHERE psid = $1 ORDER BY created_at ASC",
      [psid]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    logger.error({ err }, "Error fetching messages");
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// GET /api/admin/stats
router.get("/stats", authMiddleware as unknown as (req: Request, res: Response) => void, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'inquiry') AS inquiries,
        COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
        COUNT(*) FILTER (WHERE status = 'needs_followup') AS needs_followup,
        COUNT(*) AS total
      FROM clients
    `);
    res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, "Error fetching stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// PATCH /api/admin/clients/:psid/status
router.patch("/clients/:psid/status", authMiddleware as unknown as (req: Request, res: Response) => void, async (req: Request, res: Response) => {
  try {
    const { psid } = req.params;
    const { status } = req.body as { status: string };
    const valid = ["inquiry", "confirmed", "needs_followup", "cancelled"];
    if (!valid.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    await pool.query(
      "UPDATE clients SET status = $1, updated_at = NOW() WHERE psid = $2",
      [status, psid]
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Error updating status");
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
