# Vault Co Veronica Portal — Project Handoff

**Date:** May 14, 2026  
**For:** Fresh Claude session with zero prior context  
**Branch:** main (clean — no uncommitted changes)

---

## 1. Project Overview

### What It Is

The **Vault Co Veronica Portal** is a private internal command center for the Vault Co team to manage Meta advertising campaigns for home-service clients (primarily roofing and remodeling contractors). It is a Next.js 16 app (App Router, `src/` directory, TypeScript, Tailwind CSS v4) deployed on Vercel.

**Production URL:** Not confirmed in code. Deploy via `vercel` from the main branch. The Vercel dashboard URL is the source of truth.

### Internal Command Center — Not Client-Facing

This portal is **operator-only**. Clients do not log in here. All users are Vault Co team members (admin, media_buyer, setter roles). A `client_viewer` role is defined in permissions but is not yet used in production.

### Per-Client Integration Model

Every client has independent Meta and GHL integrations. There is no global Meta account or global GHL location. Integration credentials and status live in:

1. **`integration_connections` table (Supabase)** — authoritative live connection status. This is what Veronica reads.
2. **`clients` table profile fields** (`meta_ad_account_id`, `ghl_location_id`, etc.) — backfill/display reference only. May still read "Pending" even after a successful connection. Do not use these fields as the sole source of truth for integration status.

### Current Stage

**Internal production launch.** All core systems are working. No external clients have access. The next phases are Operator Queue, Save Draft from Veronica, and eventually per-client RLS and a client-viewer portal.

---

## 2. Current Confirmed Working Systems

| System | Status | Notes |
|---|---|---|
| Auth (Supabase) | Working | Email/password via Supabase Auth; middleware redirects unauthenticated requests to `/login` |
| API route protection | Working | All API routes call `resolveServerRole()` and check `can(role, permission)` before any data access |
| PDF extraction | Working | `pdfTextExtractor.ts` — pdfjs-dist with custom CMapReaderFactory (Node.js 18-compatible fs.promises, not getBuiltinModule). Falls back to zlib extractor. CMaps bundled via `outputFileTracingIncludes` in `next.config.ts` |
| Creative Library upload/persistence | Working | Supabase Storage via `SupabaseStorageProvider`. Metadata saved to `creative_assets` table via `/api/creatives/save-metadata`. Falls back to mock storage when Supabase env vars absent |
| Image/video upload | Working | Same storage provider path as Creative Library |
| Client status control | Working | `PATCH /api/clients/[id]/status` — admin-only, updates `public.clients.status` in Supabase |
| Light/dark theme | Working | `--t-*` token system in `globals.css`. `ThemeProvider` sets `data-theme` on `<html>`. Light mode uses light token values; dark mode uses dark token values. Sidebar, Topbar, cards all use `var(--t-*)` tokens |
| Veronica live mode | Working | `POST /api/veronica` — Anthropic API when `AI_PROVIDER=anthropic` + key present; data-aware mock otherwise |
| Veronica 2.0 agents | Working | All 19 agents in `veronica-agents.ts`. Deterministic, no API calls. Run locally before Claude synthesis |
| Per-client GHL/Meta model | Working | Each client has its own credentials in `integration_connections`; credential resolver and test/sync routes per provider |

---

## 3. Important Architecture Decisions

### integration_connections Is the Authoritative Source for Live Status

The `integration_connections` table in Supabase is what the portal reads for live GHL/Meta connection status. The `clients` table profile fields (`ghl_location_id`, `meta_ad_account_id`, etc.) may still show "Pending" even after a successful connection. `buildClientBrain()` in `veronica.ts` ORs both sources together, with `integration_connections` taking precedence.

Do not use client profile fields alone to determine whether an integration is live.

### clients Table Fields Are Backfill/Fallback

Fields like `clients.meta_ad_account_id`, `clients.ghl_location_id`, `clients.meta_pixel_id`, and `clients.ghl_pipeline_id` are used for display, backfill context, and fallback when Supabase integration tables are unavailable. They are not the source of truth for live connection status.

### Veronica Is Approval-Gated Operator Mode — Not Autonomous

Veronica runs 19 deterministic agents locally, then sends agent outputs as context to one Claude synthesis call. Every agent output carries `approvalRequired: boolean`. The UI surfaces what Veronica can do now vs. what requires human approval vs. what is blocked.

