// Varied, human-sounding responses so the bot doesn't feel repetitive

export const WELCOME_MESSAGES = [
  "Hii! Welcome sa La Julieta Beauty Parañaque! 💕 Kamusta ka? Paano kita matutulungan ngayon?",
  "Hello po! Salamat sa pagmessage sa La Julieta Beauty ✨ Anong maipagagawa ko para sa iyo?",
  "Hi there! Welcome sa La Julieta Beauty 💖 Glad na nandito ka! Ano po ang maipagagawa namin?",
  "Helo po! La Julieta Beauty Parañaque here 🌸 Super excited na matulungan ka! Ano ang kailangan mo?",
];

export const INTENT_MENU_TEXT =
  "Pwede kita tulungan dito ha 😊 Ano po ba ang kailangan mo?";

export const INTENT_QUICK_REPLIES = [
  { title: "📅 Mag-Book", payload: "INTENT_BOOK" },
  { title: "💆 Services", payload: "INTENT_SERVICES" },
  { title: "🎉 Promos", payload: "INTENT_PROMOS" },
  { title: "👩 Talk to Staff", payload: "INTENT_STAFF" },
];

export const SERVICES_LIST = `Ito po ang full menu namin 💅 (prices in ₱)

💆 𝗙𝗔𝗖𝗜𝗔𝗟𝗦
• Basic Facial — 299
• Diamond Peel — 499
• HydraGlow Facial — 999
• Oxygeneo 3-in-1 Facial — 1,399
• Backne Facial — 1,599
• Underarm Spa — 599
Add-ons: Omega PDT Led 99 · Hydrating Sheet Mask 99

💉 𝗠𝗜𝗖𝗥𝗢𝗡𝗘𝗘𝗗𝗟𝗜𝗡𝗚
• Korean BB Glow — 599
• AcneKléar Microneedling — 1,099
• PRP Microneedling — 1,399
• Salmon DNA Microneedling — 1,899
• Stretch Marks Microneedling — 2,099
Add-ons: BB Glow Tint 199 · Whitening Stem Cell 299 · Hyaluronic Aqua Stem Cell 299

🔥 𝗟𝗔𝗦𝗘𝗥
• Skin Rejuvè (nape/elbows/knees) — 799
• Skin Rejuvè Laser Face — 999
• Pico Carbon Peel Laser — 999
• Intense UA Whitening Laser — 899
• Intense UA Hair Removal Laser — 899
• Upper / Lower Lips Hair Removal — 599

✨ 𝗗𝗜𝗢𝗗𝗘 𝗛𝗔𝗜𝗥 𝗥𝗘𝗠𝗢𝗩𝗔𝗟
• Small Area — 499
• Medium Area — 899
• Large Area — 1,299

🎯 𝗦𝗞𝗜𝗡 𝗧𝗜𝗚𝗛𝗧𝗘𝗡𝗜𝗡𝗚 / 𝗛𝗜𝗙𝗨
7D Ultraforma (HIFU): Cheeks/Jaw 1,799 · Double Chin/Neck 1,799 · Full Face 2,499 · Full Face+Chin+Neck 2,999 · Tummy/Love Handle 2,999 · Arms/Thighs 3,999
Thermagic: Eyes 4,999 · Forehead 3,099 · Cheeks/Chin 6,999 · Double Chin/Neck 6,999 · Full Face 8,999 · Full Face+Neck 12,999
ExiSlim: Cheeks/Jaw 699 · Double Chin/Neck 699 · Full Face 1,499 · Tummy 2,499 · Arms/Thighs 1,899 · Full Back 2,999

🍋 𝗦𝗟𝗜𝗠𝗠𝗜𝗡𝗚 / 𝗙𝗔𝗧 𝗗𝗜𝗦𝗦𝗢𝗟𝗩𝗘
Lemon Bottle: Cheeks/Jaw 2,099 · Double Chin 2,099 · Bra Line/Love Handle 3,099 · Arms/Thighs/Tummy 3,999
Mesolipo: Cheeks/Jaw 1,099 · Double Chin 1,099 · Arms/Bra Line/Thighs 2,099 · Tummy/Love Handle 2,499

💧 𝗜𝗩 𝗗𝗥𝗜𝗣𝗦 (Glutathione & Multivitamins)
• Immune Booster — 499
• Premium Bella Drip — 699
• VIP Celestial Drip — 999
• Snow White Drip — 1,299
• Ultimate Goddess Drip — 1,199
• Ultimate Snow White Drip — 1,599
Add-ons: Vitamin C 199 · B-Complex 299 · Collagen 399 · Placenta 499 · L-Carnitine 599

🩹 𝗪𝗔𝗥𝗧𝗦 𝗥𝗘𝗠𝗢𝗩𝗔𝗟
Mild 599 · Moderate 799 · Severe 999

Lahat po done by licensed aestheticians 💖 Gusto mo bang mag-book? 😊`;

