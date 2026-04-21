const SERVICE_KEYWORDS: Record<string, string[]> = {
  // Facials
  "Basic Facial": ["basic facial"],
  "Diamond Peel": ["diamond peel"],
  "HydraGlow Facial": ["hydraglow", "hydra glow", "hydrafacial", "hydra facial"],
  "Oxygeneo Facial": ["oxygeneo", "oxygen facial", "3-in-1 facial", "3 in 1 facial"],
  "Backne Facial": ["backne", "back facial"],
  "Underarm Spa": ["underarm spa", "underarm", "kilikili"],
  "Facial": ["facial", "face treatment"],

  // Microneedling
  "Korean BB Glow": ["bb glow", "korean bb"],
  "PRP Microneedling": ["prp"],
  "AcneKléar Microneedling": ["acneklear", "acne klear", "acnekléar", "acne microneedling"],
  "Salmon DNA Microneedling": ["salmon", "salmon dna", "pdrn"],
  "Stretch Marks Microneedling": ["stretch mark", "stretch marks"],
  "Microneedling": ["microneedle", "microneedling", "dermaroller"],

  // Laser
  "Pico Carbon Peel Laser": ["pico", "carbon peel", "carbon laser"],
  "Skin Rejuvè Laser": ["skin rejuve", "rejuvè", "skin rejuvé", "rejuve laser"],
  "Whitening Laser": ["whitening laser", "intense ua whitening"],
  "Laser Hair Removal": ["laser hair", "hair removal laser", "ua hair removal"],
  "Lips Hair Removal": ["lips hair", "upper lip", "lower lip"],
  "Laser": ["laser"],

  // Diode hair removal
  "Diode Hair Removal": ["diode", "hair removal"],

  // HIFU / Skin Tightening
  "7D Ultraforma HIFU": ["7d", "ultraforma", "ultraformer", "hifu"],
  "Thermagic": ["thermagic", "thermage"],
  "ExiSlim": ["exislim", "exi slim"],
  "Skin Tightening": ["skin tightening", "tightening", "rf", "lifting"],

  // Slimming
  "Lemon Bottle Fat Dissolve": ["lemon bottle", "lemon"],
  "Mesolipo": ["mesolipo", "meso lipo", "meso"],
  "Slimming": ["slimming", "fat dissolve", "fat dissolving", "emshape", "vline", "v-line"],

  // IV Drips
  "Immune Booster Drip": ["immune booster", "immune drip"],
  "Premium Bella Drip": ["bella", "premium bella"],
  "VIP Celestial Drip": ["celestial", "vip celestial"],
  "Snow White Drip": ["snow white"],
  "Ultimate Goddess Drip": ["goddess", "ultimate goddess"],
  "Glutathione IV Drip": ["glutathione", "gluta", "iv drip", "drip", "whitening drip"],

  // Boosters
  "Vitamin C Booster": ["vitamin c", "vit c"],
  "B-Complex Booster": ["b-complex", "b complex"],
  "Collagen Booster": ["collagen"],
  "Placenta Booster": ["placenta"],
  "L-Carnitine Booster": ["l-carnitine", "carnitine"],

  // Warts
  "Warts Removal": ["warts", "wart"],

  // Botox / Filler (kept for inquiries even if not on menu)
  "Botox / Filler": ["botox", "filler"],
};

const DATE_KEYWORDS = ["today", "tomorrow", "ngayon", "bukas", "monday", "tuesday",
  "wednesday", "thursday", "friday", "saturday", "sunday",
  "lunes", "martes", "miyerkules", "huwebes", "biyernes", "sabado", "linggo"];

const GREETING_KEYWORDS = ["hello", "hi", "hey", "kumusta", "uy", "helo", "musta", "good morning", "good afternoon", "good evening"];

const BOOK_KEYWORDS = ["book", "mag-book", "appointment", "reserv", "gusto", "nais", "tulad", "schedule"];
const SERVICES_KEYWORDS = ["services", "treatment", "menu", "ano", "saan", "listahan", "what"];
const PROMOS_KEYWORDS = ["promo", "discount", "sale", "offer", "deals", "mura", "special"];
const STAFF_KEYWORDS = ["staff", "talk", "human", "agent", "tawo", "tao", "admin", "help"];

export function detectService(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return service;
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

export function detectIntent(text: string): "book" | "services" | "promos" | "staff" | "greeting" | null {
  const lower = text.toLowerCase();
  if (detectGreeting(lower)) return "greeting";
  if (STAFF_KEYWORDS.some((kw) => lower.includes(kw))) return "staff";
  if (BOOK_KEYWORDS.some((kw) => lower.includes(kw))) return "book";
  if (PROMOS_KEYWORDS.some((kw) => lower.includes(kw))) return "promos";
  if (SERVICES_KEYWORDS.some((kw) => lower.includes(kw))) return "services";
  return null;
}
