"use client";

import { useState, useEffect, useMemo } from "react";
import { RefreshCw, AlertCircle, Info, Loader2, Eye, Settings, X, CheckCircle2 } from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import {
  makeDefaultSettings,
  type ClientRevenueSettings,
  type MonthlyRevenueSnapshot,
  type GHLPreviewResult,
} from "@/lib/revenue/types";
import type { GHLConnectionStatus } from "@/app/api/revenue-settings/ghl-status/route";
import {
  GOLD, GOLD_BG, GOLD_BORDER, fmtCurrency,
} from "@/lib/revenue/calculations";
import {
  RevenuePageHeader, SectionCard, SectionHeader, TableEmpty,
  RecurringToggle, PhaseBadge, BillingEmptyState, SafetyNote,
  PageErrorState,
} from "../_components";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toBillingMonthDate(ym: string): string {
  return `${ym}-01`;
}

function formatBillingMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function fmtRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ReviewStatusBadge({ status }: { status: "draft" | "reviewed" | "locked" }) {
  const cfg = {
    draft:    { label: "Draft",    color: "rgba(107,122,153,0.7)", bg: "rgba(61,79,110,0.08)",  border: "rgba(61,79,110,0.15)"  },
    reviewed: { label: "Reviewed", color: "#22c55e",               bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.20)"  },
    locked:   { label: "Locked",   color: "#0081f2",               bg: "rgba(0,129,242,0.08)",  border: "rgba(0,129,242,0.20)"  },
  }[status] ?? { label: "Draft", color: "rgba(107,122,153,0.7)", bg: "rgba(61,79,110,0.08)", border: "rgba(61,79,110,0.15)" };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function GHLStatusChip({ status }: { status?: GHLConnectionStatus }) {
  if (!status) {
    return <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.4)" }}>Checking…</span>;
  }
  if (status.isGhlConnected) {
    const label = status.connectionSource === "global_env"
      ? "Connected via Global Config"
      : status.ghlPipelineIdPresent
      ? "Connected · Pipeline Filter Active"
      : "Connected · All Pipelines";
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#22c55e" }} />
        <span className="text-[11px]" style={{ color: "#22c55e" }}>{label}</span>
      </div>
    );
  }
  if (!status.isGhlConnected && status.ghlPipelineIdPresent) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#f59e0b" }} />
        <span className="text-[11px]" style={{ color: "#f59e0b" }}>Pipeline Set · Location Needed</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "rgba(107,122,153,0.5)" }} />
      <span className="text-[11px]" style={{ color: "rgba(107,122,153,0.5)" }}>Not Connected</span>
    </div>
  );
}

type GHLDebugMeta = {
  locationSource?: string;
  locationIdPresent?: boolean;
  locationIdMasked?: string;
  credentialSource?: string;
  ghlStatusCode?: number;
};

