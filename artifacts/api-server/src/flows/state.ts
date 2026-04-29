export type BookingStep =
  | "idle"
  | "choosing_intent"
  | "choosing_skin_concern"
  | "safety_screening"
  | "choosing_service"
  | "awaiting_book_decision"
  | "entering_date"
  | "entering_time"
  | "entering_name"
  | "entering_mobile"
  | "confirming"
  | "done";

export type MessageChannel = "messenger" | "instagram";

export interface UserState {
  step: BookingStep;
  service?: string;
  date?: string;
  time?: string;
  name?: string;
  mobile?: string;
  retryCount: number;
  channel: MessageChannel;
  concern?: string;
  safetyFlags?: string[];
  screeningStep?: number;
  pendingService?: string;
  intent?: string;
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
