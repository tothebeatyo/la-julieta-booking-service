import { logger } from "../lib/logger";

const TELEGRAM_BOT_TOKEN = process.env["TELEGRAM_NOTIFY_BOT_TOKEN"] ?? "";
const TELEGRAM_CHAT_ID = process.env["TELEGRAM_NOTIFY_CHAT_ID"] ?? "";

export async function notifyBooking(details: {
  name: string;
  service: string;
  date: string;
  time: string;
  status: "success" | "failed";
  psid: string;
}): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const emoji = details.status === "success" ? "✅" : "⚠️";
  const statusText =
    details.status === "success"
      ? "Auto-booked on AnyPlusPro ✅"
      : "FAILED — Manual booking required ⚠️";

  const message = `
${emoji} *La Julieta Booking Alert*

👤 *Client:* ${details.name}
💆 *Service:* ${details.service}
📅 *Date:* ${details.date}
🕐 *Time:* ${details.time}
📋 *Status:* ${statusText}
🔗 https://www.lajulieta.anypluspro.com
  `.trim();

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    logger.error({ err }, "Telegram notification failed");
  }
}
