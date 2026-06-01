// Vault Core — Workforce Collaboration Engine DB helpers (server-side only).
//
// Typed escape hatch over the service-role client (same pattern as memory/db.ts).
// MOCK-SAFE: reads fall back to seeded mock data when the Phase 3 tables / env
// are absent; writes no-op (and log). Nothing here executes any external action.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { WORKFORCE } from "../agents/registry";
import {
  buildMockCollaborations,
  buildMockMessages,
  buildMockTasks,
  buildMockObjectives,
  buildMockReputation,
  buildMockProposals,
  buildMockFeed,
  toFeed,
} from "./mock";
import type {
  AgentMessageRow,
  AgentMessageInput,
  AgentTaskRow,
  AgentTaskInput,
  AgentTaskStatus,
  AgentCollaborationRow,
  AgentCollaborationInput,
  CollaborationStatus,
  AgentObjectiveRow,
  AgentReputationRow,
  SystemProposalRow,
  SystemProposalInput,
  SystemProposalStatus,
  CollaborationFeedItem,
  WorkforceMember,
  ReviewAction,
  RecommendationCounts,
} from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseServerClient();
}
export function isCollabDbAvailable(): boolean {
  return db() !== null;
}
const LOG = "[VaultCore:collab]";

// ─────────────────────────────────────────────────────────────
// READS (mock fallback)
// ─────────────────────────────────────────────────────────────

