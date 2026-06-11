"use client";

// VANTA — Creative Intelligence studio hub (V1). Renders the module's knowledge layer
// (agents, signature looks, content packs) + entry points. Native Vault Core design.
// Vanta plans and briefs; it never publishes, launches, or contacts anyone.

import Link from "next/link";
import { Clapperboard, Palette, Music4, ArrowRight, Layers, ShieldAlert, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { VCPageWrapper, VCPanel, VCPanelHeader, VCStatusBadge, VCChip } from "@/components/ui/VaultUI";
import { VANTA_AGENTS } from "@/lib/vanta/agents/registry";
import { VANTA_COLOR_PRESETS } from "@/lib/vanta/color/presets";
import { CONTENT_PACKS, MUSIC_CATEGORIES } from "@/lib/vanta/sound/taxonomy";

const ORANGE = "#ff8400";

function ModuleTile({ href, icon: Icon, title, desc }: { href: string; icon: LucideIcon; title: string; desc: string }) {
  return (
    <Link href={href} className="group flex flex-col gap-2 px-4 py-4 rounded-2xl transition-all"
      style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,132,0,0.12)", border: "1px solid rgba(255,132,0,0.24)" }}>
          <Icon size={16} style={{ color: ORANGE }} />
        </div>
        <ArrowRight size={14} style={{ color: "var(--t-dim)" }} />
      </div>
      <div className="text-[14px] font-semibold" style={{ color: "var(--t-text)", fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif" }}>{title}</div>
      <p className="text-[11.5px] leading-snug" style={{ color: "var(--t-muted)" }}>{desc}</p>
    </Link>
  );
}

export function VantaHub() {
  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vanta · Creative Intelligence"
        title="Vanta Studio"
        description="Vault Co's AI Creative Director — footage intelligence, color science, edit plans, hooks, captions, sound design, and QA. Vanta turns raw footage into briefed, scored, ready-to-cut creative packages."
        badge={<VCStatusBadge label="V1 · Intelligence plane live" variant="orange" dot />}
      />

      {/* Boundary banner */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(255,132,0,0.06)", border: "1px solid rgba(255,132,0,0.22)" }}>
        <ShieldAlert size={16} style={{ color: ORANGE, marginTop: 1 }} />
        <p className="text-[11.5px]" style={{ color: "var(--t-text-body)" }}>
          Vanta plans, scores, and briefs. It never posts, publishes, uploads, or launches anything —
          finished creative flows into the existing Vault Core creative-brief and Meta-campaign-draft
          approval lanes. Media rendering (proxies, whisper, scene detection) runs on the external Vanta
          Worker; this studio is the command surface.
        </p>
      </div>

      {/* Entry points */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <ModuleTile href="/vanta/projects" icon={Layers} title="Projects" desc="Create a project, register footage, run the full creative analysis." />
        <ModuleTile href="/vanta/projects" icon={Palette} title="Color Lab" desc="Five signature Vault looks with runnable ffmpeg / Resolve / Premiere recipes. (Per-asset inside each project.)" />
        <ModuleTile href="/vanta/projects" icon={Music4} title="Sound Design" desc="Auto cue sheets, music intelligence, and the SFX taxonomy. (Generated per edit plan.)" />
      </div>

      {/* Agent roster */}
      <VCPanel accent="orange">
        <VCPanelHeader icon={Clapperboard} iconColor={ORANGE} label="Vanta workforce — library agents, not Vault Core executives" title="Creative Department" live />
        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {VANTA_AGENTS.map((a) => (
            <div key={a.id} className="px-3.5 py-3 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{a.title}</p>
                <VCChip label={a.plane} color={a.plane === "intelligence" ? "#0081f2" : "#22d3ee"} />
              </div>
              <p className="text-[11.5px] mt-1 leading-snug" style={{ color: "var(--t-muted)" }}>{a.mission}</p>
            </div>
          ))}
        </div>
      </VCPanel>

      {/* Signature looks */}
      <VCPanel>
        <VCPanelHeader icon={Palette} iconColor={ORANGE} label="Color science" title="Signature Looks" />
        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {VANTA_COLOR_PRESETS.map((p) => (
            <div key={p.key} className="px-3.5 py-3 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
              <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{p.name}</p>
              <p className="text-[11.5px] mt-1 leading-snug" style={{ color: "var(--t-muted)" }}>{p.look}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {p.use_for.slice(0, 3).map((u) => <VCChip key={u} label={u} color="#6b7a99" />)}
              </div>
            </div>
          ))}
        </div>
      </VCPanel>

      {/* Content packs + music */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VCPanel>
          <VCPanelHeader icon={Layers} iconColor={ORANGE} label="Prebuilt editing packs" title="Content Packs" />
          <div className="px-4 py-3 space-y-2">
            {CONTENT_PACKS.map((p) => (
              <div key={p.key} className="px-3.5 py-2.5 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                <p className="text-[12.5px] font-semibold" style={{ color: "var(--t-text)" }}>{p.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>{p.includes.join(" · ")}</p>
              </div>
            ))}
          </div>
        </VCPanel>
        <VCPanel>
          <VCPanelHeader icon={Music4} iconColor={ORANGE} label="Music intelligence" title="Music Categories" />
          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MUSIC_CATEGORIES.map((m) => (
              <div key={m.key} className="px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>{m.label}</span>
                  <VCChip label={m.energy} color={m.energy === "high" ? "#ef4444" : m.energy === "medium" ? "#f59e0b" : "#22c55e"} />
                </div>
                <p className="text-[10.5px] mt-0.5" style={{ color: "var(--t-dim)" }}>{m.tempo} · {m.mood}</p>
              </div>
            ))}
          </div>
        </VCPanel>
      </div>
    </VCPageWrapper>
  );
}
