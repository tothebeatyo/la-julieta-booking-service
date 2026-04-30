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
  console.log("Booking:", { name, service, date, time });
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env["PUPPETEER_EXECUTABLE_PATH"] || undefined,
      args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setDefaultTimeout(60000);
    await page.setRequestInterception(true);
    page.on("request", req => {
      ["image","media","font"].includes(req.resourceType()) ? req.abort() : req.continue();
    });
    await page.goto(ANYPLUSPRO_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);
    await page.type('input[type="email"]', USERNAME, { delay: 50 });
    await page.type('input[type="password"]', PASSWORD, { delay: 50 });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    const loginFailed = await page.evaluate(() => document.body.textContent?.toLowerCase().includes("sign in") ?? false);
    if (loginFailed) throw new Error("Login failed");
    console.log("Login OK");
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll("a,button,div,li")).find(e => e.textContent?.toLowerCase().includes("appointment"));
      if (el) (el as HTMLElement).click();
    });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.toLowerCase().includes("appointment"));
      if (btn) btn.click();
    });
    await page.waitForTimeout(3000);
    const isOld = /old/i.test(clientType ?? "new");
    if (isOld) {
      const si = await page.$('input[placeholder*="Search by name"]');
      if (si) {
        await si.type(name.split(" ")[0], { delay: 50 });
        await page.waitForTimeout(2000);
        await page.evaluate((n: string) => {
          const r = Array.from(document.querySelectorAll('[class*="result"],[class*="option"],li'));
          const m = r.find(x => x.textContent?.toLowerCase().includes(n.toLowerCase()));
          if (m) (m as HTMLElement).click(); else if (r[0]) (r[0] as HTMLElement).click();
        }, name.split(" ")[0]);
      }
    } else {
      await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll("button,a,span,div")).find(e => e.textContent?.trim().toLowerCase().includes("register new"));
        if (el) (el as HTMLElement).click();
      });
      await page.waitForTimeout(2000);
      const parts = name.trim().split(" ");
      await page.waitForSelector('input[placeholder="First name"]', { timeout: 10000 }).catch(() => {});
      await page.type('input[placeholder="First name"]', parts[0] ?? name, { delay: 50 });
      await page.type('input[placeholder="Last name"]', parts.slice(1).join(" ") || "-", { delay: 50 });
      if (phone) {
        await page.evaluate((p: string) => {
          const i = Array.from(document.querySelectorAll("input")).find(x => x.placeholder?.includes("9XX") || x.type === "tel");
          if (i) { i.value = p; i.dispatchEvent(new Event("input", { bubbles: true })); }
        }, phone);
      }
      await page.evaluate(() => {
        const sel = Array.from(document.querySelectorAll("select")).find(s => s.closest("div")?.textContent?.toLowerCase().includes("lead"));
        if (sel) {
          const opt = Array.from(sel.options).find(o => /facebook|social|online/i.test(o.text));
          if (opt) sel.value = opt.value; else if (sel.options.length > 1) sel.selectedIndex = 1;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      await page.evaluate((note: string) => {
        const t = Array.from(document.querySelectorAll("textarea")).find(x => x.placeholder?.toLowerCase().includes("note"));
        if (t) { t.value = note; t.dispatchEvent(new Event("input", { bubbles: true })); }
      }, `Booked via Facebook Messenger. Service: ${service}. Date: ${date} at ${time}.`);
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => /register patient/i.test(b.textContent ?? ""));
        if (btn) btn.click();
      });
      await page.waitForTimeout(4000);
    }
    const kw = service.split(" ")[0].replace(/[™®]/g, "").trim();
    const si2 = await page.$('input[placeholder*="Search services"]');
    if (si2) {
      await si2.type(kw, { delay: 50 });
      await page.waitForTimeout(2000);
      await page.evaluate((k: string) => {
        const items = Array.from(document.querySelectorAll('[class*="service"],[class*="result"],[class*="item"],li'));
        const m = items.find(i => i.textContent?.toLowerCase().includes(k.toLowerCase()));
        if (m) (m as HTMLElement).click(); else if (items[0]) (items[0] as HTMLElement).click();
      }, kw);
      await page.waitForTimeout(1000);
    }
    const t24 = convertTo24Hr(time);
    const df = formatDate(date);
    await page.evaluate((d: string, t: string) => {
      const di = document.querySelector('input[type="date"]') as HTMLInputElement;
      if (di) { di.value = d; di.dispatchEvent(new Event("change", { bubbles: true })); }
      const ti = document.querySelector('input[type="time"]') as HTMLInputElement;
      if (ti) { ti.value = t; ti.dispatchEvent(new Event("change", { bubbles: true })); }
    }, df, t24);
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => /book appointment|book|confirm/i.test(b.textContent ?? ""));
      if (btn) btn.click();
    });
    await page.waitForTimeout(4000);
    const success = await page.evaluate(() => {
      const body = document.body.textContent?.toLowerCase() ?? "";
      return body.includes("success") || body.includes("confirmed") || body.includes("booked");
    });
    console.log("Result:", success ? "SUCCESS" : "CHECK ANYPLUSPRO");
    res.json({ success, message: success ? "Booked!" : "Submitted - please verify in AnyPlusPro" });
  } catch (err) {
    console.error("Error:", err);
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
  if (/tomorrow|bukas/i.test(d)) { const t = new Date(now); t.setDate(t.getDate()+1); return t.toISOString().split("T")[0]; }
  const months: Record<string,number> = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  for (const [k,v] of Object.entries(months)) {
    if (d.toLowerCase().includes(k)) { const day = d.match(/\d+/)?.[0]; if (day) return `${now.getFullYear()}-${String(v+1).padStart(2,"0")}-${String(parseInt(day)).padStart(2,"0")}`; }
  }
  const p = new Date(d);
  if (!isNaN(p.getTime())) return p.toISOString().split("T")[0];
  const t = new Date(now); t.setDate(t.getDate()+1); return t.toISOString().split("T")[0];
}

const PORT = process.env["PORT"] ?? 4000;
app.listen(PORT, () => console.log(`Booking service on port ${PORT}`));
