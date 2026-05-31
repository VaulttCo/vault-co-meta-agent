# Vault Core — Phase 2 Handoff

**Status:** shipped, build clean (69 routes). Fully functional with **zero database** (mock fallback preserved). Read / analyze / recommend only — no client-side actions.

Phase 2 = **Command Hub Integration** (Part 1) + **Obsidian Cognitive Layer** (Part 2).
Vault Memory remains the source of truth.

---

## Part 1 — Command Hub Integration

Agent recommendations are no longer isolated in Vault Memory — they flow into a human-reviewed pipeline:

```
Vault Memory → Agent Recommendation → Command Hub → Human Review → Approved/Rejected/Archived/Implemented → Historical Tracking
```

### What was built
| Area | Files |
|---|---|
| Schema migration | `docs/vault-core-phase2-schema.sql` — extends `vault_recommendations` (influence_score, revenue_impact, related_clients/campaigns/conversations/nodes, review fields) + new `vault_recommendation_reviews` table |
| Types | `src/lib/core/types.ts` — new `RecommendationStatus`, `ReviewAction`, extended rows, `RecommendationTrace`, `RecommendationCounts` |
| DB helpers | `src/lib/core/memory/db.ts` — `getRecommendation`, `getRecommendationReviews`, `getRecommendationCounts`, `getRecommendationTrace`, `reviewRecommendation` (transition + audit, **no execution**) |
| APIs (role-guarded) | `GET /api/core/recommendations`, `GET /api/core/recommendations/[id]`, `POST /api/core/recommendations/[id]/review` |
| UI | `/recommendations` console + traceability drawer (`VaultCoreRecommendations.tsx`), Command Hub section (`CommandHubRecommendationsPanel.tsx` on `page.tsx`), sidebar link, shared `recommendationStatus.ts` |

### Approval states & actions
- **States:** `pending_review → approved | rejected | archived | implemented`
- **Actions (operators):** Approve · Reject · Archive · Mark Implemented · Request Revision
- **Review history** retained in `vault_recommendation_reviews` (full decision trail).

### Traceability (detail drawer)
Source intelligence (graph nodes, 1-hop expanded) · contributing agents · confidence / influence / priority scores · business + revenue impact · related clients/campaigns · related recommendations · review history. The operator always sees **why** a recommendation exists.

### Permissions
- View queue + detail + act: `canViewApprovals` (admin + media_buyer = "operators").
- `setter` / `client_viewer` get a 403 and the Command Hub panel hides itself.

### Hard safety rule
Reviewing/approving updates Vault Memory and appends an audit record **only**. Nothing is sent, published, launched, edited, or deleted on any client/external system.

### Setup
Run `docs/vault-core-phase2-schema.sql` in Supabase (after the Phase 1 schema). Until then, the seeded mock recommendations (incl. one `approved` with review history) drive the UI. Review actions in mock mode return `mockMode: true` and show a "connect the database to persist" notice.

---

## Part 2 — Obsidian Cognitive Layer

A git-versioned, in-repo Obsidian vault is Vault Core's long-term **cognitive memory** (the "why").
See `ADR-0003` for the architecture decision.

> **Vault Memory stores intelligence. Obsidian stores understanding.** Obsidian never replaces Vault Memory.

### What was built
- **`vault-obsidian/`** — open this folder in Obsidian (`Open folder as vault`). 17 top-level folders incl. Architecture Decisions, Session Logs, Workforce Reports (per-executive), Veronica Design Standards, Vault Core Evolution. Seeded with `README`, `_Index` (Map of Content), **ADR-0001/0002/0003**, the founding session log, the design-standards summary, the evolution roadmap, six executive profiles, and a Vega seed report. All notes are wikilinked for the Obsidian graph view.
- **`scripts/obsidian.mjs`** — the canonical CLI (Node stdlib only): `search · new · adr · session · workforce · list · tree · path`.
- **`.claude/skills/`** — 12 Claude Code skills:
  - `/obsidian-search` `/obsidian-note` `/obsidian-summary` `/obsidian-session` `/obsidian-architecture` `/obsidian-research`
  - executive recall: `/veronica` `/victoria` `/vivian` `/valerie` `/vega` `/vanessa`

### How it's used (by Claude Code / future agents)
```bash
node scripts/obsidian.mjs search "command hub"
node scripts/obsidian.mjs session "Phase 3 kickoff"
node scripts/obsidian.mjs adr "Adopt durable job queue"
node scripts/obsidian.mjs workforce vega "New conversion pattern"
node scripts/obsidian.mjs tree
```
The skills wrap these so every agent writes notes the same way — preventing agent drift and letting future sessions continue where previous ones ended.

### Notes / limitations
- **Write surface is session-driven** (an agent runs a skill), not the Vercel runtime — Obsidian is local-markdown and the deployed app has a read-only filesystem. A runtime → GitHub/Storage bridge is a deferred option in `ADR-0003`.
- **No in-portal viewer** was built (you chose Claude Code skills only). A read-only `/vault-knowledge` page can be added later if desired.
- The vault is committed to git; open it directly in Obsidian for the native graph view.

---

## Verification
- `pnpm build` ✓ (69 routes). New files lint clean.
- Obsidian CLI exercised: `search`, `list`, `tree`, `new` (create+cleanup) all work.
- Mock fallback preserved across all new APIs.

## Deferred to Phase 3 (see `vault-obsidian/Vault Core Evolution/Roadmap.md`)
Activate executive #2 (Valerie/Victoria) · Layer 3 Collaboration Engine · Layer 6 System Creation Engine · knowledge-graph depth (filter/search/timeline) · optional Obsidian runtime bridge · optional in-portal Knowledge viewer.
