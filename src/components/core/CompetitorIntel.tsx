"use client";

// Vault Core — Competitor Intelligence dashboard (Valentina market signals).
//
// Honest by design: this surfaces ONLY internal, manual competitor intelligence
// (profiles + captures) plus Vault Memory. It does NOT scrape, call external
// APIs, or pretend live competitor monitoring exists — future automated sources
// are clearly marked INACTIVE / FUTURE. All language is human-review safe:
// review / inspect / prepare / consider / test manually / analyze. Nothing here
// launches, changes budgets, updates campaigns, or contacts anyone.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Radar, Plus, Target, TrendingUp, Lightbulb, Layers, X, Globe, ExternalLink,
  ShieldCheck, Megaphone, Clock, AlertTriangle, Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  VCPageWrapper, VCPanel, VCPanelHeader, VCStat, VCStatusBadge, VCChip,
  VCEmptyState, VCButton, VCSkeleton, VCDivider,
} from "@/components/ui/VaultUI";
import { useAuth } from "@/components/AuthProvider";
import { CAPTURE_TYPES } from "@/lib/core/competitor/types";
import type {
  CompetitorProfileDTO, CompetitorCaptureDTO, CompetitorIntelOverview, CaptureType,
} from "@/lib/core/competitor/types";
import type { CompetitorSynthesis } from "@/lib/core/competitor/strategy";

const VALENTINA = "#ff8400"; // Valentina = AI Marketing Director accent

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface DrawerState { kind: "profile" | "capture" | null; profileId?: string }

