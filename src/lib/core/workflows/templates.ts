// Vault Core — GHL Workflow DRAFT templates (Phase 9.3; repositioned Vault-Co-internal-first).
//
// INTERNAL-FIRST (see ../operating-principles.ts): these are drafts for VAULT CO's OWN
// internal GoHighLevel sub-account — follow-up with Vault Co prospects (roofing / home-
// service business owners), sales, onboarding, and client success. They are NOT live client
// workflows. Every step is draft-only (no send, no publish, no GHL mutation). Templates are
// instantiated into a GHLWorkflowDraftInput, then re-validated/sanitized before storage.

import { INTERNAL_FIRST_DEFAULTS } from "../operating-principles";
import type { WorkflowType, WorkflowStep, WorkflowTrigger, GHLWorkflowDraftInput } from "./types";

export interface WorkflowTemplate {
  key: string;
  workflow_type: WorkflowType;
  title: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  guardrails: Record<string, unknown>;
  required_assets: string[];
  missing_inputs: string[];
  suggested_owner: string;
  notes: string;
}

let _n = 0;
function s(type: WorkflowStep["type"], label: string, description: string, extra: Partial<WorkflowStep> = {}): WorkflowStep {
  return { id: `tpl-${++_n}`, type, label, description, draft_only: true, ...extra };
}

