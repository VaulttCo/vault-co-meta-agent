// Vault Core — normalized conversation data (server-side, READ-ONLY).
//
// Reads lead conversations from GoHighLevel when configured; otherwise returns
// believable mock conversation data so Veronica always has material to analyze.
// Credentials never appear here — only normalized, non-secret fields.

import { isGhlConfigured, ghlGet } from "./client";

export type ConversationStatus = "hot" | "warm" | "cold" | "dead" | "booked";

export interface NormalizedConversation {
  leadId: string;
  leadName: string;
  stage: string;                       // CRM pipeline stage (best available)
  status: ConversationStatus;
  lastInboundDaysAgo: number | null;
  messageCount: number;
  hasAppointment: boolean;
  noShow: boolean;
  objection: string | null;
  lastMessageBody: string | null;
}

export interface ConversationData {
  conversations: NormalizedConversation[];
  source: "live" | "mock";
}

// ── Mock conversation data (tested fallback) ──────────────────
function buildMockConversations(): NormalizedConversation[] {
  return [
    { leadId: "lead-001", leadName: "Roofing — M. Alvarez", stage: "New Inquiry", status: "hot", lastInboundDaysAgo: 0, messageCount: 4, hasAppointment: false, noShow: false, objection: null, lastMessageBody: "Yeah we had hail damage last week, how soon can someone come out?" },
    { leadId: "lead-002", leadName: "HVAC — T. Brooks", stage: "Contacted", status: "warm", lastInboundDaysAgo: 2, messageCount: 6, hasAppointment: false, noShow: false, objection: "Want to compare a couple quotes first", lastMessageBody: "Let me think about it and check with my wife." },
    { leadId: "lead-003", leadName: "Roofing — D. Nguyen", stage: "No Response", status: "dead", lastInboundDaysAgo: 19, messageCount: 3, hasAppointment: false, noShow: false, objection: null, lastMessageBody: "(no reply since initial text)" },
    { leadId: "lead-004", leadName: "Remodel — S. Patel", stage: "Appointment Set", status: "booked", lastInboundDaysAgo: 1, messageCount: 9, hasAppointment: true, noShow: false, objection: null, lastMessageBody: "See you Thursday at 2." },
    { leadId: "lead-005", leadName: "HVAC — J. Carter", stage: "Appointment Set", status: "warm", lastInboundDaysAgo: 3, messageCount: 7, hasAppointment: true, noShow: true, objection: null, lastMessageBody: "(missed the scheduled call)" },
    { leadId: "lead-006", leadName: "Roofing — L. Gomez", stage: "Contacted", status: "cold", lastInboundDaysAgo: 8, messageCount: 5, hasAppointment: false, noShow: false, objection: "Price seems high", lastMessageBody: "That's more than I expected." },
    { leadId: "lead-007", leadName: "Landscaping — K. Webb", stage: "New Inquiry", status: "hot", lastInboundDaysAgo: 0, messageCount: 2, hasAppointment: false, noShow: false, objection: null, lastMessageBody: "Can you do a full backyard redo this season?" },
    { leadId: "lead-008", leadName: "Roofing — P. Sterling", stage: "Long-Term Nurture", status: "dead", lastInboundDaysAgo: 34, messageCount: 4, hasAppointment: false, noShow: false, objection: "Not ready yet", lastMessageBody: "Maybe next year." },
  ];
}

// ── Live mapping (best-effort, fully defensive) ───────────────
// Any shape mismatch / error → null so getConversationData falls back to mock.
interface GhlConversationSearchResponse {
  conversations?: Array<{
    id?: string;
    contactId?: string;
    fullName?: string;
    contactName?: string;
    lastMessageBody?: string;
    lastMessageDate?: string | number;
    type?: string;
  }>;
}

function daysAgo(value: string | number | undefined): number | null {
  if (value === undefined) return null;
  const t = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000)));
}

function statusFromRecency(d: number | null): ConversationStatus {
  if (d === null) return "cold";
  if (d <= 1) return "hot";
  if (d <= 4) return "warm";
  if (d <= 14) return "cold";
  return "dead";
}

async function readLive(): Promise<NormalizedConversation[] | null> {
  if (!isGhlConfigured()) return null;
  try {
    const res = await ghlGet<GhlConversationSearchResponse>("conversations/search", { limit: 50 });
    const rows = res?.conversations;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const mapped: NormalizedConversation[] = rows.map((c, i) => {
      const d = daysAgo(c.lastMessageDate);
      return {
        leadId: c.contactId ?? c.id ?? `ghl-${i}`,
        leadName: c.fullName ?? c.contactName ?? "Lead",
        stage: "—",
        status: statusFromRecency(d),
        lastInboundDaysAgo: d,
        messageCount: 0,
        hasAppointment: false,
        noShow: false,
        objection: null,
        lastMessageBody: c.lastMessageBody ?? null,
      };
    });
    return mapped.length ? mapped : null;
  } catch {
    return null; // fail-safe → mock
  }
}

export async function getConversationData(): Promise<ConversationData> {
  const live = await readLive();
  if (live) return { conversations: live, source: "live" };
  return { conversations: buildMockConversations(), source: "mock" };
}
