// Server-side only — read and create internal operator queue tasks.
// Reads/writes public.operator_tasks only. No Meta, GHL, SMS, email, or external action.
// Saving a task does not mean any work has been performed externally.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_TASK_TYPES = [
  "integration",
  "creative",
  "campaign",
  "ghl_workflow",
  "client_message",
  "reporting",
  "follow_up",
  "sales_process",
  "data_cleanup",
  "internal_admin",
] as const;

const ALLOWED_PRIORITIES = ["urgent", "high", "medium", "low"] as const;
const ALLOWED_STATUSES = ["open", "in_progress", "blocked", "done", "archived"] as const;
const ALLOWED_SOURCES = ["manual", "veronica"] as const;

type AllowedTaskType = (typeof ALLOWED_TASK_TYPES)[number];
type AllowedPriority = (typeof ALLOWED_PRIORITIES)[number];
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];
type AllowedSource = (typeof ALLOWED_SOURCES)[number];

export async function GET(_req: NextRequest) {
  // ── 1. Auth ───────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Permission ─────────────────────────────────────────────
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 3. Fetch ──────────────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      return NextResponse.json({ tasks: [] });
    }

    const { data, error } = await supabase
      .from("operator_tasks")
      .select("*, clients(company_name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/operator-tasks]", error);
      return NextResponse.json({ tasks: [] });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tasks = (data ?? []).map((row: any) => ({
      id: row.id,
      clientId: row.client_id ?? null,
      clientName: row.clients?.company_name ?? null,
      title: row.title,
      description: row.description ?? null,
      taskType: row.task_type,
      priority: row.priority,
      status: row.status,
      source: row.source,
      sourceAgent: row.source_agent ?? null,
      sourceDraftId: row.source_draft_id ?? null,
      dueDate: row.due_date ?? null,
      assignedTo: row.assigned_to ?? null,
      createdBy: row.created_by ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("[GET /api/operator-tasks]", err);
    return NextResponse.json({ tasks: [] });
  }
}

interface CreateTaskBody {
  clientId?: string;
  title: string;
  description?: string;
  taskType?: string;
  priority?: string;
  status?: string;
  source?: string;
  sourceAgent?: string;
  sourceDraftId?: string;
  dueDate?: string;
  assignedTo?: string;
}

export async function POST(req: NextRequest) {
  // ── 1. Auth ───────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Permission ─────────────────────────────────────────────
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden — operator role required to create tasks" }, { status: 403 });
  }

  // ── 3. Parse body ─────────────────────────────────────────────
  let body: CreateTaskBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ── 4. Validate ───────────────────────────────────────────────
  const trimmedTitle = body.title?.trim();
  if (!trimmedTitle) {
    return NextResponse.json({ error: "title is required and cannot be empty" }, { status: 400 });
  }

  const taskType = (body.taskType ?? "internal_admin") as AllowedTaskType;
  if (!ALLOWED_TASK_TYPES.includes(taskType)) {
    return NextResponse.json(
      { error: `Invalid task_type. Allowed: ${ALLOWED_TASK_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const priority = (body.priority ?? "medium") as AllowedPriority;
  if (!ALLOWED_PRIORITIES.includes(priority)) {
    return NextResponse.json(
      { error: `Invalid priority. Allowed: ${ALLOWED_PRIORITIES.join(", ")}` },
      { status: 400 }
    );
  }

  const status = (body.status ?? "open") as AllowedStatus;
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const source = (body.source ?? "manual") as AllowedSource;
  if (!ALLOWED_SOURCES.includes(source)) {
    return NextResponse.json(
      { error: `Invalid source. Allowed: ${ALLOWED_SOURCES.join(", ")}` },
      { status: 400 }
    );
  }

  // Sanitize optional fields
  const safeClientId = typeof body.clientId === "string" && body.clientId.trim() ? body.clientId.trim() : null;
  const safeDescription = typeof body.description === "string" ? body.description.trim() || null : null;
  const safeSourceAgent = typeof body.sourceAgent === "string" ? body.sourceAgent.trim().slice(0, 100) || null : null;
  const safeSourceDraftId = typeof body.sourceDraftId === "string" && body.sourceDraftId.trim() ? body.sourceDraftId.trim() : null;
  const safeDueDate = typeof body.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) ? body.dueDate : null;
  const safeAssignedTo = typeof body.assignedTo === "string" ? body.assignedTo.trim().slice(0, 200) || null : null;

  // ── 5. Insert ─────────────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      return NextResponse.json({ success: true, mockMode: true, id: `mock-${Date.now()}` });
    }

    const insert = {
      client_id: safeClientId,
      title: trimmedTitle,
      description: safeDescription,
      task_type: taskType,
      priority,
      status,
      source,
      source_agent: safeSourceAgent,
      source_draft_id: safeSourceDraftId,
      due_date: safeDueDate,
      assigned_to: safeAssignedTo,
      created_by: auth.userId,
    };

    const { data, error } = await supabase
      .from("operator_tasks")
      .insert(insert)
      .select("id")
      .single();

    if (error) {
      // FK violation on client_id — retry without it
      if (error.code === "23503") {
        console.error("[POST /api/operator-tasks] FK violation on client_id:", safeClientId);
        const { data: d2, error: e2 } = await supabase
          .from("operator_tasks")
          .insert({ ...insert, client_id: null })
          .select("id")
          .single();

        if (e2) {
          console.error("[POST /api/operator-tasks]", e2);
          return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
        }
        return NextResponse.json({ success: true, id: d2.id, clientIdDropped: true });
      }

      console.error("[POST /api/operator-tasks]", error);
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("[POST /api/operator-tasks]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