export async function getCollaborations(limit = 50): Promise<AgentCollaborationRow[]> {
  const client = db();
  if (!client) return buildMockCollaborations();
  try {
    const { data, error } = await client
      .from("agent_collaborations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data || data.length === 0) return buildMockCollaborations();
    return data as AgentCollaborationRow[];
  } catch {
    return buildMockCollaborations();
  }
}

export async function getCollaboration(id: string): Promise<AgentCollaborationRow | null> {
  const client = db();
  if (!client) return buildMockCollaborations().find((c) => c.id === id) ?? null;
  try {
    const { data, error } = await client.from("agent_collaborations").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return data as AgentCollaborationRow;
  } catch {
    return null;
  }
}

export async function getAgentMessages(limit = 100, collaborationId?: string): Promise<AgentMessageRow[]> {
  const client = db();
  if (!client) {
    const all = buildMockMessages();
    return collaborationId ? all.filter((m) => m.collaboration_id === collaborationId) : all;
  }
  try {
    let q = client.from("agent_messages").select("*").order("created_at", { ascending: false }).limit(limit);
    if (collaborationId) q = q.eq("collaboration_id", collaborationId);
    const { data, error } = await q;
    if (error || !data) return [];
    return data as AgentMessageRow[];
  } catch {
    return [];
  }
}

export async function getAgentTasks(limit = 100): Promise<AgentTaskRow[]> {
  const client = db();
  if (!client) return buildMockTasks();
  try {
    const { data, error } = await client
      .from("agent_tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as AgentTaskRow[];
  } catch {
    return [];
  }
}

export async function getCollaborationFeed(limit = 60): Promise<CollaborationFeedItem[]> {
  const client = db();
  if (!client) return buildMockFeed().slice(0, limit);
  try {
    const [messages, collaborations, tasks] = await Promise.all([
      getAgentMessages(limit),
      getCollaborations(limit),
      getAgentTasks(limit),
    ]);
    const feed = toFeed(messages, collaborations, tasks);
    if (feed.length === 0) return buildMockFeed().slice(0, limit);
    return feed.slice(0, limit);
  } catch {
    return buildMockFeed().slice(0, limit);
  }
}

export async function getObjectives(): Promise<AgentObjectiveRow[]> {
  const client = db();
  if (!client) return buildMockObjectives();
  try {
    const { data, error } = await client.from("agent_objectives").select("*");
    if (error || !data || data.length === 0) return buildMockObjectives();
    return data as AgentObjectiveRow[];
  } catch {
    return buildMockObjectives();
  }
}

export async function getReputation(): Promise<AgentReputationRow[]> {
  const client = db();
  if (!client) return buildMockReputation();
  try {
    const { data, error } = await client.from("agent_reputation").select("*");
    if (error || !data || data.length === 0) return buildMockReputation();
    return data as AgentReputationRow[];
  } catch {
    return buildMockReputation();
  }
}

/** Workforce roster = registry metadata + reputation + objectives, joined. */
export async function getWorkforce(): Promise<WorkforceMember[]> {
  const [reputation, objectives] = await Promise.all([getReputation(), getObjectives()]);
  const repByAgent = new Map(reputation.map((r) => [r.agent, r]));
  const objByAgent = new Map<string, AgentObjectiveRow[]>();
  for (const o of objectives) {
    const list = objByAgent.get(o.agent) ?? [];
    list.push(o);
    objByAgent.set(o.agent, list);
  }
  const fallbackRep = (agent: string): AgentReputationRow => ({
    agent,
    trust_score: 50,
    accuracy_score: 50,
    adoption_rate: 0,
    influence_score: 50,
    knowledge_contributions: 0,
    revenue_influence: 0,
    collaboration_score: 50,
    updated_at: new Date().toISOString(),
  });
  return WORKFORCE.map((meta) => ({
    meta,
    reputation: repByAgent.get(meta.id) ?? fallbackRep(meta.id),
    objectives: objByAgent.get(meta.id) ?? [],
  }));
}

// ── Proposals ────────────────────────────────────────────────
export async function getProposals(status?: string): Promise<SystemProposalRow[]> {
  const client = db();
  if (!client) {
    const all = buildMockProposals();
    return status ? all.filter((p) => p.status === status) : all;
  }
  try {
    let q = client.from("vault_system_proposals").select("*").order("created_at", { ascending: false }).limit(200);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error || !data) return [];
    return data as SystemProposalRow[];
  } catch {
    return [];
  }
}

export async function getProposal(id: string): Promise<SystemProposalRow | null> {
  const client = db();
  if (!client) return buildMockProposals().find((p) => p.id === id) ?? null;
  try {
    const { data, error } = await client.from("vault_system_proposals").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return data as SystemProposalRow;
  } catch {
    return null;
  }
}

export async function getProposalCounts(): Promise<RecommendationCounts> {
  const proposals = await getProposals();
  const counts: RecommendationCounts = {
    pending_review: 0, approved: 0, rejected: 0, archived: 0, implemented: 0, total: proposals.length,
  };
  for (const p of proposals) if (p.status in counts) counts[p.status] += 1;
  return counts;
}

// ─────────────────────────────────────────────────────────────
// WRITES (no-op + log without DB)
// ─────────────────────────────────────────────────────────────

export async function insertAgentMessage(input: AgentMessageInput): Promise<string | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data, error } = await client.from("agent_messages").insert({
      from_agent: input.from_agent,
      to_agent: input.to_agent ?? null,
      kind: input.kind ?? "share_discovery",
      subject: input.subject,
      body: input.body ?? null,
      related_node_ids: input.related_node_ids ?? [],
      collaboration_id: input.collaboration_id ?? null,
    }).select("id").single();
    if (error) { console.error(`${LOG} insertAgentMessage:`, error.message); return null; }
    return (data as { id: string }).id;
  } catch (e) { console.error(`${LOG} insertAgentMessage threw:`, (e as Error).message); return null; }
}

export async function insertAgentTask(input: AgentTaskInput): Promise<string | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data, error } = await client.from("agent_tasks").insert({
      assigned_to: input.assigned_to,
      assigned_by: input.assigned_by,
      title: input.title,
      detail: input.detail ?? null,
      status: input.status ?? "open",
      collaboration_id: input.collaboration_id ?? null,
      related_node_ids: input.related_node_ids ?? [],
    }).select("id").single();
    if (error) { console.error(`${LOG} insertAgentTask:`, error.message); return null; }
    return (data as { id: string }).id;
  } catch (e) { console.error(`${LOG} insertAgentTask threw:`, (e as Error).message); return null; }
}

