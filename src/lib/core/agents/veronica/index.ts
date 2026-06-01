// Vault Core — VERONICA, Lead Acquisition Director (Layer 2). Activated in Phase 6.
//
// Mission: understand why leads convert. Veronica reads lead conversations
// (GHL read-only, or mock), surfaces conversation intelligence — hot leads,
// dead conversations, missed opportunities, booking patterns, objections,
// no-show risk — writes it into Vault Memory, drafts follow-up messages for
// HUMAN APPROVAL ONLY, routes recommendations to the Command Hub, and opens a
// Vega collaboration to validate patterns.
//
// HARD RULES (enforced): Veronica may only read, analyze, recommend, draft, and
// write Vault Memory / activity / collaboration / Command Hub / draft records.
// She NEVER sends SMS, replies to leads, modifies GHL/CRM, books appointments,
// changes pipeline stages, or triggers workflows. Drafts are never sent — they
// require human approval. Fully mock-safe.

import {
  ensureNode,
  insertNode,
  insertEdge,
  insertActivity,
  insertRecommendation,
} from "../../memory/db";
import { createCollaboration, insertAgentMessage, insertAgentTask } from "../../collab/db";
import { insertDraft } from "./drafts";
import { getConversationData, type NormalizedConversation } from "../../integrations/ghl/conversations";
import { getAgentMeta } from "../registry";
import type { AgentRunResult, DraftType } from "../../types";
import type { RunnableAgent, AgentRunContext } from "../types";

const META = getAgentMeta("veronica")!;

interface ConvoAnalysis {
  source: "live" | "mock";
  total: number;
  hot: NormalizedConversation[];
  dead: NormalizedConversation[];
  noShows: NormalizedConversation[];
  objections: NormalizedConversation[];
  booked: number;
  bookingRatePct: number;
}

function analyze(convos: NormalizedConversation[], source: "live" | "mock"): ConvoAnalysis {
  const hot = convos.filter((c) => c.status === "hot" && !c.hasAppointment);
  const dead = convos.filter((c) => c.status === "dead");
  const noShows = convos.filter((c) => c.noShow);
  const objections = convos.filter((c) => !!c.objection);
  const booked = convos.filter((c) => c.status === "booked" || c.hasAppointment).length;
  const bookingRatePct = convos.length ? Math.round((booked / convos.length) * 100) : 0;
  return { source, total: convos.length, hot, dead, noShows, objections, booked, bookingRatePct };
}

