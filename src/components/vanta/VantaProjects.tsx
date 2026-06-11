"use client";

// VANTA — project list + creation (V1). Native Vault Core design. Creating a project
// stores a row; nothing external is touched.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clapperboard, Plus, Lock, ArrowRight, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { VCPageWrapper, VCPanel, VCPanelHeader, VCStatusBadge, VCChip, VCEmptyState, VCSkeleton, VCButton } from "@/components/ui/VaultUI";
import { VANTA_INDUSTRIES, VANTA_OBJECTIVES, type VantaProject } from "@/lib/vanta/types";

const ORANGE = "#ff8400";

const STATUS_VARIANT: Record<string, "neutral" | "blue" | "orange" | "success" | "gold"> = {
  intake: "neutral", analyzing: "blue", review: "orange", editing: "blue", qa: "gold", exported: "success", archived: "neutral",
};

function titleCase(s: string) { return s.replace(/_/g, " "); }

export function VantaProjects() {
  const [projects, setProjects] = useState<VantaProject[]>([]);
  const [assetCounts, setAssetCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", industry: "roofing", objective: "lead_generation" });

  const load = useCallback(async () => {
    const res = await fetch("/api/vanta/projects").catch(() => null);
    if (!res) { setLoading(false); return; }
    if (!res.ok) { if (res.status === 401 || res.status === 403) setForbidden(true); setLoading(false); return; }
    const d = await res.json().catch(() => null);
    setProjects(Array.isArray(d?.projects) ? d.projects : []);
    setAssetCounts(d?.assetCounts ?? {});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async () => {
    setCreating(true); setNotice(null);
    try {
      const res = await fetch("/api/vanta/projects", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not create project"); return; }
      setShowForm(false);
      setForm({ title: "", description: "", industry: "roofing", objective: "lead_generation" });
      await load();
    } finally { setCreating(false); }
  }, [form, load]);

  if (forbidden) {
    return (
      <VCPageWrapper>
        <PageHeader sectionLabel="Vanta" title="Projects" />
        <VCPanel><VCEmptyState icon={Lock} title="Access restricted" description="You don't have access to Vanta projects." /></VCPanel>
      </VCPageWrapper>
    );
  }

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vanta · Creative Intelligence"
        title="Projects"
        description="One project per shoot or campaign. Register footage, run the creative analysis, review the package."
        badge={<VCStatusBadge label={`${projects.length} project${projects.length === 1 ? "" : "s"}`} variant="orange" dot />}
      />

      <div>
        <VCButton onClick={() => setShowForm((v) => !v)} disabled={creating}>
          <span className="inline-flex items-center gap-1.5"><Plus size={13} /> New Project</span>
        </VCButton>
      </div>

      {showForm && (
        <VCPanel accent="orange">
          <VCPanelHeader icon={Clapperboard} iconColor={ORANGE} title="New Vanta Project" />
          <div className="px-4 py-4 space-y-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project title (e.g. Kaczmar May shoot — storm damage series)"
              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="What was shot, where, and what it needs to become…"
              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none resize-none" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-[12px]" style={{ color: "var(--t-muted)" }}>
                Industry
                <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg text-[12px] outline-none" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
                  {VANTA_INDUSTRIES.map((i) => <option key={i} value={i}>{titleCase(i)}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-[12px]" style={{ color: "var(--t-muted)" }}>
                Objective
                <select value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg text-[12px] outline-none" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
                  {VANTA_OBJECTIVES.map((o) => <option key={o} value={o}>{titleCase(o)}</option>)}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <VCButton onClick={create} disabled={creating || !form.title.trim()}>
                {creating ? <span className="inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Creating…</span> : "Create Project"}
              </VCButton>
              <button onClick={() => setShowForm(false)} disabled={creating} className="px-3 py-2 text-[12.5px] font-semibold disabled:opacity-50" style={{ color: "var(--t-muted)" }}>Cancel</button>
            </div>
            {notice && <p className="text-[11.5px] px-3 py-2 rounded-lg" style={{ background: "rgba(255,132,0,0.08)", border: "1px solid rgba(255,132,0,0.2)", color: ORANGE }}>{notice}</p>}
          </div>
        </VCPanel>
      )}

      <VCPanel>
        <VCPanelHeader icon={Clapperboard} iconColor={ORANGE} label="All projects" title="Project Queue" live />
        <div className="px-4 py-3 space-y-2.5">
          {loading && <VCSkeleton rows={3} />}
          {!loading && projects.length === 0 && (
            <VCEmptyState icon={Clapperboard} title="No projects yet" description="Create the first Vanta project, register footage, and run the creative analysis." />
          )}
          {projects.map((p) => (
            <Link key={p.id} href={`/vanta/projects/${p.id}`}
              className="block px-4 py-3 rounded-xl transition-all"
              style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}>
                    <Clapperboard size={13} style={{ color: ORANGE }} /> {p.title}
                  </p>
                  {p.description && <p className="text-[12px] mt-0.5 line-clamp-1" style={{ color: "var(--t-text-body)" }}>{p.description}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <VCStatusBadge label={titleCase(p.status)} variant={STATUS_VARIANT[p.status] ?? "neutral"} />
                  <ArrowRight size={13} style={{ color: "var(--t-dim)" }} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <VCChip label={titleCase(p.industry)} color="#22d3ee" />
                <VCChip label={titleCase(p.objective)} color="#a78bfa" />
                <VCChip label={`${assetCounts[p.id] ?? 0} asset${(assetCounts[p.id] ?? 0) === 1 ? "" : "s"}`} color="#0081f2" />
                {p.client_id && <VCChip label={p.client_id} color="#0081f2" />}
              </div>
            </Link>
          ))}
        </div>
      </VCPanel>
    </VCPageWrapper>
  );
}
