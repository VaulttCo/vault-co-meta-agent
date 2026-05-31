---
title: "ADR-0002: Command Hub Integration"
status: accepted
created: 2026-05-31
tags: [adr, vault-core, phase-2, command-hub]
---

# ADR-0002: Command Hub Integration

- **Status:** accepted
- **Date:** 2026-05-31
- **Owner:** Nick (admin)
- **Related systems:** Vault Memory, Command Hub, Approvals, Vega

## Decision

Turn agent recommendations into **actionable, human-reviewed intelligence** by extending
Phase 1's `vault_recommendations` rather than reusing the Meta-specific `approvals` table.

- Add traceability + review columns: `influence_score`, `revenue_impact`, `related_clients`,
  `related_campaigns`, `related_conversations`, `related_node_ids`, `reviewed_by/at`,
  `review_notes`, `implemented_at`.
- New status model: `pending_review → approved | rejected | archived | implemented`.
- New `vault_recommendation_reviews` table retains the **full decision trail**.
- New role-guarded APIs: list, detail+trace, review action.
- UI: a **Vault Core Recommendations** section in Command Hub + a full `/recommendations`
  console with a traceability detail drawer (source intelligence, contributing agents,
  scores, related entities, review history).

## Reason

The existing `approvals` table is Meta/draft-specific and lacks the influence/confidence/
traceability fields. Recommendations need their own first-class workflow while Vault Memory
remains the source of truth.

## Alternatives considered

- **Reuse `approvals` table** — rejected: wrong shape, no traceability fields, different
  status semantics.
- **Auto-execute approved recommendations** — explicitly rejected. Human approval is mandatory.

## Tradeoffs

- Two parallel approval concepts (Meta drafts vs Vault Core recs). Acceptable: different
  domains, different reviewers' mental models.

## Impact

**Hard safety rule preserved:** reviewing/approving a recommendation updates Vault Memory and
appends an audit record ONLY. Nothing is sent, published, launched, edited, or deleted on any
client/external system. Read / analyze / recommend.

## Related
- [[ADR-0001-vault-core-architecture]]
- [[Vega]] · [[_Index]]
