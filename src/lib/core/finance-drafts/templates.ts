// Vault Core — Finance / Invoice DRAFT templates (Phase 9.6). PURE / static.
//
// Starter finance PLANS for common Vault Co billing/revenue moments. Every template is
// draft-only (no invoice created/sent/finalized, no charge, no payment collected, no money
// moved). Amounts are advisory TEXT only; client-specific values use {{placeholder}}
// tokens — never real Stripe IDs, card/bank numbers, or raw payloads. Instantiated into a
// VaultFinanceDraftInput, then re-validated/sanitized on save.

import type {
  FinanceType, FinanceLineItem, FinancePartnerSplit, VaultFinanceDraftInput,
} from "./types";

export interface FinanceTemplate {
  key: string;
  finance_type: FinanceType;
  title: string;
  description: string;
  amount_summary: string;
  calculation?: string;
  line_items: FinanceLineItem[];
  partner_split?: FinancePartnerSplit;
  payment_terms?: string;
  missing_inputs: string[];
  compliance_notes: string[];
  evidence: string[];
  suggested_owner: string;
  notes: string;
}

const li = (label: string, amount_text: string | null = null, notes: string | null = null): FinanceLineItem => ({ label, amount_text, notes });

export const FINANCE_TEMPLATES: FinanceTemplate[] = [
  {
    key: "setup_fee_invoice",
    finance_type: "setup_fee_invoice",
    title: "Vault Co Setup Fee Invoice Draft",
    description: "Vault Co's one-time onboarding / setup fee invoice draft for a new Vault Co client.",
    amount_summary: "Setup fee: {{setup_fee_amount}} (one-time, advisory)",
    calculation: "One-time onboarding setup fee per the signed agreement.",
    line_items: [li("Onboarding & setup fee", "{{setup_fee_amount}}", "One-time")],
    payment_terms: "Due on onboarding (advisory — a human invoices via the billing system)",
    missing_inputs: ["Confirm setup fee amount", "Confirm signed agreement reference"],
    compliance_notes: ["Confirm the setup fee amount + terms match the signed agreement."],
    evidence: ["Signed agreement (reference only)"],
    suggested_owner: "Valerie (Financial Director)",
    notes: "Draft for human review; a person invoices via the billing system.",
  },
  {
    key: "revenue_share_invoice",
    finance_type: "revenue_share_invoice",
    title: "Vault Co Revenue Share Calculation",
    description: "Vault Co performance revenue-share calculation (e.g. 5% of the extra revenue Vault Co generated for a client).",
    amount_summary: "Revenue share: {{share_pct}} of {{extra_revenue}} = {{share_amount}} (advisory)",
    calculation: "Revenue share = agreed % × attributed extra revenue for the period (see attribution evidence).",
    line_items: [
      li("Base retainer", "{{retainer_amount}}", "Monthly"),
      li("Revenue share ({{share_pct}} of extra revenue)", "{{share_amount}}", "Performance"),
    ],
    payment_terms: "Net 15 (advisory)",
    missing_inputs: ["Confirm attributed extra revenue", "Confirm share %", "Confirm period"],
    compliance_notes: ["Revenue-share amount must tie to verified attribution evidence before any future invoicing."],
    evidence: ["Attribution evidence (Vega)", "Period revenue summary"],
    suggested_owner: "Valerie (with Vega attribution)",
    notes: "Tie the share to verified attribution; draft only.",
  },
  {
    key: "partner_split_summary",
    finance_type: "partner_split_summary",
    title: "Vault Co Partner Split Summary",
    description: "Vault Co internal summary of how fees/revenue split between Vault Co partners for a period.",
    amount_summary: "Partner split summary for {{period}} (advisory, internal)",
    calculation: "Split derived from Vault Co fee × agreed partner percentages.",
    line_items: [li("Vault Co fee (period)", "{{vault_fee}}", "Basis for split")],
    partner_split: { summary: "Agreed split of the Vault Co fee for {{period}}.", shares: ["Nick: {{nick_pct}} = {{nick_amount}}", "Jaxon: {{jaxon_pct}} = {{jaxon_amount}}"] },
    payment_terms: "Internal payout cadence (advisory)",
    missing_inputs: ["Confirm period fee total", "Confirm partner percentages"],
    compliance_notes: ["Confirm the agreed split terms before any future payout."],
    evidence: ["Revenue snapshot (period)"],
    suggested_owner: "Valerie (Financial Director)",
    notes: "Internal-only summary; no payout is made here.",
  },
  {
    key: "monthly_revenue_closeout",
    finance_type: "revenue_closeout",
    title: "Vault Co Monthly Revenue Closeout",
    description: "Vault Co end-of-month revenue closeout summary for review and lock.",
    amount_summary: "Closeout for {{period}}: revenue {{revenue}}, Vault fee {{vault_fee}} (advisory)",
    calculation: "Aggregated closed-won revenue and Vault Co fee for the billing month.",
    line_items: [
      li("Closed-won revenue", "{{revenue}}", "Period total"),
      li("Vault Co fee", "{{vault_fee}}", "Period total"),
    ],
    payment_terms: "N/A (internal closeout)",
    missing_inputs: ["Confirm all client snapshots are reviewed", "Confirm period"],
    compliance_notes: ["Closeout figures must reconcile with reviewed client snapshots before lock."],
    evidence: ["Client revenue snapshots (period)"],
    suggested_owner: "Valerie (with Vanessa agenda)",
    notes: "Summary for review/lock; no money moves.",
  },
  {
    key: "payment_follow_up",
    finance_type: "payment_follow_up",
    title: "Vault Co Payment Follow-Up Draft",
    description: "Vault Co internal note proposing a professional, non-threatening payment follow-up to a Vault Co client.",
    amount_summary: "Open balance: {{open_amount}} (advisory)",
    calculation: "Open balance per the most recent reviewed invoice status.",
    line_items: [li("Open invoice balance", "{{open_amount}}", "Advisory")],
    payment_terms: "Per original terms (advisory)",
    missing_inputs: ["Confirm open balance", "Confirm invoice reference (no raw IDs)"],
    compliance_notes: ["Keep professional and non-threatening; a human sends any message. No client is contacted here."],
    evidence: ["Invoice status (reviewed)"],
    suggested_owner: "Valerie (Vivian flags client context)",
    notes: "Pairs with a message draft; this artifact never contacts the client.",
  },
  {
    key: "overdue_invoice_review",
    finance_type: "overdue_invoice_review",
    title: "Vault Co Overdue Invoice Review",
    description: "Vault Co internal review note for a Vault Co invoice flagged past due.",
    amount_summary: "Overdue balance: {{overdue_amount}}, {{days_overdue}} days (advisory)",
    calculation: "Days overdue and balance from the reviewed invoice status.",
    line_items: [li("Overdue balance", "{{overdue_amount}}", "{{days_overdue}} days overdue")],
    payment_terms: "Past original terms (advisory)",
    missing_inputs: ["Confirm overdue amount", "Confirm days overdue", "Confirm prior follow-ups"],
    compliance_notes: ["Keep professional and non-threatening; a human decides next steps. No client is contacted here."],
    evidence: ["Invoice status (past_due, reviewed)"],
    suggested_owner: "Valerie (Vanessa highlights high-value/overdue)",
    notes: "Review + recommendation only; no dunning is triggered.",
  },
  {
    key: "commission_calculation",
    finance_type: "commission_calculation",
    title: "Vault Co Commission / Attribution Review",
    description: "Vault Co internal commission / attribution calculation for a period.",
    amount_summary: "Commission: {{commission_amount}} for {{period}} (advisory)",
    calculation: "Commission = agreed rate × attributed result (see attribution evidence).",
    line_items: [li("Attributed result", "{{attributed_value}}", "Basis"), li("Commission ({{rate}})", "{{commission_amount}}", "Calculated")],
    payment_terms: "Internal payout cadence (advisory)",
    missing_inputs: ["Confirm attributed result", "Confirm commission rate"],
    compliance_notes: ["Confirm the agreed rate + attribution before any future payout."],
    evidence: ["Attribution evidence (Vega)"],
    suggested_owner: "Valerie (with Vega attribution)",
    notes: "Calculation draft only; no payout is made.",
  },
  {
    key: "revenue_attribution_review",
    finance_type: "attribution_review",
    title: "Vault Co Client Acquisition Economics",
    description: "Vault Co's own acquisition economics — CAC, LTV, payback, and channel efficiency for acquiring agency clients.",
    amount_summary: "Vault Co acquisition economics for {{period}} (advisory, internal)",
    calculation: "CAC = Vault Co ad/sales spend ÷ new clients won. Compare against client LTV + payback window using internal tracking evidence.",
    line_items: [
      li("Vault Co acquisition spend ({{channel}})", "{{spend}}", "Period"),
      li("New Vault Co clients won", "{{new_clients}}", "Period"),
      li("CAC (spend ÷ new clients)", "{{cac}}", "Calculated"),
      li("Avg client LTV", "{{ltv}}", "Advisory"),
    ],
    payment_terms: "N/A (internal review)",
    missing_inputs: ["Confirm acquisition spend by channel", "Confirm new-client count", "Confirm LTV assumption"],
    compliance_notes: ["Acquisition economics must be evidence-based; flag gaps before acting on them."],
    evidence: ["Vault Co spend/attribution evidence (Vega)", "Acquisition channel context (Valentina/Veronica)"],
    suggested_owner: "Valerie (with Vega/Valentina)",
    notes: "Tells Vault Co which acquisition channels to scale; review only.",
  },
  {
    key: "refund_review",
    finance_type: "refund_review",
    title: "Vault Co Refund Review",
    description: "Vault Co internal review note for a requested or proposed Vault Co refund.",
    amount_summary: "Proposed refund: {{refund_amount}} (advisory)",
    calculation: "Refund amount per policy and the reviewed invoice/payment status.",
    line_items: [li("Proposed refund", "{{refund_amount}}", "Per policy")],
    payment_terms: "N/A (review only)",
    missing_inputs: ["Confirm refund policy applies", "Confirm amount", "Confirm approver"],
    compliance_notes: ["Confirm refund policy + approval before any future refund. No funds are moved here."],
    evidence: ["Invoice/payment status (reviewed)", "Refund policy reference"],
    suggested_owner: "Valerie (Financial Director)",
    notes: "Review + recommendation only; no refund is issued.",
  },
  {
    key: "custom_finance_draft",
    finance_type: "custom",
    title: "Vault Co Custom Finance Draft",
    description: "Blank, structured starting point for a bespoke Vault Co finance artifact.",
    amount_summary: "Define the amount summary (advisory text only)",
    calculation: "Define how the number was derived.",
    line_items: [li("Line item 1", "{{amount}}", "Draft")],
    payment_terms: "Define terms (advisory)",
    missing_inputs: ["Amount", "Terms", "Evidence"],
    compliance_notes: [],
    evidence: ["Add supporting evidence"],
    suggested_owner: "Valerie (Financial Director)",
    notes: "Use when none of the presets fit; fill in before review.",
  },
];

export function getFinanceTemplate(key: string): FinanceTemplate | undefined {
  return FINANCE_TEMPLATES.find((t) => t.key === key);
}

export function financeTemplateToInput(
  t: FinanceTemplate,
  opts: { client_id?: string | null; source_agent?: string | null } = {},
): VaultFinanceDraftInput {
  return {
    client_id: opts.client_id ?? null,
    title: t.title,
    description: t.description,
    finance_type: t.finance_type,
    source_agent: opts.source_agent ?? "valerie",
    amount_summary: t.amount_summary,
    calculation: t.calculation ?? null,
    line_items: t.line_items,
    partner_split: t.partner_split ?? null,
    payment_terms: t.payment_terms ?? null,
    missing_inputs: t.missing_inputs,
    compliance_notes: t.compliance_notes,
    evidence: [`Template: ${t.title}`, `Suggested owner: ${t.suggested_owner}`, t.notes, ...t.evidence],
    metadata: { template_key: t.key, suggested_owner: t.suggested_owner },
  };
}
