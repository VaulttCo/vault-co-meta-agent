"use client";
/**
 * usePersistedCreativeAssets
 *
 * Provides a list of user-uploaded creative assets that survive page refresh.
 * Storage priority:
 *   1. Supabase `creative_assets` table — when NEXT_PUBLIC_SUPABASE_URL is configured.
 *   2. localStorage key "vc_creative_assets" — fallback for non-Supabase deployments.
 *
 * The hook merges persisted assets with MOCK_CREATIVE_ASSETS so the full library
 * is always available. Callers receive the merged list plus an `addAsset` function.
 *
 * Fix (Bug 2): On initial load, the hook now parses the `__META__:` JSON suffix
 * from the `notes` field and returns a pre-populated `initialAnalysisResults` Map
 * so the creatives page can rehydrate its `analysisResults` state after refresh.
 *
 * Update: Added `updateAsset` and `removeAsset` for approve/needs-review/delete actions.
 */
import { useState, useEffect, useCallback } from "react";
import { MOCK_CREATIVE_ASSETS, type CreativeAsset } from "./creativeAssets";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase/client";

const LS_KEY = "vc_creative_assets";
const META_SEPARATOR = "\n__META__:";

/**
 * Parse the __META__: suffix from a notes string.
 * Returns { userNotes, meta } where meta is the decoded JSON object (or {}).
 */
export function parseNotesAndMeta(raw: string | null): {
  userNotes: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: Record<string, any>;
} {
  if (!raw) return { userNotes: "", meta: {} };
  const idx = raw.indexOf(META_SEPARATOR);
  if (idx === -1) return { userNotes: raw, meta: {} };
  const userNotes = raw.substring(0, idx);
  try {
    const meta = JSON.parse(raw.substring(idx + META_SEPARATOR.length));
    return {
      userNotes,
      meta: typeof meta === "object" && meta !== null ? meta : {},
    };
  } catch {
    return { userNotes, meta: {} };
  }
}

function loadFromLocalStorage(): CreativeAsset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CreativeAsset[];
  } catch {
    return [];
  }
}

function saveToLocalStorage(assets: CreativeAsset[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(assets));
  } catch {
    // Quota exceeded or private browsing — silently ignore.
  }
}

