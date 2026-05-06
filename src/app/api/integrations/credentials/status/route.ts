/**
 * GET /api/integrations/credentials/status?clientId=xxx
 *
 * Returns credential status metadata for a client WITHOUT exposing
 * any raw credential values. Safe to call from the UI.
 *
 * Response:
 * {
 *   meta: { saved: boolean, accountId: string|null, accountLabel: string|null, updatedAt: string|null },
 *   ghl:  { saved: boolean, accountId: string|null, accountLabel: string|null, updatedAt: string|null }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId query param required." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rowsRaw, error } = await supabase
    .from("client_integration_credentials")
    .select("provider, account_id, account_label, updated_at")
    .eq("client_id", clientId);

  if (error) {
    return NextResponse.json({ error: "Failed to query credentials." }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = rowsRaw as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metaRow = rows?.find((r: any) => r.provider === "meta");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghlRow = rows?.find((r: any) => r.provider === "ghl");

  return NextResponse.json({
    meta: {
      saved: Boolean(metaRow),
      accountId: metaRow?.account_id ?? null,
      accountLabel: metaRow?.account_label ?? null,
      updatedAt: metaRow?.updated_at ?? null,
    },
    ghl: {
      saved: Boolean(ghlRow),
      accountId: ghlRow?.account_id ?? null,
      accountLabel: ghlRow?.account_label ?? null,
      updatedAt: ghlRow?.updated_at ?? null,
    },
  });
}
