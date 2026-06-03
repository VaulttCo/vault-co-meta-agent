"use client";

// Vault OS Mission Control — Active Workforce (Section 3).
//
// Three tiers, visually separated:
//   ACTIVE EXECUTIVES — the five Vault Core runtime executives
//                       (Vega, Veronica, Valentina, Valerie, Vanessa)
//   PRODUCT SURFACE   — Victoria, the AI Sales Coach product (NOT a runtime
//                       executive; never in the Vault Core workforce registry)
//   SYSTEM LAYER      — Hermes, Execution & Validation (NOT a business operator)
//
// Executive identity (name/title/accent/icon/destination) is fixed configuration
// mirroring src/lib/core/agents/registry.ts; every LIVE field — status, mission,
// next action, contribution count, latest activity — comes only from real data.
// When live data is absent, fields degrade to neutral "Standby" / em-dash rather
// than fabricating activity. Victoria and Vivian are never shown as executives.

import Link from "next/link";
import { Bot, Mic2, Radar, Megaphone, Wallet, Crown, Wrench, HeartHandshake, type LucideIcon } from "lucide-react";
import {
  VCBentoCell,
  VCGlowIcon,
  VCStatusBadge,
  VCChip,
  VCSectionLabel,
  VCDivider,
} from "@/components/ui/VaultUI";
import type { WorkforceMember } from "@/lib/core/types";
import type { HermesRun } from "./useMissionData";
import { relativeTime } from "./relativeTime";

const STEEL = "#6b7a99";
const PURPLE = "#b89eff";

// The six ACTIVE Vault Core executives, in registry order. This list is the
// truthful structural workforce; it must stay in sync with WORKFORCE (active).
// Victoria (product) is intentionally absent. Vivian is RECOMMEND-ONLY.
interface ExecConfig {
  id: string;
  name: string;
  role: string;       // fallback title if live meta is unavailable
  mission: string;    // fallback mission if live meta is unavailable
  icon: LucideIcon;
  accent: string;
  href: string;
}

const EXECUTIVES: ExecConfig[] = [
  { id: "vega",      name: "Vega",      role: "Intelligence Director",    mission: "Identify patterns across everything and feed recommendations to the workforce.", icon: Radar,          accent: "#22d3ee", href: "/workforce" },
  { id: "veronica",  name: "Veronica",  role: "Lead Acquisition Director", mission: "Understand why leads convert.",                                                 icon: Bot,            accent: "#0081f2", href: "/ai-agent" },
  { id: "valentina", name: "Valentina", role: "AI Marketing Director",     mission: "Understand how attention converts.",                                            icon: Megaphone,      accent: "#ff8400", href: "/workforce" },
  { id: "valerie",   name: "Valerie",   role: "Financial Director",        mission: "Protect and grow financial performance.",                                       icon: Wallet,         accent: "#c9a84c", href: "/revenue-dashboard" },
  { id: "vanessa",   name: "Vanessa",   role: "Executive Director",        mission: "Convert intelligence into executive priorities.",                               icon: Crown,          accent: "#a78bfa", href: "/proposals" },
  { id: "vivian",    name: "Vivian",    role: "Client Success Operator",   mission: "Protect client experience, retention, and onboarding health — recommend-only.",  icon: HeartHandshake, accent: "#22c55e", href: "/recommendations" },
];

interface WorkforceRosterProps {
  loading: boolean;
  workforce: WorkforceMember[];
  hermesSkillCount: number;
  hermesLastRun: HermesRun | null;
  /** Newest real activity message per agent id. */
  latestByAgent: Record<string, { message: string; ts: string }>;
}

