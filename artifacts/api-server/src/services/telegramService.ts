import { logger } from "../lib/logger";

export async function sendTelegramAlert(message: string): Promise<void> {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_ADMIN_CHAT_ID"];

  if (!token || !chatId) {
    logger.warn("Telegram credentials not set — skipping alert");
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.warn({ status: res.status, body }, "Telegram API error");
    } else {
      logger.info("Telegram alert sent successfully");
    }
  } catch (err) {
    logger.error({ err }, "Failed to send Telegram alert");
  }
}
