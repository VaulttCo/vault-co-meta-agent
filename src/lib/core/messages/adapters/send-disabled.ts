// Vault Core — Message SEND adapter: DISABLED (Phase 9.4).
//
// The explicit future-adapter boundary for message sending. Performs NO I/O: imports
// no SMS/email/GHL client, uses no credentials, never calls a provider API. It only
// reports that sending is disabled. Actually sending a message requires a separate,
// explicitly-approved future phase.

export interface SendAdapterResult {
  enabled: false;
  status: "adapter_disabled";
  future_adapter_required: true;
  message: string;
}

export const messageSendAdapterEnabled = false;

export function messageSendDisabled(): SendAdapterResult {
  return {
    enabled: false,
    status: "adapter_disabled",
    future_adapter_required: true,
    message: "Message sending is disabled in Phase 9.4. Drafts are internal review artifacts only; a future approved adapter is required to send.",
  };
}
