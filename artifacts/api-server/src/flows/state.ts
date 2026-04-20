export type BookingStep =
  | "idle"
  | "choosing_intent"
  | "choosing_service"
  | "entering_date"
  | "entering_time"
  | "entering_name"
  | "entering_mobile"
  | "confirming"
  | "done";

export interface UserState {
  step: BookingStep;
  service?: string;
  date?: string;
  time?: string;
  name?: string;
  mobile?: string;
  retryCount: number;
}

const userSessions = new Map<string, UserState>();

export function getSession(psid: string): UserState {
  if (!userSessions.has(psid)) {
    userSessions.set(psid, { step: "idle", retryCount: 0 });
  }
  return userSessions.get(psid)!;
}

export function setSession(psid: string, state: Partial<UserState>): void {
  const current = getSession(psid);
  userSessions.set(psid, { ...current, ...state });
}

export function resetSession(psid: string): void {
  userSessions.set(psid, { step: "idle", retryCount: 0 });
}
