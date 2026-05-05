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
 */
import { useState, useEffect, useCallback } from "react";
import { MOCK_CREATIVE_ASSETS, type CreativeAsset } from "./creativeAssets";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase/client";

const LS_KEY = "vc_creative_assets";

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
  /** Whether Supabase is active (vs localStorage fallback) */
  usingSupabase: boolean;
  /** Whether the initial load is still in progress */
  loading: boolean;
}

export function usePersistedCreativeAssets(): UsePersistedCreativeAssetsResult {
  const [uploadedAssets, setUploadedAssets] = useState<CreativeAsset[]>([]);
  const [loading, setLoading] = useState(true);
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
              // Map Supabase snake_case rows to CreativeAsset interface
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const mapped: CreativeAsset[] = (data as any[]).map((row) => ({
                id: row.id,
                clientId: row.client_id,
                clientName: row.client_id, // will be enriched below if needed
                fileName: row.file_name,
                fileType: (row.file_type === "image" ? "image" : "video") as "image" | "video",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                assetType: row.asset_type as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                category: ((row as any).category ?? "Creative Asset") as any,
                thumbnailUrl: row.thumbnail_url ?? null,
                uploadDate: row.upload_date,
                service: row.service ?? "",
                market: row.market ?? "",
                campaignUseCase: row.campaign_use_case ?? "",
                notes: row.notes ?? "",
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
              }));
              setUploadedAssets(mapped);
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
          // Map TypeScript display status to Supabase-compatible lowercase status
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

  const allAssets: CreativeAsset[] = [
    ...uploadedAssets,
    ...MOCK_CREATIVE_ASSETS.filter(
      (m) => !uploadedAssets.some((u) => u.id === m.id)
    ),
  ];

  return { allAssets, uploadedAssets, addAsset, usingSupabase, loading };
}