// ─── Active Promos ────────────────────────────────────────────────────────────
// Add new promos here. Each one is sent as a separate Messenger message.
export const ACTIVE_PROMOS: string[] = [
  `🌸 𝗙𝗿𝗲𝗲 𝗙𝗮𝗰𝗶𝗮𝗹 𝗙𝗿𝗶𝗱𝗮𝘆𝘀! 😳💆‍♀️

Avail any of these premium treatments every Friday and get a complimentary bundle FREE:

🎁 Basic Facial + Omega PDT + Hydrating Sheet Mask

Qualifying treatments:
• 7D Ultraformer MP2
• Thermagic
• Fractional CO2 Laser
• PRP Microneedling
• AcneKléar Microneedling
• Salmon DNA PDRN Microneedling

⚠️ First 10 clients per day ONLY
📅 Every Friday — valid until April 30, 2026`,

  `☀️ 𝗦𝘂𝗺𝗺𝗲𝗿 𝗚𝗹𝗼𝘄 𝗣𝗿𝗼𝗺𝗼 — 𝗔𝘃𝗮𝗶𝗹 𝟰, 𝗚𝗲𝘁 𝟭 𝗙𝗥𝗘𝗘! 🔥

Facials. Laser. Slimming. Lahat in one deal!
Avail 4 sessions, libre ang ika-5! Plus — 0% installment with BDO 💳

✨ Ultraformer MP2 7D HIFU Pricing:
• Cheeks & Jaw .............. ₱1,588
• Double Chin & Neck .... ₱1,588
• Full Face ......................... ₱1,888
• Full Face & Neck ........... ₱2,888
• Bra Line / Love Handle . ₱2,888
• Tummy / Arms / Legs ... ₱3,488

Para malaman pa ang mga detalye, i-message kami o mag-book na! 💕`,

  `💉 𝗦𝘂𝗺𝗺𝗲𝗿 𝗚𝗹𝗼𝘄 𝟰.𝟰 — 𝗜𝗩 𝗚𝗹𝘂𝘁𝗮 𝗗𝗿𝗶𝗽 𝗣𝗮𝗰𝗸𝗮𝗴𝗲! ☀️

Buy 10 sessions, get 4 MORE for FREE — 14 sessions total! 🎁
Available in installment din po 💳

IV Drip Menu & Pricing (per session):
• Immune Booster Drip ........ ₱4,990
• Premium Bella Drip ............ ₱6,990
• VIP Celestial Drip ............... ₱9,990
• Snow White Drip ............... ₱12,990
• B-Complex ........................... ₱2,990
• Collagen ................................ ₱3,990
• Placenta ................................ ₱4,990
• L-Carnitine ........................... ₱5,990

⏳ Valid until April 30, 2026 only — huwag palampasin! 🙏`,

  `💎 𝗦𝘂𝗺𝗺𝗲𝗿 𝗣𝗿𝗼𝗺𝗼 𝟰.𝟰 — 𝗔𝘃𝗮𝗶𝗹 𝟰 𝗦𝗲𝘀𝘀𝗶𝗼𝗻𝘀, 𝗚𝗲𝘁 𝟭 𝗙𝗥𝗘𝗘! ✨

Pay sa 3 months installment, 0% interest with BDO 💳

Choose your treatment (price per session):
• Diamond Peel HydraGlow ............................. ₱999
• Oxygeneo Pico Carbon Laser ..................... ₱1,699
• PRP Face Skin Rejuvé Laser ....................... ₱1,699
• ExiSlim Vline / ExiSlim Body ....................... ₱1,899
• Mesolipo Vline + ExiSlim Emshape ........... ₱2,499
• Mesolipo Body + ExiSlim Emshape ........... ₱3,499

Mix and match para sa glow + snatch combo mo! 💕`,

  `🍋 𝗟𝗲𝗺𝗼𝗻 𝗕𝗼𝘁𝘁𝗹𝗲 𝗙𝗮𝘁 𝗗𝗶𝘀𝘀𝗼𝗹𝘃𝗶𝗻𝗴 𝗣𝗿𝗼𝗺𝗼! 💛

Stubborn fat doesn't disappear with wishful thinking — kailangan ng tamang solution! ✨

Only ₱567 per mL — perfect for targeting:
✔️ Double Chin
✔️ Jawline
✔️ Arms
✔️ Tummy
✔️ Bra Line
✔️ Love Handles

Goodbye stubborn fat, hello snatched silhouette! 💕 Book mo na ang consultation mo!`,
];