**Veronica can:** analyze, diagnose, draft campaign blueprints, draft GHL workflows, draft messaging, draft reports.  
**Veronica cannot:** publish, activate, pause, push to Meta, send SMS, change GHL pipeline stages, increase budgets, send emails, or take any external live action.

This constraint is enforced in agent `whatNotToDoYet` and `approvalRequired` fields, in the synthesis prompt, and in the UI approval gating display. It is not enforced at the infrastructure level yet — it is a language/UX constraint. No live Meta/GHL write routes exist.

### No Live Meta/GHL Execution

There are no routes that push to Meta Ads API or modify GHL contacts/pipelines in production. The `/api/integrations/ghl/test` and `/api/integrations/meta/test` routes test credentials only (read-only API calls). `/api/integrations/ghl/sync` and `/api/integrations/meta/sync` are stub/read routes — they do not push data out.

### Mock Fallback Is Mandatory

Every provider method (data provider, storage provider, AI provider) falls back to mock when Supabase or Anthropic env vars are absent. The app must always render fully without a database.

---

## 4. Veronica 2.0 — All 19 Agents

All agents live in `src/lib/ai/veronica-agents.ts`. All are pure deterministic TypeScript functions — no API calls, no DB writes.

---

### 1. Client Health Agent (`client_health`)
**Purpose:** Compute a 0–100 health score and status (healthy / watch / at_risk / blocked) for one client.  
**Inputs:** `ClientBrain` — integrations, performance KPIs, intelligence, assets, drafts, reports, diagnostics.  
**Output:** `healthScore`, `status`, `riskReasons`, `topBlocker`, `nextBestAction`, `approvalRequired` (true when at_risk or blocked).  
**Restrictions:** Read-only analysis. No actions.

---

### 2. Launch Readiness Agent (`launch_readiness`)
**Purpose:** Score launch readiness against a 7-point blocking checklist (Meta Ad Account, Pixel, Facebook Page, GHL Location, GHL sync, approved creative, approved campaign draft) plus 4 non-blocking checks.  
**Inputs:** `ClientBrain` — integrations, assets, drafts, intelligence, approvals, integration connections.  
**Output:** `launchReadinessScore`, `status` (ready / almost_ready / blocked / incomplete), `missingItems`, `blockingItems`, `recommendedLaunchSequence`, `whatNotToDoYet`.  
**Restrictions:** Distinguishes what Veronica can prepare now (drafts) vs. what requires human action before launch. Campaign draft approval is a launch requirement, not a drafting blocker — Veronica can prepare one without waiting.

---

### 3. Client Intelligence Agent (`client_intelligence`)
**Purpose:** Surface positioning, buyer profile, objections, sales risks, offer angles, and recommended messaging from extracted client intelligence.  
**Inputs:** `ClientBrain.intelligence` (ClientIntelligence object from Supabase or Kaczmar hardcoded fallback).  
**Output:** `clientPositioning`, `idealCustomerSummary`, `keyObjections`, `salesProcessRisks`, `bestOfferAngles`, `recommendedMessaging`, `importantClientNotes`.  
**Restrictions:** Returns low-confidence placeholders when intelligence has not been extracted. No external calls.

---

### 4. Media Buyer Agent (`media_buyer`)
**Purpose:** Diagnose ad performance bottleneck, assess scaling readiness, and draft a budget recommendation.  
**Inputs:** `ClientBrain` — performance, integrations, approved assets, bottleneck classification.  
**Output:** `adBottleneck`, `scalingReadiness` (yes / no / caution), `budgetRecommendation`, `whatNotToDoYet`.  
**Restrictions:** `approvalRequired: true` always. Budget recommendations are drafts for human sign-off only. Do not pause campaigns, change budgets, or modify targeting without explicit operator approval.

---

### 5. GHL Follow-Up Agent (`ghl_followup`)
**Purpose:** Classify GHL connection/sync state, diagnose follow-up and booking bottlenecks, and recommend a follow-up workflow audit.  
**Inputs:** `ClientBrain` — integrations (ghlConnected, ghlLastSynced), performance, sales audit from intelligence.  
**Output:** `ghlConnected`, `ghlSynced`, `ghlStaleDays`, `followUpBottleneck`, `bookingIssue`, `pipelineIssue`, `recommendedFollowUpAudit`.  
**Restrictions:** Read-only analysis. Does not modify GHL contacts, stages, or pipelines.

---

