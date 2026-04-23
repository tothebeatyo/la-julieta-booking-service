import { logger } from "../lib/logger";
import { logMessage } from "./clientService";

const PAGE_ACCESS_TOKEN = process.env["PAGE_ACCESS_TOKEN"];
const GRAPH_API = "https://graph.facebook.com/v22.0/me/messages";
const GRAPH_PROFILE = "https://graph.facebook.com/v22.0";

// Instagram Messaging API uses the same Page Access Token as Messenger
function tokenForPsid(_psid: string): string | undefined {
  return PAGE_ACCESS_TOKEN;
}

/** Fetch the user's Facebook display name from their PSID. Returns null on failure. */
export async function getProfileName(psid: string): Promise<string | null> {
  if (!PAGE_ACCESS_TOKEN) {
    logger.warn({ psid }, "getProfileName: PAGE_ACCESS_TOKEN missing");
    return null;
  }
  try {
    const url = `${GRAPH_PROFILE}/${psid}?fields=first_name,last_name&access_token=${PAGE_ACCESS_TOKEN}`;
    logger.info({ psid }, "getProfileName: calling Graph API");
    const response = await fetch(url);
    const bodyText = await response.text();
    if (!response.ok) {
      logger.warn(
        { psid, status: response.status, body: bodyText.slice(0, 300) },
        "getProfileName: non-OK response from Graph API",
      );
      return null;
    }
    let data: { first_name?: string; last_name?: string; error?: unknown };
    try {
      data = JSON.parse(bodyText);
    } catch {
      logger.warn({ psid, body: bodyText.slice(0, 300) }, "getProfileName: invalid JSON");
      return null;
    }
    if (data.error) {
      logger.warn({ psid, error: data.error }, "getProfileName: Graph API returned error");
      return null;
    }
    const name = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();
    if (name.length === 0) {
      logger.warn({ psid, data }, "getProfileName: empty name in response");
      return null;
    }
    logger.info({ psid, name }, "getProfileName: SUCCESS — fetched FB name");
    return name;
  } catch (err) {
    logger.warn({ err, psid }, "getProfileName: exception");
    return null;
  }
}

async function callSendAPI(body: object, psid?: string): Promise<void> {
  const token = psid ? tokenForPsid(psid) : PAGE_ACCESS_TOKEN;
  if (!token) {
    logger.error("No access token available for sending message");
    return;
  }
  logger.info({ body: JSON.stringify(body).slice(0, 120) }, "Calling Messenger/Instagram API");
  const response = await fetch(`${GRAPH_API}?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text }, "Messenger/Instagram API error");
  } else {
    const json = await response.json() as { message_id?: string };
    logger.info({ message_id: json.message_id }, "Messenger/Instagram API success");
  }
}

export async function sendTypingOn(recipientId: string): Promise<void> {
  await callSendAPI({
    recipient: { id: recipientId },
    sender_action: "typing_on",
  }, recipientId);
}

export async function sendTypingOff(recipientId: string): Promise<void> {
  await callSendAPI({
    recipient: { id: recipientId },
    sender_action: "typing_off",
  }, recipientId);
}

export async function sendText(recipientId: string, text: string): Promise<void> {
  await callSendAPI({
    messaging_type: "RESPONSE",
    recipient: { id: recipientId },
    message: { text },
  }, recipientId);
  logMessage(recipientId, "outbound", text).catch((err) =>
    logger.error({ err, psid: recipientId }, "Failed to log outbound message"),
  );
}

export async function sendTextWithQuickReplies(
  recipientId: string,
  text: string,
  quickReplies: { title: string; payload: string }[],
): Promise<void> {
  await callSendAPI({
    messaging_type: "RESPONSE",
    recipient: { id: recipientId },
    message: {
      text,
      quick_replies: quickReplies.map((qr) => ({
        content_type: "text",
        title: qr.title,
        payload: qr.payload,
      })),
    },
  }, recipientId);
  // Log the bot's reply (with quick reply hints) for the admin dashboard
  const qrHint = quickReplies.length > 0
    ? `\n[Quick replies: ${quickReplies.map((qr) => qr.title).join(" · ")}]`
    : "";
  logMessage(recipientId, "outbound", text + qrHint).catch((err) =>
    logger.error({ err, psid: recipientId }, "Failed to log outbound message"),
  );
}

export async function sendWithDelay(
  recipientId: string,
  text: string,
  delayMs = 1500,
): Promise<void> {
  await sendTypingOn(recipientId);
  await new Promise((r) => setTimeout(r, delayMs));
  await sendTypingOff(recipientId);
  await sendText(recipientId, text);
}

export async function sendWithDelayAndQuickReplies(
  recipientId: string,
  text: string,
  quickReplies: { title: string; payload: string }[],
  delayMs = 1500,
): Promise<void> {
  await sendTypingOn(recipientId);
  await new Promise((r) => setTimeout(r, delayMs));
  await sendTypingOff(recipientId);
  await sendTextWithQuickReplies(recipientId, text, quickReplies);
}
