# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Browser automation**: Playwright (Chromium via Nix store)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

---

## La Julieta Beauty Parañaque — Messenger + Instagram DM Chatbot

**Production URL**: https://ljbcpquechat.replit.app  
**Facebook Page ID**: 113154861204538  
**Clinic Hours**: Tuesday–Sunday, 9:00 AM – 6:00 PM (Closed Mondays)  
**Branch**: Parañaque — One Oasis Bldg., Jackie Lou Ville Ave., BF Homes  
**Default Staff**: Laicel Esporlas  

### Architecture

```
artifacts/api-server/src/
  routes/
    webhook.ts              ← GET+POST /webhook — FB/IG verification + message handling
    admin.ts                ← /api/admin/* — login, clients, stats, retry booking, persistent menu
  services/
    messengerService.ts     ← Facebook Send API (text, quick replies, typing indicators, delays)
    anyplusService.ts       ← Playwright browser automation → AnyPlusPro booking system
    clientService.ts        ← upsertClient(), logMessage() — PostgreSQL persistence
    telegramService.ts      ← Telegram admin alerts (Talk to Agent, booking success/failure)
  flows/
    state.ts                ← In-memory session Map per PSID — booking steps, email, concern
    intentDetector.ts       ← Keyword-based intent, service detection, skin concern detection
    bookingFlow.ts          ← Full conversation state machine (all flows)
    responses.ts            ← All message strings, pricelists, promos, schedule validation

artifacts/chatbot-landing/src/
  App.tsx                   ← Admin dashboard (login, stats, client table, filters, chat history)
```

### Conversation Flows

```
User messages
  → Welcome + Intent Menu
    ├── 💆 Facial Treatments → pricelist → book
    ├── ✨ Skin Concerns → pick concern (Acne/Dull/Whitening/Anti-Aging/Sensitive)
    │     └── Whitening → asks Facial or Gluta IV Drip
    │           └── Gluta → Safety Screening (5 questions)
    ├── 💉 Injectables / Gluta → Safety Screening (5 questions) → pricelist → book
    ├── 🎉 Promos → list promos
    ├── 📅 Book Appointment
    │     → Choose Service → Date* → Time* → Name → Mobile → Email (optional/skip)
    │     → Final Confirmation summary → YES → AnyPlusPro automation (background)
    │                                        → Telegram alert (success or failure)
    └── 👩‍⚕️ Talk to Agent → handoff message + Telegram alert

  *Schedule validation: Tue–Sun only, 9AM–6PM. Blocks Mondays and outside hours.
```

### Safety Screening (Injectables & Gluta)

Triggered for: IV Drip, Slimming / Fat Dissolve, Lemon Bottle Fat Dissolve, Mesolipo, Gluta IV Drip

5 questions (any YES → stops, flags client, suggests non-invasive alternative):
1. Pregnant?
2. Breastfeeding / lactating?
3. Allergy to injections?
4. Currently taking medication?
5. Any existing medical condition?

All NO → cleared → show injectable pricelist → proceed to booking.

### AnyPlusPro Browser Automation

File: `artifacts/api-server/src/services/anyplusService.ts`

Flow (runs in background after client confirms YES):
1. Login to AnyPlusPro
2. Select branch Parañaque if prompted
3. Navigate POS → Appointments → Book Appointment
4. Search patient by mobile → select if found, else Register New
5. Register patient (name, mobile, email, lead source: Facebook Messenger/Instagram DM, staff: Laicel Esporlas, notes)
6. Search service by keyword (see SERVICE_KEYWORDS map)
7. Set date + time
8. Set assigned staff → Laicel Esporlas
9. Add booking notes (channel, concern, name, PSID)
10. Submit → detect success/failure
11. Save screenshot to `logs/screenshots/`
12. Update DB: `anypluspro_status` = `auto_booked` or `manual_booking_required`
13. Send Telegram alert (success or failure with screenshot path)

**Service keyword map** (edit in `anyplusService.ts` → `SERVICE_KEYWORDS`):
```json
{
  "acne": ["acne", "acne facial", "pimple", "acneklear"],
  "facial": ["facial", "cleaning", "basic facial", "hydraglow", "oxygeneo", "backne"],
  "gluta": ["gluta", "drip", "iv drip", "whitening drip", "immune booster"],
  "anti_aging": ["anti-aging", "hifu", "ultraformer", "thermagic", "rf"],
  "slimming": ["slimming", "fat dissolve", "lemon bottle", "mesolipo"],
  "microneedling": ["microneedling", "bb glow", "prp", "salmon dna"],
  "laser": ["laser", "skin rejuve", "pico", "carbon peel", "hair removal"],
  "warts": ["warts", "warts removal"]
}
```

If no service match: marks `manual_booking_required`, sends Telegram alert.

### Email Collection

After mobile number, bot asks for email with full consent text:
- Client types email → saved + `email_consent = true`
- Client types SKIP → `email_consent = false`
- Invalid email → re-prompts with Skip option

