const SERVICE_KEYWORDS: Record<string, string[]> = {
  // Facials
  "Basic Facial": ["basic facial", "basic"],
  "Diamond Peel": ["diamond peel", "dp facial"],
  "HydraGlow Facial": ["hydraglow", "hydra glow", "hydrafacial", "hydra facial"],
  "Oxygeneo Facial": ["oxygeneo", "oxygen facial", "3-in-1 facial", "3 in 1 facial"],
  "Backne Facial": ["backne", "back facial", "back acne"],
  "Underarm Spa": ["underarm spa", "ua spa", "armpit spa", "kilikili spa", "underarm treatment", "ua treatment"],
  "Facial": ["facial", "face treatment", "pangmukha", "para sa mukha", "pimple", "acne facial", "glow facial", "whitening facial", "face"],

  // Microneedling
  "Korean BB Glow": ["bb glow", "korean bb", "kbb"],
  "PRP Microneedling": ["prp"],
  "AcneKléar Microneedling": ["acneklear", "acne klear", "acnekléar", "acne microneedling"],
  "Salmon DNA Microneedling": ["salmon", "salmon dna", "pdrn", "salmon dna"],
  "Stretch Marks Microneedling": ["stretch mark", "stretch marks", "stretchmarks", "unat", "unat ng balat"],
  "Microneedling": ["microneedle", "microneedling", "dermaroller", "acne scar", "pock mark", "pores", "micro needling"],

  // Laser
  "Pico Carbon Peel Laser": ["pico", "carbon peel", "carbon laser"],
  "Skin Rejuvè Laser": ["skin rejuve", "rejuvè", "skin rejuvé", "rejuve laser"],
  "Whitening Laser": ["whitening laser", "intense ua whitening", "ua whitening laser", "underarm whitening laser"],
  "Laser Hair Removal": ["laser hair", "hair removal laser", "ua hair removal", "underarm hair laser", "ua hair laser"],
  "Lips Hair Removal": ["lips hair", "upper lip", "lower lip", "balbas", "mustache removal"],
  "Laser": ["laser", "lasering"],

  // Diode hair removal
  "Diode Hair Removal": [
    "diode", "hair removal", "hair remov",
    // UA = underarm — very common abbreviation in Filipino beauty context
    "ua hair", "ua removal", "ua laser",
    "underarm hair", "kilikili hair", "armpit hair",
    "hair sa ua", "hair sa kilikili", "hair sa underarm",
    "waxing", "shaving", "tanggalin buhok", "alisin buhok",
    "buhok sa", "unwanted hair", "hair reduction",
    "leg hair", "arm hair", "bikini hair", "pubic hair",
    "full body hair", "brazilian", "hollywood wax",
  ],

  // HIFU / Skin Tightening
  "7D Ultraforma HIFU": ["7d", "ultraforma", "ultraformer", "hifu", "7d hifu", "ultra forma"],
  "Thermagic": ["thermagic", "thermage", "therma magic"],
  "ExiSlim": ["exislim", "exi slim", "exis slim", "exislim body", "exislim face"],
  "Skin Tightening": [
    "skin tightening", "tightening", "rf", "lifting", "anti aging", "anti-aging",
    "sagging", "loose skin", "face lift", "facelift", "jaw", "jawline",
    "v-shape", "vshape", "v shape", "v-line", "vline", "naka v", "makinis",
    "skin firming", "firming", "tighten", "snatched", "snatch",
  ],

  // Slimming
  "Lemon Bottle Fat Dissolve": ["lemon bottle", "lemon", "lb fat", "lemon fat"],
  "Mesolipo": ["mesolipo", "meso lipo", "meso", "mezo"],
  "Slimming": [
    "slimming", "fat dissolve", "fat dissolving", "emshape", "vline", "v-line",
    "tummy", "belly", "love handle", "bra line", "double chin", "pwayto", "payat", "slim",
    "pampapayat", "pampaputi ng tiyan", "tiyan", "fat removal", "tabain",
    "maiipon", "sobrang taba", "pampababa ng timbang",
  ],

  // IV Drips
  "Immune Booster Drip": ["immune booster", "immune drip"],
  "Premium Bella Drip": ["bella", "premium bella"],
  "VIP Celestial Drip": ["celestial", "vip celestial"],
  "Snow White Drip": ["snow white", "snow white drip"],
  "Ultimate Goddess Drip": ["goddess", "ultimate goddess"],
  "Glutathione IV Drip": [
    "glutathione", "gluta", "iv drip", "drip", "whitening drip",
    "iv", "iv therapy", "iv vitamins", "intravenous", "pampaputin",
    "skin whitening drip", "gluta drip",
  ],

  // Boosters
  "Vitamin C Booster": ["vitamin c", "vit c"],
  "B-Complex Booster": ["b-complex", "b complex"],
  "Collagen Booster": ["collagen"],
  "Placenta Booster": ["placenta"],
  "L-Carnitine Booster": ["l-carnitine", "carnitine"],

  // Warts
  "Warts Removal": ["warts", "wart", "skin tag", "skin tags", "tahi", "kulubot", "butil sa balat"],

  // Botox / Filler (kept for inquiries even if not on menu)
  "Botox / Filler": ["botox", "filler", "dermal filler"],
};