### 6. Sales Conversion Agent (`sales_conversion`)
**Purpose:** Identify conversion bottlenecks from lead to booked appointment.  
**Inputs:** `ClientBrain` — performance (booking rate, show rate, leads, booked), intelligence (sales audit).  
**Output:** `conversionBottleneck`, `salesScriptNeeded`, `followUpFixes`, `appointmentBookingRisk`, `closeRateRisk`, `recommendedSalesAction`.  
**Restrictions:** `approvalRequired` when fixes are identified. All recommendations require human review before implementation.

---

### 7. Creative Strategist Agent (`creative_strategist`)
**Purpose:** Assess creative readiness (strong / adequate / weak / missing) and recommend asset types, shoot themes, and angles to test.  
**Inputs:** `ClientBrain` — approved/pending assets, intelligence (content planning, selling points).  
**Output:** `creativeReadiness`, `recommendedAssets`, `missingCreativeTypes`, `nextShootRecommendation`, `bestAnglesToTest`.  
**Restrictions:** `approvalRequired` when pending assets need review. Does not upload, approve, or publish assets.

---

### 8. Offer & Messaging Agent (`offer_messaging`)
**Purpose:** Generate client-specific ad hooks, offer angles, copy direction, and landing page messaging using extracted intelligence.  
**Inputs:** `ClientBrain` — intelligence (offer intelligence, buyer profile, campaign implications, brand intelligence).  
**Output:** `bestHooks`, `bestAngles`, `offerRecommendations`, `adCopyDirection`, `landingPageMessage`, `whatToAvoidSaying`.  
**Restrictions:** `approvalRequired: true` always. All copy is draft recommendation only — no publishing.

---

### 9. Reporting Agent (`reporting`)
**Purpose:** Assess report currency for active clients and recommend report generation actions.  
**Inputs:** `ClientBrain` — recent reports, client status.  
**Output:** `reportStatus` (current / stale / missing), `staleReports`, `missingReports`, `recommendedReportAction`.  
**Restrictions:** `approvalRequired` when reports are stale or missing. Reports must be reviewed by a human before client delivery. Does not send reports.

---

### 10. Operator Priority Agent (`operator_priority`)
**Purpose:** Portfolio-level triage across all clients. Surfaces critical items for today, this week, items to monitor, and things that can wait.  
**Inputs:** All `ClientBrain[]` instances, all approvals, all campaign drafts.  
**Output:** `criticalToday`, `thisWeek`, `monitor`, `canWait`.  
**Restrictions:** Read-only portfolio analysis. `approvalRequired` when pending high-priority approvals or drafts exist.

---

### 11. Client Retention Agent (`client_retention`)
**Purpose:** Assess cancellation/churn risk and recommend a save plan.  
**Inputs:** `ClientBrain` — health score, performance, reports, integrations.  
**Output:** `retentionRisk` (low / medium / high), `cancellationRiskReasons`, `savePlan`, `recommendedClientMessage`, `urgentConversationNeeded`.  
**Restrictions:** `approvalRequired: true` always. Message drafts must be reviewed before sending.

---

### 12. Upsell Opportunity Agent (`upsell_opportunity`)
**Purpose:** Identify the best upsell opportunity (retargeting, creative refresh, budget scale) when client metrics are healthy.  
**Inputs:** `ClientBrain` — health score, performance, assets, intelligence, drafts.  
**Output:** `upsellOpportunity` (none / low / medium / high), `bestUpsell`, `timing`, `reason`, `suggestedPitch`, `expectedClientBenefit`.  
**Restrictions:** `approvalRequired: true` when opportunity is high. All upsell proposals require operator review and client consent before activation.

---

### 13. Capacity & Scaling Agent (`capacity_scaling`)
**Purpose:** Assess whether the client's operational capacity supports scaling ad spend.  
**Inputs:** `ClientBrain` — intelligence (company profile: monthlyCapacity, crewCount), performance (bookingStatus, cplStatus).  
**Output:** `canScale` (yes / no / caution), `scaleLimit`, `operationalRisk`, `recommendedSpendCeiling`, `whatMustImproveBeforeScaling`.  
**Restrictions:** `approvalRequired: true` always. Spend ceiling is a draft recommendation for human approval — not a budget change.

---

