// Varied, human-sounding responses so the bot doesn't feel repetitive

export const WELCOME_MESSAGES = [
  "Hi there! 💕 Welcome to La Julieta Beauty Parañaque! How can we help you today? 😊",
  "Hello! ✨ Thanks for reaching out to La Julieta Beauty! What can we do for you? 💖",
  "Hi! 🌸 La Julieta Beauty here. So glad you messaged us! How can we assist you?",
  "Hey! 💖 Welcome to La Julieta Beauty Parañaque. Looking for a treatment or just want some info? 😊",
  "Hi! 💕 Thanks for contacting La Julieta Beauty. I'm here to help — ask me anything! ✨",
];

export const INTENT_MENU_TEXT =
  "Here's what I can help you with — just tap one below! 😊";

export const INTENT_QUICK_REPLIES = [
  { title: "💆 Facial Treatments", payload: "INTENT_FACIALS" },
  { title: "✨ Skin Concerns", payload: "INTENT_SKIN_CONCERN" },
  { title: "💉 Injectables / Gluta", payload: "INTENT_INJECTABLES" },
  { title: "🎉 Promos", payload: "INTENT_PROMOS" },
  { title: "📅 Book Appointment", payload: "INTENT_BOOK" },
  { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
];

export const SKIN_CONCERN_QUICK_REPLIES = [
  { title: "🔴 Acne / Pimples", payload: "CONCERN_ACNE" },
  { title: "😐 Dull Skin", payload: "CONCERN_DULL" },
  { title: "✨ Whitening / Glow", payload: "CONCERN_WHITENING" },
  { title: "⏳ Anti-Aging", payload: "CONCERN_ANTIAGING" },
  { title: "🌸 Sensitive Skin", payload: "CONCERN_SENSITIVE" },
  { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
];

export const INJECTABLES_QUICK_REPLIES = [
  { title: "💧 IV Drip / Gluta", payload: "SVC_DRIP" },
  { title: "🍋 Fat Dissolve", payload: "SVC_SLIM" },
  { title: "🩹 Warts Removal", payload: "SVC_WARTS" },
  { title: "💉 Microneedling", payload: "SVC_MICRO" },
  { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
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

All treatments are done by licensed aestheticians 💖 Ready to book? 😊`;

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
  "Of course 😊 I'll notify our staff right away so they can assist you personally. Please wait for our team's reply 💖 Sandali lang ha!";

// ─── Skin Concern Messages ────────────────────────────────────────────────────

export const SKIN_CONCERN_ACNE = `🔴 Acne & Pimples

Acne happens when pores get clogged with oil, bacteria, or dead skin cells. It can affect self-confidence, but the good news — it's very treatable! ✨

✅ What may help:
• Regular facial treatments to deep-cleanse and clear pores
• AcneKléar Microneedling — targets active acne and post-acne marks
• Pico Carbon Peel Laser — deep cleanse + reduces oiliness

⚠️ Things to keep in mind:
• Results vary from person to person
• Multiple sessions are usually recommended
• Avoid popping pimples — it can worsen scarring

We recommend starting with a consultation so our licensed aestheticians can assess your skin type and suggest the best approach for you 💕`;

export const SKIN_CONCERN_DULL = `😐 Dull Skin

Dull skin happens when dead skin cells build up on the surface, making your complexion look flat and tired. Very common, and very fixable! ✨

✅ What may help:
• Diamond Peel or HydraGlow Facial — exfoliates and instantly brightens
• Oxygeneo 3-in-1 Facial — combines exfoliation, infusion, and oxygenation
• Pico Carbon Peel Laser — deep cleanse + rejuvenation in one session

💡 Lifestyle tip:
Stay hydrated and wear sunscreen daily — it makes a big difference!

Our team can help you find the right glow treatment. A consultation is a great first step 💕`;

export const SKIN_CONCERN_WHITENING = `✨ Skin Whitening & Glow

Looking for a brighter, more even skin tone? We have several options depending on your needs and skin type ✨

✅ Starting options (non-invasive):
• Brightening Facial — gentle brightening with zero downtime
• Skin Rejuvè Laser — targets dark areas like nape, elbows, underarms
• Intense UA Whitening Laser — specifically for underarm whitening

💉 For deeper brightening:
• Glutathione IV Drip — delivers antioxidants directly to the bloodstream

⚠️ Note:
Skin whitening results vary per individual. We always recommend a consultation first to make sure the right treatment is chosen for your skin.

Before recommending injectable options, may I ask a few quick safety questions? 😊`;

export const SKIN_CONCERN_ANTIAGING = `⏳ Anti-Aging & Skin Firming

Concerned about fine lines, sagging skin, or loss of facial volume? You're not alone — and there are great non-surgical options for you! ✨

✅ What may help:
• Anti-Aging Facial — hydrates and firms skin using targeted serums
• Salmon DNA Microneedling — ultra-hydrating, boosts collagen naturally
• 7D Ultraforma HIFU — lifts and tightens face, jaw, and neck non-surgically
• Thermagic RF — radiofrequency tightening for a younger-looking appearance

⚠️ Things to know:
• Non-invasive options need multiple sessions for best results
• Results are gradual, not instant
• No surgery or downtime required

We recommend a skin consultation first so we can assess your needs and suggest the best combination 💕`;

export const SKIN_CONCERN_SENSITIVE = `🌸 Sensitive Skin

Sensitive skin needs extra care and a gentler approach. Not all treatments are suitable — that's why we always recommend a consultation first before recommending anything 💕

✅ What we typically suggest:
• Basic Facial — gentle cleansing and hydration, safe for most skin types
• HydraGlow Facial — hydrating and soothing, minimal irritation
• We avoid harsh peels or high-intensity treatments until your skin is assessed

⚠️ Important:
Please let our aestheticians know about any known allergies or reactions before any treatment.

A consultation is the safest first step for sensitive skin. Our team will guide you every step of the way 🌸`;

export const SAFETY_SCREENING_INTRO = `Before we recommend injectable treatments, may I ask a few quick safety questions? This is for your wellbeing 💖 It only takes a moment.`;

export const SAFETY_QUESTIONS = [
  "Are you currently pregnant? 🤰",
  "Are you breastfeeding or currently lactating? 🍼",
  "Do you have any known allergy to injections or needles? 💉",
  "Are you currently taking any medication (prescription or otherwise)?",
  "Do you have any existing medical condition we should know about? (e.g. heart condition, diabetes, autoimmune, etc.)",
];

export const SAFETY_FAIL_MESSAGE =
  `Thank you for sharing that with us 💖 For your safety, we recommend avoiding injectable treatments for now and booking a consultation first.\n\nOur licensed aestheticians can suggest gentle, non-invasive facial options that are safe and effective for you 🌸`;

export const SAFETY_PASS_MESSAGE =
  `Great news — based on your answers, injectable treatments may be suitable for you! 😊 Here's what we offer:`;

export const YES_NO_QUICK_REPLIES = [
  { title: "✅ Yes", payload: "SCREENING_YES" },
  { title: "❌ No", payload: "SCREENING_NO" },
  { title: "👩‍⚕️ Talk to Agent", payload: "INTENT_STAFF" },
];

export const BOOK_START_MESSAGES = [
  "Great, let's get you booked! 💖 Which of our services would you like to try?",
  "Sure! I'll help you book your appointment 😊 Which treatment are you interested in?",
  "Awesome, let's set that up! Just pick a service from the options below 💕",
  "Let's book you in! 😊 Which service would you like to avail?",
  "Perfect, let's make it happen! 💕 Which service are you going for?",
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
  "When are you available? 🗓️ You can type the date — like 'tomorrow', 'Saturday', or 'April 25'.",
  "What date works best for you? 🌸 Just type it in (e.g. 'bukas' or 'April 28').",
  "When would you like to schedule your appointment? 📅 Any date is fine — even 'next Monday'.",
  "Got it! 💖 What day are you free? You can say 'tomorrow', 'Sabado', or a specific date.",
];

export const TIME_PROMPTS = [
  "What time do you prefer? 🕐 (e.g. '10am', '2pm', or 'afternoon')",
  "What time works for you? ✨ We're open 9am–7pm.",
  "What time is best for you? 😊 You can say '11am', '3pm', or even 'morning'/'hapon'.",
  "Please type your preferred time 🕐 (e.g. '1pm', '4:30pm', or 'morning')",
];

export const NAME_PROMPTS = [
  "Could you share your full name for the reservation? 💖",
  "What's your name? 😊",
  "To confirm your booking — what's your full name?",
  "Please type your full name so we can finalize your slot 💕",
];

export const MOBILE_PROMPTS = [
  "Thanks! 📱 Please share your mobile number so we can send you a confirmation.",
  "Almost done! 😊 What's your mobile number? We'll use it to send reminders.",
  "Last step — please share your mobile number 💖 (e.g. 09171234567)",
  "What's your contact number? 📲 We'll use it for your booking confirmation.",
];

export const RETRY_MESSAGES = [
  "Hmm, I didn't quite catch that 😅 Could you try again? ",
  "Sorry about that! I couldn't understand. Pwede ulit? 🙏 ",
  "Oops, let me try that again 😊 — ",
  "I'm not sure what you mean 😅 Could you rephrase that? ",
];

export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Service Descriptions ─────────────────────────────────────────────────────
// Sent when a customer asks "what is X" or "para saan ang X"

export const SERVICE_DESCRIPTIONS: Record<string, string> = {
  facials: `💆 𝗙𝗔𝗖𝗜𝗔𝗟𝗦 — What it does

Our facial treatments deeply cleanse, exfoliate, and hydrate your skin. Great for:
✔️ Removing dead skin cells and unclogging pores
✔️ Reducing pimples, blackheads, and oily skin
✔️ Brightening and evening out skin tone
✔️ Giving your face that fresh, glowing look

Popular choices:
• 𝗗𝗶𝗮𝗺𝗼𝗻𝗱 𝗣𝗲𝗲𝗹 — exfoliates and polishes skin using a diamond-tipped wand
• 𝗛𝘆𝗱𝗿𝗮𝗚𝗹𝗼𝘄 — deeply hydrates with serums infused into the skin
• 𝗢𝘅𝘆𝗴𝗲𝗻𝗲𝗼 — combines exfoliation, infusion, and oxygenation in one session
• 𝗕𝗮𝗰𝗸𝗻𝗲 𝗙𝗮𝗰𝗶𝗮𝗹 — targets back acne and body breakouts

All done by licensed aestheticians 💖`,

  microneedling: `💉 𝗠𝗜𝗖𝗥𝗢𝗡𝗘𝗘𝗗𝗟𝗜𝗡𝗚 — What it does

Microneedling uses tiny needles to create micro-channels in the skin, triggering your body's natural collagen production. Great for:
✔️ Fading acne scars and dark spots
✔️ Minimizing pores
✔️ Smoothing out uneven skin texture
✔️ Anti-aging and skin rejuvenation

Popular choices:
• 𝗞𝗼𝗿𝗲𝗮𝗻 𝗕𝗕 𝗚𝗹𝗼𝘄 — gives instant brightening and glass-skin effect
• 𝗣𝗥𝗣 — uses your own blood plasma for deeper skin renewal
• 𝗦𝗮𝗹𝗺𝗼𝗻 𝗗𝗡𝗔 — ultra-hydrating, great for dull and aging skin
• 𝗔𝗰𝗻𝗲𝗞𝗹𝗲𝗮𝗿 — specifically targets active acne and post-acne marks

Results improve over 2–4 weeks as collagen builds up 💖`,

  laser: `🔥 𝗟𝗔𝗦𝗘𝗥 𝗧𝗿𝗲𝗮𝘁𝗺𝗲𝗻𝘁𝘀 — What it does

Our laser treatments use focused light energy to target specific skin concerns. Great for:
✔️ Whitening underarms, elbows, knees, and nape
✔️ Removing unwanted hair permanently
✔️ Evening out skin tone and reducing pigmentation
✔️ Deep skin rejuvenation and pore tightening

Popular choices:
• 𝗣𝗶𝗰𝗼 𝗖𝗮𝗿𝗯𝗼𝗻 𝗣𝗲𝗲𝗹 — deep cleanse + brightening, great for oily skin
• 𝗦𝗸𝗶𝗻 𝗥𝗲𝗷𝘂𝘃𝗲̀ — targets dark areas like nape, elbows, and knees
• 𝗜𝗻𝘁𝗲𝗻𝘀𝗲 𝗨𝗔 𝗪𝗵𝗶𝘁𝗲𝗻𝗶𝗻𝗴 — brightens underarm area

Safe and quick sessions, usually 20–30 minutes 💖`,

  hair_removal: `✨ 𝗗𝗜𝗢𝗗𝗘 𝗛𝗔𝗜𝗥 𝗥𝗘𝗠𝗢𝗩𝗔𝗟 — What it does

Diode laser hair removal permanently reduces unwanted hair by targeting hair follicles with laser energy. Great for:
✔️ Long-lasting smooth skin without shaving/waxing
✔️ Any body area — legs, arms, underarms, bikini, face
✔️ Reducing ingrown hairs
✔️ Finer, lighter hair regrowth over sessions

Sessions are quick and virtually painless. Multiple sessions recommended for best results 💖`,

  hifu: `🎯 𝗦𝗸𝗶𝗻 𝗧𝗶𝗴𝗵𝘁𝗲𝗻𝗶𝗻𝗴 / 𝗛𝗜𝗙𝗨 — What it does

HIFU (High-Intensity Focused Ultrasound) and skin tightening treatments lift and firm the skin non-surgically. Great for:
✔️ Lifting sagging cheeks, jawline, and neck
✔️ Reducing double chin
✔️ Tightening loose skin on the tummy, arms, and thighs
✔️ Anti-aging without surgery or downtime

Our options:
• 𝟳𝗗 𝗨𝗹𝘁𝗿𝗮𝗳𝗼𝗿𝗺𝗮 — the gold standard HIFU, visible lifting after 1 session
• 𝗧𝗵𝗲𝗿𝗺𝗮𝗴𝗶𝗰 — uses radiofrequency for tighter, younger-looking skin
• 𝗘𝘅𝗶𝗦𝗹𝗶𝗺 — slims and contours face and body

Results last 6–12 months. No downtime needed 💖`,

  slimming: `🍋 𝗦𝗟𝗜𝗠𝗠𝗜𝗡𝗚 / 𝗙𝗔𝗧 𝗗𝗜𝗦𝘀𝗢𝗟𝗩𝗘 — What it does

Our slimming treatments break down stubborn fat cells in targeted areas without surgery. Great for:
✔️ Reducing double chin, arm fat, tummy, love handles, and bra bulge
✔️ Contouring and sculpting your body shape
✔️ Achieving a slimmer, snatched look

Our options:
• 𝗟𝗲𝗺𝗼𝗻 𝗕𝗼𝘁𝘁𝗹𝗲 — fat-dissolving injection that melts stubborn fat fast
• 𝗠𝗲𝘀𝗼𝗹𝗶𝗽𝗼 — cocktail of fat-dissolving agents for precise contouring

No surgery, no downtime. Results are visible within 2–4 weeks 💖`,

  iv_drip: `💧 𝗜𝗩 𝗗𝗥𝗜𝗣𝗦 — What it does

IV Drips deliver vitamins, antioxidants, and nutrients directly into your bloodstream for maximum absorption. Great for:
✔️ Skin whitening and brightening (Glutathione)
✔️ Boosting immunity and energy levels
✔️ Anti-aging and collagen support
✔️ Overall wellness and detox

Popular drips:
• 𝗦𝗻𝗼𝘄 𝗪𝗵𝗶𝘁𝗲 / 𝗚𝗼𝗱𝗱𝗲𝘀𝘀 — high-dose glutathione for skin whitening
• 𝗜𝗺𝗺𝘂𝗻𝗲 𝗕𝗼𝗼𝘀𝘁𝗲𝗿 — vitamins to strengthen your immune system
• 𝗕𝗲𝗹𝗹𝗮 𝗗𝗿𝗶𝗽 — skin glow + energy combo

Each session takes about 30–45 minutes. Add-ons available like Collagen, Placenta, and L-Carnitine 💖`,

  warts: `🩹 𝗪𝗔𝗥𝗧𝗦 𝗥𝗘𝗠𝗢𝗩𝗔𝗟 — What it does

Warts removal is a quick procedure that safely removes skin warts, skin tags, and small benign growths. Great for:
✔️ Removing warts on face, neck, body, or hands
✔️ Getting rid of skin tags safely
✔️ Smoother, clearer skin

The procedure is fast and minimally invasive. Healing time is usually 3–7 days 💖`,
};

export function getDescriptionForService(service: string): string | null {
  const cat = SERVICE_TO_CATEGORY[service];
  if (!cat) return null;
  return SERVICE_DESCRIPTIONS[cat] ?? null;
}

// ─── Per-category Pricelists ──────────────────────────────────────────────────
// Sent when a customer asks about a specific service or category.

export const PRICELIST_FACIALS = `💆 𝗙𝗔𝗖𝗜𝗔𝗟𝗦 — Price List (in ₱)

• Basic Facial — 299
• Diamond Peel — 499
• HydraGlow Facial — 999
• Oxygeneo 3-in-1 Facial — 1,399
• Backne Facial — 1,599
• Underarm Spa — 599

Add-ons:
• Omega PDT Led — 99
• Hydrating Sheet Mask — 99`;

export const PRICELIST_MICRONEEDLING = `💉 𝗠𝗜𝗖𝗥𝗢𝗡𝗘𝗘𝗗𝗟𝗜𝗡𝗚 — Price List (in ₱)

• Korean BB Glow — 599
• AcneKléar Microneedling — 1,099
• PRP Microneedling — 1,399
• Salmon DNA Microneedling — 1,899
• Stretch Marks Microneedling — 2,099

Add-ons:
• Korean BB Glow Tint — 199
• Whitening Stem Cell — 299
• Hyaluronic Aqua Stem Cell — 299`;

export const PRICELIST_LASER = `🔥 𝗟𝗔𝗦𝗘𝗥 — Price List (in ₱)

• Skin Rejuvè (nape/elbows/knees) — 799
• Skin Rejuvè Laser Face — 999
• Pico Carbon Peel Laser — 999
• Intense UA Whitening Laser — 899
• Intense UA Hair Removal Laser — 899
• Upper / Lower Lips Hair Removal — 599`;

export const PRICELIST_HAIR_REMOVAL = `✨ 𝗗𝗜𝗢𝗗𝗘 𝗛𝗔𝗜𝗥 𝗥𝗘𝗠𝗢𝗩𝗔𝗟 — Price List (in ₱)

• Small Area — 499
• Medium Area — 899
• Large Area — 1,299

Plus laser-based hair removal:
• Intense UA Hair Removal Laser — 899
• Upper / Lower Lips — 599`;

export const PRICELIST_HIFU = `🎯 𝗦𝗞𝗜𝗡 𝗧𝗜𝗚𝗛𝗧𝗘𝗡𝗜𝗡𝗚 / 𝗛𝗜𝗙𝗨 — Price List (in ₱)

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

export const PRICELIST_SLIMMING = `🍋 𝗦𝗟𝗜𝗠𝗠𝗜𝗡𝗚 / 𝗙𝗔𝗧 𝗗𝗜𝗦𝗦𝗢𝗟𝗩𝗘 — Price List (in ₱)

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

export const PRICELIST_IV_DRIP = `💧 𝗜𝗩 𝗗𝗥𝗜𝗣𝗦 (Glutathione & Multivitamins) — Price List (in ₱)

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

export const PRICELIST_WARTS = `🩹 𝗪𝗔𝗥𝗧𝗦 𝗥𝗘𝗠𝗢𝗩𝗔𝗟 — Price List (in ₱)

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
