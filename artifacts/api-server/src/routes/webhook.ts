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

  // ISSUE 4: robust object/channel detection
  const object = body["object"] as string | undefined;
  const channel: "messenger" | "instagram" =
    object === "instagram" ? "instagram" : "messenger";

  const entries = (body["entry"] as Record<string, unknown>[]) || [];

  // ISSUE 5: raw webhook logging before any processing
  logger.info(
    {
      object,
      entryCount: entries.length,
      firstEntry: JSON.stringify(entries[0]).slice(0, 500),
    },
    "RAW WEBHOOK EVENT RECEIVED",
  );

  if (object !== "page" && object !== "instagram") {
    res.sendStatus(404);
    return;
  }

  // Acknowledge immediately — Facebook requires 200 within 20s
  res.sendStatus(200);

  // ISSUE 4: per-entry channel detection + normal messaging loop
  for (const entry of entries) {
    const entryChannel: "messenger" | "instagram" =
      entry["instagram_business_account"] !== undefined ? "instagram" : channel;

    const messaging = (entry["messaging"] as Record<string, unknown>[]) || [];
    for (const event of messaging) {
      processEvent(event, entryChannel).catch((err) => {
        logger.error({ err }, "Error processing messaging event");
      });
    }

    // ISSUE 1: ad referral messages — some ad clicks arrive with referral at
    // the messaging-event level but no text; ensure they're always processed
    for (const event of messaging) {
      const referral = event["referral"] as Record<string, unknown> | undefined;
      const adId = referral?.["ad_id"] as string | undefined;
      if (adId) {
        logger.info({ adId }, "Ad referral message detected (secondary check)");
      }
    }

    // Also handle top-level entry referrals (some ad formats use this structure)
    const entryReferral = entry["referral"] as Record<string, unknown> | undefined;
    if (entryReferral?.["ad_id"]) {
      const adId = entryReferral["ad_id"] as string;
      logger.info({ adId }, "Top-level entry ad referral detected");
      // Build a synthetic event so processEvent can handle it
      const sender = (entry["sender"] as { id: string } | undefined) ?? (entry["id"] ? { id: entry["id"] as string } : undefined);
      if (sender?.id) {
        const syntheticEvent: Record<string, unknown> = {
          sender,
          referral: entryReferral,
        };
        processEvent(syntheticEvent, entryChannel).catch((err) => {
          logger.error({ err }, "Error processing top-level ad referral event");
        });
      }
    }
  }
});

async function processEvent(
  event: Record<string, unknown>,
  channel: "messenger" | "instagram" = "messenger",
): Promise<void> {
  // ISSUE 3: wrap entire function body in try-catch
  try {
    const sender = event["sender"] as { id: string } | undefined;
    if (!sender?.id) return;

    const psid = sender.id;

    // Read delivery / read receipts — ignore
    if (event["delivery"] || event["read"]) return;

    const message = event["message"] as Record<string, unknown> | undefined;
    const postback = event["postback"] as
      | { payload?: string; title?: string }
      | undefined;

    // Detect ad reply context — present on referral events AND messages after clicking an ad
    const referral = (event["referral"] ?? message?.["referral"]) as
      | Record<string, unknown>
      | undefined;
    const adId = referral?.["ad_id"] as string | undefined;

    // Allow through if it's a regular message/postback OR an ad referral open-thread event
    if (!message && !postback && !adId) return;

    // Echo from the page itself — ignore
    if (message?.["is_echo"]) return;

    const text = (message?.["text"] as string | undefined)?.trim() ?? "";
    const quickReplyPayload = (
      message?.["quick_reply"] as { payload?: string } | undefined
    )?.payload;
    const postbackPayload = postback?.payload;
    const payload = quickReplyPayload ?? postbackPayload;

    logger.info({ psid, channel, text, payload, adId }, "Processing message");

    // Persist channel in session so all send functions know which token to use
    setSession(psid, { channel });

    // Fire-and-forget DB logging
    const inboundContent =
      text || payload || (adId ? "(ad reply)" : "(postback)");
    const channelTag = channel === "instagram" ? "[IG] " : "";
    logMessage(psid, "inbound", channelTag + inboundContent).catch((err) =>
      logger.error({ err, psid }, "Failed to log inbound message"),
    );

    if (adId) {
      logger.info({ psid, adId }, "Message from ad reply");
      upsertClient({
        psid,
        lastMessage: inboundContent,
        status: "inquiry",
        channel,
        leadSource: "facebook_ad",
      }).catch((err) =>
        logger.error({ err, psid }, "Failed to upsert ad-reply client"),
      );
    } else {
      upsertClient({
        psid,
        lastMessage: inboundContent,
        status: "inquiry",
        channel,
      }).catch((err) =>
        logger.error({ err, psid }, "Failed to upsert client"),
      );
    }

    getProfileName(psid)
      .then((name) => {
        if (name) {
          upsertClient({ psid, name, channel }).catch((err) =>
            logger.error({ err, psid }, "Failed to save profile name"),
          );
        }
      })
      .catch(() => {});

    // ISSUE 2: empty ad referral — treat as greeting
    if (!text && !payload && referral?.["ad_id"]) {
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

    // New conversation — show welcome
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
      // If they typed something specific right away (e.g. "book" or "facial"), handle it
      setSession(psid, { step: "choosing_intent" });
    }

    logger.info({ psid, text, payload }, "Routing to booking flow");
    await handleBookingFlow(psid, text, payload);
    logger.info({ psid }, "Booking flow step complete");
  } catch (err) {
    // ISSUE 3: catch all unexpected crashes and send a fallback reply
    const psid = (event["sender"] as { id?: string } | undefined)?.id ?? "unknown";
    logger.error(
      {
        err,
        psid,
        text: (event["message"] as Record<string, unknown> | undefined)?.["text"],
        payload: (event["postback"] as { payload?: string } | undefined)?.payload,
        channel,
      },
      "CRITICAL: processEvent crashed",
    );

    try {
      if (psid !== "unknown") {
        await sendWithDelay(
          psid,
          "Hi! 💕 Sorry for the delay. How can we help you today?",
          500,
        );
      }
    } catch (sendErr) {
      logger.error({ sendErr }, "Failed to send fallback message");
    }
  }
}

export default router;
