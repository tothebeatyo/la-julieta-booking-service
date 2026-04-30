import {
  sendWithDelay,
  sendWithDelayAndQuickReplies,
  sendText,
  sendTypingOn,
  sendTypingOff,
} from "../services/messengerService";
import { createReservation } from "../services/anyplusService";
import { getSession, setSession, resetSession } from "./state";
import { detectService, isExplanationQuery, detectSkinConcern } from "./intentDetector";
import {
  BOOK_START_MESSAGES,
  SERVICES_QUICK_REPLIES,
  PAYLOAD_TO_SERVICE,
  RETRY_MESSAGES,
  INTENT_QUICK_REPLIES,
  SKIN_CONCERN_QUICK_REPLIES,
  INJECTABLES_QUICK_REPLIES,
  STAFF_MESSAGE,
  ACTIVE_PROMOS,
  PROMOS_QUICK_REPLIES,
  SKIN_CONCERN_ACNE,
  SKIN_CONCERN_DULL,
  SKIN_CONCERN_WHITENING,
  SKIN_CONCERN_ANTIAGING,
  SKIN_CONCERN_SENSITIVE,
  SAFETY_SCREENING_INTRO,
  SAFETY_FAIL_MESSAGE,
  SAFETY_PASS_MESSAGE,
  getPricelistForService,
  getPromosForService,
  getDescriptionForService,
  SERVICE_UPSELL_COMBOS,
  randomPick,
} from "./responses";
import { logger } from "../lib/logger";
import { upsertClient } from "../services/clientService";
import { sendTelegramAlert } from "../services/telegramService";
import { analyzeMessage } from "../services/aiService";