const DATE_KEYWORDS = ["today", "tomorrow", "ngayon", "bukas", "monday", "tuesday",
  "wednesday", "thursday", "friday", "saturday", "sunday",
  "lunes", "martes", "miyerkules", "huwebes", "biyernes", "sabado", "linggo"];

const GREETING_KEYWORDS = ["hello", "hi", "hey", "kumusta", "uy", "helo", "musta", "good morning", "good afternoon", "good evening", "kamusta", "sup", "howdy", "hii", "hiii"];

const BOOK_KEYWORDS = ["book", "mag-book", "appointment", "reserv", "gusto ko mag", "nais", "schedule", "i want to book", "i'd like to book", "puwede mag", "pwede mag", "set an appointment", "make an appointment"];
const SERVICES_KEYWORDS = [
  "services", "treatment", "menu", "listahan",
  "what do you offer", "what services", "what treatments",
  "ano meron", "ano ang meron", "ano ang offer", "anong meron", "anong offer",
  "magkano", "how much", "price", "presyo", "cost", "rate", "pricelist", "price list",
  "how much is", "how much does", "how much for",
  "available", "meron ba", "mayroon ba", "may kayo", "may ba kayo",
  "inquire", "inquiry", "tanong", "ask about",
  "gusto malaman", "want to know", "tell me about",
  "ano ang", "what is", "what's",
];
const PROMOS_KEYWORDS = ["promo", "discount", "sale", "offer", "deals", "mura", "special", "free", "package", "bundle", "installment"];
const STAFF_KEYWORDS = ["staff", "talk", "human", "agent", "tawo", "tao", "admin", "help", "contact", "call", "number", "address", "location", "saan kayo", "nasaan"];

// Standalone short abbreviations (≤3 chars) that need word-boundary matching
// to avoid false-positives (e.g. "ua" in "natural", "iv" in "alive")
const SHORT_ABBREV_MAP: Record<string, string> = {
  ua: "Diode Hair Removal",  // UA = underarm hair removal (most common usage)
  lb: "Lemon Bottle Fat Dissolve", // LB = Lemon Bottle
  iv: "Glutathione IV Drip",        // IV = IV drip
};

export function detectService(text: string): string | null {
  const lower = text.toLowerCase().trim();

  // First pass: check short abbreviations as whole words
  for (const [abbr, service] of Object.entries(SHORT_ABBREV_MAP)) {
    const regex = new RegExp(`\\b${abbr}\\b`, "i");
    if (regex.test(lower)) return service;
  }

  // Second pass: check all service keywords (longer phrases)
  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    for (const kw of keywords) {
      if (kw.length <= 3) {
        // Short keyword — require word boundary to avoid partial matches
        const regex = new RegExp(`\\b${kw}\\b`, "i");
        if (regex.test(lower)) return service;
      } else {
        if (lower.includes(kw)) return service;
      }
    }
  }
  return null;
}

