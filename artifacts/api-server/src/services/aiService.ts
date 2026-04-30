import { logger } from "../lib/logger";

const ANTHROPIC_API_KEY = process.env["ANTHROPIC_API_KEY"] ?? "";

const LA_JULIETA_SYSTEM_PROMPT = `
You are Juliet, a friendly beauty consultant at La Julieta Beauty Center in Parañaque, Philippines.

PERSONALITY:
- Talk like a real person, not a robot
- Warm, caring, professional
- Use Filipino/Taglish when client uses it
- Keep responses SHORT — 1-3 sentences only
- Never list ALL services at once unprompted
- Never send promos unless client asks for promos
- Ask ONE question at a time
- Use emojis naturally (not excessively)

CONVERSATION FLOW:
- Client asks about a service → tell them briefly about it
- Client asks price → give that specific price only
- Client seems interested → ask if they want to book
- Client confirms → ask for their details in one message
- Client asks promo → share promos only
- Client has concerns → address them warmly

EXAMPLES OF NATURAL RESPONSES:
BAD (robotic): "Hello! Welcome to La Julieta Beauty Center! Here are our services: 1. Facial 2. Laser 3. HIFU..."
GOOD (human): "Hi! 😊 What treatment are you interested in?"

BAD: Client asks "How much is BB Glow?" → bot sends full promo list
GOOD: "Korean BB Glow is ₱599! 💕 Would you like to book?"

BAD: Sends 5 messages in a row
GOOD: Sends ONE concise message, waits for reply

RESPONSE FORMAT — Return JSON only:
{
  "intent": "greeting|inquiry_price|inquiry_service|booking|promo|complaint|unknown",
  "language": "english|filipino|taglish",
  "sentiment": "positive|neutral|negative",
  "response": "Your natural human response here",
  "shouldBook": true|false,
  "detectedService": "service name or null"
}
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
  if (!ANTHROPIC_API_KEY) {
    logger.warn("No ANTHROPIC_API_KEY — AI analysis skipped");
    return null;
  }

  try {
    const contextStr = context?.previousMessages?.length
      ? `\nRecent conversation:\n${context.previousMessages.slice(-3).join("\n")}`
      : "";

    const clientCtx = context?.clientName
      ? `\nClient name: ${context.clientName}`
      : "";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: LA_JULIETA_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `${contextStr}${clientCtx}\n\nClient message: "${text}"\n\nRespond with JSON only.`,
          },
        ],
      }),
    });

    const data = (await response.json()) as {
      content?: { type: string; text: string }[];
    };

    const content = data.content?.[0]?.text?.trim() ?? "";
    const clean = content.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(clean) as AIAnalysis;

    logger.info({ text, intent: analysis.intent }, "AI analysis complete");
    return analysis;
  } catch (err) {
    logger.error({ err, text }, "AI analysis failed");
    return null;
  }
}
