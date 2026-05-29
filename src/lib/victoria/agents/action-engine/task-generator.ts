// Victoria — Task Generator
// Generates a prioritized, time-aware task list from the call outcome.
// Pure rule-based — no AI, no I/O.
// Server-side only.

import type { LiveCallSession, FollowUpType, TaskItem, TaskType, TaskPriority } from "../../types";

let _taskIdCounter = 0;
function makeTaskId(type: TaskType): string {
  return `task_${type}_${++_taskIdCounter}`;
}

// ─────────────────────────────────────────────────────────────
// Task template builders
// ─────────────────────────────────────────────────────────────

function task(
  type: TaskType,
  priority: TaskPriority,
  title: string,
  description: string,
  dueOffsetMinutes: number
): TaskItem {
  const due = new Date(Date.now() + dueOffsetMinutes * 60 * 1000);
  const dueLabel = dueOffsetMinutes <= 60
    ? `within ${dueOffsetMinutes} minutes`
    : dueOffsetMinutes <= 240
      ? `within ${dueOffsetMinutes / 60} hours`
      : dueOffsetMinutes <= 1440
        ? "today"
        : dueOffsetMinutes <= 2880
          ? "within 48 hours"
          : dueOffsetMinutes <= 10080
            ? "this week"
            : "within 2 weeks";

  return {
    id: makeTaskId(type),
    type,
    priority,
    title,
    description,
    due_by: dueLabel,
    due_offset_minutes: dueOffsetMinutes,
  };
}

// ─────────────────────────────────────────────────────────────
// Per follow-up type task sets
// ─────────────────────────────────────────────────────────────

function hotLeadTasks(session: LiveCallSession): TaskItem[] {
  const name = session.prospect.name.split(" ")[0];
  return [
    task("send_sms",       "urgent", `SMS ${name} now`,                     `Send personalized follow-up text referencing a specific moment from the call. Keep it under 160 chars.`, 30),
    task("send_email",     "urgent", "Send follow-up email",                 `Send a personalized email with subject line referencing their pain. Include one clear CTA.`, 120),
    task("send_proposal",  "high",   "Prepare and send proposal",            `Prepare a tailored proposal based on the pain and goals discussed. Deliver within 24 hours.`, 24 * 60),
    task("call_back",      "high",   `Call ${name} to close`,                `Schedule a close call within 48 hours to review the proposal and commit next steps.`, 48 * 60),
    task("crm_update",     "normal", "Update CRM with call intelligence",    `Log trust score, objections, pain points, and recommended next action from this call.`, 60),
  ];
}

function nurtureTasks(session: LiveCallSession): TaskItem[] {
  const name = session.prospect.name.split(" ")[0];
  return [
    task("send_email",      "high",   "Send follow-up email within 24h",   `Reference ${name}'s specific pain point and why Vault Co is the right fit. Single CTA.`, 24 * 60),
    task("send_case_study", "high",   "Send vertical-specific case study",  `Find and send a case study from a contractor in their vertical with similar results.`, 36 * 60),
    task("schedule_meeting","high",   "Schedule next discovery call",       `Book a follow-up call within 72 hours. Use the email CTA to get confirmation.`, 72 * 60),
    task("crm_update",      "normal", "Update CRM with prospect profile",   `Log emotional state, discovery depth, objections, and next call objective.`, 60),
  ];
}

function skepticalTasks(session: LiveCallSession): TaskItem[] {
  const name = session.prospect.name.split(" ")[0];
  return [
    task("send_email",      "high",   "Send trust-first follow-up email",  `Open with acknowledgment of their experience, not a pitch. Lead with a case study or reference offer.`, 24 * 60),
    task("send_case_study", "high",   `Share ${session.prospect.vertical} case study`, `A real result from a real contractor in their vertical. Let the result do the selling.`, 24 * 60),
    task("schedule_meeting","high",   "Offer a reference call",            `Invite ${name} to speak with an existing Vault Co client in the same vertical. No sales — just peer conversation.`, 48 * 60),
    task("crm_update",      "normal", "Log skepticism signals",            `Document the specific agency experience or concern that triggered skepticism. Critical for next call prep.`, 60),
  ];
}

function authorityIssueTasks(session: LiveCallSession): TaskItem[] {
  const name = session.prospect.name.split(" ")[0];
  return [
    task("send_email",      "urgent", "Send shareable summary email",      `Address email to both ${name} and their partner/spouse if known. Keep to 1 page: one problem, one solution, one ROI.`, 24 * 60),
    task("schedule_meeting","high",   "Book a joint decision meeting",     `Request a call that includes the decision maker. Offer 3 time options in the email.`, 48 * 60),
    task("send_proposal",   "high",   "Prepare 1-page business case",     `Create a visual, ROI-focused 1-pager designed to be forwarded. Avoid jargon. Focus on revenue outcome.`, 24 * 60),
    task("crm_update",      "normal", "Log authority structure",           `Document who the decision maker is and what their concerns/priorities are likely to be.`, 60),
  ];
}