export function CompetitorIntel() {
  const { user } = useAuth();
  const canEdit = !!user && user.role === "admin";

  const [overview, setOverview] = useState<CompetitorIntelOverview | null>(null);
  const [profiles, setProfiles] = useState<CompetitorProfileDTO[]>([]);
  const [captures, setCaptures] = useState<CompetitorCaptureDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({ kind: null });

  const load = useCallback(async () => {
    try {
      const [ov, pr, ca] = await Promise.all([
        fetch("/api/core/competitor-intel").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
        fetch("/api/core/competitor-profiles").then((r) => (r.ok ? r.json() : { profiles: [] })),
        fetch("/api/core/competitor-captures").then((r) => (r.ok ? r.json() : { captures: [] })),
      ]);
      setOverview(ov.overview ?? null);
      setProfiles(pr.profiles ?? []);
      setCaptures(ca.captures ?? []);
    } catch (s) {
      if (s === 403 || s === 401) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const capturesByProfile = useMemo(() => {
    const m = new Map<string, CompetitorCaptureDTO[]>();
    for (const c of captures) {
      const arr = m.get(c.competitor_profile_id) ?? [];
      arr.push(c);
      m.set(c.competitor_profile_id, arr);
    }
    return m;
  }, [captures]);

  if (forbidden) {
    return (
      <VCPageWrapper>
        <PageHeader sectionLabel="Vault Core · Valentina" title="Competitor Intel" />
        <VCPanel><VCEmptyState icon={ShieldCheck} title="Access restricted" description="You don't have access to Competitor Intelligence." /></VCPanel>
      </VCPageWrapper>
    );
  }

  const ov = overview;
  const empty = !loading && profiles.length === 0 && captures.length === 0;

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · Valentina (AI Marketing Director)"
        title="Competitor Intel"
        description="Internal, manual competitor & creative intelligence for Valentina to analyze. Review · inspect · prepare manually — nothing here launches, changes budgets, or contacts anyone."
        badge={<VCStatusBadge label={ov?.live ? "Internal · live DB" : "Internal · in-memory"} variant={ov?.live ? "success" : "blue"} dot />}
        action={canEdit ? (
          <div className="flex gap-2">
            <VCButton onClick={() => setDrawer({ kind: "profile" })} variant="orange"><Plus size={13} /> Add competitor</VCButton>
            <VCButton onClick={() => setDrawer({ kind: "capture" })} variant="ghost" disabled={profiles.length === 0}><Plus size={13} /> Add capture</VCButton>
          </div>
        ) : undefined}
      />

      {/* 1 · Executive Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <VCStat icon={Target} iconColor={VALENTINA} accent={VALENTINA} label="Competitor Profiles" value={loading ? null : ov?.totalProfiles ?? 0} />
        <VCStat icon={Layers} iconColor="#a78bfa" accent="#a78bfa" label="Intelligence Captures" value={loading ? null : ov?.totalCaptures ?? 0} />
        <VCStat icon={Sparkles} iconColor="#22c55e" accent="#22c55e" label="New Signals · 14d" value={loading ? null : ov?.newSignalsThisPeriod ?? 0} changeType="up" />
        <VCStat icon={TrendingUp} iconColor="#0081f2" accent="#0081f2" label="Avg Confidence" value={loading ? null : `${Math.round((ov?.strategy.confidence ?? 0) * 100)}%`} />
        <VCStat icon={Radar} iconColor="#22d3ee" accent="#22d3ee" label="Coverage" value={loading ? null : (ov?.strategy.coverageState ?? "none")} />
      </div>

      {/* 2 · Competitor Source Layer Status */}
      <VCPanel accent="orange">
        <VCPanelHeader icon={Layers} label="Where intelligence comes from" title="Competitor Source Layer" />
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          <SourceTile label="Manual profiles" value={ov?.sources.manualProfiles ?? 0} state="active" />
          <SourceTile label="Manual captures" value={ov?.sources.manualCaptures ?? 0} state="active" />
          <SourceTile label="Vault Memory signals" value={ov?.sources.vaultMemorySignals ?? 0} state="active" />
          <SourceTile label="Creative upload analysis" value={ov?.sources.creativeUploadAnalysis ?? 0} state="active" />
          <SourceTile label="Meta Ads Library" state="future" />
          <SourceTile label="Website monitoring" state="future" />
          <SourceTile label="Landing page snapshots" state="future" />
          <SourceTile label="Social content monitoring" state="future" />
        </div>
        <div className="px-5 pb-4">
          <p className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>
            Future automated sources are <strong>disabled</strong> (COMPETITOR_AUTOMATION_ENABLED={String(ov?.sources.automationEnabled ?? false)}).
            No scraping, no external calls, no scheduled jobs. They activate only after explicit approval.
          </p>
        </div>
      </VCPanel>

      {empty ? (
        <VCPanel>
          <VCEmptyState
            icon={Radar}
            title="No competitor profiles yet"
            description="Add competitors manually to begin building Valentina's market intelligence. Manual hooks, offers, angles, screenshots, and landing pages will appear here. Future automation is disabled until explicitly approved."
            action={canEdit ? <VCButton onClick={() => setDrawer({ kind: "profile" })}><Plus size={13} /> Add your first competitor</VCButton> : undefined}
          />
        </VCPanel>
      ) : (
        <>
          {/* 3 · Offer Shift Timeline + 4 · Hook Leaderboard */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <VCPanel>
              <VCPanelHeader icon={Clock} label="Positioning over time" title="Offer Shift Timeline" />
              <div className="px-5 py-4 space-y-2.5 max-h-[420px] overflow-y-auto">
                {loading && <VCSkeleton rows={3} />}
                {!loading && (ov?.strategy.offerShifts.length ?? 0) === 0 && (
                  <VCEmptyState icon={Clock} title="No offer shifts detected yet" description="Add competitor profiles or capture manual intelligence (offers, pricing, positioning, landing pages) for Valentina to analyze." />
                )}
                {ov?.strategy.offerShifts.map((e, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: VALENTINA }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] leading-snug" style={{ color: "var(--t-text-body)" }}>{e.offer ?? e.angle ?? e.captureType.replace(/_/g, " ")}</p>
                      <p className="text-[10.5px] mt-0.5" style={{ color: "var(--t-dim)" }}>
                        {e.competitorName} · {e.captureType.replace(/_/g, " ")} · {Math.round(e.confidence * 100)}% · {timeAgo(e.date)}
                      </p>
                      <p className="text-[10.5px] mt-0.5 italic" style={{ color: "var(--t-muted)" }}>{e.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </VCPanel>

            <VCPanel>
              <VCPanelHeader icon={Megaphone} label="Ranked angles" title="Hook Leaderboard" />
              <div className="px-5 py-4 space-y-2 max-h-[420px] overflow-y-auto">
                {loading && <VCSkeleton rows={3} />}
                {!loading && (ov?.strategy.topHooks.length ?? 0) === 0 && (
                  <VCEmptyState icon={Megaphone} title="No hook patterns captured yet" description="Add manual captures for Valentina to analyze. Hooks rank by frequency, recency, confidence, and how many competitors use them." />
                )}
                {ov?.strategy.topHooks.map((h, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-bold w-5 flex-shrink-0" style={{ color: VALENTINA, fontFamily: "var(--font-rajdhani), sans-serif" }}>{i + 1}</span>
                      <p className="text-[12.5px] truncate flex-1 min-w-0" style={{ color: "var(--t-text-body)" }}>{h.hook}</p>
                      <VCChip label={`×${h.frequency}`} color={VALENTINA} />
                      <VCChip label={`${Math.round(h.confidence * 100)}%`} color="#a78bfa" />
                      {h.competitorCount > 1 && <VCChip label={`${h.competitorCount} competitors`} color="#0081f2" />}
                    </div>
                    <p className="text-[10px] mt-1 ml-8" style={{ color: "var(--t-dim)" }}>
                      {h.competitors.slice(0, 2).join(", ")} · last {timeAgo(h.lastSeen)}
                    </p>
                    <p className="text-[10.5px] mt-0.5 ml-8 italic" style={{ color: "var(--t-muted)" }}>{h.suggestedHumanAction}</p>
                  </div>
                ))}
              </div>
            </VCPanel>
          </div>

          {/* 5 · Competitor Cards */}
          <VCPanel>
            <VCPanelHeader icon={Target} label="Tracked competitors" title="Competitor Profiles" action={<span className="text-[11px]" style={{ color: "var(--t-muted)" }}>{profiles.length} tracked</span>} />
            <div className="px-5 py-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
              {loading && <VCSkeleton rows={4} />}
              {profiles.map((p) => (
                <CompetitorCard
                  key={p.id}
                  profile={p}
                  captures={capturesByProfile.get(p.id) ?? []}
                  synthesis={ov?.strategy.perCompetitor.find((s) => s.competitorId === p.id)}
                  canEdit={canEdit}
                  onCapture={() => setDrawer({ kind: "capture", profileId: p.id })}
                />
              ))}
            </div>
          </VCPanel>

          {/* 6 · Strategic Response Panel — generated from internal captures */}
          <VCPanel accent="blue">
            <VCPanelHeader icon={Lightbulb} label="Human-review safe" title="What Valentina thinks Vault Co should review next" />
            <div className="px-5 py-4">
              {(() => {
                const actions = ov?.strategy.recommendedHumanActions ?? [];
                return actions.length === 0 ? (
                  <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>
                    Add competitor captures and Valentina will synthesize what to review next.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-[12.5px]" style={{ color: "var(--t-text-body)" }}>
                    {actions.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#0081f2" }} />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}

              {((ov?.strategy.competitorOpportunities.length ?? 0) > 0 || (ov?.strategy.competitorRisks.length ?? 0) > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {(ov?.strategy.competitorOpportunities.length ?? 0) > 0 && (
                    <div className="px-3.5 py-2.5 rounded-xl" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <p className="vc-label mb-1" style={{ color: "#22c55e" }}>Opportunities</p>
                      <ul className="space-y-1 text-[11.5px]" style={{ color: "var(--t-text-body)" }}>
                        {ov?.strategy.competitorOpportunities.map((o, i) => <li key={i}>· {o}</li>)}
                      </ul>
                    </div>
                  )}
                  {(ov?.strategy.competitorRisks.length ?? 0) > 0 && (
                    <div className="px-3.5 py-2.5 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <p className="vc-label mb-1" style={{ color: "#ef4444" }}>Risks</p>
                      <ul className="space-y-1 text-[11.5px]" style={{ color: "var(--t-text-body)" }}>
                        {ov?.strategy.competitorRisks.map((r, i) => <li key={i}>· {r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[10.5px] mt-3" style={{ color: "var(--t-dim)" }}>
                Valentina recommends only — generated from internal manual captures. Nothing here launches ads, changes budgets, updates campaigns, or contacts anyone — humans approve every action.
              </p>
            </div>
          </VCPanel>
        </>
      )}

      {drawer.kind && canEdit && (
        <CaptureDrawer
          kind={drawer.kind}
          profiles={profiles}
          presetProfileId={drawer.profileId}
          onClose={() => setDrawer({ kind: null })}
          onSaved={async () => { setDrawer({ kind: null }); await load(); }}
        />
      )}
    </VCPageWrapper>
  );
}

function SourceTile({ label, value, state }: { label: string; value?: number; state: "active" | "future" }) {
  const future = state === "future";
  return (
    <div className="px-3 py-2.5 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)", opacity: future ? 0.7 : 1 }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold" style={{ color: "var(--t-text-body)" }}>{label}</span>
        {future ? <VCChip label="Future · inactive" color="#6b7a99" /> : <span className="text-[15px] font-bold" style={{ color: VALENTINA, fontFamily: "var(--font-rajdhani), sans-serif" }}>{value ?? 0}</span>}
      </div>
    </div>
  );
}

function CompetitorCard({ profile: p, captures, synthesis, canEdit, onCapture }: { profile: CompetitorProfileDTO; captures: CompetitorCaptureDTO[]; synthesis?: CompetitorSynthesis; canEdit: boolean; onCapture: () => void }) {
  const latestHooks = captures.filter((c) => c.hook || c.angle).slice(0, 3);
  const latestOffers = captures.filter((c) => c.offer).slice(0, 2);
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--t-surface-2)", border: `1px solid ${VALENTINA}22` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>{p.name}</p>
          <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>{[p.market_niche, p.service_area].filter(Boolean).join(" · ") || "—"}</p>
        </div>
        <VCStatusBadge label={p.status} variant={p.status === "active" ? "success" : p.status === "watch" ? "blue" : "neutral"} />
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {p.website && <LinkChip href={p.website} label="Website" icon={Globe} />}
        {p.meta_ad_library_url && <LinkChip href={p.meta_ad_library_url} label="Meta Ad Library" icon={ExternalLink} />}
        {p.google_business_profile_url && <LinkChip href={p.google_business_profile_url} label="Google Business" icon={ExternalLink} />}
        {p.social_links.slice(0, 2).map((s, i) => <LinkChip key={i} href={s} label="Social" icon={ExternalLink} />)}
      </div>

      {p.offer_notes && <p className="text-[12px] mt-2.5 leading-snug" style={{ color: "var(--t-text-body)" }}>{p.offer_notes}</p>}

      {(latestHooks.length > 0 || latestOffers.length > 0) && <VCDivider className="my-2.5" />}
      {latestHooks.length > 0 && (
        <div className="mb-1.5">
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--t-dim)" }}>Latest hooks</p>
          <div className="flex flex-wrap gap-1.5">{latestHooks.map((c) => <VCChip key={c.id} label={(c.hook ?? c.angle) as string} color={VALENTINA} />)}</div>
        </div>
      )}
      {latestOffers.length > 0 && (
        <div className="mb-1.5">
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--t-dim)" }}>Latest offers</p>
          <div className="flex flex-wrap gap-1.5">{latestOffers.map((c) => <VCChip key={c.id} label={c.offer as string} color="#22c55e" />)}</div>
        </div>
      )}

      {/* Valentina synthesis — strongest pattern + opportunity / risk / next action */}
      {synthesis && (synthesis.strongestPattern || synthesis.opportunity || synthesis.risk) && (
        <div className="mt-2.5 rounded-lg px-3 py-2" style={{ background: "rgba(0,129,242,0.05)", border: "1px solid rgba(0,129,242,0.16)" }}>
          {synthesis.strongestPattern && (
            <p className="text-[11px]" style={{ color: "var(--t-text-body)" }}><span className="font-semibold" style={{ color: "#4da6ff" }}>Strongest pattern:</span> {synthesis.strongestPattern}</p>
          )}
          {synthesis.opportunity && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-body)" }}><span className="font-semibold" style={{ color: "#22c55e" }}>Opportunity:</span> {synthesis.opportunity}</p>
          )}
          {synthesis.risk && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-body)" }}><span className="font-semibold" style={{ color: "#ef4444" }}>Risk:</span> {synthesis.risk}</p>
          )}
          {synthesis.recommendedHumanAction && (
            <p className="text-[10.5px] mt-1 italic" style={{ color: "var(--t-muted)" }}>→ {synthesis.recommendedHumanAction}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>{captures.length} capture{captures.length === 1 ? "" : "s"}</span>
        {canEdit && <button onClick={onCapture} className="text-[11px] font-semibold inline-flex items-center gap-1" style={{ color: VALENTINA }}><Plus size={11} /> Add capture</button>}
      </div>
    </div>
  );
}

function LinkChip({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Globe }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px]" style={{ background: "rgba(0,129,242,0.1)", border: "1px solid rgba(0,129,242,0.22)", color: "#4da6ff" }}>
      <Icon size={10} /> {label}
    </a>
  );
}

// ── Manual capture / profile drawer ────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold block mb-1" style={{ color: "var(--t-muted)" }}>{label}</span>
      {children}
      {hint && <span className="text-[10px] block mt-0.5" style={{ color: "var(--t-dim)" }}>{hint}</span>}
    </label>
  );
}

const inputStyle: React.CSSProperties = { background: "var(--t-input-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" };

function CaptureDrawer({ kind, profiles, presetProfileId, onClose, onSaved }: {
  kind: "profile" | "capture";
  profiles: CompetitorProfileDTO[];
  presetProfileId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({
    competitor_profile_id: presetProfileId ?? profiles[0]?.id ?? "",
    capture_type: "hook",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const url = kind === "profile" ? "/api/core/competitor-profiles" : "/api/core/competitor-captures";
      const body: Record<string, unknown> = { ...form };
      if (kind === "profile" && form.social_links) body.social_links = form.social_links.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? `Failed (${res.status})`);
        return;
      }
      onSaved();
    } catch {
      setError("Request failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: "rgba(5,7,11,0.6)" }} onClick={onClose} />
      <div className="relative h-full w-full max-w-[480px] overflow-y-auto" style={{ background: "var(--t-bg)", borderLeft: "1px solid var(--t-border)" }}>
        <div className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between" style={{ background: "var(--t-bg)", borderBottom: "1px solid var(--t-border-subtle)" }}>
          <h3 className="text-[15px] font-bold" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color: "var(--t-text)" }}>
            {kind === "profile" ? "Add competitor" : "Capture intelligence"}
          </h3>
          <button onClick={onClose} aria-label="Close" style={{ color: "var(--t-muted)" }}><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {kind === "profile" ? (
            <>
              <Field label="Competitor name *"><input className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Website"><input className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://…" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Market / niche"><input className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.market_niche ?? ""} onChange={(e) => set("market_niche", e.target.value)} /></Field>
                <Field label="Service area"><input className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.service_area ?? ""} onChange={(e) => set("service_area", e.target.value)} /></Field>
              </div>
              <Field label="Offer notes"><textarea rows={2} className="w-full text-[13px] rounded-lg px-3 py-2 resize-none" style={inputStyle} value={form.offer_notes ?? ""} onChange={(e) => set("offer_notes", e.target.value)} /></Field>
              <Field label="Meta Ad Library URL"><input className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.meta_ad_library_url ?? ""} onChange={(e) => set("meta_ad_library_url", e.target.value)} placeholder="https://…" /></Field>
              <Field label="Google Business profile"><input className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.google_business_profile_url ?? ""} onChange={(e) => set("google_business_profile_url", e.target.value)} placeholder="https://…" /></Field>
              <Field label="Social links" hint="One per line or comma-separated (http/https only)"><textarea rows={2} className="w-full text-[13px] rounded-lg px-3 py-2 resize-none" style={inputStyle} value={form.social_links ?? ""} onChange={(e) => set("social_links", e.target.value)} /></Field>
              <Field label="Notes"><textarea rows={2} className="w-full text-[13px] rounded-lg px-3 py-2 resize-none" style={inputStyle} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>
            </>
          ) : (
            <>
              <Field label="Competitor *">
                <select className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.competitor_profile_id} onChange={(e) => set("competitor_profile_id", e.target.value)}>
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Capture type *">
                <select className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.capture_type} onChange={(e) => set("capture_type", e.target.value as CaptureType)}>
                  {CAPTURE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
              </Field>
              <Field label="Hook / angle"><input className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.hook ?? ""} onChange={(e) => set("hook", e.target.value)} /></Field>
              <Field label="Offer"><input className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.offer ?? ""} onChange={(e) => set("offer", e.target.value)} /></Field>
              <Field label="Ad copy"><textarea rows={2} className="w-full text-[13px] rounded-lg px-3 py-2 resize-none" style={inputStyle} value={form.ad_copy ?? ""} onChange={(e) => set("ad_copy", e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Landing page URL"><input className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.landing_page_url ?? ""} onChange={(e) => set("landing_page_url", e.target.value)} placeholder="https://…" /></Field>
                <Field label="Screenshot URL"><input className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.screenshot_url ?? ""} onChange={(e) => set("screenshot_url", e.target.value)} placeholder="https://…" /></Field>
              </div>
              <Field label="Pricing / positioning notes"><textarea rows={2} className="w-full text-[13px] rounded-lg px-3 py-2 resize-none" style={inputStyle} value={form.pricing_positioning_notes ?? ""} onChange={(e) => set("pricing_positioning_notes", e.target.value)} /></Field>
              <Field label="Creative pattern"><input className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.creative_pattern ?? ""} onChange={(e) => set("creative_pattern", e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Source URL"><input className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.source_url ?? ""} onChange={(e) => set("source_url", e.target.value)} placeholder="https://…" /></Field>
                <Field label="Observed date"><input type="date" className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.observed_at ?? ""} onChange={(e) => set("observed_at", e.target.value)} /></Field>
              </div>
              <Field label="Confidence (0–1)"><input type="number" min={0} max={1} step={0.1} className="w-full text-[13px] rounded-lg px-3 py-2" style={inputStyle} value={form.confidence ?? "0.5"} onChange={(e) => set("confidence", e.target.value)} /></Field>
              <Field label="Notes"><textarea rows={2} className="w-full text-[13px] rounded-lg px-3 py-2 resize-none" style={inputStyle} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>
            </>
          )}

          {error && <p className="text-[11.5px] px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}><AlertTriangle size={11} className="inline mr-1" />{error}</p>}

          <div className="flex gap-2 pt-1">
            <VCButton onClick={submit} disabled={saving || (kind === "profile" ? !form.name : !form.competitor_profile_id)}>{saving ? "Saving…" : "Save"}</VCButton>
            <VCButton onClick={onClose} variant="ghost">Cancel</VCButton>
          </div>
          <p className="text-[10px]" style={{ color: "var(--t-dim)" }}>Manual internal record only. No scraping, no external calls — only http/https URLs are stored.</p>
        </div>
      </div>
    </div>
  );
}
