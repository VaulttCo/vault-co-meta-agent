// Vault Core — Client-success / outreach adapter: DISABLED (Phase 9.8).
//
// The explicit future-adapter boundary for client-success execution. Performs NO I/O:
// imports no GHL/SMS/email SDK or HTTP client, uses no credentials/API keys, never calls a
// provider API. It only reports that client-success execution is disabled. Actually
// contacting a client, sending an SMS/email, creating/updating a GHL contact/task/
// opportunity/note, or triggering a workflow requires a separate, explicitly-approved
// future phase.

export interface ClientHealthAdapterResult {
  enabled: false;
  status: "adapter_disabled";
  future_adapter_required: true;
  message: string;
}

export const clientHealthAdapterEnabled = false;

export function clientHealthDisabled(): ClientHealthAdapterResult {
  return {
    enabled: false,
    status: "adapter_disabled",
    future_adapter_required: true,
    message: "Client-success execution is disabled in Phase 9.8. Drafts are internal planning artifacts only; no client is contacted, no SMS/email goes out, no GHL contact/task/opportunity/workflow is touched, and no external system is mutated. A future approved client-success adapter is required to do anything live.",
  };
}
