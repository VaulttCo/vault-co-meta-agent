"use client";

// Vault Core — Meta Campaign Action Builder, DRAFT MODE (Phase 9.5).
//
// Agents prepare structured Meta campaign PLANS; humans review/approve them INSIDE Vault
// Core. Nothing here launches a campaign, changes a budget, or creates an ad set/ad/lead
// form — there is no live Meta adapter. No "Launch"/"Publish"/"Push Live"/"Update Budget"/
// "Create Ad Set" controls exist. No raw provider payloads, credentials, or live Meta IDs
// are shown.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Megaphone, X, Lock, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, RotateCcw, Archive,
  Target, Users, Layers, Palette, FileText, ListChecks, DollarSign, FileWarning, Lightbulb,
  Radar, ClipboardCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  VCPageWrapper, VCPanel, VCPanelHeader, VCStatusBadge, VCChip, VCEmptyState, VCSkeleton, VCButton,
} from "@/components/ui/VaultUI";
import { useAuth } from "@/components/AuthProvider";
import { CAMPAIGN_TEMPLATES } from "@/lib/core/campaign-drafts/templates";
import type { VaultMetaCampaignDraftDTO, CampaignStatus } from "@/lib/core/campaign-drafts/types";

const STATUS_META: Record<CampaignStatus, { label: string; variant: "success" | "blue" | "orange" | "neutral" | "danger" | "gold" }> = {
  draft: { label: "Draft", variant: "neutral" },
  pending_review: { label: "Pending review", variant: "blue" },
  approved_internal: { label: "Approved (internal)", variant: "success" },
  needs_revision: { label: "Needs revision", variant: "orange" },
  rejected: { label: "Rejected", variant: "danger" },
  archived: { label: "Archived", variant: "neutral" },
  future_adapter_required: { label: "Approved (internal)", variant: "gold" },
};

