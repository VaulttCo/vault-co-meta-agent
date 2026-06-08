// Vault Core — Finance / Invoice Draft validation + sanitization (Phase 9.6). PURE.
//
// Enforces draft-only safety: required fields (title), allowed finance_type, target_system
// ∈ {internal,stripe,report}, capped/scrubbed text everywhere, NO secrets/tokens, NO live
// Stripe IDs (invoice/payment-intent/customer/payment-method/charge/account), NO card/bank/
// account numbers, NO raw Stripe payloads, and NO money-movement language ("charge now",
// "send invoice", "finalize invoice", "collect payment", "debit", "withdraw", "transfer
// funds", …) anywhere in the draft. amount_summary / line items are advisory TEXT only —
// never a charge instruction. Builds a sanitized safe_preview.

import { scrubText } from "../actions/validation";
import { FINANCE_TYPES, FINANCE_TARGET_SYSTEMS } from "./types";
import type {
  FinanceType, FinanceTargetSystem, FinanceLineItem, FinancePartnerSplit,
  FinanceSafePreview, VaultFinanceDraftInput,
} from "./types";

const MAX_TITLE = 160;
const MAX_DESC = 600;
const MAX_FIELD = 400;
const MAX_LONG = 1000;
const MAX_LIST = 20;
const MAX_ITEM = 300;
const MAX_LINE_ITEMS = 30;

// Wording that implies a LIVE charge / send / money movement — forbidden in a DRAFT.
// Patterns are tolerant of articles ("a/an/the"), plurals, gerunds, and short
// prepositional gaps (e.g. "send an invoice", "send invoices", "create invoice in
// Stripe", "collect the client payment"). `[^.\n]{0,N}` keeps each match inside one
// clause so it can't span unrelated sentences. Negations like "no invoice is sent" /
// "no payment is collected" use the past participle AFTER the noun and so don't match
// (the trigger verb is required BEFORE the noun in base/gerund form).
const MONEY_LANGUAGE = [
  // charging a card / account / client / customer
  /\bcharg(e|es|ed|ing)\b[^.\n]{0,20}\b(card|client|customer|account|payment|now)\b/i,
  /\brun\b[^.\n]{0,12}\b(card|payment|charge)\b/i,
  // sending / issuing / finalizing / voiding an invoice
  /\b(send|sends|sending|issue|issues|issuing|finali[sz]e|finali[sz]es|finali[sz]ing|void|voids|voiding)\b[^.\n]{0,18}\binvoices?\b/i,
  // creating / generating / raising / filing an invoice (incl. "… in Stripe")
  /\b(create|creates|creating|generate|generates|generating|raise|raises|raising|file|files|filing)\b[^.\n]{0,24}\binvoices?\b/i,
  /\bstripe\b[^.\n]{0,16}\binvoices?\b/i,
  // collecting / running a payment
  /\bcollect(s|ing)?\b[^.\n]{0,18}\bpayments?\b/i,
  // money movement
  /\b(debit|debits|debiting|withdraw|withdraws|withdrawing|withdrawal|withdrawals)\b/i,
  /\btransfer(s|red|ring)?\b[^.\n]{0,12}\bfunds?\b/i,
  /\bmov(e|es|ing)\b[^.\n]{0,8}\bmoney\b/i,
  /\bpush\b[^.\n]{0,10}\blive\b/i,
];
function hasMoneyLanguage(s: string): boolean {
  return MONEY_LANGUAGE.some((re) => re.test(s));
}

// Finance-specific redaction layered on top of scrubText: Stripe object ids (in_/ch_/pi_/
// cus_/pm_/card_/acct_/sub_/seti_/re_/txn_/price_/prod_/po_/ba_/src_/tok_…), and long
// numeric runs that look like card/bank/account numbers (12+ digits).
function scrubFinance(s: string): string {
  return s
    .replace(/\b(in|ch|pi|cus|pm|card|acct|sub|seti|re|txn|price|prod|po|ba|src|tok|cs|ii|il|inv)_[A-Za-z0-9]{6,}/gi, "[redacted-id]")
    .replace(/\b\d{12,}\b/g, "[redacted-number]");
}
function safeUrlsOnly(s: string): string {
  return s.replace(/\b([a-z][a-z0-9+.-]*):\/\/\S+/gi, (m, scheme) => (/^https?$/i.test(scheme) ? m : "[link-removed]"));
}
function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = scrubFinance(safeUrlsOnly(scrubText(v))).slice(0, max).trim();
  return t || null;
}
function cleanList(v: unknown, max = MAX_LIST, itemMax = MAX_ITEM): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => clean(x, itemMax)).filter((x): x is string => !!x).slice(0, max);
}
function cleanRefSlug(v: unknown): string | null {
  const t = clean(v, 120);
  return t && /^[a-zA-Z0-9_:.-]{1,120}$/.test(t) ? t : null;
}
// Strict UUID validator (for source_action_id — the DB column is uuid). Returns null for
// anything that is not a well-formed UUID so a non-UUID slug can't fail at insert time.
function cleanUuid(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) ? t : null;
}

