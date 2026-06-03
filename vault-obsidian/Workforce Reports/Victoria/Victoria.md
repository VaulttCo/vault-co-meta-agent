---
title: "Victoria — AI Sales Coach"
agent: Victoria
status: product
created: 2026-05-31
updated: 2026-06-02
tags: [victoria, sales-coach, product]
---

# Victoria — AI Sales Coach 🎙️

> **Naming:** Victoria is the **AI Sales Coach** — the live sales-call product. The AI Marketing
> Director role that previously lived under the name "Victoria" is now **[[Valentina]]** (the active
> Vault Core marketing executive). Victoria is **not** a Vault Core workforce executive and is **not**
> in the runtime tick; it is the live-call product surface.

**Scope:** live sales-call support — Fathom / live-listen, rep coaching, objection detection, sales
call summaries, deal risk, follow-up coaching, sales-training intelligence.

**Where it lives:** `src/lib/victoria/**`, `/api/victoria/**`, `/victoria` (+ `victoria_*` Supabase
tables). Purple "Victoria AI" theme.

## Guardrails
Read / analyze / coach only. No external mutation, no sending, no auto-execution. Live transcription
tokens are short-lived and auth-gated; all Victoria API routes require auth + AI-builder permission.

## Related
- [[Valentina]] (AI Marketing Director — the renamed marketing executive) · [[_Index]] · [[Roadmap]]
