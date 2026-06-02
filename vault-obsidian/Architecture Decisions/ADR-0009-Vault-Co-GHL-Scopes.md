---
title: "ADR-0009: Vault Co GHL scopes + Identity Core"
status: accepted
created: 2026-06-01
tags: [adr, vault-core, phase-6-8, ghl, identity, security]
---

# ADR-0009: Vault Co GHL scopes + Identity Core

- **Status:** accepted
- **Date:** 2026-06-01
- **Owner:** Nick (admin)
- **Related systems:** Vault Co Identity Core, GHL integration, Vault Memory, Command Hub, Obsidian

## Decision

Add a permanent **Vault Co Identity Core** and connect Vault Co's GHL sub-accounts as **read-only**
sources — scoped to exactly two Vault Co-owned accounts, never client accounts.

### GHL scopes (read-only, server-only, GET-only)
- **Current Vault Co sub-account** → `VAULT_CO_GHL_API_KEY` / `VAULT_CO_GHL_LOCATION_ID`
  (generic `GHL_API_KEY` / `GHL_LOCATION_ID` accepted as backward-compat fallback for *current* only).
- **Legacy Vault Co sub-account** → `VAULT_CO_LEGACY_GHL_API_KEY` / `VAULT_CO_LEGACY_GHL_LOCATION_ID`
  (historical learning archive).

### Why client sub-accounts are excluded
Vault Core reads only Vault Co-owned data to learn about **Vault Co itself**. Reading client
sub-accounts would be a privacy/scope violation and is explicitly out of bounds. The client
(`src/lib/core/integrations/ghl/client.ts`) resolves **only** these two named accounts — there is
**no multi-location scanning and no looping over locations**. Each read is scoped to one configured
location id.

### How Vault Core learns without mutating
GET-only. No send/reply/update/create/delete, no workflow triggers, no pipeline changes. Legacy
conversations + automations are analyzed into `legacy_learning` nodes and improvement
recommendations; identity is mirrored into `company_identity` / `brand_voice` / … nodes. Everything
flows through the Command Hub for human review.

### How identity informs recommendations
The Identity Core (positioning, voice, audience, offer, objection handling, guardrails) is the shared
context every executive drafts against. Veronica writes more on-brand follow-ups; Vanessa codifies a
company messaging standard; Vega validates patterns; Victoria sharpens positioning.

## Alternatives considered
- **Generic multi-location GHL scan** — hard-rejected (touches client accounts; privacy/scope risk).
- **Runtime Obsidian writes** — rejected per [[ADR-0003-obsidian-cognitive-layer]]; Obsidian docs are
  authored by Claude/local workflows only.
- **Storing raw conversation PII in memory** — avoided; only normalized signals + lessons are stored.

## Security
Credentials are server-only, never logged/returned/exposed/committed. The previously-exposed key is
compromised and must be rotated before live use; until then, mock data is used (fail-safe).

## Related
- [[Vault Co Identity Core]] · [[Legacy GHL Messaging Lessons]] · [[ADR-0007-conversation-intelligence-layer]] · [[Roadmap]] · [[_Index]]