function cleanLineItems(v: unknown): FinanceLineItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((raw) => {
      const s = (raw && typeof raw === "object" ? raw : {}) as Partial<FinanceLineItem>;
      const label = clean(s.label, 160);
      if (!label) return null;
      return {
        label,
        amount_text: clean(s.amount_text, 80),
        notes: clean(s.notes, MAX_FIELD),
      } as FinanceLineItem;
    })
    .filter((x): x is FinanceLineItem => !!x)
    .slice(0, MAX_LINE_ITEMS);
}

function cleanPartnerSplit(v: unknown): FinancePartnerSplit {
  const p = (v && typeof v === "object" ? v : {}) as Partial<FinancePartnerSplit>;
  return {
    summary: clean(p.summary, MAX_FIELD),
    shares: cleanList(p.shares),
  };
}

// Default compliance notes — always include a human-approval + draft-only note, plus
// payment/client-facing reminders where relevant.
function complianceFor(finance_type: FinanceType, extra: string[]): string[] {
  const notes = new Set<string>(extra);
  notes.add("Draft-only — requires human approval. No invoice is created/sent/finalized, no card is charged, no payment is collected, and no money is moved in this phase.");
  const isInvoice = /invoice|retainer|setup_fee/.test(finance_type);
  if (isInvoice) {
    notes.add("Invoice draft: confirm amounts, tax, and terms are accurate before any future invoicing. A human invoices via the billing system directly.");
  }
  if (finance_type === "payment_follow_up" || finance_type === "overdue_invoice_review") {
    notes.add("Payment follow-up: keep professional and non-threatening; a human sends any message. No client is contacted here.");
  }
  if (finance_type === "refund_review") {
    notes.add("Refund review: confirm refund policy + approval before any future refund. No funds are moved here.");
  }
  if (finance_type === "partner_split_summary" || finance_type === "commission_calculation") {
    notes.add("Split/commission: confirm the agreed split terms before any future payout.");
  }
  return [...notes].slice(0, MAX_LIST);
}

export function buildFinanceSafePreview(
  title: string, finance_type: FinanceType, amount_summary: string | null, lineItems: FinanceLineItem[],
): FinanceSafePreview {
  const summary = `Draft finance artifact: ${title} (${finance_type.replace(/_/g, " ")}). Review only — no invoice is sent, no card is charged, and no payment is collected in this phase.`.slice(0, 600);
  const highlights: string[] = [];
  if (amount_summary) highlights.push(amount_summary.slice(0, 200));
  highlights.push(`${lineItems.length} line item${lineItems.length === 1 ? "" : "s"}`);
  return {
    summary,
    finance_type,
    amount_line: (amount_summary ?? "Amount: see draft").slice(0, 240),
    line_item_count: lineItems.length,
    highlights: highlights.slice(0, 6),
  };
}

export interface FinanceValidationResult {
  ok: boolean;
  error?: string;
  value?: {
    client_id: string | null;
    title: string;
    description: string | null;
    finance_type: FinanceType;
    source_agent: string | null;
    source_action_id: string | null;
    source_snapshot_id: string | null;
    target_system: FinanceTargetSystem;
    amount_summary: string | null;
    calculation: string | null;
    line_items: FinanceLineItem[];
    partner_split: FinancePartnerSplit;
    payment_terms: string | null;
    follow_up_message_ref: string | null;
    missing_inputs: string[];
    compliance_notes: string[];
    evidence: string[];
    safe_preview: FinanceSafePreview;
  };
}

