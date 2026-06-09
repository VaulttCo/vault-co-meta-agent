"use client";

// Vault Core — Content Ideas + Creative Brief Builder, DRAFT MODE (Phase 9.7).
//
// Agents prepare content ideas / ad creative briefs / scripts / hooks / shot lists; humans
// review/approve them INSIDE Vault Core. Nothing here posts, publishes, uploads, schedules,
// or launches — there is no live content adapter. No "Post"/"Publish"/"Upload"/"Schedule"/
// "Boost"/"Launch Ad" controls exist. No raw provider payloads, credentials, live social/ad
// IDs, or raw creator/contact PII are shown.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clapperboard, X, Lock, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, RotateCcw, Archive,
  Target, Users, Sparkles, FileText, ListVideo, Scissors, Palette, MessageSquare, ImageIcon,
  Package, FileWarning, Lightbulb, Radar,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  VCPageWrapper, VCPanel, VCPanelHeader, VCStatusBadge, VCChip, VCEmptyState, VCSkeleton, VCButton,
} from "@/components/ui/VaultUI";
import { useAuth } from "@/components/AuthProvider";
import { CREATIVE_TEMPLATES } from "@/lib/core/creative-briefs/templates";
import type { VaultCreativeBriefDTO, BriefStatus } from "@/lib/core/creative-briefs/types";

const STATUS_META: Record<BriefStatus, { label: string; variant: "success" | "blue" | "orange" | "neutral" | "danger" | "gold" }> = {
  draft: { label: "Draft", variant: "neutral" },
  pending_review: { label: "Pending review", variant: "blue" },
  approved_internal: { label: "Approved (internal)", variant: "success" },
  needs_revision: { label: "Needs revision", variant: "orange" },
  rejected: { label: "Rejected", variant: "danger" },
  archived: { label: "Archived", variant: "neutral" },
  future_adapter_required: { label: "Approved (internal)", variant: "gold" },
};

