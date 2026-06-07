// Vault Core — Message DRAFT templates (Phase 9.4). PURE / static.
//
// Starter message drafts for common Vault Co follow-up moments. Every template is
// draft-only (no send). Bodies use {{placeholder}} tokens — never real data.
// Instantiated into a VaultMessageDraftInput, then re-validated/sanitized on save.

import type {
  MessageType, MessageChannel, MessageAudience, VaultMessageDraftInput,
} from "./types";

export interface MessageTemplate {
  key: string;
  message_type: MessageType;
  channel: MessageChannel;
  audience: MessageAudience;
  title: string;
  subject?: string;
  body: string;
  tone: string;
  intent: string;
  missing_inputs: string[];
  compliance_notes: string[];
  suggested_owner: string;
  notes: string;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    key: "missed_call_lead_reply", message_type: "missed_call_reply", channel: "sms", audience: "lead",
    title: "Missed Call Lead Reply",
    body: "Hey {{contact.first_name}}, sorry we missed your call — this is {{business.name}}. Are you looking for help with {{service_type}} at {{property_address}}?",
    tone: "friendly", intent: "Recover a missed inbound call and re-open the conversation.",
    missing_inputs: ["Confirm SMS sender number", "Confirm service_type token source"],
    compliance_notes: ["Keep concise; include opt-out where required."],
    suggested_owner: "Setter team (Veronica)", notes: "Speed matters — short and human.",
  },
  {
    key: "new_inquiry_speed_to_lead", message_type: "lead_reply", channel: "sms", audience: "lead",
    title: "New Inquiry Speed-to-Lead Reply",
    body: "Hi {{contact.first_name}}, thanks for reaching out to {{business.name}}! When's a good time for a free {{service_type}} assessment?",
    tone: "warm", intent: "Respond fast to a new inquiry and book the assessment.",
    missing_inputs: ["Confirm booking link/calendar"],
    compliance_notes: [], suggested_owner: "Lead acquisition (Veronica)", notes: "Pair with a 5-minute call SLA.",
  },
  {
    key: "appointment_confirmation", message_type: "appointment_confirmation", channel: "sms", audience: "lead",
    title: "Appointment Confirmation",
    body: "You're booked, {{contact.first_name}}! We'll see you {{appointment_time}}. Reply YES to confirm.",
    tone: "clear", intent: "Confirm a booked appointment and reduce no-shows.",
    missing_inputs: ["Confirm appointment_time token + timezone"],
    compliance_notes: [], suggested_owner: "Operations", notes: "Clear confirm ask reduces no-shows.",
  },
  {
    key: "appointment_reminder", message_type: "appointment_reminder", channel: "sms", audience: "lead",
    title: "Appointment Reminder",
    body: "Reminder: your appointment with {{business.name}} is scheduled for {{appointment_time}}. Reply here if anything changes.",
    tone: "helpful", intent: "Remind a lead of an upcoming appointment.",
    missing_inputs: ["Confirm reminder timing window"],
    compliance_notes: [], suggested_owner: "Operations", notes: "One or two touches is enough.",
  },
  {
    key: "no_show_follow_up", message_type: "no_show_follow_up", channel: "sms", audience: "lead",
    title: "No-Show Follow-Up",
    body: "Sorry we missed you, {{contact.first_name}}! Want to grab a new time for your {{service_type}} assessment?",
    tone: "blame-free", intent: "Recover a missed appointment by rebooking.",
    missing_inputs: ["Confirm rebooking link"],
    compliance_notes: [], suggested_owner: "Setter team", notes: "Keep tone blame-free.",
  },
  {
    key: "estimate_follow_up", message_type: "estimate_follow_up", channel: "sms", audience: "lead",
    title: "Estimate Follow-Up",
    body: "Hi {{contact.first_name}}, any questions on your {{service_type}} estimate? Happy to walk through the options.",
    tone: "helpful", intent: "Nudge an open estimate toward a decision.",
    missing_inputs: ["Confirm estimate reference"],
    compliance_notes: [], suggested_owner: "Sales", notes: "Lead with helpfulness, not pressure.",
  },
  {
    key: "proposal_follow_up", message_type: "proposal_follow_up", channel: "email", audience: "lead",
    title: "Proposal Follow-Up",
    subject: "Following up on your proposal",
    body: "Hi {{contact.first_name}},\n\nJust checking the proposal came through okay. Happy to clarify scope, timeline, or financing — whatever's helpful. Here's the simple next step whenever you're ready.",
    tone: "professional", intent: "Move a sent proposal toward signature.",
    missing_inputs: ["Confirm e-sign link"],
    compliance_notes: [], suggested_owner: "Sales (Valerie flags closeout)", notes: "Track proposal age.",
  },
  {
    key: "onboarding_access_request", message_type: "onboarding_access_request", channel: "email", audience: "client",
    title: "Onboarding Access Request",
    subject: "Quick setup items to launch your campaigns",
    body: "Hi {{client.first_name}},\n\nWelcome aboard! To get set up we'll need: ad account access, GHL access, logo/brand assets, and your service area. Here's a short checklist — reply whenever it's handy.",
    tone: "welcoming", intent: "Collect onboarding access/assets (internal prep; a human sends).",
    missing_inputs: ["Confirm required access list per client"],
    compliance_notes: [], suggested_owner: "Client success (Vivian — never contacts clients directly)",
    notes: "Vivian prepares; a human sends.",
  },
  {
    key: "client_check_in", message_type: "client_check_in", channel: "email", audience: "client",
    title: "Client Check-In",
    subject: "Quick update on your campaign",
    body: "Hey {{client.first_name}}, quick update from Vault Co — we're reviewing {{focus_area}} and will send the next performance notes shortly.",
    tone: "reassuring", intent: "Proactive client check-in / relationship touch.",
    missing_inputs: ["Confirm focus_area token"],
    compliance_notes: [], suggested_owner: "Client success (Vivian)", notes: "Keep it brief and specific.",
  },
  {
    key: "client_weekly_update", message_type: "client_update", channel: "email", audience: "client",
    title: "Client Weekly Update",
    subject: "Your weekly performance snapshot",
    body: "Hi {{client.first_name}},\n\nHere's this week's snapshot: {{leads_count}} leads at {{cpl}} CPL. We're focusing on {{focus_area}} next. Full notes attached.",
    tone: "informative", intent: "Weekly performance update for the client.",
    missing_inputs: ["Confirm metrics source (leads_count, cpl)"],
    compliance_notes: [], suggested_owner: "Account (Vega data, Vivian delivery)", notes: "Numbers come from approved reporting.",
  },
  {
    key: "payment_follow_up", message_type: "payment_follow_up", channel: "email", audience: "client",
    title: "Payment / Invoice Follow-Up",
    subject: "A quick note on your invoice",
    body: "Hi {{client.first_name}},\n\nA gentle reminder that invoice {{invoice_ref}} is open. Happy to answer any questions — just let us know how you'd like to proceed.",
    tone: "professional", intent: "Professional, non-threatening payment follow-up.",
    missing_inputs: ["Confirm invoice_ref token (no raw amounts/PII)"],
    compliance_notes: ["Keep professional and non-threatening."],
    suggested_owner: "Finance (Valerie)", notes: "Never threatening; never includes raw payment data.",
  },
  {
    key: "review_request", message_type: "review_request", channel: "sms", audience: "client",
    title: "Review Request",
    body: "Thanks for trusting {{business.name}} with your {{service_type}}, {{contact.first_name}}! A quick review would mean a lot — here's the link.",
    tone: "grateful", intent: "Ask a happy customer for a review.",
    missing_inputs: ["Confirm review link"],
    compliance_notes: ["Must not improperly incentivize reviews."],
    suggested_owner: "Operations", notes: "Ask while the experience is fresh.",
  },
  {
    key: "reactivation_message", message_type: "reactivation", channel: "email", audience: "lead",
    title: "Reactivation Message",
    subject: "Still thinking about your {{service_type}}?",
    body: "Hi {{contact.first_name}},\n\nNo pressure at all — just here whenever you'd like a free {{service_type}} assessment. Here are a couple of signs it may be time.",
    tone: "no-pressure", intent: "Re-engage a cold lead with value.",
    missing_inputs: ["Confirm suppression/opt-out rules"],
    compliance_notes: ["Reactivation: confirm consent + opt-out compliance before any future send."],
    suggested_owner: "Marketing (Valentina insights)", notes: "Respect frequency caps; lead with value.",
  },
  {
    key: "report_summary_message", message_type: "report_summary", channel: "report_message", audience: "internal",
    title: "Report Summary Message",
    body: "Internal summary draft: {{period}} performance — {{leads_count}} leads, {{cpl}} CPL, {{trend}} trend. Recommended focus: {{focus_area}}.",
    tone: "concise", intent: "Internal report/summary draft for human review.",
    missing_inputs: ["Confirm reporting period + metrics source"],
    compliance_notes: [], suggested_owner: "Analytics (Vega)", notes: "Internal-only summary; not client-facing.",
  },
  {
    key: "competitor_response_angle", message_type: "competitor_response", channel: "internal_note", audience: "internal",
    title: "Competitor Response Angle Message",
    body: "Internal angle draft: competitor is leaning into {{competitor_angle}}. Suggested positioning response: {{our_angle}}. Consider testing {{test_idea}} (human review required).",
    tone: "strategic", intent: "Internal positioning/response angle for human consideration.",
    missing_inputs: ["Confirm competitor insight source (no scraping)"],
    compliance_notes: [], suggested_owner: "Marketing (Valentina)", notes: "Internal strategy note; never sent externally.",
  },
];

export function getMessageTemplate(key: string): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find((t) => t.key === key);
}

export function messageTemplateToInput(t: MessageTemplate, opts: { client_id?: string | null; source_agent?: string | null } = {}): VaultMessageDraftInput {
  return {
    client_id: opts.client_id ?? null,
    title: t.title,
    message_type: t.message_type,
    channel: t.channel,
    audience: t.audience,
    source_agent: opts.source_agent ?? null,
    subject: t.subject ?? null,
    body: t.body,
    tone: t.tone,
    intent: t.intent,
    missing_inputs: t.missing_inputs,
    compliance_notes: t.compliance_notes,
    evidence: [`Template: ${t.title}`, `Suggested owner: ${t.suggested_owner}`, t.notes],
    metadata: { template_key: t.key, suggested_owner: t.suggested_owner },
  };
}
