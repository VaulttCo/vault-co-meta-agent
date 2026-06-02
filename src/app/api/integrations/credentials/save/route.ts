/**
 * POST /api/integrations/credentials/save
 *
 * Saves per-client integration credentials (Meta access token or GHL API key)
 * encrypted at rest using AES-256-GCM.
 *
 * SECURITY:
 * - Admin role required (checked via Supabase session)
 * - Credentials are encrypted before writing to Supabase
 * - Raw credential values are NEVER logged or returned
 * - Only non-sensitive metadata (account_id, account_label) is returned
 * - No write actions to Meta or GHL — only writes to Supabase
 *
 * Request body:
 * {
 *   clientId: string,
 *   provider: "meta" | "ghl",
 *   credentials: {
 *     // For Meta:
 *     accessToken?: string,
 *     adAccountId?: string,
 *     appId?: string,
 *     appSecret?: string,
 *     // For GHL:
 *     apiKey?: string,
 *     locationId?: string,
 *   },
 *   accountLabel?: string  // Human-readable label for display
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { encryptCredential, hasEncryptionKey } from "@/lib/crypto/credentials";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  // ── 1. Auth + permission (shared, fail-closed role resolution) ─────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!can(auth.role, "canConnectIntegrations")) {
    return NextResponse.json(
      { error: "Admin role required to save integration credentials." },
      { status: 403 }
    );
  }

  // ── 2. Service role client for the credential write (bypasses RLS) ─────────
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service role not configured." },
      { status: 503 }
    );
  }

  // ── 3. Encryption key check ────────────────────────────────────────────────
  if (!hasEncryptionKey()) {
    return NextResponse.json(
      { error: "CREDENTIAL_ENCRYPTION_KEY not configured. Contact your administrator." },
      { status: 503 }
    );
  }

  // ── 4. Parse and validate request body ────────────────────────────────────
  let body: {
    clientId?: string;
    provider?: string;
    credentials?: Record<string, string>;
    accountLabel?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { clientId, provider, credentials, accountLabel } = body;

  if (!clientId || typeof clientId !== "string") {
    return NextResponse.json({ error: "clientId is required." }, { status: 400 });
  }
  if (provider !== "meta" && provider !== "ghl") {
    return NextResponse.json(
      { error: "provider must be 'meta' or 'ghl'." },
      { status: 400 }
    );
  }
  // ── GHL feature flag ───────────────────────────────────────────────────────
  // Per-client GHL credentials power client tracking (client portal / Revenue
  // Dashboard / reporting) and are admin-only + encrypted at rest + GET-only when
  // read. Enabled by default; set CLIENT_GHL_TRACKING_ENABLED=false to hard-disable.
  // (Vault Core runtime never uses per-client GHL — it is Vault-Co env-only.)
  // Meta credential storage is unaffected.
  if (provider === "ghl" && process.env.CLIENT_GHL_TRACKING_ENABLED === "false") {
    return NextResponse.json(
      { error: "Per-client GHL tracking is disabled (CLIENT_GHL_TRACKING_ENABLED=false)." },
      { status: 501 }
    );
  }
  if (!credentials || typeof credentials !== "object") {
    return NextResponse.json({ error: "credentials object is required." }, { status: 400 });
  }

  // ── 5. Validate provider-specific required fields ─────────────────────────
  let accountId: string | null = null;

  if (provider === "meta") {
    if (!credentials.accessToken) {
      return NextResponse.json(
        { error: "Meta credentials require accessToken." },
        { status: 400 }
      );
    }
    if (!credentials.adAccountId) {
      return NextResponse.json(
        { error: "Meta credentials require adAccountId (e.g. 1896960880964810)." },
        { status: 400 }
      );
    }
    accountId = credentials.adAccountId;
  } else if (provider === "ghl") {
    if (!credentials.apiKey) {
      return NextResponse.json(
        { error: "GHL credentials require apiKey." },
        { status: 400 }
      );
    }
    if (!credentials.locationId) {
      return NextResponse.json(
        { error: "GHL credentials require locationId." },
        { status: 400 }
      );
    }
    accountId = credentials.locationId;
  }

  // ── 6. Encrypt the credentials JSON ───────────────────────────────────────
  let encryptedData: string;
  try {
    encryptedData = encryptCredential(JSON.stringify(credentials));
  } catch (err) {
    console.error("[credentials/save] Encryption error:", err);
    return NextResponse.json(
      { error: "Failed to encrypt credentials. Check CREDENTIAL_ENCRYPTION_KEY." },
      { status: 500 }
    );
  }

  // ── 7. Upsert into Supabase (service role — bypasses RLS) ──────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upsertData: any = {
    client_id: clientId,
    provider,
    encrypted_data: encryptedData,
    account_id: accountId,
    account_label: accountLabel ?? null,
    created_by: auth.userId,
    updated_at: new Date().toISOString(),
  };
  const { error: upsertError } = await supabase
    .from("client_integration_credentials")
    .upsert(upsertData, { onConflict: "client_id,provider" });

  if (upsertError) {
    console.error("[credentials/save] Supabase upsert error:", upsertError);
    return NextResponse.json(
      { error: "Failed to save credentials to database." },
      { status: 500 }
    );
  }

  // ── 8. Return success (never return the raw credentials) ──────────────────
  return NextResponse.json({
    success: true,
    clientId,
    provider,
    accountId,
    accountLabel: accountLabel ?? null,
    message: `${provider === "meta" ? "Meta Ads" : "GoHighLevel"} credentials saved and encrypted.`,
  });
}