const TALK_TO_STAFF_QR = [{ title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" }];

// Injectable services that need safety screening before recommendation
const INJECTABLE_SERVICES = new Set(["IV Drip", "Slimming / Fat Dissolve", "Lemon Bottle Fat Dissolve", "Mesolipo"]);

// Maps BOOK_* payloads → service name
const BOOK_PAYLOAD_SERVICE_MAP: Record<string, string> = {
  BOOK_FACIAL:       "Facial Treatment",
  BOOK_MICRONEEDLING:"Microneedling",
  BOOK_LASER:        "Laser Treatment",
  BOOK_HAIR_REMOVAL: "Hair Removal",
  BOOK_HIFU:         "HIFU Tightening",
  BOOK_SLIMMING:     "Slimming Treatment",
  BOOK_IV_DRIP:      "IV Drip",
  BOOK_WARTS:        "Warts Removal",
  BOOK_INJECTABLES:  "Injectables",
  BOOK_LEMON_BOTTLE: "Lemon Bottle Fat Dissolve",
  BOOK_MESOLIPO:     "Mesolipo",
};

// Related service suggestions shown when client says "No" after viewing a service
const RELATED_SERVICES: Record<string, { suggestion: string; message: string; payload: string }[]> = {
  FACIAL: [
    { suggestion: "Microneedling",      message: "We also have Microneedling which gives deeper skin rejuvenation! 💕",              payload: "INTENT_MICRONEEDLING" },
    { suggestion: "Korean BB Glow",     message: "You might also like our Korean BB Glow for that glass skin effect! ✨",            payload: "INTENT_MICRONEEDLING" },
    { suggestion: "Laser",              message: "We also offer Laser treatments for brighter and clearer skin! ✨",                  payload: "INTENT_LASER" },
  ],
  MICRONEEDLING: [
    { suggestion: "Facial",             message: "We also have relaxing Facial Treatments if you prefer something gentler! 🧖",       payload: "INTENT_FACIALS" },
    { suggestion: "BB Glow Facial",     message: "You might also like our BB Glow Facial for instant glow! ✨",                       payload: "INTENT_FACIALS" },
    { suggestion: "Laser",              message: "We also have Laser treatments for skin brightening! 💕",                            payload: "INTENT_LASER" },
  ],
  LASER: [
    { suggestion: "HIFU",               message: "We also have HIFU for skin tightening and lifting! 💪",                            payload: "INTENT_HIFU" },
    { suggestion: "Facial",             message: "You might also enjoy our Facial Treatments for a relaxing glow! 🧖",               payload: "INTENT_FACIALS" },
    { suggestion: "Microneedling",      message: "We also have Microneedling for deeper skin renewal! 🔬",                           payload: "INTENT_MICRONEEDLING" },
  ],
  HAIR_REMOVAL: [
    { suggestion: "Laser",              message: "We also have Laser treatments which can help with hair reduction too! ✨",           payload: "INTENT_LASER" },
    { suggestion: "Skin Tightening",    message: "You might also like our HIFU for smoother skin! 💪",                               payload: "INTENT_HIFU" },
  ],
  HIFU: [
    { suggestion: "Slimming",           message: "We also have Slimming treatments for body contouring! ⚡",                         payload: "INTENT_SLIMMING" },
    { suggestion: "Laser",              message: "Our Laser treatments are also great for skin tightening! ✨",                       payload: "INTENT_LASER" },
    { suggestion: "Lemon Bottle",       message: "You might also like Lemon Bottle Fat Dissolve! 🍋",                                payload: "INTENT_LEMON_BOTTLE" },
  ],
  SLIMMING: [
    { suggestion: "Lemon Bottle",       message: "We also have Lemon Bottle Fat Dissolve for targeted areas! 🍋",                    payload: "INTENT_LEMON_BOTTLE" },
    { suggestion: "Mesolipo",           message: "You might also like Mesolipo for slimming and contouring! ✨",                     payload: "INTENT_MESOLIPO" },
    { suggestion: "HIFU",               message: "We also have HIFU for skin tightening after slimming! 💪",                        payload: "INTENT_HIFU" },
  ],
  LEMON_BOTTLE: [
    { suggestion: "Mesolipo",           message: "We also have Mesolipo which works great for body contouring! ✨",                  payload: "INTENT_MESOLIPO" },
    { suggestion: "Slimming",           message: "Check out our other Slimming treatments too! ⚡",                                  payload: "INTENT_SLIMMING" },
    { suggestion: "HIFU",               message: "HIFU Tightening is also popular after fat dissolve treatments! 💪",                payload: "INTENT_HIFU" },
  ],
  MESOLIPO: [
    { suggestion: "Lemon Bottle",       message: "We also have Lemon Bottle Fat Dissolve for targeted fat reduction! 🍋",            payload: "INTENT_LEMON_BOTTLE" },
    { suggestion: "Slimming",           message: "Check out our other Slimming treatments! ⚡",                                      payload: "INTENT_SLIMMING" },
  ],
  IV_DRIP: [
    { suggestion: "Glutathione",        message: "We also have Glutathione Injectables for skin whitening! 💉",                      payload: "INTENT_INJECTABLES" },
    { suggestion: "Facial",             message: "Pair it with our Facial treatments for a complete glow! 🧖",                      payload: "INTENT_FACIALS" },
  ],
  INJECTABLES: [
    { suggestion: "IV Drip",            message: "We also have IV Drip for that inner glow and whitening! 💉",                      payload: "INTENT_IV_DRIP" },
    { suggestion: "Facial",             message: "You might also enjoy our Facial treatments! 🧖",                                  payload: "INTENT_FACIALS" },
  ],
  WARTS: [
    { suggestion: "Laser",              message: "We also have Laser treatments for clearer skin! ✨",                               payload: "INTENT_LASER" },
    { suggestion: "Facial",             message: "Follow up with our Facial treatments for smoother skin! 🧖",                      payload: "INTENT_FACIALS" },
  ],
};

async function delay(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function sendPricingAndPromos(psid: string, service: string): Promise<void> {
  const pricelist = getPricelistForService(service);
  const matchingPromos = getPromosForService(service);

  setSession(psid, { step: "awaiting_book_decision", service });
  upsertClient({ psid, service, leadStatus: "browsing" }).catch(() => {});

  // Show pricelist first
  if (pricelist) {
    await sendWithDelay(psid, pricelist, 1200);
  } else {
    await sendWithDelay(
      psid,
      `For ${service}, it's best to chat with our staff for exact pricing 💕`,
      1000,
    );
  }

  // ── Slimming: special sub-flow (Lemon Bottle vs Mesolipo) ──────────────────
  const isSlimming = service === "Slimming / Fat Dissolve" || service === "Slimming";
  if (isSlimming) {
    for (const promo of matchingPromos) {
      await sendWithDelay(psid, promo, 1400);
    }
    await sendWithDelayAndQuickReplies(
      psid,
      "Which slimming treatment would you like? Both are non-surgical, no downtime 💕",
      [
        { title: "🍋 Lemon Bottle", payload: "SVC_LEMON_BOTTLE" },
        { title: "💉 Mesolipo", payload: "SVC_MESOLIPO" },
        { title: "📅 Book Consultation", payload: "BOOK_NOW" },
        { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
      ],
      1000,
    );
    return;
  }

  // ── All other services: explain → upsell combo → book question ─────────────
  // Find the combo using the service name, falling back to category-level key
  const comboKey = Object.keys(SERVICE_UPSELL_COMBOS).find((k) =>
    service.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(service.toLowerCase())
  );
  const combo = comboKey ? SERVICE_UPSELL_COMBOS[comboKey] : null;

  if (combo) {
    // 1. Simple explanation
    await sendWithDelay(psid, combo.explain, 1600);

    // 2. Upsell — combo suggestion
    await sendWithDelay(psid, combo.upsell, 2000);

    // 3. Why this combo is the best
    await sendWithDelay(psid, combo.whyCombo, 2000);
  }

  // 4. Any active promos
  for (const promo of matchingPromos) {
    await sendWithDelay(psid, promo, 1400);
  }

  // 5. Book question
  const promoButton = matchingPromos.length > 0 && !combo
    ? [{ title: "🎉 View Promos", payload: "INTENT_PROMOS" }]
    : [];

  await sendWithDelayAndQuickReplies(
    psid,
    `Would you like me to book you now? 😊`,
    [
      { title: "✅ Yes, Book Now!", payload: "BOOK_NOW" },
      ...promoButton,
      { title: "💆 Other Services", payload: "INTENT_SERVICES" },
      { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
    ],
    1000,
  );
}

async function handleTalkToAgent(psid: string, text: string): Promise<void> {
  const session = getSession(psid);
  const intent = session.intent ?? "general inquiry";

  await sendWithDelay(psid, STAFF_MESSAGE, 1000);

  upsertClient({
    psid,
    status: "needs_followup",
    leadStatus: "escalated",
    lastMessage: text || "(talk to agent requested)",
  }).catch(() => {});

  sendTelegramAlert(
    `🚨 <b>TALK TO AGENT REQUEST</b>\n\n` +
    `🏪 <b>Page:</b> La Julieta Beauty Parañaque\n` +
    `👤 <b>Name:</b> ${session.name ?? "(unknown)"}\n` +
    `🆔 <b>PSID:</b> ${psid}\n` +
    `💬 <b>Last Message:</b> ${text || "(no message)"}\n` +
    `🎯 <b>Concern / Intent:</b> ${session.concern ?? intent}\n` +
    `📅 <b>Time:</b> ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`,
  ).catch(() => {});

  resetSession(psid);
}

export async function handleBookingFlow(psid: string, text: string, payload?: string): Promise<void> {
  const session = getSession(psid);

  // Talk to Agent — always available, triggers Telegram alert
  const isStaffRequest =
    payload === "INTENT_STAFF" ||
    /\b(talk to (staff|agent|human|admin|representative)|speak to (staff|agent|human)|staff|human|agent|admin|tao|tawo|representative)\b/i.test(text);

  if (isStaffRequest) {
    await handleTalkToAgent(psid, text);
    return;
  }

  // Restart keywords
  if (/^(hi|hello|restart|start over|uli|ulit|balik|menu|home)$/i.test(text.trim())) {
    resetSession(psid);
    setSession(psid, { step: "choosing_intent" });
    await sendWithDelayAndQuickReplies(
      psid,
      "No problem, let's start fresh! 😊 What can I help you with today?",
      INTENT_QUICK_REPLIES,
      1000,
    );
    return;
  }

  // ── Price query shortcut — fast deterministic response before AI ─────────────
  const isPriceQuery = /how much|magkano|price|presyo|cost|rate|how much is|how much for/i.test(text);
  const isPromoQuery = /promo|deal|discount|sale|free|freebies|may promo|anong promo/i.test(text);

  if (text && !payload && isPriceQuery && !isPromoQuery) {
    const pricePatterns: { regex: RegExp; intentPayload: string }[] = [
      { regex: /bb glow|korean bb/i,                intentPayload: "INTENT_MICRONEEDLING" },
      { regex: /microneedling/i,                     intentPayload: "INTENT_MICRONEEDLING" },
      { regex: /lemon bottle/i,                      intentPayload: "INTENT_LEMON_BOTTLE" },
      { regex: /mesolipo/i,                          intentPayload: "INTENT_MESOLIPO" },
      { regex: /iv drip|glutathione|gluta drip/i,    intentPayload: "INTENT_IV_DRIP" },
      { regex: /warts/i,                             intentPayload: "INTENT_WARTS" },
      { regex: /injectable|botox|filler/i,           intentPayload: "INTENT_INJECTABLES" },
      { regex: /slimming/i,                          intentPayload: "INTENT_SLIMMING" },
      { regex: /hair removal/i,                      intentPayload: "INTENT_HAIR_REMOVAL" },
      { regex: /hifu|tightening|ultraformer/i,       intentPayload: "INTENT_HIFU" },
      { regex: /laser/i,                             intentPayload: "INTENT_LASER" },
      { regex: /facial/i,                            intentPayload: "INTENT_FACIALS" },
    ];
    for (const { regex, intentPayload } of pricePatterns) {
      if (regex.test(text)) {
        await handleIntentChoice(psid, text, intentPayload);
        return;
      }
    }
  }

  // ── AI analysis — only for free-text messages outside active booking steps ──
  const activeSteps = new Set([
    "entering_booking_form",
    "awaiting_missing_field",
    "final_confirming",
    "safety_screening",
  ]);

  if (text && !payload && !activeSteps.has(session.step ?? "")) {
    const analysis = await analyzeMessage(text, {
      clientName: session.name,
      currentStep: session.step,
    });

    if (analysis) {
      if (
        analysis.intent === "inquiry_price" ||
        analysis.intent === "inquiry_service" ||
        analysis.intent === "unknown"
      ) {
        await sendWithDelay(psid, analysis.response, 800);
        if (analysis.shouldBook) {
          await sendWithDelayAndQuickReplies(
            psid,
            "Would you like to book an appointment? 📅",
            [
              { title: "📅 Book Now", payload: "INTENT_BOOK" },
              { title: "💆 View Services", payload: "INTENT_FACIALS" },
              { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
            ],
            1000,
          );
        }
        return;
      }

      if (analysis.intent === "greeting") {
        await sendWithDelay(psid, analysis.response, 800);
        await sendWithDelayAndQuickReplies(
          psid,
          INTENT_MENU_TEXT,
          INTENT_QUICK_REPLIES,
          1000,
        );
        return;
      }

      // booking intent — fall through to existing booking flow below
      if (analysis.intent === "booking" || analysis.shouldBook) {
        setSession(psid, { step: "choosing_intent" });
      }
    }
  }
  // ── End AI block ─────────────────────────────────────────────────────────────

  logger.info({ psid, step: session.step, text, payload }, "Booking flow step");

  // Skip email quick reply
  if (payload === "SKIP_EMAIL") {
    setSession(psid, { email: undefined, emailConsent: false });
    await showFinalConfirmation(psid);
    return;
  }

  // Safety screening answer
  if (session.step === "safety_screening") {
    await handleSafetyScreening(psid, text, payload);
    return;
  }

  // SHOW_PRICING — user saw the description and now wants to see prices
  if (payload === "SHOW_PRICING" && session.service) {
    await sendPricingAndPromos(psid, session.service);
    return;
  }

  // BOOK_NOW from a pricelist message — user wants to book the saved service
  if (payload === "BOOK_NOW" && session.service) {
    // If service requires safety screening and user hasn't been screened yet, screen first
    if (INJECTABLE_SERVICES.has(session.service) && !session.screeningPassed) {
      await startSafetyScreening(psid, session.service);
      return;
    }
    setSession(psid, { step: "entering_booking_form", retryCount: 0 });
    upsertClient({ psid, status: "inquiry", leadStatus: "booking_requested" }).catch(() => {});
    await sendBookingFormRequest(psid, session.service);
    return;
  }

  // BOOK_* payloads — client tapped "Book This" from a service price card
  if (payload && BOOK_PAYLOAD_SERVICE_MAP[payload]) {
    const service = BOOK_PAYLOAD_SERVICE_MAP[payload]!;
    if (INJECTABLE_SERVICES.has(service) && !session.screeningPassed) {
      setSession(psid, { service });
      await startSafetyScreening(psid, service);
      return;
    }
    setSession(psid, { step: "entering_booking_form", service, retryCount: 0 });
    upsertClient({ psid, service, status: "inquiry", leadStatus: "booking_requested" }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `Great choice! 💕 Please send your details:\n\n⚪ Old or New Client:\n👤 Name:\n📱 Mobile Number:\n📅 Preferred Date:\n🕐 Preferred Time:\n\nExample:\n⚪ New\n👤 Maria Santos\n📱 09171234567\n📅 May 5\n🕐 2PM`,
      TALK_TO_STAFF_QR,
      800,
    );
    return;
  }

  switch (session.step) {
    case "idle":
    case "choosing_intent":
    case "choosing_skin_concern":
    case "viewing_service":
    case "awaiting_book_decision": {
      await handleIntentChoice(psid, text, payload);
      break;
    }
    case "choosing_service": {
      await handleServiceChoice(psid, text, payload);
      break;
    }
    case "entering_booking_form": {
      await handleBookingFormEntry(psid, text);
      break;
    }
    case "awaiting_missing_field": {
      await handleMissingFieldEntry(psid, text);
      break;
    }
    case "final_confirming": {
      await handleFinalConfirmation(psid, text, payload);
      break;
    }
    default: {
      resetSession(psid);
      await sendWithDelayAndQuickReplies(
        psid,
        "Let's start fresh! 😊 How can I help you?",
        INTENT_QUICK_REPLIES,
        1000,
      );
    }
  }
}

// ─── Safety Screening ─────────────────────────────────────────────────────────

const SAFETY_FLAG_NAMES = [
  "pregnant",
  "injection_allergy",
  "blood_disorder",
  "allergic_reaction",
  "medical_treatment",
];

const SAFETY_CLARIFICATION =
  `Please answer each question separately 😊\n\nSend 5 lines like:\nNo\nNo\nNo\nNo\nNo`;

function isYesAnswer(line: string): boolean {
  return /^(yes|y|oo|opo|yep|yup|yeah|oo nga|meron|mayroon|may|true|positive|tama)\b/i.test(line.trim());
}

function isNoAnswer(line: string): boolean {
  return /^(no|n|nope|nah|wala|hindi|negative|false|hindi naman|wala naman)\b/i.test(line.trim());
}

const SAFETY_QUESTIONS_MESSAGE =
  `Before we proceed with injectables, we need to check a few things for your safety 💕\n\nPlease answer honestly:\n\n- Are you currently pregnant?\n- Do you have any allergy to injections?\n- Do you have blood disorders or take blood thinners?\n- Have you had severe allergic reactions before?\n- Are you currently under medical treatment?\n\nJust reply naturally! For example:\n💬 "Wala" or "None" — if none apply to you\n💬 "Meron" or "Yes" — if any apply to you`;

async function startSafetyScreening(psid: string, pendingService: string): Promise<void> {
  setSession(psid, {
    step: "safety_screening",
    screeningStep: 0,
    safetyFlags: [],
    pendingService,
  });
  await sendWithDelayAndQuickReplies(psid, SAFETY_QUESTIONS_MESSAGE, TALK_TO_STAFF_QR, 800);
}

async function handleSafetyScreening(psid: string, text: string, payload?: string): Promise<void> {
  const session = getSession(psid);
  const pendingService = session.pendingService ?? "IV Drip";

  // Legacy quick-reply: treat SCREENING_YES as an immediate concern
  if (payload === "SCREENING_YES") {
    await triggerSafetyFail(psid, ["unknown"]);
    return;
  }

  const msgLower = text.toLowerCase().trim();

  // ── Detect "all clear" — natural language no ─────────────────────────────────
  const isAllClear =
    /^(no|nope|none|nothing|wala|all no|all good|none of (the above|them|those)|i don'?t have any|i have none|no to all|no for all|all clear|wala naman|wala po|wala akong|wala akong kahit (ano|isa)|hindi|hindi po|hindi naman|clean|ok lang|okay lang|none po)/.test(msgLower) ||
    /^(no[\s,]+){2,}/.test(msgLower) ||
    (
      !/(yes|oo\b|opo|meron|mayroon|may ako|i (am|have|do)|pregnant|allergy|allergic|blood (disorder|thinner)|medical (treatment|condition))/i.test(msgLower) &&
      /(no|wala|hindi|nope|none)/i.test(msgLower)
    );

  // ── Detect concern — any affirmative ─────────────────────────────────────────
  const hasConcern =
    /(yes|oo\b|opo|meron|mayroon|may ako|i (am|have|do)|pregnant|allergy|allergic|blood (disorder|thinner)|medical (treatment|condition))/i.test(msgLower);

  if (isAllClear && !hasConcern) {
    // All good — proceed to booking form
    upsertClient({ psid, safetyFlags: "none", leadStatus: "injectable_cleared" }).catch(() => {});
    setSession(psid, {
      step: "entering_booking_form",
      service: pendingService,
      screeningStep: 0,
      safetyFlags: [],
      screeningPassed: true,
      retryCount: 0,
    });
    await sendWithDelayAndQuickReplies(
      psid,
      `Great news, you're all clear! 🎉 Let's get you booked! 💕\n\nPlease send your details:\n\n⚪ Old or New Client:\n👤 Name:\n📱 Mobile Number:\n📅 Preferred Date:\n🕐 Preferred Time:\n\nExample:\n⚪ New\n👤 Maria Santos\n📱 09171234567\n📅 May 5\n🕐 2PM`,
      TALK_TO_STAFF_QR,
      800,
    );
    return;
  }

  if (hasConcern) {
    // Has a safety concern — escalate to staff
    upsertClient({
      psid,
      safetyFlags: "flagged",
      leadStatus: "safety_flagged",
      status: "needs_followup",
    }).catch(() => {});

    sendTelegramAlert(
      `⚠️ <b>SAFETY FLAG — INJECTABLE SCREENING</b>\n\n` +
      `👤 <b>Name:</b> ${session.name ?? "Unknown"}\n` +
      `🆔 <b>PSID:</b> ${psid}\n` +
      `💆 <b>Service:</b> ${pendingService}\n` +
      `💬 <b>Client reply:</b> ${text.slice(0, 200)}\n` +
      `📝 <b>Note:</b> Client answered Yes to safety screening — manual consultation needed\n` +
      `📅 <b>Time:</b> ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`,
    ).catch(() => {});

    setSession(psid, { step: "idle", safetyFlags: ["flagged"] });
    await sendWithDelayAndQuickReplies(
      psid,
      "Thank you for letting us know 💕 For your safety, we recommend speaking with our specialist first before proceeding.\n\nOur team will reach out to you shortly! 😊",
      TALK_TO_STAFF_QR,
      800,
    );
    return;
  }

  // Unclear — gently guide them to a simple answer
  await sendWithDelay(
    psid,
    "Sorry, I just want to make sure you're safe! 💕\n\nFor the questions above, do you have any of those conditions?\n\nJust reply:\n✅ \"Wala\" or \"None\" — if you don't have any\n⚠️ \"Meron\" or \"Yes\" — if you have at least one",
    800,
  );
}

async function triggerSafetyFail(psid: string, flags: string[]): Promise<void> {
  upsertClient({
    psid,
    safetyFlags: flags.join(","),
    leadStatus: "safety_flagged",
    status: "needs_followup",
  }).catch(() => {});

  await sendWithDelay(psid, SAFETY_FAIL_MESSAGE, 1200);
  await sendWithDelayAndQuickReplies(
    psid,
    "Would you like to explore our facial options instead? 💕",
    [
      { title: "💆 Facial Treatments", payload: "INTENT_FACIALS" },
      { title: "📅 Book Consultation", payload: "INTENT_BOOK" },
      { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
    ],
    1000,
  );
  setSession(psid, { step: "choosing_intent", screeningStep: 0, safetyFlags: flags });
}

// ─── Skin Concerns Flow ───────────────────────────────────────────────────────

async function handleSkinConcern(psid: string, payload: string): Promise<void> {
  const concernMap: Record<string, { name: string; msg: string; recommended: string; needsScreening: boolean }> = {
    CONCERN_ACNE: {
      name: "acne",
      msg: SKIN_CONCERN_ACNE,
      recommended: "Facial / Microneedling",
      needsScreening: false,
    },
    CONCERN_DULL: {
      name: "dull_skin",
      msg: SKIN_CONCERN_DULL,
      recommended: "Brightening Facial / Laser",
      needsScreening: false,
    },
    CONCERN_WHITENING: {
      name: "whitening",
      msg: SKIN_CONCERN_WHITENING,
      recommended: "Brightening Facial / Gluta IV Drip",
      needsScreening: true,
    },
    CONCERN_ANTIAGING: {
      name: "anti_aging",
      msg: SKIN_CONCERN_ANTIAGING,
      recommended: "Anti-Aging Facial / HIFU",
      needsScreening: false,
    },
    CONCERN_SENSITIVE: {
      name: "sensitive_skin",
      msg: SKIN_CONCERN_SENSITIVE,
      recommended: "Gentle Facial / Consultation",
      needsScreening: false,
    },
  };

  const concern = concernMap[payload];
  if (!concern) return;

  setSession(psid, { concern: concern.name, intent: "skin_concern", step: "choosing_intent" });
  upsertClient({
    psid,
    concern: concern.name,
    recommendedService: concern.recommended,
    intent: "skin_concern",
    leadStatus: "skin_concern_inquiry",
  }).catch(() => {});

  await sendWithDelay(psid, concern.msg, 1400);

  if (concern.needsScreening) {
    // Whitening → ask if they want gluta (which needs safety screening) or facial
    await sendWithDelayAndQuickReplies(
      psid,
      "Would you like to start with a non-invasive brightening facial, or are you interested in the Gluta IV Drip? 😊",
      [
        { title: "💆 Brightening Facial", payload: "SVC_FACIAL" },
        { title: "💉 Gluta IV Drip", payload: "SCREENING_GLUTA" },
        { title: "📅 Book Consultation", payload: "INTENT_BOOK" },
        { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
      ],
      1200,
    );
  } else {
    await sendWithDelayAndQuickReplies(
      psid,
      "Ready to take the next step? 😊",
      [
        { title: "📅 Book Appointment", payload: "INTENT_BOOK" },
        { title: "💰 See Pricing", payload: "SHOW_PRICING_MENU" },
        { title: "💆 Other Concerns", payload: "INTENT_SKIN_CONCERN" },
        { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
      ],
      1000,
    );
  }
}

// ─── Intent Choice ────────────────────────────────────────────────────────────

async function handleIntentChoice(psid: string, text: string, payload?: string): Promise<void> {
  const session = getSession(psid);

  // ── "No" after viewing a service — suggest related services ─────────────────
  if (session.step === "viewing_service" && !payload) {
    const isNo = /^(no|nope|hindi|ayaw|ayoko|di na|di|nah|not now|maybe later|wala na|no thanks|no thank you)$/i.test(text.trim());
    const isMaybe = /maybe|later|mamaya|baka|not sure|di pa|hindi pa|i'll think|magisip muna/i.test(text);

    if (isMaybe) {
      await sendWithDelayAndQuickReplies(
        psid,
        "Of course, take your time! 😊 We're always here when you're ready. In the meantime, would you like to check out our other treatments? 💕",
        [
          { title: "💆 View All Services", payload: "SHOW_ALL_SERVICES" },
          { title: "🎉 View Promos",       payload: "INTENT_PROMOS" },
          { title: "👩‍⚕️ Talk to Agent",   payload: "INTENT_STAFF" },
        ],
        800,
      );
      return;
    }

    if (isNo) {
      const cat = session.serviceCategory ?? "FACIAL";
      const related = RELATED_SERVICES[cat] ?? [];
      if (related.length > 0) {
        const suggestion = related[0]!;
        const quickReplies = [
          ...related.map(r => ({ title: r.suggestion, payload: r.payload })),
          { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
        ];
        await sendWithDelayAndQuickReplies(
          psid,
          `No problem! 😊 ${suggestion.message}\n\nWould you like to know more about any of these?`,
          quickReplies,
          800,
        );
      } else {
        await sendWithDelayAndQuickReplies(
          psid,
          "No worries! 😊 We have lots of other treatments that might interest you! Which one would you like to explore?",
          [
            { title: "🧖 Facials",         payload: "INTENT_FACIALS" },
            { title: "🔬 Microneedling",   payload: "INTENT_MICRONEEDLING" },
            { title: "✨ Laser",           payload: "INTENT_LASER" },
            { title: "⚡ Slimming",        payload: "INTENT_SLIMMING" },
            { title: "💉 IV Drip",         payload: "INTENT_IV_DRIP" },
            { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
          ],
          800,
        );
      }
      return;
    }
  }

  // "Yes" / affirmative text when waiting for booking decision — go straight to booking
  if (session.step === "awaiting_book_decision" && session.service && !payload) {
    const isYes = /^(yes|oo|opo|sure|sige|ayos|ok|okay|go|push|yep|yup|tara|sali|gusto|i want|book|pls|please|ayan|booking|let's go|lets go|sali na|sige na|oo na|sure na)$/i.test(text.trim());
    if (isYes) {
      setSession(psid, { step: "entering_booking_form", retryCount: 0 });
      upsertClient({ psid, status: "inquiry", leadStatus: "booking_requested" }).catch(() => {});
      await sendBookingFormRequest(psid, session.service!);
      return;
    }
  }

  // Lemon Bottle sub-selection (after slimming screening)
  if (payload === "SVC_LEMON_BOTTLE") {
    setSession(psid, { step: "awaiting_book_decision", service: "Lemon Bottle Fat Dissolve", retryCount: 0, screeningPassed: true });
    upsertClient({ psid, service: "Lemon Bottle Fat Dissolve", status: "inquiry" }).catch(() => {});

    // 1. Simple explanation
    await sendWithDelay(
      psid,
      `🍋 What is Lemon Bottle?\n\nIt's a premium fat-dissolving injection made with Riboflavin (B2), Bromelain, and Lecithin. It breaks down fat cells quickly — targeting double chin, arms, tummy, love handles, and thighs.\n\n✅ Fast-acting — visible results in 1–2 sessions\n✅ Minimal swelling\n✅ Almost zero downtime\n✅ Promo rate: ₱567/mL 💕`,
      1200,
    );

    // 2. Upsell with Exilis
    await sendWithDelay(
      psid,
      `💡 Want even better results?\n\nPair it with our Exilis Ultra treatment! Exilis uses Radiofrequency + Ultrasound to tighten the skin and melt deeper fat layers — the perfect partner for Lemon Bottle. 🔥`,
      1800,
    );

    // 3. Why this combo is the best
    await sendWithDelay(
      psid,
      `✨ Lemon Bottle + Exilis = the ultimate fat-dissolving combo\n\n🍋 Lemon Bottle dissolves fat cells from the inside\n⚡ Exilis tightens skin and reaches deeper layers\n💪 Together = faster, smoother, and longer-lasting results\n🚫 No surgery. No downtime.\n\nYou get a slimmer, firmer body — without going under the knife 💕`,
      2000,
    );

    // 4. Book question
    await sendWithDelayAndQuickReplies(
      psid,
      `Would you like me to book you now? 😊`,
      [
        { title: "✅ Yes, Book Now!", payload: "BOOK_NOW" },
        { title: "💉 Try Mesolipo Instead", payload: "SVC_MESOLIPO" },
        { title: "💆 Other Services", payload: "INTENT_SERVICES" },
        { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
      ],
      1200,
    );
    return;
  }

  // Mesolipo sub-selection (after slimming screening)
  if (payload === "SVC_MESOLIPO") {
    setSession(psid, { step: "awaiting_book_decision", service: "Mesolipo", retryCount: 0, screeningPassed: true });
    upsertClient({ psid, service: "Mesolipo", status: "inquiry" }).catch(() => {});

    // 1. Simple explanation
    await sendWithDelay(
      psid,
      `💉 What is Mesolipo?\n\nMesolipo is a precise cocktail of fat-dissolving agents injected directly into targeted fat pockets. Perfect for:\n✔️ Cheeks, jaw, and double chin contouring\n✔️ Arms, bra line, and love handles\n✔️ Tummy and thigh slimming\n\n✅ Precise and targeted — works on smaller, stubborn areas\n✅ Visible contouring in as little as 2–4 weeks\n✅ Non-surgical, minimal downtime\n✅ Starting at ₱1,099 per area 💕`,
      1200,
    );

    // 2. Upsell with ExiSlim
    await sendWithDelay(
      psid,
      `💡 Want sharper, more defined results?\n\nPair Mesolipo with our ExiSlim body contouring treatment! ExiSlim uses Radiofrequency to tighten the skin and sculpt the treated area — the perfect finishing touch after Mesolipo dissolves the fat. 🔥`,
      1800,
    );

    // 3. Why this combo is the best
    await sendWithDelay(
      psid,
      `✨ Mesolipo + ExiSlim = the precision sculpting combo\n\n💉 Mesolipo breaks down fat in targeted pockets\n⚡ ExiSlim tightens skin and defines the contour\n💪 Together = slimmer + tighter + more sculpted results\n🚫 No surgery. No general anesthesia. No long downtime.\n\nYou get a snatched, defined body shape — done right 💕`,
      2000,
    );

    // 4. Book question
    await sendWithDelayAndQuickReplies(
      psid,
      `Would you like me to book you now? 😊`,
      [
        { title: "✅ Yes, Book Now!", payload: "BOOK_NOW" },
        { title: "🍋 Try Lemon Bottle Instead", payload: "SVC_LEMON_BOTTLE" },
        { title: "💆 Other Services", payload: "INTENT_SERVICES" },
        { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
      ],
      1200,
    );
    return;
  }

  // Any SVC_* payload — route to pricing or safety screening
  // Covers SVC_FACIAL, SVC_MICRO, SVC_LASER, SVC_HAIR, SVC_HIFU, SVC_WARTS, SVC_DRIP, SVC_SLIM
  if (payload && PAYLOAD_TO_SERVICE[payload]) {
    const svc = PAYLOAD_TO_SERVICE[payload];
    if (INJECTABLE_SERVICES.has(svc)) {
      await startSafetyScreening(psid, svc);
    } else {
      await sendPricingAndPromos(psid, svc);
    }
    return;
  }

  if (payload === "SHOW_PRICING_MENU") {
    setSession(psid, { step: "choosing_service" });
    await sendWithDelayAndQuickReplies(
      psid,
      "Which service would you like to see pricing for? 💕",
      [...SERVICES_QUICK_REPLIES, { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" }],
      1000,
    );
    return;
  }

  // Skin concern payloads
  if (["CONCERN_ACNE", "CONCERN_DULL", "CONCERN_WHITENING", "CONCERN_ANTIAGING", "CONCERN_SENSITIVE"].includes(payload ?? "")) {
    await handleSkinConcern(psid, payload!);
    return;
  }

  // Specific service mention from free text
  if (!payload) {
    const specificService = detectService(text);
    if (specificService) {
      if (INJECTABLE_SERVICES.has(specificService) && !isExplanationQuery(text)) {
        await startSafetyScreening(psid, specificService);
        return;
      }
      if (isExplanationQuery(text)) {
        const description = getDescriptionForService(specificService);
        if (description) {
          setSession(psid, { step: "awaiting_book_decision", service: specificService });
          upsertClient({ psid, service: specificService }).catch(() => {});
          await sendWithDelay(psid, description, 1200);
          await sendWithDelayAndQuickReplies(
            psid,
            `Interested in ${specificService}? 😊`,
            [
              { title: "💰 See Pricing", payload: "SHOW_PRICING" },
              { title: "📅 Book Now", payload: "BOOK_NOW" },
              { title: "💆 Other Services", payload: "INTENT_SERVICES" },
              { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
            ],
            1000,
          );
          return;
        }
      }
      await sendPricingAndPromos(psid, specificService);
      return;
    }

    // Detect skin concern from free text
    const concern = detectSkinConcern(text);
    if (concern) {
      const payloadMap: Record<string, string> = {
        acne: "CONCERN_ACNE",
        dull: "CONCERN_DULL",
        whitening: "CONCERN_WHITENING",
        anti_aging: "CONCERN_ANTIAGING",
        sensitive: "CONCERN_SENSITIVE",
      };
      await handleSkinConcern(psid, payloadMap[concern] ?? "CONCERN_ACNE");
      return;
    }
  }

  // ── Show all services menu ───────────────────────────────────────────────────
  if (payload === "SHOW_ALL_SERVICES") {
    await sendWithDelayAndQuickReplies(
      psid,
      "Sure! Here's what we offer 💕 Which one interests you?",
      [
        { title: "🧖 Facials",          payload: "INTENT_FACIALS" },
        { title: "🔬 Microneedling",    payload: "INTENT_MICRONEEDLING" },
        { title: "✨ Laser",            payload: "INTENT_LASER" },
        { title: "🪒 Hair Removal",     payload: "INTENT_HAIR_REMOVAL" },
        { title: "💪 HIFU",            payload: "INTENT_HIFU" },
        { title: "⚡ Slimming",         payload: "INTENT_SLIMMING" },
        { title: "💉 IV Drip",          payload: "INTENT_IV_DRIP" },
        { title: "🍋 Lemon Bottle",     payload: "INTENT_LEMON_BOTTLE" },
        { title: "💊 Injectables",      payload: "INTENT_INJECTABLES" },
        { title: "👩‍⚕️ Talk to Agent",  payload: "INTENT_STAFF" },
      ],
      800,
    );
    return;
  }

  // ── Facial Treatments ────────────────────────────────────────────────────────
  if (payload === "INTENT_FACIALS" || /\b(facial|face treatment|pangmukha)\b/i.test(text)) {
    setSession(psid, { step: "viewing_service", service: "Facial Treatment", serviceCategory: "FACIAL" });
    upsertClient({ psid, service: "Facial Treatment", leadStatus: "browsing" }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `🧖 *FACIAL TREATMENTS* — Price List (₱)\n\n- Basic Facial — 299\n- HydraFacial — 999\n- Whitening Facial — 799\n- Acne Facial — 699\n- Korean Glass Skin Facial — 899\n\nAdd-ons:\n- LED Light Therapy — 199\n- Oxygen Infusion — 299`,
      [
        { title: "📅 Book This",        payload: "BOOK_FACIAL" },
        { title: "💆 Other Services",   payload: "SHOW_ALL_SERVICES" },
        { title: "👩‍⚕️ Talk to Agent",  payload: "INTENT_STAFF" },
      ],
      800,
    );
    return;
  }

  // ── Microneedling ────────────────────────────────────────────────────────────
  if (payload === "INTENT_MICRONEEDLING" || /\b(microneedling|bb glow|korean bb|acneklear|salmon dna|prp)\b/i.test(text)) {
    setSession(psid, { step: "viewing_service", service: "Microneedling", serviceCategory: "MICRONEEDLING" });
    upsertClient({ psid, service: "Microneedling", leadStatus: "browsing" }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `🔬 *MICRONEEDLING* — Price List (₱)\n\n- Korean BB Glow — 599\n- AcneKléar Microneedling — 1,099\n- PRP Microneedling — 1,399\n- Salmon DNA Microneedling — 1,899\n- Stretch Marks Microneedling — 2,099\n\nAdd-ons:\n- Korean BB Glow Tint — 199\n- Whitening Stem Cell — 299\n- Hyaluronic Aqua Stem Cell — 299`,
      [
        { title: "📅 Book This",        payload: "BOOK_MICRONEEDLING" },
        { title: "💆 Other Services",   payload: "SHOW_ALL_SERVICES" },
        { title: "👩‍⚕️ Talk to Agent",  payload: "INTENT_STAFF" },
      ],
      800,
    );
    return;
  }

  // ── Laser ────────────────────────────────────────────────────────────────────
  if (payload === "INTENT_LASER" || /\b(laser|carbon peel|pico|skin rejuve)\b/i.test(text)) {
    setSession(psid, { step: "viewing_service", service: "Laser Treatment", serviceCategory: "LASER" });
    upsertClient({ psid, service: "Laser Treatment", leadStatus: "browsing" }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `✨ *LASER TREATMENTS* — Price List (₱)\n\n- Carbon Laser Peel — 799\n- Pico Laser — 1,299\n- Fractional CO2 Laser — 2,499\n- Skin Rejuvenation Laser — 999\n- Laser Hair Reduction (small area) — 499`,
      [
        { title: "📅 Book This",        payload: "BOOK_LASER" },
        { title: "💆 Other Services",   payload: "SHOW_ALL_SERVICES" },
        { title: "👩‍⚕️ Talk to Agent",  payload: "INTENT_STAFF" },
      ],
      800,
    );
    return;
  }

  // ── Hair Removal ─────────────────────────────────────────────────────────────
  if (payload === "INTENT_HAIR_REMOVAL" || /\b(hair removal|diode|underarm hair)\b/i.test(text)) {
    setSession(psid, { step: "viewing_service", service: "Hair Removal", serviceCategory: "HAIR_REMOVAL" });
    upsertClient({ psid, service: "Hair Removal", leadStatus: "browsing" }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `🪒 *LASER HAIR REMOVAL* — Price List (₱)\n\n- Underarm — 499\n- Arms (half) — 799\n- Arms (full) — 1,299\n- Legs (half) — 999\n- Legs (full) — 1,799\n- Bikini Line — 799\n- Full Body — 3,999`,
      [
        { title: "📅 Book This",        payload: "BOOK_HAIR_REMOVAL" },
        { title: "💆 Other Services",   payload: "SHOW_ALL_SERVICES" },
        { title: "👩‍⚕️ Talk to Agent",  payload: "INTENT_STAFF" },
      ],
      800,
    );
    return;
  }

  // ── HIFU / Skin Tightening ───────────────────────────────────────────────────
  if (payload === "INTENT_HIFU" || /\b(hifu|ultraformer|thermagic|rf|thermage|exislim|tightening)\b/i.test(text)) {
    setSession(psid, { step: "viewing_service", service: "HIFU Tightening", serviceCategory: "HIFU" });
    upsertClient({ psid, service: "HIFU Tightening", leadStatus: "browsing" }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `💪 *HIFU / SKIN TIGHTENING* — Price List (₱)\n\n- Ultraformer MP2 7D HIFU\n  • Cheeks & Jaw — 1,588\n  • Double Chin & Neck — 1,588\n  • Full Face — 1,888\n  • Full Face & Neck — 2,888\n  • Bra Line / Love Handle — 2,888\n  • Tummy / Arms / Legs — 3,488\n\n- Thermagic RF Tightening — 2,999\n- ExiSlim Body Contouring — 1,999`,
      [
        { title: "📅 Book This",        payload: "BOOK_HIFU" },
        { title: "💆 Other Services",   payload: "SHOW_ALL_SERVICES" },
        { title: "👩‍⚕️ Talk to Agent",  payload: "INTENT_STAFF" },
      ],
      800,
    );
    return;
  }

  // ── Slimming ─────────────────────────────────────────────────────────────────
  if (payload === "INTENT_SLIMMING" || /\b(slimming|fat dissolve|slim)\b/i.test(text)) {
    setSession(psid, { step: "viewing_service", service: "Slimming Treatment", serviceCategory: "SLIMMING" });
    upsertClient({ psid, service: "Slimming Treatment", leadStatus: "browsing" }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `⚡ *SLIMMING TREATMENTS* — Price List (₱)\n\n- Lemon Bottle Fat Dissolve — 567/mL\n- Mesolipo — 1,099/area\n- ExiSlim Body Contouring — 1,999\n\nTargeted areas: Double chin, arms, tummy, love handles, thighs 💕`,
      [
        { title: "🍋 Lemon Bottle",     payload: "INTENT_LEMON_BOTTLE" },
        { title: "💉 Mesolipo",         payload: "INTENT_MESOLIPO" },
        { title: "💆 Other Services",   payload: "SHOW_ALL_SERVICES" },
        { title: "👩‍⚕️ Talk to Agent",  payload: "INTENT_STAFF" },
      ],
      800,
    );
    return;
  }

  // ── Lemon Bottle ─────────────────────────────────────────────────────────────
  if (payload === "INTENT_LEMON_BOTTLE" || /\b(lemon bottle)\b/i.test(text)) {
    setSession(psid, { step: "viewing_service", service: "Lemon Bottle Fat Dissolve", serviceCategory: "LEMON_BOTTLE" });
    upsertClient({ psid, service: "Lemon Bottle Fat Dissolve", leadStatus: "browsing" }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `🍋 *LEMON BOTTLE FAT DISSOLVE* — Price List (₱)\n\n- Promo Rate: ₱567/mL\n\nFast-acting fat dissolve injection made with Riboflavin (B2), Bromelain, and Lecithin. Targets double chin, arms, tummy, love handles, and thighs.\n\n✅ Visible results in 1–2 sessions\n✅ Minimal swelling, zero downtime`,
      [
        { title: "📅 Book This",        payload: "BOOK_LEMON_BOTTLE" },
        { title: "💆 Other Services",   payload: "SHOW_ALL_SERVICES" },
        { title: "👩‍⚕️ Talk to Agent",  payload: "INTENT_STAFF" },
      ],
      800,
    );
    return;
  }

  // ── Mesolipo ─────────────────────────────────────────────────────────────────
  if (payload === "INTENT_MESOLIPO" || /\b(mesolipo)\b/i.test(text)) {
    setSession(psid, { step: "viewing_service", service: "Mesolipo", serviceCategory: "MESOLIPO" });
    upsertClient({ psid, service: "Mesolipo", leadStatus: "browsing" }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `✨ *MESOLIPO* — Price List (₱)\n\n- Starting at ₱1,099/area\n\nPrecise fat-dissolving cocktail injected into targeted pockets. Perfect for cheeks, jaw, double chin, arms, bra line, love handles, tummy, and thighs.\n\n✅ Visible contouring in 2–4 weeks\n✅ Non-surgical, minimal downtime`,
      [
        { title: "📅 Book This",        payload: "BOOK_MESOLIPO" },
        { title: "💆 Other Services",   payload: "SHOW_ALL_SERVICES" },
        { title: "👩‍⚕️ Talk to Agent",  payload: "INTENT_STAFF" },
      ],
      800,
    );
    return;
  }

  // ── IV Drip ──────────────────────────────────────────────────────────────────
  if (payload === "INTENT_IV_DRIP" || /\b(iv drip|gluta drip|glutathione drip|vitamin c drip|immune booster)\b/i.test(text)) {
    setSession(psid, { step: "viewing_service", service: "IV Drip", serviceCategory: "IV_DRIP" });
    upsertClient({ psid, service: "IV Drip", leadStatus: "browsing" }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `💉 *IV DRIP* — Price List (₱)\n\n- Bella Drip (Glutathione) — 799\n- Celestial Drip (High-dose Gluta) — 1,299\n- Snow White Drip — 1,499\n- Goddess Drip (Premium) — 1,799\n- Immune Booster — 599\n- Vitamin C IV — 499\n\n✨ Buy 10 sessions, get 4 FREE (14 total)!`,
      [
        { title: "📅 Book This",              payload: "BOOK_IV_DRIP" },
        { title: "⚠️ Safety Check First",    payload: "SAFETY_INJECTABLES" },
        { title: "💆 Other Services",         payload: "SHOW_ALL_SERVICES" },
        { title: "👩‍⚕️ Talk to Agent",        payload: "INTENT_STAFF" },
      ],
      800,
    );
    return;
  }

  // ── Warts Removal ────────────────────────────────────────────────────────────
  if (payload === "INTENT_WARTS" || /\b(warts|warts removal)\b/i.test(text)) {
    setSession(psid, { step: "viewing_service", service: "Warts Removal", serviceCategory: "WARTS" });
    upsertClient({ psid, service: "Warts Removal", leadStatus: "browsing" }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `🔬 *WARTS REMOVAL* — Price List (₱)\n\n- Small Warts (1–5 pcs) — 299\n- Medium Warts (6–15 pcs) — 499\n- Large/Multiple Warts — 799\n- Body Area Package — 999\n\n✅ Quick procedure, minimal downtime\n✅ Safe and effective`,
      [
        { title: "📅 Book This",        payload: "BOOK_WARTS" },
        { title: "💆 Other Services",   payload: "SHOW_ALL_SERVICES" },
        { title: "👩‍⚕️ Talk to Agent",  payload: "INTENT_STAFF" },
      ],
      800,
    );
    return;
  }

  // Skin concern menu
  if (payload === "INTENT_SKIN_CONCERN" || /\b(skin concern|concern|problema sa skin|problema ng balat)\b/i.test(text)) {
    setSession(psid, { step: "choosing_intent", intent: "skin_concern" });
    await sendWithDelayAndQuickReplies(
      psid,
      "Which skin concern would you like help with? Just tap one below 😊",
      SKIN_CONCERN_QUICK_REPLIES,
      1000,
    );
    return;
  }

  // ── Injectables / Gluta ──────────────────────────────────────────────────────
  if (payload === "SAFETY_INJECTABLES" || payload === "SCREENING_GLUTA") {
    await startSafetyScreening(psid, "IV Drip");
    return;
  }

  if (payload === "INTENT_INJECTABLES" || /\b(injectable|injection|botox|filler|gluta)\b/i.test(text)) {
    setSession(psid, { step: "viewing_service", service: "Injectables", serviceCategory: "INJECTABLES" });
    upsertClient({ psid, service: "Injectables", leadStatus: "browsing" }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `💉 *INJECTABLES & GLUTA* — Price List (₱)\n\n- Glutathione IV Drip — 799\n- Botox (per unit) — 199\n- Fillers (per syringe) — 8,999\n- PRP Treatment — 3,999\n\n⚠️ Safety screening required before booking injectable treatments.`,
      [
        { title: "📅 Book This",              payload: "BOOK_INJECTABLES" },
        { title: "⚠️ Safety Check First",    payload: "SAFETY_INJECTABLES" },
        { title: "💆 Other Services",         payload: "SHOW_ALL_SERVICES" },
        { title: "👩‍⚕️ Talk to Agent",        payload: "INTENT_STAFF" },
      ],
      800,
    );
    return;
  }

  if (payload === "INTENT_BOOK" || /\b(book|appointment|reserv|mag-book|schedule)\b/i.test(text)) {
    setSession(psid, { step: "choosing_service", intent: "booking" });
    await sendWithDelayAndQuickReplies(
      psid,
      randomPick(BOOK_START_MESSAGES),
      SERVICES_QUICK_REPLIES,
      1200,
    );
  } else if (payload === "INTENT_SERVICES" || /\b(services|treatment|menu|listahan|magkano|how much|price|presyo|available|ano meron|what do you offer)\b/i.test(text)) {
    await sendWithDelay(
      psid,
      "We have a lot of services to choose from! 💅 Select a category below and I'll show you the full price list 💖",
      1200,
    );
    await delay(600);
    setSession(psid, { step: "choosing_service" });
    await sendWithDelayAndQuickReplies(
      psid,
      "Which one are you interested in? 💕",
      [...SERVICES_QUICK_REPLIES, { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" }],
      800,
    );
  } else if (payload === "INTENT_PROMOS" || /\b(promo|discount|sale|deals|mura)\b/i.test(text)) {
    await sendWithDelay(psid, `We have ${ACTIVE_PROMOS.length} active promos right now! 🎉 Check them out below 💖👇`, 800);
    for (const promo of ACTIVE_PROMOS) {
      await sendWithDelay(psid, promo, 1200);
    }
    await sendWithDelayAndQuickReplies(
      psid,
      "Ready to avail one? Book now before slots run out! 🔥",
      PROMOS_QUICK_REPLIES,
      1200,
    );
  } else {
    const detectedService = detectService(text);
    if (detectedService) {
      if (INJECTABLE_SERVICES.has(detectedService)) {
        await startSafetyScreening(psid, detectedService);
      } else {
        await sendPricingAndPromos(psid, detectedService);
      }
    } else if (session.step === "awaiting_book_decision" && session.service) {
      // User is mid-flow and sent something unrecognised — re-anchor them to current service
      const isSlimming = session.service === "Slimming / Fat Dissolve" || session.service === "Slimming";
      if (isSlimming) {
        await sendWithDelayAndQuickReplies(
          psid,
          `Still deciding? 😊 Here are your options for slimming:`,
          [
            { title: "🍋 Lemon Bottle", payload: "SVC_LEMON_BOTTLE" },
            { title: "💉 Mesolipo", payload: "SVC_MESOLIPO" },
            { title: "📅 Book Consultation", payload: "BOOK_NOW" },
            { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
          ],
          1000,
        );
      } else {
        await sendWithDelayAndQuickReplies(
          psid,
          `Ready to book your ${session.service}? 😊`,
          [
            { title: "📅 Book Now", payload: "BOOK_NOW" },
            { title: "💆 Other Services", payload: "INTENT_SERVICES" },
            { title: "🎉 View Promos", payload: "INTENT_PROMOS" },
            { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
          ],
          1000,
        );
      }
    } else {
      setSession(psid, { step: "choosing_intent", retryCount: 0 });
      await sendWithDelayAndQuickReplies(
        psid,
        "Hmm, not sure I got that 😊 Here's what I can help you with:",
        INTENT_QUICK_REPLIES,
        1000,
      );
    }
  }
}

// ─── Service Choice ───────────────────────────────────────────────────────────

async function handleServiceChoice(psid: string, text: string, payload?: string): Promise<void> {
  let service: string | null = null;

  if (payload && PAYLOAD_TO_SERVICE[payload]) {
    service = PAYLOAD_TO_SERVICE[payload];
  } else {
    service = detectService(text);
  }

  if (service) {
    // Injectable services need safety screening before booking
    if (INJECTABLE_SERVICES.has(service)) {
      await startSafetyScreening(psid, service);
    } else {
      await sendPricingAndPromos(psid, service);
    }
  } else {
    const s = getSession(psid);
    if (s.retryCount >= 2) {
      setSession(psid, { retryCount: 0 });
      await sendWithDelayAndQuickReplies(
        psid,
        "It might be easier to just pick from the list below 😊",
        [...SERVICES_QUICK_REPLIES, { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" }],
        1000,
      );
    } else {
      setSession(psid, { retryCount: (s.retryCount || 0) + 1 });
      await sendWithDelayAndQuickReplies(
        psid,
        `${randomPick(RETRY_MESSAGES)}Which service would you like?`,
        [...SERVICES_QUICK_REPLIES, { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" }],
        1000,
      );
    }
  }
}

// ─── Booking Form (single-message flow) ──────────────────────────────────────

async function sendBookingFormRequest(psid: string, service: string): Promise<void> {
  await sendWithDelayAndQuickReplies(
    psid,
    `Great! Let's book your ${service} 💕\n\nPlease send your details:\n\n🔘 Old or New Client:\n👤 Name:\n📱 Mobile Number:\n📅 Preferred Date:\n🕐 Preferred Time:\n\nExample:\n🔘 New\n👤 Maria Santos\n📱 09171234567\n📅 May 2\n🕐 2PM`,
    TALK_TO_STAFF_QR,
    800,
  );
}

async function handleBookingFormEntry(psid: string, text: string): Promise<void> {
  const session = getSession(psid);

  // ── Clean lines: strip emojis + leading punctuation, keep actual content ───
  const lines = text
    .split("\n")
    .map(l =>
      l
        .replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
        .replace(/^[\s\-•*:⚪🔘]+/, "")
        .trim()
    )
    .filter(l => l.length > 0);

  logger.info({ lines }, "Parsing booking form lines");

  // Start with whatever is already stored in session
  let clientType: string | null = session.clientType ?? null;
  let name: string | null = session.name ?? null;
  let phone: string | null = session.mobile ?? null;
  let date: string | null = session.date ?? null;
  let time: string | null = session.time ?? null;

  for (const line of lines) {
    // ── Client type — check BEFORE stripping labels ───────────────────────
    if (/^(new|old)(\s+client)?$/i.test(line) ||
        /old or new client\s*[:\-]?\s*(new|old)/i.test(line) ||
        /client type\s*[:\-]?\s*(new|old)/i.test(line)) {
      clientType = /old/i.test(line) ? "Old" : "New";
      continue;
    }

    // Strip common label prefixes for the remaining checks
    const clean = line
      .replace(/^(old or new client|client type|type|name|full name|mobile(?: number)?|phone|contact|date|preferred date|time|preferred time)\s*[:\-]?\s*/i, "")
      .trim();

    if (!clean) continue;

    // ── Phone number: 09XX… or +63… ──────────────────────────────────────
    const digits = clean.replace(/[\s\-]/g, "");
    if (/^(\+?63|0)\d{9,10}$/.test(digits) || /^\d{11}$/.test(digits)) {
      phone = clean;
      continue;
    }

    // ── Time: 2PM, 10:30am, morning, hapon… ──────────────────────────────
    if (/\d{1,2}(:\d{2})?\s*(am|pm)/i.test(clean) ||
        /^(morning|afternoon|evening|noon|umaga|hapon|gabi)$/i.test(clean)) {
      time = clean;
      continue;
    }

    // ── Date: month names, weekday names, relative words, numeric ────────
    if (/tomorrow|bukas|today|ngayon|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|miyerkules|huwebes|biyernes|sabado|linggo/i.test(clean) ||
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(clean) ||
        /\b(january|february|march|april|june|july|august|september|october|november|december)\s+\d{1,2}/i.test(clean) ||
        /\b\d{1,2}[\/\-]\d{1,2}\b/.test(clean)) {
      date = clean;
      continue;
    }

    // ── Service keyword — only fill if not already set from flow ─────────
    if (!session.service &&
        /facial|microneedling|bb glow|laser|hair removal|hifu|tightening|slimming|iv drip|warts|injectable|lemon bottle|mesolipo|gluta|glutathione|botox|filler|prp|salmon|stretch/i.test(clean)) {
      // service carries from session; only capture if nothing was set
      continue;
    }

    // ── Name: letters, reasonable length, not a keyword ──────────────────
    if (!name &&
        clean.length >= 2 &&
        clean.length <= 60 &&
        /[a-zA-Z]/.test(clean) &&
        !/^\d+$/.test(clean) &&
        !/^(new|old|yes|no|wala|meron|confirm|cancel)$/i.test(clean)) {
      name = clean;
    }
  }

  logger.info({ clientType, name, phone, date, time }, "Booking form parsed");

  // Save partial progress so each message builds on the last
  setSession(psid, {
    step: "entering_booking_form",
    clientType: clientType ?? undefined,
    name:       name       ?? undefined,
    mobile:     phone      ?? undefined,
    date:       date       ?? undefined,
    time:       time       ?? undefined,
  });

  // ── What's still missing? ──────────────────────────────────────────────
  const missing: string[] = [];
  if (!clientType) missing.push("Old or New Client (type Old or New)");
  if (!name)       missing.push("full name");
  if (!phone)      missing.push("mobile number");
  if (!date)       missing.push("preferred date");
  if (!time)       missing.push("preferred time");

  if (missing.length > 0) {
    const missingText = missing.length === 1
      ? missing[0]!
      : missing.join(" and ");
    await sendWithDelayAndQuickReplies(
      psid,
      `Almost there! 😊 Could you also share your ${missingText}?`,
      TALK_TO_STAFF_QR,
      800,
    );
    return;
  }

  // ── All collected — go to confirmation ─────────────────────────────────
  setSession(psid, {
    clientType: clientType!,
    name:       name!,
    mobile:     phone!,
    date:       date!,
    time:       time!,
  });
  await showFinalConfirmation(psid);
}

async function handleMissingFieldEntry(psid: string, text: string): Promise<void> {
  const session = getSession(psid);
  const missing = session.missingFields ?? [];
  const current = missing[0];

  if (!current) {
    await showFinalConfirmation(psid);
    return;
  }

  const trimmed = text.trim();

  if (current === "mobile number") {
    const mobile = trimmed.replace(/\s/g, "");
    const mobilePattern = /^(\+63|0)[0-9]{9,10}$|^\d{7,11}$/;
    if (!mobilePattern.test(mobile)) {
      await sendWithDelayAndQuickReplies(
        psid,
        `${randomPick(RETRY_MESSAGES)}What's your mobile number? (e.g. 09171234567)`,
        TALK_TO_STAFF_QR,
        800,
      );
      return;
    }
    setSession(psid, { mobile });
  } else if (current === "full name") {
    setSession(psid, { name: trimmed });
  } else if (current === "preferred date") {
    setSession(psid, { date: trimmed });
  } else if (current === "preferred time") {
    setSession(psid, { time: trimmed });
  }

  const remaining = missing.slice(1);
  setSession(psid, { missingFields: remaining });

  if (remaining.length > 0) {
    await sendWithDelayAndQuickReplies(
      psid,
      `Got it! 😊 One more — could you share your ${remaining[0]}?`,
      TALK_TO_STAFF_QR,
      800,
    );
    return;
  }

  await showFinalConfirmation(psid);
}

async function showFinalConfirmation(psid: string): Promise<void> {
  const s = getSession(psid);
  setSession(psid, { step: "final_confirming" });

  const clientTypeLine = s.clientType ? `🔘 Client Type: ${s.clientType}\n` : "";
  const summary =
    `Perfect! Here's your booking summary 📋\n\n` +
    clientTypeLine +
    `👤 Name: ${s.name}\n` +
    `📱 Mobile: ${s.mobile}\n` +
    `💆 Service: ${s.service}\n` +
    `📅 Date: ${s.date}\n` +
    `🕐 Time: ${s.time}\n\n` +
    `Shall we confirm this booking?`;

  await sendWithDelayAndQuickReplies(
    psid,
    summary,
    [
      { title: "✅ Confirm", payload: "CONFIRM_BOOKING" },
      { title: "✏️ Edit", payload: "EDIT_BOOKING" },
      { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
    ],
    1500,
  );
}

async function handleFinalConfirmation(psid: string, text: string, payload?: string): Promise<void> {
  // Handle SKIP_EMAIL payload coming here (edge case)
  if (payload === "SKIP_EMAIL") {
    setSession(psid, { email: undefined, emailConsent: false });
    await showFinalConfirmation(psid);
    return;
  }

  const isConfirm =
    payload === "CONFIRM_BOOKING" ||
    /^(yes|oo|opo|sige|tama|okay|ok|confirm|push|go|yep|yup|sure)\b/i.test(text.trim());
  const isEdit =
    payload === "EDIT_BOOKING" || /\b(edit|mali|change|baguhin|ulit|again|change)\b/i.test(text);

  if (isConfirm) {
    const s = getSession(psid);

    // Notify client we are booking
    await sendWithDelay(
      psid,
      "⏳ Perfect! We're booking your appointment now, please wait a moment...",
      500,
    );

    // Trigger auto booking with a hard 90-second cap so the user never waits indefinitely
    let bookingResult: { success: boolean; referenceNo?: string; error?: string; screenshotPath?: string };
    try {
      const BOOKING_TIMEOUT_MS = 90_000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Booking automation timed out — will process manually")), BOOKING_TIMEOUT_MS)
      );
      bookingResult = await Promise.race([
        createReservation({
          psid,
          service: s.service!,
          date: s.date!,
          time: s.time!,
          name: s.name ?? "Client",
          mobile: s.mobile!,
          email: s.email,
          emailConsent: s.emailConsent,
          concern: s.concern,
          channel: s.channel,
          clientType: (s.clientType as "Old" | "New" | undefined) ?? "New",
        }),
        timeoutPromise,
      ]);
    } catch (err) {
      logger.error({ err, psid }, "AnyPlusPro automation error");
      bookingResult = { success: false, error: err instanceof Error ? err.message : String(err) };
    }

    if (bookingResult.success) {
      await sendWithDelay(
        psid,
        `🎉 You're all set! Your ${s.service} is booked for ${s.date} at ${s.time}. See you at La Julieta Beauty Center! 💕`,
        800,
      );
      setSession(psid, { step: "idle" });
    } else {
      await sendWithDelay(
        psid,
        "💕 Thank you! Our team will confirm your appointment shortly. You'll receive a message within 1 hour!",
        800,
      );
      resetSession(psid);
    }

  } else if (isEdit) {
    // Keep the service — just clear personal details and go back to the form
    setSession(psid, {
      step: "entering_booking_form",
      date: undefined, time: undefined,
      name: undefined, mobile: undefined,
      clientType: undefined, retryCount: 0,
    });
    await sendWithDelay(
      psid,
      `No problem! 😊 Please send your updated details:\n\n🔘 Old or New Client:\n👤 Name:\n📱 Mobile Number:\n📅 Preferred Date:\n🕐 Preferred Time:`,
      800,
    );
  } else {
    await showFinalConfirmation(psid);
  }
}
