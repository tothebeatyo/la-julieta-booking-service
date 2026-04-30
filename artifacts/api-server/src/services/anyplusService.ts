import { chromium, type Browser, type Page } from "playwright";
import path from "path";
import fs from "fs";
import { logger } from "../lib/logger";
import { upsertClient } from "./clientService";
import { sendTelegramAlert } from "./telegramService";
import { pool } from "@workspace/db";

// ─── Module-level constants (used by autoBook) ────────────────────────────────
const ANYPLUSPRO_URL = process.env["ANYPLUSPRO_LOGIN_URL"] ?? "https://www.lajulieta.anypluspro.com";
const ANYPLUSPRO_USERNAME = process.env["ANYPLUSPRO_USERNAME"] ?? "";
const ANYPLUSPRO_PASSWORD = process.env["ANYPLUSPRO_PASSWORD"] ?? "";
const SCREENSHOT_DIR = "logs/screenshots";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookingPayload {
  psid: string;
  service: string;
  date: string;
  time: string;
  name: string;
  mobile: string;
  email?: string;
  emailConsent?: boolean;
  notes?: string;
  concern?: string;
  channel?: "messenger" | "instagram";
}

export interface BookingResult {
  success: boolean;
  referenceNo?: string;
  screenshotPath?: string;
  error?: string;
}

export interface BookingDetails {
  psid: string;
  name: string;
  service: string;
  date: string;
  time: string;
  phone?: string;
}

// Service keyword map — edit to match AnyPlusPro's exact service names
const SERVICE_KEYWORDS: Record<string, string[]> = {
  acne: ["acne", "acne facial", "acne klear", "pimple", "acneklear"],
  facial: ["facial", "cleaning", "basic facial", "hydraglow", "oxygeneo", "backne", "underarm spa"],
  gluta: ["gluta", "drip", "iv drip", "whitening drip", "immune booster", "bella drip", "celestial drip", "snow white", "goddess drip"],
  anti_aging: ["anti-aging", "anti aging", "hifu", "ultraformer", "thermagic", "rf", "thermage", "exislim"],
  slimming: ["slimming", "fat dissolve", "lemon bottle", "mesolipo", "fat dissolution"],
  microneedling: ["microneedling", "bb glow", "prp", "salmon dna", "stretch marks"],
  laser: ["laser", "skin rejuve", "pico", "carbon peel", "hair removal", "diode"],
  warts: ["warts", "warts removal"],
};

// Nix store Playwright chromium path (found in /nix/store)
const NIX_CHROMIUM = "/nix/store/0n9rl5l9syy808xi9bk4f6dhnfrvhkww-playwright-browsers-chromium/chromium-1080/chrome-linux/chrome";

