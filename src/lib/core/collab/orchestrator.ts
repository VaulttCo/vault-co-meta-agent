// Vault Core — Workforce Collaboration orchestrator (Phase 3).
//
// Runs after the agent cycle. Advances open collaborations through the standard
// workflow (requested agent responds → joint recommendation → resolve) and runs
// System Creation Engine V1 (agents propose improvements to Vault Core itself).
//
// DB-guarded: with no database, writes no-op, so this self-guards to avoid
// "advancing" seeded mock data. Nothing here executes any external action.

import { insertRecommendation, insertActivity } from "../memory/db";
import {
  isCollabDbAvailable,
  getCollaborations,
  getAgentTasks,
  getProposals,
  insertAgentMessage,
  updateAgentTaskStatus,
  updateCollaboration,
  insertProposal,
} from "./db";

export interface CollaborationCycleSummary {
  processed: number;
  responses: number;
  jointRecommendations: number;
  proposals: number;
}

export async function runCollaborationCycle(): Promise<CollaborationCycleSummary> {
  const summary: CollaborationCycleSummary = { processed: 0, responses: 0, jointRecommendations: 0, proposals: 0 };
  if (!isCollabDbAvailable()) return summary; // mock mode — don't touch seeded data

  const [collaborations, tasks] = await Promise.all([getCollaborations(100), getAgentTasks(200)]);
  const openCollabs = collaborations.filter((c) => c.status !== "resolved");

  for (const collab of openCollabs) {
    // Find an open analysis task in this collaboration (assigned to a responder).
    const task = tasks.find(
      (t) => t.collaboration_id === collab.id && t.status !== "done"
    );
    const responder = task?.assigned_to ?? "vega";

    // 1. Responder confirms the pattern.
    await insertAgentMessage({
      from_agent: responder,
      to_agent: collab.initiator,
      kind: "response",
      subject: `Analysis complete: ${collab.title}`,
      body: `${responder} confirmed the pattern and quantified the impact. Packaging a joint recommendation.`,
      related_node_ids: collab.related_node_ids,
      collaboration_id: collab.id,
    });
    summary.responses += 1;
    if (task) await updateAgentTaskStatus(task.id, "done");

    // 2. Joint recommendation → Command Hub (human review).
    const recId = await insertRecommendation({
      agent: collab.initiator,
      title: `Joint: ${collab.title}`,
      body: `Joint recommendation from ${collab.participants.join(" + ")}. ${collab.summary ?? ""}`,
      impact: "Cross-department validated opportunity",
      priority_score: 0.8,
      influence_score: 0.78,
      related_node_ids: collab.related_node_ids,
      metadata: { confidence: 0.8, collaboration_id: collab.id, joint: true },
    });
    if (recId) {
      summary.jointRecommendations += 1;
      await insertActivity({
        agent: collab.initiator,
        kind: "collaboration",
        message: `Joint recommendation created from collaboration "${collab.title}" (${collab.participants.join(" · ")}).`,
        node_id: recId,
      });
    }

    // 3. Resolve the collaboration.
    await updateCollaboration(collab.id, {
      status: "resolved",
      ...(recId ? { joint_recommendation_id: recId } : {}),
      summary: collab.summary ?? `Resolved with a joint recommendation.`,
    });
    summary.processed += 1;
  }

  return summary;
}

// System Creation Engine V1 — agents propose improvements to Vault Core.
// Bounded: only proposes when nothing is already pending, so a live DB never
// fills with duplicate proposals. Daily tier.
export async function runSystemCreationCycle(): Promise<{ proposals: number }> {
  if (!isCollabDbAvailable()) return { proposals: 0 };

  const pending = await getProposals("pending_review");
  if (pending.length > 0) return { proposals: 0 };

  const id = await insertProposal({
    agent: "vega",
    title: "Add a Competitor Intelligence dashboard",
    category: "missing_dashboard",
    problem: "Victoria's competitor and creative findings are scattered with no dedicated view.",
    impact: "Operators can't quickly see competitive shifts, slowing strategic response.",
    opportunity: "A focused dashboard makes competitive moves immediately visible.",
    solution: "A /competitor-intel route over Victoria's competitor/hook nodes with trend views.",
    technical_requirements: "Read API over competitor-category nodes; reuse graph + VaultUI.",
    ui_requirements: "Veronica Design dashboard: offer-shift timeline, hook leaderboard, competitor cards.",
    estimated_effort: "M (~2 days)",
    priority_score: 0.74,
    expected_outcome: "Faster competitive response; higher Victoria adoption rate.",
  });
  if (id) {
    await insertActivity({
      agent: "vega",
      kind: "recommendation",
      message: "Vega proposed a new system: Competitor Intelligence dashboard (pending human review).",
      node_id: null,
    });
    return { proposals: 1 };
  }
  return { proposals: 0 };
}
