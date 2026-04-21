// Varied, human-sounding responses so the bot doesn't feel repetitive

export const WELCOME_MESSAGES = [
  "Hiii bes! 💕 Welcome sa La Julieta Beauty Parañaque! Kamusta ka? Anong maipagagawa namin para sayo today? 😊",
  "Helloo po! ✨ Salamat sa pag-message sa amin! Ano po kaya ang gusto mong i-try? 💖",
  "Hi sis! 🌸 La Julieta Beauty here po. Glad super na nag-message ka! Paano kita matutulungan?",
  "Hiii ate! 💖 Welcome sa La Julieta Beauty Parañaque. Ano po ba kailangan mo, treatment ba o info lang muna? 😊",
  "Yieee, hii! 💕 Salamat sa pag-reach out sa La Julieta Beauty! Kausap mo ako, sagot ko lahat ng tanong mo ✨",
];

export const INTENT_MENU_TEXT =
  "Eto po, pumili lang sa baba ha — para mas mabilis 😊 Ano kaya ang kailangan mo?";

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
  "Sige po, kakausapin ka ng staff namin agad 💖 Sandali lang ha, may sasagot na sa iyo in a few minutes. Salamat sa patience mo! 🙏";

export const BOOK_START_MESSAGES = [
  "Yieee, mag-book tayo! 💖 Alin po sa services namin ang gusto mong i-try?",
  "Sige po, andito ako para tulungan ka 😊 Anong treatment kaya gusto mo?",
  "Okay sis, let's go! ✨ Pumili ka muna sa baba ha — alin gusto mo?",
  "Sure po! Mag-book na tayo 💕 Anong service interesado ka?",
  "Noted bes, i-book na natin agad 😊 Anong gusto mo i-avail?",
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
  "Yieee, exciting! 🗓️ Kelan ka kaya available? Type mo lang yung date — pwede 'bukas', 'Saturday', or 'April 25' ha.",
  "Sige po! 🌸 Anong araw mo gustong pumunta? Pwede mo i-type yung petsa, like 'bukas' o 'April 28'.",
  "Okay sis! 📅 Kelan kaya gusto mong i-schedule? Type lang yung araw — kahit 'next Monday' lang ok na.",
  "Got it bes! 💖 Saang araw ka free? Pwede 'tomorrow', 'Sabado', o specific date.",
];

export const TIME_PROMPTS = [
  "Aliw, naka-set na yung araw! 🕐 Anong oras mo gusto? (e.g. '10am', '2pm', or 'hapon' lang)",
  "Noted po ✨ Anong time kaya gusto mo? Open kami 9am–7pm. Type mo lang yung preferred time mo!",
  "Sige po, last na detalye 😊 Anong oras best for you? '11am', '3pm', kahit 'umaga' or 'tanghali' ok lang.",
  "Yies! 🕐 Pakitype lang anong oras gusto mo, ate. (Halimbawa: '1pm', '4:30pm', 'morning')",
];

export const NAME_PROMPTS = [
  "Aliw 💖 Last na po, ano kaya pangalan mo para malagay sa reservation?",
  "Yay almost done! 😊 Ano pa ngang pangalan mo, ate?",
  "Sige po, para ma-confirm ko booking mo — anong pangalan mo?",
  "Bes, last details na lang! 💕 Ano nga ulit yung name mo? (full name pls 🙏)",
];

export const MOBILE_PROMPTS = [
  "Salamat po! 📱 Anong number kaya pwede ka ma-contact? Para we can text you reminders!",
  "Almost there ate! 😊 Anong mobile mo? Para mapadalhan ka namin ng confirmation later.",
  "Yies last na talaga! 💖 Pakishare lang yung mobile number mo (e.g. 09171234567).",
  "Sige po, mobile number na lang kelangan namin 📲 Ano kaya yun?",
];

export const RETRY_MESSAGES = [
  "Hala, di ko na-gets yung sagot mo 😅 Ulit lang please ha? ",
  "Sorry bes, medyo di ko maintindihan eh. Pwede ulit? 🙏 ",
  "Oops, may bago akong type-an 😊 I-try mo ulit ha — ",
  "Hmm di ko po sure kung anong ibig sabihin 😅 Pwede mo ulit-an? ",
];

export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Per-category Pricelists ──────────────────────────────────────────────────
// Sent when a customer asks about a specific service or category.

