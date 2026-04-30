import express from "express";
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";

const app = express();
app.use(express.json());

const ANYPLUSPRO_URL = "https://www.lajulieta.anypluspro.com";
const USERNAME = process.env["ANYPLUSPRO_USERNAME"] ?? "";
const PASSWORD = process.env["ANYPLUSPRO_PASSWORD"] ?? "";
const API_SECRET = process.env["BOOKING_SERVICE_SECRET"] ?? "secret123";

mkdirSync("/tmp/screenshots", { recursive: true });

function auth(req: any, res: any, next: any) {
  if (req.headers["x-api-secret"] !== API_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post("/book", auth, async (req, res) => {
  const { name, service, date, time, phone, clientType } = req.body;
  console.log("Booking request:", { name, service, date, time });

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env["PUPPETEER_EXECUTABLE_PATH"] || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--disable-extensions",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setDefaultTimeout(60000);

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "media", "font"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log("Loading AnyPlusPro...");
    await page.goto(ANYPLUSPRO_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);

    await page.type('input[type="email"]', USERNAME, { delay: 50 });
    await page.type('input[type="password"]', PASSWORD, { delay: 50 });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    const loginFailed = await page.evaluate(() =>
      document.body.textContent?.toLowerCase().includes("sign in") ?? false
    );
    if (loginFailed) throw new Error("Login failed");
    console.log("Login successful!");

    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("a,button,div,li"));
      const el = els.find(e => e.textContent?.toLowerCase().includes("appointment"));
      if (el) (el as HTMLElement).click();
    });
    await page.waitForTimeout(3000);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => b.textContent?.toLowerCase().includes("appointment"));
      if (btn) btn.click();
    });
    await page.waitForTimeout(3000);

    const isOld = /old/i.test(clientType ?? "new");
    if (isOld) {
      const searchInput = await page.$('input[placeholder*="Search by name"]');
      if (searchInput) {
        await searchInput.type(name.split(" ")[0], { delay: 50 });
        await page.waitForTimeout(2000);
        await page.evaluate((n: string) => {
          const results = Array.from(document.querySelectorAll('[class*="result"],[class*="option"],li'));
          const match = results.find(r => r.textContent?.toLowerCase().includes(n.toLowerCase()));
          if (match) (match as HTMLElement).click();
          else if (results[0]) (results[0] as HTMLElement).click();
        }, name.split(" ")[0]);
      }
    } else {
      await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll("button,a,span,div"));
        const el = els.find(e => e.textContent?.trim().toLowerCase().includes("register new"));
        if (el) (el as HTMLElement).click();
      });
      await page.waitForTimeout(2000);

      const nameParts = name.trim().split(" ");
      await page.waitForSelector('input[placeholder="First name"]', { timeout: 10000 }).catch(() => {});
      await page.type('input[placeholder="First name"]', nameParts[0] ?? name, { delay: 50 });
      await page.type('input[placeholder="Last name"]', nameParts.slice(1).join(" ") || "-", { delay: 50 });

      if (phone) {
        await page.evaluate((p: string) => {
          const inputs = Array.from(document.querySelectorAll("input"));
          const tel = inputs.find(i => i.placeholder?.includes("9XX") || i.type === "tel" || i.placeholder?.toLowerCase().includes("mobile"));
          if (tel) { tel.value = p; tel.dispatchEvent(new Event("input", { bubbles: true })); }
        }, phone);
      }

      await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll("select"));
        for (const sel of selects) {
          const ctx = sel.closest("div")?.textContent?.toLowerCase() ?? "";
          if (ctx.includes("lead") || ctx.includes("hear")) {
            const opt = Array.from(sel.options).find(o => /facebook|social|online|instagram/i.test(o.text));
            if (opt) sel.value = opt.value;
            else if (sel.options.length > 1) sel.selectedIndex = 1;
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            break;
          }
        }
      });

      await page.evaluate((note: string) => {
        const t = Array.from(document.querySelectorAll("textarea")).find(ta => ta.placeholder?.toLowerCase().includes("note"));
        if (t) { t.value = note; t.dispatchEvent(new Event("input", { bubbles: true })); }
      }, `Booked via Facebook Messenger. Service: ${service}. Date: ${date} at ${time}.`);

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const btn = btns.find(b => /register patient/i.test(b.textContent ?? ""));
        if (btn) btn.click();
      });
      await page.waitForTimeout(4000);
      console.log("Patient registered!");
    }

    const serviceKeyword = service.split(" ")[0].replace(/[™®]/g, "").trim();
    const serviceInput = await page.$('input[placeholder*="Search services"]');
    if (serviceInput) {
      await serviceInput.type(serviceKeyword, { delay: 50 });
      await page.waitForTimeout(2000);
      await page.evaluate((kw: string) => {
        const items = Array.from(document.querySelectorAll('[class*="service"],[class*="result"],[class*="item"],li'));
        const match = items.find(i => i.textContent?.toLowerCase().includes(kw.toLowerCase()));
        if (match) (match as HTMLElement).click();
        else if (items[0]) (items[0] as HTMLElement).click();
      }, serviceKeyword);
      await page.waitForTimeout(1000);
    }

    const time24 = convertTo24Hr(time);
    const dateFormatted = formatDate(date);
    await page.evaluate((d: string, t: string) => {
      const di = document.querySelector('input[type="date"]') as HTMLInputElement;
      if (di) { di.value = d; di.dispatchEvent(new Event("change", { bubbles: true })); }
      const ti = document.querySelector('input[type="time"]') as HTMLInputElement;
      if (ti) { ti.value = t; ti.dispatchEvent(new Event("change", { bubbles: true })); }
    }, dateFormatted, time24);
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => /book appointment|book|confirm/i.test(b.textContent ?? ""));
      if (btn) btn.click();
    });
    await page.waitForTimeout(4000);

    const success = await page.evaluate(() => {
      const body = document.body.textContent?.toLowerCase() ?? "";
      return body.includes("success") || body.includes("confirmed") || body.includes("booked");
    });

    console.log("Result:", success ? "SUCCESS" : "UNCERTAIN");
    res.json({ success, message: success ? "Booked!" : "Submitted — please verify" });

  } catch (err) {
    console.error("Booking failed:", err);
    res.status(500).json({ success: false, error: String(err) });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

function convertTo24Hr(t: string): string {
  const m = t.trim().toUpperCase().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/);
  if (!m) return "09:00";
  let h = parseInt(m[1]);
  const min = parseInt(m[2] ?? "0");
  if (m[3] === "PM" && h !== 12) h += 12;
  if (m[3] === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
}

function formatDate(d: string): string {
  const now = new Date();
  if (/tomorrow|bukas/i.test(d)) {
    const t = new Date(now); t.setDate(t.getDate()+1);
    return t.toISOString().split("T")[0];
  }
  const months: Record<string,number> = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  for (const [k,v] of Object.entries(months)) {
    if (d.toLowerCase().includes(k)) {
      const day = d.match(/\d+/)?.[0];
      if (day) return `${now.getFullYear()}-${String(v+1).padStart(2,"0")}-${String(parseInt(day)).padStart(2,"0")}`;
    }
  }
  const p = new Date(d);
  if (!isNaN(p.getTime())) return p.toISOString().split("T")[0];
  const t = new Date(now); t.setDate(t.getDate()+1);
  return t.toISOString().split("T")[0];
}

const PORT = process.env["PORT"] ?? 4000;
app.listen(PORT, () => console.log(`✅ Booking service on port ${PORT}`));
