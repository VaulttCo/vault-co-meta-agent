// Vault Core — canonical operating principles (alignment layer). PURE data — no I/O.
//
// This is the CANONICAL home of the Vault Core "internal-first" rule. It is mirrored into
// Vault Memory as an `internal_principle` node (via identityNodeSpecs() → ingest.ts + the
// mock graph), referenced by VAULT_CO_IDENTITY, and imported by the draft-builder modules so
// templates/safe previews/empty states default to Vault Co's own internal growth machine.
//
// Changing this constant changes the rule everywhere — it is the single source of truth.

export const VAULT_CORE_INTERNAL_FIRST_PRINCIPLE = `
Vault Core is for Vault Co first.

Vault Core draft builders are for Vault Co's own internal growth machine first. GHL workflows, message drafts, Meta campaign drafts, creative briefs, finance drafts, recommendations, and actions should default to Vault Co internal operations, Vault Co prospects, Vault Co ads, Vault Co content, Vault Co sales follow-up, Vault Co client success, and Vault Co revenue operations — not generic client deliverables.

Client delivery improves downstream because Vault Co's internal system improves first.

Default assumption:

- GHL workflow drafts = Vault Co internal GHL sub-account workflows
- Message drafts = Vault Co prospect, inbound lead, sales, onboarding, client-success, and internal team messages
- Meta campaign drafts = Vault Co's own ads for acquiring agency clients / roofing and home-service business owners
- Creative briefs = Vault Co's own content engine, ads, reels, founder-led content, market research, competitor response, JXN shoot briefs, and brand content
- Finance drafts = Vault Co revenue operations, setup fees, revenue share, partner splits, closeouts, payment follow-ups, and client acquisition economics

Only switch to client-specific deliverables when a specific client context is explicitly selected or the user explicitly requests a client deliverable.
`.trim();

// One-line summary for compact surfaces (Vault Memory node summary, Action Center, etc.).
export const VAULT_CORE_INTERNAL_FIRST_SUMMARY =
  "Vault Core draft builders default to Vault Co's own internal growth operations (Vault Co prospects, ads, content, sales follow-up, client success, revenue ops) first. Client-specific deliverables require an explicitly selected client context. Client delivery improves because Vault Co's internal system improves first.";

// Per-builder default intent — short, reusable strings for template defaults / UI copy.
export const INTERNAL_FIRST_DEFAULTS = {
  ghlWorkflows: "Vault Co internal GHL sub-account follow-up for prospects, sales, onboarding, and client success.",
  messageDrafts: "Vault Co prospect, inbound lead, sales, onboarding, client-success, and internal team messages.",
  metaCampaigns: "Vault Co's own Meta ads to acquire agency clients (roofing / home-service business owners).",
  creativeBriefs: "Vault Co's own content engine — founder-led content, ads, proof, market research, and brand.",
  financeDrafts: "Vault Co revenue operations — setup fees, revenue share, partner splits, closeouts, and acquisition economics.",
} as const;
