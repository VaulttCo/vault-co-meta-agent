// Vault Core — GHL Workflow DRAFT templates (Phase 9.3). PURE / static.
//
// Starter follow-up workflows for home-service / roofing. Every step is draft-only
// (no send, no publish, no GHL mutation). Templates are instantiated into a
// GHLWorkflowDraftInput, which is then re-validated/sanitized before storage.

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

const GUARDRAILS = { draft_only: true, no_external_send: true, requires_human_approval: true, ghl_adapter: "disabled", stop_on_reply: true };

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    key: "missed_call_text_back",
    workflow_type: "missed_call_text_back",
    title: "Missed Call Text-Back",
    description: "When a new lead calls and we miss it, draft a fast, friendly text-back to recover the conversation.",
    trigger: { type: "missed_call", description: "Missed inbound call from a new lead (no answer)." },
    steps: [
      s("internal_note", "Missed call detected", "Log that a new-lead call was missed (draft note for the setter)."),
      s("wait", "Wait 1 minute", "Brief pause before the first text-back draft.", { wait_duration: "1 minute" }),
      s("draft_sms", "Text-back draft", "Draft SMS to the lead (never sent).", { draft_text: "Hey {{contact.first_name}}, sorry we missed your call! This is the team at {{company.name}} — how can we help with your roof today?" }),
      s("condition", "If no reply in 10 minutes", "Branch when the lead hasn't replied.", { condition: "no inbound reply within 10 minutes" }),
      s("draft_sms", "Follow-up draft", "Second draft SMS (never sent).", { draft_text: "Just checking back in — happy to text or schedule a quick call whenever works for you." }),
      s("create_task", "Setter task (draft)", "Draft a task for the setter to personally follow up.", { task: "Call back missed lead and confirm next step" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Verified business phone number", "Company display name"],
    missing_inputs: ["Confirm SMS sender number", "Confirm office hours"],
    suggested_owner: "Setter team",
    notes: "Speed matters — keep the first draft text short and human.",
  },
  {
    key: "speed_to_lead_new_inquiry",
    workflow_type: "speed_to_lead_new_inquiry",
    title: "Speed-to-Lead New Inquiry",
    description: "New web/form inquiry — draft an immediate response to book the estimate fast.",
    trigger: { type: "new_inquiry", description: "New form or ad-lead inquiry received." },
    steps: [
      s("internal_note", "New inquiry", "Log the new inquiry source (draft note)."),
      s("draft_sms", "Instant reply draft", "Draft instant SMS (never sent).", { draft_text: "Hi {{contact.first_name}}, thanks for reaching out to {{company.name}}! When's a good time for a free roof assessment?" }),
      s("wait", "Wait 5 minutes", "Pause before email backup.", { wait_duration: "5 minutes" }),
      s("draft_email", "Email backup draft", "Draft email backup (never sent).", { draft_text: "Thanks for your interest — here's what to expect from your free assessment and a couple of times that work this week." }),
      s("create_task", "Rep task (draft)", "Draft a task to call within the speed-to-lead window.", { task: "Call new inquiry within 5 minutes" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Booking link", "Service area list"],
    missing_inputs: ["Confirm booking calendar", "Confirm response-time SLA"],
    suggested_owner: "Lead acquisition (Veronica)",
    notes: "Pair with a 5-minute call SLA for best booking rates.",
  },
  {
    key: "appointment_confirmation",
    workflow_type: "appointment_confirmation",
    title: "Appointment Confirmation",
    description: "Confirm a booked estimate with a clear draft message and prep details.",
    trigger: { type: "appointment_booked", description: "Estimate/appointment booked." },
    steps: [
      s("draft_sms", "Confirmation draft", "Draft confirmation SMS (never sent).", { draft_text: "You're booked, {{contact.first_name}}! We'll see you {{appointment.time}}. Reply YES to confirm." }),
      s("condition", "If not confirmed", "Branch if no confirmation reply.", { condition: "no confirmation reply within 24 hours" }),
      s("draft_sms", "Re-confirm draft", "Draft nudge (never sent).", { draft_text: "Just confirming your roof assessment — does {{appointment.time}} still work?" }),
      s("add_tag", "Tag: confirmed (draft)", "Draft tag once confirmed.", { tag: "appointment-confirmed" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Calendar integration", "Appointment time merge field"],
    missing_inputs: ["Confirm timezone handling"],
    suggested_owner: "Operations",
    notes: "Reduce no-shows with a clear confirm ask.",
  },
  {
    key: "appointment_reminder",
    workflow_type: "appointment_reminder",
    title: "Appointment Reminder Sequence",
    description: "Reminder cadence before the estimate to keep the slot.",
    trigger: { type: "appointment_upcoming", description: "Appointment scheduled within the reminder window." },
    steps: [
      s("wait", "Day before", "Wait until ~24h before.", { wait_duration: "until 24 hours before" }),
      s("draft_sms", "Day-before reminder draft", "Draft reminder (never sent).", { draft_text: "Reminder: your roof assessment is tomorrow at {{appointment.time}}. See you then!" }),
      s("wait", "Morning of", "Wait until ~2h before.", { wait_duration: "until 2 hours before" }),
      s("draft_sms", "Same-day reminder draft", "Draft reminder (never sent).", { draft_text: "We're on for {{appointment.time}} today — text us if anything changes." }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Calendar integration"],
    missing_inputs: ["Confirm reminder timing preferences"],
    suggested_owner: "Operations",
    notes: "Two touches is usually enough; avoid over-messaging.",
  },
  {
    key: "no_show_follow_up",
    workflow_type: "no_show_follow_up",
    title: "No-Show Follow-Up",
    description: "Recover a missed appointment with a friendly rebooking draft.",
    trigger: { type: "appointment_no_show", description: "Appointment marked as a no-show." },
    steps: [
      s("internal_note", "No-show logged", "Log the no-show (draft note)."),
      s("draft_sms", "Rebook draft", "Draft rebooking SMS (never sent).", { draft_text: "Sorry we missed you, {{contact.first_name}}! Want to grab a new time for your roof assessment?" }),
      s("wait", "Wait 1 day", "Pause before a second attempt.", { wait_duration: "1 day" }),
      s("draft_email", "Rebook email draft", "Draft rebooking email (never sent).", { draft_text: "No problem at all — here are a few times that work to reschedule your assessment." }),
      s("create_task", "Rep task (draft)", "Draft a personal follow-up task.", { task: "Personally reach out to no-show to rebook" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Booking link"],
    missing_inputs: ["Confirm max rebooking attempts"],
    suggested_owner: "Setter team",
    notes: "Keep tone blame-free to maximize recovery.",
  },
  {
    key: "estimate_follow_up",
    workflow_type: "estimate_follow_up",
    title: "Estimate Follow-Up",
    description: "After the estimate, draft a nudge cadence toward a decision.",
    trigger: { type: "estimate_sent", description: "Estimate delivered to the homeowner." },
    steps: [
      s("wait", "Wait 1 day", "Pause after the estimate.", { wait_duration: "1 day" }),
      s("draft_sms", "Check-in draft", "Draft check-in (never sent).", { draft_text: "Hi {{contact.first_name}}, any questions on your roof estimate? Happy to walk through the options." }),
      s("wait", "Wait 3 days", "Pause before value follow-up.", { wait_duration: "3 days" }),
      s("draft_email", "Value email draft", "Draft value/financing email (never sent).", { draft_text: "A quick recap of what's included, warranty details, and financing options if helpful." }),
      s("create_task", "Rep task (draft)", "Draft a call task to close.", { task: "Call to answer estimate questions" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Estimate template", "Financing details"],
    missing_inputs: ["Confirm follow-up cadence length"],
    suggested_owner: "Sales",
    notes: "Lead with helpfulness, not pressure.",
  },
  {
    key: "proposal_follow_up",
    workflow_type: "proposal_follow_up",
    title: "Proposal Follow-Up",
    description: "Follow a sent proposal toward signature, draft-only.",
    trigger: { type: "proposal_sent", description: "Proposal delivered." },
    steps: [
      s("wait", "Wait 1 day", "Pause after the proposal.", { wait_duration: "1 day" }),
      s("draft_sms", "Proposal nudge draft", "Draft nudge (never sent).", { draft_text: "Hi {{contact.first_name}}, did the proposal come through okay? Happy to clarify anything." }),
      s("condition", "If no response in 3 days", "Branch on no response.", { condition: "no response within 3 days" }),
      s("draft_email", "Recap email draft", "Draft recap + next steps email (never sent).", { draft_text: "Recapping scope, timeline, and the simple next step to get started whenever you're ready." }),
      s("assign_user", "Assign closer (draft)", "Draft assignment to a closer.", { assignee: "Senior closer" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Proposal template", "E-sign link"],
    missing_inputs: ["Confirm closer assignment rules"],
    suggested_owner: "Sales (Valerie can flag closeout)",
    notes: "Track proposal age; escalate stale ones.",
  },
  {
    key: "review_request",
    workflow_type: "review_request",
    title: "Review Request",
    description: "After a completed job, draft a review ask.",
    trigger: { type: "job_completed", description: "Job marked complete / paid." },
    steps: [
      s("wait", "Wait 1 day", "Pause after completion.", { wait_duration: "1 day" }),
      s("draft_sms", "Review ask draft", "Draft review request (never sent).", { draft_text: "Thanks for trusting {{company.name}} with your roof, {{contact.first_name}}! A quick review would mean a lot — here's the link." }),
      s("add_tag", "Tag: review-requested (draft)", "Draft tag.", { tag: "review-requested" }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Review link (Google/Facebook)"],
    missing_inputs: ["Confirm preferred review platform"],
    suggested_owner: "Operations",
    notes: "Ask while the great experience is fresh.",
  },
  {
    key: "reactivation",
    workflow_type: "reactivation",
    title: "Reactivation / Nurture",
    description: "Re-engage cold leads with a light, helpful nurture draft.",
    trigger: { type: "lead_cold", description: "Lead has gone cold (no activity in N days)." },
    steps: [
      s("internal_note", "Cold lead flagged", "Log reactivation entry (draft note)."),
      s("draft_email", "Value nurture draft", "Draft helpful, no-pressure email (never sent).", { draft_text: "Still thinking about your roof? Here are a few signs it may be time, plus what a free assessment covers." }),
      s("wait", "Wait 5 days", "Pause between touches.", { wait_duration: "5 days" }),
      s("draft_sms", "Soft check-in draft", "Draft soft check-in (never sent).", { draft_text: "No rush at all — just here whenever you'd like a free roof assessment." }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Educational content"],
    missing_inputs: ["Confirm cold-lead window", "Confirm suppression rules"],
    suggested_owner: "Marketing (Valentina insights)",
    notes: "Respect frequency caps; lead with value.",
  },
  {
    key: "onboarding_access_request",
    workflow_type: "onboarding_access_request",
    title: "Onboarding Access Request",
    description: "Collect missing onboarding access/assets from a new client — draft internal asks only.",
    trigger: { type: "client_onboarding", description: "New client onboarding started." },
    steps: [
      s("internal_note", "Onboarding started", "Log onboarding kickoff (draft note)."),
      s("draft_email", "Access request draft", "Draft access/asset request (never sent).", { draft_text: "Welcome aboard! To get set up we'll need: ad account access, GHL access, logo/brand assets, and your service area." }),
      s("create_task", "Track missing assets (draft)", "Draft a task to track outstanding items.", { task: "Track outstanding onboarding access & assets" }),
      s("condition", "If assets missing after 3 days", "Branch on outstanding items.", { condition: "required assets still missing after 3 days" }),
      s("draft_email", "Reminder draft", "Draft reminder for missing items (never sent).", { draft_text: "Quick nudge on the access/assets we still need to launch — here's the short checklist." }),
      s("stop_sequence", "Stop", "End the draft sequence."),
    ],
    guardrails: GUARDRAILS,
    required_assets: ["Onboarding checklist"],
    missing_inputs: ["Confirm required access list per client"],
    suggested_owner: "Client success (Vivian — internal only, never contacts clients directly)",
    notes: "Vivian prepares the asks; a human sends them.",
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