function budgetIssueTasks(session: LiveCallSession): TaskItem[] {
  const name = session.prospect.name.split(" ")[0];
  return [
    task("send_email",      "high",   "Send ROI breakdown email",         `Show the cost-per-lead math. Compare Vault Co cost to what ${name} is currently spending per lead.`, 24 * 60),
    task("send_proposal",   "high",   "Prepare phased entry proposal",    `Offer a minimum viable start — one campaign, one market, month-to-month. Prove ROI, then scale.`, 36 * 60),
    task("schedule_meeting","high",   "Schedule pricing discussion call", `Book a call specifically to walk through numbers and financing. Have clear breakeven math ready.`, 72 * 60),
    task("crm_update",      "normal", "Log budget intelligence",          `Document their stated budget constraints and what they're currently spending on marketing.`, 60),
  ];
}

function timingIssueTasks(session: LiveCallSession): TaskItem[] {
  const name = session.prospect.name.split(" ")[0];
  return [
    task("send_email",      "high",   "Send seasonal urgency email",      `Reference the upcoming season and the lead time needed to get campaigns live and optimized before it starts.`, 24 * 60),
    task("schedule_meeting","high",   `Set ${name} reminder for 2 weeks`,  `Set a reminder to follow up in 14 days with a seasonal urgency angle. Don't wait for them to come back.`, 14 * 24 * 60),
    task("send_case_study", "normal", "Send relevant seasonal case study", `A case study of a contractor who started their campaign at the right time vs. one who started too late.`, 48 * 60),
    task("crm_update",      "normal", "Log timing blocker",               `Document the reason for timing hesitation and the date of their stated season start.`, 60),
  ];
}

function ghostingRiskTasks(session: LiveCallSession): TaskItem[] {
  const name = session.prospect.name.split(" ")[0];
  return [
    task("send_sms",         "urgent", `Re-engage ${name} via SMS now`,     `Send a simple, non-pushy text: "Hey ${name}, thought of something after our call — worth 2 mins?" No pitch.`, 60),
    task("call_back",        "urgent", "Leave a voicemail today",           `Leave a short voicemail: specific to what they said, new angle, clear next step. Do not pitch.`, 120),
    task("send_email",       "high",   "Send re-engagement email",          `New angle email — change the subject, not the product. Reference one specific pain point they expressed.`, 24 * 60),
    task("breakup_message",  "normal", "Prepare breakup message for day 7", `If no response in 7 days, send a permission-to-close email: "Should I take you off my list or is now not the right time?"`, 7 * 24 * 60),
    task("crm_update",       "normal", "Log low engagement signals",        `Note the low close readiness and engagement scores. Mark as ghosting risk in CRM for manager visibility.`, 60),
  ];
}

function proposalSentTasks(session: LiveCallSession): TaskItem[] {
  const name = session.prospect.name.split(" ")[0];
  return [
    task("call_back",       "urgent", `Follow up on proposal with ${name}`, `Call to confirm they received the proposal and ask what questions they have. Don't wait for them to call you.`, 24 * 60),
    task("send_email",      "high",   "Proposal follow-up email",          `Reference the specific proposal. Ask: 'What questions came up as you looked through it?' Creates dialogue.`, 24 * 60),
    task("schedule_meeting","high",   "Book proposal review call",         `Book a call explicitly to review the proposal together. Frame it as getting their feedback, not closing.`, 48 * 60),
    task("crm_update",      "normal", "Log proposal delivery",             `Record the proposal send date, package offered, and proposal-specific questions they had.`, 60),
  ];
}

function followUpBookedTasks(session: LiveCallSession): TaskItem[] {
  const name = session.prospect.name.split(" ")[0];
  return [
    task("send_email",       "high",   "Send pre-read before next call",   `Send proposal or case study as pre-read 24 hours before the next call. Creates investment and accountability.`, 24 * 60),
    task("send_loom",        "high",   `Send Loom recap for ${name}`,       `Record a 2-minute Loom summarizing what you discussed, what you'll cover on the next call, and why this matters for them.`, 120),
    task("schedule_meeting", "urgent", "Confirm next call appointment",    `Send calendar confirmation with agenda. Confirming the meeting is the job right now.`, 30),
    task("crm_update",       "normal", "Log booked follow-up",             `Record the scheduled follow-up date and the specific agenda items for that call.`, 60),
  ];
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export function generateTasks(
  session: LiveCallSession,
  followUpType: FollowUpType
): TaskItem[] {
  _taskIdCounter = 0; // Reset per run

  let tasks: TaskItem[];

  switch (followUpType) {
    case "hot_lead":        tasks = hotLeadTasks(session); break;
    case "nurture":         tasks = nurtureTasks(session); break;
    case "skeptical":       tasks = skepticalTasks(session); break;
    case "authority_issue": tasks = authorityIssueTasks(session); break;
    case "budget_issue":    tasks = budgetIssueTasks(session); break;
    case "timing_issue":    tasks = timingIssueTasks(session); break;
    case "ghosting_risk":   tasks = ghostingRiskTasks(session); break;
    case "proposal_sent":   tasks = proposalSentTasks(session); break;
    case "follow_up_booked": tasks = followUpBookedTasks(session); break;
    default:                tasks = nurtureTasks(session);
  }

  // Sort by priority then by due time
  const priorityRank: Record<TaskPriority, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
  return tasks.sort((a, b) => {
    const pDiff = (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0);
    if (pDiff !== 0) return pDiff;
    return a.due_offset_minutes - b.due_offset_minutes;
  });
}
