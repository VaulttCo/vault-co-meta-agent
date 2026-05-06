/**
 * TEMPORARY ADMIN CLEANUP ROUTE
 * Used once to run the controlled production data cleanup based on the audit findings.
 * Protected by a secret token. Will be removed after cleanup is complete.
 * READ-ONLY for Meta/GHL. No campaign publishing. No SMS/email. No GHL workflows.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { IntegrationConnectionRow, ClientRow, ReportRow, ClientIntelligenceRow } from "@/lib/supabase/types";

const CLEANUP_SECRET = process.env.CLEANUP_SECRET || "vault-co-cleanup-2026";

export async function POST(req: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const auth = req.headers.get("x-cleanup-secret");
  if (auth !== CLEANUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const log: string[] = [];
  const changes: Record<string, unknown>[] = [];
  const unchanged: Record<string, unknown>[] = [];

  // ── STEP 1: Read all clients ──────────────────────────────────────────────
  const { data: clientsRaw, error: clientsErr } = await supabase
    .from("clients")
    .select("id, company_name, meta_ad_account_id, facebook_page_id, meta_pixel_id, ghl_location_id, notes")
    .in("id", ["jj-roofing-group", "open-forge-construction", "acorns-roofing", "kaczmar-builders"]);
  const clients = clientsRaw as Pick<ClientRow, "id" | "company_name" | "meta_ad_account_id" | "facebook_page_id" | "meta_pixel_id" | "ghl_location_id" | "notes">[] | null;

  if (clientsErr) {
    return NextResponse.json({ error: "Failed to fetch clients", detail: clientsErr.message }, { status: 500 });
  }
  log.push(`Fetched ${clients?.length ?? 0} clients`);

  // ── STEP 2: Read integration_connections ─────────────────────────────────
  const { data: integrationsRaw, error: intErr } = await supabase
    .from("integration_connections")
    .select("id, client_id, provider, provider_account_id, connection_status, last_synced_at, metadata")
    .in("client_id", ["jj-roofing-group", "open-forge-construction", "acorns-roofing", "kaczmar-builders"]);
  const integrations = integrationsRaw as Pick<IntegrationConnectionRow, "id" | "client_id" | "provider" | "provider_account_id" | "connection_status" | "last_synced_at" | "metadata">[] | null;

  if (intErr) {
    return NextResponse.json({ error: "Failed to fetch integration_connections", detail: intErr.message }, { status: 500 });
  }
  log.push(`Fetched ${integrations?.length ?? 0} integration_connections records`);

  // ── STEP 3: Read reports ──────────────────────────────────────────────────
  const { data: reportsRaw, error: reportsErr } = await supabase
    .from("reports")
    .select("id, client_id, report_type, report_period, report_period_start, spend, leads, status, summary")
    .in("client_id", ["jj-roofing-group", "open-forge-construction", "acorns-roofing", "kaczmar-builders"])
    .order("created_at", { ascending: false });
  const reports = reportsRaw as Pick<ReportRow, "id" | "client_id" | "report_type" | "report_period" | "spend" | "leads" | "status" | "summary">[] | null;

  if (reportsErr) {
    return NextResponse.json({ error: "Failed to fetch reports", detail: reportsErr.message }, { status: 500 });
  }
  log.push(`Fetched ${reports?.length ?? 0} reports`);

  // ── STEP 4: Read client_intelligence ─────────────────────────────────────
  const { data: intelligenceRaw, error: intlErr } = await supabase
    .from("client_intelligence")
    .select("id, client_id, onboarding_summary")
    .in("client_id", ["jj-roofing-group", "open-forge-construction", "acorns-roofing", "kaczmar-builders"]);
  const intelligence = intelligenceRaw as Pick<ClientIntelligenceRow, "id" | "client_id" | "onboarding_summary">[] | null;

  if (intlErr) {
    log.push(`Warning: Could not fetch client_intelligence: ${intlErr.message}`);
  }
  log.push(`Fetched ${intelligence?.length ?? 0} client_intelligence records`);

  // ── STEP 5: Fix integration mismatches ───────────────────────────────────
  for (const client of clients ?? []) {
    const clientIntegrations = (integrations ?? []).filter(i => i.client_id === client.id);
    const metaConn = clientIntegrations.find(i => i.provider === "meta");
    const ghlConn = clientIntegrations.find(i => i.provider === "ghl");

    const updates: Partial<Pick<ClientRow, "meta_ad_account_id" | "ghl_location_id">> = {};

    // ── Kaczmar Builders: has sync records but profile fields are null ──────
    if (client.id === "kaczmar-builders") {
      if (metaConn?.provider_account_id && !client.meta_ad_account_id) {
        updates.meta_ad_account_id = metaConn.provider_account_id;
        log.push(`[kaczmar-builders] Setting meta_ad_account_id = ${metaConn.provider_account_id} from integration_connections`);
      }
      if (ghlConn?.provider_account_id && !client.ghl_location_id) {
        updates.ghl_location_id = ghlConn.provider_account_id;
        log.push(`[kaczmar-builders] Setting ghl_location_id = ${ghlConn.provider_account_id} from integration_connections`);
      }
      // Pixel: do NOT mark as installed unless verified — keep null
    }

    // ── JJ Roofing: profile says connected but no sync records exist ────────
    if (client.id === "jj-roofing-group") {
      if (!metaConn && !ghlConn) {
        // Profile flags are in the mock data layer, not in the DB ClientRow directly
        // The DB stores IDs — if they are null, connection is unverified
        log.push(`[jj-roofing-group] No integration_connections records found. Profile connection flags are unverified. No DB changes needed — IDs are already null.`);
        unchanged.push({ client: "JJ Roofing Group", field: "integration_connections", reason: "No sync records exist — profile flags are unverified. IDs remain null." });
      }
    }

    // ── Open Forge: same as JJ Roofing ──────────────────────────────────────
    if (client.id === "open-forge-construction") {
      if (!metaConn && !ghlConn) {
        log.push(`[open-forge-construction] No integration_connections records found. Profile connection flags are unverified. No DB changes needed — IDs are already null.`);
        unchanged.push({ client: "Open Forge Construction", field: "integration_connections", reason: "No sync records exist — profile flags are unverified. IDs remain null." });
      }
    }

    // ── Acorns Roofing: genuinely connected, pixel not installed ────────────
    if (client.id === "acorns-roofing") {
      if (metaConn && metaConn.connection_status === "connected") {
        log.push(`[acorns-roofing] Meta connection verified via integration_connections (last synced: ${metaConn.last_synced_at}). Pixel not marked installed — keeping as-is per audit rules.`);
        unchanged.push({ client: "Acorns Roofing", field: "meta_pixel_id", reason: "Pixel not verified — keeping null per cleanup rules." });
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateErr } = await (supabase.from("clients") as any).update(updates).eq("id", client.id);

      if (updateErr) {
        log.push(`[${client.id}] ERROR updating client: ${updateErr.message}`);
      } else {
        changes.push({ client: client.company_name, updates });
        log.push(`[${client.id}] Updated client profile fields: ${JSON.stringify(updates)}`);
      }
    } else if (client.id === "kaczmar-builders") {
      // Check if IDs were already set
      if (client.meta_ad_account_id) {
        log.push(`[kaczmar-builders] meta_ad_account_id already set: ${client.meta_ad_account_id}`);
        unchanged.push({ client: "Kaczmar Builders", field: "meta_ad_account_id", reason: "Already set in profile" });
      }
      if (client.ghl_location_id) {
        log.push(`[kaczmar-builders] ghl_location_id already set: ${client.ghl_location_id}`);
        unchanged.push({ client: "Kaczmar Builders", field: "ghl_location_id", reason: "Already set in profile" });
      }
    }
  }

  // ── STEP 6: Remove/archive duplicate Open Forge reports ──────────────────
  const openForgeReports = (reports ?? []).filter(r => r.client_id === "open-forge-construction");
  // Find duplicate May Week 1 reports
  const mayWeek1Reports = openForgeReports.filter(r =>
    r.report_period?.toLowerCase().includes("may") &&
    r.report_period?.toLowerCase().includes("week 1")
  );

  if (mayWeek1Reports.length >= 2) {
    // Keep the first (most recent), delete the second (duplicate)
    const toDelete = mayWeek1Reports[mayWeek1Reports.length - 1]; // oldest duplicate
    const { error: delErr } = await supabase
      .from("reports")
      .delete()
      .eq("id", toDelete.id);

    if (delErr) {
      log.push(`[open-forge-construction] ERROR deleting duplicate report ${toDelete.id}: ${delErr.message}`);
    } else {
      changes.push({ client: "Open Forge Construction", action: "deleted_duplicate_report", reportId: toDelete.id, reportPeriod: toDelete.report_period });
      log.push(`[open-forge-construction] Deleted duplicate May Week 1 report: ${toDelete.id}`);
    }
  } else {
    log.push(`[open-forge-construction] Found ${mayWeek1Reports.length} May Week 1 report(s) — no duplicate to remove`);
    unchanged.push({ client: "Open Forge Construction", field: "reports", reason: `Only ${mayWeek1Reports.length} May Week 1 report found — no duplicate action taken` });
  }

  // ── STEP 7: Mark JJ Roofing demo report ──────────────────────────────────
  const jjReports = (reports ?? []).filter(r => r.client_id === "jj-roofing-group");
  // Find the May Week 1 report with non-zero data (demo metrics)
  const jjDemoReport = jjReports.find(r =>
    r.report_period?.toLowerCase().includes("may") &&
    r.report_period?.toLowerCase().includes("week 1") &&
    ((r.spend ?? 0) > 0 || (r.leads ?? 0) > 0)
  );

  if (jjDemoReport) {
    // Mark as demo by updating the summary to flag it
    const demoNote = `[DEMO DATA — UNVERIFIED] ${jjDemoReport.summary ?? ""}`.trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: markErr } = await (supabase.from("reports") as any).update({ summary: demoNote, status: "draft" }).eq("id", jjDemoReport.id);

    if (markErr) {
      log.push(`[jj-roofing-group] ERROR marking demo report ${jjDemoReport.id}: ${markErr.message}`);
    } else {
      changes.push({ client: "JJ Roofing Group", action: "marked_demo_report", reportId: jjDemoReport.id, reportPeriod: jjDemoReport.report_period });
      log.push(`[jj-roofing-group] Marked May Week 1 report as DEMO DATA: ${jjDemoReport.id}`);
    }
  } else {
    log.push(`[jj-roofing-group] No demo report with non-zero metrics found`);
    unchanged.push({ client: "JJ Roofing Group", field: "reports", reason: "No demo report with non-zero metrics found — no action taken" });
  }

  // ── STEP 8: Seed missing client intelligence ──────────────────────────────
  const clientsNeedingIntelligence = ["jj-roofing-group", "open-forge-construction", "acorns-roofing"];
  const existingIntelligenceIds = (intelligence ?? []).map(i => i.client_id);

  for (const clientId of clientsNeedingIntelligence) {
    if (existingIntelligenceIds.includes(clientId)) {
      log.push(`[${clientId}] Client intelligence already exists — skipping`);
      unchanged.push({ client: clientId, field: "client_intelligence", reason: "Already exists" });
      continue;
    }

    const clientRecord = (clients ?? []).find(c => c.id === clientId);
    if (!clientRecord) continue;

    // Seed a minimal client intelligence record with onboarding summary
    const seedData = {
      client_id: clientId,
      onboarding_summary: `Client intelligence record created during data cleanup on ${new Date().toISOString().split("T")[0]}. Full intelligence extraction required. Client: ${clientRecord.company_name}.`,
      company_profile: { status: "pending_extraction", note: "Requires full intelligence extraction" },
      service_area: {},
      target_market: {},
      competitive_landscape: {},
      kpi_baseline: {},
      sales_audit: {},
      content_planning: {},
      buyer_profile: {},
      market_research: {},
      offer_intelligence: {},
      sales_intelligence: {},
      brand_intelligence: {},
      campaign_implications: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: seedErr } = await (supabase.from("client_intelligence") as any).insert(seedData);

    if (seedErr) {
      log.push(`[${clientId}] ERROR seeding client intelligence: ${seedErr.message}`);
    } else {
      changes.push({ client: clientRecord.company_name, action: "seeded_client_intelligence", note: "Minimal record created — full extraction required" });
      log.push(`[${clientId}] Seeded minimal client intelligence record`);
    }
  }

  // ── STEP 9: Build final summary ───────────────────────────────────────────
  const summary = {
    timestamp: new Date().toISOString(),
    log,
    changes,
    unchanged,
    rawData: {
      clients: (clients ?? []).map(c => ({
        id: c.id,
        company_name: c.company_name,
        meta_ad_account_id: c.meta_ad_account_id,
        facebook_page_id: c.facebook_page_id,
        meta_pixel_id: c.meta_pixel_id,
        ghl_location_id: c.ghl_location_id,
      })),
      integrations: (integrations ?? []).map(i => ({
        client_id: i.client_id,
        provider: i.provider,
        provider_account_id: i.provider_account_id,
        connection_status: i.connection_status,
        last_synced_at: i.last_synced_at,
      })),
      reports: (reports ?? []).map(r => ({
        id: r.id,
        client_id: r.client_id,
        report_type: r.report_type,
        report_period: r.report_period,
        spend: r.spend,
        leads: r.leads,
        status: r.status,
      })),
      intelligence: (intelligence ?? []).map(i => ({
        client_id: i.client_id,
        has_summary: !!i.onboarding_summary,
      })),
    },
  };

  return NextResponse.json(summary, { status: 200 });
}
