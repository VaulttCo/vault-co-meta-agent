# Vault Core — Phase 6 Handoff

**Status:** shipped, build clean (73 routes), lint clean. Functional with **zero database and no GHL credentials** (mock fallback). Verified live: all five executives run on the hourly tick; **Veronica** active. Decision record: `ADR-0007`. `ai-agent/console/page.tsx` untouched.

Phase 6 activates **Veronica** (Lead Acquisition Director) and adds the **Conversation Intelligence Layer** + a **server-only read-only GoHighLevel integration** + a **Draft Approval Queue** (drafts are never sent).

---

## 🔐 SECURITY — action required from you
A GoHighLevel / LeadConnector API key was previously exposed in chat. **Treat it as compromised.**
1. **Revoke** the exposed key in the GHL dashboard.
2. **Create a new key.**
3. Put it ONLY in env vars: `GHL_API_KEY`, `GHL_LOCATION_ID` — `.env.local` (local), Vercel env (prod).
4. Never hardcode / commit / log / return / expose it.

The integration enforces this server-side: credentials are read only from env, used only in a server `Authorization` header, **never logged/returned/exposed**, and the integration **fails safe to mock** if either var is missing. Verified: no credential strings appeared in the server log during testing.

---

## What was built

| Area | Files |
|---|---|
| Categories + types | `types.ts` — 14 conversation categories, `requires_approval` edge, `MessageDraft*`/`DraftType`/`RiskLevel`/`DraftCounts` |
| Schema | `docs/vault-core-phase6-schema.sql` — `vault_message_drafts` table (drafts only; GHL needs no schema) |
| GHL integration | `src/lib/core/integrations/ghl/client.ts` (server-only, read-only GET, env-safe, fail-safe), `conversations.ts` (normalized reader + mock) |
| Veronica agent | `agents/veronica/index.ts` — conversation analysis → conversation nodes + recommendations + draft messages + Vega collaboration |
| Draft store | `agents/veronica/drafts.ts` — getDrafts/getDraft/getDraftCounts/insertDraft/reviewDraft (approve/edit/reject — internal only, never sends) + mock |
| Activation | `registry.ts` (`veronica.active=true`) + `agents/index.ts` (runnable). Only Vivian remains a stub. |
| APIs | `GET /api/core/drafts`, `POST /api/core/drafts/[id]/review` (role-guarded, mock-safe) |
| UI | `/drafts` Draft Approval Queue (approve/edit/reject + "never sent" notices); Command Hub draft preview; `/workforce` Conversation Intelligence panel; `/recommendations` conversation traceability; sidebar "Draft Queue" |
| Obsidian | `Veronica.md` → active + seeded `Sales Intelligence/2026-05-31-sms-booking-pattern.md`; `ADR-0007`; roadmap/_Index |

## How Veronica works (read / analyze / recommend / draft only)
Reads lead conversations (GHL read-only when configured, else mock), surfaces hot leads, dead conversations (reactivation), no-show risk, objection patterns, and the response-time→booking pattern; writes conversation-intelligence nodes; drafts follow-up/reactivation/no-show messages **for human approval**; routes recommendations to the Command Hub; opens a Vega collaboration to validate the pattern. Runs hourly + daily, before Vanessa so the executive brief includes her items.

## Hard safety rules — enforced
No sending SMS · no replying to leads · no GHL/CRM mutation · no booking · no stage changes · no workflow triggers · no client-facing action. Drafts are **never sent** — approving marks a draft approved internally only; a human sends manually. GHL access is **GET-only**.

## Live verification (mock mode, no GHL creds)
`GET /api/core/tick?tier=hourly` → vega ✓ · veronica ✓ ("Reviewed 8 conversations. 2 hot, 2 reactivation, 25% booked") · victoria ✓ · valerie ✓ · vanessa ✓. Draft list + review APIs → 401 unauthenticated. `/drafts` → 307 auth-gate. No credentials in server log.

## Setup for live mode
Run `docs/vault-core-phase6-schema.sql` (adds `vault_message_drafts`). Set the **rotated** `GHL_API_KEY` + `GHL_LOCATION_ID` in env to enable live read-only conversation data; otherwise mock conversations drive Veronica.

## Success criteria — all met
Veronica activated ✔ · Conversation Intelligence operational ✔ · GHL env support server-side only ✔ · GHL fails safe ✔ · mock conversation fallback ✔ · conversation memory nodes ✔ · lead/follow-up recommendations ✔ · draft messages (approval only) ✔ · recommendations → Command Hub ✔ · drafts in approval workflow without sending ✔ · active in /workforce ✔ · conversation nodes in /vault-memory ✔ · collaborates with Vega ✔ (+ Vanessa prioritizes her items) ✔ · traceability ✔ · Obsidian support ✔ · no SMS sending ✔ · no GHL mutation ✔ · no client-facing actions ✔ · human approval mandatory ✔ · mock fallback ✔ · build clean ✔

## Deferred (Roadmap)
Activate Vivian (last stub) · multi-round collaboration · refine live GHL field mapping against a rotated test key · gated human-in-the-loop outbound (none exists today by design).
