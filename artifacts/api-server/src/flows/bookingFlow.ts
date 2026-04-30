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

const TALK_TO_STAFF_QR = [{ title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" }];

// Injectable services that need safety screening before recommendation
const INJECTABLE_SERVICES = new Set(["IV Drip", "Slimming / Fat Dissolve", "Lemon Bottle Fat Dissolve", "Mesolipo"]);

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

  switch (session.step) {
    case "idle":
    case "choosing_intent":
    case "choosing_skin_concern":
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

async function startSafetyScreening(psid: string, pendingService: string): Promise<void> {
  setSession(psid, {
    step: "safety_screening",
    screeningStep: 0,
    safetyFlags: [],
    pendingService,
  });
  await sendWithDelayAndQuickReplies(psid, SAFETY_SCREENING_INTRO, TALK_TO_STAFF_QR, 800);
}

async function handleSafetyScreening(psid: string, text: string, payload?: string): Promise<void> {
  const session = getSession(psid);

  // Legacy quick-reply fast-path (SCREENING_YES from old flow)
  if (payload === "SCREENING_YES") {
    await triggerSafetyFail(psid, ["unknown"]);
    return;
  }

  // Split into non-empty lines
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // Single word/line — ask for clarification (unless it's clearly "yes" = immediate fail)
  if (lines.length < 5) {
    if (lines.length === 1 && isYesAnswer(lines[0])) {
      await triggerSafetyFail(psid, ["unknown"]);
      return;
    }
    await sendWithDelayAndQuickReplies(psid, SAFETY_CLARIFICATION, TALK_TO_STAFF_QR, 800);
    return;
  }

  // Map first 5 lines to flag names
  const yesFlags: string[] = [];
  let hasUnrecognized = false;

  for (let i = 0; i < 5; i++) {
    const line = lines[i];
    if (isYesAnswer(line)) {
      yesFlags.push(SAFETY_FLAG_NAMES[i] ?? "unknown");
    } else if (!isNoAnswer(line)) {
      hasUnrecognized = true;
    }
  }

  // Any YES → fail with collected flags
  if (yesFlags.length > 0) {
    await triggerSafetyFail(psid, yesFlags);
    return;
  }

  // Some lines aren't recognizable yes/no → ask to redo
  if (hasUnrecognized) {
    await sendWithDelayAndQuickReplies(
      psid,
      `Please reply Yes or No for each question 😊\n\nFor example:\nNo\nNo\nNo\nNo\nNo`,
      TALK_TO_STAFF_QR,
      800,
    );
    return;
  }

  // All 5 are clearly No → cleared
  upsertClient({ psid, safetyFlags: "none", leadStatus: "injectable_cleared" }).catch(() => {});
  const pendingService = session.pendingService ?? "IV Drip";
  await sendWithDelay(psid, SAFETY_PASS_MESSAGE, 1000);
  await delay(400);
  setSession(psid, {
    step: "awaiting_book_decision",
    service: pendingService,
    screeningStep: 0,
    safetyFlags: [],
    screeningPassed: true,
  });
  await sendPricingAndPromos(psid, pendingService);
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

  // Injectable service with safety screening shortcut
  if (payload === "SCREENING_GLUTA") {
    await startSafetyScreening(psid, "IV Drip");
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

  // Facial treatments shortcut
  if (payload === "INTENT_FACIALS" || /\b(facial|face treatment|pangmukha)\b/i.test(text)) {
    await sendPricingAndPromos(psid, "Facial");
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

  // Injectables / Gluta menu
  if (payload === "INTENT_INJECTABLES" || /\b(injectable|injection|gluta|iv drip|drip|fat dissolve)\b/i.test(text)) {
    setSession(psid, { step: "choosing_intent", intent: "injectables" });
    await sendWithDelayAndQuickReplies(
      psid,
      "Here are our injectable and advanced treatments 💉 Which are you interested in?",
      INJECTABLES_QUICK_REPLIES,
      1000,
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

function parseBookingForm(text: string): {
  clientType?: string;
  name?: string;
  mobile?: string;
  date?: string;
  time?: string;
} {
  const result: { clientType?: string; name?: string; mobile?: string; date?: string; time?: string } = {};

  const patterns: Array<[keyof typeof result, RegExp]> = [
    ["clientType", /(?:🔘\s*)?(?:old or new client|client type|client)\s*[:\-]\s*(.+)/i],
    ["name", /(?:👤\s*)?(?:full name|name)\s*[:\-]\s*(.+)/i],
    ["mobile", /(?:📱\s*)?(?:mobile(?: number)?|phone|contact|number|cp|cel)\s*[:\-]\s*(.+)/i],
    ["date", /(?:📅\s*)?(?:preferred date|date)\s*[:\-]\s*(.+)/i],
    ["time", /(?:🕐\s*)?(?:preferred time|time)\s*[:\-]\s*(.+)/i],
  ];

  for (const [key, pattern] of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const val = match[1].trim();
      if (val && val !== "-" && val !== "—" && val !== "") {
        result[key] = val;
      }
    }
  }

  return result;
}

async function handleBookingFormEntry(psid: string, text: string): Promise<void> {
  const session = getSession(psid);
  const parsed = parseBookingForm(text);

  // Merge parsed values into session (keep existing if not provided)
  setSession(psid, {
    clientType: parsed.clientType ?? session.clientType,
    name:       parsed.name    ?? session.name,
    mobile:     parsed.mobile  ?? session.mobile,
    date:       parsed.date    ?? session.date,
    time:       parsed.time    ?? session.time,
  });

  const updated = getSession(psid);
  const missing: string[] = [];
  if (!updated.name)   missing.push("full name");
  if (!updated.mobile) missing.push("mobile number");
  if (!updated.date)   missing.push("preferred date");
  if (!updated.time)   missing.push("preferred time");

  if (missing.length > 0) {
    setSession(psid, { step: "awaiting_missing_field", missingFields: missing });
    await sendWithDelayAndQuickReplies(
      psid,
      `Almost there! 😊 Could you also share your ${missing[0]}?`,
      TALK_TO_STAFF_QR,
      800,
    );
    return;
  }

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

    // Trigger auto booking (awaited — synchronous)
    let bookingResult: { success: boolean; referenceNo?: string; error?: string; screenshotPath?: string };
    try {
      bookingResult = await createReservation({
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
      });
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
    setSession(psid, {
      step: "choosing_service",
      service: undefined, date: undefined, time: undefined,
      name: undefined, mobile: undefined, email: undefined,
      emailConsent: undefined, retryCount: 0,
    });
    await sendWithDelayAndQuickReplies(
      psid,
      "No worries! Let's fix that 😊 Which service would you like?",
      SERVICES_QUICK_REPLIES,
      1000,
    );
  } else {
    await showFinalConfirmation(psid);
  }
}
