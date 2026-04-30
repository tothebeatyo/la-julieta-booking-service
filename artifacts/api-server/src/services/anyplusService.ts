import { chromium, type Browser, type Page } from "playwright";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
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
  clientType?: "Old" | "New";
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
  facial: ["facial", "basic facial", "diamond peel", "hydraglow", "oxygeneo", "backne", "underarm spa"],
  microneedling: ["microneedling", "bb glow", "korean bb", "prp", "salmon dna", "stretch marks", "acneklear"],
  warts: ["warts", "wart removal", "wart"],
  laser: ["laser", "skin rejuve", "pico carbon", "carbon peel", "ua whitening", "ua hair removal", "lips hair"],
  hair_removal: ["hair removal", "diode", "small area", "medium area", "large area"],
  emshape: ["emshape", "body sculpt", "tummy sculpt", "arm sculpt"],
  hifu: ["7d hifu", "ultraforma", "ultraformer", "hifu"],
  thermagic: ["thermagic", "thermage"],
  exislim: ["exislim", "exi slim"],
  lemon_bottle: ["lemon bottle", "fat dissolve", "fat dissolving", "lb fat"],
  mesolipo: ["mesolipo", "meso lipo"],
  iv_drip: ["iv drip", "gluta drip", "glutathione", "immune booster", "bella drip", "celestial drip", "snow white drip", "goddess drip"],
  injectables: ["botox", "filler", "injectable", "injection"],
};

