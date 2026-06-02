// Vault Core — Vault Co Identity Core (Phase 6.8).
//
// The permanent, code-defined source of truth for WHO Vault Co is: positioning,
// audience, offer, voice, messaging principles, objection handling, what to
// avoid, and internal operating principles. Importable by every executive so the
// workforce shares one understanding of the company. Pure data — no I/O, no secrets.
//
// This is the canonical identity; `ingest.ts` mirrors it into Vault Memory as
// company_identity / brand_voice / ... nodes, and the Obsidian "Vault Co Identity
// Core" note is the human-readable copy.

import type { VaultNodeCategory } from "../types";

export const VAULT_CO_IDENTITY = {
  positioning:
    "Vault Co is a high-ticket Meta ads + AI fulfillment partner for home-service contractors. We don't sell 'leads' — we install a predictable booked-appointment system and run it like an operator, not a vendor.",
  veronicaPositioning:
    "Veronica is Vault Co's AI media buyer and fulfillment console — campaign intelligence, drafts, and approval-gated execution. Veronica assists operators; humans approve every external action.",
  vaultCorePositioning:
    "Vault Core is Vault Co's private AI operating system — an always-on executive workforce (intelligence, marketing, finance, conversations, executive oversight) that reads, analyzes, and recommends. Humans decide.",
  targetMarket:
    "Owner-operated home-service businesses — roofing first, then HVAC, remodeling, and landscaping. Typically $1M–$10M revenue, doing some marketing but with inconsistent, unpredictable lead flow and weak follow-up.",
  coreOffer:
    "Done-for-you Meta advertising + speed-to-lead follow-up that turns ad spend into booked, qualified appointments — managed, reported, and continuously optimized. Setup + monthly management, with performance tracked transparently.",
  salesPhilosophy:
    "Diagnose before pitching. Quantify the cost of inconsistent lead flow. Sell the booked-appointment outcome and the system behind it — never 'more leads'. Speed and specificity win; generic and slow loses.",
  brandVoice: [
    "Premium, direct, operational — an operator talking to an operator.",
    "Confident and specific; concrete numbers over hype.",
    "Calm authority — never desperate, never salesy.",
    "Plain language a contractor respects; no jargon, no buzzwords.",
  ],
  messagingPrinciples: [
    "Respond to hot inbound within minutes — speed-to-lead is the #1 booking lever.",
    "Lead with the prospect's situation/outcome, not Vault Co's features.",
    "One clear ask per message (usually: book a specific time).",
    "Use specifics (numbers, timeframes, the job) — specificity reads as competence.",
    "Urgency from real context (storm season, install windows), never fake scarcity.",
    "Short, human, mobile-readable; no walls of text.",
  ],
  objectionHandling: [
    { objection: "Price seems high", response: "Reframe to cost-per-booked-job and the cost of an empty calendar; anchor on outcome, not monthly fee." },
    { objection: "Want to compare a few quotes", response: "Acknowledge, then differentiate on the booked-appointment system + speed-to-lead, not ad management as a commodity." },
    { objection: "Tried agencies before, didn't work", response: "Name the usual failure (slow follow-up, generic creative, no system) and show how Vault Co operates differently." },
    { objection: "Not ready yet / next year", response: "Low-pressure value touch tied to season; keep the relationship warm without chasing." },
  ],
  differentiators: [
    "Operator mindset — we run the system, not just 'manage ads'.",
    "Speed-to-lead + follow-up discipline built in, not an afterthought.",
    "AI workforce (Vault Core) compounding intelligence behind every account.",
    "Transparent reporting and human-approved actions — high trust.",
  ],
  proofPoints: [
    "Booked-appointment focus with tracked show-rate, not vanity lead counts.",
    "Fast-response correlates with measurably higher booking in our own data.",
    "Storm-season / seasonal timing playbooks for roofing.",
  ],
  pricingContext:
    "Setup fee + monthly management (Vault Co retains a recurring percentage; partner splits tracked internally). Exact figures live in client_revenue_settings — pricing is outcome-anchored, not discounted to win.",
  avoid: [
    "Generic 'we generate leads' / 'grow your business' language.",
    "Overhyped AI claims ('AI magic', 'revolutionary', 'supercharge').",
    "Desperate or pushy follow-up; multiple asks in one message.",
    "Slow responses to hot inbound; long delays in nurture.",
    "Fake scarcity or made-up urgency.",
    "Promising lead volume instead of booked, qualified appointments.",
  ],
  internalPrinciples: [
    "Read · analyze · recommend · draft — humans approve every external action.",
    "Never send, publish, or mutate client systems automatically.",
    "Learn continuously from Vault Co's own history; never repeat known mistakes.",
    "Specific beats generic; fast beats slow; outcome beats feature.",
  ],
} as const;

// Identity → Vault Memory node specs (category + label + summary), seeded idempotently.
export interface IdentityNodeSpec {
  key: string;
  category: VaultNodeCategory;
  label: string;
  summary: string;
}

export function identityNodeSpecs(): IdentityNodeSpec[] {
  const id = VAULT_CO_IDENTITY;
  return [
    { key: "company_identity", category: "company_identity", label: "Vault Co — company identity", summary: id.positioning },
    { key: "target_market", category: "target_market", label: "Target market", summary: id.targetMarket },
    { key: "core_offer", category: "core_offer", label: "Core offer", summary: id.coreOffer },
    { key: "sales_positioning", category: "sales_positioning", label: "Sales philosophy", summary: id.salesPhilosophy },
    { key: "brand_voice", category: "brand_voice", label: "Brand voice", summary: id.brandVoice.join(" · ") },
    { key: "messaging_principle", category: "messaging_principle", label: "Messaging principles", summary: id.messagingPrinciples.join(" · ") },
    { key: "objection_handling", category: "objection_handling", label: "Objection handling", summary: id.objectionHandling.map((o) => `${o.objection} → ${o.response}`).join(" | ") },
    { key: "differentiation", category: "differentiation", label: "Differentiators", summary: id.differentiators.join(" · ") },
    { key: "proof_point", category: "proof_point", label: "Proof points", summary: id.proofPoints.join(" · ") },
    { key: "pricing_context", category: "pricing_context", label: "Pricing context", summary: id.pricingContext },
    { key: "internal_principle", category: "internal_principle", label: "Internal operating principles", summary: id.internalPrinciples.join(" · ") },
  ];
}
