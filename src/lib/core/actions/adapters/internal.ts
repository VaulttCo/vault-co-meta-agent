// Vault Core — INTERNAL execution adapter (Phase 9.0). The ONLY enabled adapter.
//
// Executes an APPROVED action whose target is internal (internal/content/report)
// by recording it into Vault Memory + an audit trail. It writes ONLY internal
// state. It NEVER sends SMS/email, NEVER updates GHL/CRM, NEVER launches Meta or
// changes budgets, NEVER touches Stripe, NEVER publishes externally, NEVER
// triggers workflows, and NEVER creates external tasks. Mock-safe (no DB → no-op
// writes but still returns an "executed" internal result for the audit log).

import { insertActivity, insertNode } from "../../memory/db";
import type { VaultAction } from "../types";
import type { AdapterResult, ExecutionAdapter } from "./index";

export const internalAdapter: ExecutionAdapter = {
  name: "internal",
  enabled: true,
  async execute(action: VaultAction): Promise<AdapterResult> {
    const executedAt = new Date().toISOString();
    try {
      // Record the executed action as an internal memory artifact (no PII/payload).
      const nodeId = await insertNode({
        category: "initiative",
        label: `Executed: ${action.title}`.slice(0, 120),
        summary: action.safe_preview,
        confidence: 0.8,
        source_agent: action.agent_id,
        ref_type: "vault_action",
        ref_id: action.id,
        metadata: {
          action_type: action.action_type,
          target_system: action.target_system,
          risk_level: action.risk_level,
          internal: true,
          executed: true,
        },
      });

      await insertActivity({
        agent: action.agent_id,
        kind: "memory_update",
        message: `Vault Core executed an approved internal action: ${action.title} (${action.action_type.replace(/_/g, " ")}).`,
        node_id: nodeId,
        metadata: { vault_action_id: action.id, internal: true, executed: true },
      });

      return {
        executionStatus: "executed",
        result: {
          adapter: "internal",
          executed: true,
          executed_at: executedAt,
          memory_node_id: nodeId,
          target_system: action.target_system,
          // Confirm to the audit log that nothing external happened.
          external_side_effects: false,
        },
      };
    } catch (e) {
      // Log the real error server-side only; persist a GENERIC message. The raw
      // message is returned in DTOs and rendered to approval users, so it must not
      // leak Supabase/table/implementation detail.
      console.error("[internal-adapter] execution failed", { action_id: action.id, error: (e as Error).message });
      return {
        executionStatus: "failed",
        error: "Internal execution failed. The error was logged for review.",
        result: { adapter: "internal", executed: false },
      };
    }
  },
};