### 14. Data Quality Agent (`data_quality`)
**Purpose:** Flag missing data, conflicting integration data, and unreliable metrics across one or all clients.  
**Inputs:** `ClientBrain` or all brains — diagnostics, integrations, reports, performance.  
**Output:** `dataConfidence` (high / medium / low), `missingData`, `conflictingData`, `unreliableMetrics`, `requiredFixBeforeDecision`, `safeAssumptions`.  
**Restrictions:** `approvalRequired: false` — this is a diagnostic only, not an action gate.

---

### 15. Compliance & Risk Agent (`compliance_risk`)
**Purpose:** Flag ad copy compliance risks (insurance language, guarantee claims, Meta policy violations) in campaign drafts and intelligence.  
**Inputs:** `ClientBrain` — intelligence (brand compliance notes, whatNotToSay), campaign drafts (ad copy text), service type (roofing/storm damage risk).  
**Output:** `riskLevel` (low / medium / high), `riskFlags`, `whatToReword`, `safeAlternativeCopy`, `whatNotToSay`.  
**Restrictions:** `approvalRequired` when risk level is not low. No copy publishing.

---

### 16. Landing Page CRO Agent (`landing_page_cro`)
**Purpose:** Recommend landing page conversion improvements based on extracted intelligence.  
**Inputs:** `ClientBrain` — intelligence (offer intelligence, buyer profile, campaign implications).  
**Output:** `conversionIssues`, `headlineRecommendation`, `ctaRecommendation`, `formFixes`, `trustElementsNeeded`, `landingPagePriorityFixes`.  
**Restrictions:** `approvalRequired: true` always. All CRO recommendations require human review. Does not modify any external landing page.

---

### 17. Appointment Setter Coaching Agent (`appointment_setter`)
**Purpose:** Score the setter process and surface coaching fixes for script, follow-up cadence, and objection handling.  
**Inputs:** `ClientBrain` — intelligence (sales audit: hasSalesScript, avgResponseTime, lostLeadRecovery, leadFallOffPoint), performance (show rate, booking rate).  
**Output:** `setterScore`, `setterBottleneck`, `scriptFix`, `followUpFix`, `objectionReframe`, `recommendedCallFlow`.  
**Restrictions:** `approvalRequired` when script fixes are identified. Coaching recommendations require human delivery — Veronica does not contact setters.

---

### 18. Client Communication Agent (`client_communication`)
**Purpose:** Draft a tone-appropriate client message based on retention risk and reporting status.  
**Inputs:** `ClientBrain`, plus outputs from `ClientRetentionAgent` and `ReportingAgent`.  
**Output:** `clientMessage` (draft text), `tone` (reassuring / urgent / celebratory / neutral), `talkingPoints`, `riskWarnings`, `whatNotToSay`, `nextConversation`.  
**Restrictions:** `approvalRequired: true` always. Draft must be reviewed before sending. Veronica does not send messages.

---

### 19. GHL Workflow Builder Agent (`ghl_workflow_builder`)
**Purpose:** Draft a complete speed-to-lead follow-up workflow blueprint for GHL implementation.  
**Inputs:** `ClientBrain` — intelligence (campaign implications, offer intelligence, follow-up strategy), GHL connection status.  
**Output:** `workflowName`, `trigger`, `conditions`, `actions`, `waitSteps`, `smsCopy`, `internalNotificationCopy`, `stopConditions`, `complianceNotes`, `testingChecklist`, `whatNotToAutomate`.  
**Restrictions:** `approvalRequired: true` always. This is an approval-ready blueprint — a human must build and activate the workflow in GHL directly. Veronica does not push to GHL.

---

## 5. Current Veronica Behavior

### Request Flow

1. `POST /api/veronica` receives `{ message, clientId? }`.
2. Server-side auth check via `resolveServerRole()` — body-provided userRole is ignored. Requires `canViewAiBuilder` AND `canViewStrategyData`.
3. Fetches all core portal data in parallel (clients, drafts, approvals, reports).
4. Detects the target client from `clientId` or fuzzy message matching (`clientMatchesMessage`).
5. Loads `integration_connections` from Supabase (read-only).
6. **Agent routing** (`routeToAgents`): keyword matching maps the message to relevant agent IDs. Always runs, both live and mock.
7. **Agent execution** (`runSelectedAgents`): builds `ClientBrain` for the target client (or all clients for portfolio agents). Runs each selected agent locally — no API calls.
8. **Approval gating** (`assembleApprovalGating`): aggregates `approvalRequired` flags and populates `whatVeronicaCanDoNow`, `whatRequiresHumanApproval`, `whatIsBlocked`.
9. If `AI_PROVIDER=anthropic` and key is present: sends `buildSynthesisPrompt(message, routing, bundles, ctx)` as the system prompt to `claude-sonnet-4-6` with `max_tokens: 2048`. Agent outputs are the context — not the full portal state dump.
10. On Anthropic error or mock mode: returns `mockVeronicaResponse()` — a data-aware deterministic response using the same agent outputs.
11. Response always includes: `agentsUsed`, `approvalRequired`, `whatVeronicaCanDoNow`, `whatRequiresHumanApproval`, `whatIsBlocked`, `dataConfidence`.

