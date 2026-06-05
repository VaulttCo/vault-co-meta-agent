// Vault Core — Execution adapter registry (Phase 9.0).
//
// Routes an action to the correct adapter by target system. Internal targets →
// the internal adapter (enabled). EVERY external target → the disabled adapter.
// There is intentionally NO live external adapter in this phase.

import type { ExecutionStatus, TargetSystem, VaultAction } from "../types";
import { isAdapterEnabled } from "../policies";
import { internalAdapter } from "./internal";
import { disabledAdapter } from "./disabled";

export interface AdapterResult {
  executionStatus: ExecutionStatus;
  result?: Record<string, unknown>;
  error?: string;
}

export interface ExecutionAdapter {
  name: string;
  enabled: boolean;
  execute(action: VaultAction): Promise<AdapterResult>;
}

/** Resolve the adapter for a target. Internal → internalAdapter; external →
 *  disabledAdapter. Never returns a live external adapter in Phase 9.0. */
export function getAdapter(target: TargetSystem): ExecutionAdapter {
  return isAdapterEnabled(target) ? internalAdapter : disabledAdapter;
}

export { internalAdapter, disabledAdapter };