// Resolve the Chromium executable at startup:
// 1. CHROMIUM_EXECUTABLE_PATH env override
// 2. `which chromium` — Nix-installed system chromium (preferred, always has its libs)
// 3. `which chromium-browser`
// 4. undefined — fall back to Playwright's own downloaded binary
function resolveChromiumPath(): string | undefined {
  const env = process.env["CHROMIUM_EXECUTABLE_PATH"];
  if (env && fs.existsSync(env)) return env;
  for (const cmd of ["chromium", "chromium-browser"]) {
    try {
      const p = execSync(`which ${cmd}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
      if (p && fs.existsSync(p)) return p;
    } catch { /* not found, try next */ }
  }
  return undefined;
}

const CHROMIUM_EXEC = resolveChromiumPath();

const BROWSER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-first-run",
  "--no-zygote",
  "--single-process",
  "--disable-extensions",
  "--disable-background-networking",
  "--safebrowsing-disable-auto-update",
  "--disable-sync",
  "--disable-translate",
  "--hide-scrollbars",
  "--metrics-recording-only",
  "--mute-audio",
  "--ignore-certificate-errors",
];

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
  logger.info({ executablePath: CHROMIUM_EXEC ?? "(playwright default)" }, "launchBrowser: launching Chromium");
  return chromium.launch({
    executablePath: CHROMIUM_EXEC,
    headless,
    args: BROWSER_ARGS,
    timeout: 60000,
  });
}

// ─── Retry-safe page navigation ───────────────────────────────────────────────

async function gotoWithRetry(page: Page, url: string, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(2000);
      logger.info({ url, attempt }, "Page loaded successfully");
      return;
    } catch (err) {
      logger.warn({ url, attempt, err }, "Navigation attempt failed, retrying…");
      if (attempt === maxRetries) throw err;
      await page.waitForTimeout(3000);
    }
  }
}

// ─── Register a new patient on the AnyPlusPro form ───────────────────────────

async function registerNewPatient(page: Page, payload: BookingPayload): Promise<void> {
  const nameParts = payload.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? payload.name;
  const lastName = nameParts.slice(1).join(" ") || "-";

  // Wait for first-name field
  await page.waitForSelector('input[placeholder="First name"], input[placeholder*="first" i]', {
    state: "visible",
    timeout: 10000,
  });

  const firstNameInput = page.locator('input[placeholder="First name"], input[placeholder*="first" i]').first();
  if (await firstNameInput.isVisible({ timeout: 3000 }).catch(() => false)) await firstNameInput.fill(firstName);

  const lastNameInput = page.locator('input[placeholder="Last name"], input[placeholder*="last" i]').first();
  if (await lastNameInput.isVisible({ timeout: 3000 }).catch(() => false)) await lastNameInput.fill(lastName);

  // Mobile number
  if (payload.mobile) {
    await page.evaluate((mobile: string) => {
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input"));
      const mobileInput = inputs.find(
        (i) =>
          i.placeholder?.includes("9XX") ||
          i.type === "tel" ||
          i.placeholder?.toLowerCase().includes("mobile") ||
          i.placeholder?.toLowerCase().includes("phone"),
      );
      if (mobileInput) {
        mobileInput.value = mobile;
        mobileInput.dispatchEvent(new Event("input", { bubbles: true }));
        mobileInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, payload.mobile);
  }

  // Lead source — prefer Facebook / Instagram option
  await page.evaluate((channel: string | undefined) => {
    const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("select"));
    for (const select of selects) {
      const label = select.closest("div")?.textContent?.toLowerCase() ?? "";
      if (label.includes("lead source") || label.includes("how did")) {
        const preferred = channel === "instagram" ? /instagram/i : /facebook|social|online/i;
        const opt = Array.from(select.options).find((o) => preferred.test(o.text));
        if (opt) select.value = opt.value;
        else if (select.options.length > 1) select.selectedIndex = 1;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        break;
      }
    }
  }, payload.channel);

  // Notes
  await page.evaluate((details: { service: string; date: string; time: string; clientType?: string }) => {
    const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea"));
    const notes = textareas.find(
      (t) => t.placeholder?.toLowerCase().includes("note") || t.placeholder?.toLowerCase().includes("additional"),
    );
    if (notes) {
      notes.value = `Booked via Facebook Messenger. Service: ${details.service}. Date: ${details.date} at ${details.time}. Client type: ${details.clientType ?? "New"}.`;
      notes.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, { service: payload.service, date: payload.date, time: payload.time, clientType: payload.clientType });

  await takeScreenshot(page, "register-form-filled");

  // Submit patient registration
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
    const btn = buttons.find((b) => /register patient|register/i.test(b.textContent ?? ""));
    if (btn) btn.click();
  });

  await page.waitForTimeout(3000);
  await takeScreenshot(page, "patient-registered");
  logger.info("AnyPlusPro: patient registration submitted");
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

    // ── Increase timeouts and block heavy resources for speed ────────────────
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    await page.route("**/*", (route) => {
      const blocked = ["image", "stylesheet", "font", "media"];
      if (blocked.includes(route.request().resourceType())) {
        route.abort().catch(() => {});
      } else {
        route.continue().catch(() => {});
      }
    });

    // ── Step 1: Login ────────────────────────────────────────────────────────
    logger.info("AnyPlusPro: navigating to login page");
    await gotoWithRetry(page, loginUrl);
    screenshotPath = await takeScreenshot(page, "01_login_page");

    // Fill username/password fields (try common selectors)
    await page.fill('input[type="email"], input[name="email"], input[name="username"], input[placeholder*="email" i], input[placeholder*="user" i]', username, { timeout: 8000 });
    await page.fill('input[type="password"]', password, { timeout: 5000 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}),
      page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")', { timeout: 5000 }),
    ]);
    await page.waitForTimeout(3000);
    screenshotPath = await takeScreenshot(page, "02_after_login");

    // ── Step 2: Select branch if needed ─────────────────────────────────────
    const branchSelector = page.locator(`text="${branchName}"`, { hasText: branchName });
    if (await branchSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await branchSelector.click();
      await page.waitForTimeout(3000);
      logger.info(`AnyPlusPro: selected branch ${branchName}`);
    }

    // ── Step 3: Navigate to POS → Appointments ───────────────────────────────
    const posLink = page.locator('a:has-text("POS"), nav a:has-text("POS"), a[href*="pos"]').first();
    if (await posLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await posLink.click();
      await page.waitForTimeout(3000);
    }

    const apptLink = page.locator('a:has-text("Appointment"), a[href*="appointment"]').first();
    if (await apptLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await apptLink.click();
      await page.waitForTimeout(3000);
    }
    screenshotPath = await takeScreenshot(page, "03_appointments_page");

    // ── Step 4: Click "Book Appointment" ────────────────────────────────────
    await page.click('button:has-text("Book Appointment"), button:has-text("New Appointment"), button:has-text("Add Appointment"), a:has-text("Book Appointment")', { timeout: 10000 });
    await page.waitForTimeout(3000);
    screenshotPath = await takeScreenshot(page, "04_book_appointment_modal");

    // ── Step 5 & 6: Handle patient — Old (search existing) vs New (register) ───
    const isOldClient = /old/i.test(payload.clientType ?? "new");

    if (isOldClient) {
      // ── OLD CLIENT — search by name ────────────────────────────────────
      logger.info({ name: payload.name }, "AnyPlusPro: searching existing patient");
      const nameParts = payload.name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? payload.name;

      const searchInput = await page.$(
        'input[placeholder*="Search by name"], input[placeholder*="name, phone, or email"], input[placeholder*="search" i], input[placeholder*="patient" i]',
      );

      if (searchInput) {
        await searchInput.type(firstName);
        await page.waitForTimeout(2000);
        screenshotPath = await takeScreenshot(page, "05_patient_search_results");

        const hasResults = await page.evaluate(() => {
          const results = document.querySelectorAll(
            '[class*="result"], [class*="option"], [class*="patient"], [class*="suggestion"]',
          );
          return results.length > 0;
        });

        if (hasResults) {
          await page.evaluate((name: string) => {
            const results = Array.from(document.querySelectorAll<HTMLElement>(
              '[class*="result"], [class*="option"], [class*="patient"], [class*="suggestion"]',
            ));
            const exact = results.find((r) => r.textContent?.toLowerCase().includes(name.toLowerCase()));
            if (exact) exact.click();
            else if (results[0]) results[0].click();
          }, firstName);
          await page.waitForTimeout(1000);
          screenshotPath = await takeScreenshot(page, "05b_patient_selected");
          logger.info("AnyPlusPro: existing patient selected");
        } else {
          // Not found — fall back to new registration
          logger.warn({ name: payload.name }, "AnyPlusPro: patient not found — registering as new");
          await page.keyboard.press("Control+a");
          await page.keyboard.press("Backspace");
          await registerNewPatient(page, payload);
          screenshotPath = await takeScreenshot(page, "06_patient_registered_fallback");
        }
      }
    } else {
      // ── NEW CLIENT — click "Register New" then fill form ──────────────
      logger.info({ name: payload.name }, "AnyPlusPro: registering new patient");
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll<HTMLElement>("button, a, span, div"));
        const el = elements.find((e) => e.textContent?.trim().toLowerCase().includes("register new"));
        if (el) el.click();
      });
      await page.waitForTimeout(2000);
      screenshotPath = await takeScreenshot(page, "05_register_new_form");
      await registerNewPatient(page, payload);
      screenshotPath = await takeScreenshot(page, "06_patient_registered");
    }

    // ── Step 7: Search and select service ────────────────────────────────────
    const serviceMatch = matchService(payload.service);
    const serviceSearchTerm = serviceMatch
      ? (SERVICE_KEYWORDS[serviceMatch]?.[0] ?? payload.service)
      : payload.service;

    // Use first word only for a broader search (e.g. "facial" from "facial cleaning")
    const serviceKeyword = serviceSearchTerm
      .replace(/treatment|therapy|procedure/gi, "")
      .trim()
      .split(/\s+/)[0] ?? serviceSearchTerm;

    const serviceSearchInput = await page.$(
      'input[placeholder*="Search services"], input[placeholder*="service" i], input[name*="service" i]',
    );

    if (serviceSearchInput) {
      await serviceSearchInput.type(serviceKeyword);
      await page.waitForTimeout(2000);
      screenshotPath = await takeScreenshot(page, "07_service_search_results");

      await page.evaluate((keyword: string) => {
        const results = Array.from(document.querySelectorAll<HTMLElement>(
          '[class*="service"], [class*="result"], [class*="option"], [class*="item"]',
        ));
        const match = results.find((r) => r.textContent?.toLowerCase().includes(keyword.toLowerCase()));
        if (match) match.click();
        else if (results[0]) results[0].click();
      }, serviceKeyword);

      await page.waitForTimeout(1000);
      screenshotPath = await takeScreenshot(page, "07b_service_selected");
    } else {
      // Fallback to locator approach
      const serviceLocator = page.locator('input[placeholder*="service" i], input[name*="service" i]').first();
      if (await serviceLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
        await serviceLocator.fill(serviceKeyword);
        await page.waitForTimeout(1000);
        const serviceOption = page.locator(`[role="option"]:has-text("${serviceKeyword}"), li:has-text("${serviceKeyword}")`).first();
        if (await serviceOption.isVisible({ timeout: 3000 }).catch(() => false)) await serviceOption.click();
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
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const submitBtn = buttons.find((b) =>
        /book appointment|book|confirm|save/i.test(b.textContent ?? ""),
      );
      if (submitBtn) submitBtn.click();
    });
    await page.waitForTimeout(3000);
    await page.waitForLoadState("load", { timeout: 8000 }).catch(() => {});
    screenshotPath = await takeScreenshot(page, "08_booking_submitted");

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

    // Take error screenshot from live page if possible
    let errorScreenshot = screenshotPath;
    try {
      const dir = getScreenshotDir();
      const errorPath = path.join(dir, `error_${Date.now()}.png`);
      // browser/page may already be closed — attempt screenshot via existing context
      const pages = browser?.contexts().flatMap((c) => c.pages()) ?? [];
      const livePage = pages[0];
      if (livePage) {
        await livePage.screenshot({ path: errorPath, fullPage: true }).catch(() => {});
        errorScreenshot = `logs/screenshots/${path.basename(errorPath)}`;
      }
    } catch { /* ignore screenshot errors */ }

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

    browser = await launchBrowser();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    // Block heavy resources to speed up page loads
    await page.route("**/*", (route) => {
      const blocked = ["image", "stylesheet", "font", "media"];
      if (blocked.includes(route.request().resourceType())) {
        route.abort().catch(() => {});
      } else {
        route.continue().catch(() => {});
      }
    });

    const ssDir = path.resolve(SCREENSHOT_DIR);
    if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
    const ss = async (label: string) => {
      const p = path.join(ssDir, `${label}_${Date.now()}.png`);
      await page.screenshot({ path: p, fullPage: false });
      return `${SCREENSHOT_DIR}/${path.basename(p)}`;
    };

    // ── Step 1: Login ─────────────────────────────────────────────────────────
    await gotoWithRetry(page, ANYPLUSPRO_URL);
    await page.fill('input[type="email"], input[name="email"]', ANYPLUSPRO_USERNAME, { timeout: 10000 });
    await page.fill('input[type="password"]', ANYPLUSPRO_PASSWORD, { timeout: 5000 });
    await page.click('button[type="submit"], button:has-text("Sign In")', { timeout: 5000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    await ss("01-after-login");
    if (page.url().includes("login")) throw new Error("Login failed — check credentials");
    logger.info("autoBook: login successful");

    // ── Step 2: Navigate to Appointments ──────────────────────────────────────
    const apptLink = page.locator('a:has-text("Appointments"), a[href*="appointment"]').first();
    if (await apptLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await apptLink.click();
      await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
    }
    await ss("02-appointments-page");
    logger.info("autoBook: on appointments page");

    // ── Step 3: Open New Appointment modal ────────────────────────────────────
    // The button text in the header is "+ Appointment" or "New Appointment"
    await page.locator('button:has-text("Appointment")').first().click({ timeout: 10000 });
    await page.waitForTimeout(1500);
    await ss("03-modal-opened");
    logger.info("autoBook: New Appointment modal opened");

    // ── Step 4: Search for existing patient; register if not found ────────────
    const patientSearch = page.locator('input[placeholder*="Search by name" i]').first();
    if (await patientSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
      const searchTerm = details.phone ?? details.name;
      await patientSearch.fill(searchTerm);
      await page.waitForTimeout(1500);

      // Check if a dropdown result appeared
      const firstResult = page.locator('[role="option"], [role="listbox"] li').first();
      const found = await firstResult.isVisible({ timeout: 2000 }).catch(() => false);

      if (found) {
        await firstResult.click();
        logger.info("autoBook: existing patient selected from search");
        await ss("04-patient-selected");
      } else {
        // No match — click "Register New" link in the Patient section header
        logger.info("autoBook: patient not found, opening Register New form");
        await patientSearch.clear();
        await page.locator('button:has-text("Register New"), a:has-text("Register New")').first().click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        await ss("04-register-form");

        // ── Fill Register New Patient form ─────────────────────────────────
        const nameParts = details.name.trim().split(/\s+/);
        const firstName = nameParts[0] ?? details.name;
        const lastName = nameParts.slice(1).join(" ") || firstName;

        // First/Last name — exact placeholders from screenshot
        await page.fill('input[placeholder="First name"]', firstName, { timeout: 5000 }).catch(() => {});
        await page.fill('input[placeholder="Last name"]', lastName, { timeout: 3000 }).catch(() => {});

        // Mobile — placeholder "+63 9XX XXX XXXX"
        if (details.phone) {
          await page.fill('input[placeholder*="9XX"], input[placeholder*="mobile" i], input[type="tel"]', details.phone, { timeout: 3000 }).catch(() => {});
        }

        // Lead Source (required *) — scoped to register dialog, index 1 (0=Gender, 1=Lead Source, 2=Patient Manager)
        const regDialog = page.locator('[role="dialog"]').last();
        const leadSrcSelect = regDialog.locator('select').nth(1);
        if (await leadSrcSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
          await leadSrcSelect.selectOption({ label: /facebook/i }).catch(async () => {
            await leadSrcSelect.selectOption({ index: 1 }).catch(() => {});
          });
        }

        // Notes — "Any additional notes"
        const notesInput = regDialog.locator('textarea[placeholder*="notes" i]').first();
        if (await notesInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await notesInput.fill(`Booked via Messenger chatbot. Service: ${details.service}. Date: ${details.date} at ${details.time}.`);
        }

        await ss("05-register-filled");

        // Click "Register Patient" button
        await regDialog.locator('button:has-text("Register Patient")').click({ timeout: 10000 });
        await page.waitForTimeout(1500);

        // ── Handle duplicate patient warning ──────────────────────────────────
        // AnyPlusPro shows "Phone already registered at [location]" with
        // [View Existing Patient] [Create Anyway] [Cancel] when phone exists
        const viewExistingBtn = page.locator('button:has-text("View Existing Patient")');
        const createAnywayBtn = page.locator('button:has-text("Create Anyway")');
        if (await createAnywayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          // "Create Anyway" stays in the appointment form flow — preferred over navigating away
          logger.info("autoBook: duplicate detected, creating patient anyway to stay in appointment flow");
          await createAnywayBtn.click({ timeout: 5000 });
          await page.waitForTimeout(1500);
          await ss("06-patient-registered");
        } else if (await viewExistingBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          // "View Existing Patient" navigates to the patient record page; we then click "Book" there
          logger.info("autoBook: duplicate detected — navigating to existing patient record");
          await viewExistingBtn.click({ timeout: 5000 });
          // Wait for URL to change to patient record (contains "patient" in path)
          await page.waitForURL(/patient/i, { timeout: 15000 }).catch(() => {});
          await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(2000); // let React render the page
          await ss("06-patient-record");

          // The patient record page has a "Book" button that opens New Appointment modal (patient pre-filled)
          const bookBtn = page.locator('button:has-text("Book")').first();
          if (await bookBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
            await bookBtn.click({ timeout: 5000 });
            await page.waitForTimeout(2000);
            logger.info("autoBook: appointment modal re-opened from patient record");
            await ss("06b-modal-from-patient");
          }
        } else {
          await page.waitForTimeout(500);
          await ss("06-patient-registered");
        }
        logger.info("autoBook: patient step complete");

        // After registration/duplicate-handling, search for patient in appointment form if not already selected
        const patientFieldVal = await page.locator('input[placeholder*="Search by name" i]').first().inputValue({ timeout: 2000 }).catch(() => "");
        if (!patientFieldVal) {
          const searchAgain = page.locator('input[placeholder*="Search by name" i]').first();
          if (await searchAgain.isVisible({ timeout: 5000 }).catch(() => false)) {
            await searchAgain.fill(details.name);
            await page.waitForTimeout(2000);
            const result = page.locator('[role="option"], [role="listbox"] li, [role="listbox"] button').first();
            if (await result.isVisible({ timeout: 2000 }).catch(() => false)) {
              await result.click();
            } else {
              await searchAgain.press("ArrowDown");
              await page.waitForTimeout(300);
              await searchAgain.press("Enter");
            }
          }
        }
        await ss("07-patient-confirmed");
      }
    }

    // ── Step 5: Select service from the searchable list ───────────────────────
    const serviceMatch = matchService(details.service);
    const searchTerm = serviceMatch ? (SERVICE_KEYWORDS[serviceMatch]?.[0] ?? details.service) : details.service;
    const svcSearch = page.locator('input[placeholder*="Search services" i]').first();
    if (await svcSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await svcSearch.fill(searchTerm);
      await page.waitForTimeout(1000);
      // Service items are <button class="w-full text-left px-3 py-2 ..."> (confirmed from Playwright error log)
      // Scope to dialog to avoid matching external buttons
      const apptDialog = page.locator('[role="dialog"]').last();
      const svcButton = apptDialog.locator('button.text-left').filter({ hasText: new RegExp(searchTerm, "i") }).first();
      if (await svcButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await svcButton.click();
        logger.info("autoBook: service button clicked");
      } else {
        // Fallback: click the first left-aligned button in the dialog that appeared after the search
        const firstBtn = apptDialog.locator('button.text-left').first();
        if (await firstBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await firstBtn.click();
        }
      }
    }
    await ss("08-service-selected");
    logger.info("autoBook: service selected");

    // ── Step 6: Set date ──────────────────────────────────────────────────────
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateInput.fill(formatDateForInput(details.date));
    }

    // ── Step 7: Set time ──────────────────────────────────────────────────────
    const timeInput = page.locator('input[type="time"]').first();
    if (await timeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await timeInput.fill(convertTo24Hr(details.time));
    }
    await ss("09-datetime-set");

    // ── Step 8: Scroll modal to bottom and submit ─────────────────────────────
    // Click modal title to dismiss any open pickers (service/date/time dropdowns)
    await page.locator('[role="dialog"] h2, [role="dialog"] h3').first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]') ?? document.querySelector(".modal-content") ?? document.body;
      dialog.scrollTop = dialog.scrollHeight;
    });
    await page.waitForTimeout(500);
    await ss("10-before-submit");

    // Scope submit button to inside the dialog to avoid matching the header "+ Appointment" button
    const apptModal = page.locator('[role="dialog"]').last();
    await apptModal.locator('button:has-text("Book Appointment")').click({ timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    const finalShot = await ss("11-submitted");
    logger.info("autoBook: booking submitted");

    // ── Step 9: Detect success ────────────────────────────────────────────────
    const pageContent = await page.content();
    const isSuccess = /success|confirmed|booked|appointment created|booking created/i.test(pageContent);

    await pool.query(
      `UPDATE clients SET anypluspro_status = $1, lead_status = 'booking_confirmed', updated_at = NOW() WHERE psid = $2`,
      [isSuccess ? "auto_booked" : "manual_booking_required", details.psid],
    ).catch(() => {});

    sendTelegramAlert(
      isSuccess
        ? `✅ <b>AUTO-BOOKING SUCCESS</b>\n\n👤 <b>Name:</b> ${details.name}\n💆 <b>Service:</b> ${details.service}\n📅 <b>Date/Time:</b> ${details.date} at ${details.time}\n📸 Screenshot: ${finalShot}`
        : `⚠️ <b>AUTO-BOOKING FAILED — MANUAL BOOKING REQUIRED</b>\n\n👤 <b>Name:</b> ${details.name}\n💆 <b>Service:</b> ${details.service}\n📅 <b>Date/Time:</b> ${details.date} at ${details.time}`,
    ).catch(() => {});

    logger.info({ isSuccess }, "autoBook: complete");
    return { success: isSuccess, screenshotPath: finalShot };

  } catch (err) {
    logger.error({ err }, "autoBook: failed");
    await pool.query(
      `UPDATE clients SET anypluspro_status = 'manual_booking_required', updated_at = NOW() WHERE psid = $1`,
      [details.psid],
    ).catch(() => {});
    sendTelegramAlert(
      `⚠️ <b>AUTO-BOOKING FAILED — MANUAL BOOKING REQUIRED</b>\n\n👤 <b>Name:</b> ${details.name}\n💆 <b>Service:</b> ${details.service}\n📅 <b>Date/Time:</b> ${details.date} at ${details.time}`,
    ).catch(() => {});
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
