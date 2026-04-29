import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

export type ClientStatus = "inquiry" | "confirmed" | "needs_followup" | "cancelled" | "booking_requested" | "escalated";
export type ClientChannel = "messenger" | "instagram";

export async function upsertClient(data: {
  psid: string;
  name?: string;
  mobile?: string;
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
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO clients (psid, name, mobile, status, last_message, service, booking_date, booking_time, reference_no, channel, concern, recommended_service, safety_flags, intent, lead_status, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
       ON CONFLICT (psid) DO UPDATE SET
         name = COALESCE($2, clients.name),
         mobile = COALESCE($3, clients.mobile),
         status = COALESCE($4, clients.status),
         last_message = COALESCE($5, clients.last_message),
         service = COALESCE($6, clients.service),
         booking_date = COALESCE($7, clients.booking_date),
         booking_time = COALESCE($8, clients.booking_time),
         reference_no = COALESCE($9, clients.reference_no),
         channel = COALESCE($10, clients.channel),
         concern = COALESCE($11, clients.concern),
         recommended_service = COALESCE($12, clients.recommended_service),
         safety_flags = COALESCE($13, clients.safety_flags),
         intent = COALESCE($14, clients.intent),
         lead_status = COALESCE($15, clients.lead_status),
         updated_at = NOW()`,
      [
        data.psid,
        data.name ?? null,
        data.mobile ?? null,
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
      ]
    );
  } catch (err) {
    logger.error({ err, psid: data.psid }, "Failed to upsert client");
  }
}

export async function logMessage(psid: string, direction: "inbound" | "outbound", content: string): Promise<void> {
  try {
    await pool.query(
      "INSERT INTO messages (psid, direction, content) VALUES ($1, $2, $3)",
      [psid, direction, content]
    );
  } catch (err) {
    logger.error({ err, psid }, "Failed to log message");
  }
}
