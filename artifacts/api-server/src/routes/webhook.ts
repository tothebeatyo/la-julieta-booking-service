import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { handleBookingFlow } from "../flows/bookingFlow";
import { getSession, setSession } from "../flows/state";
import {
  sendWithDelay,
  sendWithDelayAndQuickReplies,
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

// POST /webhook — receive messages
router.post("/", (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  logger.info({ body: JSON.stringify(body) }, "Incoming webhook event");

  if (body["object"] !== "page") {
    res.sendStatus(404);
    return;
  }

  const entries = (body["entry"] as Record<string, unknown>[]) || [];

  // Acknowledge immediately — Facebook requires 200 within 20s
  res.sendStatus(200);

  // Process each messaging event — fire and forget (do NOT await)
  for (const entry of entries) {
    const messaging = (entry["messaging"] as Record<string, unknown>[]) || [];
    for (const event of messaging) {
      processEvent(event).catch((err) => {
        logger.error({ err }, "Error processing messaging event");
      });
    }
  }
});

async function processEvent(event: Record<string, unknown>): Promise<void> {
  const sender = event["sender"] as { id: string } | undefined;
  if (!sender?.id) return;

  const psid = sender.id;

  // Read delivery / read receipts — ignore
  if (event["delivery"] || event["read"]) return;

  const message = event["message"] as Record<string, unknown> | undefined;
  const postback = event["postback"] as { payload?: string; title?: string } | undefined;

  if (!message && !postback) return;

  // Echo from the page itself — ignore
  if (message?.["is_echo"]) return;

  const text = (message?.["text"] as string | undefined)?.trim() ?? "";
  const quickReplyPayload = (message?.["quick_reply"] as { payload?: string } | undefined)?.payload;
  const postbackPayload = postback?.payload;
  const payload = quickReplyPayload ?? postbackPayload;

  logger.info({ psid, text, payload }, "Processing message");

  // Fire-and-forget DB logging — never block message sending on DB latency
  const inboundContent = text || payload || "(postback)";
  logMessage(psid, "inbound", inboundContent).catch((err) =>
    logger.error({ err, psid }, "Failed to log inbound message"),
  );
  upsertClient({ psid, lastMessage: inboundContent, status: "inquiry" }).catch((err) =>
    logger.error({ err, psid }, "Failed to upsert client"),
  );

  const session = getSession(psid);

  // New conversation — show welcome
  if (session.step === "idle" && !payload) {
    const intent = detectIntent(text);
    if (!intent || intent === "greeting") {
      logger.info({ psid }, "Sending welcome + intent menu");
      setSession(psid, { step: "choosing_intent" });
      await sendWithDelay(psid, randomPick(WELCOME_MESSAGES), 800);
      await sendWithDelayAndQuickReplies(psid, INTENT_MENU_TEXT, INTENT_QUICK_REPLIES, 1000);
      logger.info({ psid }, "Welcome flow complete");
      return;
    }
    // If they typed something specific right away (e.g. "book" or "facial"), handle it
    setSession(psid, { step: "choosing_intent" });
  }

  logger.info({ psid, text, payload }, "Routing to booking flow");
  await handleBookingFlow(psid, text, payload);
  logger.info({ psid }, "Booking flow step complete");
}

export default router;
