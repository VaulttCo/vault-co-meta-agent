// Server-side only — update a single operator_tasks row.
// Only updates status, priority, title, description, due_date, assigned_to, checklist.
// No Meta, GHL, SMS, email, or external action. Saving does not mean work was done externally.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["open", "in_progress", "blocked", "done", "archived"] as const;
const ALLOWED_PRIORITIES = ["urgent", "high", "medium", "low"] as const;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];
type AllowedPriority = (typeof ALLOWED_PRIORITIES)[number];

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

interface PatchBody {
  status?: string;
  priority?: string;
  title?: string;
  description?: string;
  dueDate?: string;
  assignedTo?: string;
  checklist?: unknown;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── 1. Auth ───────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Permission ─────────────────────────────────────────────
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden — operator role required to update tasks" }, { status: 403 });
  }

  // ── 3. Route param ────────────────────────────────────────────
  const { id: taskId } = await params;
  if (!taskId?.trim()) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  // ── 4. Parse body ─────────────────────────────────────────────
  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ── 5. Validate and build update ─────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status as AllowedStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    updates.status = body.status as AllowedStatus;
  }

  if (body.priority !== undefined) {
    if (!ALLOWED_PRIORITIES.includes(body.priority as AllowedPriority)) {
      return NextResponse.json(
        { error: `Invalid priority. Allowed: ${ALLOWED_PRIORITIES.join(", ")}` },
        { status: 400 }
      );
    }
    updates.priority = body.priority as AllowedPriority;
  }

  if (body.title !== undefined) {
    const trimmed = body.title.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    }
    updates.title = trimmed;
  }

  if (body.description !== undefined) {
    updates.description = typeof body.description === "string" ? body.description.trim() || null : null;
  }

  if (body.dueDate !== undefined) {
    updates.due_date = typeof body.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)
      ? body.dueDate
      : null;
  }

  if (body.assignedTo !== undefined) {
    updates.assigned_to = typeof body.assignedTo === "string" ? body.assignedTo.trim().slice(0, 200) || null : null;
  }

  if (body.checklist !== undefined) {
    if (!Array.isArray(body.checklist)) {
      return NextResponse.json({ error: "checklist must be an array" }, { status: 400 });
    }
    if (body.checklist.length > 50) {
      return NextResponse.json({ error: "checklist cannot exceed 50 items" }, { status: 400 });
    }
    const sanitized: ChecklistItem[] = [];
    for (const item of body.checklist) {
      if (typeof item !== "object" || item === null) continue;
      const it = item as Record<string, unknown>;
      if (typeof it.id !== "string" || typeof it.label !== "string") continue;
      sanitized.push({
        id: it.id.trim().slice(0, 100),
        label: it.label.trim().slice(0, 500),
        done: it.done === true,
      });
    }
    updates.checklist = sanitized;
  }

  // Reject no-op patches (only updated_at set)
  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // ── 6. Update ─────────────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      return NextResponse.json({ success: true, mockMode: true });
    }

    const { error } = await supabase
      .from("operator_tasks")
      .update(updates)
      .eq("id", taskId.trim());

    if (error) {
      console.error("[PATCH /api/operator-tasks/[id]]", error);
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/operator-tasks/[id]]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
