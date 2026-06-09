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

// INTERNAL-FIRST (see ../operating-principles.ts): these default to VAULT CO's OWN
// messages — Vault Co prospects (from Meta ads / outreach), inbound leads, current Vault Co
// clients, and internal team updates — not generic client deliverables. All draft-only.
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    key: "missed_call_lead_reply", message_type: "missed_call_reply", channel: "sms", audience: "lead",
    title: "Vault Co Missed Call Lead Reply",
    body: "Hey {{contact.first_name}}, sorry we missed your call — this is Vault Co. Were you reaching out about getting more booked appointments for your business?",
    tone: "friendly", intent: "Recover a missed inbound call from a Vault Co prospect and re-open the conversation.",
    missing_inputs: ["Confirm Vault Co SMS sender number"],
    compliance_notes: ["Keep concise; include opt-out where required."],
    suggested_owner: "Vault Co setter team (Veronica)", notes: "Speed matters — short and human.",
  },
  {
    key: "new_inquiry_speed_to_lead", message_type: "lead_reply", channel: "sms", audience: "lead",
    title: "Vault Co New Meta Lead Speed-to-Lead Reply",
    body: "Hi {{contact.first_name}}, thanks for reaching out to Vault Co! When's a good time for a quick call to map out how we'd get you more booked jobs?",
    tone: "warm", intent: "Respond fast to a new Vault Co prospect (Meta ad/outreach) and book a discovery call.",
    missing_inputs: ["Confirm Vault Co booking link/calendar"],
    compliance_notes: [], suggested_owner: "Vault Co lead acquisition (Veronica)", notes: "Pair with a 5-minute call SLA.",
  },
  {
    key: "appointment_confirmation", message_type: "appointment_confirmation", channel: "sms", audience: "lead",
    title: "Vault Co Discovery Call Confirmation",
    body: "You're booked, {{contact.first_name}}! Your Vault Co strategy call is {{appointment_time}}. Reply YES to confirm.",
    tone: "clear", intent: "Confirm a booked Vault Co discovery/strategy call and reduce no-shows.",
    missing_inputs: ["Confirm appointment_time token + timezone"],
    compliance_notes: [], suggested_owner: "Vault Co operations", notes: "Clear confirm ask reduces no-shows.",
  },
  {
    key: "appointment_reminder", message_type: "appointment_reminder", channel: "sms", audience: "lead",
    title: "Vault Co Discovery Call Reminder",
    body: "Reminder: your Vault Co strategy call is {{appointment_time}}. Bring your current lead numbers and we'll map the plan. Reply here if anything changes.",
    tone: "helpful", intent: "Remind a Vault Co prospect of an upcoming strategy call.",
    missing_inputs: ["Confirm reminder timing window"],
    compliance_notes: [], suggested_owner: "Vault Co operations", notes: "One or two touches is enough.",
  },
  {
    key: "no_show_follow_up", message_type: "no_show_follow_up", channel: "sms", audience: "lead",
    title: "Vault Co No-Show Recovery",
    body: "Sorry we missed you, {{contact.first_name}}! Want to grab a new time for your Vault Co strategy call?",
    tone: "blame-free", intent: "Recover a missed Vault Co discovery/sales call by rebooking.",
    missing_inputs: ["Confirm rebooking link"],
    compliance_notes: [], suggested_owner: "Vault Co setter team", notes: "Keep tone blame-free.",
  },
  {
    key: "estimate_follow_up", message_type: "estimate_follow_up", channel: "sms", audience: "lead",
    title: "Vault Co Strategy Call Follow-Up",
    body: "Hi {{contact.first_name}}, any questions after our strategy call? Happy to walk through how Vault Co would book more jobs for you.",
    tone: "helpful", intent: "Nudge a Vault Co prospect toward a decision after a strategy call.",
    missing_inputs: ["Confirm next-step / proposal reference"],
    compliance_notes: [], suggested_owner: "Vault Co sales", notes: "Lead with helpfulness, not pressure.",
  },
  {
    key: "proposal_follow_up", message_type: "proposal_follow_up", channel: "email", audience: "lead",
    title: "Vault Co Proposal Follow-Up",
    subject: "Following up on your Vault Co proposal",
    body: "Hi {{contact.first_name}},\n\nJust checking the Vault Co proposal came through okay. Happy to clarify scope, timeline, or ROI — whatever's helpful. Here's the simple next step to get your booked-appointment system live whenever you're ready.",
    tone: "professional", intent: "Move a sent Vault Co proposal toward a signed agreement.",
    missing_inputs: ["Confirm e-sign link"],
    compliance_notes: [], suggested_owner: "Vault Co sales (Valerie flags closeout)", notes: "Track proposal age.",
  },
  {
    key: "onboarding_access_request", message_type: "onboarding_access_request", channel: "email", audience: "client",
    title: "Vault Co New Client Onboarding Access Request",
    subject: "Quick setup items to launch your Vault Co system",
    body: "Hi {{client.first_name}},\n\nWelcome to Vault Co! To get your system live we'll need: ad account access, GHL access, logo/brand assets, and your service area + offer details. Here's a short checklist — reply whenever it's handy.",
    tone: "welcoming", intent: "Collect onboarding access/assets from a new Vault Co client (internal prep; a human sends).",
    missing_inputs: ["Confirm required access list per client"],
    compliance_notes: [], suggested_owner: "Vault Co client success (Vivian — never contacts clients directly)",
    notes: "Vivian prepares; a human sends.",
  },
  {
    key: "client_check_in", message_type: "client_check_in", channel: "email", audience: "client",
    title: "Vault Co Client Check-In",
    subject: "Quick update on your Vault Co campaigns",
    body: "Hey {{client.first_name}}, quick check-in from Vault Co — we're reviewing {{focus_area}} and will send the next performance notes shortly. Anything you want us to push on?",
    tone: "reassuring", intent: "Proactive Vault Co client check-in / retention touch.",
    missing_inputs: ["Confirm focus_area token"],
    compliance_notes: [], suggested_owner: "Vault Co client success (Vivian)", notes: "Keep it brief and specific.",
  },
  {
    key: "client_weekly_update", message_type: "client_update", channel: "email", audience: "client",
    title: "Vault Co Weekly Client Update",
    subject: "Your weekly Vault Co performance snapshot",
    body: "Hi {{client.first_name}},\n\nHere's this week's Vault Co snapshot: {{leads_count}} leads at {{cpl}} CPL. We're focusing on {{focus_area}} next. Full notes attached.",
    tone: "informative", intent: "Weekly performance update for a Vault Co client.",
    missing_inputs: ["Confirm metrics source (leads_count, cpl)"],
    compliance_notes: [], suggested_owner: "Vault Co account (Vega data, Vivian delivery)", notes: "Numbers come from approved reporting.",
  },
  {
    key: "payment_follow_up", message_type: "payment_follow_up", channel: "email", audience: "client",
    title: "Vault Co Payment / Invoice Follow-Up",
    subject: "A quick note on your Vault Co invoice",
    body: "Hi {{client.first_name}},\n\nA gentle reminder that Vault Co invoice {{invoice_ref}} is open. Happy to answer any questions — just let us know how you'd like to proceed.",
    tone: "professional", intent: "Professional, non-threatening Vault Co payment follow-up.",
    missing_inputs: ["Confirm invoice_ref token (no raw amounts/PII)"],
    compliance_notes: ["Keep professional and non-threatening."],
    suggested_owner: "Vault Co finance (Valerie)", notes: "Never threatening; never includes raw payment data.",
  },
  {
    key: "review_request", message_type: "review_request", channel: "sms", audience: "client",
    title: "Vault Co Review / Testimonial Request",
    body: "Love seeing your results, {{contact.first_name}}! Would you be open to a quick testimonial for Vault Co? Means a ton — here's the link.",
    tone: "grateful", intent: "Ask a happy Vault Co client for a review/testimonial (feeds Vault Co's own proof).",
    missing_inputs: ["Confirm review/testimonial link"],
    compliance_notes: ["Must not improperly incentivize reviews."],
    suggested_owner: "Vault Co operations / client success", notes: "Ask while the great result is fresh.",
  },
  {
    key: "reactivation_message", message_type: "reactivation", channel: "email", audience: "lead",
    title: "Vault Co Cold Prospect Reactivation",
    subject: "Still thinking about fixing your lead flow?",
    body: "Hi {{contact.first_name}},\n\nNo pressure at all — whenever you want to see how Vault Co turns missed calls and slow follow-up into booked jobs, I'm here. Here's a quick breakdown of the system.",
    tone: "no-pressure", intent: "Re-engage a cold Vault Co prospect with value.",
    missing_inputs: ["Confirm suppression/opt-out rules"],
    compliance_notes: ["Reactivation: confirm consent + opt-out compliance before any future send."],
    suggested_owner: "Vault Co marketing (Valentina insights)", notes: "Respect frequency caps; lead with value.",
  },
  {
    key: "report_summary_message", message_type: "report_summary", channel: "report_message", audience: "internal",
    title: "Vault Co Report Summary Message",
    body: "Internal Vault Co summary draft: {{period}} performance — {{leads_count}} leads, {{cpl}} CPL, {{trend}} trend. Recommended focus: {{focus_area}}.",
    tone: "concise", intent: "Internal Vault Co report/summary draft for human review.",
    missing_inputs: ["Confirm reporting period + metrics source"],
    compliance_notes: [], suggested_owner: "Vault Co analytics (Vega)", notes: "Internal-only summary; not client-facing.",
  },
  {
    key: "competitor_response_angle", message_type: "competitor_response", channel: "internal_note", audience: "internal",
    title: "Vault Co Competitor Response Angle Message",
    body: "Internal Vault Co angle draft: a competing agency is leaning into {{competitor_angle}}. Suggested Vault Co positioning response: {{our_angle}}. Consider testing {{test_idea}} (human review required).",
    tone: "strategic", intent: "Internal Vault Co positioning/response angle for human consideration.",
    missing_inputs: ["Confirm competitor insight source (internal manual intel — no scraping)"],
    compliance_notes: [], suggested_owner: "Vault Co marketing (Valentina)", notes: "Internal strategy note; never sent externally.",
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