### UI Display (ai-agent/page.tsx)

The Veronica console UI displays:
- Which agents were used (agent chips)
- Data confidence level (high / medium / low)
- What Veronica can do now vs. what requires approval vs. what is blocked
- Related links (e.g. "Client Profile", "Campaign Builder")
- Mock mode notice when not using Anthropic

### Known Supported Prompt Patterns

Agent routing is keyword-based. These prompts reliably trigger the relevant agents:

| Intent | Example prompt |
|---|---|
| Portfolio overview | "What should I focus on today?", "What's my operator priority?" |
| Client health | "How is [client name] doing?", "What's the health score for Kaczmar?" |
| Launch readiness | "Is Kaczmar ready to launch?", "What's missing for Kaczmar?" |
| GHL status | "Is GHL connected for Kaczmar?", "What's the GHL integration status?" |
| Campaign / offer | "Draft a campaign for Kaczmar", "What hooks should we use for Kaczmar?" |
| Data quality | "Is there any data conflict for Kaczmar?", "Do I trust the Kaczmar data?" |
| Compliance | "Is there a compliance risk in the Kaczmar draft?", "What can't we say?" |
| GHL workflow | "Build a speed-to-lead workflow for Kaczmar", "Draft a GHL automation" |
| Setter coaching | "How is the setter process for Kaczmar?", "Why is the show rate low?" |
| Reporting | "Does Kaczmar have a report?", "Generate a weekly report for Kaczmar" |
| Bottleneck diagnosis | "What's wrong with Kaczmar?", "Diagnose the issue" |

---

## 6. Current Known Client: Kaczmar Builders

### Profile Summary

| Field | Value |
|---|---|
| Client ID | `kaczmar-builders` |
| Owner | Stanley Kaczmar |
| Phone | 216-210-3645 |
| Email | stan@kaczmarbuilders.com |
| Website | kaczmarbuilders.com |
| Market | Northeast Ohio |
| Services | Roof Replacement, Storm Damage Inspection, Roof Repair, Remodeling |
| Avg Job Value | $25,000 |
| Monthly Budget | $2,000/mo |
| Current Status | `onboarding` (in `src/lib/data.ts`). **Should be `setup`** — intake call is complete and intelligence is extracted, but external integrations are not yet live. This status needs to be updated in Supabase. |

### Integration Status

| Integration | Status |
|---|---|
| GHL Location | Connected via `integration_connections` in Supabase |
| GHL Pipeline ID | Missing/needs backfill — `clients.ghl_pipeline_id` shows "Pending". This causes a data mismatch diagnostic. The pipeline ID needs to be found in GHL and saved to the client profile. |
| Meta Ad Account | Missing — `clients.meta_ad_account_id` = "Pending" |
| Meta Pixel | Missing — `clients.meta_pixel_id` = "Pending" |
| Facebook Page | `fbPageId` = "KaczmarBuilders" — present in profile but not connected via `integration_connections`. Treat as unconfirmed. |
| Creative assets | None approved in production (Creative Library is empty for Kaczmar in live Supabase). |
| Campaign drafts | None approved — no `ready_for_meta` or `approved` draft in Supabase. |

### Kaczmar Intelligence

Full intelligence is extracted and hardcoded in `src/lib/clientIntelligence.ts` as `KACZMAR_INTELLIGENCE`. It was extracted from the May 2, 2026 onboarding call PDF. It is also stored in the `client_intelligence` Supabase table (populated by the extract-intelligence route).

**Positioning:** Luxury roofing for affluent NE Ohio homeowners. GAF Certified Plus. Warranty stack: 50-year manufacturer warranty + 15-year no-mph wind warranty + 10-year workmanship warranty. 0% APR financing (12–21 months). Stanley (owner) is personable and willing to be on camera. Family-owned.