export const PRICELIST_FACIALS = `💆 𝗙𝗔𝗖𝗜𝗔𝗟𝗦 — Pricelist po (in ₱)

• Basic Facial — 299
• Diamond Peel — 499
• HydraGlow Facial — 999
• Oxygeneo 3-in-1 Facial — 1,399
• Backne Facial — 1,599
• Underarm Spa — 599

Add-ons:
• Omega PDT Led — 99
• Hydrating Sheet Mask — 99`;

export const PRICELIST_MICRONEEDLING = `💉 𝗠𝗜𝗖𝗥𝗢𝗡𝗘𝗘𝗗𝗟𝗜𝗡𝗚 — Pricelist po (in ₱)

• Korean BB Glow — 599
• AcneKléar Microneedling — 1,099
• PRP Microneedling — 1,399
• Salmon DNA Microneedling — 1,899
• Stretch Marks Microneedling — 2,099

Add-ons:
• Korean BB Glow Tint — 199
• Whitening Stem Cell — 299
• Hyaluronic Aqua Stem Cell — 299`;

export const PRICELIST_LASER = `🔥 𝗟𝗔𝗦𝗘𝗥 — Pricelist po (in ₱)

• Skin Rejuvè (nape/elbows/knees) — 799
• Skin Rejuvè Laser Face — 999
• Pico Carbon Peel Laser — 999
• Intense UA Whitening Laser — 899
• Intense UA Hair Removal Laser — 899
• Upper / Lower Lips Hair Removal — 599`;

export const PRICELIST_HAIR_REMOVAL = `✨ 𝗗𝗜𝗢𝗗𝗘 𝗛𝗔𝗜𝗥 𝗥𝗘𝗠𝗢𝗩𝗔𝗟 — Pricelist po (in ₱)

• Small Area — 499
• Medium Area — 899
• Large Area — 1,299

Plus laser-based hair removal:
• Intense UA Hair Removal Laser — 899
• Upper / Lower Lips — 599`;

export const PRICELIST_HIFU = `🎯 𝗦𝗞𝗜𝗡 𝗧𝗜𝗚𝗛𝗧𝗘𝗡𝗜𝗡𝗚 / 𝗛𝗜𝗙𝗨 — Pricelist po (in ₱)

7D Ultraforma (HIFU):
• Cheeks & Jaw — 1,799
• Double Chin & Neck — 1,799
• Full Face — 2,499
• Full Face + Double Chin + Neck — 2,999
• Tummy / Love Handle — 2,999
• Arms / Thighs — 3,999

Thermagic:
• Eyes (100 shots) — 4,999
• Forehead (150) — 3,099
• Cheeks & Chin (400) — 6,999
• Double Chin & Neck (400) — 6,999
• Full Face (600) — 8,999
• Full Face & Neck (900) — 12,999
• Additional shot (50) — 600

ExiSlim:
• Cheeks & Jaw — 699
• Double Chin & Neck — 699
• Full Face — 1,499
• Full Face & Neck — 1,899
• Tummy — 2,499
• Arms / Thighs — 1,899
• Full Back — 2,999`;

export const PRICELIST_SLIMMING = `🍋 𝗦𝗟𝗜𝗠𝗠𝗜𝗡𝗚 / 𝗙𝗔𝗧 𝗗𝗜𝗦𝗦𝗢𝗟𝗩𝗘 — Pricelist po (in ₱)

Lemon Bottle:
• Cheeks & Jaw — 2,099
• Double Chin — 2,099
• Bra Line — 3,099
• Love Handle — 3,099
• Arms / Thighs / Tummy — 3,999

Mesolipo:
• Cheeks & Jaw — 1,099
• Double Chin — 1,099
• Arms / Bra Line / Thighs — 2,099
• Tummy / Love Handle — 2,499`;

export const PRICELIST_IV_DRIP = `💧 𝗜𝗩 𝗗𝗥𝗜𝗣𝗦 (Glutathione & Multivitamins) — Pricelist po (in ₱)

Per session:
• Immune Booster — 499
• Premium Bella Drip — 699
• VIP Celestial Drip — 999
• Snow White Drip — 1,299
• Ultimate Goddess Drip — 1,199
• Ultimate Snow White Drip — 1,599

Add-on Boosters:
• Vitamin C — 199
• B-Complex — 299
• Collagen — 399
• Placenta — 499
• L-Carnitine — 599`;

