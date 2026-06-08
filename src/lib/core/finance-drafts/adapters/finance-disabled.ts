// Vault Core — Finance / payment adapter: DISABLED (Phase 9.6).
//
// The explicit future-adapter boundary for finance execution. Performs NO I/O: imports no
// Stripe/banking SDK or HTTP client, uses no credentials/API keys, never calls a Stripe or
// payment API. It only reports that finance execution is disabled. Actually creating/
// sending/finalizing an invoice, charging a card, collecting a payment, issuing a refund,
// or moving money requires a separate, explicitly-approved future phase.

export interface FinanceAdapterResult {
  enabled: false;
  status: "adapter_disabled";
  future_adapter_required: true;
  message: string;
}

export const financeAdapterEnabled = false;

export function financeDisabled(): FinanceAdapterResult {
  return {
    enabled: false,
    status: "adapter_disabled",
    future_adapter_required: true,
    message: "Finance execution is disabled in Phase 9.6. Drafts are internal planning artifacts only; no invoice is created/sent/finalized, no card is charged, no payment is collected, and no money is moved. A future approved finance adapter is required to do anything live.",
  };
}
