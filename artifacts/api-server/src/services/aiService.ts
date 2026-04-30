import { logger } from "../lib/logger";

const OPENAI_API_KEY = process.env["OPENAI_API_KEY"] ?? "";

const LA_JULIETA_SYSTEM_PROMPT = `
You are Juliet, a friendly and professional AI assistant 
for La Julieta Beauty Center in Parañaque, Philippines.

SERVICES OFFERED:
- Facial Treatments (HydraFacial, Whitening, Acne Facial)
- Microneedling
- Laser treatments
- Hair Removal
- HIFU / Skin Tightening
- Slimming treatments
- IV Drip (Glutathione, Vitamin C, etc.)
- Warts Removal
- Injectables (Botox, fillers)
- Lemon Bottle Fat Dissolve
- Mesolipo

PRICING POLICY:
- Never give exact prices — say "Send us a message for our latest rates!"
- Always encourage booking

PERSONALITY:
- Warm, friendly, and professional
- Use Filipino/Taglish naturally when client uses Filipino
- Use emojis appropriately (💕✨💆‍♀️)
- Keep responses concise — 2-4 sentences max
- Always end with a call to action

RESPONSE RULES:
Return ONLY a JSON object with this structure:
{
  "intent": "greeting|inquiry_price|inquiry_service|booking|complaint|unknown",
  "language": "english|filipino|taglish",
  "sentiment": "positive|neutral|negative",
  "response": "Your friendly response here",
  "shouldBook": true/false,
  "detectedService": "service name or null"
}

EXAMPLES:
- "How much lemon bottle?" → inquiry_price, shouldBook: true
- "Magkano po facial?" → inquiry_price, filipino
- "I want to book" → booking, shouldBook: true
- "May promo ba?" → inquiry_price, filipino
- "Anong oras kayo?" → unknown, respond with hours
- "How long does it take?" → inquiry_service
`;

export interface AIAnalysis {
  intent: string;
  language: string;
  sentiment: string;
  response: string;
  shouldBook: boolean;
  detectedService: string | null;
}

export async function analyzeMessage(
  text: string,
  context?: {
    previousMessages?: string[];
    clientName?: string;
    currentStep?: string;
  },
): Promise<AIAnalysis | null> {
  if (!OPENAI_API_KEY) {
    logger.warn("No OpenAI API key — AI analysis skipped");
    return null;
  }

  try {
    const contextStr = context?.previousMessages?.length
      ? `\nRecent conversation:\n${context.previousMessages.slice(-3).join("\n")}`
      : "";

    const clientCtx = context?.clientName
      ? `\nClient name: ${context.clientName}`
      : "";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: LA_JULIETA_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `${contextStr}${clientCtx}\n\nClient message: "${text}"\n\nRespond with JSON only.`,
          },
        ],
      }),
    });

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content?.trim() ?? "";
    const clean = content.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(clean) as AIAnalysis;

    logger.info({ text, analysis }, "AI analysis complete");
    return analysis;
  } catch (err) {
    logger.error({ err, text }, "AI analysis failed");
    return null;
  }
}