type GHLPreviewEntry =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; result: GHLPreviewResult; debug?: GHLDebugMeta; loadedAt: string }
  | { status: "error"; error: string; debug?: GHLDebugMeta };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GhlTrackerPage() {
  // ── Clients + settings ────────────────────────────────────────────────────
  const [clients, setClients]               = useState<Client[]>([]);
  const [loading, setLoading]               = useState(true);
  const [clientsError, setClientsError]     = useState<string | null>(null);
  const [settingsMap, setSettingsMap]       = useState<Record<string, ClientRevenueSettings>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError]   = useState<string | null>(null);
  const [savingToggle, setSavingToggle]     = useState<Record<string, boolean>>({});

  // ── Phase 2B: manual snapshots ────────────────────────────────────────────
  const [billingMonth, setBillingMonth]         = useState<string>(currentYearMonth);
  const [manualSnapshotsMap, setManualSnapshotsMap] = useState<Record<string, MonthlyRevenueSnapshot>>({});
  const [ghlSnapshotsMap, setGhlSnapshotsMap]   = useState<Record<string, MonthlyRevenueSnapshot>>({});
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError]     = useState<string | null>(null);
  const [revenueInputs, setRevenueInputs]       = useState<Record<string, string>>({});
  const [notesInputs, setNotesInputs]           = useState<Record<string, string>>({});
  const [savingSnapshot, setSavingSnapshot]     = useState<Record<string, boolean>>({});

  // ── Phase 2C: GHL connection status (safe metadata, no secrets) ──────────
  const [ghlStatusMap, setGhlStatusMap] = useState<Record<string, GHLConnectionStatus>>({});

  // ── Phase 2C: GHL preview state ───────────────────────────────────────────
  const [ghlPreviews, setGhlPreviews]   = useState<Record<string, GHLPreviewEntry>>({});
  const [savingGhl, setSavingGhl]       = useState<Record<string, boolean>>({});

  // ── Phase 2D: review / lock state ────────────────────────────────────────
  const [reviewSaving, setReviewSaving] = useState<Record<string, boolean>>({});

  // ── Phase 2E: invoice draft creation state ────────────────────────────────
  const [invoiceSaving, setInvoiceSaving] = useState<Record<string, boolean>>({});
  const [invoiceErrors, setInvoiceErrors] = useState<Record<string, string>>({});

  // ── Revenue Settings panel (inline accordion per client) ──────────────────
  const [openPanel, setOpenPanel]         = useState<string | null>(null);
  const [panelSaving, setPanelSaving]     = useState<Record<string, boolean>>({});
  const [panelError, setPanelError]       = useState<Record<string, string | null>>({});
  const [panelSuccess, setPanelSuccess]   = useState<Record<string, boolean>>({});
  const [panelForm, setPanelForm]         = useState<Record<string, {
    ghlPipelineId: string;
    ghlLocationId: string;
    recurringBillingStartDate: string;
    stripeCustomerId: string;
    notes: string;
  }>>({});

  // ── Load clients ──────────────────────────────────────────────────────────
  function loadClients() {
    setLoading(true);
    setClientsError(null);
    let cancelled = false;
    (async () => {
      try {
        const data = await getDataProvider().getClients();
        if (!cancelled) setClients(data);
      } catch {
        if (!cancelled) setClientsError("Unable to load clients. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }

  useEffect(() => loadClients(), []);

  // ── Load GHL connection status once clients are known (safe metadata only) ─
  useEffect(() => {
    if (loading || clients.length === 0) return;
    const ids = clients.filter((c) => c.status !== "archived").map((c) => c.id);
    if (ids.length === 0) return;

    let cancelled = false;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10_000);

    fetch(`/api/revenue-settings/ghl-status?clientIds=${ids.join(",")}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { ghlStatus: {} }))
      .then(({ ghlStatus }: { ghlStatus: Record<string, GHLConnectionStatus> }) => {
        if (!cancelled) setGhlStatusMap(ghlStatus ?? {});
      })
      .catch(() => { /* silent — UI degrades to "Unknown" status */ })
      .finally(() => { clearTimeout(tid); });

    return () => { cancelled = true; controller.abort(); clearTimeout(tid); };
  }, [loading, clients]);

  // ── Load revenue settings (10s timeout) ──────────────────────────────────
  useEffect(() => {
    setSettingsLoading(true);
    setSettingsError(null);
    let cancelled = false;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10_000);

    fetch("/api/revenue-settings", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { settings: [] }))
      .then(({ settings }: { settings: ClientRevenueSettings[] }) => {
        const map: Record<string, ClientRevenueSettings> = {};
        (settings ?? []).forEach((s) => { map[s.clientId] = s; });
        if (!cancelled) setSettingsMap(map);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const isAbort = err instanceof Error && err.name === "AbortError";
          setSettingsError(isAbort ? "Settings request timed out." : "Unable to load billing settings.");
        }
      })
      .finally(() => { clearTimeout(tid); if (!cancelled) setSettingsLoading(false); });

    return () => { cancelled = true; controller.abort(); clearTimeout(tid); };
  }, []);

  // ── Load snapshots when billing month changes (10s timeout) ──────────────
  useEffect(() => {
    setSnapshotsLoading(true);
    setSnapshotsError(null);
    setManualSnapshotsMap({});
    setGhlSnapshotsMap({});
    setRevenueInputs({});
    setNotesInputs({});
    setGhlPreviews({});

    let cancelled = false;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10_000);

    fetch(`/api/revenue-snapshots?billing_month=${toBillingMonthDate(billingMonth)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { snapshots: [] }))
      .then(({ snapshots }: { snapshots: MonthlyRevenueSnapshot[] }) => {
        const manualMap: Record<string, MonthlyRevenueSnapshot> = {};
        const ghlMap:    Record<string, MonthlyRevenueSnapshot> = {};
        const inputs:    Record<string, string> = {};
        const notes:     Record<string, string> = {};

        (snapshots ?? []).forEach((s) => {
          if (s.source === "ghl") {
            ghlMap[s.clientId] = s;
          } else {
            manualMap[s.clientId] = s;
            inputs[s.clientId] = s.closedWonRevenue > 0 ? String(s.closedWonRevenue) : "";
            notes[s.clientId]  = s.notes ?? "";
          }
        });

        if (!cancelled) {
          setManualSnapshotsMap(manualMap);
          setGhlSnapshotsMap(ghlMap);
          setRevenueInputs(inputs);
          setNotesInputs(notes);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const isAbort = err instanceof Error && err.name === "AbortError";
          setSnapshotsError(isAbort ? "Snapshots request timed out." : "Unable to load revenue snapshots.");
        }
      })
      .finally(() => { clearTimeout(tid); if (!cancelled) setSnapshotsLoading(false); });

    return () => { cancelled = true; controller.abort(); clearTimeout(tid); };
  }, [billingMonth]);

  // ── Toggle recurring billing ──────────────────────────────────────────────
  async function handleToggleRecurring(clientId: string) {
    const current = settingsMap[clientId]?.recurringBillingActive ?? false;
    const next = !current;

    setSettingsMap((prev) => ({
      ...prev,
      [clientId]: { ...(prev[clientId] ?? makeDefaultSettings(clientId)), recurringBillingActive: next },
    }));
    setSavingToggle((prev) => ({ ...prev, [clientId]: true }));

    try {
      const res = await fetch(`/api/revenue-settings/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recurringBillingActive: next }),
      });
      if (res.ok) {
        const { settings } = await res.json();
        if (settings) setSettingsMap((prev) => ({ ...prev, [clientId]: settings }));
      } else {
        setSettingsMap((prev) => ({
          ...prev,
          [clientId]: { ...(prev[clientId] ?? makeDefaultSettings(clientId)), recurringBillingActive: current },
        }));
      }
    } catch {
      setSettingsMap((prev) => ({
        ...prev,
        [clientId]: { ...(prev[clientId] ?? makeDefaultSettings(clientId)), recurringBillingActive: current },
      }));
    } finally {
      setSavingToggle((prev) => ({ ...prev, [clientId]: false }));
    }
  }

  // ── Save manual snapshot (Phase 2B) ──────────────────────────────────────
  async function handleSaveSnapshot(clientId: string) {
    const closedWonRevenue = parseFloat(revenueInputs[clientId] ?? "") || 0;
    const notes = notesInputs[clientId]?.trim() || null;
    const existingSnapshot = manualSnapshotsMap[clientId];

    setSavingSnapshot((prev) => ({ ...prev, [clientId]: true }));

    try {
      let res: Response;
      if (existingSnapshot) {
        res = await fetch(`/api/revenue-snapshots/${existingSnapshot.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ closedWonRevenue, notes }),
        });
      } else {
        res = await fetch("/api/revenue-snapshots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            billingMonth: toBillingMonthDate(billingMonth),
            closedWonRevenue,
            notes,
            source: "manual",
          }),
        });
      }

      if (res.ok) {
        const { snapshot } = await res.json();
        if (snapshot) setManualSnapshotsMap((prev) => ({ ...prev, [clientId]: snapshot }));
      }
    } catch {
      // silent fail — snapshot UI will retain its input values
    } finally {
      setSavingSnapshot((prev) => ({ ...prev, [clientId]: false }));
    }
  }

  // ── Phase 2C: Preview GHL Closed Won ─────────────────────────────────────
  async function handlePreviewGHL(clientId: string) {
    setGhlPreviews((prev) => ({ ...prev, [clientId]: { status: "loading" } }));

    try {
      const res = await fetch("/api/revenue-snapshots/ghl-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, billingMonth: toBillingMonthDate(billingMonth) }),
      });

      const data = await res.json() as {
        preview?: GHLPreviewResult;
        error?: string;
        locationSource?: string;
        locationIdPresent?: boolean;
        locationIdMasked?: string;
        credentialSource?: string;
        ghlStatusCode?: number;
      };

      const debug: GHLDebugMeta = {
        locationSource:   data.locationSource   ?? data.preview?.locationSource,
        locationIdPresent: data.locationIdPresent ?? data.preview?.locationIdPresent,
        locationIdMasked: data.locationIdMasked  ?? data.preview?.locationIdMasked,
        credentialSource: data.credentialSource  ?? data.preview?.credentialSource,
        ghlStatusCode:    data.ghlStatusCode,
      };

      if (res.ok && data.preview) {
        setGhlPreviews((prev) => ({ ...prev, [clientId]: { status: "loaded", result: data.preview!, debug, loadedAt: new Date().toISOString() } }));
      } else {
        const raw = data.error ?? "";
        const userMessage = raw.includes("Pipeline ID was rejected")
          ? "The Pipeline ID appears invalid. Leave it blank to sync all Closed Won opportunities for the connected location."
          : raw.includes("credentials were rejected") || data.ghlStatusCode === 401 || data.ghlStatusCode === 403
          ? "GHL credentials rejected. Check that the API key is valid in the Integrations tab."
          : raw.includes("Recurring billing")
          ? raw
          : raw.includes("No GHL Location ID")
          ? "GHL credentials found, but no Location ID is saved. Add the correct Location ID in the Settings panel below."
          : data.ghlStatusCode === 422
          ? "GHL credentials found, but the Location ID was rejected. Add the correct Location ID override in the Settings panel below, or update the client's GHL integration."
          : raw || "GHL credentials connected, but the request failed. Manual entry is still available.";
        setGhlPreviews((prev) => ({
          ...prev,
          [clientId]: { status: "error", error: userMessage, debug },
        }));
      }
    } catch (err) {
      setGhlPreviews((prev) => ({
        ...prev,
        [clientId]: { status: "error", error: err instanceof Error ? err.message : "Network error. Manual entry is still available." },
      }));
    }
  }

  // ── Phase 2C: Save GHL snapshot ───────────────────────────────────────────
  async function handleSaveGHLSnapshot(clientId: string) {
    const preview = ghlPreviews[clientId];
    if (preview?.status !== "loaded") return;

    const { result } = preview;
    setSavingGhl((prev) => ({ ...prev, [clientId]: true }));

    try {
      const res = await fetch("/api/revenue-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          billingMonth: toBillingMonthDate(billingMonth),
          closedWonRevenue: result.closedWonRevenue,
          source: "ghl",
          dealCount: result.closedWonDealsCount,
          sourcePayload: { dealPreview: result.dealPreview, ghlLocationId: result.ghlLocationId, ghlPipelineId: result.ghlPipelineId },
        }),
      });

      if (res.ok) {
        const { snapshot } = await res.json();
        if (snapshot) setGhlSnapshotsMap((prev) => ({ ...prev, [clientId]: snapshot }));
        // Clear preview after save so the table shows the saved snapshot
        setGhlPreviews((prev) => ({ ...prev, [clientId]: { status: "idle" } }));
      }
    } catch {
      // silent fail
    } finally {
      setSavingGhl((prev) => ({ ...prev, [clientId]: false }));
    }
  }

  // ── Revenue Settings panel handlers ──────────────────────────────────────
  function handleOpenPanel(clientId: string) {
    const s = settingsMap[clientId];
    if (!panelForm[clientId]) {
      setPanelForm((prev) => ({
        ...prev,
        [clientId]: {
          ghlPipelineId:            s?.ghlPipelineId ?? "",
          ghlLocationId:            s?.ghlLocationId ?? "",
          recurringBillingStartDate: s?.recurringBillingStartDate ?? "",
          stripeCustomerId:         s?.stripeCustomerId ?? "",
          notes:                    s?.notes ?? "",
        },
      }));
    }
    setPanelError((prev) => ({ ...prev, [clientId]: null }));
    setPanelSuccess((prev) => ({ ...prev, [clientId]: false }));
    setOpenPanel((prev) => (prev === clientId ? null : clientId));
  }

  async function handleSaveGHLSettings(clientId: string) {
    const form = panelForm[clientId];
    if (!form) return;

    setPanelSaving((prev) => ({ ...prev, [clientId]: true }));
    setPanelError((prev) => ({ ...prev, [clientId]: null }));
    setPanelSuccess((prev) => ({ ...prev, [clientId]: false }));

    try {
      const res = await fetch(`/api/revenue-settings/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ghlPipelineId:             form.ghlPipelineId.trim() || null,
          ghlLocationId:             form.ghlLocationId.trim() || null,
          recurringBillingStartDate: form.recurringBillingStartDate || null,
          stripeCustomerId:          form.stripeCustomerId.trim() || null,
          notes:                     form.notes.trim() || null,
        }),
      });

      const data = await res.json() as { settings?: ClientRevenueSettings; error?: string };

      if (res.ok && data.settings) {
        // Update local settings map
        setSettingsMap((prev) => ({ ...prev, [clientId]: data.settings! }));
        // Sync form to saved values
        const s = data.settings;
        setPanelForm((prev) => ({
          ...prev,
          [clientId]: {
            ghlPipelineId:            s.ghlPipelineId ?? "",
            ghlLocationId:            s.ghlLocationId ?? "",
            recurringBillingStartDate: s.recurringBillingStartDate ?? "",
            stripeCustomerId:         s.stripeCustomerId ?? "",
            notes:                    s.notes ?? "",
          },
        }));
        setPanelSuccess((prev) => ({ ...prev, [clientId]: true }));

        // Re-fetch GHL status for this client so the chip updates live
        fetch(`/api/revenue-settings/ghl-status?clientIds=${clientId}`)
          .then((r) => r.ok ? r.json() : { ghlStatus: {} })
          .then(({ ghlStatus }: { ghlStatus: Record<string, GHLConnectionStatus> }) => {
            setGhlStatusMap((prev) => ({ ...prev, ...ghlStatus }));
          })
          .catch(() => {});
      } else {
        setPanelError((prev) => ({ ...prev, [clientId]: data.error ?? "Failed to save settings." }));
      }
    } catch (err) {
      setPanelError((prev) => ({ ...prev, [clientId]: err instanceof Error ? err.message : "Network error." }));
    } finally {
      setPanelSaving((prev) => ({ ...prev, [clientId]: false }));
    }
  }

  // ── Phase 2D: update reviewStatus for a snapshot ─────────────────────────
  async function handleUpdateReviewStatus(
    snapshotId: string,
    clientId: string,
    source: "manual" | "ghl",
    newStatus: "draft" | "reviewed" | "locked"
  ) {
    const key = `${snapshotId}-${newStatus}`;
    setReviewSaving((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`/api/revenue-snapshots/${snapshotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: newStatus }),
      });
      if (res.ok) {
        const { snapshot } = await res.json() as { snapshot: MonthlyRevenueSnapshot };
        if (snapshot) {
          if (source === "manual") {
            setManualSnapshotsMap((prev) => ({ ...prev, [clientId]: snapshot }));
          } else {
            setGhlSnapshotsMap((prev) => ({ ...prev, [clientId]: snapshot }));
          }
        }
      }
    } catch {
      // silent fail — snapshot retains previous status in UI
    } finally {
      setReviewSaving((prev) => ({ ...prev, [key]: false }));
    }
  }

  // ── Phase 2E: Create Stripe draft invoice ────────────────────────────────
  async function handleCreateInvoiceDraft(
    snapshotId: string,
    clientId: string,
    source: "manual" | "ghl"
  ) {
    if (!window.confirm(
      "Create a Stripe DRAFT invoice for this locked snapshot?\n\n" +
      "The invoice will not be sent, finalized, or charged. You must open it in Stripe to review before sending."
    )) return;

    setInvoiceSaving((prev) => ({ ...prev, [snapshotId]: true }));
    setInvoiceErrors((prev) => ({ ...prev, [snapshotId]: "" }));

    try {
      const res = await fetch(`/api/revenue-snapshots/${snapshotId}/create-invoice-draft`, {
        method: "POST",
      });
      const data = await res.json() as { success?: boolean; snapshot?: MonthlyRevenueSnapshot; error?: string };

      if (res.ok && data.snapshot) {
        if (source === "manual") {
          setManualSnapshotsMap((prev) => ({ ...prev, [clientId]: data.snapshot! }));
        } else {
          setGhlSnapshotsMap((prev) => ({ ...prev, [clientId]: data.snapshot! }));
        }
      } else {
        setInvoiceErrors((prev) => ({ ...prev, [snapshotId]: data.error ?? "Failed to create invoice draft." }));
      }
    } catch (err) {
      setInvoiceErrors((prev) => ({
        ...prev,
        [snapshotId]: err instanceof Error ? err.message : "Network error.",
      }));
    } finally {
      setInvoiceSaving((prev) => ({ ...prev, [snapshotId]: false }));
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const pipelineClients = useMemo(() => clients.filter((c) => c.status !== "archived"), [clients]);
  const recurringActiveCount = useMemo(
    () => pipelineClients.filter((c) => settingsMap[c.id]?.recurringBillingActive).length,
    [pipelineClients, settingsMap]
  );

  const monthTotals = useMemo(() => {
    const manualSnaps = Object.values(manualSnapshotsMap);
    const ghlSnaps    = Object.values(ghlSnapshotsMap);
    const allSnaps    = [...manualSnaps, ...ghlSnaps];
    return {
      manual: {
        closedWonRevenue: manualSnaps.reduce((s, x) => s + x.closedWonRevenue, 0),
        vaultCoFee:       manualSnaps.reduce((s, x) => s + x.vaultCoFee, 0),
        nickEarnings:     manualSnaps.reduce((s, x) => s + x.nickRecurringEarnings, 0),
        count:            manualSnaps.length,
      },
      ghl: {
        closedWonRevenue: ghlSnaps.reduce((s, x) => s + x.closedWonRevenue, 0),
        vaultCoFee:       ghlSnaps.reduce((s, x) => s + x.vaultCoFee, 0),
        nickEarnings:     ghlSnaps.reduce((s, x) => s + x.nickRecurringEarnings, 0),
        count:            ghlSnaps.length,
        dealCount:        ghlSnaps.reduce((s, x) => s + (x.dealCount ?? 0), 0),
      },
      combined: {
        closedWonRevenue: allSnaps.reduce((s, x) => s + x.closedWonRevenue, 0),
        vaultCoFee:       allSnaps.reduce((s, x) => s + x.vaultCoFee, 0),
        nickEarnings:     allSnaps.reduce((s, x) => s + x.nickRecurringEarnings, 0),
        locked:           allSnaps.filter((x) => x.reviewStatus === "locked").length,
        reviewed:         allSnaps.filter((x) => x.reviewStatus === "reviewed").length,
        draft:            allSnaps.filter((x) => x.reviewStatus === "draft").length,
        total:            allSnaps.length,
      },
    };
  }, [manualSnapshotsMap, ghlSnapshotsMap]);

  const lockedTotals = useMemo(() => {
    const all = [...Object.values(manualSnapshotsMap), ...Object.values(ghlSnapshotsMap)];
    const locked = all.filter((x) => x.reviewStatus === "locked");
    return {
      count:            locked.length,
      closedWonRevenue: locked.reduce((s, x) => s + x.closedWonRevenue, 0),
      vaultCoFee:       locked.reduce((s, x) => s + x.vaultCoFee, 0),
      nickEarnings:     locked.reduce((s, x) => s + x.nickRecurringEarnings, 0),
    };
  }, [manualSnapshotsMap, ghlSnapshotsMap]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <RevenuePageHeader
        title="GHL Revenue Share Tracker"
        subtitle="Manual revenue entry · GHL Closed Won read-only sync · recurring billing management"
        badge={<PhaseBadge label="PHASE 2E" />}
      />

      <SectionCard>
        <SectionHeader
          icon={RefreshCw}
          title="GHL Revenue Share Tracker"
          subtitle="Enter revenue manually or pull Closed Won data from GHL. Vault Co 5% fee and Nick recurring earnings are computed server-side."
          badge={<PhaseBadge label="PHASE 2E" />}
        />

        {/* ── Billing Month Selector ──────────────────────────────────────── */}
        <div className="px-5 py-3.5 border-b flex items-center gap-4 flex-wrap"
          style={{ borderColor: "var(--t-border-nav)" }}>
          <label className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
            Billing Month
          </label>
          <input
            type="month"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold bg-transparent outline-none"
            style={{
              backgroundColor: "rgba(0,129,242,0.04)",
              border: "1px solid rgba(61,79,110,0.25)",
              color: "var(--t-text)",
            }}
          />
          <span className="text-[11px]" style={{ color: "var(--t-dim)" }}>
            {formatBillingMonthLabel(billingMonth)}
          </span>
          {snapshotsLoading && (
            <div className="flex items-center gap-1.5 ml-auto" style={{ color: "var(--t-dim)" }}>
              <Loader2 size={12} className="animate-spin" />
              <span className="text-[11px]">Loading snapshots…</span>
            </div>
          )}
        </div>

        {/* ── Monthly Totals ──────────────────────────────────────────────── */}
        {monthTotals.combined.total > 0 && (
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-3"
              style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
              {formatBillingMonthLabel(billingMonth)} — Snapshot Totals
              <span className="ml-2 normal-case font-normal" style={{ color: "rgba(107,122,153,0.5)" }}>
                (snapshots only — not confirmed revenue)
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Manual totals */}
              {monthTotals.manual.count > 0 && (
                <div className="rounded-lg p-3.5 space-y-2"
                  style={{ backgroundColor: "rgba(0,129,242,0.03)", border: "1px solid rgba(61,79,110,0.12)" }}>
                  <div className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                    Manual Entry ({monthTotals.manual.count} snapshot{monthTotals.manual.count !== 1 ? "s" : ""})
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Client Closed Won", value: fmtCurrency(monthTotals.manual.closedWonRevenue), color: "var(--t-text)" },
                      { label: "Vault Co 5% Fee",   value: fmtCurrency(monthTotals.manual.vaultCoFee),       color: GOLD           },
                      { label: "Nick Recurring",     value: fmtCurrency(monthTotals.manual.nickEarnings),     color: "#a78bfa"       },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="text-[13px] font-bold"
                          style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: item.color }}>
                          {item.value}
                        </div>
                        <div className="text-[9px] mt-0.5" style={{ color: "var(--t-dim)" }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GHL totals */}
              {monthTotals.ghl.count > 0 && (
                <div className="rounded-lg p-3.5 space-y-2"
                  style={{ backgroundColor: "rgba(34,197,94,0.03)", border: "1px solid rgba(34,197,94,0.12)" }}>
                  <div className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#22c55e" }}>
                    GHL Sync ({monthTotals.ghl.count} snapshot{monthTotals.ghl.count !== 1 ? "s" : ""} · {monthTotals.ghl.dealCount} deal{monthTotals.ghl.dealCount !== 1 ? "s" : ""})
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "GHL Closed Won",  value: fmtCurrency(monthTotals.ghl.closedWonRevenue), color: "var(--t-text)" },
                      { label: "Vault Co 5% Fee", value: fmtCurrency(monthTotals.ghl.vaultCoFee),       color: GOLD           },
                      { label: "Nick Recurring",  value: fmtCurrency(monthTotals.ghl.nickEarnings),     color: "#a78bfa"       },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="text-[13px] font-bold"
                          style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: item.color }}>
                          {item.value}
                        </div>
                        <div className="text-[9px] mt-0.5" style={{ color: "var(--t-dim)" }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Combined totals row */}
            {monthTotals.manual.count > 0 && monthTotals.ghl.count > 0 && (
              <div className="mt-3 pt-3 border-t flex items-center gap-6 flex-wrap"
                style={{ borderColor: "var(--t-border-nav)" }}>
                <span className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                  Combined
                </span>
                {[
                  { label: "Total Closed Won", value: fmtCurrency(monthTotals.combined.closedWonRevenue), color: "var(--t-text)" },
                  { label: "Total Vault Co Fee", value: fmtCurrency(monthTotals.combined.vaultCoFee),    color: GOLD           },
                  { label: "Total Nick Recurring", value: fmtCurrency(monthTotals.combined.nickEarnings), color: "#a78bfa"     },
                  { label: "Status",
                    value: `${monthTotals.combined.locked} locked · ${monthTotals.combined.reviewed} reviewed · ${monthTotals.combined.draft} draft`,
                    color: monthTotals.combined.locked > 0 ? "#0081f2" : monthTotals.combined.reviewed > 0 ? "#22c55e" : "rgba(107,122,153,0.6)" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold"
                      style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: item.color }}>
                      {item.value}
                    </span>
                    <span className="text-[9px]" style={{ color: "var(--t-dim)" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Billing Basis panel (Phase 2D) ──────────────────────────────── */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
          <div className="text-[9px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#0081f2" }}>
            Billing Basis — {formatBillingMonthLabel(billingMonth)}
            <span className="normal-case font-normal text-[9px]" style={{ color: "rgba(107,122,153,0.5)" }}>
              locked snapshots only · no invoice created or sent
            </span>
          </div>
          {lockedTotals.count === 0 ? (
            <div className="rounded-lg px-4 py-3"
              style={{ backgroundColor: "rgba(61,79,110,0.05)", border: "1px solid rgba(61,79,110,0.10)" }}>
              <p className="text-[11px]" style={{ color: "rgba(107,122,153,0.6)" }}>
                No locked billing basis yet for {formatBillingMonthLabel(billingMonth)}.
                Review and lock snapshots below before creating invoices in a future phase.
              </p>
            </div>
          ) : (
            <div className="rounded-lg p-3.5 space-y-2"
              style={{ backgroundColor: "rgba(0,129,242,0.04)", border: "1px solid rgba(0,129,242,0.18)" }}>
              <div className="text-[9px] font-semibold" style={{ color: "#0081f2" }}>
                {lockedTotals.count} locked snapshot{lockedTotals.count !== 1 ? "s" : ""}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Locked Client Closed Won Revenue", value: fmtCurrency(lockedTotals.closedWonRevenue), color: "var(--t-text)" },
                  { label: "Locked Vault Co 5% Fee",           value: fmtCurrency(lockedTotals.vaultCoFee),       color: GOLD           },
                  { label: "Estimated Nick Recurring Earnings", value: fmtCurrency(lockedTotals.nickEarnings),    color: "#a78bfa"       },
                  { label: "Locked Snapshots",                  value: String(lockedTotals.count),                color: "#0081f2"       },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="text-[14px] font-bold"
                      style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: item.color }}>
                      {item.value}
                    </div>
                    <div className="text-[9px] mt-0.5 leading-snug" style={{ color: "var(--t-dim)" }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] pt-1" style={{ color: "rgba(107,122,153,0.45)" }}>
                Estimated billing basis only. Locking confirms the internal revenue basis for this month. Use the Create Draft Invoice button per client to generate a Stripe draft — no invoice is sent or charged automatically.
              </p>
            </div>
          )}
        </div>

        {/* ── Alerts ──────────────────────────────────────────────────────── */}
        <div className="px-5 pt-4 space-y-2">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
            style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
            <AlertCircle size={13} style={{ color: "#22c55e" }} />
            <span className="text-[12px]" style={{ color: "#22c55e" }}>
              Phase 2C · 2D · 2E: GHL read-only sync is active. Review and lock snapshots to confirm the billing basis. Create Draft Invoice generates a Stripe draft — not sent, not charged.
            </span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
            style={{ backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.18)" }}>
            <AlertCircle size={13} style={{ color: "rgba(107,122,153,0.7)" }} />
            <span className="text-[12px]" style={{ color: "rgba(107,122,153,0.7)" }}>
              Phase 2C · 2D · 2E: Lock a snapshot, then use Create Draft Invoice to generate a Stripe draft. No invoice is sent or charged automatically.
            </span>
          </div>
          {settingsError && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
              style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <AlertCircle size={13} style={{ color: "#ef4444" }} />
              <span className="text-[12px]" style={{ color: "#ef4444" }}>{settingsError} Recurring billing toggles are temporarily unavailable.</span>
            </div>
          )}
          {snapshotsError && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
              style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <AlertCircle size={13} style={{ color: "#ef4444" }} />
              <span className="text-[12px]" style={{ color: "#ef4444" }}>{snapshotsError}</span>
            </div>
          )}
          {!loading && !clientsError && pipelineClients.length > 0 && recurringActiveCount === 0 && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
              style={{ backgroundColor: "rgba(107,122,153,0.06)", border: "1px solid rgba(107,122,153,0.15)" }}>
              <AlertCircle size={13} style={{ color: "rgba(107,122,153,0.7)" }} />
              <span className="text-[12px]" style={{ color: "rgba(107,122,153,0.7)" }}>
                No clients have recurring billing active yet. Enable recurring billing for eligible clients using the toggle below.
              </span>
            </div>
          )}
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--t-border-nav)" }}>
                {[
                  "Client", "Recurring Billing", "GHL Connected",
                  "Manual Revenue Input", "GHL Closed Won", "Deal Count",
                  "Vault Co 5% Fee", "Nick Recurring", "Review Status", "Actions",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableEmpty colSpan={10} message="" loading />
              ) : clientsError ? (
                <tr><td colSpan={10}><PageErrorState message="Unable to load clients." detail={clientsError} onRetry={loadClients} /></td></tr>
              ) : pipelineClients.length === 0 ? (
                <TableEmpty colSpan={10} message="No clients in the pipeline yet. Add clients to begin tracking." />
              ) : (
                pipelineClients.map((client) => {
                  const clientSettings   = settingsMap[client.id];
                  const isOn             = clientSettings?.recurringBillingActive ?? false;
                  const stripeCustomerId = clientSettings?.stripeCustomerId ?? null;
                  const isSaving         = savingToggle[client.id] ?? false;
                  const isSnapshotSaving = savingSnapshot[client.id] ?? false;
                  const isGhlSaving      = savingGhl[client.id] ?? false;
                  const isSettingsLoaded = !settingsLoading;

                  const manualSnapshot   = manualSnapshotsMap[client.id];
                  const ghlSnapshot      = ghlSnapshotsMap[client.id];
                  const ghlPreviewEntry  = ghlPreviews[client.id] ?? { status: "idle" };
                  const ghlStatus        = ghlStatusMap[client.id];

                  // GHL preview requires only a connected location — pipeline is optional
                  const canPreviewGHL = Boolean(ghlStatus?.isGhlConnected);

                  // Manual revenue display values
                  const rawInput       = parseFloat(revenueInputs[client.id] ?? "") || 0;
                  const liveVaultFee   = Math.round(rawInput * 0.05 * 100) / 100;
                  const liveNick       = liveVaultFee;
                  const displayManualFee  = rawInput > 0 ? liveVaultFee  : (manualSnapshot?.vaultCoFee ?? 0);
                  const displayManualNick = rawInput > 0 ? liveNick       : (manualSnapshot?.nickRecurringEarnings ?? 0);

                  // GHL revenue display values — prefer saved snapshot, then preview
                  const ghlFee      = ghlSnapshot?.vaultCoFee
                    ?? (ghlPreviewEntry.status === "loaded" ? ghlPreviewEntry.result.vaultCoFee : null);
                  const ghlNick     = ghlSnapshot?.nickRecurringEarnings
                    ?? (ghlPreviewEntry.status === "loaded" ? ghlPreviewEntry.result.nickRecurringEarnings : null);
                  const ghlDeals    = ghlSnapshot?.dealCount
                    ?? (ghlPreviewEntry.status === "loaded" ? ghlPreviewEntry.result.closedWonDealsCount : null);

                  // Combined fees for display (prefer GHL snapshot, else manual, else preview)
                  const displayFee  = (ghlSnapshot?.vaultCoFee ?? (ghlPreviewEntry.status === "loaded" ? ghlFee : null)) ?? displayManualFee;
                  const displayNick = (ghlSnapshot?.nickRecurringEarnings ?? (ghlPreviewEntry.status === "loaded" ? ghlNick : null)) ?? displayManualNick;

                  // Review status: GHL snapshot takes precedence over manual
                  const displayReviewStatus = ghlSnapshot?.reviewStatus ?? manualSnapshot?.reviewStatus ?? null;

                  // Settings panel state for this client
                  const defaultForm = { ghlPipelineId: "", ghlLocationId: "", recurringBillingStartDate: "", stripeCustomerId: "", notes: "" };
                  const form         = panelForm[client.id] ?? defaultForm;
                  const isSavingPanel = panelSaving[client.id] ?? false;
                  const panelErr     = panelError[client.id] ?? null;
                  const panelOk      = panelSuccess[client.id] ?? false;
                  const isPanelOpen  = openPanel === client.id;

                  // Safe debug metadata from most recent preview attempt
                  const previewDebug: GHLDebugMeta | undefined =
                    ghlPreviewEntry.status === "loaded" ? ghlPreviewEntry.debug
                    : ghlPreviewEntry.status === "error" ? ghlPreviewEntry.debug
                    : undefined;

                  return (
                    <>
                    <tr key={client.id}
                      className="border-b transition-colors hover:bg-white/[0.01]"
                      style={{ borderColor: "var(--t-border-nav)" }}>

                      {/* Client */}
                      <td className="px-4 py-3.5">
                        <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{client.name}</div>
                        <div className="text-[10px]" style={{ color: "var(--t-dim)" }}>{client.market}</div>
                      </td>

                      {/* Recurring toggle */}
                      <td className="px-4 py-3.5">
                        <RecurringToggle
                          clientId={client.id}
                          isOn={isOn}
                          isSaving={isSaving}
                          disabled={!isSettingsLoaded}
                          onToggle={(id) => void handleToggleRecurring(id)}
                        />
                      </td>

                      {/* GHL Connected */}
                      <td className="px-4 py-3.5">
                        <GHLStatusChip status={ghlStatus} />
                        {ghlStatus?.missingReason && (
                          <div className="text-[9px] mt-1 leading-snug max-w-[180px]"
                            style={{ color: "rgba(107,122,153,0.5)" }}>
                            {ghlStatus.missingReason}
                          </div>
                        )}
                        {!ghlStatus?.isGhlConnected && ghlStatus?.connectionSource === "missing" && (
                          <button
                            onClick={() => handleOpenPanel(client.id)}
                            className="mt-1.5 flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded transition-opacity hover:opacity-80"
                            style={{ color: "rgba(107,122,153,0.6)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}>
                            <Settings size={8} /> Configure
                          </button>
                        )}
                      </td>

                      {/* Manual Revenue Input */}
                      <td className="px-4 py-3.5">
                        {!isOn ? (
                          <span className="text-[11px]" style={{ color: "rgba(107,122,153,0.4)" }}>
                            Enable billing
                          </span>
                        ) : (
                          <div className="space-y-1.5" style={{ opacity: manualSnapshot?.reviewStatus === "locked" ? 0.45 : 1 }}>
                            {manualSnapshot?.reviewStatus === "locked" && (
                              <div className="flex items-center gap-1 text-[9px] font-semibold mb-0.5" style={{ color: "#0081f2" }}>
                                <CheckCircle2 size={9} /> Locked
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <span className="text-[12px] flex-shrink-0" style={{ color: "var(--t-dim)" }}>$</span>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={revenueInputs[client.id] ?? ""}
                                onChange={(e) => setRevenueInputs((prev) => ({ ...prev, [client.id]: e.target.value }))}
                                placeholder="0.00"
                                disabled={manualSnapshot?.reviewStatus === "locked"}
                                className="w-24 px-2 py-1 rounded-md text-[12px] font-semibold bg-transparent outline-none disabled:cursor-not-allowed"
                                style={{
                                  backgroundColor: manualSnapshot?.reviewStatus === "locked" ? "transparent" : "rgba(0,129,242,0.04)",
                                  border: `1px solid ${manualSnapshot?.reviewStatus === "locked" ? "rgba(0,129,242,0.15)" : "rgba(61,79,110,0.25)"}`,
                                  color: "var(--t-text)",
                                  fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                                }}
                              />
                            </div>
                            <input
                              type="text"
                              value={notesInputs[client.id] ?? ""}
                              onChange={(e) => setNotesInputs((prev) => ({ ...prev, [client.id]: e.target.value }))}
                              placeholder="Notes"
                              disabled={manualSnapshot?.reviewStatus === "locked"}
                              className="w-full px-2 py-0.5 rounded text-[10px] bg-transparent outline-none disabled:cursor-not-allowed"
                              style={{
                                backgroundColor: "rgba(0,129,242,0.02)",
                                border: "1px solid rgba(61,79,110,0.12)",
                                color: "var(--t-dim)",
                              }}
                            />
                            {manualSnapshot && (
                              <div className="text-[9px]" style={{ color: "rgba(107,122,153,0.45)" }}>
                                Saved: {fmtCurrency(manualSnapshot.closedWonRevenue)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* GHL Closed Won */}
                      <td className="px-4 py-3.5">
                        {!isOn ? (
                          <span className="text-[11px]" style={{ color: "rgba(107,122,153,0.4)" }}>—</span>
                        ) : !canPreviewGHL ? (
                          <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.4)" }}>
                            {!ghlStatus || ghlStatus.connectionSource === "missing"
                              ? "No GHL configured"
                              : "Location ID needed"}
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {/* Saved snapshot row — always shown when it exists */}
                            {ghlSnapshot && (
                              <div className="space-y-0.5">
                                <div className="text-[12px] font-semibold" style={{ color: "#22c55e" }}>
                                  {fmtCurrency(ghlSnapshot.closedWonRevenue)}
                                </div>
                                <div className="text-[9px]" style={{ color: "rgba(107,122,153,0.45)" }}>
                                  Snapshot · {ghlSnapshot.dealCount ?? 0} deal{(ghlSnapshot.dealCount ?? 0) !== 1 ? "s" : ""}
                                  {ghlSnapshot.syncedAt ? ` · saved ${fmtRelativeTime(ghlSnapshot.syncedAt)}` : ""}
                                </div>
                              </div>
                            )}

                            {/* Preview state overlays — shown regardless of whether snapshot exists */}
                            {ghlPreviewEntry.status === "idle" && (
                              <button
                                onClick={() => void handlePreviewGHL(client.id)}
                                className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                                style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)" }}>
                                <Eye size={10} /> {ghlSnapshot ? "Refresh GHL Preview" : "Preview GHL"}
                              </button>
                            )}
                            {ghlPreviewEntry.status === "loading" && (
                              <div className="flex items-center gap-1.5" style={{ color: "var(--t-dim)" }}>
                                <Loader2 size={12} className="animate-spin" />
                                <span className="text-[10px]">Fetching…</span>
                              </div>
                            )}
                            {ghlPreviewEntry.status === "error" && (
                              <div className="space-y-1">
                                <div className="text-[10px]" style={{ color: "#ef4444" }}>{ghlPreviewEntry.error}</div>
                                <button
                                  onClick={() => void handlePreviewGHL(client.id)}
                                  className="text-[9px] font-bold px-2 py-0.5 rounded transition-opacity hover:opacity-80"
                                  style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)" }}>
                                  Retry
                                </button>
                              </div>
                            )}
                            {ghlPreviewEntry.status === "loaded" && (
                              <div className="space-y-0.5">
                                {ghlPreviewEntry.result.closedWonDealsCount === 0 ? (
                                  <div className="text-[10px] leading-snug" style={{ color: "rgba(107,122,153,0.5)" }}>
                                    No Won deals found.{" "}
                                    <span style={{ color: "rgba(107,122,153,0.7)" }}>
                                      If you just moved a deal to Won, click Refresh or check the date falls within this month.
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-[12px] font-semibold" style={{ color: ghlSnapshot ? "#c9a84c" : "#22c55e" }}>
                                      {fmtCurrency(ghlPreviewEntry.result.closedWonRevenue)}
                                    </div>
                                    {ghlSnapshot && (
                                      <div className="text-[9px] font-semibold" style={{ color: "#c9a84c" }}>
                                        New preview loaded — save to update snapshot
                                      </div>
                                    )}
                                  </>
                                )}
                                <div className="text-[9px]" style={{ color: "rgba(107,122,153,0.45)" }}>
                                  Preview · {ghlPreviewEntry.result.closedWonDealsCount} deal{ghlPreviewEntry.result.closedWonDealsCount !== 1 ? "s" : ""} · {fmtRelativeTime(ghlPreviewEntry.loadedAt)}
                                  {!ghlStatus?.ghlPipelineIdPresent && " · all pipelines"}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Deal Count */}
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: ghlDeals != null && ghlDeals > 0 ? "#22c55e" : "rgba(107,122,153,0.4)" }}>
                          {ghlDeals != null ? ghlDeals : "—"}
                        </span>
                        {ghlDeals != null && (
                          <div className="text-[9px] mt-0.5" style={{ color: "rgba(107,122,153,0.4)" }}>
                            {ghlPreviewEntry.status === "loaded"
                              ? `preview (${fmtRelativeTime(ghlPreviewEntry.loadedAt)})`
                              : ghlSnapshot
                              ? `saved${ghlSnapshot.syncedAt ? ` ${fmtRelativeTime(ghlSnapshot.syncedAt)}` : ""}`
                              : "preview"}
                          </div>
                        )}
                      </td>

                      {/* Vault Co 5% Fee */}
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: isOn && displayFee > 0 ? GOLD : "rgba(107,122,153,0.4)" }}>
                          {isOn && displayFee > 0 ? fmtCurrency(displayFee) : "—"}
                        </span>
                        {isOn && displayFee > 0 && (
                          <div className="text-[9px] mt-0.5" style={{ color: "rgba(107,122,153,0.45)" }}>
                            Estimated · not collected
                          </div>
                        )}
                      </td>

                      {/* Nick Recurring */}
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: isOn && displayNick > 0 ? "#a78bfa" : "rgba(107,122,153,0.4)" }}>
                          {isOn && displayNick > 0 ? fmtCurrency(displayNick) : "—"}
                        </span>
                        {isOn && displayNick > 0 && (
                          <div className="text-[9px] mt-0.5" style={{ color: "rgba(107,122,153,0.45)" }}>
                            Jaxon: $0
                          </div>
                        )}
                      </td>

                      {/* Review Status */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          {ghlSnapshot && (
                            <div className="flex items-center gap-1.5">
                              <ReviewStatusBadge status={ghlSnapshot.reviewStatus} />
                              <span className="text-[8px]" style={{ color: "rgba(34,197,94,0.5)" }}>GHL</span>
                            </div>
                          )}
                          {manualSnapshot && (
                            <div className="flex items-center gap-1.5"
                              style={{ opacity: ghlSnapshot && manualSnapshot.closedWonRevenue === 0 && manualSnapshot.reviewStatus === "draft" ? 0.4 : 1 }}>
                              <ReviewStatusBadge status={manualSnapshot.reviewStatus} />
                              <span className="text-[8px]" style={{ color: "rgba(107,122,153,0.4)" }}>Manual{ghlSnapshot && manualSnapshot.closedWonRevenue === 0 && manualSnapshot.reviewStatus === "draft" ? " ($0)" : ""}</span>
                            </div>
                          )}
                          {!ghlSnapshot && !manualSnapshot && (
                            <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.4)" }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1.5">
                          {/* Save Manual — hidden when manual snapshot is locked */}
                          {isOn && manualSnapshot?.reviewStatus !== "locked" && (
                            <button
                              onClick={() => void handleSaveSnapshot(client.id)}
                              disabled={!isOn || isSaving || isSnapshotSaving}
                              className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                              style={{ color: GOLD, backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
                              {isSnapshotSaving && <Loader2 size={10} className="animate-spin" />}
                              {isSnapshotSaving ? "Saving…" : manualSnapshot ? "Update Manual" : "Save Manual"}
                            </button>
                          )}
                          {/* Save / Update GHL Snapshot — hidden when GHL snapshot is locked */}
                          {isOn && canPreviewGHL && ghlPreviewEntry.status === "loaded" && ghlSnapshot?.reviewStatus !== "locked" && (
                            <button
                              onClick={() => void handleSaveGHLSnapshot(client.id)}
                              disabled={isGhlSaving}
                              className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                              style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)" }}>
                              {isGhlSaving && <Loader2 size={10} className="animate-spin" />}
                              {isGhlSaving ? "Saving…" : ghlSnapshot ? "Update GHL Snapshot" : "Save GHL Snapshot"}
                            </button>
                          )}
                          {/* Refresh GHL Preview — visible when GHL connected and not currently loading */}
                          {isOn && canPreviewGHL && ghlPreviewEntry.status !== "loading" && ghlPreviewEntry.status !== "loaded" && (
                            <button
                              onClick={() => void handlePreviewGHL(client.id)}
                              className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80 whitespace-nowrap"
                              style={{ color: "rgba(107,122,153,0.7)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}>
                              <RefreshCw size={10} /> {ghlSnapshot ? "Refresh GHL" : "Preview GHL"}
                            </button>
                          )}
                          {/* Refresh again after a loaded preview */}
                          {isOn && canPreviewGHL && ghlPreviewEntry.status === "loaded" && (
                            <button
                              onClick={() => void handlePreviewGHL(client.id)}
                              className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded transition-opacity hover:opacity-80 whitespace-nowrap"
                              style={{ color: "rgba(107,122,153,0.55)", backgroundColor: "transparent", border: "none" }}>
                              <RefreshCw size={9} /> Refresh again
                            </button>
                          )}
                          {/* ── Phase 2D: Review / Lock actions ─────────── */}
                          {/* Manual snapshot review actions */}
                          {manualSnapshot && (() => {
                            const sid = manualSnapshot.id;
                            const st  = manualSnapshot.reviewStatus;
                            const saving = reviewSaving[`${sid}-${st === "draft" ? "reviewed" : st === "reviewed" ? "locked" : "reviewed"}`] ?? false;
                            return (
                              <div className="pt-0.5 flex flex-col gap-1">
                                <div className="text-[8px] uppercase tracking-widest font-bold"
                                  style={{ color: "rgba(107,122,153,0.4)", fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif" }}>
                                  Manual Snapshot
                                </div>
                                {st === "draft" && (
                                  <button
                                    onClick={() => void handleUpdateReviewStatus(sid, client.id, "manual", "reviewed")}
                                    disabled={saving}
                                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40 whitespace-nowrap"
                                    style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)" }}>
                                    {saving && <Loader2 size={9} className="animate-spin" />}
                                    Mark Reviewed
                                  </button>
                                )}
                                {st === "reviewed" && (
                                  <>
                                    <button
                                      onClick={() => {
                                        if (window.confirm("Lock this revenue snapshot? This confirms the billing basis for this client and month. It will not create or send an invoice.")) {
                                          void handleUpdateReviewStatus(sid, client.id, "manual", "locked");
                                        }
                                      }}
                                      disabled={saving}
                                      className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40 whitespace-nowrap"
                                      style={{ color: "#0081f2", backgroundColor: "rgba(0,129,242,0.08)", border: "1px solid rgba(0,129,242,0.20)" }}>
                                      {saving && <Loader2 size={9} className="animate-spin" />}
                                      Lock Snapshot
                                    </button>
                                    <button
                                      onClick={() => void handleUpdateReviewStatus(sid, client.id, "manual", "draft")}
                                      className="text-[9px] px-1.5 py-0.5 rounded transition-opacity hover:opacity-70"
                                      style={{ color: "rgba(107,122,153,0.5)" }}>
                                      Revert to Draft
                                    </button>
                                  </>
                                )}
                                {st === "locked" && (
                                  <>
                                    {/* Stripe Customer status */}
                                    {stripeCustomerId ? (
                                      <div className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: "#a78bfa" }}>
                                        <CheckCircle2 size={9} /> Stripe Customer Connected
                                      </div>
                                    ) : (
                                      <div className="space-y-0.5">
                                        <div className="text-[9px] font-semibold" style={{ color: "#f59e0b" }}>
                                          Stripe Customer Required
                                        </div>
                                        <div className="text-[9px] leading-snug" style={{ color: "rgba(107,122,153,0.5)" }}>
                                          Add a Stripe Customer ID in Settings to enable draft invoices.
                                        </div>
                                      </div>
                                    )}
                                    {!manualSnapshot.stripeInvoiceId ? (
                                      <div className="flex flex-col gap-1">
                                        <button
                                          onClick={() => void handleCreateInvoiceDraft(sid, client.id, "manual")}
                                          disabled={invoiceSaving[sid] || !stripeCustomerId}
                                          className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                          style={{ color: "#a78bfa", backgroundColor: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.20)" }}>
                                          {invoiceSaving[sid] && <Loader2 size={9} className="animate-spin" />}
                                          {invoiceSaving[sid] ? "Creating…" : "Create Draft Invoice"}
                                        </button>
                                        <div className="text-[9px]" style={{ color: "rgba(107,122,153,0.4)" }}>
                                          Draft invoices only · No invoice will be sent or charged automatically.
                                        </div>
                                        {invoiceErrors[sid] && (
                                          <div className="text-[9px] leading-snug" style={{ color: "#ef4444" }}>
                                            {invoiceErrors[sid]}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-0.5">
                                        <div className="text-[9px] font-semibold" style={{ color: "#a78bfa" }}>
                                          Draft Invoice Created
                                        </div>
                                        <div className="text-[8px] font-mono" style={{ color: "rgba(167,139,250,0.6)" }}>
                                          {manualSnapshot.stripeInvoiceId}
                                        </div>
                                        {manualSnapshot.stripeInvoiceUrl && (
                                          <a
                                            href={manualSnapshot.stripeInvoiceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[9px] font-bold underline"
                                            style={{ color: "#a78bfa" }}>
                                            Open in Stripe ↗
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    <button
                                      onClick={() => {
                                        if (window.confirm("Unlock this snapshot? This allows the revenue basis to be edited again.")) {
                                          void handleUpdateReviewStatus(sid, client.id, "manual", "reviewed");
                                        }
                                      }}
                                      disabled={saving}
                                      className="flex items-center gap-1 text-[9px] font-medium px-2 py-1 rounded transition-opacity hover:opacity-70 whitespace-nowrap"
                                      style={{ color: "rgba(107,122,153,0.6)", backgroundColor: "rgba(61,79,110,0.06)", border: "1px solid rgba(61,79,110,0.12)" }}>
                                      Unlock Snapshot
                                    </button>
                                  </>
                                )}
                              </div>
                            );
                          })()}

                          {/* GHL snapshot review actions */}
                          {ghlSnapshot && (() => {
                            const sid = ghlSnapshot.id;
                            const st  = ghlSnapshot.reviewStatus;
                            const saving = reviewSaving[`${sid}-${st === "draft" ? "reviewed" : st === "reviewed" ? "locked" : "reviewed"}`] ?? false;
                            return (
                              <div className="pt-0.5 flex flex-col gap-1">
                                <div className="text-[8px] uppercase tracking-widest font-bold"
                                  style={{ color: "rgba(34,197,94,0.4)", fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif" }}>
                                  GHL Snapshot
                                </div>
                                {st === "draft" && (
                                  <button
                                    onClick={() => void handleUpdateReviewStatus(sid, client.id, "ghl", "reviewed")}
                                    disabled={saving}
                                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40 whitespace-nowrap"
                                    style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)" }}>
                                    {saving && <Loader2 size={9} className="animate-spin" />}
                                    Mark Reviewed
                                  </button>
                                )}
                                {st === "reviewed" && (
                                  <>
                                    <button
                                      onClick={() => {
                                        if (window.confirm("Lock this revenue snapshot? This confirms the billing basis for this client and month. It will not create or send an invoice.")) {
                                          void handleUpdateReviewStatus(sid, client.id, "ghl", "locked");
                                        }
                                      }}
                                      disabled={saving}
                                      className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40 whitespace-nowrap"
                                      style={{ color: "#0081f2", backgroundColor: "rgba(0,129,242,0.08)", border: "1px solid rgba(0,129,242,0.20)" }}>
                                      {saving && <Loader2 size={9} className="animate-spin" />}
                                      Lock Snapshot
                                    </button>
                                    <button
                                      onClick={() => void handleUpdateReviewStatus(sid, client.id, "ghl", "draft")}
                                      className="text-[9px] px-1.5 py-0.5 rounded transition-opacity hover:opacity-70"
                                      style={{ color: "rgba(107,122,153,0.5)" }}>
                                      Revert to Draft
                                    </button>
                                  </>
                                )}
                                {st === "locked" && (
                                  <>
                                    {/* Stripe Customer status */}
                                    {stripeCustomerId ? (
                                      <div className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: "#a78bfa" }}>
                                        <CheckCircle2 size={9} /> Stripe Customer Connected
                                      </div>
                                    ) : (
                                      <div className="space-y-0.5">
                                        <div className="text-[9px] font-semibold" style={{ color: "#f59e0b" }}>
                                          Stripe Customer Required
                                        </div>
                                        <div className="text-[9px] leading-snug" style={{ color: "rgba(107,122,153,0.5)" }}>
                                          Add a Stripe Customer ID in Settings to enable draft invoices.
                                        </div>
                                      </div>
                                    )}
                                    {!ghlSnapshot.stripeInvoiceId ? (
                                      <div className="flex flex-col gap-1">
                                        <button
                                          onClick={() => void handleCreateInvoiceDraft(sid, client.id, "ghl")}
                                          disabled={invoiceSaving[sid] || !stripeCustomerId}
                                          className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                          style={{ color: "#a78bfa", backgroundColor: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.20)" }}>
                                          {invoiceSaving[sid] && <Loader2 size={9} className="animate-spin" />}
                                          {invoiceSaving[sid] ? "Creating…" : "Create Draft Invoice"}
                                        </button>
                                        <div className="text-[9px]" style={{ color: "rgba(107,122,153,0.4)" }}>
                                          Draft invoices only · No invoice will be sent or charged automatically.
                                        </div>
                                        {invoiceErrors[sid] && (
                                          <div className="text-[9px] leading-snug" style={{ color: "#ef4444" }}>
                                            {invoiceErrors[sid]}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-0.5">
                                        <div className="text-[9px] font-semibold" style={{ color: "#a78bfa" }}>
                                          Draft Invoice Created
                                        </div>
                                        <div className="text-[8px] font-mono" style={{ color: "rgba(167,139,250,0.6)" }}>
                                          {ghlSnapshot.stripeInvoiceId}
                                        </div>
                                        {ghlSnapshot.stripeInvoiceUrl && (
                                          <a
                                            href={ghlSnapshot.stripeInvoiceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[9px] font-bold underline"
                                            style={{ color: "#a78bfa" }}>
                                            Open in Stripe ↗
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    <button
                                      onClick={() => {
                                        if (window.confirm("Unlock this snapshot? This allows the revenue basis to be edited again.")) {
                                          void handleUpdateReviewStatus(sid, client.id, "ghl", "reviewed");
                                        }
                                      }}
                                      disabled={saving}
                                      className="flex items-center gap-1 text-[9px] font-medium px-2 py-1 rounded transition-opacity hover:opacity-70 whitespace-nowrap"
                                      style={{ color: "rgba(107,122,153,0.6)", backgroundColor: "rgba(61,79,110,0.06)", border: "1px solid rgba(61,79,110,0.12)" }}>
                                      Unlock Snapshot
                                    </button>
                                  </>
                                )}
                              </div>
                            );
                          })()}

                          {/* Settings gear — always available for admin */}
                          <button
                            onClick={() => handleOpenPanel(client.id)}
                            className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded transition-opacity hover:opacity-80 mt-0.5"
                            style={{
                              color: openPanel === client.id ? GOLD : "rgba(107,122,153,0.6)",
                              backgroundColor: openPanel === client.id ? GOLD_BG : "rgba(61,79,110,0.06)",
                              border: `1px solid ${openPanel === client.id ? GOLD_BORDER : "rgba(61,79,110,0.12)"}`,
                            }}>
                            <Settings size={9} />
                            {openPanel === client.id ? "Close" : "Settings"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Inline Revenue Settings Panel ───────────────── */}
                    {isPanelOpen && (
                        <tr key={`${client.id}-settings`}
                          style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                          <td colSpan={10} className="px-0 py-0">
                            <div className="mx-4 my-3 rounded-xl overflow-hidden"
                              style={{ border: `1px solid ${GOLD_BORDER}`, backgroundColor: "rgba(201,168,76,0.03)" }}>

                              {/* Panel header */}
                              <div className="flex items-center justify-between px-5 py-3 border-b"
                                style={{ borderColor: GOLD_BORDER, backgroundColor: "rgba(201,168,76,0.04)" }}>
                                <div className="flex items-center gap-2.5">
                                  <Settings size={13} style={{ color: GOLD }} />
                                  <span className="text-[12px] font-bold"
                                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: GOLD }}>
                                    Client Revenue Settings — {client.name}
                                  </span>
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ color: "rgba(107,122,153,0.6)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}>
                                    ADMIN ONLY
                                  </span>
                                </div>
                                <button onClick={() => setOpenPanel(null)}
                                  className="hover:opacity-60 transition-opacity" style={{ color: "var(--t-dim)" }}>
                                  <X size={14} />
                                </button>
                              </div>

                              {/* Panel body — form + status side by side */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x"
                                style={{ borderColor: "rgba(61,79,110,0.15)" }}>

                                {/* Left: editable fields */}
                                <div className="px-5 py-4 space-y-4">
                                  <div className="text-[9px] font-bold uppercase tracking-widest mb-1"
                                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                                    Editable Fields
                                  </div>

                                  {/* GHL Pipeline ID */}
                                  <div>
                                    <label className="text-[10px] font-bold block mb-1"
                                      style={{ color: "var(--t-dim)" }}>
                                      Optional GHL Pipeline ID
                                    </label>
                                    <input
                                      type="text"
                                      value={form.ghlPipelineId}
                                      onChange={(e) => setPanelForm((prev) => ({ ...prev, [client.id]: { ...(prev[client.id] ?? defaultForm), ghlPipelineId: e.target.value } }))}
                                      placeholder="e.g. abc123pipeline"
                                      className="w-full px-3 py-2 rounded-lg text-[12px] font-mono bg-transparent outline-none"
                                      style={{
                                        backgroundColor: "rgba(0,129,242,0.04)",
                                        border: "1px solid rgba(61,79,110,0.25)",
                                        color: "var(--t-text)",
                                      }}
                                    />
                                    <p className="text-[9px] mt-1" style={{ color: "rgba(107,122,153,0.5)" }}>
                                      Leave blank to pull Closed Won opportunities across the connected GHL location. Add a Pipeline ID only if you want to filter to one pipeline.
                                    </p>
                                  </div>

                                  {/* GHL Location ID override */}
                                  <div>
                                    <label className="text-[10px] font-bold block mb-1"
                                      style={{ color: "var(--t-dim)" }}>
                                      GHL Location ID Override
                                      <span className="ml-2 text-[9px] font-normal" style={{ color: "rgba(107,122,153,0.5)" }}>
                                        Optional — only needed if auto-detection is wrong
                                      </span>
                                    </label>
                                    <input
                                      type="text"
                                      value={form.ghlLocationId}
                                      onChange={(e) => setPanelForm((prev) => ({ ...prev, [client.id]: { ...(prev[client.id] ?? defaultForm), ghlLocationId: e.target.value } }))}
                                      placeholder={ghlStatus?.ghlLocationIdPresent ? "Auto-detected — leave blank to keep" : "e.g. loc_xyz789"}
                                      className="w-full px-3 py-2 rounded-lg text-[12px] font-mono bg-transparent outline-none"
                                      style={{
                                        backgroundColor: "rgba(0,129,242,0.04)",
                                        border: "1px solid rgba(61,79,110,0.25)",
                                        color: "var(--t-text)",
                                      }}
                                    />
                                    <p className="text-[9px] mt-1" style={{ color: "rgba(107,122,153,0.5)" }}>
                                      {ghlStatus?.ghlLocationIdPresent
                                        ? `Location detected via ${ghlStatus.connectionSource.replace("_", " ")}. Only use this if the auto-detected GHL Location ID is wrong.`
                                        : "No location detected. Set it here or save GHL credentials in the Integrations tab."}
                                    </p>
                                  </div>

                                  {/* Recurring Billing Start Date */}
                                  <div>
                                    <label className="text-[10px] font-bold block mb-1"
                                      style={{ color: "var(--t-dim)" }}>
                                      Recurring Billing Start Date
                                    </label>
                                    <input
                                      type="date"
                                      value={form.recurringBillingStartDate}
                                      onChange={(e) => setPanelForm((prev) => ({ ...prev, [client.id]: { ...(prev[client.id] ?? defaultForm), recurringBillingStartDate: e.target.value } }))}
                                      className="px-3 py-2 rounded-lg text-[12px] bg-transparent outline-none"
                                      style={{
                                        backgroundColor: "rgba(0,129,242,0.04)",
                                        border: "1px solid rgba(61,79,110,0.25)",
                                        color: "var(--t-text)",
                                      }}
                                    />
                                  </div>

                                  {/* Stripe Customer ID */}
                                  <div>
                                    <label className="text-[10px] font-bold block mb-1"
                                      style={{ color: "var(--t-dim)" }}>
                                      Stripe Customer ID
                                      <span className="ml-2 text-[9px] font-normal" style={{ color: "rgba(107,122,153,0.5)" }}>
                                        Required for draft invoice creation
                                      </span>
                                    </label>
                                    <input
                                      type="text"
                                      value={form.stripeCustomerId}
                                      onChange={(e) => setPanelForm((prev) => ({ ...prev, [client.id]: { ...(prev[client.id] ?? defaultForm), stripeCustomerId: e.target.value } }))}
                                      placeholder="cus_…"
                                      className="w-full px-3 py-2 rounded-lg text-[12px] font-mono bg-transparent outline-none"
                                      style={{
                                        backgroundColor: form.stripeCustomerId ? "rgba(167,139,250,0.04)" : "rgba(0,129,242,0.04)",
                                        border: `1px solid ${form.stripeCustomerId ? "rgba(167,139,250,0.25)" : "rgba(61,79,110,0.25)"}`,
                                        color: "var(--t-text)",
                                      }}
                                    />
                                    <p className="text-[9px] mt-1 leading-snug" style={{ color: "rgba(107,122,153,0.5)" }}>
                                      Use a Stripe test customer ID first. This enables draft invoice creation only. No invoice will be sent or charged automatically.
                                    </p>
                                  </div>

                                  {/* Notes */}
                                  <div>
                                    <label className="text-[10px] font-bold block mb-1"
                                      style={{ color: "var(--t-dim)" }}>
                                      Notes
                                    </label>
                                    <textarea
                                      value={form.notes}
                                      onChange={(e) => setPanelForm((prev) => ({ ...prev, [client.id]: { ...(prev[client.id] ?? defaultForm), notes: e.target.value } }))}
                                      placeholder="Internal notes about this client's GHL setup…"
                                      rows={2}
                                      className="w-full px-3 py-2 rounded-lg text-[11px] bg-transparent outline-none resize-none"
                                      style={{
                                        backgroundColor: "rgba(0,129,242,0.02)",
                                        border: "1px solid rgba(61,79,110,0.18)",
                                        color: "var(--t-dim)",
                                      }}
                                    />
                                  </div>

                                  {/* Save row */}
                                  <div className="flex items-center gap-3 pt-1">
                                    <button
                                      onClick={() => void handleSaveGHLSettings(client.id)}
                                      disabled={isSavingPanel}
                                      className="flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                                      style={{ color: GOLD, backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
                                      {isSavingPanel && <Loader2 size={11} className="animate-spin" />}
                                      {isSavingPanel ? "Saving…" : "Save Settings"}
                                    </button>
                                    {panelOk && !isSavingPanel && (
                                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#22c55e" }}>
                                        <CheckCircle2 size={13} /> Saved
                                      </div>
                                    )}
                                    {panelErr && (
                                      <div className="text-[11px]" style={{ color: "#ef4444" }}>{panelErr}</div>
                                    )}
                                  </div>
                                </div>

                                {/* Right: display-only GHL status */}
                                <div className="px-5 py-4 space-y-3">
                                  <div className="text-[9px] font-bold uppercase tracking-widest mb-1"
                                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                                    GHL Connection Status
                                  </div>

                                  {[
                                    {
                                      label: "Credentials Found",
                                      value: ghlStatus?.isGhlConnected ? "Yes" : "No",
                                      color: ghlStatus?.isGhlConnected ? "#22c55e" : "#ef4444",
                                      note: ghlStatus?.connectionSource
                                        ? `Source: ${ghlStatus.connectionSource.replace(/_/g, " ")}`
                                        : "No credentials detected",
                                    },
                                    {
                                      label: "Location ID",
                                      value: ghlStatus?.ghlLocationIdPresent ? "Detected" : "Missing",
                                      color: ghlStatus?.ghlLocationIdPresent ? "#22c55e" : "#f59e0b",
                                      note: ghlStatus?.ghlLocationIdPresent
                                        ? `Via ${ghlStatus.connectionSource?.replace(/_/g, " ")}`
                                        : "Set it here or in Integrations",
                                    },
                                    {
                                      label: "Pipeline Filter",
                                      value: ghlStatus?.ghlPipelineIdPresent ? "Active" : "All Pipelines",
                                      color: ghlStatus?.ghlPipelineIdPresent ? "#22c55e" : "rgba(107,122,153,0.6)",
                                      note: ghlStatus?.ghlPipelineIdPresent
                                        ? "Closed Won filtered to one pipeline"
                                        : "Optional — leave blank to pull all Closed Won",
                                    },
                                    {
                                      label: "Preview GHL",
                                      value: canPreviewGHL ? "Available" : "Unavailable",
                                      color: canPreviewGHL ? "#22c55e" : "rgba(107,122,153,0.6)",
                                      note: canPreviewGHL
                                        ? "Click Preview GHL to fetch Closed Won revenue"
                                        : (ghlStatus?.missingReason ?? "Connect GHL credentials first"),
                                    },
                                    {
                                      label: "Stripe Customer",
                                      value: stripeCustomerId ? "Connected" : "Required",
                                      color: stripeCustomerId ? "#a78bfa" : "#f59e0b",
                                      note: stripeCustomerId
                                        ? `${stripeCustomerId.slice(0, 12)}… · Draft invoices only`
                                        : "Add a Stripe Customer ID above to enable draft invoice creation",
                                    },
                                    ...(previewDebug?.locationIdMasked ? [{
                                      label: "Location (masked)",
                                      value: previewDebug.locationIdMasked,
                                      color: "rgba(201,168,76,0.85)",
                                      note: `Source: ${(previewDebug.locationSource ?? "unknown").replace(/_/g, " ")}`,
                                    }] : []),
                                    ...(previewDebug?.ghlStatusCode && previewDebug.ghlStatusCode !== 200 ? [{
                                      label: "Last GHL Status",
                                      value: String(previewDebug.ghlStatusCode),
                                      color: previewDebug.ghlStatusCode === 422 ? "#f59e0b" : "#ef4444",
                                      note: previewDebug.ghlStatusCode === 422
                                        ? "422 — check location ID or pipeline ID"
                                        : previewDebug.ghlStatusCode === 401 || previewDebug.ghlStatusCode === 403
                                        ? "Credentials rejected by GHL"
                                        : "GHL returned an error",
                                    }] : []),
                                  ].map((item) => (
                                    <div key={item.label} className="flex items-start justify-between gap-4 py-2 border-b"
                                      style={{ borderColor: "rgba(61,79,110,0.10)" }}>
                                      <div>
                                        <div className="text-[10px] font-semibold" style={{ color: "var(--t-dim)" }}>
                                          {item.label}
                                        </div>
                                        <div className="text-[9px] mt-0.5" style={{ color: "rgba(107,122,153,0.45)" }}>
                                          {item.note}
                                        </div>
                                      </div>
                                      <span className="text-[11px] font-bold flex-shrink-0" style={{ color: item.color }}>
                                        {item.value}
                                      </span>
                                    </div>
                                  ))}

                                  <div className="pt-2">
                                    <p className="text-[9px] leading-relaxed" style={{ color: "rgba(107,122,153,0.45)" }}>
                                      GHL credentials (API keys) are stored encrypted server-side and never shown here.
                                      To add or update GHL credentials, use the Integrations tab in Client Settings.
                                      This panel saves GHL pipeline ID, location override, Stripe Customer ID, billing start date, and notes to Revenue Settings only. No Stripe API is called when saving.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                    )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Phase 2C safety note ─────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t mt-1" style={{ borderColor: "var(--t-border-nav)" }}>
          <div className="flex items-start gap-2.5">
            <Info size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--t-dim)" }} />
            <div>
              <p className="text-[11px] font-semibold mb-0.5" style={{ color: "var(--t-muted)" }}>
                Phase 2C — GHL Read-Only Sync
              </p>
              <p className="text-[11px] leading-snug" style={{ color: "var(--t-dim)" }}>
                GHL Closed Won revenue is fetched read-only from GoHighLevel for the selected billing month. No GHL data is modified.
                &quot;Preview GHL&quot; fetches and displays deals without saving. &quot;Save GHL Snapshot&quot; creates a <strong>Revenue Snapshot</strong> record — not an invoice, not confirmed collected revenue.
                Vault Co 5% fee and partner earnings are estimates. Stripe not connected. No invoices are created or sent. Auth unchanged.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <BillingEmptyState />
      <SafetyNote text="GHL integration is read-only. No GHL data is modified. No Stripe API is called. No invoices are created or sent. Revenue snapshots are estimates — not confirmed collected revenue. Auth unchanged." />
    </div>
  );
}
