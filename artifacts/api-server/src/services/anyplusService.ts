import { logger } from "../lib/logger";
import { upsertClient } from "./clientService";

export interface BookingPayload {
  psid: string;
  service: string;
  date: string;
  time: string;
  name: string;
  mobile: string;
}

export interface BookingResult {
  success: boolean;
  referenceNo?: string;
  error?: string;
}

export async function createReservation(payload: BookingPayload): Promise<BookingResult> {
  logger.info({ payload }, "Creating reservation");

  // TODO: Replace with real booking API (e.g. AnyPlus, Fresha, etc.)
  await new Promise((r) => setTimeout(r, 500));

  const referenceNo = `LJB-${Date.now().toString().slice(-6)}`;
  logger.info({ referenceNo }, "Reservation created (mock)");

  // Save confirmed booking to DB
  await upsertClient({
    psid: payload.psid,
    name: payload.name,
    mobile: payload.mobile,
    status: "confirmed",
    service: payload.service,
    bookingDate: payload.date,
    bookingTime: payload.time,
    referenceNo,
    lastMessage: `Confirmed booking for ${payload.service} on ${payload.date} at ${payload.time}`,
  });

  return { success: true, referenceNo };
}
