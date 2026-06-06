// POST /api/core/actions/[id]/assign — set internal owner / priority / due / labels
// (Phase 9.2). INTERNAL TRIAGE ONLY: stores values in metadata.assignment and appends
// an `assigned` / `priority_changed` audit entry. It changes NO approval/execution
// status, never executes, and never touches an external system. All inputs are
// sanitized; no secrets/PII reach the DTO.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getAction, applyTriagePatch, toActionDTO, type TriagePatch } from "@/lib/core/actions/db";
import { scrubText } from "@/lib/core/actions/validation";
import { ACTION_PRIORITIES, type ActionPriority } from "@/lib/core/actions/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }
const PRIORITIES = new Set<string>(ACTION_PRIORITIES);

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const action = await getAction(id);
  if (!action) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const patch: TriagePatch = {};
  let priorityChanged = false;

  // owner: sanitized text or null to clear.
  if ("owner" in body) {
    patch.owner = typeof body.owner === "string" && body.owner.trim() ? scrubText(body.owner).slice(0, 120) : null;
  }
  // priority: must be a known value, or null to clear.
  if ("priority" in body) {
    if (body.priority === null) { patch.priority = null; priorityChanged = true; }
    else if (typeof body.priority === "string" && PRIORITIES.has(body.priority)) { patch.priority = body.priority as ActionPriority; priorityChanged = true; }
    else return NextResponse.json({ error: "invalid priority" }, { status: 400 });
  }
  // due_at: a valid date (ISO) or null to clear.
  if ("due_at" in body) {
    if (body.due_at === null) patch.due_at = null;
    else if (typeof body.due_at === "string" && !Number.isNaN(new Date(body.due_at).getTime())) patch.due_at = new Date(body.due_at).toISOString();
    else return NextResponse.json({ error: "invalid due_at" }, { status: 400 });
  }
  // labels: sanitized string list (max 10), or [] to clear.
  if ("labels" in body) {
    patch.labels = Array.isArray(body.labels)
      ? body.labels.filter((x: unknown): x is string => typeof x === "string").map((x: string) => scrubText(x).slice(0, 40)).filter((x: string) => x.trim()).slice(0, 10)
      : [];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no assignable fields provided (owner, priority, due_at, labels)" }, { status: 400 });
  }

  const onlyPriority = priorityChanged && !("owner" in patch) && !("due_at" in patch) && !("labels" in patch);
  const prevPriority = (action.metadata as { assignment?: { priority?: string } } | undefined)?.assignment?.priority ?? null;

  const updated = await applyTriagePatch(action, patch, {
    at: new Date().toISOString(),
    actor: auth.userId,
    event: onlyPriority ? "priority_changed" : "assigned",
    message: onlyPriority ? `Priority set to ${patch.priority ?? "none"}` : "Owner/priority/labels updated",
    previous_status: onlyPriority ? String(prevPriority) : undefined,
    next_status: onlyPriority ? String(patch.priority ?? "none") : undefined,
  });
  // Null after compare-and-set retries = a concurrency conflict, not a server error.
  if (!updated) return NextResponse.json({ error: "Could not apply the update — please retry." }, { status: 409 });
  return NextResponse.json({ action: toActionDTO(updated) });
}