export interface UsePersistedCreativeAssetsResult {
  /** All assets: mock library + user-uploaded (persisted) */
  allAssets: CreativeAsset[];
  /** Only the user-uploaded assets (persisted) */
  uploadedAssets: CreativeAsset[];
  /** Add a new asset and persist it */
  addAsset: (asset: CreativeAsset) => Promise<void>;
  /**
   * Optimistically update a persisted asset in local state.
   * Used after approve/needs-review API calls succeed.
   */
  updateAsset: (id: string, patch: Partial<CreativeAsset>) => void;
  /**
   * Optimistically remove an asset from local state.
   * Used after delete API call succeeds.
   * Also removes from MOCK_CREATIVE_ASSETS view via the deletedIds set.
   */
  removeAsset: (id: string) => void;
  /** Whether Supabase is active (vs localStorage fallback) */
  usingSupabase: boolean;
  /** Whether the initial load is still in progress */
  loading: boolean;
  /**
   * Pre-populated analysis results extracted from the __META__: notes suffix.
   * The creatives page should merge this into its analysisResults state on mount.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialAnalysisResults: Map<string, any>;
}

export function usePersistedCreativeAssets(): UsePersistedCreativeAssetsResult {
  const [uploadedAssets, setUploadedAssets] = useState<CreativeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [initialAnalysisResults, setInitialAnalysisResults] = useState<Map<string, any>>(new Map());
  // Track deleted IDs so they are excluded from the merged allAssets list
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const usingSupabase = isSupabaseConfigured();

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (usingSupabase) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const { data, error } = await supabase
            .from("creative_assets")
            .select("*")
            .order("created_at", { ascending: false });

          if (!cancelled) {
            if (!error && data) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const analysisMap = new Map<string, any>();

              // Map Supabase snake_case rows to CreativeAsset interface
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const mapped: CreativeAsset[] = (data as any[]).map((row) => {
                // Parse __META__: suffix from notes — extracts ai_analysis if present
                const { userNotes, meta } = parseNotesAndMeta(row.notes ?? "");

                // If this row has a persisted AI analysis, add it to the map
                if (meta.ai_analysis) {
                  analysisMap.set(row.id, {
                    assetId: row.id,
                    analysis: meta.ai_analysis,
                    mockMode: meta.mock_mode ?? false,
                    savedToDb: true,
                  });
                }

                return {
                  id: row.id,
                  clientId: row.client_id,
                  clientName: row.client_id, // will be enriched below if needed
                  fileName: row.file_name,
                  fileType: (row.file_type === "image" ? "image" : "video") as "image" | "video",
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  assetType: row.asset_type as any,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  category: ((row as any).category ?? "Creative Asset") as any,
                  // Use thumbnail_url from the row, or fall back to meta.thumbnail_url
                  thumbnailUrl: row.thumbnail_url ?? (meta.thumbnail_url as string | null) ?? null,
                  // Expose storage_url via a non-interface field for preview use
                  storageUrl: (meta.storage_url as string | null) ?? null,
                  uploadDate: row.upload_date,
                  service: row.service ?? "",
                  market: row.market ?? "",
                  campaignUseCase: row.campaign_use_case ?? "",
                  // Strip __META__: suffix so the Notes field shows only user text
                  notes: userNotes,
                  // Map Supabase lowercase status back to TypeScript display status
                  status: (() => {
                    const s = row.status as string;
                    if (s === "uploaded") return "Uploaded" as const;
                    if (s === "active") return (row.approved_for_ads ? "Approved" as const : "Uploaded" as const);
                    if (s === "pending") return "Needs Review" as const;
                    if (s === "draft") return "Uploaded" as const;
                    return "Uploaded" as const;
                  })(),
                  tags: Array.isArray(row.tags) ? row.tags : [],
                  approvedForAds: row.approved_for_ads,
                };
              });
              setUploadedAssets(mapped);
              setInitialAnalysisResults(analysisMap);
            }
            setLoading(false);
          }
          return;
        }
      }

      // localStorage fallback
      if (!cancelled) {
        setUploadedAssets(loadFromLocalStorage());
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [usingSupabase]);

  // ── Add asset ─────────────────────────────────────────────────────────────
  const addAsset = useCallback(async (asset: CreativeAsset) => {
    if (usingSupabase) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("creative_assets") as any).insert({
          id: asset.id,
          client_id: asset.clientId,
          file_name: asset.fileName,
          file_type: asset.fileType,
          asset_type: asset.assetType,
          category: asset.category,
          thumbnail_url: asset.thumbnailUrl,
          storage_url: null,
          upload_date: asset.uploadDate,
          service: asset.service,
          market: asset.market,
          campaign_use_case: asset.campaignUseCase,
          notes: asset.notes,
          status: (() => {
            const s = asset.status as string;
            if (s === "Uploaded") return "uploaded";
            if (s === "Needs Review") return "pending";
            if (s === "Approved") return "active";
            if (s === "Used in Campaign") return "active";
            if (s === "Archived") return "draft";
            return "uploaded";
          })(),
          tags: asset.tags,
          approved_for_ads: asset.approvedForAds,
        });
        if (!error) {
          setUploadedAssets((prev) => [asset, ...prev]);
          return;
        }
        // Fall through to localStorage on Supabase error
      }
    }

    // localStorage path
    setUploadedAssets((prev) => {
      const next = [asset, ...prev];
      saveToLocalStorage(next);
      return next;
    });
  }, [usingSupabase]);

  // ── Update asset (optimistic) ─────────────────────────────────────────────
  const updateAsset = useCallback((id: string, patch: Partial<CreativeAsset>) => {
    setUploadedAssets((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      if (!usingSupabase) saveToLocalStorage(next);
      return next;
    });
  }, [usingSupabase]);

  // ── Remove asset (optimistic) ─────────────────────────────────────────────
  const removeAsset = useCallback((id: string) => {
    setUploadedAssets((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (!usingSupabase) saveToLocalStorage(next);
      return next;
    });
    // Also track in deletedIds so mock assets with this ID are hidden
    setDeletedIds((prev) => new Set([...prev, id]));
  }, [usingSupabase]);

  const allAssets: CreativeAsset[] = [
    ...uploadedAssets.filter((a) => !deletedIds.has(a.id)),
    ...MOCK_CREATIVE_ASSETS.filter(
      (m) => !deletedIds.has(m.id) && !uploadedAssets.some((u) => u.id === m.id)
    ),
  ];

  return { allAssets, uploadedAssets, addAsset, updateAsset, removeAsset, usingSupabase, loading, initialAnalysisResults };
}
