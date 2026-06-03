// Vault Core — VIVIAN signal analysis (pure, READ-ONLY, no side effects).
//
// Derives internal client-success / experience / retention signals from a PII-FREE
// client snapshot (status, onboarding phase, access-presence booleans, basic
// counts). It NEVER sees raw contact PII (emails/phones/messages), never calls
// external systems, and never mutates anything. It returns recommend-only
// candidates that always require a human to act — Vivian recommends; humans approve.

import type { ClientSuccessSnapshot } from "./data";

export type VivianRiskType =
  | "onboarding_delay"
  | "missing_access"
  | "delayed_launch"
  | "churn_risk"
  | "fulfillment_gap"
  | "low_confidence";

export type VivianSeverity = "high" | "medium" | "low";

// The shape of a Vivian recommendation candidate (internal-only, recommend-only).
export interface VivianRecommendationCandidate {
  clientId: string;
  clientName: string; // business name only — never personal contact PII
  riskType: VivianRiskType;
  severity: VivianSeverity;
  evidence: string;
  recommendedHumanAction: string; // always a HUMAN action — Vivian never executes
  confidence: number; // 0..1
  sourceSignals: string[];
  neverAutoExecute: true; // invariant — Vivian output is never auto-executed
}

const RISK_CATEGORY: Record<VivianRiskType, string> = {
  onboarding_delay: "onboarding_health",
  missing_access: "onboarding_health",
  delayed_launch: "onboarding_health",
  churn_risk: "retention_risk",
  fulfillment_gap: "client_success_signal",
  low_confidence: "client_experience_signal",
};

export function categoryForRisk(risk: VivianRiskType): string {
  return RISK_CATEGORY[risk];
}

export function priorityForSeverity(sev: VivianSeverity): number {
  return sev === "high" ? 0.8 : sev === "medium" ? 0.6 : 0.42;
}

// Access/assets check uses Meta fields only. Per the Vault Core GHL invariant,
// Vivian (executive runtime) never touches per-client GHL fields.
function checkAccess(c: ClientSuccessSnapshot): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!c.hasMetaAccount) missing.push("Meta ad account");
  if (!c.hasPixel) missing.push("Meta pixel");
  return { ok: missing.length === 0, missing };
}

/**
 * Analyze PII-free client snapshots and return recommend-only client-success
 * candidates. Pure + deterministic. Each candidate names a clear next HUMAN
 * action and never implies the AI took an external action.
 */
export function analyzeClientSuccess(clients: ClientSuccessSnapshot[]): VivianRecommendationCandidate[] {
  const out: VivianRecommendationCandidate[] = [];

  for (const c of clients) {
    const inOnboarding = c.status === "setup" || c.status === "onboarding";
    const access = checkAccess(c);
    const activeCampaigns = c.activeCampaignCount;
    const leads = c.leads;

    // 1. Missing access/assets during onboarding → blocks launch.
    if (inOnboarding && !access.ok) {
      out.push({
        clientId: c.id,
        clientName: c.name,
        riskType: "missing_access",
        severity: "high",
        evidence: `Onboarding (${c.status}) with missing access: ${access.missing.join(", ")}.`,
        recommendedHumanAction:
          "A human should follow up manually to collect the missing access/assets so onboarding can proceed.",
        confidence: 0.8,
        sourceSignals: [`status:${c.status}`, `missing:${access.missing.join("|")}`],
        neverAutoExecute: true,
      });
      continue; // one primary signal per client to keep Mission Control high-signal
    }

    // 2. Delayed launch — onboarding but no active campaigns running yet.
    if (inOnboarding && activeCampaigns === 0) {
      out.push({
        clientId: c.id,
        clientName: c.name,
        riskType: "delayed_launch",
        severity: "medium",
        evidence: `Client is in ${c.status} with no active campaigns yet.`,
        recommendedHumanAction:
          "A human should review onboarding blockers and the launch plan for this client.",
        confidence: 0.66,
        sourceSignals: [`status:${c.status}`, `activeCampaigns:0`],
        neverAutoExecute: true,
      });
      continue;
    }

    // 3. Churn / retention risk — paused client.
    if (c.status === "paused") {
      out.push({
        clientId: c.id,
        clientName: c.name,
        riskType: "churn_risk",
        severity: "high",
        evidence: "Client account is paused — retention/renewal at risk.",
        recommendedHumanAction:
          "A human should check in on this client's status and review renewal readiness manually.",
        confidence: 0.7,
        sourceSignals: ["status:paused"],
        neverAutoExecute: true,
      });
      continue;
    }

    // 4. Fulfillment gap — active client but no leads yet (may feel unsupported).
    if (c.status === "active" && leads === 0) {
      out.push({
        clientId: c.id,
        clientName: c.name,
        riskType: "fulfillment_gap",
        severity: "medium",
        evidence: "Active client with 0 leads recorded — possible fulfillment/experience gap.",
        recommendedHumanAction:
          "A human should review this client's account health and recent touchpoints.",
        confidence: 0.58,
        sourceSignals: ["status:active", "leads:0"],
        neverAutoExecute: true,
      });
      continue;
    }

    // 5. Low client-intelligence/confidence signal (where available).
    if (typeof c.intelligenceScore === "number" && c.intelligenceScore < 40) {
      out.push({
        clientId: c.id,
        clientName: c.name,
        riskType: "low_confidence",
        severity: "low",
        evidence: `Client intelligence score is low (${c.intelligenceScore}).`,
        recommendedHumanAction:
          "A human should review whether this client needs more onboarding/education touchpoints.",
        confidence: 0.5,
        sourceSignals: [`intelligenceScore:${c.intelligenceScore}`],
        neverAutoExecute: true,
      });
    }
  }

  return out;
}