export const PRICELIST_WARTS = `🩹 𝗪𝗔𝗥𝗧𝗦 𝗥𝗘𝗠𝗢𝗩𝗔𝗟 — Pricelist po (in ₱)

• Mild — 599
• Moderate — 799
• Severe — 999`;

// Maps a detected service name to its category bucket
export const SERVICE_TO_CATEGORY: Record<string, string> = {
  // Facials
  "Basic Facial": "facials",
  "Diamond Peel": "facials",
  "HydraGlow Facial": "facials",
  "Oxygeneo Facial": "facials",
  "Backne Facial": "facials",
  "Underarm Spa": "facials",
  "Facial": "facials",
  // Microneedling
  "Korean BB Glow": "microneedling",
  "PRP Microneedling": "microneedling",
  "AcneKléar Microneedling": "microneedling",
  "Salmon DNA Microneedling": "microneedling",
  "Stretch Marks Microneedling": "microneedling",
  "Microneedling": "microneedling",
  // Laser
  "Pico Carbon Peel Laser": "laser",
  "Skin Rejuvè Laser": "laser",
  "Whitening Laser": "laser",
  "Lips Hair Removal": "laser",
  "Laser": "laser",
  // Hair removal
  "Diode Hair Removal": "hair_removal",
  "Hair Removal": "hair_removal",
  "Laser Hair Removal": "hair_removal",
  // HIFU / Tightening
  "7D Ultraforma HIFU": "hifu",
  "Thermagic": "hifu",
  "ExiSlim": "hifu",
  "Skin Tightening": "hifu",
  "HIFU / Skin Tightening": "hifu",
  // Slimming
  "Lemon Bottle Fat Dissolve": "slimming",
  "Mesolipo": "slimming",
  "Slimming": "slimming",
  "Slimming / Fat Dissolve": "slimming",
  // IV Drip
  "Immune Booster Drip": "iv_drip",
  "Premium Bella Drip": "iv_drip",
  "VIP Celestial Drip": "iv_drip",
  "Snow White Drip": "iv_drip",
  "Ultimate Goddess Drip": "iv_drip",
  "Glutathione IV Drip": "iv_drip",
  "IV Drip": "iv_drip",
  "Vitamin C Booster": "iv_drip",
  "B-Complex Booster": "iv_drip",
  "Collagen Booster": "iv_drip",
  "Placenta Booster": "iv_drip",
  "L-Carnitine Booster": "iv_drip",
  // Warts
  "Warts Removal": "warts",
};

export const CATEGORY_TO_PRICELIST: Record<string, string> = {
  facials: PRICELIST_FACIALS,
  microneedling: PRICELIST_MICRONEEDLING,
  laser: PRICELIST_LASER,
  hair_removal: PRICELIST_HAIR_REMOVAL,
  hifu: PRICELIST_HIFU,
  slimming: PRICELIST_SLIMMING,
  iv_drip: PRICELIST_IV_DRIP,
  warts: PRICELIST_WARTS,
};

// ACTIVE_PROMOS indices that match each category:
// 0 = Free Facial Fridays
// 1 = Summer Glow HIFU Avail 4 Get 1
// 2 = IV Gluta Drip 10+4 FREE
// 3 = Summer Promo 4.4 (Diamond Peel/Oxygeneo/PRP/Slimming)
// 4 = Lemon Bottle Fat Dissolving
export const CATEGORY_TO_PROMO_INDICES: Record<string, number[]> = {
  facials: [0, 3],
  microneedling: [0, 3],
  laser: [3],
  hair_removal: [],
  hifu: [0, 1, 3],
  slimming: [3, 4],
  iv_drip: [2],
  warts: [],
};

export function getPricelistForService(service: string): string | null {
  const cat = SERVICE_TO_CATEGORY[service];
  if (!cat) return null;
  return CATEGORY_TO_PRICELIST[cat] ?? null;
}

export function getPromosForService(service: string): string[] {
  const cat = SERVICE_TO_CATEGORY[service];
  if (!cat) return [];
  const indices = CATEGORY_TO_PROMO_INDICES[cat] ?? [];
  return indices.map((i) => ACTIVE_PROMOS[i]).filter(Boolean);
}