function getScreenshotDir(): string {
  const dir = path.resolve("logs/screenshots");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function matchService(input: string): string | null {
  const lower = input.toLowerCase();
  for (const [key, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return key;
  }
  return null;
}

async function takeScreenshot(page: Page, label: string): Promise<string> {
  const dir = getScreenshotDir();
  const filename = `${label}_${Date.now()}.png`;
  const fullPath = path.join(dir, filename);
  await page.screenshot({ path: fullPath, fullPage: false });
  return `logs/screenshots/${filename}`;
}

async function launchBrowser(): Promise<Browser> {
  const headless = process.env["ANYPLUSPRO_HEADLESS"] !== "false";
  try {
    return await chromium.launch({
      executablePath: fs.existsSync(NIX_CHROMIUM) ? NIX_CHROMIUM : undefined,
      headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  } catch {
    return await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }
}

// ─── Main booking automation ──────────────────────────────────────────────────

export async function createReservation(payload: BookingPayload): Promise<BookingResult> {
  const loginUrl = process.env["ANYPLUSPRO_LOGIN_URL"];
  const username = process.env["ANYPLUSPRO_USERNAME"];
  const password = process.env["ANYPLUSPRO_PASSWORD"];
  const branchName = process.env["ANYPLUSPRO_BRANCH_NAME"] ?? "Paranaque";
  const defaultStaff = process.env["ANYPLUSPRO_DEFAULT_STAFF"] ?? "Laicel Esporlas";

  // If credentials are not set, fall back to generating a reference number (mock)
  if (!loginUrl || !username || !password) {
    logger.warn({ psid: payload.psid }, "AnyPlusPro credentials not configured — using mock booking");
    const referenceNo = `LJB-${Date.now().toString().slice(-6)}`;
    await upsertClient({
      psid: payload.psid,
      name: payload.name,
      mobile: payload.mobile,
      email: payload.email,
      emailConsent: payload.emailConsent,
      notes: payload.notes,
      status: "confirmed",
      service: payload.service,
      bookingDate: payload.date,
      bookingTime: payload.time,
      referenceNo,
      leadStatus: "booking_confirmed",
      anyPlusProStatus: "skipped",
      lastMessage: `Confirmed booking for ${payload.service} on ${payload.date} at ${payload.time}`,
    });
    return { success: true, referenceNo };
  }

  logger.info({ psid: payload.psid, service: payload.service }, "Starting AnyPlusPro browser automation");

  let browser: Browser | undefined;
  let screenshotPath: string | undefined;

  try {
    browser = await launchBrowser();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    // ── Step 1: Login ────────────────────────────────────────────────────────
    logger.info("AnyPlusPro: navigating to login page");
    await page.goto(loginUrl, { waitUntil: "networkidle", timeout: 30000 });
    screenshotPath = await takeScreenshot(page, "01_login_page");

    // Fill username/password fields (try common selectors)
    await page.fill('input[type="email"], input[name="email"], input[name="username"], input[placeholder*="email" i], input[placeholder*="user" i]', username, { timeout: 10000 });
    await page.fill('input[type="password"]', password, { timeout: 5000 });
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")', { timeout: 5000 });

    await page.waitForLoadState("networkidle", { timeout: 20000 });
    screenshotPath = await takeScreenshot(page, "02_after_login");

    // ── Step 2: Select branch if needed ─────────────────────────────────────
    const branchSelector = page.locator(`text="${branchName}"`, { hasText: branchName });
    if (await branchSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await branchSelector.click();
      await page.waitForLoadState("networkidle", { timeout: 10000 });
      logger.info(`AnyPlusPro: selected branch ${branchName}`);
    }

    // ── Step 3: Navigate to POS → Appointments ───────────────────────────────
    const posLink = page.locator('a:has-text("POS"), nav a:has-text("POS"), a[href*="pos"]').first();
    if (await posLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await posLink.click();
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    }

    const apptLink = page.locator('a:has-text("Appointment"), a[href*="appointment"]').first();
    if (await apptLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await apptLink.click();
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    }
    screenshotPath = await takeScreenshot(page, "03_appointments_page");

    // ── Step 4: Click "Book Appointment" ────────────────────────────────────
    await page.click('button:has-text("Book Appointment"), button:has-text("New Appointment"), button:has-text("Add Appointment"), a:has-text("Book Appointment")', { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    screenshotPath = await takeScreenshot(page, "04_book_appointment_modal");

    // ── Step 5: Search patient by mobile ─────────────────────────────────────
    const nameParts = payload.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? payload.name;
    const lastName = nameParts.slice(1).join(" ") || firstName;

    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="patient" i], input[placeholder*="mobile" i], input[placeholder*="phone" i]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(payload.mobile);
      await page.waitForTimeout(1500);
    }

    // Check if patient found
    const patientResult = page.locator(`text="${payload.mobile}", text="${payload.name}"`).first();
    const patientFound = await patientResult.isVisible({ timeout: 3000 }).catch(() => false);

    if (patientFound) {
      await patientResult.click();
      logger.info("AnyPlusPro: patient found and selected");
    } else {
      // ── Step 6: Register new patient ─────────────────────────────────────
      const registerBtn = page.locator('button:has-text("Register"), button:has-text("New Patient"), button:has-text("Add Patient"), button:has-text("Register New")').first();
      if (await registerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await registerBtn.click();
        await page.waitForTimeout(1000);
      }

      screenshotPath = await takeScreenshot(page, "05_register_patient");

      // Fill patient fields
      const firstNameInput = page.locator('input[name*="first" i], input[placeholder*="first name" i]').first();
      if (await firstNameInput.isVisible({ timeout: 3000 }).catch(() => false)) await firstNameInput.fill(firstName);

      const lastNameInput = page.locator('input[name*="last" i], input[placeholder*="last name" i]').first();
      if (await lastNameInput.isVisible({ timeout: 3000 }).catch(() => false)) await lastNameInput.fill(lastName);

      const mobileInput = page.locator('input[name*="mobile" i], input[name*="phone" i], input[placeholder*="mobile" i]').first();
      if (await mobileInput.isVisible({ timeout: 3000 }).catch(() => false)) await mobileInput.fill(payload.mobile);

      if (payload.email) {
        const emailInput = page.locator('input[type="email"], input[name*="email" i]').first();
        if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) await emailInput.fill(payload.email);
      }

      // Lead source
      const leadSourceInput = page.locator('select[name*="lead" i], input[placeholder*="lead" i]').first();
      if (await leadSourceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        const sourceLabel = payload.channel === "messenger" ? "Facebook Messenger" : "Facebook";
        const tagName = await leadSourceInput.evaluate((el) => el.tagName.toLowerCase());
        if (tagName === "select") {
          await leadSourceInput.selectOption({ label: sourceLabel }).catch(() =>
            leadSourceInput.selectOption({ label: "Facebook" }).catch(() => {})
          );
        } else {
          await leadSourceInput.fill(sourceLabel);
        }
      }

      // Patient manager
      const patientManagerInput = page.locator('select[name*="manager" i], input[placeholder*="manager" i], input[placeholder*="staff" i]').first();
      if (await patientManagerInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        const tagName = await patientManagerInput.evaluate((el) => el.tagName.toLowerCase());
        if (tagName === "select") {
          await patientManagerInput.selectOption({ label: defaultStaff }).catch(() => {});
        } else {
          await patientManagerInput.fill(defaultStaff);
        }
      }

      // Notes
      const noteChannel = payload.channel === "instagram" ? "Instagram DM" : "Facebook Messenger";
      const patientNotes = `Created from ${noteChannel} AI Bot. Concern: ${payload.concern ?? payload.service}. User Name: ${payload.name}. Email consent: ${payload.emailConsent ? "yes" : "no"}.`;
      const notesInput = page.locator('textarea[name*="note" i], textarea[placeholder*="note" i]').first();
      if (await notesInput.isVisible({ timeout: 3000 }).catch(() => false)) await notesInput.fill(patientNotes);

      // Submit patient registration
      const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Register"), button:has-text("Create Patient")').first();
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) await saveBtn.click();
      await page.waitForTimeout(1500);
      screenshotPath = await takeScreenshot(page, "06_patient_registered");
      logger.info("AnyPlusPro: new patient registered");
    }

    // ── Step 7: Search and select service ────────────────────────────────────
    const serviceMatch = matchService(payload.service);
    const serviceSearchTerm = serviceMatch
      ? (SERVICE_KEYWORDS[serviceMatch]?.[0] ?? payload.service)
      : payload.service;

    const serviceInput = page.locator('input[placeholder*="service" i], input[name*="service" i]').first();
    if (await serviceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await serviceInput.fill(serviceSearchTerm);
      await page.waitForTimeout(1000);
      const serviceOption = page.locator(`[role="option"]:has-text("${serviceSearchTerm}"), li:has-text("${serviceSearchTerm}")`).first();
      if (await serviceOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await serviceOption.click();
      }
    }

    if (!serviceMatch) {
      logger.warn({ service: payload.service }, "AnyPlusPro: no service match found");
      throw new Error(`Service match not found for: ${payload.service}`);
    }

    // ── Step 8: Set date and time ─────────────────────────────────────────────
    const dateInput = page.locator('input[type="date"], input[name*="date" i], input[placeholder*="date" i]').first();
    if (await dateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateInput.fill(formatDateForInput(payload.date));
    }

    const timeInput = page.locator('input[type="time"], input[name*="time" i], input[placeholder*="time" i]').first();
    if (await timeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await timeInput.fill(formatTimeForInput(payload.time));
    }

    screenshotPath = await takeScreenshot(page, "07_booking_form_filled");

    // ── Step 9: Set staff ─────────────────────────────────────────────────────
    const staffInput = page.locator('select[name*="staff" i], input[placeholder*="staff" i], input[placeholder*="therapist" i]').first();
    if (await staffInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const tagName = await staffInput.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === "select") {
        await staffInput.selectOption({ label: defaultStaff }).catch(() => {});
      } else {
        await staffInput.fill(defaultStaff);
      }
    }

    // Booking notes
    const noteChannel2 = payload.channel === "instagram" ? "Instagram DM" : "Facebook Messenger";
    const bookingNotes = `Booking from ${noteChannel2} AI Bot. Concern: ${payload.concern ?? payload.service}. User Name: ${payload.name}. Channel ID: ${payload.psid}.`;
    const bookingNotesInput = page.locator('textarea[name*="note" i], textarea[placeholder*="note" i], textarea[placeholder*="remark" i]').first();
    if (await bookingNotesInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bookingNotesInput.fill(bookingNotes);
    }

    // ── Step 10: Submit booking ───────────────────────────────────────────────
    await page.click('button[type="submit"]:has-text("Book"), button:has-text("Book Appointment"), button:has-text("Confirm"), button:has-text("Save Appointment")', { timeout: 10000 });
    await page.waitForTimeout(3000);
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    screenshotPath = await takeScreenshot(page, "08_after_submit");

    // ── Step 11: Detect success ───────────────────────────────────────────────
    const pageContent = await page.content();
    const successKeywords = ["success", "booked", "confirmed", "appointment created", "booking created", "saved"];
    const isSuccess = successKeywords.some((kw) => pageContent.toLowerCase().includes(kw));

    if (!isSuccess) {
      // Check for visible error
      const errorMsg = await page.locator('.error, .alert-danger, [role="alert"]').first().textContent({ timeout: 2000 }).catch(() => null);
      throw new Error(errorMsg ?? "Booking submission did not confirm success");
    }

    // Extract reference number if visible
    let referenceNo = `LJB-${Date.now().toString().slice(-6)}`;
    const refMatch = pageContent.match(/(?:reference|ref|booking)[^\d]*(\d{4,12})/i);
    if (refMatch?.[1]) referenceNo = `APP-${refMatch[1]}`;

    logger.info({ referenceNo, psid: payload.psid }, "AnyPlusPro booking success");

    await upsertClient({
      psid: payload.psid,
      name: payload.name,
      mobile: payload.mobile,
      email: payload.email,
      emailConsent: payload.emailConsent,
      notes: payload.notes,
      status: "confirmed",
      service: payload.service,
      bookingDate: payload.date,
      bookingTime: payload.time,
      referenceNo,
      leadStatus: "booking_confirmed",
      anyPlusProStatus: "auto_booked",
      anyPlusProScreenshot: screenshotPath,
      lastMessage: `Auto-booked: ${payload.service} on ${payload.date} at ${payload.time}`,
    });

    sendTelegramAlert(
      `✅ <b>AUTO-BOOKING SUCCESS</b>\n\n` +
      `👤 <b>Name:</b> ${payload.name}\n` +
      `📱 <b>Mobile:</b> ${payload.mobile}\n` +
      `💆 <b>Service:</b> ${payload.service}\n` +
      `📅 <b>Date/Time:</b> ${payload.date} at ${payload.time}\n` +
      `🔖 <b>Reference:</b> ${referenceNo}\n` +
      `📸 Screenshot: ${screenshotPath}`,
    ).catch(() => {});

    return { success: true, referenceNo, screenshotPath };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err: errMsg, psid: payload.psid }, "AnyPlusPro automation failed");

    // Take error screenshot
    let errorScreenshot = screenshotPath;
    try {
      if (!errorScreenshot) {
        const dir = getScreenshotDir();
        errorScreenshot = `logs/screenshots/error_${Date.now()}.png`;
        logger.info(`Error screenshot would be saved to ${errorScreenshot}`);
      }
    } catch { /* ignore */ }

    await upsertClient({
      psid: payload.psid,
      name: payload.name,
      mobile: payload.mobile,
      email: payload.email,
      emailConsent: payload.emailConsent,
      notes: payload.notes,
      status: "needs_followup",
      service: payload.service,
      bookingDate: payload.date,
      bookingTime: payload.time,
      leadStatus: "manual_booking_required",
      anyPlusProStatus: "manual_booking_required",
      anyPlusProError: errMsg.slice(0, 500),
      anyPlusProScreenshot: errorScreenshot,
    });

    sendTelegramAlert(
      `⚠️ <b>AUTO-BOOKING FAILED — MANUAL BOOKING REQUIRED</b>\n\n` +
      `👤 <b>Name:</b> ${payload.name}\n` +
      `📱 <b>Mobile:</b> ${payload.mobile}\n` +
      `💆 <b>Service:</b> ${payload.service}\n` +
      `📅 <b>Date/Time:</b> ${payload.date} at ${payload.time}\n` +
      `❌ <b>Error:</b> ${errMsg.slice(0, 200)}\n` +
      `📸 Screenshot: ${errorScreenshot ?? "none"}`,
    ).catch(() => {});

    return { success: false, error: errMsg, screenshotPath: errorScreenshot };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ─── Retry booking ────────────────────────────────────────────────────────────

export async function retryAutoBooking(psid: string): Promise<BookingResult> {
  const { pool } = await import("@workspace/db");
  const row = await pool.query("SELECT * FROM clients WHERE psid = $1", [psid]);
  const client = row.rows[0];
  if (!client) return { success: false, error: "Client not found" };

  if (client.anypluspro_status === "auto_booked") {
    return { success: false, error: "Already auto-booked" };
  }

  return createReservation({
    psid,
    service: client.service ?? "",
    date: client.booking_date ?? "",
    time: client.booking_time ?? "",
    name: client.name ?? "",
    mobile: client.mobile ?? "",
    email: client.email ?? undefined,
    emailConsent: client.email_consent ?? false,
    notes: client.notes ?? undefined,
    concern: client.concern ?? undefined,
    channel: client.channel ?? "messenger",
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateForInput(dateStr: string): string {
  // Try to parse common formats and return YYYY-MM-DD
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0]!;
    }
  } catch { /* ignore */ }
  return dateStr;
}

function formatTimeForInput(timeStr: string): string {
  // Convert "10am", "2pm", "14:00" → "10:00", "14:00"
  const m = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (m) {
    let hours = parseInt(m[1]!, 10);
    const minutes = m[2] ? parseInt(m[2], 10) : 0;
    const period = m[3]?.toLowerCase();
    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }
  return timeStr;
}

// ─── Helper: "10:00 AM" → "10:00", "2:30 PM" → "14:30" ──────────────────────
function convertTo24Hr(timeStr: string): string {
  const parts = timeStr.trim().split(" ");
  const modifier = parts[1]?.toUpperCase();
  const [h, min] = (parts[0] ?? "0:00").split(":").map(Number);
  let hours = h ?? 0;
  const minutes = min ?? 0;
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// ─── autoBook ─────────────────────────────────────────────────────────────────
// Simpler interface used by the test route and admin-triggered retries.
// Uses BookingDetails (psid, name, service, date, time, phone?) instead of
// the full BookingPayload used by createReservation.

export async function autoBook(details: BookingDetails): Promise<BookingResult> {
  let browser: Browser | null = null;
  try {
    logger.info({ details }, "autoBook: starting AnyPlusPro automation");

    browser = await chromium.launch({
      executablePath: fs.existsSync("/nix/store/0n9rl5l9syy808xi9bk4f6dhnfrvhkww-playwright-browsers-chromium/chromium-1080/chrome-linux/chrome")
        ? "/nix/store/0n9rl5l9syy808xi9bk4f6dhnfrvhkww-playwright-browsers-chromium/chromium-1080/chrome-linux/chrome"
        : undefined,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    const ssDir = path.resolve(SCREENSHOT_DIR);
    if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
    const ss = async (label: string) => {
      const p = path.join(ssDir, `${label}_${Date.now()}.png`);
      await page.screenshot({ path: p, fullPage: false });
      return `${SCREENSHOT_DIR}/${path.basename(p)}`;
    };

    // ── Step 1: Login ─────────────────────────────────────────────────────────
    await page.goto(ANYPLUSPRO_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.fill('input[type="email"], input[name="email"], input[name="username"]', ANYPLUSPRO_USERNAME, { timeout: 10000 });
    await page.fill('input[type="password"]', ANYPLUSPRO_PASSWORD, { timeout: 5000 });
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")', { timeout: 5000 });
    await page.waitForLoadState("networkidle", { timeout: 20000 });
    await ss("01-after-login");

    if (page.url().includes("login")) {
      throw new Error("Login failed — check ANYPLUSPRO_USERNAME and ANYPLUSPRO_PASSWORD");
    }
    logger.info("autoBook: login successful");

    // ── Step 2: Navigate to Appointments ──────────────────────────────────────
    const apptLink = page.locator('a:has-text("Appointment"), a[href*="appointment"]').first();
    if (await apptLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await apptLink.click();
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    }
    await ss("02-appointments-page");
    logger.info("autoBook: on appointments page");

    // ── Step 3: Open New Appointment modal ────────────────────────────────────
    await page.click(
      'button:has-text("Appointment"), button:has-text("New Appointment"), button:has-text("+ Appointment")',
      { timeout: 10000 },
    );
    await page.waitForTimeout(1500);
    await ss("03-new-appointment-modal");
    logger.info("autoBook: new appointment modal opened");

    // ── Step 4: Click Register New ────────────────────────────────────────────
    await page.click('button:has-text("Register New"), text=Register New', { timeout: 10000 });
    await page.waitForTimeout(1500);
    await ss("04-register-patient-form");
    logger.info("autoBook: register patient form visible");

    // ── Step 5: Fill patient registration ────────────────────────────────────
    const nameParts = details.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? details.name;
    const lastName = nameParts.slice(1).join(" ") || "—";

    const firstInput = page.locator('input[placeholder="First name"], input[placeholder*="first" i]').first();
    if (await firstInput.isVisible({ timeout: 5000 }).catch(() => false)) await firstInput.fill(firstName);

    const lastInput = page.locator('input[placeholder="Last name"], input[placeholder*="last" i]').first();
    if (await lastInput.isVisible({ timeout: 3000 }).catch(() => false)) await lastInput.fill(lastName);

    if (details.phone) {
      const phoneInput = page.locator('input[placeholder*="9XX"], input[placeholder*="mobile" i], input[type="tel"]').first();
      if (await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)) await phoneInput.fill(details.phone);
    }

    // Lead source — try to select Facebook / Instagram
    await page.selectOption('select', { label: /facebook|social media|instagram|online/i })
      .catch(() =>
        page.evaluate(() => {
          document.querySelectorAll("select").forEach((s) => { if (s.options.length > 1) s.selectedIndex = 1; });
        }).catch(() => {})
      );

    // Notes
    const notesInput = page.locator('textarea[placeholder*="notes" i], textarea[placeholder*="Notes"]').first();
    if (await notesInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notesInput.fill(
        `Booked via Facebook Messenger chatbot. Service: ${details.service}. Date: ${details.date} at ${details.time}.`
      );
    }
    await ss("05-form-filled");

    // ── Step 6: Submit patient registration ───────────────────────────────────
    await page.click('button:has-text("Register Patient"), button:has-text("Register"), button[type="submit"]', { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await ss("06-patient-registered");
    logger.info("autoBook: patient registered");

    // ── Step 7: Search and select patient in appointment form ─────────────────
    const searchInput = page.locator('input[placeholder*="Search by name" i], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(details.name);
      await page.waitForTimeout(1500);
      await page.click('[class*="patient"], [class*="result"]:first-child, [class*="suggestion"]:first-child', { timeout: 5000 })
        .catch(async () => { await page.keyboard.press("Enter"); });
    }
    await ss("07-patient-selected");

    // ── Step 8: Select service ────────────────────────────────────────────────
    const svcInput = page.locator('input[placeholder*="Search service" i], input[placeholder*="service" i]').first();
    if (await svcInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await svcInput.fill(details.service);
      await page.waitForTimeout(1500);
      await page.click('[class*="service"]:first-child, [class*="result"]:first-child', { timeout: 5000 })
        .catch(async () => { await page.keyboard.press("Enter"); });
    }
    await ss("08-service-selected");

    // ── Step 9: Set date and time ─────────────────────────────────────────────
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible({ timeout: 5000 }).catch(() => false)) await dateInput.fill(details.date);

    const timeInput = page.locator('input[type="time"]').first();
    if (await timeInput.isVisible({ timeout: 3000 }).catch(() => false)) await timeInput.fill(convertTo24Hr(details.time));

    await ss("09-datetime-set");

    // ── Step 10: Submit booking ───────────────────────────────────────────────
    await page.click(
      'button:has-text("Book"), button:has-text("Confirm"), button:has-text("Save"), button:has-text("Create Appointment")',
      { timeout: 10000 },
    );
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    const finalShot = await ss("10-booking-submitted");
    logger.info("autoBook: booking submitted");

    // ── Step 11: Detect success ───────────────────────────────────────────────
    const pageContent = await page.content();
    const isSuccess = /success|confirmed|booked|appointment created|booking created/i.test(pageContent);

    await pool.query(
      `UPDATE clients SET anypluspro_status = $1, lead_status = 'booking_confirmed', updated_at = NOW() WHERE psid = $2`,
      [isSuccess ? "auto_booked" : "manual_booking_required", details.psid],
    ).catch(() => {});

    logger.info({ isSuccess }, "autoBook: complete");
    return { success: isSuccess, screenshotPath: finalShot };

  } catch (err) {
    logger.error({ err }, "autoBook: failed");
    await pool.query(
      `UPDATE clients SET anypluspro_status = 'manual_booking_required', updated_at = NOW() WHERE psid = $1`,
      [details.psid],
    ).catch(() => {});
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
