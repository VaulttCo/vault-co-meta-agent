// Vault Core — Meta CAMPAIGN adapter: DISABLED (Phase 9.5).
//
// The explicit future-adapter boundary for Meta campaign execution. Performs NO I/O:
// imports no Meta/Facebook SDK or HTTP client, uses no credentials/access tokens, never
// calls a Meta Graph/Marketing API. It only reports that Meta execution is disabled.
// Actually launching a campaign, creating an ad set/ad, publishing a lead form, or
// changing a budget requires a separate, explicitly-approved future phase.

export interface MetaAdapterResult {
  enabled: false;
  status: "adapter_disabled";
  future_adapter_required: true;
  message: string;
}

export const metaCampaignAdapterEnabled = false;

export function metaCampaignDisabled(): MetaAdapterResult {
  return {
    enabled: false,
    status: "adapter_disabled",
    future_adapter_required: true,
    message: "Meta campaign execution is disabled in Phase 9.5. Drafts are internal planning artifacts only; no campaign is launched, no budget is changed, and no ad set/ad/lead form is created. A future approved Meta adapter is required to build anything live.",
  };
}
