# Valentina — AI Marketing Director (SPEC / RECOMMENDATION ONLY)

**Status:** SPEC ONLY — **not active**, not in the runtime tick, not a runnable agent.
**Do not** activate Valentina, add her to `WORKFORCE` as active, wire her into the dispatcher,
or give her any external write capability based on this document. This is a design spec for a
future activation phase.

---

## Why this spec exists — the Victoria / Valentina role split

The Vault Core workforce historically shipped an executive named **"Victoria — Marketing Director."**
Separately, the platform also has a **live sales-call coaching product** (`src/lib/victoria/**`,
`/api/victoria/**`, `/victoria`) that is *also* called "Victoria." This overloaded the name.

**Corrected naming (authoritative):**

| Name | Role | What it is |
|---|---|---|
| **Victoria** | **AI Sales Coach** | The live sales-call product — Fathom/live-listen, rep coaching, objection detection, call summaries, deal risk, follow-up coaching, sales-training intelligence. |
| **Valentina** | **AI Marketing Director** | The marketing-strategy executive role — campaign direction, creative strategy, offer positioning, ad diagnosis, hooks/copy/angles, content calendar, market intelligence, growth recommendations. |

> The currently-active Vault Core executive registered under id `victoria` (title "Marketing
> Director") performs the **Valentina** (AI Marketing Director) role. In a future activation phase
> that executive will be renamed/repositioned to **Valentina**, and the **Victoria** name will refer
> exclusively to the AI Sales Coach. **No runtime change is made now** — this spec only records the
> intended split so docs and audits are consistent.

---

## Victoria — AI Sales Coach (scope, for contrast — already built)

Victoria is the **AI Sales Coach** and is scoped to the sales-call domain only:
- Live sales call support · Fathom / live-listen
- Rep coaching · objection detection
- Sales call summaries · deal risk
- Follow-up coaching · sales-training intelligence

Victoria is **not** a marketing director and should not be documented or prompted as one.

---

## Valentina — AI Marketing Director (responsibilities)

1. **Marketing strategy** — overall marketing direction per client and across the portfolio.
2. **Meta / Google campaign direction** — what to run, budget posture, audience direction (recommendations only; never executes).
3. **Creative strategy** — creative angles, formats, testing direction.
4. **Offer positioning** — offer framing, guarantees, risk-reversal, differentiation.
5. **Ad performance diagnosis** — read spend/CPL/CTR/quality signals and explain *why* performance is what it is.
6. **Hook / copy / angle recommendations** — concrete, client-specific (no generic filler).
7. **Content calendar recommendations** — cadence and themes.
8. **Market intelligence** — competitor and category insight.
9. **Client growth recommendations** — what would move the needle next.
10. **Coordination with Veronica** — feed marketing direction into Veronica's campaign drafts; Veronica owns the draft, Valentina owns the strategy.

## Hard guardrails (must hold when/if activated)

- **Read / analyze / recommend / draft only.** No external mutation of any kind.
- No GHL/CRM mutation, no Stripe mutation, no Meta/Google write actions, no SMS/email sending, no workflow triggers.
- GHL access (if any) is GET-only and **Vault-Co-only** (`VAULT_CO_GHL_*`) per the Vault Core invariant — never per-client sub-accounts from runtime.
- Outputs are recommendations/drafts routed through the existing human-approval surfaces; approving never auto-executes.
- Mock-safe: must function with no DB / no env (fail-safe to mock), like every other executive.

## Boundary with Veronica (Lead Acquisition Director)

- **Valentina** = marketing strategy & direction (the "what/why").
- **Veronica** = lead acquisition + campaign **draft** assembly (the "build"), already active.
- Valentina produces strategy → opens a collaboration / recommendation → Veronica drafts → human approves. No auto-handoff that executes anything.

## Activation checklist (FUTURE phase — not now)

- [ ] Add `agents/valentina/index.ts` (read-only analysis → nodes/recommendations/collaborations).
- [ ] Reposition the registry: rename the marketing executive to `valentina` (or add Valentina + retire the marketing function from `victoria`), keeping Victoria as the AI Sales Coach.
- [ ] Wire into the dispatcher/tick (hourly+daily), preserving agent execution order rules.
- [ ] Obsidian: `Workforce Reports/Valentina/` + ADR for the rename.
- [ ] Migrate marketing-intelligence knowledge currently filed under Victoria to Valentina.
- [ ] Re-run Hermes QA + Codex; confirm no P0/P1 and the Vault Core GHL invariant still holds.

Until every box above is intentionally completed in a dedicated phase, **Valentina remains a spec.**