### Telegram Alerts

Triggers:
- 🚨 **Talk to Agent** — instant alert with name, PSID, channel, concern, last message
- ✅ **Auto-Booking Success** — name, mobile, service, date/time, reference no, screenshot path
- ⚠️ **Auto-Booking Failed** — name, mobile, service, error message, screenshot path (staff must manually book)

### Environment Variables / Secrets

| Variable | Description |
|---|---|
| `PAGE_ACCESS_TOKEN` | Facebook Page Access Token |
| `VERIFY_TOKEN` | Webhook verification token |
| `SESSION_SECRET` | Express session secret |
| `ADMIN_USERNAME` | Admin dashboard login username |
| `ADMIN_PASSWORD` | Admin dashboard login password |
| `TELEGRAM_BOT_TOKEN` | From @BotFather on Telegram |
| `TELEGRAM_ADMIN_CHAT_ID` | Numeric chat ID — get from @userinfobot after sending /start to bot |
| `ANYPLUSPRO_LOGIN_URL` | AnyPlusPro login page URL |
| `ANYPLUSPRO_USERNAME` | AnyPlusPro account email |
| `ANYPLUSPRO_PASSWORD` | AnyPlusPro account password |
| `ANYPLUSPRO_BRANCH_NAME` | `Paranaque` (set) |
| `ANYPLUSPRO_DEFAULT_STAFF` | `Laicel Esporlas` (set) |
| `ANYPLUSPRO_HEADLESS` | `true` (set) |

### Admin Dashboard

URL: `https://ljbcpquechat.replit.app/` (login with ADMIN_USERNAME / ADMIN_PASSWORD)

**Stat cards**: Total, Bookings, Confirmed, Auto-Booked, Manual Required, Talk to Agent, Skin Concerns, Safety Flagged, Email Collected, Email Consented, Inquiries, For Follow-up

**Filters**: All, Booking Requests, Talk to Agent, Manual Booking, Auto-Booked, Skin Concerns, Safety Flags, Pregnant, Injection Allergy, Confirmed, Follow-up

**Table columns**: Client (name, channel, last message), Contact (mobile, email, consent), Concern/Service, Booking (date/time/ref#), Safety Flags, AnyPlusPro Status, Lead Status

**Action buttons per client**: Chat (view full history), Retry Auto-Booking, Mark Manually Booked, Confirm, Follow-up, Cancel

**Header buttons**: Setup Messenger Persistent Menu (one-time), Log out

### PostgreSQL Schema — `clients` table

| Column | Type | Description |
|---|---|---|
| psid | text | FB/IG sender ID (unique) |
| name | text | Full name |
| mobile | text | Mobile number |
| email | text | Email (optional) |
| email_consent | boolean | Whether email was explicitly provided |
| notes | text | Additional notes |
| status | text | inquiry / confirmed / needs_followup / cancelled / escalated |
| lead_status | text | new_lead / browsing / skin_concern_inquiry / booking_requested / booking_confirmed / escalated / safety_flagged / injectable_cleared / manual_booking_required |
| service | text | Chosen service |
| booking_date | text | Preferred date |
| booking_time | text | Preferred time |
| reference_no | text | Booking reference |
| channel | text | messenger / instagram |
| concern | text | Skin concern (acne / dull_skin / whitening / anti_aging / sensitive_skin) |
| recommended_service | text | Bot-recommended service |
| safety_flags | text | Comma-separated: pregnant, breastfeeding, injection_allergy, medication, medical_condition |
| intent | text | Detected intent |
| anypluspro_status | text | pending / auto_booked / manual_booking_required / skipped |
| anypluspro_error | text | Error message if automation failed |
| anypluspro_screenshot | text | Relative path to screenshot file |

### Connecting to Facebook / Instagram

1. Go to [developers.facebook.com](https://developers.facebook.com) → Your App → Messenger → Settings
2. Under **Webhooks** → **Add Callback URL**:
   - Callback URL: `https://ljbcpquechat.replit.app/webhook`
   - Verify Token: value of `VERIFY_TOKEN` secret
   - Subscribe to: `messages`, `messaging_postbacks`
3. For Instagram DM: same webhook URL, subscribe to `instagram_manage_messages`
4. After login to admin dashboard → click **Setup Menu** button (sets Messenger persistent menu)

### Playwright Chromium Path

Using Nix store binary:  
`/nix/store/0n9rl5l9syy808xi9bk4f6dhnfrvhkww-playwright-browsers-chromium/chromium-1080/chrome-linux/chrome`

Screenshots saved to: `logs/screenshots/` (served at `/logs/screenshots/` via Express static)

### To Fix Telegram "chat not found"

1. Open Telegram → search for `@ljbcbot` → send `/start`
2. Then go to `https://api.telegram.org/bot<TOKEN>/getUpdates` to get your actual numeric chat ID
3. Update `TELEGRAM_ADMIN_CHAT_ID` secret with the numeric ID (e.g. `123456789`)
