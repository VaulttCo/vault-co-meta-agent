---
title: "Legacy GHL Automation Map"
created: 2026-06-01
tags: [workflow, legacy, ghl, automation, vault-co]
---

# Legacy GHL Automation Map

Read-only map of Vault Co's **legacy** GHL automations/workflows, with observed weaknesses and
improvement ideas. **Vault Core does not edit or trigger workflows** — analysis only. Source:
`src/lib/core/identity/legacy.ts` (`automationMap`).

| Workflow | Weakness | Improvement |
|---|---|---|
| New Lead → Speed-to-Lead | First text delayed minutes-to-hours | Auto-text < 2 min; human follow within 15 |
| Missed Call Follow-Up | Sent late; generic copy | Immediate, specific missed-call recovery text |
| Long-Term Nurture | Generic "following up" steps; ignored | Value-led, seasonal touches; single ask |
| Reactivation | Daily cadence → opt-outs | Slower, value-first cadence; clear opt-out |
| Appointment Reminder | Reminder too early; no same-day nudge | Add same-day confirmation nudge with urgency |
| **(missing) Human Takeover** | No hand-off when a lead asks a question | Add human-takeover trigger on inbound question |

## Recommendations (human review only)
- Add a human-takeover rule on inbound questions.
- Tighten missed-call and speed-to-lead timing.
- Rewrite the reactivation cadence (less frequent, value-led).
- Add a same-day appointment confirmation nudge.

New-workflow ideas and improvements are proposed to the Command Hub; **nothing is built, edited, or
triggered automatically.**

## Related
- [[Legacy GHL Messaging Lessons]] · [[Vault Co Identity Core]] · [[ADR-0009-Vault-Co-GHL-Scopes]] · [[_Index]]
