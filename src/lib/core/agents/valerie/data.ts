// Vault Core — Valerie's financial data reader (server-side, READ-ONLY).
//
// Reads existing internal Vault Co revenue data:
//   • client_monthly_revenue_snapshots (closed-won revenue, partner splits,
//     Stripe invoice metadata, review status)
//   • client_revenue_settings (setup fees, splits, billing flags)
// Falls back to mock figures derived from clients.stats when those tables /
// Supabase env are absent — the mandatory mock fallback pattern.
//
// STRICTLY read-only. Never writes to Stripe, never moves money, never mutates
// any revenue record. Valerie only analyzes what is already stored.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getDataProvider } from "@/lib/data/data-provider";

export interface FinancialSnapshot {
  clientId: string;
  clientName: string;
  billingMonth: string | null;
  revenue: number;          // closed-won revenue
  vaultFee: number;
  nickEarnings: number;
  jaxonEarnings: number;
  invoiceStatus: string | null;   // stripe_invoice_status (draft/open/paid/past_due/…)
  reviewStatus: string | null;    // draft/reviewed/locked
}

export interface FinancialData {
  snapshots: FinancialSnapshot[];
  totalRevenue: number;
  source: "live" | "mock";
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

// ── Live read (most recent billing month per client) ──────────
async function readLive(): Promise<FinancialData | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseServerClient() as any;
  if (!db) return null;
  try {
    const { data, error } = await db
      .from("client_monthly_revenue_snapshots")
      .select("client_id, billing_month, closed_won_revenue, vault_co_fee, nick_recurring_earnings, jaxon_recurring_earnings, stripe_invoice_status, review_status, clients(company_name)")
      .order("billing_month", { ascending: false })
      .limit(200);
    if (error || !data || data.length === 0) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snapshots: FinancialSnapshot[] = (data as any[]).map((r) => ({
      clientId: r.client_id,
      clientName: r.clients?.company_name ?? r.client_id,
      billingMonth: r.billing_month ?? null,
      revenue: num(r.closed_won_revenue),
      vaultFee: num(r.vault_co_fee),
      nickEarnings: num(r.nick_recurring_earnings),
      jaxonEarnings: num(r.jaxon_recurring_earnings),
      invoiceStatus: r.stripe_invoice_status ?? null,
      reviewStatus: r.review_status ?? null,
    }));
    const totalRevenue = snapshots.reduce((s, x) => s + x.revenue, 0);
    return { snapshots, totalRevenue, source: "live" };
  } catch {
    return null;
  }
}

// ── Mock fallback (derive from clients.stats) ─────────────────
async function readMock(): Promise<FinancialData> {
  let clients: Awaited<ReturnType<ReturnType<typeof getDataProvider>["getClients"]>> = [];
  try {
    clients = await getDataProvider().getClients();
  } catch {
    clients = [];
  }
  // Synthesize believable invoice statuses for variety (deterministic by index).
  const statuses = ["paid", "paid", "open", "past_due", "draft"];
  const snapshots: FinancialSnapshot[] = clients.slice(0, 8).map((c, i) => {
    const revenue = num(c.stats?.revenue);
    const vaultFee = Math.round(revenue * 0.05);
    return {
      clientId: c.id,
      clientName: c.name,
      billingMonth: null,
      revenue,
      vaultFee,
      nickEarnings: Math.round(vaultFee * 0.43),
      jaxonEarnings: Math.round(vaultFee * 0.57),
      invoiceStatus: statuses[i % statuses.length],
      reviewStatus: i % 3 === 0 ? "draft" : "reviewed",
    };
  });
  const totalRevenue = snapshots.reduce((s, x) => s + x.revenue, 0);
  return { snapshots, totalRevenue, source: "mock" };
}

export async function getFinancialData(): Promise<FinancialData> {
  return (await readLive()) ?? (await readMock());
}
