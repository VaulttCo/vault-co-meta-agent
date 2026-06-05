// Vault Core — DISABLED external adapter (Phase 9.0).
//
// Every external target (GHL / Meta / Stripe / SMS / email / calendar / Slack /
// ClickUp / website) routes here. It NEVER calls an external system, NEVER sends,
// launches, charges, or mutates anything. It only reports that execution is not
// enabled. Enabling any external adapter is a separate, explicitly-approved phase.

import type { VaultAction } from "../types";
import type { AdapterResult, ExecutionAdapter } from "./index";

export const disabledAdapter: ExecutionAdapter = {
  name: "disabled",
  enabled: false,
  async execute(action: VaultAction): Promise<AdapterResult> {
    return {
      executionStatus: "adapter_disabled",
      error: `Adapter for "${action.target_system}" is disabled in this phase. The action is approved, but external execution requires a future approved adapter.`,
      result: { adapter: "disabled", target_system: action.target_system, executed: false },
    };
  },
};
