"use client";

// Vault OS Mission Control — AI Workforce (Section 3).
//
// Two tiers, visually separated:
//   PRIMARY WORKFORCE — business operators (Veronica, Victoria, Vault Core)
//   SYSTEM LAYER      — Hermes, the Execution & Validation layer (NOT an operator)
//
// Operator identity (name/role/accent/destination) is fixed configuration; every
// LIVE field — status, next action, active-executive count, Hermes runs/skills —
// comes only from real data. When live data is absent, fields degrade to neutral
// "Standby" / em-dash rather than fabricating activity.

import Link from "next/link";
import { Bot, Mic2, Brain, Wrench, type LucideIcon } from "lucide-react";
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

interface PrimaryConfig {
  id: string;
  name: string;
  role: string;
  icon: LucideIcon;
  accent: string;
  href: string;
}

const PRIMARY: PrimaryConfig[] = [
  { id: "veronica", name: "Veronica", role: "Lead Acquisition", icon: Bot,  accent: "#0081f2", href: "/ai-agent" },
  { id: "victoria", name: "Victoria", role: "AI Sales Coach",   icon: Mic2, accent: "#b89eff", href: "/victoria" },
];

interface WorkforceRosterProps {
  loading: boolean;
  workforce: WorkforceMember[];
  activeAutomations: number;
  hermesSkillCount: number;
  hermesLastRun: HermesRun | null;
}

function OperatorCard({
  index,
  config,
  member,
}: {
  index: number;
  config: PrimaryConfig;
  member: WorkforceMember | undefined;
}) {
  const active = member?.meta.active ?? false;
  const title = member?.meta.title ?? config.role;
  const nextAction = member?.objectives[0]?.objective ?? null;

  return (
    <VCBentoCell index={index} colSpan={1} accent={config.accent} minHeight={150}>
      <Link href={config.href} className="flex flex-col h-full p-5 gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <VCGlowIcon icon={config.icon} color={config.accent} size={18} ringSize={40} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--t-dim)" }}>
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
          {member ? (
            <VCStatusBadge label={active ? "Live" : "Idle"} variant={active ? "success" : "neutral"} dot={active} />
          ) : (
            <VCStatusBadge label="Standby" variant="neutral" />
          )}
        </div>

        <div className="mt-auto">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: "var(--t-dim)" }}>
            Next action
          </p>
          <p className="text-[12px] leading-snug line-clamp-2" style={{ color: nextAction ? "var(--t-muted)" : "var(--t-dim)" }}>
            {nextAction ?? "—"}
          </p>
        </div>
      </Link>
    </VCBentoCell>
  );
}

function VaultCoreCard({ index, activeAutomations }: { index: number; activeAutomations: number }) {
  return (
    <VCBentoCell index={index} colSpan={1} accent="#0081f2" minHeight={150}>
      <Link href="/vault-core" className="flex flex-col h-full p-5 gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <VCGlowIcon icon={Brain} color="#0081f2" size={18} ringSize={40} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--t-dim)" }}>
                Private OS
              </p>
              <p
                className="text-[16px] font-bold leading-tight"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)", letterSpacing: "0.02em" }}
              >
                Vault Core
              </p>
            </div>
          </div>
          <VCStatusBadge
            label={activeAutomations > 0 ? "Active" : "Standby"}
            variant={activeAutomations > 0 ? "success" : "neutral"}
            dot={activeAutomations > 0}
          />
        </div>

        <div className="mt-auto flex items-end gap-2">
          <span
            className="text-[26px] font-bold leading-none"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#4da6ff" }}
          >
            {activeAutomations}
          </span>
          <span className="text-[11px] font-medium pb-0.5" style={{ color: "var(--t-muted)" }}>
            active runtime executives
          </span>
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
    <VCBentoCell index={index} colSpan={3} accent={STEEL} minHeight={96}>
      <Link href="/operator-queue" className="flex items-center justify-between gap-4 h-full p-5 flex-wrap">
        <div className="flex items-center gap-3">
          <VCGlowIcon icon={Wrench} color={STEEL} size={18} ringSize={40} />
          <div>
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
  activeAutomations,
  hermesSkillCount,
  hermesLastRun,
}: WorkforceRosterProps) {
  const byId = new Map(workforce.map((m) => [m.meta.id, m]));

  return (
    <div className="hub-fade-up w-full flex flex-col gap-4">
      <VCSectionLabel>Primary Workforce</VCSectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PRIMARY.map((cfg, i) => (
          <OperatorCard key={cfg.id} index={i} config={cfg} member={loading ? undefined : byId.get(cfg.id)} />
        ))}
        <VaultCoreCard index={PRIMARY.length} activeAutomations={loading ? 0 : activeAutomations} />
      </div>

      <VCDivider className="my-1" />

      <VCSectionLabel>System Layer</VCSectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HermesCard
          index={PRIMARY.length + 1}
          skillCount={loading ? 0 : hermesSkillCount}
          lastRun={loading ? null : hermesLastRun}
        />
      </div>
    </div>
  );
}
