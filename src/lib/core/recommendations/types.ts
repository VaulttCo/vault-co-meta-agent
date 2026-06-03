// Vault Core — recommendation quality-gate shared types (backend QA layer).
//
// Pure types for the Vera (quality) + Vesper (dedupe/coherence) gate. The gate
// operates on candidate recommendations BEFORE they are persisted/surfaced. It
// never executes external actions and never mutates anything.

// A candidate is the subset of VaultRecommendationInput the gate reasons about.
// VaultRecommendationInput is structurally assignable to this shape.
export interface RecommendationCandidate {
  agent: string;
  title: string;
  body?: string | null;
  impact?: string | null;
  priority_score?: number;
  related_clients?: string[];
  metadata?: Record<string, unknown>;
}

// The minimal shape of an EXISTING recommendation the gate compares against.
// VaultRecommendationRow is structurally assignable to this shape.
export interface ExistingRecommendation {
  id: string;
  agent: string;
  title: string;
  body: string | null;
  status: string;
  related_clients: string[];
  created_at: string;
  metadata: Record<string, unknown>;
}