export const PROMOS_QUICK_REPLIES = [
  { title: "📅 Mag-Book Ngayon!", payload: "INTENT_BOOK" },
  { title: "💆 See Services", payload: "INTENT_SERVICES" },
  { title: "👩 Talk to Staff", payload: "INTENT_STAFF" },
];

export const STAFF_MESSAGE =
  "Sige po! Let me connect you sa isa sa aming staff agad 💖 Sandali lang ha, may sumasagot na sa iyo. Salamat sa iyong patience! 🙏";

export const BOOK_START_MESSAGES = [
  "Sure po 💖 Let's get you booked! Alin pong service ang gusto mo?",
  "Noted po ✨ Mag-book tayo! Anong treatment ang interesado ka?",
  "Got it po! Let me check lang ha — anong service ang gusto mo i-book?",
  "Sige sige 😊 Anong service ang gusto mo?",
];

export const SERVICES_QUICK_REPLIES = [
  { title: "Facials", payload: "SVC_FACIAL" },
  { title: "Microneedling", payload: "SVC_MICRO" },
  { title: "Laser", payload: "SVC_LASER" },
  { title: "Hair Removal", payload: "SVC_HAIR" },
  { title: "HIFU / Tightening", payload: "SVC_HIFU" },
  { title: "Slimming", payload: "SVC_SLIM" },
  { title: "IV Drip", payload: "SVC_DRIP" },
  { title: "Warts Removal", payload: "SVC_WARTS" },
];

export const PAYLOAD_TO_SERVICE: Record<string, string> = {
  SVC_FACIAL: "Facial",
  SVC_MICRO: "Microneedling",
  SVC_LASER: "Laser",
  SVC_HAIR: "Hair Removal",
  SVC_HIFU: "HIFU / Skin Tightening",
  SVC_SLIM: "Slimming / Fat Dissolve",
  SVC_DRIP: "IV Drip",
  SVC_WARTS: "Warts Removal",
};

export const DATE_PROMPTS = [
  "Ayos po yun! 🗓️ Anong araw ka available? Pwede kang mag-type ng date (e.g. 'April 25', 'tomorrow', 'Saturday').",
  "Perfect choice po! 🌸 Kelan mo gustong pumunta? Type lang ang preferred date mo ha.",
  "Great po! Saan ka available na araw? Pwede i-type yung date (e.g. 'bukas', 'May 5', 'Friday').",
];

export const TIME_PROMPTS = [
  "Got it po! 🕐 Anong oras mo gusto? (e.g. '10am', '2pm', '3:30 PM')",
  "Noted po ✨ Anong preferred time mo? Pwede mula 9am hanggang 7pm.",
  "Sure! Anong oras ka available? (e.g. '11am', '4pm', 'hapon')",
];

export const NAME_PROMPTS = [
  "Let me get your details na ha 😊 Ano po ang iyong pangalan?",
  "Almost done! Ano po ang full name mo para sa reservation?",
  "Sige po! Para ma-confirm namin, ano ang pangalan mo?",
];

export const MOBILE_PROMPTS = [
  "Thanks po! 📱 Anong mobile number ang pwedeng i-contact sa iyo?",
  "Almost there! Anong number mo para mapadala namin ang confirmation?",
  "Noted po! Pwede bang ibigay ang iyong contact number? 😊",
];

export const RETRY_MESSAGES = [
  "Hmm, di ko na-gets yung sagot mo 😅 Pwede ulit? ",
  "Sorry po ha, medyo di ko maintindihan. Ulit lang? ",
  "Oops, parang may mali akong nagets 😊 Try mo ulit? ",
];

export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
