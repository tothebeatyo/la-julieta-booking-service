import {
  sendWithDelay,
  sendWithDelayAndQuickReplies,
  sendText,
  sendTypingOn,
  sendTypingOff,
} from "../services/messengerService";
import { createReservation } from "../services/anyplusService";
import { getSession, setSession, resetSession } from "./state";
import { detectService, detectDateKeyword, isExplanationQuery } from "./intentDetector";
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
  STAFF_MESSAGE,
  ACTIVE_PROMOS,
  PROMOS_QUICK_REPLIES,
  getPricelistForService,
  getPromosForService,
  getDescriptionForService,
  randomPick,
} from "./responses";
import { logger } from "../lib/logger";
import { upsertClient } from "../services/clientService";

const TALK_TO_STAFF_QR = [{ title: "👩 Talk to Staff", payload: "INTENT_STAFF" }];

async function delay(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Send the pricelist for a service category, plus any matching active promos,
 * then offer the customer a quick "Book Now" button. Sets the session so that
 * the next BOOK_NOW click jumps straight to date entry with the service already set.
 */
async function sendPricingAndPromos(psid: string, service: string): Promise<void> {
  const pricelist = getPricelistForService(service);
  const matchingPromos = getPromosForService(service);

  // Save the service in session so BOOK_NOW jumps right to date entry
  setSession(psid, { step: "awaiting_book_decision", service });
  upsertClient({ psid, service }).catch(() => {});

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
      { title: "👩 Talk to Staff", payload: "INTENT_STAFF" },
    ],
    1000,
  );
}

export async function handleBookingFlow(psid: string, text: string, payload?: string): Promise<void> {
  const session = getSession(psid);

  // Always allow "Talk to Staff" or "restart"
  if (payload === "INTENT_STAFF" || /talk to staff|staff|human|agent|tao/i.test(text)) {
    await sendWithDelay(psid, STAFF_MESSAGE, 1000);
    resetSession(psid);
    return;
  }

  // Restart keywords
  if (/^(hi|hello|restart|start over|uli|ulit|balik|menu|home)$/i.test(text.trim())) {
    resetSession(psid);
    setSession(psid, { step: "choosing_intent" });
    await sendWithDelayAndQuickReplies(
      psid,
      "No problem, let's start over! 😊 What can I help you with?",
      INTENT_QUICK_REPLIES,
      1000,
    );
    return;
  }

  logger.info({ psid, step: session.step, text, payload }, "Booking flow step");

  // SHOW_PRICING — user saw the description and now wants to see prices
  if (payload === "SHOW_PRICING" && session.service) {
    await sendPricingAndPromos(psid, session.service);
    return;
  }

  // BOOK_NOW from a pricelist message — user wants to book the saved service
  if (payload === "BOOK_NOW" && session.service) {
    setSession(psid, { step: "entering_date", retryCount: 0 });
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
    case "choosing_intent": {
      await handleIntentChoice(psid, text, payload);
      break;
    }
    case "choosing_service": {
      await handleServiceChoice(psid, text, payload);
      break;
    }
    case "awaiting_book_decision": {
      // User received pricelist + promos; route their next message
      await handleIntentChoice(psid, text, payload);
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

async function handleIntentChoice(psid: string, text: string, payload?: string): Promise<void> {
  // Always check for a specific service mention first — covers "magkano ang facial",
  // "what is microneedling", "how does HIFU work", "para saan ang IV drip", etc.
  if (!payload) {
    const specificService = detectService(text);
    if (specificService) {
      if (isExplanationQuery(text)) {
        // They're asking what the service IS — show description, then offer pricing/booking
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
              { title: "👩 Talk to Staff", payload: "INTENT_STAFF" },
            ],
            1000,
          );
          return;
        }
      }
      // They're asking price / availability — show pricelist directly
      await sendPricingAndPromos(psid, specificService);
      return;
    }
  }

  if (payload === "INTENT_BOOK" || /book|appointment|reserv|mag-book|schedule/i.test(text)) {
    setSession(psid, { step: "choosing_service" });
    await sendWithDelayAndQuickReplies(
      psid,
      randomPick(BOOK_START_MESSAGES),
      SERVICES_QUICK_REPLIES,
      1200,
    );
  } else if (payload === "INTENT_SERVICES" || /services|treatment|menu|listahan|magkano|how much|price|presyo|available|ano meron|anong meron|what do you offer/i.test(text)) {
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
      [...SERVICES_QUICK_REPLIES, { title: "👩 Talk to Staff", payload: "INTENT_STAFF" }],
      800,
    );
  } else if (payload === "INTENT_PROMOS" || /promo|discount|sale|deals|mura/i.test(text)) {
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
  } else if (payload === "INTENT_STAFF" || /staff|human|agent|tao/i.test(text)) {
    await sendWithDelay(psid, STAFF_MESSAGE, 1000);
    resetSession(psid);
  } else {
    // Try to detect a service mention directly — show pricelist + matching promos
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

async function handleServiceChoice(psid: string, text: string, payload?: string): Promise<void> {
  let service: string | null = null;

  if (payload && PAYLOAD_TO_SERVICE[payload]) {
    service = PAYLOAD_TO_SERVICE[payload];
  } else {
    service = detectService(text);
  }

  if (service) {
    await sendPricingAndPromos(psid, service);
  } else {
    const s = getSession(psid);
    if (s.retryCount >= 2) {
      setSession(psid, { retryCount: 0 });
      await sendWithDelayAndQuickReplies(
        psid,
        "It might be easier to just pick from the list below 😊",
        [...SERVICES_QUICK_REPLIES, { title: "👩 Talk to Staff", payload: "INTENT_STAFF" }],
        1000,
      );
    } else {
      setSession(psid, { retryCount: (s.retryCount || 0) + 1 });
      await sendWithDelayAndQuickReplies(
        psid,
        `${randomPick(RETRY_MESSAGES)}Which service would you like?`,
        [...SERVICES_QUICK_REPLIES, { title: "👩 Talk to Staff", payload: "INTENT_STAFF" }],
        1000,
      );
    }
  }
}

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
  // Accept anything that looks like a time or a general time-of-day
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
      `${randomPick(RETRY_MESSAGES)}What's your name?`,
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
    upsertClient({ psid, mobile }).catch(() => {});
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
        { title: "👩 Talk to Staff", payload: "INTENT_STAFF" },
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
          { title: "👩 Talk to Staff", payload: "INTENT_STAFF" },
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
        { title: "👩 Talk to Staff", payload: "INTENT_STAFF" },
      ],
      1000,
    );
  }
}
