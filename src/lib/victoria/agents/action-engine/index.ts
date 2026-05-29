// Victoria — Action Engine Orchestrator
// Runs all post-call action agents in parallel.
// Returns a complete ActionPlan — automated follow-up, CRM sync, tasks, urgency strategy.
// Server-side only.

import { generateFollowUp, classifyFollowUpType } from "./followup-generator";
import { buildCRMSyncObject, estimateCloseProbability } from "./crm-sync";
import { generateTasks } from "./task-generator";
import { buildUrgencyStrategy } from "./urgency-reinforcement";
import type { LiveCallSession, ActionPlan, DealHealth } from "../../types";

// ─────────────────────────────────────────────────────────────
// Deal health summary builder
// ─────────────────────────────────────────────────────────────

function buildDealHealthSummary(
  session: LiveCallSession,
  closeProbability: number,
  dealHealth: DealHealth
): string {
  const { scores, objections, prospect } = session;
  const firstName = prospect.name.split(" ")[0];

  const healthLabel = {
    hot:     `🔥 Hot deal — ${firstName} is engaged and moving. Close probability: ${closeProbability}%. Act fast.`,
    warm:    `🟡 Warm deal — ${firstName} is interested but not urgently committed. Close probability: ${closeProbability}%. Build urgency and momentum in follow-up.`,
    cold:    `🔵 Cold deal — ${firstName} needs more discovery and trust before they'll move. Close probability: ${closeProbability}%. Focus on re-engaging with value.`,
    at_risk: `🔴 At-risk deal — high deal risk score (${scores.deal_risk}/100). ${objections.unresolved.length > 0 ? `${objections.unresolved.length} unresolved objection(s) left on the table.` : "Engagement and trust are low."} Aggressive re-engagement required.`,
    lost:    `⚫ Lost deal — call ended in lost/abandoned state. Attempt a re-engagement sequence if appropriate.`,
  };

  return healthLabel[dealHealth] ?? `Deal health: ${dealHealth}. Close probability: ${closeProbability}%.`;
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export async function runActionEngine(session: LiveCallSession): Promise<ActionPlan> {
  const start = Date.now();

  // Classify follow-up type first — all other agents depend on this
  const followUpType = classifyFollowUpType(session);
  const closeProbability = estimateCloseProbability(session);

  // Run all agents in parallel (none depend on each other)
  const [followupResult, tasks, urgencyStrategy] = await Promise.all([
    generateFollowUp(session),
    Promise.resolve(generateTasks(session, followUpType)),
    Promise.resolve(buildUrgencyStrategy(session)),
  ]);

  // CRM sync is synchronous — built from computed values
  const crmSync = buildCRMSyncObject(session, followUpType);
  const dealHealth = crmSync.deal_health;
  const dealHealthSummary = buildDealHealthSummary(session, closeProbability, dealHealth);

  const processing_time_ms = Date.now() - start;

  return {
    call_id: session.call_id,
    generated_at: new Date().toISOString(),
    prospect_name: session.prospect.name,
    follow_up_type: followUpType,
    deal_health: dealHealth,
    deal_health_summary: dealHealthSummary,
    follow_up_kit: followupResult.follow_up_kit,
    crm_sync: crmSync,
    tasks,
    urgency_strategy: urgencyStrategy,
    processing_time_ms,
    model: followupResult.model,
    mock_mode: followupResult.mock_mode,
  };
}