export function detectDateKeyword(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kw of DATE_KEYWORDS) {
    if (lower.includes(kw)) return text.trim();
  }
  // Also accept date-like patterns e.g. "April 25", "25 April", "04/25"
  if (/\b\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\b/.test(lower)) return text.trim();
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}\b/i.test(text)) return text.trim();
  if (/\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b/i.test(text)) return text.trim();
  return null;
}

export function detectGreeting(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return GREETING_KEYWORDS.some((kw) => lower.startsWith(kw) || lower === kw);
}

const EXPLANATION_KEYWORDS = [
  "what is", "what's", "whats",
  "ano ang", "ano yung", "ano ung", "anong",
  "para saan", "para sa ano",
  "what does", "how does", "how do",
  "what are", "tell me about", "explain",
  "effective ba", "safe ba", "is it safe", "does it work",
  "paano", "paano gumagana", "how it works",
  "maganda ba", "ok ba", "okay ba",
  "gaano", "difference", "between",
  "what kind", "what type",
];

/** Returns true when the message is asking WHAT a service is or how it works,
 *  rather than asking for pricing or wanting to book. */
export function isExplanationQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return EXPLANATION_KEYWORDS.some((kw) => lower.includes(kw));
}

const SKIN_CONCERN_KEYWORDS = [
  "concern", "problema", "problem", "issue",
  "acne", "pimple", "pimples", "breakout", "blackhead", "whitehead",
  "dull", "pangit", "mapulahin", "pale", "tired looking",
  "whitening", "whiten", "glow", "brighten", "bright", "maputi", "magpaputi", "gusto maging maputi",
  "anti aging", "anti-aging", "aging", "wrinkle", "fine line", "sagging", "matanda", "tumatanda",
  "sensitive", "sensitive skin", "easily irritated", "irritation", "allergy skin",
  "skin type", "ano treatment", "anong treatment", "para sa skin",
];

const INJECTABLE_KEYWORDS = [
  "injectable", "injection", "inject", "gluta", "glutathione", "iv drip",
  "drip", "fat dissolve", "lemon bottle", "mesolipo", "warts",
];

export function detectIntent(text: string): "book" | "services" | "promos" | "staff" | "greeting" | "skin_concern" | "injectables" | null {
  const lower = text.toLowerCase();
  if (detectGreeting(lower)) return "greeting";
  if (STAFF_KEYWORDS.some((kw) => lower.includes(kw))) return "staff";
  if (BOOK_KEYWORDS.some((kw) => lower.includes(kw))) return "book";
  if (PROMOS_KEYWORDS.some((kw) => lower.includes(kw))) return "promos";
  if (INJECTABLE_KEYWORDS.some((kw) => lower.includes(kw))) return "injectables";
  if (SKIN_CONCERN_KEYWORDS.some((kw) => lower.includes(kw))) return "skin_concern";
  if (SERVICES_KEYWORDS.some((kw) => lower.includes(kw))) return "services";
  return null;
}

export function detectSkinConcern(text: string): string | null {
  const lower = text.toLowerCase();
  if (/acne|pimple|breakout|blackhead|whitehead|tagihawat/i.test(lower)) return "acne";
  if (/dull|mapulahin|pale|tired|dark|dark skin/i.test(lower)) return "dull";
  if (/whiten|whitening|glow|maputi|magpaputi|brighten|brightening/i.test(lower)) return "whitening";
  if (/anti.?aging|aging|wrinkle|fine line|sagging|lifting|tumatanda|matanda/i.test(lower)) return "anti_aging";
  if (/sensitive|irritat|allerg/i.test(lower)) return "sensitive";
  return null;
}