**Target market:** Homeowners ages 35–65, HHI $150K–$500K+, professionals and executives, homes worth $400K–$1M+, suburbs: Hudson, Chagrin Falls, Gates Mills, Bath, Solon, Pepper Pike.

**Top offer:** Schedule a Warranty-Backed Roof Replacement Consultation.

**Key objections:** Competitor in business longer, they know someone (referral), cheaper quote elsewhere.

**What not to say:** Do not call them cheapest. Do not promise insurance approval. Do not guarantee storm damage coverage. No misleading urgency. No competitor attacks. No unverified results.

**Biggest bottleneck (client-stated):** Price shoppers comparing cheapest quotes. The solution is luxury positioning and warranty differentiation — not competing on price.

### Top Launch Blockers for Kaczmar

In priority order:
1. Meta Ad Account not connected — no campaigns can run
2. Meta Pixel not installed — no conversion tracking
3. GHL Pipeline ID needs to be found and saved — pipeline stage tracking is broken without it
4. No approved creative assets in production
5. No approved/ready campaign draft

### What Veronica Should Say About Kaczmar

Veronica should:
- Confirm GHL is connected (live `integration_connections` record exists)
- Flag Meta and Pixel as missing
- Flag GHL Pipeline ID as a data mismatch (sync active but no pipeline ID)
- Recommend connecting Meta Ad Account and Pixel as the top blockers
- Offer to draft a campaign blueprint, GHL workflow, or messaging — all approval-gated
- Reference Stanley's warranty stack and luxury positioning when discussing messaging

Veronica should not:
- Say GHL is not connected (it is connected via `integration_connections`)
- Recommend launching, activating campaigns, or pushing to Meta
- Claim the client is "active" (status should be `setup`)
- Reference mock performance stats as real (Kaczmar has 0 real leads — mock stats in `data.ts` are leftover placeholder values)

---

## 7. Recent Bug Fixes and Lessons Learned

### Creative Library Persistence Issue

**Symptom:** Uploaded creative assets disappeared on page refresh.  
**Root cause:** The `usePersistedCreativeAssets` hook was reading from localStorage as the primary source, bypassing Supabase. On reload, localStorage was cleared or not populated, so assets appeared gone.  
**Fix:** Save-metadata route (`/api/creatives/save-metadata`) now writes to Supabase `creative_assets` table. The provider reads from Supabase on load. localStorage is not used as persistence for creative assets.

### PDF Extraction Issue

**Symptom:** PDF text extraction failed on Vercel with a Node.js compatibility error.  
**Root cause:** The built-in `NodeCMapReaderFactory` in pdfjs-dist uses `process.getBuiltinModule`, which is Node.js 22+ only. Vercel runs Node.js 20.  
**Fix:** `pdfTextExtractor.ts` uses a custom `CMapReaderFactory` that reads `.bcmap` files from disk using `fs.promises` (Node.js 18+ compatible). CMaps are included in the Vercel output bundle via `outputFileTracingIncludes` in `next.config.ts`. A zlib fallback handles simple PDFs if pdfjs fails.

### Fake/Mock Data Cleanup

**Issue:** Several clients in `src/lib/data.ts` had realistic-looking mock stats (leads, revenue, etc.) that could be confused for real client data.  
**Resolution:** Mock stats are clearly labeled as placeholder data. The Kaczmar entry in `data.ts` reflects onboarding-era stats that predate any real campaigns. Do not treat any stats in `data.ts` as live performance data — real data comes from Supabase.

### GHL Status Mismatch — Source-of-Truth Fix

**Symptom:** Veronica and the client profile UI disagreed on whether GHL was connected. Profile showed "Pending" but Supabase `integration_connections` showed "connected."  
**Root cause:** `buildClientBrain()` was only reading `client.ghlLocationId` from the profile field, which still showed "Pending" after a successful GHL connection.  
**Fix:** `buildClientBrain()` now ORs `integration_connections` as the authoritative source: `ghlConnected = (!!client.ghlLocationId && !isValuePending(client.ghlLocationId)) || ghlConnFromDb`. The same pattern applies to Meta. The UI integration status display also reads from `integration_connections` directly.

### Draft vs. Launch Wording Fix

**Issue:** Some Veronica responses used wording like "launch the campaign" or "activate this" when Veronica is only allowed to draft and recommend.  
**Fix:** Agent `whatNotToDoYet` fields and the `LaunchReadinessAgent` output explicitly distinguish: "Veronica can prepare an approval-ready campaign draft now. Launch, activation, and Meta submission remain blocked until external setup and human approval are complete."