const FILTERS: Array<{ key: BriefStatus | "all"; label: string }> = [
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
function statusMeta(s: BriefStatus) { return STATUS_META[s] ?? STATUS_META.draft; }
function titleCase(s: string) { return s.replace(/_/g, " "); }

export function CreativeBriefs() {
  const { user } = useAuth();
  const canReview = !!user && (user.role === "admin" || user.role === "media_buyer");
  const canApprove = !!user && user.role === "admin";

  const [briefs, setBriefs] = useState<VaultCreativeBriefDTO[]>([]);
  const [filter, setFilter] = useState<BriefStatus | "all">("pending_review");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/core/creative-briefs").catch(() => null);
    if (!res) { setLoading(false); return; }
    if (!res.ok) { if (res.status === 401 || res.status === 403) setForbidden(true); setLoading(false); return; }
    const d = await res.json().catch(() => null);
    setBriefs(Array.isArray(d?.briefs) ? d.briefs : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/core/creative-briefs")
      .then((r) => (r.ok ? r.json().catch(() => null) : Promise.reject(r.status)))
      .then((d) => { if (cancelled) return; setBriefs(Array.isArray(d?.briefs) ? d.briefs : []); setLoading(false); })
      .catch((s) => { if (cancelled) return; if (s === 401 || s === 403) setForbidden(true); setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => briefs.filter((d) => filter === "all" || d.status === filter), [briefs, filter]);
  const selected = selectedId ? briefs.find((d) => d.id === selectedId) ?? null : null;
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    let missing = 0;
    for (const d of briefs) { c[d.status] = (c[d.status] ?? 0) + 1; if (d.missing_inputs_count > 0) missing += 1; }
    c.__missing = missing;
    return c;
  }, [briefs]);

  const createFromTemplate = useCallback(async (templateKey: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch("/api/core/creative-briefs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template_key: templateKey }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not create brief"); return; }
      setNotice("Creative brief created — review it in the queue.");
      await load();
    } finally { setActing(false); }
  }, [load]);

  const review = useCallback(async (id: string, action: string, notes?: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/creative-briefs/${id}/review`, {
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
        <PageHeader sectionLabel="Vault Core" title="Creative Briefs" />
        <VCPanel><VCEmptyState icon={Lock} title="Access restricted" description="You don't have access to the creative brief console." /></VCPanel>
      </VCPageWrapper>
    );
  }

  const pending = counts.pending_review ?? 0;
  const approved = counts.future_adapter_required ?? 0;
  const missingCount = counts.__missing ?? 0;

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · Vault Co Content Engine"
        title="Creative Briefs"
        description="Briefs for Vault Co's OWN content engine — founder-led content, Vault Co's own ad creative, market research, competitor response, and brand. Not client content deliverables. You review and approve internally. Nothing is posted, published, uploaded, or launched — draft-only."
        badge={<VCStatusBadge label="Draft mode" variant="gold" dot />}
      />

      {/* Future content adapter disabled notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.28)" }}>
        <ShieldAlert size={16} style={{ color: "#c9a84c", marginTop: 1 }} />
        <div>
          <p className="text-[12.5px] font-semibold" style={{ color: "#e8c97a" }}>Content publishing is disabled (future adapter required)</p>
          <p className="text-[11.5px] mt-0.5" style={{ color: "var(--t-text-body)" }}>
            These are internal plans for Vault Co&apos;s own content engine. Nothing is posted to a social platform, no video/image is uploaded, no post is scheduled, no Meta ad is launched, and no social/Meta API is called. Producing or publishing requires a separate, explicitly-approved future content adapter phase.
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
        <MiniStat label="Templates" value={CREATIVE_TEMPLATES.length} color="#a78bfa" />
      </div>

      {/* Template library */}
      <VCPanel>
        <VCPanelHeader icon={Lightbulb} label="Starter briefs" title="Template Library" />
        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {CREATIVE_TEMPLATES.map((t) => (
            <div key={t.key} className="flex flex-col gap-2 px-3.5 py-3 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><Clapperboard size={13} style={{ color: "#22d3ee" }} /> {t.title}</p>
                <VCChip label={titleCase(t.brief_type)} color="#6b7a99" />
              </div>
              <p className="text-[11.5px] leading-snug line-clamp-2" style={{ color: "var(--t-text-body)" }}>{t.objective}</p>
              <div className="flex items-center justify-between mt-1">
                <VCChip label={t.platform} color="#a78bfa" />
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

      {/* Creative brief queue */}
      <VCPanel>
        <VCPanelHeader icon={Clapperboard} label="Brief queue" title="Creative Brief Queue" live />
        <div className="px-4 py-3 space-y-2.5">
          {loading && <VCSkeleton rows={3} />}
          {!loading && visible.length === 0 && (
            <VCEmptyState icon={Lightbulb} title="No creative briefs in this view" description="Create one from a template above (Vault Co's own founder-led / ad / market-research / competitor-response content), from an approved content/competitor/campaign action in /actions, from a Meta campaign draft, or from competitor intel. Briefs are internal planning artifacts — nothing is posted or published." />
          )}
          {visible.map((d) => (
            <button key={d.id} onClick={() => { setSelectedId(d.id); setNotice(null); }}
              className="w-full text-left px-4 py-3 rounded-xl transition-all"
              style={{ background: selectedId === d.id ? "rgba(0,129,242,0.06)" : "var(--t-surface-2)", border: `1px solid ${selectedId === d.id ? "rgba(0,129,242,0.3)" : "var(--t-border-subtle)"}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><Clapperboard size={13} style={{ color: "#22d3ee" }} /> {d.title}</p>
                  <p className="text-[12px] mt-0.5 leading-snug line-clamp-2" style={{ color: "var(--t-text-body)" }}>{d.objective}</p>
                </div>
                <VCStatusBadge label={statusMeta(d.status).label} variant={statusMeta(d.status).variant} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <VCChip label={titleCase(d.brief_type)} color="#a78bfa" />
                <VCChip label={d.platform} color="#0081f2" />
                <VCChip label={titleCase(d.content_format)} color="#22d3ee" />
                <VCChip label={titleCase(d.risk_level)} color="#c9a84c" />
                {d.source_agent && <VCChip label={d.source_agent} color="#22d3ee" />}
                {d.client_id && <VCChip label={d.client_id} color="#0081f2" />}
                <VCChip label={`${d.deliverable_count} deliverable${d.deliverable_count === 1 ? "" : "s"}`} color="#6b7a99" />
                {d.missing_inputs_count > 0 && <VCChip label={`${d.missing_inputs_count} missing`} color="#f59e0b" />}
                <VCChip label="content adapter off" color="#c9a84c" />
                <span className="text-[10.5px] ml-auto" style={{ color: "var(--t-dim)" }}>{timeAgo(d.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      </VCPanel>

      {selected && (
        <BriefDetail
          key={`${selected.id}:${selected.updated_at}`}
          brief={selected} canReview={canReview} canApprove={canApprove} acting={acting} notice={notice}
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

function Chips({ items, color }: { items: string[]; color: string }) {
  return <div className="flex flex-wrap gap-1.5">{items.map((x, i) => <VCChip key={i} label={x} color={color} />)}</div>;
}

function BriefDetail({ brief: d, canReview, canApprove, acting, notice, onReview, onClose }: {
  brief: VaultCreativeBriefDTO; canReview: boolean; canApprove: boolean; acting: boolean; notice: string | null;
  onReview: (action: string, notes?: string) => void; onClose: () => void;
}) {
  const [reviewMode, setReviewMode] = useState<null | "reject" | "request_revision">(null);
  const [reason, setReason] = useState("");
  const reviewable = !["rejected", "archived"].includes(d.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: "rgba(5,7,11,0.6)" }} onClick={onClose} />
      <div className="relative h-full w-full max-w-[640px] overflow-y-auto" style={{ background: "var(--t-bg)", borderLeft: "1px solid var(--t-border)" }}>
        <div className="sticky top-0 z-10 px-6 py-4 flex items-start justify-between gap-3" style={{ background: "var(--t-bg)", borderBottom: "1px solid var(--t-border-subtle)" }}>
          <div className="min-w-0">
            <p className="vc-label mb-1 flex items-center gap-1.5"><Clapperboard size={12} /> {titleCase(d.brief_type)} · {d.platform} · {titleCase(d.content_format)}{d.source_agent ? ` · ${d.source_agent}` : ""}</p>
            <h3 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color: "var(--t-text)" }}>{d.title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ color: "var(--t-muted)" }}><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <VCStatusBadge label={statusMeta(d.status).label} variant={statusMeta(d.status).variant} dot />
            <VCChip label={titleCase(d.risk_level)} color="#c9a84c" />
            <VCChip label={`target: ${d.target_system}`} color="#0081f2" />
            <VCChip label="content adapter disabled" color="#c9a84c" />
            {d.client_id && <VCChip label={`client: ${d.client_id}`} color="#0081f2" />}
          </div>

          {/* Future content disabled */}
          <div className="px-3.5 py-3 rounded-xl flex items-center gap-2" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.28)" }}>
            <ShieldAlert size={14} style={{ color: "#c9a84c" }} />
            <span className="text-[12px] font-semibold" style={{ color: "#e8c97a" }}>Draft-only · producing/publishing requires a future approved adapter</span>
          </div>

          {d.description && <p className="text-[12.5px]" style={{ color: "var(--t-text-body)" }}>{d.description}</p>}

          {/* Objective */}
          <Section icon={Target} title="Objective" color="#4da6ff">
            <div className="px-3.5 py-3 rounded-xl" style={{ background: "rgba(0,129,242,0.05)", border: "1px solid rgba(0,129,242,0.18)" }}>
              <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>{d.objective}</p>
            </div>
          </Section>

          {/* Audience */}
          {d.audience && (
            <Section icon={Users} title="Audience"><p className="text-[12.5px]" style={{ color: "var(--t-text-body)" }}>{d.audience}</p></Section>
          )}

          {/* Hook bank panel */}
          {d.hook_bank.length > 0 && (
            <Section icon={Sparkles} title={`Hook bank (${d.hook_bank.length})`} color="#22d3ee">
              <div className="px-3.5 py-3 rounded-xl space-y-1.5" style={{ background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.18)" }}>
                <List items={d.hook_bank} />
              </div>
            </Section>
          )}

          {/* Script panel */}
          {d.script && (
            <Section icon={FileText} title="Script">
              <div className="px-3.5 py-3 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--t-text-body)" }}>{d.script}</p>
              </div>
            </Section>
          )}

          {/* Shot list panel */}
          {d.shot_list.length > 0 && (
            <Section icon={ListVideo} title={`Shot list (${d.shot_list.length})`}><List items={d.shot_list} /></Section>
          )}

          {/* Editor notes panel */}
          {d.editor_notes && (
            <Section icon={Scissors} title="Editor notes">
              <div className="px-3.5 py-3 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--t-text-body)" }}>{d.editor_notes}</p>
              </div>
            </Section>
          )}

          {/* Visual direction */}
          {d.visual_direction.length > 0 && (
            <Section icon={Palette} title="Visual direction"><List items={d.visual_direction} /></Section>
          )}

          {/* Caption options */}
          {d.caption_options.length > 0 && (
            <Section icon={MessageSquare} title="Caption options"><List items={d.caption_options} /></Section>
          )}

          {/* Thumbnail concepts */}
          {d.thumbnail_concepts.length > 0 && (
            <Section icon={ImageIcon} title="Thumbnail concepts"><Chips items={d.thumbnail_concepts} color="#a78bfa" /></Section>
          )}

          {/* Deliverables */}
          {d.deliverables.length > 0 && (
            <Section icon={Package} title={`Deliverables (${d.deliverables.length})`}><List items={d.deliverables} /></Section>
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
          {(d.source_action_id || d.source_meta_campaign_draft_id || d.source_competitor_profile_id) && (
            <p className="text-[11.5px] flex flex-wrap items-center gap-2" style={{ color: "var(--t-muted)" }}>
              {d.source_action_id && (
                <span className="inline-flex items-center gap-1.5">
                  Action <span style={{ color: "#22d3ee" }}>{d.source_action_id.slice(0, 8)}…</span>
                  <a href="/actions" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "rgba(0,129,242,0.1)", border: "1px solid rgba(0,129,242,0.3)", color: "#4da6ff" }}>Link to Action</a>
                </span>
              )}
              {d.source_meta_campaign_draft_id && (
                <span className="inline-flex items-center gap-1.5">
                  <Target size={12} /> Campaign <span style={{ color: "#22d3ee" }}>{d.source_meta_campaign_draft_id.slice(0, 8)}…</span>
                  <a href="/meta-campaign-drafts" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "rgba(0,129,242,0.1)", border: "1px solid rgba(0,129,242,0.3)", color: "#4da6ff" }}>Link to Meta Campaign Draft</a>
                </span>
              )}
              {d.source_competitor_profile_id && (
                <span className="inline-flex items-center gap-1.5">
                  <Radar size={12} /> Competitor intel
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
                    {reviewMode === "reject" ? "Reject brief" : "Request a revision"} — a reason is required
                  </p>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    placeholder={reviewMode === "reject" ? "Why is this brief being rejected?" : "What should change before this brief can be approved?"}
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
            Approving internally does NOT post, publish, upload, schedule, or launch anything. It records that the brief is approved inside Vault Core; a future approved content adapter would be required to produce/publish it. Nothing is posted, uploaded, or launched, and no social/Meta system is touched.
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
