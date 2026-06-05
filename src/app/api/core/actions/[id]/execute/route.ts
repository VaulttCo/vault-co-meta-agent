// POST /api/core/actions/[id]/execute — policy-gated execution.
//
// SAFETY: this route ALWAYS runs the execution policy first and only ever invokes
// the resolved adapter. In Phase 9.0 the only ENABLED adapter is the internal
// adapter — every external target resolves to the disabled adapter and returns
// adapter_disabled. No SMS/email/GHL/Meta/Stripe/workflow is ever called here.
// Execution is admin / integration-manager only and never bypasses approval.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getAction, finalizeExecution, toActionDTO, appendAudit, claimForExecution } from "@/lib/core/actions/db";
import { canExecute } from "@/lib/core/actions/execution-policy";
import { getAdapter } from "@/lib/core/actions/adapters";
import type { VaultAction } from "@/lib/core/actions/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Execution is gated by a DEDICATED permission (admin-only today) used identically
  // in the server and the UI — so authority can't drift apart, and a future role
  // change can never silently widen who may execute actions via a broader perm.
  if (!can(auth.role, "canExecuteVaultActions")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const action = await getAction(id);
  if (!action) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const confirm = body.confirm === true;

  // ── THE GATE ── nothing executes unless policy allows it.
  const decision = canExecute(action, { role: auth.role, confirm });
  const now = new Date().toISOString();

  if (!decision.allowed) {
    // Read-only deny: report the policy decision WITHOUT persisting a status.
    // This row was never claimed, so writing execution_status here off a stale
    // read could clobber a concurrent approve/review. The denied state is fully
    // derivable from policy (the DTO already exposes adapter_enabled + status).
    return NextResponse.json(
      { executed: false, reason: decision.reason, action: toActionDTO(action) },
      { status: 200 }
    );
  }

  // Atomically CLAIM before executing — prevents concurrent double-execution AND
  // requires the row to still be approved (closes the review/execute TOCTOU).
  const claimed = await claimForExecution(id);
  if (!claimed) {
    return NextResponse.json(
      { executed: false, reason: "Action is already executing/executed, or no longer approved.", action: toActionDTO(action) },
      { status: 409 }
    );
  }

  // Belt-and-suspenders: re-run the policy on the freshly-claimed row before any
  // adapter invocation. If it no longer passes, revert and abort.
  const recheck = canExecute(claimed, { role: auth.role, confirm });
  if (!recheck.allowed) {
    // We own the `executing` claim — revert it conditionally (only while still
    // executing) so we never overwrite a state another request moved us to.
    const reverted = await finalizeExecution(id, {
      execution_status: recheck.blockedStatus ?? "blocked",
      execution_error: recheck.reason,
      audit_log: appendAudit(claimed, { at: now, actor: auth.userId, event: "execute:denied-postclaim", detail: recheck.reason }),
    });
    if (!reverted) {
      return NextResponse.json(
        { executed: false, reason: "Action changed during execution; nothing applied.", action: toActionDTO(claimed) },
        { status: 409 }
      );
    }
    return NextResponse.json({ executed: false, reason: recheck.reason, action: toActionDTO(reverted) }, { status: 200 });
  }

  // Resolve the adapter (internal only, since policy required an enabled adapter).
  const adapter = getAdapter(claimed.target_system);
  const result = await adapter.execute(claimed);

  const patch: Partial<VaultAction> = {
    execution_status: result.executionStatus,
    executed_by_agent: claimed.agent_id,
    executed_at: result.executionStatus === "executed" ? now : claimed.executed_at,
    execution_result: result.result ?? null,
    execution_error: result.error ?? null,
    audit_log: appendAudit(claimed, {
      at: now,
      actor: auth.userId,
      event: `execute:${result.executionStatus}`,
      detail: `adapter=${adapter.name}${result.error ? ` · ${result.error}` : ""}`,
    }),
  };
  // Finalize ONLY while still in our `executing` claim (compare-and-set). If the
  // row moved out from under us, do NOT apply the result outside the guard —
  // report a conflict instead of writing a terminal state over someone else's.
  const updated = await finalizeExecution(id, patch);
  if (!updated) {
    return NextResponse.json(
      { executed: false, reason: "Execution claim was lost before finalize; result not applied.", action: toActionDTO(claimed) },
      { status: 409 }
    );
  }
  return NextResponse.json({
    executed: result.executionStatus === "executed",
    reason: result.error ?? "Executed via internal adapter.",
    action: toActionDTO(updated),
  });
}
