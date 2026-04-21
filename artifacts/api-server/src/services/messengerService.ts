import { logger } from "../lib/logger";

const PAGE_ACCESS_TOKEN = process.env["PAGE_ACCESS_TOKEN"];
const GRAPH_API = "https://graph.facebook.com/v22.0/me/messages";
const GRAPH_PROFILE = "https://graph.facebook.com/v22.0";

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

async function callSendAPI(body: object): Promise<void> {
  if (!PAGE_ACCESS_TOKEN) {
    logger.error("PAGE_ACCESS_TOKEN is not set");
    return;
  }
  logger.info({ body: JSON.stringify(body).slice(0, 120) }, "Calling Messenger API");
  const response = await fetch(`${GRAPH_API}?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text }, "Messenger API error");
  } else {
    const json = await response.json() as { message_id?: string };
    logger.info({ message_id: json.message_id }, "Messenger API success");
  }
}

export async function sendTypingOn(recipientId: string): Promise<void> {
  await callSendAPI({
    recipient: { id: recipientId },
    sender_action: "typing_on",
  });
}

export async function sendTypingOff(recipientId: string): Promise<void> {
  await callSendAPI({
    recipient: { id: recipientId },
    sender_action: "typing_off",
  });
}

export async function sendText(recipientId: string, text: string): Promise<void> {
  await callSendAPI({
    messaging_type: "RESPONSE",
    recipient: { id: recipientId },
    message: { text },
  });
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
  });
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
