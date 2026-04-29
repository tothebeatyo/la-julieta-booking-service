import {
  sendWithDelay,
  sendWithDelayAndQuickReplies,
  sendText,
  sendTypingOn,
  sendTypingOff,
} from "../services/messengerService";
import { createReservation } from "../services/anyplusService";
import { getSession, setSession, resetSession } from "./state";
import { detectService, detectDateKeyword, isExplanationQuery, detectSkinConcern } from "./intentDetector";
import {
  BOOK_START_MESSAGES,
  SERVICES_QUICK_REPLIES,
  PAYLOAD_TO_SERVICE,
  DATE_PROMPTS,
  TIME_PROMPTS,
  NAME_PROMPTS,
  MOBILE_PROMPTS,
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
  SAFETY_QUESTIONS,
  SAFETY_FAIL_MESSAGE,
  SAFETY_PASS_MESSAGE,
  YES_NO_QUICK_REPLIES,
  getPricelistForService,
  getPromosForService,
  getDescriptionForService,
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

  if (pricelist) {
    await sendWithDelay(psid, pricelist, 1200);
  } else {
    await sendWithDelay(
      psid,
      `For ${service}, it's best to chat with our staff for exact pricing 💕`,
      1000,
    );
  }

  const promoButton = matchingPromos.length > 0
    ? [{ title: "🎉 View Promos", payload: "INTENT_PROMOS" }]
    : [];

  await sendWithDelayAndQuickReplies(
    psid,
    `Would you like to book ${service}? 😊`,
    [
      { title: "📅 Book Now", payload: "BOOK_NOW" },
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
    setSession(psid, { step: "entering_date", retryCount: 0 });
    upsertClient({ psid, status: "inquiry", leadStatus: "booking_requested" }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `Great! Let's book your ${session.service} 🌸 ${randomPick(DATE_PROMPTS)}`,
      TALK_TO_STAFF_QR,
      1000,
    );
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
    case "entering_date": {
      await handleDateEntry(psid, text);
      break;
    }
    case "entering_time": {
      await handleTimeEntry(psid, text);
      break;
    }
    case "entering_name": {
      await handleNameEntry(psid, text);
      break;
    }
    case "entering_mobile": {
      await handleMobileEntry(psid, text);
      break;
    }
    case "confirming": {
      await handleConfirmation(psid, text, payload);
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

async function startSafetyScreening(psid: string, pendingService: string): Promise<void> {
  setSession(psid, {
    step: "safety_screening",
    screeningStep: 0,
    safetyFlags: [],
    pendingService,
  });
  await sendWithDelay(psid, SAFETY_SCREENING_INTRO, 800);
  await delay(600);
  await sendWithDelayAndQuickReplies(
    psid,
    `Question 1 of 5:\n${SAFETY_QUESTIONS[0]}`,
    YES_NO_QUICK_REPLIES,
    1000,
  );
}

async function handleSafetyScreening(psid: string, text: string, payload?: string): Promise<void> {
  const session = getSession(psid);
  const step = session.screeningStep ?? 0;
  const flags = session.safetyFlags ?? [];

  const isYes =
    payload === "SCREENING_YES" ||
    /\b(yes|oo|opo|meron|mayroon|may|pregnant|positive|tama|true)\b/i.test(text);

  const flagNames = ["pregnant", "breastfeeding", "injection_allergy", "medication", "medical_condition"];

  if (isYes) {
    // Any YES → fail immediately
    const newFlag = flagNames[step] ?? "unknown";
    const allFlags = [...flags, newFlag];
    upsertClient({
      psid,
      safetyFlags: allFlags.join(","),
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
    setSession(psid, { step: "choosing_intent", screeningStep: 0, safetyFlags: allFlags });
    return;
  }

  // NO — move to next question
  const nextStep = step + 1;

  if (nextStep >= SAFETY_QUESTIONS.length) {
    // All clear — proceed to recommend injectable service
    upsertClient({
      psid,
      safetyFlags: "none",
      leadStatus: "injectable_cleared",
    }).catch(() => {});

    const pendingService = session.pendingService ?? "IV Drip";
    await sendWithDelay(psid, SAFETY_PASS_MESSAGE, 1000);
    await delay(400);
    setSession(psid, { step: "awaiting_book_decision", service: pendingService, screeningStep: 0, safetyFlags: [] });
    await sendPricingAndPromos(psid, pendingService);
    return;
  }

  setSession(psid, { screeningStep: nextStep, safetyFlags: flags });
  await sendWithDelayAndQuickReplies(
    psid,
    `Question ${nextStep + 1} of 5:\n${SAFETY_QUESTIONS[nextStep]}`,
    YES_NO_QUICK_REPLIES,
    1000,
  );
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
  // Injectable service with safety screening shortcut
  if (payload === "SCREENING_GLUTA") {
    await startSafetyScreening(psid, "IV Drip");
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

  // Service payloads that need injectable safety screening
  if (payload && ["SVC_DRIP", "SVC_SLIM"].includes(payload)) {
    const service = PAYLOAD_TO_SERVICE[payload];
    if (INJECTABLE_SERVICES.has(service)) {
      await startSafetyScreening(psid, service);
      return;
    }
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
      await sendPricingAndPromos(psid, detectedService);
    } else {
      setSession(psid, { step: "choosing_intent", retryCount: 0 });
      await sendWithDelayAndQuickReplies(
        psid,
        "Hmm, could you pick from the options below? 😊",
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

// ─── Booking Steps ────────────────────────────────────────────────────────────

async function handleDateEntry(psid: string, text: string): Promise<void> {
  const dateValue = detectDateKeyword(text) || (text.trim().length >= 3 ? text.trim() : null);

  if (dateValue) {
    setSession(psid, { step: "entering_time", date: dateValue, retryCount: 0 });
    upsertClient({ psid, bookingDate: dateValue }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `${dateValue} — noted! 📅 ${randomPick(TIME_PROMPTS)}`,
      TALK_TO_STAFF_QR,
      1200,
    );
  } else {
    const s = getSession(psid);
    setSession(psid, { retryCount: (s.retryCount || 0) + 1 });
    await sendWithDelayAndQuickReplies(
      psid,
      `${randomPick(RETRY_MESSAGES)}What day are you available? (e.g. 'tomorrow', 'April 25', 'Saturday')`,
      TALK_TO_STAFF_QR,
      1000,
    );
  }
}

async function handleTimeEntry(psid: string, text: string): Promise<void> {
  const timePattern = /\b(\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)?)\b|(morning|afternoon|evening|umaga|tanghali|hapon|gabi)/i;

  if (timePattern.test(text) || text.trim().length >= 2) {
    setSession(psid, { step: "entering_name", time: text.trim(), retryCount: 0 });
    upsertClient({ psid, bookingTime: text.trim() }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `${text.trim()} — perfect! 🕐 ${randomPick(NAME_PROMPTS)}`,
      TALK_TO_STAFF_QR,
      1200,
    );
  } else {
    const s = getSession(psid);
    setSession(psid, { retryCount: (s.retryCount || 0) + 1 });
    await sendWithDelayAndQuickReplies(
      psid,
      `${randomPick(RETRY_MESSAGES)}What time? (e.g. '10am', '2pm', '3:30 PM')`,
      TALK_TO_STAFF_QR,
      1000,
    );
  }
}

async function handleNameEntry(psid: string, text: string): Promise<void> {
  const name = text.trim();
  if (name.length >= 2 && /[a-zA-ZÀ-ÿ]/.test(name)) {
    setSession(psid, { step: "entering_mobile", name, retryCount: 0 });
    upsertClient({ psid, name }).catch(() => {});
    await sendWithDelayAndQuickReplies(
      psid,
      `Hi ${name}! Nice to meet you 😊 ${randomPick(MOBILE_PROMPTS)}`,
      TALK_TO_STAFF_QR,
      1200,
    );
  } else {
    const s = getSession(psid);
    setSession(psid, { retryCount: (s.retryCount || 0) + 1 });
    await sendWithDelayAndQuickReplies(
      psid,
      `${randomPick(RETRY_MESSAGES)}What's your full name?`,
      TALK_TO_STAFF_QR,
      1000,
    );
  }
}

async function handleMobileEntry(psid: string, text: string): Promise<void> {
  const mobile = text.replace(/\s/g, "");
  const mobilePattern = /^(\+63|0)[0-9]{9,10}$|^\d{7,11}$/;

  if (mobilePattern.test(mobile)) {
    setSession(psid, { step: "confirming", mobile, retryCount: 0 });
    upsertClient({ psid, mobile, status: "inquiry", leadStatus: "booking_requested" }).catch(() => {});
    const s = getSession(psid);
    const summary =
      `Just to confirm 💖\n\n` +
      `📋 𝗕𝗼𝗼𝗸𝗶𝗻𝗴 𝗗𝗲𝘁𝗮𝗶𝗹𝘀\n` +
      `💆 Service: ${s.service}\n` +
      `📅 Date: ${s.date}\n` +
      `🕐 Time: ${s.time}\n` +
      `👤 Name: ${s.name}\n` +
      `📱 Mobile: ${mobile}`;

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
  } else {
    const s = getSession(psid);
    setSession(psid, { retryCount: (s.retryCount || 0) + 1 });
    await sendWithDelayAndQuickReplies(
      psid,
      `${randomPick(RETRY_MESSAGES)}What's your mobile number? (e.g. 09171234567)`,
      TALK_TO_STAFF_QR,
      1000,
    );
  }
}

async function handleConfirmation(psid: string, text: string, payload?: string): Promise<void> {
  const isConfirm =
    payload === "CONFIRM_BOOKING" ||
    /confirm|yes|oo|sige|tama|okay|ok|correct|push/i.test(text);
  const isEdit =
    payload === "EDIT_BOOKING" || /edit|mali|change|baguhin|ulit|again/i.test(text);

  if (isConfirm) {
    const s = getSession(psid);
    await sendTypingOn(psid);
    await delay(2000);
    await sendTypingOff(psid);

    try {
      const result = await createReservation({
        psid,
        service: s.service!,
        date: s.date!,
        time: s.time!,
        name: s.name!,
        mobile: s.mobile!,
      });

      if (result.success) {
        upsertClient({ psid, status: "confirmed", leadStatus: "booking_confirmed", referenceNo: result.referenceNo }).catch(() => {});
        resetSession(psid);
        await sendText(
          psid,
          `Your booking is CONFIRMED! 🎉💖\n\n` +
            `Reference No: ${result.referenceNo}\n\n` +
            `Watch out for a confirmation text from us. If you have any questions, just message me anytime 💕 Salamat and see you soon at La Julieta Beauty! 🌸`,
        );
        await delay(1000);
        await sendWithDelayAndQuickReplies(
          psid,
          "Is there anything else I can help you with? 😊",
          INTENT_QUICK_REPLIES,
          800,
        );
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (err) {
      logger.error({ err, psid }, "Booking failed");
      resetSession(psid);
      await sendWithDelayAndQuickReplies(
        psid,
        "Oops, something went wrong on our end 😅 Please try again in a bit, or you can talk to our staff directly for faster help! 🙏",
        [
          { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
          { title: "🔄 Try Again", payload: "INTENT_BOOK" },
        ],
        1500,
      );
    }
  } else if (isEdit) {
    setSession(psid, { step: "choosing_service", service: undefined, date: undefined, time: undefined, name: undefined, mobile: undefined, retryCount: 0 });
    await sendWithDelayAndQuickReplies(
      psid,
      "No worries! Let's fix that 😊 Which service would you like?",
      SERVICES_QUICK_REPLIES,
      1000,
    );
  } else {
    await sendWithDelayAndQuickReplies(
      psid,
      "Shall we go ahead and confirm? 😊",
      [
        { title: "✅ Confirm", payload: "CONFIRM_BOOKING" },
        { title: "✏️ Edit", payload: "EDIT_BOOKING" },
        { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
      ],
      1000,
    );
  }
}
