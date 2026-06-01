---
title: "ADR-0007: Veronica activation + Conversation Intelligence Layer"
status: accepted
created: 2026-05-31
tags: [adr, vault-core, phase-6, conversation, veronica, ghl, security]
---

# ADR-0007: Veronica activation + Conversation Intelligence Layer

- **Status:** accepted
- **Date:** 2026-05-31
- **Owner:** Nick (admin)
- **Related systems:** Veronica, Vault Memory, Command Hub, GoHighLevel/LeadConnector, Draft Queue

## Decision

Activate **Veronica** (Lead Acquisition Director) as the 5th runnable executive and add the
Conversation Intelligence Layer.

- **GHL read-only integration** (`src/lib/core/integrations/ghl/`): server-only client reading
  `GHL_API_KEY` + `GHL_LOCATION_ID` from env; **read-only HTTP GET only**; fails safe to mock when
  unconfigured. Credentials are never logged, returned, exposed to the client, or committed.
- **14 conversation node categories** (`conversation_insight`, `sms_pattern`, `hot_lead_signal`,
  `reactivation_opportunity`, `objection_pattern`, `appointment_risk`, `sms_draft`, …) + the
  `requires_approval` edge.
- **Draft Approval Queue** (`vault_message_drafts` table): Veronica drafts follow-up / reactivation
  / no-show-recovery / objection messages. **Drafts are NEVER sent.** Approving marks a draft
  approved INTERNALLY only — no outbound SMS, no GHL writes, no workflows.
- Veronica writes conversation intelligence + recommendations to the Command Hub and opens a Vega
  collaboration to validate the SMS booking pattern.

## Reason

The workforce needed lead/conversation intelligence to explain why leads convert, stall, and book.
GHL is the system of record for conversations; reading it (safely) lets Veronica ground her
analysis, while drafts give operators ready-to-send messages without any automation risk.

## Security (compromised key)

A GHL/LeadConnector key was previously exposed in chat → **treat as compromised**. It must be
rotated/revoked, a new key created, and stored ONLY in env vars (`.env.local` locally, Vercel in
prod). Never hardcode/commit/log/return/expose. The integration fails safe to mock if missing.

## Alternatives considered

- **Outbound sending on approval** — hard-rejected for Phase 6. No SMS, no GHL mutation, no workflows.
- **Client-side GHL calls** — rejected: credentials must stay server-only.
- **Storing conversation bodies/PII in Vault Memory** — avoided: only normalized, non-secret
  signals + short summaries are stored.

## Tradeoffs

- Live GHL mapping is best-effort and untested against a live account; any mismatch falls back to
  mock. Refine field mapping once a rotated key is available in a test location.

## Impact

Fifth active executive; Conversation Intelligence operational. Only Vivian remains a stub. Human
approval mandatory; no lead-facing action is ever automated.

## Related
- [[ADR-0005-financial-intelligence-layer]] · [[ADR-0006-executive-oversight-layer]]
- [[Veronica]] · [[Vega]] · [[Roadmap]] · [[_Index]]
