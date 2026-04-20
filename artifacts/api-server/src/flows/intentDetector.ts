const SERVICE_KEYWORDS: Record<string, string[]> = {
  "HydraFacial": ["hydrafacial", "hydra facial", "hydra"],
  "Laser Hair Removal": ["laser", "hair removal", "laser hair"],
  "Chemical Peel": ["chemical peel", "peel", "exfoliation"],
  "Facial Treatment": ["facial", "face treatment", "facial treatment", "basic facial"],
  "RF Skin Tightening": ["rf", "skin tightening", "radiofrequency", "tightening"],
  "Microneedling": ["microneedle", "microneedling", "dermaroller"],
  "Botox / Filler": ["botox", "filler", "injection", "anti-aging", "anti aging"],
  "Whitening Drip": ["whitening drip", "glutathione", "drip", "iv drip"],
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
