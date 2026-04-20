import { logger } from "../lib/logger";

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

  return { success: true, referenceNo };
}
