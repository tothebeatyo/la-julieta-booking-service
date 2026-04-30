// Required Facebook webhook subscriptions:
// - messages
// - messaging_postbacks
// - messaging_referrals  ← needed for ad replies
// - feed                 ← needed for comments
// - messaging_optins

import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { handleBookingFlow } from "../flows/bookingFlow";
import { getSession, setSession } from "../flows/state";
import {
  sendWithDelay,
  sendWithDelayAndQuickReplies,
  getProfileName,
} from "../services/messengerService";
import { detectIntent } from "../flows/intentDetector";
import {
  WELCOME_MESSAGES,
  INTENT_MENU_TEXT,
  INTENT_QUICK_REPLIES,
  randomPick,
} from "../flows/responses";
import { upsertClient, logMessage } from "../services/clientService";

const router: IRouter = Router();

const VERIFY_TOKEN = process.env["VERIFY_TOKEN"];

// GET /webhook — Facebook webhook verification
router.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  logger.info({ mode, token }, "Webhook verification attempt");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logger.info("Webhook verified successfully");
    res.status(200).send(challenge);
  } else {
    logger.warn({ mode, token }, "Webhook verification failed");
    res.sendStatus(403);
  }
});

// POST /webhook — receive messages (Messenger + Instagram)
router.post("/", (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const object = body["object"] as string | undefined;

  const entries = (body["entry"] as Record<string, unknown>[]) || [];

  logger.info(
    {
      object,
      body: JSON.stringify(body).slice(0, 1000),
    },
    "RAW WEBHOOK EVENT",
  );

  // Accept page, instagram, AND any other object type — reject only if missing
  if (!object) {
    res.sendStatus(404);
    return;
  }

  // Always acknowledge immediately — Facebook requires 200 within 20s
  res.sendStatus(200);

  const channel: "messenger" | "instagram" =
    object === "instagram" ? "instagram" : "messenger";

  for (const entry of entries) {
    // Handle regular messages
    const messaging = (entry["messaging"] as Record<string, unknown>[]) || [];
    for (const event of messaging) {
      processEvent(event, channel).catch((err) => {
        logger.error({ err, event }, "Error processing event");
      });
    }

    // Handle standby channel (Handover Protocol — secondary receiver)
    const standbyChannel = (entry["standby"] as Record<string, unknown>[]) || [];
    for (const event of standbyChannel) {
      processEvent(event, channel).catch((err) => {
        logger.error({ err }, "Error processing standby event");
      });
    }

    // Handle changes (comments, reactions, Instagram DMs via changes array)
    const changes = (entry["changes"] as Record<string, unknown>[]) || [];
    for (const change of changes) {
      const field = change["field"] as string;
      if (field === "messages") {
        const value = change["value"] as Record<string, unknown>;
        processEvent(value, channel).catch((err) => {
          logger.error({ err }, "Error processing change event");
        });
      }
    }
  }
});

async function processEvent(
  event: Record<string, unknown>,
  channel: "messenger" | "instagram" = "messenger",
): Promise<void> {
  try {
    // Get sender ID from multiple possible locations
    const sender = (event["sender"] ?? event["from"]) as
      | { id: string }
      | undefined;

    if (!sender?.id) {
      logger.warn({ event: JSON.stringify(event).slice(0, 300) }, "No sender ID found — skipping");
      return;
    }

    const psid = sender.id;

    // Ignore delivery and read receipts
    if (event["delivery"] || event["read"]) return;

    const message = event["message"] as Record<string, unknown> | undefined;
    const postback = event["postback"] as
      | { payload?: string; title?: string }
      | undefined;
    const referral = event["referral"] as Record<string, unknown> | undefined;

    // Ignore page's own echoes
    if (message?.["is_echo"]) return;

    const text = (
      (message?.["text"] as string | undefined) ??
      (event["text"] as string | undefined) ??
      ""
    ).trim();

    const quickReplyPayload = (
      message?.["quick_reply"] as { payload?: string } | undefined
    )?.payload;
    const postbackPayload = postback?.payload;
    const payload = quickReplyPayload ?? postbackPayload;
    const adId = referral?.["ad_id"] as string | undefined;

    logger.info({ psid, channel, text, payload, adId }, "Processing message");

    // Persist session channel
    setSession(psid, { channel });

    // Log and upsert client regardless of message type
    const inboundContent = text || payload || (adId ? "(ad click)" : "(unknown)");
    const channelTag = channel === "instagram" ? "[IG] " : "";

    logMessage(psid, "inbound", channelTag + inboundContent).catch((err) =>
      logger.error({ err, psid }, "Failed to log message"),
    );

    upsertClient({
      psid,
      lastMessage: inboundContent,
      status: "inquiry",
      channel,
      ...(adId ? { leadSource: "facebook_ad" } : {}),
    }).catch((err) => logger.error({ err, psid }, "Failed to upsert client"));

    // Get profile name in background
    getProfileName(psid)
      .then((name) => {
        if (name) {
          upsertClient({ psid, name, channel }).catch(() => {});
        }
      })
      .catch(() => {});

    // If no text and no payload (pure ad click / empty referral) → show welcome
    if (!text && !payload) {
      logger.info({ psid, adId }, "Empty message/ad click — showing welcome");
      setSession(psid, { step: "choosing_intent" });
      await sendWithDelay(psid, randomPick(WELCOME_MESSAGES), 800);
      await sendWithDelayAndQuickReplies(
        psid,
        INTENT_MENU_TEXT,
        INTENT_QUICK_REPLIES,
        1000,
      );
      return;
    }

    const session = getSession(psid);

    // New conversation — show welcome for greetings
    if (session.step === "idle" && !payload) {
      const intent = detectIntent(text);
      if (!intent || intent === "greeting") {
        logger.info({ psid }, "Sending welcome + intent menu");
        setSession(psid, { step: "choosing_intent" });
        await sendWithDelay(psid, randomPick(WELCOME_MESSAGES), 800);
        await sendWithDelayAndQuickReplies(
          psid,
          INTENT_MENU_TEXT,
          INTENT_QUICK_REPLIES,
          1000,
        );
        logger.info({ psid }, "Welcome flow complete");
        return;
      }
      setSession(psid, { step: "choosing_intent" });
    }

    logger.info({ psid, text, payload }, "Routing to booking flow");
    await handleBookingFlow(psid, text, payload);
    logger.info({ psid }, "Booking flow step complete");
  } catch (err) {
    logger.error(
      {
        err,
        psid: (event["sender"] as { id?: string } | undefined)?.id ?? "unknown",
        text: (event["message"] as Record<string, unknown> | undefined)?.["text"],
        payload: (event["postback"] as { payload?: string } | undefined)?.payload,
        channel,
      },
      "CRITICAL: processEvent crashed",
    );

    // Send fallback so client always gets a response
    const fallbackId = (
      (event["sender"] ?? event["from"]) as { id?: string } | undefined
    )?.id;
    if (fallbackId) {
      try {
        await sendWithDelay(
          fallbackId,
          "Hi! 💕 Sorry for the delay. How can we help you today?",
          500,
        );
      } catch (sendErr) {
        logger.error({ sendErr }, "Fallback message also failed");
      }
    }
  }
}

export default router;
