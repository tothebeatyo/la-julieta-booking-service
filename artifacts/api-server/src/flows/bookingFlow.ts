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
  PROMOS_TEXT,
  PROMOS_QUICK_REPLIES,
  randomPick,
} from "./responses";
import { logger } from "../lib/logger";

const TALK_TO_STAFF_QR = [{ title: "👩 Talk to Staff", payload: "INTENT_STAFF" }];

async function delay(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
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
      "Sige po, babalik tayo sa simula! 😊 Ano ang maipagagawa ko?",
      INTENT_QUICK_REPLIES,
      1000,
    );
    return;
  }

  logger.info({ psid, step: session.step, text, payload }, "Booking flow step");

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
      "Eto po ang mga available namin na services 💅\n\n✨ HydraFacial\n🔥 Laser Hair Removal\n🍋 Chemical Peel\n💆 Facial Treatment\n🎯 RF Skin Tightening\n💉 Microneedling\n💊 Botox / Filler\n💧 Whitening Drip\n\nGusto mo bang mag-book? 😊",
      1500,
    );
    await delay(800);
    setSession(psid, { step: "choosing_service" });
    await sendWithDelayAndQuickReplies(
      psid,
      "Alin ang gusto mong i-try? 💕",
      [...SERVICES_QUICK_REPLIES, { title: "👩 Talk to Staff", payload: "INTENT_STAFF" }],
      800,
    );
  } else if (payload === "INTENT_PROMOS" || /promo|discount|sale|deals|mura/i.test(text)) {
    await sendWithDelay(psid, PROMOS_TEXT, 1000);
    await sendWithDelayAndQuickReplies(
      psid,
      "Gusto mo bang i-avail ang promo? Book na agad bago maubusan! 🔥",
      PROMOS_QUICK_REPLIES,
      1200,
    );
  } else if (payload === "INTENT_STAFF" || /staff|human|agent|tao/i.test(text)) {
    await sendWithDelay(psid, STAFF_MESSAGE, 1000);
    resetSession(psid);
  } else {
    // Try to detect a service mention directly
    const detectedService = detectService(text);
    if (detectedService) {
      setSession(psid, { step: "entering_date", service: detectedService });
      await sendWithDelayAndQuickReplies(
        psid,
        `Ooh, ${detectedService}! Great choice po 🌸 ${randomPick(DATE_PROMPTS)}`,
        TALK_TO_STAFF_QR,
        1200,
      );
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
    setSession(psid, { step: "entering_date", service });
    await sendWithDelayAndQuickReplies(
      psid,
      `${service}! Maganda po yan 🌸 ${randomPick(DATE_PROMPTS)}`,
      TALK_TO_STAFF_QR,
      1200,
    );
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
    const s = getSession(psid);
    const summary =
      `Okay po! Let me check lang ha 😊\n\n` +
      `📋 Booking Details:\n` +
      `💆 Service: ${s.service}\n` +
      `📅 Date: ${s.date}\n` +
      `🕐 Time: ${s.time}\n` +
      `👤 Name: ${s.name}\n` +
      `📱 Mobile: ${mobile}\n\n` +
      `Tama na ba lahat? 😊`;

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
          `Yay! Confirmed na po ang iyong booking! 🎉💖\n\n` +
            `Reference No: ${result.referenceNo}\n\n` +
            `Abangan na lang po ang confirmation message namin. Para sa mga katanungan, pwede mo kaming i-message ulit. Salamat po at see you soon sa La Julieta Beauty! 🌸`,
        );
        await delay(1000);
        await sendWithDelayAndQuickReplies(
          psid,
          "May iba pa ba akong maipagagawa para sa iyo? 😊",
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
        "Ay, may nangyari po 😅 Di ko ma-process ang booking mo ngayon. Subukan ulit mamaya o kausapin ang aming staff para matulungan ka agad ha.",
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
      "Sige po, i-edit natin! 😊 Alin pong service ang gusto mo?",
      SERVICES_QUICK_REPLIES,
      1000,
    );
  } else {
    await sendWithDelayAndQuickReplies(
      psid,
      "Confirm ba ang booking? 😊",
      [
        { title: "✅ Confirm", payload: "CONFIRM_BOOKING" },
        { title: "✏️ Edit", payload: "EDIT_BOOKING" },
        { title: "👩 Talk to Staff", payload: "INTENT_STAFF" },
      ],
      1000,
    );
  }
}