### Light Mode / Theme Token Fix

**Issue:** Light mode showed dark colors on some cards and inputs because some components used hardcoded hex values instead of `--t-*` theme tokens.  
**Fix:** Components migrated to `var(--t-surface)`, `var(--t-text)`, `var(--t-border)`, etc. The `--t-*` token system in `globals.css` switches values automatically between light and dark. Any component that still uses hardcoded hex values will break light mode.

### Status Control Route Added

**Issue:** There was no API route to change a client's lifecycle status (`onboarding` → `setup` → `active` → `paused` → `archived`).  
**Fix:** `PATCH /api/clients/[id]/status` added. Admin-only (requires `canEditClients`). Validates against the allowed status list. Updates `public.clients.status` and `updated_at` in Supabase.

### Stale Wording Fixes

Various agent output strings previously included phrases like "I'll run this campaign" or "I'll send this to Meta." These have been replaced with approval-gated language throughout `veronica-agents.ts`. If any future agent output contains a first-person action claim ("I'll do X"), it should be changed to "Veronica can prepare X for human approval."

---

## 8. Database / Source-of-Truth Notes

### Tables

| Table | Purpose |
|---|---|
| `public.clients` | One row per client. Profile fields (name, owner, contact info, service areas, offer, brand tone, notes). Integration ID fields are backfill only — not authoritative for live status. Status lifecycle managed here. |
| `public.client_intelligence` | One row per client. JSON blobs for all extracted intelligence sections (company profile, buyer profile, offer intelligence, sales intelligence, brand intelligence, campaign implications, etc.). Source for all Veronica intelligence agents. |
| `public.creative_assets` | One row per uploaded asset. Stores file metadata, storage URL, asset type, status, tags, `approved_for_ads` flag. Supabase Storage holds the actual files. |
| `public.campaign_drafts` | One row per campaign draft. Full draft structure (campaign structure, ad copy, lead form, GHL workflow, compliance check, optimization rules, etc.). Status lifecycle: `draft` → `needs_review` → `approved` → `ready_for_meta` → `live` (or `rejected` / `changes_requested`). |
| `public.reports` | One row per generated report. Stores performance metrics, summary text, wins, issues, next actions. Status: `draft` or `published`. |
| `public.integration_connections` | One row per client-provider pair. Stores `connection_status` (connected / disconnected / error / pending), `provider_account_id`, `last_synced_at`, and `metadata` JSON. **This is the authoritative source for live integration status.** |
| `client_integration_credentials` | Encrypted API keys and tokens for GHL and Meta per client. Managed by `src/lib/crypto/credentials.ts` and the `/api/integrations/credentials/*` routes. Never expose or log these values. |

### Client Status Lifecycle

```
onboarding → setup → active → paused → archived
```

| Status | Meaning |
|---|---|
| `onboarding` | Initial intake — intelligence extraction in progress |
| `setup` | Intelligence extracted, external integrations being connected |
| `active` | Fully launched, campaigns running, reporting required |
| `paused` | Campaigns paused (client request or performance issue) |
| `archived` | Offboarded client — do not delete without approval |

### Data Safety Rule

Do not delete real Supabase data (client rows, intelligence, creative assets, reports, integration connections) without explicit approval from the operator. If something looks wrong, update it — don't drop it.

---

## 9. Safety Rules

These rules are non-negotiable. Do not deviate from them in any code change.

