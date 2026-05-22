// Revenue Dashboard shared types.
// Importable by both client components and server-side API routes.
// Contains no secrets, no external API references.

export interface ClientRevenueSettings {
  clientId: string;
  recurringBillingActive: boolean;
  recurringBillingStartDate: string | null;
  setupFeeTotal: number;
  setupMonth1Amount: number;
  setupMonth2Amount: number;
  jaxonSetupSplit: number;
  nickSetupSplit: number;
  recurringFeePercentage: number;
  nickRecurringSplit: number;
  jaxonRecurringSplit: number;
  ghlPipelineId: string | null;
  ghlLocationId: string | null;
  stripeCustomerId: string | null;
  // Phase 2A: these are always false — gated until explicitly approved in Phase 2C
  stripeInvoiceAutoCreate: boolean;
  stripeInvoiceAutoSend: boolean;
  manualRevenueEntryEnabled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Subset of fields the PATCH endpoint accepts — invoice automation gates are excluded.
export interface RevenueSettingsPatchInput {
  recurringBillingActive?: boolean;
  recurringBillingStartDate?: string | null;
  setupFeeTotal?: number;
  setupMonth1Amount?: number;
  setupMonth2Amount?: number;
  jaxonSetupSplit?: number;
  nickSetupSplit?: number;
  recurringFeePercentage?: number;
  nickRecurringSplit?: number;
  jaxonRecurringSplit?: number;
  ghlPipelineId?: string | null;
  ghlLocationId?: string | null;
  stripeCustomerId?: string | null;
  manualRevenueEntryEnabled?: boolean;
  notes?: string | null;
}

export const REVENUE_SETTINGS_DEFAULTS: Omit<
  ClientRevenueSettings,
  "clientId" | "createdAt" | "updatedAt"
> = {
  recurringBillingActive: false,
  recurringBillingStartDate: null,
  setupFeeTotal: 7000,
  setupMonth1Amount: 3500,
  setupMonth2Amount: 3500,
  jaxonSetupSplit: 0.57,
  nickSetupSplit: 0.43,
  recurringFeePercentage: 0.05,
  nickRecurringSplit: 1.0,
  jaxonRecurringSplit: 0.0,
  ghlPipelineId: null,
  ghlLocationId: null,
  stripeCustomerId: null,
  stripeInvoiceAutoCreate: false,
  stripeInvoiceAutoSend: false,
  manualRevenueEntryEnabled: true,
  notes: null,
};

export function makeDefaultSettings(clientId: string): ClientRevenueSettings {
  const now = new Date().toISOString();
  return {
    clientId,
    ...REVENUE_SETTINGS_DEFAULTS,
    createdAt: now,
    updatedAt: now,
  };
}

// ── Phase 2B: Monthly Revenue Snapshots ────────────────────────────────────────

export interface MonthlyRevenueSnapshot {
  id: string;
  clientId: string;
  billingMonth: string;           // ISO date, first of month: '2026-05-01'
  closedWonRevenue: number;
  vaultCoFee: number;
  recurringFeePercentage: number;
  nickRecurringEarnings: number;
  jaxonRecurringEarnings: number;
  source: 'manual' | 'ghl';
  reviewStatus: 'draft' | 'reviewed' | 'locked';
  reviewedAt: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Phase 2C
  dealCount: number;
  syncedAt: string | null;
  // Phase 2E: Stripe draft invoice metadata
  stripeInvoiceId: string | null;
  stripeInvoiceStatus: string | null;
  stripeInvoiceUrl: string | null;
  invoiceDraftCreatedAt: string | null;
}

// Fields the POST endpoint accepts
export interface MonthlyRevenueSnapshotInput {
  clientId: string;
  billingMonth: string;           // YYYY-MM-DD
  closedWonRevenue: number;
  notes?: string | null;
  source?: 'manual' | 'ghl';
  // Phase 2C: GHL snapshot metadata (ignored for manual entries)
  dealCount?: number;
  sourcePayload?: Record<string, unknown>;
}

// Fields the PATCH endpoint accepts
export interface MonthlyRevenueSnapshotPatchInput {
  closedWonRevenue?: number;
  reviewStatus?: 'draft' | 'reviewed' | 'locked';
  notes?: string | null;
}

// ── Phase 2C: GHL preview types ────────────────────────────────────────────────
// Safe deal summary — no contact IDs, no personal data, no GHL tokens.

export interface GHLDealPreview {
  name: string;
  amount: number;
  status: string;
  closedDate: string | null;
}

export interface GHLPreviewResult {
  clientId: string;
  billingMonth: string;
  ghlLocationId: string;
  ghlPipelineId: string | null;
  closedWonDealsCount: number;
  closedWonRevenue: number;
  vaultCoFee: number;
  nickRecurringEarnings: number;
  jaxonRecurringEarnings: 0;
  source: 'ghl';
  dealPreview: GHLDealPreview[];
  // Safe debug metadata — never contains raw API key or full location ID
  locationSource?: string;
  locationIdPresent?: boolean;
  locationIdMasked?: string;
  credentialSource?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToMonthlyRevenueSnapshot(row: any): MonthlyRevenueSnapshot {
  return {
    id:                     row.id,
    clientId:               row.client_id,
    billingMonth:           row.billing_month,
    closedWonRevenue:       Number(row.closed_won_revenue       ?? 0),
    vaultCoFee:             Number(row.vault_co_fee             ?? 0),
    recurringFeePercentage: Number(row.recurring_fee_percentage ?? 0.05),
    nickRecurringEarnings:  Number(row.nick_recurring_earnings  ?? 0),
    jaxonRecurringEarnings: Number(row.jaxon_recurring_earnings ?? 0),
    source:                 (row.source       ?? 'manual') as 'manual' | 'ghl',
    reviewStatus:           (row.review_status ?? 'draft') as 'draft' | 'reviewed' | 'locked',
    reviewedAt:             row.reviewed_at ?? null,
    notes:                  row.notes      ?? null,
    createdBy:              row.created_by ?? null,
    createdAt:              row.created_at ?? new Date().toISOString(),
    updatedAt:              row.updated_at ?? new Date().toISOString(),
    dealCount:              Number(row.deal_count ?? 0),
    syncedAt:               row.synced_at ?? null,
    stripeInvoiceId:        row.stripe_invoice_id ?? null,
    stripeInvoiceStatus:    row.stripe_invoice_status ?? null,
    stripeInvoiceUrl:       row.stripe_invoice_url ?? null,
    invoiceDraftCreatedAt:  row.invoice_draft_created_at ?? null,
  };
}

export function makeDefaultSnapshot(clientId: string, billingMonth: string): MonthlyRevenueSnapshot {
  const now = new Date().toISOString();
  return {
    id:                     `mock-${clientId}-${billingMonth}`,
    clientId,
    billingMonth,
    closedWonRevenue:       0,
    vaultCoFee:             0,
    recurringFeePercentage: 0.05,
    nickRecurringEarnings:  0,
    jaxonRecurringEarnings: 0,
    source:                 'manual',
    reviewStatus:           'draft',
    reviewedAt:             null,
    notes:                  null,
    createdBy:              null,
    createdAt:              now,
    updatedAt:              now,
    dealCount:              0,
    syncedAt:               null,
    stripeInvoiceId:        null,
    stripeInvoiceStatus:    null,
    stripeInvoiceUrl:       null,
    invoiceDraftCreatedAt:  null,
  };
}

// ── Row mapper — called inside API routes, never in client components. ──────────
// stripeInvoiceAutoCreate and stripeInvoiceAutoSend are hardcoded false
// at the mapper level so Phase 2A can never accidentally enable invoicing,
// even if a DB row contains true from a manual edit.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToRevenueSettings(row: any, clientId: string): ClientRevenueSettings {
  return {
    clientId,
    recurringBillingActive: row.recurring_billing_active ?? false,
    recurringBillingStartDate: row.recurring_billing_start_date ?? null,
    setupFeeTotal: Number(row.setup_fee_total ?? 7000),
    setupMonth1Amount: Number(row.setup_month_1_amount ?? 3500),
    setupMonth2Amount: Number(row.setup_month_2_amount ?? 3500),
    jaxonSetupSplit: Number(row.jaxon_setup_split ?? 0.57),
    nickSetupSplit: Number(row.nick_setup_split ?? 0.43),
    recurringFeePercentage: Number(row.recurring_fee_percentage ?? 0.05),
    nickRecurringSplit: Number(row.nick_recurring_split ?? 1.0),
    jaxonRecurringSplit: Number(row.jaxon_recurring_split ?? 0.0),
    ghlPipelineId: row.ghl_pipeline_id ?? null,
    ghlLocationId: row.ghl_location_id ?? null,
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeInvoiceAutoCreate: false, // Phase 2A: hardcoded off regardless of DB value
    stripeInvoiceAutoSend: false,   // Phase 2A: hardcoded off regardless of DB value
    manualRevenueEntryEnabled: row.manual_revenue_entry_enabled ?? true,
    notes: row.notes ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}