const GUARDRAILS = { draft_only: true, no_external_send: true, requires_human_approval: true, ghl_adapter: "disabled", stop_on_reply: true, scope: "vault_co_internal" };

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    key: "missed_call_text_back",
    workflow_type: "missed_call_text_back",
    title: "Vault Co Missed Inbound Lead Text-Back",
    description: "When a Vault Co prospect calls and we miss it, draft a fast text-back to recover the conversation. For Vault Co's own GHL sub-account.",
    trigger: { type: "missed_call", description: "Missed inbound call from a Vault Co prospect (no answer)." },
    steps: [
      s("internal_note", "Missed call detected", "Log that a Vault Co prospect call was missed (draft note for the Vault Co setter)."),
      s("wait", "Wait 1 minute", "Brief pause before the first text-back draft.", { wait_duration: "1 minute" }),
      s("draft_sms", "Text-back draft", "Draft SMS to the prospect (never sent).", { draft_text: "Hey {{contact.first_name}}, sorry we missed your call! This is the team at Vault Co — were you reaching out about getting more booked appointments for your business?" }),
      s("condition", "If no reply in 10 minutes", "Branch when the prospect hasn't replied.", { condition: "no inbound reply within 10 minutes" }),
      s("draft_sms", "Follow-up draft", "Second draft SMS (never sent).", { draft_text: "Just checking back in — happy to text or grab a quick call to show how we book appointments on autopilot, whenever works for you." }),
      s("create_task", "Setter task (draft)", "Draft a task for the Vault Co setter to personally follow up.", { task: "Call back missed Vault Co prospect and book a discovery call" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Vault Co business phone number", "Vault Co display name"],
    missing_inputs: ["Confirm Vault Co SMS sender number", "Confirm Vault Co office hours"],
    suggested_owner: "Vault Co setter team (Veronica)",
    notes: "Speed matters — keep the first draft text short and human.",
  },
  {
    key: "speed_to_lead_new_inquiry",
    workflow_type: "speed_to_lead_new_inquiry",
    title: "Vault Co Speed-to-Lead New Prospect",
    description: "New Vault Co inbound prospect (Meta ad / form / outreach reply) — draft an immediate response to book a discovery call fast.",
    trigger: { type: "new_inquiry", description: "New Vault Co prospect inquiry (Meta lead form, site, or outreach reply)." },
    steps: [
      s("internal_note", "New prospect", "Log the new Vault Co prospect source (draft note)."),
      s("draft_sms", "Instant reply draft", "Draft instant SMS (never sent).", { draft_text: "Hi {{contact.first_name}}, thanks for reaching out to Vault Co! When's a good time for a quick call to map out how we'd get you more booked jobs?" }),
      s("wait", "Wait 5 minutes", "Pause before email backup.", { wait_duration: "5 minutes" }),
      s("draft_email", "Email backup draft", "Draft email backup (never sent).", { draft_text: "Thanks for your interest in Vault Co — here's what to expect on a discovery call and a couple of times that work this week." }),
      s("create_task", "Rep task (draft)", "Draft a task to call within the speed-to-lead window.", { task: "Call new Vault Co prospect within 5 minutes" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Vault Co booking link", "Vault Co target market notes"],
    missing_inputs: ["Confirm Vault Co booking calendar", "Confirm response-time SLA"],
    suggested_owner: "Vault Co lead acquisition (Veronica)",
    notes: "Pair with a 5-minute call SLA for best booking rates.",
  },
  {
    key: "appointment_confirmation",
    workflow_type: "appointment_confirmation",
    title: "Vault Co Discovery Call Confirmation",
    description: "Confirm a booked Vault Co discovery/strategy call with a clear draft message and prep details.",
    trigger: { type: "appointment_booked", description: "Vault Co discovery/strategy call booked." },
    steps: [
      s("draft_sms", "Confirmation draft", "Draft confirmation SMS (never sent).", { draft_text: "You're booked, {{contact.first_name}}! Your Vault Co strategy call is {{appointment.time}}. Reply YES to confirm." }),
      s("condition", "If not confirmed", "Branch if no confirmation reply.", { condition: "no confirmation reply within 24 hours" }),
      s("draft_sms", "Re-confirm draft", "Draft nudge (never sent).", { draft_text: "Just confirming your Vault Co strategy call — does {{appointment.time}} still work?" }),
      s("add_tag", "Tag: confirmed (draft)", "Draft tag once confirmed.", { tag: "discovery-confirmed" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Vault Co calendar integration", "Call time merge field"],
    missing_inputs: ["Confirm timezone handling"],
    suggested_owner: "Vault Co operations",
    notes: "Reduce no-shows on Vault Co's own sales calls with a clear confirm ask.",
  },
  {
    key: "appointment_reminder",
    workflow_type: "appointment_reminder",
    title: "Vault Co Sales Call Reminder Sequence",
    description: "Reminder cadence before a Vault Co discovery/sales call to keep the slot.",
    trigger: { type: "appointment_upcoming", description: "Vault Co call scheduled within the reminder window." },
    steps: [
      s("wait", "Day before", "Wait until ~24h before.", { wait_duration: "until 24 hours before" }),
      s("draft_sms", "Day-before reminder draft", "Draft reminder (never sent).", { draft_text: "Reminder: your Vault Co strategy call is tomorrow at {{appointment.time}}. Bring your current lead numbers and we'll map the plan." }),
      s("wait", "Morning of", "Wait until ~2h before.", { wait_duration: "until 2 hours before" }),
      s("draft_sms", "Same-day reminder draft", "Draft reminder (never sent).", { draft_text: "We're on for {{appointment.time}} today — text us if anything changes." }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Vault Co calendar integration"],
    missing_inputs: ["Confirm reminder timing preferences"],
    suggested_owner: "Vault Co operations",
    notes: "Two touches is usually enough; avoid over-messaging Vault Co prospects.",
  },
  {
    key: "no_show_follow_up",
    workflow_type: "no_show_follow_up",
    title: "Vault Co No-Show Recovery",
    description: "Recover a missed Vault Co discovery/sales call with a friendly rebooking draft.",
    trigger: { type: "appointment_no_show", description: "Vault Co call marked as a no-show." },
    steps: [
      s("internal_note", "No-show logged", "Log the Vault Co prospect no-show (draft note)."),
      s("draft_sms", "Rebook draft", "Draft rebooking SMS (never sent).", { draft_text: "Sorry we missed you, {{contact.first_name}}! Want to grab a new time for your Vault Co strategy call?" }),
      s("wait", "Wait 1 day", "Pause before a second attempt.", { wait_duration: "1 day" }),
      s("draft_email", "Rebook email draft", "Draft rebooking email (never sent).", { draft_text: "No problem at all — here are a few times that work to reschedule your Vault Co strategy call." }),
      s("create_task", "Rep task (draft)", "Draft a personal follow-up task.", { task: "Personally reach out to no-show prospect to rebook" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Vault Co booking link"],
    missing_inputs: ["Confirm max rebooking attempts"],
    suggested_owner: "Vault Co setter team",
    notes: "Keep tone blame-free to maximize recovery.",
  },
  {
    key: "client_check_in",
    workflow_type: "client_check_in",
    title: "Vault Co Client Check-In Workflow",
    description: "Proactive check-in cadence for current Vault Co clients to reinforce results and retention — draft-only.",
    trigger: { type: "client_check_in", description: "Vault Co client check-in window reached (e.g. post-onboarding or monthly)." },
    steps: [
      s("wait", "Wait 1 day", "Pause before the check-in.", { wait_duration: "1 day" }),
      s("draft_sms", "Check-in draft", "Draft check-in (never sent).", { draft_text: "Hi {{contact.first_name}}, quick check-in from Vault Co — how are the booked appointments feeling this week? Anything you want us to push on?" }),
      s("wait", "Wait 3 days", "Pause before value follow-up.", { wait_duration: "3 days" }),
      s("draft_email", "Value email draft", "Draft value/recap email (never sent).", { draft_text: "A quick recap of this period's performance and what Vault Co is focusing on next for your account." }),
      s("create_task", "Account task (draft)", "Draft a task to review the account.", { task: "Review Vault Co client account health + next focus" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Vault Co reporting snapshot", "Account focus notes"],
    missing_inputs: ["Confirm check-in cadence per client tier"],
    suggested_owner: "Vault Co client success (Vivian prepares; a human sends)",
    notes: "Retention is cheaper than acquisition — lead with results, not filler.",
  },
  {
    key: "proposal_follow_up",
    workflow_type: "proposal_follow_up",
    title: "Vault Co Proposal Follow-Up",
    description: "Follow a sent Vault Co proposal toward a signed agreement, draft-only.",
    trigger: { type: "proposal_sent", description: "Vault Co proposal delivered to a prospect." },
    steps: [
      s("wait", "Wait 1 day", "Pause after the proposal.", { wait_duration: "1 day" }),
      s("draft_sms", "Proposal nudge draft", "Draft nudge (never sent).", { draft_text: "Hi {{contact.first_name}}, did the Vault Co proposal come through okay? Happy to clarify scope, timeline, or ROI." }),
      s("condition", "If no response in 3 days", "Branch on no response.", { condition: "no response within 3 days" }),
      s("draft_email", "Recap email draft", "Draft recap + next steps email (never sent).", { draft_text: "Recapping the Vault Co system, what's included, and the simple next step to get your booked-appointment engine live whenever you're ready." }),
      s("assign_user", "Assign closer (draft)", "Draft assignment to a Vault Co closer.", { assignee: "Vault Co senior closer" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Vault Co proposal template", "E-sign link"],
    missing_inputs: ["Confirm closer assignment rules"],
    suggested_owner: "Vault Co sales (Valerie can flag closeout)",
    notes: "Track proposal age; escalate stale ones.",
  },
  {
    key: "review_request",
    workflow_type: "review_request",
    title: "Vault Co Review / Testimonial Request Workflow",
    description: "After a Vault Co client hits a win, draft a review/testimonial ask (for Vault Co's own social proof).",
    trigger: { type: "job_completed", description: "Vault Co client milestone / strong result logged." },
    steps: [
      s("wait", "Wait 1 day", "Pause after the win.", { wait_duration: "1 day" }),
      s("draft_sms", "Review ask draft", "Draft review/testimonial request (never sent).", { draft_text: "Love seeing your results, {{contact.first_name}}! Would you be open to a quick testimonial for Vault Co? Means a ton — here's the link." }),
      s("add_tag", "Tag: testimonial-requested (draft)", "Draft tag.", { tag: "testimonial-requested" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Vault Co review/testimonial link"],
    missing_inputs: ["Confirm preferred testimonial format (video/written)"],
    suggested_owner: "Vault Co operations / client success",
    notes: "Ask while the great result is fresh; testimonials feed Vault Co's own creative.",
  },
  {
    key: "reactivation",
    workflow_type: "reactivation",
    title: "Vault Co Cold Prospect Reactivation",
    description: "Re-engage cold Vault Co prospects (past agency leads) with a light, value-led nurture draft.",
    trigger: { type: "lead_cold", description: "Vault Co prospect has gone cold (no activity in N days)." },
    steps: [
      s("internal_note", "Cold prospect flagged", "Log reactivation entry (draft note)."),
      s("draft_email", "Value nurture draft", "Draft helpful, no-pressure email (never sent).", { draft_text: "Still thinking about fixing your lead flow? Here's a quick breakdown of how Vault Co turns missed calls and slow follow-up into booked jobs — no pitch, just the system." }),
      s("wait", "Wait 5 days", "Pause between touches.", { wait_duration: "5 days" }),
      s("draft_sms", "Soft check-in draft", "Draft soft check-in (never sent).", { draft_text: "No rush at all — whenever you want to see how Vault Co would book more jobs for you, I'm here." }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Vault Co value/proof content"],
    missing_inputs: ["Confirm cold-prospect window", "Confirm suppression/opt-out rules"],
    suggested_owner: "Vault Co marketing (Valentina insights)",
    notes: "Respect frequency caps; lead with value, not chasing.",
  },
  {
    key: "onboarding_access_request",
    workflow_type: "onboarding_access_request",
    title: "Vault Co New Client Onboarding Access Request",
    description: "Collect onboarding access/assets from a NEW Vault Co client — draft internal asks only.",
    trigger: { type: "client_onboarding", description: "New Vault Co client onboarding started." },
    steps: [
      s("internal_note", "Onboarding started", "Log Vault Co client onboarding kickoff (draft note)."),
      s("draft_email", "Access request draft", "Draft access/asset request (never sent).", { draft_text: "Welcome to Vault Co! To get your system live we'll need: ad account access, GHL access, logo/brand assets, and your service area + offer details." }),
      s("create_task", "Track missing assets (draft)", "Draft a task to track outstanding items.", { task: "Track outstanding onboarding access & assets" }),
      s("condition", "If assets missing after 3 days", "Branch on outstanding items.", { condition: "required assets still missing after 3 days" }),
      s("draft_email", "Reminder draft", "Draft reminder for missing items (never sent).", { draft_text: "Quick nudge on the access/assets we still need to launch your Vault Co system — here's the short checklist." }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Vault Co onboarding checklist"],
    missing_inputs: ["Confirm required access list per client"],
    suggested_owner: "Vault Co client success (Vivian — internal only, never contacts clients directly)",
    notes: "Vivian prepares the asks; a human sends them. " + INTERNAL_FIRST_DEFAULTS.ghlWorkflows,
  },
];

export function getWorkflowTemplate(key: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.key === key);
}

/** Build a draft creation input from a template (re-sanitized by validation on save). */
export function templateToInput(t: WorkflowTemplate, opts: { client_id?: string | null; source_agent?: string | null } = {}): GHLWorkflowDraftInput {
  return {
    client_id: opts.client_id ?? null,
    title: t.title,
    description: t.description,
    workflow_type: t.workflow_type,
    source_agent: opts.source_agent ?? null,
    trigger: t.trigger,
    steps: t.steps,
    guardrails: t.guardrails,
    required_assets: t.required_assets,
    missing_inputs: t.missing_inputs,
    evidence: [`Template: ${t.title}`, `Suggested owner: ${t.suggested_owner}`, t.notes],
    metadata: { template_key: t.key, suggested_owner: t.suggested_owner },
  };
}
