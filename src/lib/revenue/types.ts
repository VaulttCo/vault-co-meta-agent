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
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Fields the POST endpoint accepts
export interface MonthlyRevenueSnapshotInput {
  clientId: string;
  billingMonth: string;           // YYYY-MM-DD
  closedWonRevenue: number;
  notes?: string | null;
  source?: 'manual' | 'ghl';
}

// Fields the PATCH endpoint accepts
export interface MonthlyRevenueSnapshotPatchInput {
  closedWonRevenue?: number;
  reviewStatus?: 'draft' | 'reviewed' | 'locked';
  notes?: string | null;
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
    notes:                  row.notes      ?? null,
    createdBy:              row.created_by ?? null,
    createdAt:              row.created_at ?? new Date().toISOString(),
    updatedAt:              row.updated_at ?? new Date().toISOString(),
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
    notes:                  null,
    createdBy:              null,
    createdAt:              now,
    updatedAt:              now,
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
