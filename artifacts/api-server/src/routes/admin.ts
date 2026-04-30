import { randomBytes } from "crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { retryAutoBooking } from "../services/anyplusService";

const router: IRouter = Router();

// Create the admin_sessions table if it doesn't exist yet
async function initSessionTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token      TEXT        PRIMARY KEY,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);
}
initSessionTable().catch((err) => logger.error({ err }, "Failed to initialise admin_sessions table"));

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

async function authMiddleware(req: Request, res: Response, next: () => void): Promise<void> {
  const token = req.headers["authorization"]?.replace("Bearer ", "") ?? req.query["token"] as string;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const result = await pool.query<{ expires_at: Date }>(
      "SELECT expires_at FROM admin_sessions WHERE token = $1",
      [token],
    );
    const row = result.rows[0];
    if (!row || row.expires_at < new Date()) {
      await pool.query("DELETE FROM admin_sessions WHERE token = $1", [token]);
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  } catch (err) {
    logger.error({ err }, "Session lookup failed");
    res.status(500).json({ error: "Internal error" });
  }
}

// POST /api/admin/login
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  const validUser = process.env["ADMIN_USERNAME"];
  const validPass = process.env["ADMIN_PASSWORD"];

  if (!validUser || !validPass) {
    res.status(500).json({ error: "Admin credentials not configured" });
    return;
  }

  if (username === validUser && password === validPass) {
    try {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
      await pool.query(
        "INSERT INTO admin_sessions (token, expires_at) VALUES ($1, $2)",
        [token, expiresAt],
      );
      logger.info({ username }, "Admin login successful");
      res.json({ token });
    } catch (err) {
      logger.error({ err }, "Failed to create session");
      res.status(500).json({ error: "Login failed" });
    }
  } else {
    logger.warn({ username }, "Admin login failed");
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// POST /api/admin/logout
router.post("/logout", async (req: Request, res: Response) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (token) {
    await pool.query("DELETE FROM admin_sessions WHERE token = $1", [token]).catch(() => {});
  }
  res.json({ ok: true });
});

// GET /api/admin/clients
// Supports ?status=... and ?lead_status=... filters
router.get("/clients", authMiddleware as unknown as (req: Request, res: Response) => void, async (req: Request, res: Response) => {
  try {
    const { status, lead_status, safety_flag } = req.query as { status?: string; lead_status?: string; safety_flag?: string };

    let query: { text: string; values: unknown[] };

    const { anypluspro_status } = req.query as Record<string, string>;

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
    } else if (anypluspro_status && anypluspro_status !== "all") {
      query = {
        text: "SELECT * FROM clients WHERE anypluspro_status = $1 ORDER BY updated_at DESC",
        values: [anypluspro_status],
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
        COUNT(*) FILTER (WHERE lead_status = 'skin_concern_inquiry') AS skin_concerns,
        COUNT(*) FILTER (WHERE anypluspro_status = 'auto_booked') AS auto_booked,
        COUNT(*) FILTER (WHERE anypluspro_status = 'manual_booking_required') AS manual_booking_required,
        COUNT(*) FILTER (WHERE email IS NOT NULL) AS with_email,
        COUNT(*) FILTER (WHERE email_consent = TRUE) AS email_consented
      FROM clients
    `);
    res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, "Error fetching stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// POST /api/admin/clients/:psid/retry-booking
router.post("/clients/:psid/retry-booking", authMiddleware as unknown as (req: Request, res: Response) => void, async (req: Request, res: Response) => {
  try {
    const psid = req.params["psid"] as string;
    const result = await retryAutoBooking(psid);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Error retrying auto booking");
    res.status(500).json({ error: "Failed to retry booking" });
  }
});

// POST /api/admin/clients/:psid/mark-manually-booked
router.post("/clients/:psid/mark-manually-booked", authMiddleware as unknown as (req: Request, res: Response) => void, async (req: Request, res: Response) => {
  try {
    const { psid } = req.params;
    await pool.query(
      `UPDATE clients SET
        status = 'confirmed',
        lead_status = 'booking_confirmed',
        anypluspro_status = 'auto_booked',
        updated_at = NOW()
       WHERE psid = $1`,
      [psid]
    );
    logger.info({ psid }, "Client marked as manually booked");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Error marking as manually booked");
    res.status(500).json({ error: "Failed to mark as manually booked" });
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
