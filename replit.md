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

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## La Julieta Beauty Parañaque — Messenger Chatbot

### Architecture

The Messenger chatbot lives entirely in `artifacts/api-server/src/`:

```
src/
  routes/
    webhook.ts          ← GET /api/webhook (FB verification) + POST /api/webhook (messages)
  services/
    messengerService.ts ← Facebook Send API (sendText, sendTypingOn, quickReplies, delays)
    anyplusService.ts   ← Booking service (mock → replace with real API)
  flows/
    state.ts            ← In-memory session Map per user PSID
    intentDetector.ts   ← Keyword-based intent + service detection
    bookingFlow.ts      ← Full booking conversation state machine
    responses.ts        ← Varied Taglish response strings + quick reply payloads
```

### Environment Variables / Secrets

| Variable | Description |
|---|---|
| `PAGE_ACCESS_TOKEN` | Facebook Page Access Token (from FB Developer App → Messenger → Settings) |
| `VERIFY_TOKEN` | Your chosen verification string — must match what you enter in FB webhook settings |
| `PORT` | Auto-set by Replit |

### Connecting to Facebook

1. Go to [developers.facebook.com](https://developers.facebook.com) → Your App → Messenger → Settings
2. Under **Webhooks**, click **Add Callback URL**
3. **Callback URL**: `https://<your-replit-domain>/api/webhook`
4. **Verify Token**: the value you set as `VERIFY_TOKEN` secret
5. Subscribe to `messages` and `messaging_postbacks` events
6. Under **Access Tokens**, generate a token for the La Julieta page and save it as `PAGE_ACCESS_TOKEN`

### Conversation Flow

```
User says hi
  → Welcome message (varied)
  → Intent menu (Book / Services / Promos / Talk to Staff)
    → Book
         → Choose Service (quick replies)
         → Enter Date (free text, keyword detection)
         → Enter Time
         → Enter Name
         → Enter Mobile
         → Confirm or Edit
         → Booking confirmed (mock) with reference number
    → Services → list + offer to book
    → Promos → list + offer to book
    → Talk to Staff → handoff message
```

"Talk to Staff" quick reply is always available during booking.
