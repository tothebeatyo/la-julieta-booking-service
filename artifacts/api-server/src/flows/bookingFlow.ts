import {
  sendWithDelay,
  sendWithDelayAndQuickReplies,
  sendText,
  sendTypingOn,
  sendTypingOff,
} from "../services/messengerService";
import { createReservation } from "../services/anyplusService";
import { getSession, setSession, resetSession } from "./state";
import { detectService, detectDateKeyword } from "./intentDetector";
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
      `Para po sa ${service}, mas ok kung makausap mo ang aming staff para sa exact pricing 💕`,
      1000,
    );
  }

  if (matchingPromos.length > 0) {
    await sendWithDelay(
      psid,
      `Wait may bonus pa! 🎉 May ${matchingPromos.length} promo${matchingPromos.length > 1 ? "s" : ""} kami na pwede mo isama dito bes 💖`,
      900,
    );
    for (const promo of matchingPromos) {
      await sendWithDelay(psid, promo, 1100);
    }
  }

  await sendWithDelayAndQuickReplies(
    psid,
    `So bes, gusto mo na ba i-book ${service} mo? 😊`,
    [
      { title: "📅 Mag-Book Na", payload: "BOOK_NOW" },
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
      "Sige bes, balik tayo sa simula 😊 Anong gusto mong gawin?",
      INTENT_QUICK_REPLIES,
      1000,
    );
    return;
  }

  logger.info({ psid, step: session.step, text, payload }, "Booking flow step");

  // BOOK_NOW from a pricelist message — user wants to book the saved service
  if (payload === "BOOK_NOW" && session.service) {
    setSession(psid, { step: "entering_date", retryCount: 0 });
    await sendWithDelayAndQuickReplies(
      psid,
      `Sige po, mag-book na tayo ng ${session.service} 🌸 ${randomPick(DATE_PROMPTS)}`,
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
        "Tara, magsimula ulit tayo ha! 😊 Paano kita matutulungan?",
        INTENT_QUICK_REPLIES,
        1000,
      );
    }
  }
}

async function handleIntentChoice(psid: string, text: string, payload?: string): Promise<void> {
  if (payload === "INTENT_BOOK" || /book|appointment|reserv|mag-book|schedule/i.test(text)) {
    setSession(psid, { step: "choosing_service" });
    await sendWithDelayAndQuickReplies(
      psid,
      randomPick(BOOK_START_MESSAGES),
      SERVICES_QUICK_REPLIES,
      1200,
    );
  } else if (payload === "INTENT_SERVICES" || /services|treatment|menu|listahan/i.test(text)) {
    await sendWithDelay(
      psid,
      "Sige po! Madami kaming services 💅 Pumili lang po sa categories — ipapakita ko sa'yo lahat ng prices kasama ang available promos 💖",
      1200,
    );
    await delay(600);
    setSession(psid, { step: "choosing_service" });
    await sendWithDelayAndQuickReplies(
      psid,
      "Alin sa mga ito gusto mong tingnan? 💕",
      [...SERVICES_QUICK_REPLIES, { title: "👩 Talk to Staff", payload: "INTENT_STAFF" }],
      800,
    );
  } else if (payload === "INTENT_PROMOS" || /promo|discount|sale|deals|mura/i.test(text)) {
    await sendWithDelay(psid, `May ${ACTIVE_PROMOS.length} active promos po kami ngayon 🎉 Pakicheck na lang lahat — baka may matipid kayo 💖👇`, 800);
    for (const promo of ACTIVE_PROMOS) {
      await sendWithDelay(psid, promo, 1200);
    }
    await sendWithDelayAndQuickReplies(
      psid,
      "Sige po, gusto niyo na ba i-avail? Book na po agad bago maubusan 🔥",
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
        "Hmm, pwede bang piliin sa mga options below? 😊",
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
        "Baka mas madali kung pipiliin mo sa listahan ha 😊",
        [...SERVICES_QUICK_REPLIES, { title: "👩 Talk to Staff", payload: "INTENT_STAFF" }],
        1000,
      );
    } else {
      setSession(psid, { retryCount: (s.retryCount || 0) + 1 });
      await sendWithDelayAndQuickReplies(
        psid,
        `${randomPick(RETRY_MESSAGES)}Alin sa mga ito ang gusto mo?`,
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
      `${dateValue} — noted po! 📅 ${randomPick(TIME_PROMPTS)}`,
      TALK_TO_STAFF_QR,
      1200,
    );
  } else {
    const s = getSession(psid);
    setSession(psid, { retryCount: (s.retryCount || 0) + 1 });
    await sendWithDelayAndQuickReplies(
      psid,
      `${randomPick(RETRY_MESSAGES)}Anong araw ka available? (e.g. 'tomorrow', 'April 25', 'Saturday')`,
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
      `${text.trim()} — perfect po! 🕐 ${randomPick(NAME_PROMPTS)}`,
      TALK_TO_STAFF_QR,
      1200,
    );
  } else {
    const s = getSession(psid);
    setSession(psid, { retryCount: (s.retryCount || 0) + 1 });
    await sendWithDelayAndQuickReplies(
      psid,
      `${randomPick(RETRY_MESSAGES)}Anong oras? (e.g. '10am', '2pm', '3:30 PM')`,
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
      `${randomPick(RETRY_MESSAGES)}Ano po ang iyong pangalan?`,
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
      `${randomPick(RETRY_MESSAGES)}Anong mobile number mo? (e.g. 09171234567)`,
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
          `Yieee CONFIRMED na po booking mo! 🎉💖\n\n` +
            `Reference No: ${result.referenceNo}\n\n` +
            `Abangan mo lang yung confirmation text/message namin sa iyong number ha. Pag may tanong ka, message mo lang ulit ako 💕 Salamat ate, see you soon sa La Julieta Beauty! 🌸`,
        );
        await delay(1000);
        await sendWithDelayAndQuickReplies(
          psid,
          "May iba pa ba bes? 😊",
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
        "Hala bes, may glitch ata ngayon 😅 Di ko ma-process yung booking mo eh. Pakiulit na lang mamaya, or kausapin mo na rin agad yung staff namin para matulungan ka asap ha 🙏",
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
      "Sige po, i-edit natin 😊 Alin ulit yung service na gusto mo?",
      SERVICES_QUICK_REPLIES,
      1000,
    );
  } else {
    await sendWithDelayAndQuickReplies(
      psid,
      "I-confirm na ba natin ate? 😊",
      [
        { title: "✅ Confirm", payload: "CONFIRM_BOOKING" },
        { title: "✏️ Edit", payload: "EDIT_BOOKING" },
        { title: "👩 Talk to Staff", payload: "INTENT_STAFF" },
      ],
      1000,
    );
  }
}
