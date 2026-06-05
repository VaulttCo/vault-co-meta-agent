#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Seed Vault Actions — DEV / MANUAL ONLY (Phase 9.1).
//
// Inserts 2–3 SAFE, INTERNAL, approval-ready test actions into `vault_actions`
// so you can exercise the /actions UI without waiting for a tick.
//
//   SEED_VAULT_ACTIONS=allow node scripts/seed-vault-actions.mjs --yes
//
// SAFETY:
//   • Refuses to run when NODE_ENV=production (never runs automatically in prod).
//   • Requires an explicit `--yes` flag (dry-runs otherwise) AND an explicit
//     break-glass env `SEED_VAULT_ACTIONS=allow` before it will write — so it can't
//     accidentally seed a production database if pointed at prod creds.
//   • Creates INTERNAL target actions only (internal adapter), approval_status
//     `pending_review` — nothing is approved, executed, sent, or mutated externally.
//   • No SMS/email/GHL/Meta/Stripe. No external calls. No workflow triggers.
//   • If Supabase env vars are absent, it prints guidance and exits 0 (no-op).
// ─────────────────────────────────────────────────────────────

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--yes");

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: NODE_ENV=production. This script is dev/manual only.");
  process.exit(1);
}

// Load NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local if present.
function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  const env = { ...process.env };
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("No Supabase service-role env found (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  console.log("In mock mode there is no table to seed — /actions shows the empty state. Nothing to do.");
  process.exit(0);
}

const now = () => new Date().toISOString();
function preview(type, title, summary) {
  return `Prepare: ${title}. ${summary} (type: ${type.replace(/_/g, " ")}, target: internal, risk: level 1 internal action).`.slice(0, 600);
}
function qualityGate() {
  return { qualityScore: 0.72, quality_score: 0.72, duplicate_score: 0, safety_status: "safe", needs_human_review: true, never_auto_execute: true, reviewed_by: ["vera", "vesper"] };
}
function generation(reason) {
  return { generation_source: "seed", generation_reason: reason, evidence_count: 2, policy_version: "9.1.0", mission_visible: true };
}

// 2–3 safe INTERNAL actions. target_system internal, risk level_1, pending_review.
const SEEDS = [
  {
    agent_id: "vanessa", action_type: "create_internal_task",
    title: "[SEED] Review today’s highest-priority client risk",
    summary: "Vanessa flagged a client risk worth a focused human review before the next cycle.",
    reason: "Executive priority surfaced from the daily brief.",
    evidence: ["Clients: acme-co", "Priority: retention signal trending down"],
    genReason: "Seeded executive priority review.",
  },
  {
    agent_id: "vega", action_type: "prepare_tracking_fix",
    title: "[SEED] Review tracking gap before campaign scaling",
    summary: "Vega detected a tracking discrepancy that should be reviewed before scaling spend.",
    reason: "Tracking integrity check from analytics signals.",
    evidence: ["Campaigns: spring-promo", "Impact: CPL attribution uncertain"],
    genReason: "Seeded tracking review.",
  },
  {
    agent_id: "vivian", action_type: "prepare_client_success_plan",
    title: "[SEED] Prepare client check-in success plan",
    summary: "Vivian prepared an internal client success plan for human review. No client is contacted.",
    reason: "Client success signal from onboarding status.",
    evidence: ["Clients: acme-co", "Impact: onboarding blocker open"],
    genReason: "Seeded client success plan review.",
  },
];

function buildRow(s) {
  return {
    agent_id: s.agent_id,
    created_by: null,
    source_type: "seed",
    source_id: null, // null → outside the generated-signal unique index, so re-runnable

    client_id: null,
    title: s.title,
    summary: s.summary,
    action_type: s.action_type,
    target_system: "internal",
    risk_level: "level_1_internal_action",
    approval_status: "pending_review",
    execution_status: "ready_after_approval",
    payload: {},
    safe_preview: preview(s.action_type, s.title, s.summary),
    reason: s.reason,
    evidence: s.evidence,
    constraints: ["Internal review only — no external system is contacted."],
    requires_approval: false,
    audit_log: [{ at: now(), actor: s.agent_id, event: "created", detail: "Seeded internal test action (dev only)." }],
    metadata: { quality_gate: qualityGate(), generation: generation(s.genReason), never_auto_execute: true, requires_human_review: true, seed: true },
    created_at: now(),
    updated_at: now(),
  };
}

const rows = SEEDS.map(buildRow);

if (!APPLY) {
  console.log(`DRY RUN — would insert ${rows.length} safe internal actions (pending_review):`);
  for (const r of rows) console.log(`  • ${r.agent_id} · ${r.action_type} · ${r.title}`);
  console.log("\nRe-run with --yes to insert. All are INTERNAL, approval-gated, and execute nothing.");
  console.log("Note: seeds carry no source_id, so each --yes run intentionally ADDS fresh [SEED] rows");
  console.log("(they are not deduped). Archive them from /actions when done testing.");
  process.exit(0);
}

// Second, explicit break-glass guard: even with --yes, refuse to write unless the
// operator has opted in via SEED_VAULT_ACTIONS=allow. This protects against running
// the script locally while pointed at PRODUCTION Supabase creds with NODE_ENV unset.
if (process.env.SEED_VAULT_ACTIONS !== "allow") {
  console.error("Refusing to insert: set SEED_VAULT_ACTIONS=allow to confirm this is a DEV database.");
  console.error(`Target Supabase: ${url.replace(/^https?:\/\//, "").split(".")[0]}…  (verify this is NOT production)`);
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase.from("vault_actions").insert(rows).select("id");
if (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}
console.log(`Seeded ${data?.length ?? 0} internal actions into vault_actions (pending_review). Open /actions to review.`);