// Default target lane per finance type. Invoice/refund types nominally route to the
// (DISABLED) stripe lane; calculations/summaries/reviews stay on internal/report lanes.
function targetForType(finance_type: FinanceType): FinanceTargetSystem {
  switch (finance_type) {
    case "setup_fee_invoice":
    case "revenue_share_invoice":
    case "monthly_retainer_invoice":
    case "refund_review":
      return "stripe";
    case "revenue_closeout":
    case "attribution_review":
    case "commission_calculation":
    case "partner_split_summary":
      return "report";
    default:
      return "internal";
  }
}

export function validateFinanceDraftInput(body: unknown): FinanceValidationResult {
  const b = (body && typeof body === "object" ? body : {}) as VaultFinanceDraftInput;

  const finance_type = FINANCE_TYPES.includes(b.finance_type as FinanceType) ? (b.finance_type as FinanceType) : null;
  if (!finance_type) return { ok: false, error: "valid finance_type is required" };

  // target_system, if provided, must be one of the allowed lanes; else default by type.
  let target_system: FinanceTargetSystem = targetForType(finance_type);
  if (typeof (b as { target_system?: unknown }).target_system === "string") {
    const t = (b as { target_system?: string }).target_system as FinanceTargetSystem;
    if (!FINANCE_TARGET_SYSTEMS.includes(t)) return { ok: false, error: "target_system must be internal, stripe, or report" };
    target_system = t;
  }

  const title = clean(b.title, MAX_TITLE);
  if (!title) return { ok: false, error: "title is required" };

  // Sanitize EVERY user-controlled text field ONCE so the money-language scan and the
  // returned value use the same sanitized objects (no inconsistent re-sanitization).
  const description = clean(b.description, MAX_DESC);
  const amount_summary = clean(b.amount_summary, MAX_FIELD);
  const calculation = clean(b.calculation, MAX_LONG);
  const line_items = cleanLineItems(b.line_items);
  const partner_split = cleanPartnerSplit(b.partner_split);
  const payment_terms = clean(b.payment_terms, MAX_FIELD);
  const missing_inputs = cleanList(b.missing_inputs);
  const userComplianceNotes = cleanList(b.compliance_notes);
  const evidence = cleanList(b.evidence);

  // Reject any live charge / send / money-movement language across ALL human-authored
  // surfaces before storage. (System default compliance notes are added AFTER this scan.)
  const corpus = [
    title, description ?? "", amount_summary ?? "", calculation ?? "", payment_terms ?? "",
    ...line_items.flatMap((l) => [l.label, l.amount_text ?? "", l.notes ?? ""]),
    partner_split.summary ?? "", ...partner_split.shares,
    ...missing_inputs, ...userComplianceNotes, ...evidence,
  ].join(" \n ");
  if (hasMoneyLanguage(corpus)) {
    return { ok: false, error: "draft contains live charge / send / money-movement language — finance drafts are plan-only; nothing is invoiced, charged, or collected" };
  }

  return {
    ok: true,
    value: {
      client_id: cleanRefSlug(b.client_id),
      title,
      description,
      finance_type,
      source_agent: cleanRefSlug(b.source_agent),
      source_action_id: cleanUuid(b.source_action_id),
      source_snapshot_id: cleanRefSlug(b.source_snapshot_id),
      target_system,
      amount_summary,
      calculation,
      line_items,
      partner_split,
      payment_terms,
      follow_up_message_ref: cleanRefSlug(b.follow_up_message_ref),
      missing_inputs,
      compliance_notes: complianceFor(finance_type, userComplianceNotes),
      evidence,
      safe_preview: buildFinanceSafePreview(title, finance_type, amount_summary, line_items),
    },
  };
}

// ── DTO-boundary re-sanitizers (defense in depth — never trust stored JSON) ──
export function scrubStrList(v: unknown, max = MAX_LIST, itemMax = MAX_ITEM): string[] {
  return cleanList(v, max, itemMax);
}
export function scrubOptional(v: unknown, max = MAX_LONG): string | null {
  return clean(v, max);
}
export function scrubLineItems(v: unknown): FinanceLineItem[] { return cleanLineItems(v); }
export function scrubPartnerSplit(v: unknown): FinancePartnerSplit { return cleanPartnerSplit(v); }