const FILTERS: Array<{ key: CampaignStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending_review", label: "Pending" },
  { key: "future_adapter_required", label: "Approved (internal)" },
  { key: "needs_revision", label: "Revision" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
];

function timeAgo(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string") return "Unknown";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Unknown";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function statusMeta(s: CampaignStatus) { return STATUS_META[s] ?? STATUS_META.draft; }
function titleCase(s: string) { return s.replace(/_/g, " "); }

export function MetaCampaignDrafts() {
  const { user } = useAuth();
  const canReview = !!user && (user.role === "admin" || user.role === "media_buyer");
  const canApprove = !!user && user.role === "admin";

  const [drafts, setDrafts] = useState<VaultMetaCampaignDraftDTO[]>([]);
  const [filter, setFilter] = useState<CampaignStatus | "all">("pending_review");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/core/meta-campaign-drafts").catch(() => null);
    if (!res) { setLoading(false); return; }
    if (!res.ok) { if (res.status === 401 || res.status === 403) setForbidden(true); setLoading(false); return; }
    const d = await res.json().catch(() => null);
    setDrafts(Array.isArray(d?.drafts) ? d.drafts : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/core/meta-campaign-drafts")
      .then((r) => (r.ok ? r.json().catch(() => null) : Promise.reject(r.status)))
      .then((d) => { if (cancelled) return; setDrafts(Array.isArray(d?.drafts) ? d.drafts : []); setLoading(false); })
      .catch((s) => { if (cancelled) return; if (s === 401 || s === 403) setForbidden(true); setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => drafts.filter((d) => filter === "all" || d.status === filter), [drafts, filter]);
  const selected = selectedId ? drafts.find((d) => d.id === selectedId) ?? null : null;
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    let missing = 0;
    for (const d of drafts) { c[d.status] = (c[d.status] ?? 0) + 1; if (d.missing_inputs_count > 0) missing += 1; }
    c.__missing = missing;
    return c;
  }, [drafts]);

  const createFromTemplate = useCallback(async (templateKey: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch("/api/core/meta-campaign-drafts", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template_key: templateKey }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not create draft"); return; }
      setNotice("Campaign draft created — review it in the queue.");
      await load();
    } finally { setActing(false); }
  }, [load]);

  const review = useCallback(async (id: string, action: string, notes?: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/meta-campaign-drafts/${id}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, notes }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Review failed"); return; }
      await load();
    } finally { setActing(false); }
  }, [load]);

  if (forbidden) {
    return (
      <VCPageWrapper>
        <PageHeader sectionLabel="Vault Core" title="Meta Campaign Drafts" />
        <VCPanel><VCEmptyState icon={Lock} title="Access restricted" description="You don't have access to the Meta campaign drafting console." /></VCPanel>
      </VCPageWrapper>
    );
  }

  const pending = counts.pending_review ?? 0;
  const approved = counts.future_adapter_required ?? 0;
  const missingCount = counts.__missing ?? 0;

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · Vault Co Client-Acquisition Ads"
        title="Meta Campaign Drafts"
        description="Plans for Vault Co's OWN Meta ads — acquiring agency clients (roofing & home-service business owners), not client roofing campaigns. You review and approve internally. Nothing is launched, no budget is changed, no Meta object is created — draft-only."
        badge={<VCStatusBadge label="Draft mode" variant="gold" dot />}
      />

      {/* Future Meta adapter disabled notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.28)" }}>
        <ShieldAlert size={16} style={{ color: "#c9a84c", marginTop: 1 }} />
        <div>
          <p className="text-[12.5px] font-semibold" style={{ color: "#e8c97a" }}>Meta campaign execution is disabled (future adapter required)</p>
          <p className="text-[11.5px] mt-0.5" style={{ color: "var(--t-text-body)" }}>
            These are internal plans for Vault Co&apos;s own client-acquisition ads. No campaign is launched, no budget is changed, no ad set / ad / lead form is created, and no Meta API is called. Building anything live requires a separate, explicitly-approved future Meta adapter phase.
          </p>
        </div>
      </div>

      {/* Executive summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        <MiniStat label="Pending review" value={pending} color="#0081f2" />
        <MiniStat label="Approved (internal)" value={approved} color="#22c55e" />
        <MiniStat label="Needs revision" value={counts.needs_revision ?? 0} color="#f59e0b" />
        <MiniStat label="With missing inputs" value={missingCount} color="#f59e0b" />
        <MiniStat label="Rejected" value={counts.rejected ?? 0} color="#ef4444" />
        <MiniStat label="Templates" value={CAMPAIGN_TEMPLATES.length} color="#a78bfa" />
      </div>

      {/* Template library */}
      <VCPanel>
        <VCPanelHeader icon={Lightbulb} label="Starter campaigns" title="Template Library" />
        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {CAMPAIGN_TEMPLATES.map((t) => (
            <div key={t.key} className="flex flex-col gap-2 px-3.5 py-3 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><Megaphone size={13} style={{ color: "#22d3ee" }} /> {t.title}</p>
                <VCChip label={titleCase(t.campaign_type)} color="#6b7a99" />
              </div>
              <p className="text-[11.5px] leading-snug line-clamp-2" style={{ color: "var(--t-text-body)" }}>{t.objective}</p>
              <div className="flex items-center justify-between mt-1">
                <VCChip label={`${t.ad_sets.length} ad set${t.ad_sets.length === 1 ? "" : "s"}`} color="#a78bfa" />
                <VCButton onClick={() => createFromTemplate(t.key)} disabled={acting}>Create From Template</VCButton>
              </div>
            </div>
          ))}
        </div>
      </VCPanel>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={active
                ? { background: "rgba(0,129,242,0.14)", border: "1px solid rgba(0,129,242,0.3)", color: "#f8f8f7" }
                : { background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)", color: "var(--t-muted)" }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Campaign draft queue */}
      <VCPanel>
        <VCPanelHeader icon={Megaphone} label="Draft queue" title="Campaign Draft Queue" live />
        <div className="px-4 py-3 space-y-2.5">
          {loading && <VCSkeleton rows={3} />}
          {!loading && visible.length === 0 && (
            <VCEmptyState icon={Lightbulb} title="No campaign drafts in this view" description="Create one from a template above (Vault Co's own client-acquisition ads targeting roofing/home-service owners), from an approved Meta campaign action in /actions, or from internal competitor intel. Drafts are internal planning artifacts — nothing is launched." />
          )}
          {visible.map((d) => (
            <button key={d.id} onClick={() => { setSelectedId(d.id); setNotice(null); }}
              className="w-full text-left px-4 py-3 rounded-xl transition-all"
              style={{ background: selectedId === d.id ? "rgba(0,129,242,0.06)" : "var(--t-surface-2)", border: `1px solid ${selectedId === d.id ? "rgba(0,129,242,0.3)" : "var(--t-border-subtle)"}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><Megaphone size={13} style={{ color: "#22d3ee" }} /> {d.title}</p>
                  <p className="text-[12px] mt-0.5 leading-snug line-clamp-2" style={{ color: "var(--t-text-body)" }}>{d.objective}</p>
                </div>
                <VCStatusBadge label={statusMeta(d.status).label} variant={statusMeta(d.status).variant} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <VCChip label={titleCase(d.campaign_type)} color="#a78bfa" />
                <VCChip label="meta" color="#0081f2" />
                <VCChip label={titleCase(d.risk_level)} color="#c9a84c" />
                {d.source_agent && <VCChip label={d.source_agent} color="#22d3ee" />}
                {d.client_id && <VCChip label={d.client_id} color="#0081f2" />}
                <VCChip label={`${d.ad_set_count} ad set${d.ad_set_count === 1 ? "" : "s"}`} color="#6b7a99" />
                {d.missing_inputs_count > 0 && <VCChip label={`${d.missing_inputs_count} missing`} color="#f59e0b" />}
                <VCChip label="meta adapter off" color="#c9a84c" />
                <span className="text-[10.5px] ml-auto" style={{ color: "var(--t-dim)" }}>{timeAgo(d.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      </VCPanel>

      {selected && (
        <CampaignDetail
          key={`${selected.id}:${selected.updated_at}`}
          draft={selected} canReview={canReview} canApprove={canApprove} acting={acting} notice={notice}
          onReview={(act, notes) => review(selected.id, act, notes)}
          onClose={() => { setSelectedId(null); setNotice(null); }}
        />
      )}
    </VCPageWrapper>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="px-3 py-2.5 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
      <div className="text-[20px] font-bold leading-none" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color: value > 0 ? color : "var(--t-dim)" }}>{value}</div>
      <div className="text-[10px] mt-1" style={{ color: "var(--t-dim)" }}>{label}</div>
    </div>
  );
}

function Section({ icon: Icon, title, color, children }: { icon: typeof Target; title: string; color?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="vc-label mb-1.5 flex items-center gap-1.5" style={color ? { color } : undefined}><Icon size={12} /> {title}</p>
      {children}
    </div>
  );
}

function List({ items, color }: { items: string[]; color?: string }) {
  return (
    <ul className="space-y-1 text-[12px]" style={{ color: color ?? "var(--t-text-body)" }}>
      {items.map((x, i) => <li key={i}>· {x}</li>)}
    </ul>
  );
}

function CampaignDetail({ draft: d, canReview, canApprove, acting, notice, onReview, onClose }: {
  draft: VaultMetaCampaignDraftDTO; canReview: boolean; canApprove: boolean; acting: boolean; notice: string | null;
  onReview: (action: string, notes?: string) => void; onClose: () => void;
}) {
  const [reviewMode, setReviewMode] = useState<null | "reject" | "request_revision">(null);
  const [reason, setReason] = useState("");
  const reviewable = !["rejected", "archived"].includes(d.status);
  const aud = d.audience;
  const copy = d.ad_copy;
  const form = d.lead_form;
  const budget = d.budget_recommendation;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: "rgba(5,7,11,0.6)" }} onClick={onClose} />
      <div className="relative h-full w-full max-w-[620px] overflow-y-auto" style={{ background: "var(--t-bg)", borderLeft: "1px solid var(--t-border)" }}>
        <div className="sticky top-0 z-10 px-6 py-4 flex items-start justify-between gap-3" style={{ background: "var(--t-bg)", borderBottom: "1px solid var(--t-border-subtle)" }}>
          <div className="min-w-0">
            <p className="vc-label mb-1 flex items-center gap-1.5"><Megaphone size={12} /> {titleCase(d.campaign_type)} · meta{d.source_agent ? ` · ${d.source_agent}` : ""}</p>
            <h3 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color: "var(--t-text)" }}>{d.title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ color: "var(--t-muted)" }}><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <VCStatusBadge label={statusMeta(d.status).label} variant={statusMeta(d.status).variant} dot />
            <VCChip label={titleCase(d.risk_level)} color="#c9a84c" />
            <VCChip label="meta adapter disabled" color="#c9a84c" />
            {d.client_id && <VCChip label={`client: ${d.client_id}`} color="#0081f2" />}
          </div>

          {/* Future Meta disabled */}
          <div className="px-3.5 py-3 rounded-xl flex items-center gap-2" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.28)" }}>
            <ShieldAlert size={14} style={{ color: "#c9a84c" }} />
            <span className="text-[12px] font-semibold" style={{ color: "#e8c97a" }}>Draft-only · launching requires a future approved Meta adapter</span>
          </div>

          {d.description && <p className="text-[12.5px]" style={{ color: "var(--t-text-body)" }}>{d.description}</p>}

          {/* Objective */}
          <Section icon={Target} title="Objective" color="#4da6ff">
            <div className="px-3.5 py-3 rounded-xl" style={{ background: "rgba(0,129,242,0.05)", border: "1px solid rgba(0,129,242,0.18)" }}>
              <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>{d.objective}</p>
            </div>
          </Section>

          {/* Offer angle */}
          {d.offer_angle && (
            <Section icon={Lightbulb} title="Offer angle">
              <p className="text-[12.5px]" style={{ color: "var(--t-text-body)" }}>{d.offer_angle}</p>
            </Section>
          )}

          {/* Audience */}
          {(aud.description || aud.geo || aud.age_range || aud.interests.length > 0 || aud.exclusions.length > 0) && (
            <Section icon={Users} title="Audience targeting">
              <div className="space-y-1.5 text-[12px]" style={{ color: "var(--t-text-body)" }}>
                {aud.description && <p>{aud.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {aud.geo && <VCChip label={`geo: ${aud.geo}`} color="#0081f2" />}
                  {aud.age_range && <VCChip label={`age: ${aud.age_range}`} color="#0081f2" />}
                  {aud.interests.map((x, i) => <VCChip key={`i${i}`} label={x} color="#22d3ee" />)}
                  {aud.exclusions.map((x, i) => <VCChip key={`e${i}`} label={`exclude: ${x}`} color="#6b7a99" />)}
                </div>
              </div>
            </Section>
          )}

          {/* Ad set structure */}
          {d.ad_sets.length > 0 && (
            <Section icon={Layers} title={`Ad set structure (${d.ad_sets.length})`}>
              <div className="space-y-2">
                {d.ad_sets.map((s, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                    <p className="text-[12.5px] font-semibold" style={{ color: "var(--t-text)" }}>{s.name}</p>
                    {s.audience_summary && <p className="text-[11.5px]" style={{ color: "var(--t-text-body)" }}>Audience: {s.audience_summary}</p>}
                    {s.placement && <p className="text-[11.5px]" style={{ color: "var(--t-muted)" }}>Placement: {s.placement}</p>}
                    {s.notes && <p className="text-[11px]" style={{ color: "var(--t-dim)" }}>{s.notes}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Creative direction */}
          {d.creative_direction.length > 0 && (
            <Section icon={Palette} title="Creative direction"><List items={d.creative_direction} /></Section>
          )}

          {/* Ad copy */}
          {(copy.primary_texts.length > 0 || copy.headlines.length > 0 || copy.descriptions.length > 0) && (
            <Section icon={FileText} title="Ad copy">
              <div className="space-y-2.5">
                {copy.primary_texts.length > 0 && (
                  <div className="px-3.5 py-3 rounded-xl" style={{ background: "rgba(0,129,242,0.05)", border: "1px solid rgba(0,129,242,0.18)" }}>
                    <p className="vc-label mb-1" style={{ color: "#4da6ff" }}>Primary text</p>
                    {copy.primary_texts.map((t, i) => <p key={i} className="text-[12.5px] leading-relaxed mb-1.5 whitespace-pre-wrap" style={{ color: "var(--t-text-body)" }}>{t}</p>)}
                  </div>
                )}
                {copy.headlines.length > 0 && (
                  <div><p className="vc-label mb-1">Headlines</p><div className="flex flex-wrap gap-1.5">{copy.headlines.map((h, i) => <VCChip key={i} label={h} color="#a78bfa" />)}</div></div>
                )}
                {copy.descriptions.length > 0 && (
                  <div><p className="vc-label mb-1">Descriptions</p><List items={copy.descriptions} /></div>
                )}
              </div>
            </Section>
          )}

          {/* Lead form draft */}
          {(form.intro || form.questions.length > 0 || form.privacy_note) && (
            <Section icon={ClipboardCheck} title="Lead form draft">
              <div className="px-3.5 py-3 rounded-xl space-y-1.5" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                {form.intro && <p className="text-[12px]" style={{ color: "var(--t-text-body)" }}>{form.intro}</p>}
                {form.questions.length > 0 && <List items={form.questions} />}
                {form.privacy_note && <p className="text-[11px]" style={{ color: "#c9a84c" }}>{form.privacy_note}</p>}
              </div>
            </Section>
          )}

          {/* Budget recommendation */}
          {(budget.recommended_daily || budget.recommended_total || budget.pacing_notes || budget.notes) && (
            <Section icon={DollarSign} title="Budget recommendation (internal advisory only)" color="#22c55e">
              <div className="px-3.5 py-3 rounded-xl space-y-1 text-[12px]" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", color: "var(--t-text-body)" }}>
                {budget.recommended_daily && <p>Daily: {budget.recommended_daily}</p>}
                {budget.recommended_total && <p>Total: {budget.recommended_total}</p>}
                {budget.pacing_notes && <p style={{ color: "var(--t-muted)" }}>{budget.pacing_notes}</p>}
                <p className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>Advisory only — this is never a live budget change. A human applies budgets later via Meta directly.</p>
              </div>
            </Section>
          )}

          {/* Launch checklist */}
          {d.launch_checklist.length > 0 && (
            <Section icon={ListChecks} title="Launch checklist (pre-build, human-run)">
              <List items={d.launch_checklist} />
            </Section>
          )}

          {/* Missing inputs panel */}
          {d.missing_inputs.length > 0 && (
            <div className="px-3.5 py-3 rounded-xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <p className="vc-label mb-1 flex items-center gap-1.5" style={{ color: "#f59e0b" }}><FileWarning size={12} /> Missing inputs ({d.missing_inputs.length})</p>
              <List items={d.missing_inputs} />
            </div>
          )}

          {/* Compliance notes panel */}
          {d.compliance_notes.length > 0 && (
            <div className="px-3.5 py-3 rounded-xl" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.25)" }}>
              <p className="vc-label mb-1 flex items-center gap-1.5" style={{ color: "#c9a84c" }}><ShieldCheck size={12} /> Compliance notes ({d.compliance_notes.length})</p>
              <List items={d.compliance_notes} />
            </div>
          )}

          {/* Evidence */}
          {d.evidence.items.length > 0 && (
            <Section icon={FileText} title="Evidence"><List items={d.evidence.items} /></Section>
          )}

          {/* Source links */}
          {(d.source_action_id || d.source_competitor_profile_id) && (
            <p className="text-[11.5px] flex flex-wrap items-center gap-2" style={{ color: "var(--t-muted)" }}>
              {d.source_action_id && (
                <span className="inline-flex items-center gap-1.5">
                  Linked to action <span style={{ color: "#22d3ee" }}>{d.source_action_id.slice(0, 8)}…</span>
                  <a href="/actions" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "rgba(0,129,242,0.1)", border: "1px solid rgba(0,129,242,0.3)", color: "#4da6ff" }}>Link to Action</a>
                </span>
              )}
              {d.source_competitor_profile_id && (
                <span className="inline-flex items-center gap-1.5">
                  <Radar size={12} /> From competitor intel
                  <a href="/competitor-intel" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.3)", color: "#fb923c" }}>Link to Competitor Intel</a>
                </span>
              )}
            </p>
          )}

          {/* Human review status / trail */}
          {d.audit_log?.length > 0 && (
            <div>
              <p className="vc-label mb-2">Human Review Status</p>
              <div className="space-y-1.5">
                {d.audit_log.slice().reverse().map((e, i) => {
                  const transition = e.previous_status && e.next_status && e.previous_status !== e.next_status
                    ? `${String(e.previous_status).replace(/_/g, " ")} → ${String(e.next_status).replace(/_/g, " ")}` : null;
                  return (
                    <div key={i} className="px-3 py-1.5 rounded-lg text-[11.5px]" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                      <span className="font-semibold" style={{ color: "var(--t-text)" }}>{String(e.event).replace(/_/g, " ")}</span>
                      <span style={{ color: "var(--t-dim)" }}> · {e.actor} · {timeAgo(e.at)}</span>
                      {transition && <span style={{ color: "#4da6ff" }}> · {transition}</span>}
                      {(e.note ?? e.message) && <span style={{ color: "var(--t-muted)" }}> — {e.note ?? e.message}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Review controls */}
          {canReview && reviewable && (
            <div className="pt-2" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
              {reviewMode ? (
                <div className="mt-3 space-y-2.5 px-3 py-3 rounded-xl" style={{ background: reviewMode === "reject" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${reviewMode === "reject" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}` }}>
                  <p className="text-[12px] font-semibold" style={{ color: reviewMode === "reject" ? "#ef4444" : "#f59e0b" }}>
                    {reviewMode === "reject" ? "Reject draft" : "Request a revision"} — a reason is required
                  </p>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    placeholder={reviewMode === "reject" ? "Why is this draft being rejected?" : "What should change before this draft can be approved?"}
                    className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none resize-none" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
                  <div className="flex gap-2">
                    <VCButton onClick={() => { onReview(reviewMode, reason); setReviewMode(null); setReason(""); }} disabled={acting || !reason.trim()}>Confirm</VCButton>
                    <button onClick={() => { setReviewMode(null); setReason(""); }} disabled={acting} className="px-3 py-2 rounded-lg text-[12.5px] font-semibold disabled:opacity-50" style={{ color: "var(--t-muted)" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-3">
                  {canApprove && d.status !== "future_adapter_required" && (
                    <ActBtn icon={CheckCircle2} label="Approve Internally" tone="#22c55e" disabled={acting} onClick={() => onReview("approve_internal")} />
                  )}
                  <ActBtn icon={RotateCcw} label="Request Revision" tone="#f59e0b" disabled={acting} onClick={() => setReviewMode("request_revision")} />
                  <ActBtn icon={XCircle} label="Reject" tone="#ef4444" disabled={acting} onClick={() => setReviewMode("reject")} />
                  <ActBtn icon={Archive} label="Archive" tone="#6b7a99" disabled={acting} onClick={() => onReview("archive")} />
                </div>
              )}
              {!canApprove && (
                <p className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: "var(--t-muted)" }}><Lock size={12} /> Admin role required to approve internally.</p>
              )}
            </div>
          )}

          {notice && <p className="text-[11.5px] mt-1 px-3 py-2 rounded-lg" style={{ background: "rgba(255,132,0,0.08)", border: "1px solid rgba(255,132,0,0.2)", color: "#ff8400" }}>{notice}</p>}

          <p className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>
            Approving internally does NOT launch the campaign. It records that the plan is approved inside Vault Core; a future approved Meta adapter would be required to build anything live. Nothing is launched, no budget is changed, and no Meta object is created.
          </p>
        </div>
      </div>
    </div>
  );
}

function ActBtn({ icon: Icon, label, tone, disabled, onClick }: { icon: typeof CheckCircle2; label: string; tone: string; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-all disabled:opacity-50"
      style={{ background: `${tone}16`, border: `1px solid ${tone}3a`, color: tone }}>
      <Icon size={13} /> {label}
    </button>
  );
}
