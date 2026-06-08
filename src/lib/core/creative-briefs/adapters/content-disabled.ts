// Vault Core — Content / social publishing adapter: DISABLED (Phase 9.7).
//
// The explicit future-adapter boundary for content execution. Performs NO I/O: imports no
// social/Meta/YouTube SDK or HTTP client, uses no credentials/tokens, never calls a social
// or ad API. It only reports that content execution is disabled. Actually posting,
// publishing, uploading, scheduling, or launching an ad requires a separate, explicitly-
// approved future phase.

export interface ContentAdapterResult {
  enabled: false;
  status: "adapter_disabled";
  future_adapter_required: true;
  message: string;
}

export const contentAdapterEnabled = false;

export function contentDisabled(): ContentAdapterResult {
  return {
    enabled: false,
    status: "adapter_disabled",
    future_adapter_required: true,
    message: "Content execution is disabled in Phase 9.7. Creative briefs are internal planning artifacts only; nothing is posted, published, uploaded, scheduled, or launched, and no social/Meta API is called. A future approved content adapter is required to publish anything live.",
  };
}
