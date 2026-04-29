import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

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
// Supports ?status=... and ?lead_status=... filters
router.get("/clients", authMiddleware as unknown as (req: Request, res: Response) => void, async (req: Request, res: Response) => {
  try {
    const { status, lead_status, safety_flag } = req.query as { status?: string; lead_status?: string; safety_flag?: string };

    let query: { text: string; values: unknown[] };

    if (safety_flag === "pregnant") {
      query = {
        text: "SELECT * FROM clients WHERE safety_flags LIKE '%pregnant%' ORDER BY updated_at DESC",
        values: [],
      };
    } else if (safety_flag === "injection_allergy") {
      query = {
        text: "SELECT * FROM clients WHERE safety_flags LIKE '%injection_allergy%' ORDER BY updated_at DESC",
        values: [],
      };
    } else if (lead_status && lead_status !== "all") {
      query = {
        text: "SELECT * FROM clients WHERE lead_status = $1 ORDER BY updated_at DESC",
        values: [lead_status],
      };
    } else if (status && status !== "all") {
      query = {
        text: "SELECT * FROM clients WHERE status = $1 ORDER BY updated_at DESC",
        values: [status],
      };
    } else {
      query = { text: "SELECT * FROM clients ORDER BY updated_at DESC", values: [] };
    }

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
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'inquiry') AS inquiries,
        COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
        COUNT(*) FILTER (WHERE status = 'needs_followup') AS needs_followup,
        COUNT(*) FILTER (WHERE lead_status = 'booking_requested' OR lead_status = 'booking_confirmed') AS bookings,
        COUNT(*) FILTER (WHERE lead_status = 'escalated') AS escalated,
        COUNT(*) FILTER (WHERE safety_flags IS NOT NULL AND safety_flags != 'none') AS safety_flagged,
        COUNT(*) FILTER (WHERE lead_status = 'skin_concern_inquiry') AS skin_concerns
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
    const valid = ["inquiry", "confirmed", "needs_followup", "cancelled", "booking_requested", "escalated"];
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

// POST /api/admin/setup-persistent-menu
// Call this once to register the Messenger persistent menu
router.post("/setup-persistent-menu", authMiddleware as unknown as (req: Request, res: Response) => void, async (_req: Request, res: Response) => {
  const token = process.env["PAGE_ACCESS_TOKEN"];
  if (!token) {
    res.status(500).json({ error: "PAGE_ACCESS_TOKEN not set" });
    return;
  }

  const menuPayload = {
    persistent_menu: [
      {
        locale: "default",
        composer_input_disabled: false,
        call_to_actions: [
          {
            title: "📅 Book Appointment",
            type: "postback",
            payload: "INTENT_BOOK",
          },
          {
            title: "💆 Services & Concerns",
            type: "nested",
            call_to_actions: [
              { title: "💆 Facial Treatments", type: "postback", payload: "INTENT_FACIALS" },
              { title: "✨ Skin Concerns", type: "postback", payload: "INTENT_SKIN_CONCERN" },
              { title: "💉 Injectables / Gluta", type: "postback", payload: "INTENT_INJECTABLES" },
            ],
          },
          {
            title: "🎉 Promos & Contact",
            type: "nested",
            call_to_actions: [
              { title: "🎉 View Promos", type: "postback", payload: "INTENT_PROMOS" },
              { title: "👩‍⚕️ Talk to Agent", type: "postback", payload: "INTENT_STAFF" },
            ],
          },
        ],
      },
    ],
  };

  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/me/messenger_profile?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(menuPayload),
      }
    );
    const data = await r.json() as unknown;
    if (!r.ok) {
      logger.warn({ data }, "Persistent menu setup failed");
      res.status(r.status).json({ error: "Meta API error", detail: data });
    } else {
      logger.info("Persistent menu set up successfully");
      res.json({ ok: true, result: data });
    }
  } catch (err) {
    logger.error({ err }, "Error setting up persistent menu");
    res.status(500).json({ error: "Failed to call Meta API" });
  }
});

export default router;