export async function updateAgentTaskStatus(id: string, status: AgentTaskStatus): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    const patch: Record<string, unknown> = { status };
    if (status === "done") patch.completed_at = new Date().toISOString();
    const { error } = await client.from("agent_tasks").update(patch).eq("id", id);
    if (error) { console.error(`${LOG} updateAgentTaskStatus:`, error.message); return false; }
    return true;
  } catch (e) { console.error(`${LOG} updateAgentTaskStatus threw:`, (e as Error).message); return false; }
}

export async function createCollaboration(input: AgentCollaborationInput): Promise<string | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data, error } = await client.from("agent_collaborations").insert({
      title: input.title,
      initiator: input.initiator,
      participants: input.participants ?? [input.initiator],
      status: input.status ?? "open",
      summary: input.summary ?? null,
      joint_recommendation_id: input.joint_recommendation_id ?? null,
      related_node_ids: input.related_node_ids ?? [],
    }).select("id").single();
    if (error) { console.error(`${LOG} createCollaboration:`, error.message); return null; }
    return (data as { id: string }).id;
  } catch (e) { console.error(`${LOG} createCollaboration threw:`, (e as Error).message); return null; }
}

export async function updateCollaboration(
  id: string,
  patch: Partial<{ status: CollaborationStatus; summary: string; joint_recommendation_id: string; participants: string[] }>
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    const update: Record<string, unknown> = { ...patch };
    if (patch.status === "resolved") update.resolved_at = new Date().toISOString();
    const { error } = await client.from("agent_collaborations").update(update).eq("id", id);
    if (error) { console.error(`${LOG} updateCollaboration:`, error.message); return false; }
    return true;
  } catch (e) { console.error(`${LOG} updateCollaboration threw:`, (e as Error).message); return false; }
}

export async function insertProposal(input: SystemProposalInput): Promise<string | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data, error } = await client.from("vault_system_proposals").insert({
      agent: input.agent,
      title: input.title,
      category: input.category ?? "missing_intelligence_system",
      problem: input.problem ?? null,
      impact: input.impact ?? null,
      opportunity: input.opportunity ?? null,
      solution: input.solution ?? null,
      technical_requirements: input.technical_requirements ?? null,
      ui_requirements: input.ui_requirements ?? null,
      estimated_effort: input.estimated_effort ?? null,
      priority_score: input.priority_score ?? 0.5,
      expected_outcome: input.expected_outcome ?? null,
      status: "pending_review",
      related_node_ids: input.related_node_ids ?? [],
      collaboration_id: input.collaboration_id ?? null,
    }).select("id").single();
    if (error) { console.error(`${LOG} insertProposal:`, error.message); return null; }
    return (data as { id: string }).id;
  } catch (e) { console.error(`${LOG} insertProposal threw:`, (e as Error).message); return null; }
}

// Human-review action → resulting status (mirrors recommendations).
const PROPOSAL_ACTION_RESULT: Record<ReviewAction, SystemProposalStatus> = {
  approve: "approved",
  reject: "rejected",
  archive: "archived",
  implement: "implemented",
  request_revision: "pending_review",
};

export interface ProposalReviewResult {
  ok: boolean;
  mockMode: boolean;
  status: SystemProposalStatus;
}

/** Apply a human review to a system proposal. Updates status only — no execution. */
export async function reviewProposal(
  id: string,
  action: ReviewAction,
  actor: string,
  notes?: string | null
): Promise<ProposalReviewResult> {
  const toStatus = PROPOSAL_ACTION_RESULT[action];
  const client = db();
  if (!client) return { ok: true, mockMode: true, status: toStatus };
  try {
    const { error } = await client.from("vault_system_proposals").update({
      status: toStatus,
      reviewed_by: actor,
      reviewed_at: new Date().toISOString(),
      review_notes: notes ?? null,
    }).eq("id", id);
    if (error) { console.error(`${LOG} reviewProposal:`, error.message); return { ok: false, mockMode: false, status: toStatus }; }
    return { ok: true, mockMode: false, status: toStatus };
  } catch (e) {
    console.error(`${LOG} reviewProposal threw:`, (e as Error).message);
    return { ok: false, mockMode: false, status: toStatus };
  }
}
