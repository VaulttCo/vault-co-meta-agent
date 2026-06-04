# Competitor Intelligence System (Valentina) — Phase 8.4

Internal, **manual-sourced** competitor & creative intelligence for **Valentina**
(AI Marketing Director). It is honest by design: there is **no live external
competitor monitoring** in this phase. Everything comes from manual entry + Vault
Memory. Future automated sources are documented but **disabled**.

> **Naming:** Valentina = AI Marketing Director (Vault Core executive). Victoria =
> AI Sales Coach **product only** — unrelated to this dashboard.

## Surfaces
- **Route:** `/competitor-intel` (sidebar: *Competitor Intel · Valentina market signals*, `canViewStrategyData`).
- **Dashboard sections:** Executive Summary · Competitor Source Layer Status ·
  Offer Shift Timeline · Hook Leaderboard · Competitor Cards · Strategic Response.
- **Mission Control:** the **Action Center** links to `/competitor-intel` and shows
  the competitor signal (capture) count alongside cleaned recommendation counts.

## Data model
**`competitor_profiles`** — name, website, market_niche, service_area, offer_notes,
social_links[], meta_ad_library_url, google_business_profile_url, notes, status,
client_id?, industry?, location?, priority?, tags[], source, confidence, created_at,
updated_at, created_by, last_reviewed_at.

**`competitor_intelligence_captures`** — competitor_profile_id, client_id?,
capture_type (hook | offer | ad_copy | landing_page | pricing | positioning |
screenshot | creative_pattern | social_post | website_observation | manual_note),
hook, offer, angle, screenshot_url, ad_copy, landing_page_url,
pricing_positioning_notes, creative_pattern, source_url, source_platform,
observed_at, confidence, notes, created_at, updated_at, created_by.

Types: `src/lib/core/competitor/types.ts`. Validation/sanitization (http(s) URLs
only, capped lengths, control-char stripping): `src/lib/core/competitor/validation.ts`.
Data layer (mock-safe; in-memory starts EMPTY → honest empty states): `db.ts`.

## APIs (auth-guarded, internal-only)
- `GET /api/core/competitor-intel` — dashboard aggregate (`canViewStrategyData`).
- `GET /api/core/competitor-profiles` (read) · `POST` (create, **admin / canConnectIntegrations**).
- `GET /api/core/competitor-captures` (read) · `POST` (create, **admin / canConnectIntegrations**).

Rules: no external calls, no credentials, no raw provider payloads, no client PII;
inputs validated/sanitized; safe response shapes only.

## Strategy synthesis (Phase 8.5)

`src/lib/core/competitor/strategy.ts` (`synthesizeStrategy(profiles, captures)`) is a
**pure, read-only** function that turns the manual source layer into internal
strategy outputs, surfaced on the dashboard and returned by `GET /api/core/competitor-intel`:
`topHooks` (ranked by frequency · recency · confidence · #competitors), `offerShifts`,
`creativePatterns`, `competitorOpportunities`, `competitorRisks`,
`recommendedHumanActions`, `perCompetitor` (strongest pattern / opportunity / risk /
recommended human action), `confidence`, `coverageState`, and `sourceSummary`. It makes
no external calls, no mutation, stores no credentials/PII, and uses only human-safe
language (review / inspect / consider / prepare / test manually / compare / analyze) —
never launch / send / update campaign / change budget / contact / trigger / execute.
Valentina's tick uses the **same** synthesis so her recommendations match the dashboard.

## How Valentina uses it
`src/lib/core/competitor/valentina-signals.ts` (`runCompetitorSignals()`), called
from the end of Valentina's tick (guarded, fail-safe, mock-safe). It **reads** the
manual profiles + captures and:
- writes Vault Memory nodes: `competitor_profile`, `hook_pattern`, `offer_shift`,
  `market_signal` (idempotent), linked to Valentina + the memory core;
- emits **recommend-only** candidates ("Review competitor hook pattern…",
  "Review competitor offer / positioning shifts…") through `insertRecommendation`,
  i.e. the **Vera/Vesper quality gate**, which dedupes/suppresses competitor noise.

Valentina **never** scrapes, calls external APIs, updates Meta/GHL/Stripe, launches
ads, changes budgets, creates campaigns, sends messages, or contacts anyone.

## Vera/Vesper
Competitor recommendations flow through the standard gate, so duplicate "watch
competitor" items are merged/suppressed, weak ones downgraded, and only
mission-visible competitive shifts reach the cleaned Action Center queue.

## Future Automated Competitor Sources — DISABLED
Gated by `COMPETITOR_AUTOMATION_ENABLED` (default **false**). No code path acts on
it in 8.4 — no scraping, no external fetches, no scheduled jobs, no API key
required, no production runtime dependency.

| Source | Would read | Would produce | Safety / compliance | Human review |
|---|---|---|---|---|
| **Meta Ads Library** (API or scraper-safe workflow) | Public competitor ad creatives | hook/offer/creative captures | Respect Meta ToS + rate limits; no tokens stored client-side; GET-only; no ad mutation | All captures stay recommend-only; humans approve |
| **Website change monitoring** | Public competitor pages | offer_shift / positioning captures | Robots.txt + rate limits; no auth bypass; snapshots summarized, no raw blobs | Review before acting |
| **Social content monitoring** | Public posts | hook/creative_pattern captures | Platform ToS; no private data; summaries only | Review before acting |
| **Landing page snapshots** | Public landing pages | landing_page_pattern captures | Rate-limited; store safe summaries/URLs, not raw payloads | Review before acting |
| **Creative upload analysis** | Internally uploaded creatives | creative_pattern captures | Internal only; no external calls | Review before acting |

When activated (separate approved phase): each source writes captures into the same
internal tables, Valentina reads them exactly as manual captures, and Vera/Vesper
dedupe the resulting recommendations. **No external mutation, ever.**

## Database
`docs/competitor-intel-schema.sql` creates both tables (rerun-safe). RLS is
consistent with the other internal Vault Core tables: writes go through the
**service-role** server client (RLS bypassed server-side) — do **not** add
permissive `USING (true)` policies for authenticated users. Until the migration is
applied the dashboard runs on the in-memory store (empty by default; in-process
creates only).
