import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

export type ClientStatus =
  | "inquiry"
  | "confirmed"
  | "needs_followup"
  | "cancelled"
  | "booking_requested"
  | "escalated";

export type ClientChannel = "messenger" | "instagram";

export type AnyPlusProStatus =
  | "pending"
  | "auto_booked"
  | "manual_booking_required"
  | "skipped";

export async function upsertClient(data: {
  psid: string;
  name?: string;
  mobile?: string;
  email?: string;
  emailConsent?: boolean;
  notes?: string;
  status?: ClientStatus;
  lastMessage?: string;
  service?: string;
  bookingDate?: string;
  bookingTime?: string;
  referenceNo?: string;
  channel?: ClientChannel;
  concern?: string;
  recommendedService?: string;
  safetyFlags?: string;
  intent?: string;
  leadStatus?: string;
  leadSource?: string;
  anyPlusProStatus?: AnyPlusProStatus;
  anyPlusProError?: string;
  anyPlusProScreenshot?: string;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO clients (
         psid, name, mobile, email, email_consent, notes,
         status, last_message, service, booking_date, booking_time,
         reference_no, channel, concern, recommended_service,
         safety_flags, intent, lead_status, lead_source,
         anypluspro_status, anypluspro_error, anypluspro_screenshot,
         updated_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,NOW())
       ON CONFLICT (psid) DO UPDATE SET
         name                = COALESCE($2,  clients.name),
         mobile              = COALESCE($3,  clients.mobile),
         email               = COALESCE($4,  clients.email),
         email_consent       = COALESCE($5,  clients.email_consent),
         notes               = COALESCE($6,  clients.notes),
         status              = COALESCE($7,  clients.status),
         last_message        = COALESCE($8,  clients.last_message),
         service             = COALESCE($9,  clients.service),
         booking_date        = COALESCE($10, clients.booking_date),
         booking_time        = COALESCE($11, clients.booking_time),
         reference_no        = COALESCE($12, clients.reference_no),
         channel             = COALESCE($13, clients.channel),
         concern             = COALESCE($14, clients.concern),
         recommended_service = COALESCE($15, clients.recommended_service),
         safety_flags        = COALESCE($16, clients.safety_flags),
         intent              = COALESCE($17, clients.intent),
         lead_status         = COALESCE($18, clients.lead_status),
         lead_source         = COALESCE($19, clients.lead_source),
         anypluspro_status   = COALESCE($20, clients.anypluspro_status),
         anypluspro_error    = COALESCE($21, clients.anypluspro_error),
         anypluspro_screenshot = COALESCE($22, clients.anypluspro_screenshot),
         updated_at          = NOW()`,
      [
        data.psid,
        data.name ?? null,
        data.mobile ?? null,
        data.email ?? null,
        data.emailConsent ?? null,
        data.notes ?? null,
        data.status ?? null,
        data.lastMessage ?? null,
        data.service ?? null,
        data.bookingDate ?? null,
        data.bookingTime ?? null,
        data.referenceNo ?? null,
        data.channel ?? null,
        data.concern ?? null,
        data.recommendedService ?? null,
        data.safetyFlags ?? null,
        data.intent ?? null,
        data.leadStatus ?? null,
        data.leadSource ?? null,
        data.anyPlusProStatus ?? null,
        data.anyPlusProError ?? null,
        data.anyPlusProScreenshot ?? null,
      ]
    );
  } catch (err) {
    logger.error({ err, psid: data.psid }, "Failed to upsert client");
  }
}

export async function logMessage(psid: string, direction: "inbound" | "outbound", content: string): Promise<void> {
  try {
    if (!psid || !content) {
      logger.warn({ psid, direction }, "logMessage called with missing data — skipping");
      return;
    }
    await pool.query(
      `INSERT INTO messages (psid, direction, content, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [psid, direction, content.slice(0, 2000)],
    );
    logger.info({ psid, direction, contentLength: content.length }, "Message logged");
  } catch (err) {
    logger.error({ err, psid, direction }, "CRITICAL: Failed to log message to DB");
  }
}
