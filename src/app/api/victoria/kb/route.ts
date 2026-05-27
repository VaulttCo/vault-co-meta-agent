// /api/victoria/kb
// GET:  List knowledge base entries (optionally filtered by domain)
// POST: Upload a new knowledge base entry
// Server-side only.

import { NextRequest, NextResponse } from "next/server";
import { listKBEntries, insertKBEntry } from "@/lib/victoria/db";
import { KB_DOMAINS } from "@/lib/victoria/types";

const VALID_DOMAINS = KB_DOMAINS.map((d) => d.value) as string[];

// ─────────────────────────────────────────────────────────────
// GET /api/victoria/kb?domain=xxx&limit=50
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain") ?? undefined;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);

  if (domain && !VALID_DOMAINS.includes(domain)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  const entries = await listKBEntries(domain, limit);
  return NextResponse.json({ entries, count: entries.length });
}

// ─────────────────────────────────────────────────────────────
// POST /api/victoria/kb — create a new KB entry
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: {
    domain: string;
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    vertical_relevance?: string[];
    call_phase?: string[];
    objection_type?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.domain || !body.title || !body.content) {
    return NextResponse.json(
      { error: "domain, title, and content are required" },
      { status: 400 }
    );
  }

  if (!VALID_DOMAINS.includes(body.domain)) {
    return NextResponse.json(
      { error: `Invalid domain. Must be one of: ${VALID_DOMAINS.join(", ")}` },
      { status: 400 }
    );
  }

  if (body.content.length > 10000) {
    return NextResponse.json({ error: "Content too long (max 10,000 characters)" }, { status: 400 });
  }

  const id = await insertKBEntry({
    domain: body.domain,
    title: body.title.trim(),
    content: body.content.trim(),
    category: body.category ?? null,
    tags: body.tags ?? [],
    vertical_relevance: body.vertical_relevance ?? [],
    call_phase: body.call_phase ?? [],
    objection_type: body.objection_type ?? null,
    is_active: true,
  });

  if (!id) {
    return NextResponse.json(
      { error: "Failed to save entry — check Supabase connection" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id, success: true }, { status: 201 });
}
