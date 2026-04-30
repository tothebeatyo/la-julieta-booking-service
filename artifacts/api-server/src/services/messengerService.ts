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
    logger.error("callSendAPI: No PAGE_ACCESS_TOKEN — cannot send message");
    return;
  }

  const url = `${GRAPH_API}?access_token=<redacted>`;
  const requestBody = JSON.stringify(body);

  logger.info({ url, requestBody }, "callSendAPI: sending request to Graph API");

  let response: Response;
  try {
    response = await fetch(`${GRAPH_API}?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });
  } catch (err) {
    logger.error({ err, url }, "callSendAPI: fetch threw — network error or DNS failure");
    throw err;
  }

  const responseText = await response.text();

  logger.info(
    { url, status: response.status, responseBody: responseText },
    "callSendAPI: received response from Graph API",
  );

  if (!response.ok) {
    let fbMessage = responseText;
    try {
      const parsed = JSON.parse(responseText) as { error?: { message?: string; type?: string; code?: number } };
      if (parsed.error) {
        fbMessage = `[FB ${parsed.error.code ?? "?"}] ${parsed.error.type ?? ""}: ${parsed.error.message ?? responseText}`;
      }
    } catch {
      // raw text is already captured
    }
    logger.error(
      { url, status: response.status, responseBody: responseText },
      `callSendAPI: Graph API returned error — ${fbMessage}`,
    );
    throw new Error(`Messenger API error (HTTP ${response.status}): ${fbMessage}`);
  }

  try {
    const json = JSON.parse(responseText) as { message_id?: string };
    logger.info({ url, message_id: json.message_id }, "callSendAPI: message delivered successfully");
  } catch {
    logger.warn({ url, responseBody: responseText }, "callSendAPI: success status but non-JSON response body");
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
