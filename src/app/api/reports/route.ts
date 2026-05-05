import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PersistedReport } from "@/lib/data/data-provider";

// ── GET /api/reports?clientId=xxx ─────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      return NextResponse.json([], { status: 200 });
    }

    let query = supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (clientId) query = query.eq("client_id", clientId);

    const { data, error } = await query;
    if (error) {
      console.warn("[GET /api/reports]", error.message);
      return NextResponse.json([], { status: 200 });
    }

    // Map Supabase rows to PersistedReport shape
    const reports: PersistedReport[] = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      clientId: row.client_id as string,
      clientName: (row.client_name as string) ?? undefined,
      reportType: (row.report_type as PersistedReport["reportType"]) ?? "weekly",
      reportPeriod: (row.report_period as string) ?? "",
      reportPeriodStart: row.report_period_start as string,
      reportPeriodEnd: row.report_period_end as string,
      spend: row.spend !== null ? `$${row.spend}` : "$0",
      leads: (row.leads as number) ?? 0,
      booked: (row.booked_appointments as number) ?? 0,
      cpl: row.cpl !== null ? `$${row.cpl}` : "—",
      cpba: row.cpba !== null ? `$${row.cpba}` : "—",
      showRate: row.show_rate !== null ? `${Math.round((row.show_rate as number) * 100)}%` : "—",
      pipelineValue:
        row.pipeline_value !== null
          ? `$${(row.pipeline_value as number).toLocaleString()}`
          : "$0",
      revenueGenerated:
        row.revenue_generated !== null
          ? `$${(row.revenue_generated as number).toLocaleString()}`
          : "$0",
      wins: (row.wins as string[]) ?? [],
      issues: (row.issues as string[]) ?? [],
      nextActions: (row.next_actions as string[]) ?? [],
      generatedContent: (row.generated_content as PersistedReport["generatedContent"]) ?? undefined,
      status: (row.status as "draft" | "published") ?? "draft",
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));

    return NextResponse.json(reports);
  } catch (err) {
    console.error("[GET /api/reports]", err);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST /api/reports ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  let report: PersistedReport;
  try {
    report = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!report.clientId || !report.reportPeriod) {
    return NextResponse.json(
      { error: "Missing required fields: clientId, reportPeriod" },
      { status: 400 }
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      return NextResponse.json({ ok: true, saved: false, reason: "Supabase not configured" });
    }

    const parseNum = (s: string) => {
      const n = parseFloat(s.replace(/[^0-9.]/g, ""));
      return isNaN(n) ? null : n;
    };
    const parseRate = (s: string) => {
      const n = parseFloat(s.replace(/[^0-9.]/g, ""));
      return isNaN(n) ? null : n / 100;
    };

    const { error } = await supabase.from("reports").upsert({
      id: report.id,
      client_id: report.clientId,
      report_type: report.reportType,
      report_period: report.reportPeriod,
      report_period_start: report.reportPeriodStart,
      report_period_end: report.reportPeriodEnd,
      spend: parseNum(report.spend),
      leads: report.leads,
      booked_appointments: report.booked,
      cpl: parseNum(report.cpl),
      cpba: parseNum(report.cpba),
      show_rate: parseRate(report.showRate),
      pipeline_value: parseNum(report.pipelineValue),
      revenue_generated: parseNum(report.revenueGenerated),
      wins: report.wins,
      issues: report.issues,
      next_actions: report.nextActions,
      generated_content: report.generatedContent ?? null,
      status: report.status,
    });

    if (error) {
      console.error("[POST /api/reports] upsert error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, saved: true });
  } catch (err) {
    console.error("[POST /api/reports]", err);
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }
}