1. **Do not expose secrets.** Never log or return `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, GHL API keys, or Meta access tokens in any API response or console output.

2. **Do not log access tokens.** The `credential-resolver.ts` and any route that handles client credentials must not log token values. Error messages must not include token contents.

3. **Do not weaken auth.** The middleware must fail closed when Supabase is misconfigured. Never add an open bypass to `/api/veronica` or any other protected route. `resolveServerRole()` must be called before any data access in every API route.

4. **Do not add live Meta/GHL write actions without explicit approval.** No route should push to Meta Ads API, modify GHL contacts, change GHL pipeline stages, or trigger GHL SMS/email automations. Any such feature requires explicit operator sign-off before implementation.

5. **Do not send SMS or email.** Veronica drafts messaging only. No route sends SMS, email, or any external notification to contacts.

6. **Do not publish, pause, or change budgets.** Campaign status changes and budget modifications require human action in Meta Ads Manager. No code should make these API calls.

7. **Do not reintroduce mock data into live pages.** Pages that read from Supabase via the data provider must not fall back to hardcoded `clients` arrays from `src/lib/data.ts` for display. The mock fallback is for when Supabase is entirely unavailable — not for individual missing rows.

8. **Do not touch Creative Library upload logic unless specifically asked.** The upload flow, storage provider, and save-metadata route are confirmed working. Changes here have broken persistence before.

9. **Do not touch PDF extraction unless specifically asked.** The custom CMapReaderFactory and zlib fallback are the result of specific Vercel compatibility fixes. Changes here will break PDF extraction on production.

---

## 10. Current Remaining Tasks — Recommended Order

1. **Veronica wording polish** — small: review remaining agent output strings for any first-person action language. Replace with approval-gated phrasing.

2. **Fix Edit Client feature** — the Edit Client modal/flow in the client profile (`/clients/[id]/page.tsx`) is incomplete. It shows an edit button but the form does not correctly update all client fields in Supabase or reload the profile after save. Needs: load current values into form, PATCH all editable fields via the existing `PATCH /api/clients/[id]/route.ts`, reload client data on success.

3. **Add Save Draft / Save Blueprint from Veronica** — when Veronica produces a campaign draft or GHL workflow blueprint, there should be a "Save Draft" button that writes it to `campaign_drafts` or surfaces it in the Approvals queue. Currently Veronica only displays blueprints — it cannot persist them.

4. **Add Operator Queue** — a dedicated queue view (separate from the Approvals page) that shows Veronica-generated items awaiting operator review: saved drafts, GHL workflow blueprints, report drafts, messaging drafts. Designed for the operator's daily workflow.

5. **Deepen GHL data sync** — the GHL sync route is a stub. Real sync should pull pipeline stage counts, contact volumes, booking counts, and setter activity into the `integration_connections.metadata` JSON so agents can use live GHL data instead of client profile stats.

6. **Deepen Meta data sync** — same pattern as GHL. Pull real campaign spend, leads, CPL, and ROAS from Meta Ads API into `integration_connections.metadata`.

7. **Add client-viewer role** — a read-only role that can see reports for their own client only. Requires per-client RLS on the `reports` table and a separate client-facing view (not the full operator portal).

8. **Add per-client RLS isolation** — currently RLS allows any authenticated user to read all client data. True per-client isolation requires org/team scoping on all tables.

9. **Custom domain** — point the Vercel deployment to a custom domain (e.g. `portal.vaultco.agency`). Currently using the Vercel-assigned URL.

---

## 11. Exact Next Recommended Prompt

Copy this verbatim to start the next Claude session:

> Read docs/veronica-portal-handoff.md first. Then fix the Edit Client feature in `src/app/clients/[id]/page.tsx`. The Edit button exists but the form does not correctly update all client fields in Supabase or reload the profile after save. Expected behavior: clicking Edit opens the modal prefilled with current client values; saving sends a PATCH to `/api/clients/[id]` with all editable fields; on success the UI reloads the client data and shows the updated values. Do not touch auth, PDF extraction, Creative Library upload, Veronica agent logic, or the status route. Only fix the edit flow.

---

## 12. Commit and Branch State

| Item | Value |
|---|---|
| Current branch | `main` |
| Git status | Clean — no uncommitted changes |
| Uncommitted files | None |

### Latest Commits

```
335201d Update veronica-agents.ts
65f225a Update veronica.ts
02a338c Create route.ts          ← /api/clients/[id]/status
f4a7b16 Update page.tsx
897b509 Update data.ts
900a23e Update page.tsx
49754a5 Create route.ts
f512b38 Update veronica-agents.ts
aa3a18e Update veronica-agents.ts
3670eea Update veronica.ts
3bc9406 Update veronica.ts
074699c Update veronica.ts
8a661f2 Update veronica-agents.ts
3121428 Update route.ts
1dbb0cc Update veronica-agents.ts
b728d20 Update veronica.ts
463a2a8 Update veronica.ts
a4f97ac Create veronica-agents.ts   ← Veronica 2.0 agents introduced
a9b3cf9 Update route.ts
0d4bf07 Update page.tsx
a053b71 Update pdfTextExtractor.ts
3068ba0 Update next.config.ts
ac7e41e Update pdfTextExtractor.ts  ← PDF extraction Vercel fix
```

All commits are on `main`. No open PRs. No pending merges.
