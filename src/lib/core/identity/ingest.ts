// Vault Core — Identity + legacy-learning ingestion (Phase 6.8).
//
// Mirrors the Vault Co Identity Core into Vault Memory (idempotent) and writes
// legacy GHL learnings as memory nodes + bounded Command Hub recommendations.
// Runs on the daily tier (and manual ticks). Mock-safe: writes no-op without a
// database. Read / analyze / recommend only — nothing executes externally.

import {
  ensureNode,
  insertEdge,
  insertActivity,
  insertRecommendation,
  getRecommendations,
} from "../memory/db";
import { identityNodeSpecs } from "./vault-co-identity";
import { getLegacyAnalysis } from "./legacy";

export interface IdentityCycleSummary {
  identityNodes: number;
  legacyNodes: number;
  recommendations: number;
}

export async function runIdentityAndLearningCycle(): Promise<IdentityCycleSummary> {
  const summary: IdentityCycleSummary = { identityNodes: 0, legacyNodes: 0, recommendations: 0 };

  const coreId = await ensureNode({ category: "memory_core", label: "Vault Memory", confidence: 1 });

  // 1. Identity Core → Vault Memory (idempotent; defines the company).
  for (const spec of identityNodeSpecs()) {
    const id = await ensureNode({
      category: spec.category,
      label: spec.label,
      summary: spec.summary,
      confidence: 0.95,
      source_agent: "vault_co",
      metadata: { identity: true, key: spec.key },
    });
    if (id) {
      summary.identityNodes += 1;
      if (coreId) await insertEdge({ from_node: id, to_node: coreId, relationship: "defines", weight: 0.8, source_agent: "vault_co" });
    }
  }

  // 2. Legacy GHL learnings → Vault Memory (idempotent by title).
  const legacy = await getLegacyAnalysis();
  for (const l of legacy.learnings) {
    const id = await ensureNode({
      category: "legacy_learning",
      label: l.title,
      summary: l.detail,
      confidence: 0.72,
      source_agent: "veronica",
      metadata: { kind: l.kind, legacy: true },
    });
    if (id) {
      summary.legacyNodes += 1;
      if (coreId) await insertEdge({ from_node: id, to_node: coreId, relationship: "influences", weight: 0.6, source_agent: "veronica" });
    }
  }
  await insertActivity({
    agent: "veronica",
    kind: "insight",
    message: `Vault Core studied the legacy GHL archive (${legacy.source}${legacy.conversationsAnalyzed != null ? `, ${legacy.conversationsAnalyzed} conversations` : ""}) and refreshed Vault Co messaging lessons.`,
  });

  // 3. Bounded improvement recommendations → Command Hub (create once).
  const existing = await getRecommendations(500);
  const alreadyHasLegacyRecs = existing.some((r) => (r.metadata as { legacy?: boolean } | undefined)?.legacy === true);
  if (!alreadyHasLegacyRecs) {
    for (const rec of legacy.recommendations) {
      const id = await insertRecommendation({
        agent: rec.agent,
        title: rec.title,
        body: rec.body,
        impact: rec.impact,
        priority_score: 0.7,
        influence_score: 0.65,
        metadata: {
          confidence: 0.75,
          legacy: true,
          suggested_human_action: "Adopt into the Vault Co messaging standard / follow-up framework. Nothing sends automatically.",
        },
      });
      if (id) summary.recommendations += 1;
    }
  }

  return summary;
}
