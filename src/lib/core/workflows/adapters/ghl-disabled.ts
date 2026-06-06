// Vault Core — GHL workflow adapter: DISABLED (Phase 9.3).
//
// This is the explicit future-adapter boundary. It performs NO I/O: it does not
// import any live GHL client, does not use per-client GHL credentials, and never
// calls a GHL API. It exists only to make the disabled state explicit and typed.
// Publishing a workflow to GHL requires a separate, explicitly-approved future phase.

export interface GhlWorkflowAdapterResult {
  enabled: false;
  status: "adapter_disabled";
  future_adapter_required: true;
  message: string;
}

export const ghlWorkflowAdapterEnabled = false;

/**
 * The ONLY thing this "adapter" does is report that GHL workflow publishing is
 * disabled. It NEVER creates/updates/publishes a workflow, NEVER mutates a contact
 * or opportunity, and NEVER sends SMS/email.
 */
export function ghlWorkflowDisabled(): GhlWorkflowAdapterResult {
  return {
    enabled: false,
    status: "adapter_disabled",
    future_adapter_required: true,
    message: "GHL workflow publishing is disabled in Phase 9.3. Drafts are internal review artifacts only; a future approved adapter is required to publish.",
  };
}
