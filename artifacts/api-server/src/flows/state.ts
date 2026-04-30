export type BookingStep =
  | "idle"
  | "choosing_intent"
  | "choosing_skin_concern"
  | "safety_screening"
  | "choosing_service"
  | "viewing_service"
  | "awaiting_book_decision"
  | "entering_booking_form"
  | "awaiting_missing_field"
  | "final_confirming"
  | "done";

export type MessageChannel = "messenger" | "instagram";

export interface UserState {
  step: BookingStep;
  service?: string;
  date?: string;
  time?: string;
  name?: string;
  mobile?: string;
  email?: string;
  emailConsent?: boolean;
  notes?: string;
  retryCount: number;
  channel: MessageChannel;
  concern?: string;
  safetyFlags?: string[];
  screeningStep?: number;
  screeningPassed?: boolean;
  pendingService?: string;
  intent?: string;
  clientType?: string;
  missingFields?: string[];
  serviceCategory?: string;
}

const userSessions = new Map<string, UserState>();

export function getSession(psid: string): UserState {
  if (!userSessions.has(psid)) {
    userSessions.set(psid, { step: "idle", retryCount: 0, channel: "messenger" });
  }
  return userSessions.get(psid)!;
}

export function setSession(psid: string, state: Partial<UserState>): void {
  const current = getSession(psid);
  userSessions.set(psid, { ...current, ...state });
}

export function resetSession(psid: string): void {
  const current = getSession(psid);
  userSessions.set(psid, { step: "idle", retryCount: 0, channel: current.channel ?? "messenger" });
}