async function run(ctx: AgentRunContext): Promise<AgentRunResult> {
  let nodesCreated = 0;
  let edgesCreated = 0;
  let recommendationsCreated = 0;
  let activityCreated = 0;
  let draftsCreated = 0;

  const { conversations, source } = await getConversationData();
  const a = analyze(conversations, source);

  const coreId = await ensureNode({ category: "memory_core", label: "Vault Memory", confidence: 1 });
  const verId = await ensureNode({
    category: "agent",
    label: META.name,
    summary: `${META.title} — ${META.mission}`,
    source_agent: META.id,
    confidence: 0.95,
    metadata: { title: META.title, color: META.color },
  });

  const link = async (fromId: string | null, weight = 0.7) => {
    if (fromId && verId) { if (await insertEdge({ from_node: fromId, to_node: verId, relationship: "contributed_by", weight: 0.9, source_agent: META.id })) edgesCreated += 1; }
    if (fromId && coreId) { if (await insertEdge({ from_node: fromId, to_node: coreId, relationship: "influences", weight, source_agent: META.id })) edgesCreated += 1; }
  };

  // 1. Conversation insight node (overview)
  const insightId = await insertNode({
    category: "conversation_insight",
    label: `Conversation intelligence: ${a.hot.length} hot · ${a.dead.length} dead · ${a.bookingRatePct}% booked`,
    summary: `Reviewed ${a.total} lead conversations (${a.source}). ${a.hot.length} hot leads need follow-up, ${a.dead.length} dead conversations are reactivation candidates, ${a.noShows.length} no-show(s), ${a.objections.length} active objection(s).`,
    confidence: 0.78,
    source_agent: META.id,
    metadata: { bookingRatePct: a.bookingRatePct, source: a.source },
  });
  if (insightId) nodesCreated += 1;
  await link(insightId);

  // 2. SMS pattern node (deterministic, validated via collaboration)
  const patternId = await insertNode({
    category: "sms_pattern",
    label: "Fast response on hot leads lifts booking",
    summary: "Hot inbound leads contacted within the hour book at a meaningfully higher rate; urgency-framed confirmations reduce no-shows.",
    confidence: 0.72,
    source_agent: META.id,
  });
  if (patternId) nodesCreated += 1;
  await link(patternId, 0.65);

  // 3. Signal nodes for the most pressing items
  const topHot = a.hot[0];
  const topDead = a.dead[0];
  const topNoShow = a.noShows[0];
  const topObjection = a.objections[0];

  if (topHot) {
    const id = await insertNode({ category: "hot_lead_signal", label: `Hot lead needs follow-up: ${topHot.leadName}`, summary: topHot.lastMessageBody ?? "High-intent inbound awaiting reply.", confidence: 0.8, source_agent: META.id });
    if (id) { nodesCreated += 1; await link(id); }
  }
  if (topDead) {
    const id = await insertNode({ category: "reactivation_opportunity", label: `Reactivation: ${topDead.leadName} (${topDead.lastInboundDaysAgo ?? "?"}d cold)`, summary: "Dead conversation worth a seasonal re-engagement touch.", confidence: 0.64, source_agent: META.id });
    if (id) { nodesCreated += 1; await link(id); }
  }
  if (topObjection) {
    const id = await insertNode({ category: "objection_pattern", label: `Objection pattern: ${topObjection.objection}`, summary: `Recurring objection surfaced in lead conversations (e.g. ${topObjection.leadName}).`, confidence: 0.66, source_agent: META.id });
    if (id) { nodesCreated += 1; await link(id); }
  }
  if (topNoShow) {
    const id = await insertNode({ category: "appointment_risk", label: `No-show recovery: ${topNoShow.leadName}`, summary: "Booked lead missed the appointment — recovery window open.", confidence: 0.7, source_agent: META.id });
    if (id) { nodesCreated += 1; await link(id); }
  }

  // Activity
  if (await insertActivity({
    agent: META.id,
    kind: "insight",
    message: `Veronica reviewed ${a.total} lead conversations (${a.source}); ${a.hot.length} hot, ${a.dead.length} reactivation candidates, booking rate ${a.bookingRatePct}%.`,
    node_id: insightId,
  })) activityCreated += 1;

  // 4. Draft messages — HUMAN APPROVAL ONLY, never sent.
  const draftFor = async (
    type: DraftType,
    lead: NormalizedConversation,
    rationale: string,
    body: string,
    risk: "low" | "medium" | "high",
    sendWindow: string
  ) => {
    // An sms_draft node ties the draft into the graph (requires_approval → Command Hub).
    const draftNodeId = await insertNode({
      category: "sms_draft",
      label: `${type.replace(/_/g, " ")} draft · ${lead.leadName}`,
      summary: rationale,
      confidence: 0.75,
      source_agent: META.id,
      metadata: { draft_type: type },
    });
    if (draftNodeId) {
      nodesCreated += 1;
      await link(draftNodeId, 0.6);
      if (coreId) { if (await insertEdge({ from_node: draftNodeId, to_node: coreId, relationship: "requires_approval", weight: 0.9, source_agent: META.id })) edgesCreated += 1; }
    }
    const id = await insertDraft({
      agent: META.id,
      draft_type: type,
      lead_name: lead.leadName,
      conversation_summary: lead.lastMessageBody ?? null,
      rationale,
      body,
      confidence: 0.78,
      risk_level: risk,
      suggested_send_window: sendWindow,
      related_node_ids: draftNodeId ? [draftNodeId] : [],
    });
    if (id) draftsCreated += 1;
  };

  if (topHot) {
    await draftFor("follow_up", topHot, "High-intent inbound; fast response lifts booking. Same-day scheduling reply.",
      `Hi — thanks for reaching out! We can get someone out to you as early as tomorrow. Would morning or afternoon work better?`, "low", "Within 1 hour (business hours)");
  }
  if (topDead) {
    await draftFor("reactivation", topDead, "Reactivation opportunity; low-pressure seasonal value touch.",
      `Hi — checking in as the season picks up. We're booking free inspections now before the rush. Want me to hold a no-obligation slot for you?`, "medium", "Tue–Thu, late morning");
  }
  if (topNoShow) {
    await draftFor("no_show_recovery", topNoShow, "No-show recovery; re-offer with a gentle urgency frame.",
      `Hi — looks like we missed each other! I can still get you on the schedule this week. Would tomorrow afternoon work?`, "low", "Same day, +2h after miss");
  }

  // 5. Recommendations → Command Hub (human review)
  if (topHot) {
    const recId = await insertRecommendation({
      agent: META.id,
      title: "Review hot lead needing follow-up",
      body: `${topHot.leadName} sent a high-intent message and has no reply yet. A drafted same-day follow-up is ready for approval. No message will be sent automatically.`,
      impact: "Booking risk if the lead goes cold",
      priority_score: 0.86,
      node_id: insightId,
      influence_score: 0.74,
      revenue_impact: "Potential booked job",
      related_clients: [topHot.leadName],
      related_conversations: [topHot.leadId],
      related_node_ids: insightId ? [insightId] : [],
      vanessa_priority: "high",
      priority_reason: "high-intent lead awaiting human follow-up",
      metadata: { confidence: 0.8, suggested_human_action: "Approve/edit the drafted SMS, then send manually. Veronica cannot send." },
    });
    if (recId) { recommendationsCreated += 1; if (await insertActivity({ agent: META.id, kind: "recommendation", message: `Veronica flagged a hot lead for follow-up with a drafted reply (approval required).`, node_id: recId })) activityCreated += 1; }
  }

  // SMS pattern recommendation (always — the booking-lift insight)
  const patRec = await insertRecommendation({
    agent: META.id,
    title: "Review SMS pattern that improves booking",
    body: "Fast response + urgency-framed confirmations correlate with higher booking and fewer no-shows. Recommend standardizing this into the follow-up playbook.",
    impact: "Higher booking rate, fewer no-shows",
    priority_score: 0.7,
    node_id: patternId,
    influence_score: 0.66,
    related_node_ids: patternId ? [patternId] : [],
    metadata: { confidence: 0.72, suggested_human_action: "Adopt the response-time SLA + confirmation template." },
  });
  if (patRec) { recommendationsCreated += 1; }

  // 6. Collaboration with Vega to validate the SMS pattern.
  const collabId = await createCollaboration({
    title: "SMS booking pattern — validation",
    initiator: META.id,
    participants: ["veronica", "vega"],
    status: "open",
    summary: "Veronica surfaced an SMS response-time/booking pattern and requested Vega validate it across available data.",
    related_node_ids: patternId ? [patternId] : [],
  });
  if (collabId) {
    await insertAgentMessage({
      from_agent: META.id, to_agent: "vega", kind: "request_analysis",
      subject: "Validate SMS booking pattern",
      body: "Vega — can you confirm the response-time → booking correlation across the available conversation data?",
      related_node_ids: patternId ? [patternId] : [], collaboration_id: collabId,
    });
    await insertAgentTask({
      assigned_to: "vega", assigned_by: META.id,
      title: "Validate SMS response-time → booking pattern",
      detail: "Cross-check Veronica's SMS pattern against conversion/booking data.",
      status: "open", collaboration_id: collabId, related_node_ids: patternId ? [patternId] : [],
    });
  }

  const persisted = coreId !== null;
  const via = ctx.trigger === "manual" ? "manual" : ctx.tier;
  const detail = persisted
    ? `[${via}] Reviewed ${a.total} conversations (${a.source}) · ${nodesCreated} node(s), ${recommendationsCreated} rec(s), ${draftsCreated} draft(s).`
    : `[${via}] Reviewed ${a.total} conversations (mock mode — no persistence). ${a.hot.length} hot, ${a.dead.length} reactivation, ${a.bookingRatePct}% booked.`;

  return { status: "success", nodesCreated, edgesCreated, recommendationsCreated, activityCreated, detail };
}

export const veronicaAgent: RunnableAgent = { meta: META, run };