function ExecutiveCard({
  index,
  config,
  member,
  latest,
}: {
  index: number;
  config: ExecConfig;
  member: WorkforceMember | undefined;
  latest: { message: string; ts: string } | undefined;
}) {
  const active = member?.meta.active ?? false;
  const title = member?.meta.title ?? config.role;
  const mission = member?.meta.mission ?? config.mission;
  const nextAction = member?.objectives?.[0]?.objective ?? null;
  const contributions = member?.reputation?.knowledge_contributions ?? null;

  return (
    <VCBentoCell index={index} colSpan={1} accent={config.accent} minHeight={172}>
      <Link href={config.href} className="flex flex-col h-full p-5 gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <VCGlowIcon icon={config.icon} color={config.accent} size={18} ringSize={40} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] truncate" style={{ color: "var(--t-dim)" }}>
                {title}
              </p>
              <p
                className="text-[16px] font-bold leading-tight"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)", letterSpacing: "0.02em" }}
              >
                {config.name}
              </p>
            </div>
          </div>
          <VCStatusBadge
            label={member ? (active ? "Live" : "Idle") : "Standby"}
            variant={active ? "success" : "neutral"}
            dot={active}
          />
        </div>

        {/* Current mission */}
        <p className="text-[11.5px] leading-snug line-clamp-2" style={{ color: "var(--t-muted)" }}>
          {mission}
        </p>

        <div className="mt-auto flex flex-col gap-2">
          {/* Latest contribution signal — only when real activity exists */}
          {latest ? (
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: config.accent }} />
              <span className="text-[11px] leading-snug line-clamp-2" style={{ color: "var(--t-text-body)" }}>
                {latest.message}
                <span className="ml-1" style={{ color: "var(--t-dim)" }}>· {relativeTime(latest.ts)}</span>
              </span>
            </div>
          ) : nextAction ? (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] mb-0.5" style={{ color: "var(--t-dim)" }}>
                Next action
              </p>
              <p className="text-[11px] leading-snug line-clamp-2" style={{ color: "var(--t-muted)" }}>
                {nextAction}
              </p>
            </div>
          ) : (
            <p className="text-[11px]" style={{ color: "var(--t-dim)" }}>Standby — no recent activity</p>
          )}

          {contributions !== null && contributions > 0 && (
            <VCChip label={`${contributions} memory contributions`} color={config.accent} />
          )}
        </div>
      </Link>
    </VCBentoCell>
  );
}

function VictoriaProductCard({ index }: { index: number }) {
  return (
    <VCBentoCell index={index} colSpan={1} accent={PURPLE} minHeight={96}>
      <Link href="/victoria" className="flex items-center justify-between gap-4 h-full p-5 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <VCGlowIcon icon={Mic2} color={PURPLE} size={18} ringSize={40} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--t-dim)" }}>
              AI Sales Coach · Product
            </p>
            <p
              className="text-[16px] font-bold leading-tight"
              style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)", letterSpacing: "0.02em" }}
            >
              Victoria
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <VCStatusBadge label="Product Surface" variant="neutral" />
          <VCChip label="not a Vault Core executive" color={PURPLE} />
        </div>
      </Link>
    </VCBentoCell>
  );
}

function HermesCard({
  index,
  skillCount,
  lastRun,
}: {
  index: number;
  skillCount: number;
  lastRun: HermesRun | null;
}) {
  return (
    <VCBentoCell index={index} colSpan={1} accent={STEEL} minHeight={96}>
      <Link href="/operator-queue" className="flex items-center justify-between gap-4 h-full p-5 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <VCGlowIcon icon={Wrench} color={STEEL} size={18} ringSize={40} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--t-dim)" }}>
              Execution &amp; Validation Layer
            </p>
            <p
              className="text-[16px] font-bold leading-tight"
              style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)", letterSpacing: "0.02em" }}
            >
              Hermes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <VCStatusBadge label="System Layer" variant="neutral" />
          <VCChip label={`${skillCount} ${skillCount === 1 ? "skill" : "skills"}`} color={STEEL} />
          {lastRun ? (
            <VCChip label={`last run ${lastRun.status} · ${relativeTime(lastRun.created_at)}`} color={STEEL} />
          ) : (
            <VCChip label="no recent runs" color={STEEL} />
          )}
        </div>
      </Link>
    </VCBentoCell>
  );
}

export function WorkforceRoster({
  loading,
  workforce,
  hermesSkillCount,
  hermesLastRun,
  latestByAgent,
}: WorkforceRosterProps) {
  const byId = new Map(workforce.map((m) => [m.meta.id, m]));

  return (
    <div className="hub-fade-up w-full flex flex-col gap-4">
      <VCSectionLabel>Active Workforce · 6 Vault Core Executives</VCSectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {EXECUTIVES.map((cfg, i) => (
          <ExecutiveCard
            key={cfg.id}
            index={i}
            config={cfg}
            member={loading ? undefined : byId.get(cfg.id)}
            latest={loading ? undefined : latestByAgent[cfg.id]}
          />
        ))}
      </div>

      <VCDivider className="my-1" />

      <VCSectionLabel>Product Surface &amp; System Layer</VCSectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <VictoriaProductCard index={EXECUTIVES.length} />
        <HermesCard
          index={EXECUTIVES.length + 1}
          skillCount={loading ? 0 : hermesSkillCount}
          lastRun={loading ? null : hermesLastRun}
        />
      </div>
    </div>
  );
}
