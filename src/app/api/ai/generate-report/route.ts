import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyReport } from "@/lib/ai/service";
import type { WeeklyReportInput } from "@/lib/ai/service";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: WeeklyReportInput;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.clientName || !body.reportPeriod) {
    return NextResponse.json(
      { error: "Missing required fields: clientName, reportPeriod" },
      { status: 400 }
    );
  }

  try {
    const result = await generateWeeklyReport(body);

    // Persist to Supabase when clientId is provided and DB is configured
    if (body.clientId && !result.mockMode) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = getSupabaseServerClient() as any;
        if (supabase) {
          const parseNum = (s: string) =>
            parseFloat(s.replace(/[^0-9.]/g, "")) || null;
          const parseRate = (s: string) => {
            const n = parseFloat(s.replace(/[^0-9.]/g, ""));
            return isNaN(n) ? null : n / 100;
          };

          const today = new Date().toISOString().slice(0, 10);
          await supabase.from("reports").insert({
            client_id: body.clientId,
            report_type: "weekly",
            report_period: body.reportPeriod,
            report_period_start: today,
            report_period_end: today,
            spend: parseNum(body.spend),
            leads: body.leads,
            booked_appointments: body.booked,
            cpl: parseNum(body.cpl),
            cpba: parseNum(body.cpba),
            show_rate: parseRate(body.showRate),
            pipeline_value: parseNum(body.pipelineValue),
            revenue_generated: parseNum(body.revenueGenerated),
            wins: body.wins,
            issues: body.issues,
            next_actions: body.nextActions,
            generated_content: result.report ?? null,
            status: "draft",
          });
        }
      } catch (saveErr) {
        // Non-fatal — report generation still succeeded
        console.warn("[POST /api/ai/generate-report] save to DB failed:", saveErr);
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/ai/generate-report]", err);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
