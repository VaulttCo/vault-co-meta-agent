# Vault Core — Phase 3 Handoff

> **Naming update (2026-06-02):** the "Victoria — Marketing Director" executive described in this
> historical handoff was later renamed to **Valentina (AI Marketing Director)**. The name "Victoria"
> now refers to the AI Sales Coach product. See `docs/valentina-marketing-director-spec.md`. This
> handoff is kept as a point-in-time record.

**Status:** shipped, build clean (71 routes). Fully functional with **zero database** (mock fallback preserved). Read / analyze / recommend only — no client-side actions; human approval mandatory.

Phase 3 turns the agents into a **collaborating workforce**: Victoria activated, a Collaboration Engine, Reputation + Objectives, and System Creation Engine V1. Decision record: `ADR-0004` (in the Obsidian vault).

---

## What was built

| Area | Files |
|---|---|
| Schema | `docs/vault-core-phase3-schema.sql` — `agent_messages`, `agent_tasks`, `agent_collaborations`, `agent_objectives`, `agent_reputation`, `vault_system_proposals` |
| Types | `src/lib/core/types.ts` — Phase 3 rows/inputs + read models (`CollaborationFeedItem`, `WorkforceMember`) |
| Collab data | `src/lib/core/collab/db.ts` (mock-safe reads, no-op writes), `collab/mock.ts` (seeded), `collab/orchestrator.ts` |
| Victoria | `src/lib/core/agents/victoria/index.ts` — 2nd active executive; registered active in `registry.ts` + `agents/index.ts` |
| Runtime | `runtime/dispatcher.ts` — runs the collaboration cycle after agents; System Creation on the daily tier |
| APIs (role-guarded) | `GET /api/core/collaboration`, `GET /api/core/workforce`, `GET /api/core/proposals`, `GET /api/core/proposals/[id]`, `POST /api/core/proposals/[id]/review` |
| UI | `/workforce` (`WorkforceView.tsx`: reputation cards + objectives + collaboration feed), `/proposals` (`SystemProposals.tsx`), `CommandHubProposalsPanel.tsx` on the hub, sidebar links |

---

## Part 1 — Victoria activated
Victoria (Marketing Director) reads creative/campaign data **READ-ONLY**, surfaces the winning content/hook angle, writes a hook node + a creative recommendation, and — when the pattern is strong — **opens a collaboration** requesting Vega's impact analysis (an `agent_message` + `agent_task` to Vega). She now runs on the hourly + daily tiers alongside Vega.

> **No competitor scraping.** Per the read-only/no-external-calls rule, Victoria analyzes available portal data, not live competitor sites. Her discoveries land in Vault Memory and can be captured into Obsidian via the `/victoria` skill (runtime can't write the local vault — ADR-0003).

## Part 2 — Workforce Collaboration Engine
The orchestrator (`collab/orchestrator.ts`) advances the **standard collaboration workflow**:
`Victoria discovers → requests Vega analysis → Vega responds + completes the task → joint recommendation → Command Hub → human review → collaboration resolved`. It self-guards to mock mode (never mutates seeded data). The **Collaboration Feed** on `/workforce` visualizes intelligence moving between departments.

## Part 3 — Objectives
Each executive has measurable objectives (the spec's list) with progress, shown on their reputation card. Seeded in `collab/mock.ts` (`DEFAULT_OBJECTIVES`); reads from `agent_objectives` when present.

## Part 4 — Reputation
Per-executive Trust / Accuracy / Adoption Rate / Influence / Knowledge Contributions / Revenue Influence / Collaboration scores on `/workforce`. Seeded believable values (active agents higher); reads from `agent_reputation` when present.

## Part 5 — System Creation Engine V1
Agents propose improvements to Vault Core itself (`vault_system_proposals`) in the spec's format (Problem · Impact · Opportunity · Solution · Technical/UI Requirements · Effort · Priority · Expected Outcome). Reviewed in `/proposals` and surfaced on the Command Hub. **Approving a proposal signals intent only — nothing is built or executed automatically.** The daily tier proposes at most one improvement when none is pending (bounded, won't spam a live DB).

---

## Setup for live mode
Run `docs/vault-core-phase3-schema.sql` in Supabase (after the Phase 1 + Phase 2 schemas). Until then, seeded mock data drives `/workforce` and `/proposals` (collaborations, reputation, objectives, two proposals). Review actions in mock mode return `mockMode: true` with a "connect the database to persist" notice. Trigger a live cycle as admin via **/vault-memory → Run cycle** (`POST /api/core/tick`), which now also runs the collaboration + system-creation steps.

## Verification
- `pnpm build` ✓ (71 routes). New files lint clean.
- Mock fallback preserved across all new APIs; collaboration orchestrator self-guards to mock.
- **Note:** during verification a stale `tsconfig.tsbuildinfo` surfaced a phantom type error in a pre-existing, already-dirty file (`ai-agent/console/page.tsx`) — the current code there is correct; clearing the incremental cache resolved it. Not a Vault Core defect.

## Phase 3 success criteria — all met
Victoria activated ✔ · Collaboration Engine operational ✔ · agent communication operational ✔ · objectives visible ✔ · reputation visible ✔ · joint recommendations supported ✔ · collaboration timeline visible ✔ · System Creation Engine V1 operational ✔ · Command Hub integration maintained ✔ · Obsidian integration maintained ✔ · Vault Memory source of truth ✔ · human approval mandatory ✔ · read/analyze/recommend only ✔ · mock fallback preserved ✔ · build clean ✔

## Deferred (Roadmap)
Activate executive #3 (Valerie/Veronica) · multi-round collaboration dialogue · System Creation Engine V2 (data-aware gap detection) · knowledge-graph depth · optional Obsidian runtime bridge.
