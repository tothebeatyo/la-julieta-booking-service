import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

export type ClientStatus = "inquiry" | "confirmed" | "needs_followup" | "cancelled";

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
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO clients (psid, name, mobile, status, last_message, service, booking_date, booking_time, reference_no, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (psid) DO UPDATE SET
         name = COALESCE($2, clients.name),
         mobile = COALESCE($3, clients.mobile),
         status = COALESCE($4, clients.status),
         last_message = COALESCE($5, clients.last_message),
         service = COALESCE($6, clients.service),
         booking_date = COALESCE($7, clients.booking_date),
         booking_time = COALESCE($8, clients.booking_time),
         reference_no = COALESCE($9, clients.reference_no),
         updated_at = NOW()`,
      [
        data.psid,
        data.name ?? null,
        data.mobile ?? null,
        data.status ?? "inquiry",
        data.lastMessage ?? null,
        data.service ?? null,
        data.bookingDate ?? null,
        data.bookingTime ?? null,
        data.referenceNo ?? null,
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
