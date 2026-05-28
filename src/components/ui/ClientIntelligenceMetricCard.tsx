"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Brain, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { VCPanel, VCStatusBadge, VCChip } from "@/components/ui/VaultUI";

// ── Types ────────────────────────────────────────────────────────────────────

type Tier = "elite" | "growth" | "standard";
type ChangeType = "up" | "down" | "neutral";
type ClientStatus = "live" | "paused" | "review";

export interface ClientIntelligenceMetricData {
  label: string;
  value: string;
  change?: string;
  changeType?: ChangeType;
}

export interface ClientIntelligenceMetricCardProps {
  clientName: string;
  vertical: string;
  phase: string;
  tier: Tier;
  intelligenceScore: number;
  metrics: [
    ClientIntelligenceMetricData,
    ClientIntelligenceMetricData,
    ClientIntelligenceMetricData,
    ClientIntelligenceMetricData,
  ];
  status: ClientStatus;
  lastUpdated: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const TIER_CFG: Record<
  Tier,
  {
    accent: "blue" | "gold" | undefined;
    color: string;
    label: string;
    badgeVariant: "blue" | "gold" | "neutral";
  }
> = {
  elite:    { accent: "gold",    color: "#c9a84c", label: "Elite",    badgeVariant: "gold"    },
  growth:   { accent: "blue",    color: "#0081f2", label: "Growth",   badgeVariant: "blue"    },
  standard: { accent: undefined, color: "#6b7a99", label: "Standard", badgeVariant: "neutral" },
};

const STATUS_CFG: Record<
  ClientStatus,
  { variant: "success" | "warning" | "blue"; label: string }
> = {
  live:   { variant: "success", label: "Live"      },
  paused: { variant: "warning", label: "Paused"    },
  review: { variant: "blue",    label: "In Review" },
};

const CHANGE_STYLES: Record<ChangeType, React.CSSProperties> = {
  up:      { backgroundColor: "rgba(34,197,94,0.10)",   color: "#22c55e" },
  down:    { backgroundColor: "rgba(239,68,68,0.10)",   color: "#ef4444" },
  neutral: { backgroundColor: "rgba(107,122,153,0.10)", color: "#6b7a99" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;

  return (
    <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden>
      <circle
        cx={36} cy={36} r={r}
        fill="none"
        stroke="rgba(107,122,153,0.15)"
        strokeWidth={5}
      />
      <circle
        cx={36} cy={36} r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ * 0.25}
        style={{ filter: `drop-shadow(0 0 4px ${color}55)` }}
      />
      <text
        x={36} y={40}
        textAnchor="middle"
        fontSize={16}
        fontWeight={700}
        fill={color}
        fontFamily="var(--font-rajdhani), Rajdhani, sans-serif"
      >
        {score}
      </text>
    </svg>
  );
}

function HealthBar({ score, color }: { score: number; color: string }) {
  return (
    <div
      className="w-full h-1 rounded-full"
      style={{ backgroundColor: "rgba(107,122,153,0.15)" }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${score}%`,
          background: `linear-gradient(to right, ${color}70, ${color})`,
          boxShadow: `0 0 6px ${color}40`,
        }}
      />
    </div>
  );
}

function ClientAvatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
      style={{
        backgroundColor: `${color}14`,
        border: `1px solid ${color}28`,
        color,
        fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
      }}
    >
      {initials}
    </div>
  );
}

function MetricCell({ label, value, change, changeType = "neutral" }: ClientIntelligenceMetricData) {
  const Icon =
    changeType === "up" ? TrendingUp : changeType === "down" ? TrendingDown : Minus;

  return (
    <div className="flex flex-col gap-0.5">
      <div
        className="text-[19px] font-bold leading-none tracking-wide"
        style={{
          fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
          color: "var(--t-text)",
        }}
      >
        {value}
      </div>
      <div className="text-[10px] font-medium" style={{ color: "var(--t-muted)" }}>
        {label}
      </div>
      {change && (
        <div
          className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full w-fit mt-0.5"
          style={CHANGE_STYLES[changeType]}
        >
          <Icon size={8} />
          {change}
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ClientIntelligenceMetricCard({
  clientName,
  vertical,
  phase,
  tier,
  intelligenceScore,
  metrics,
  status,
  lastUpdated,
}: ClientIntelligenceMetricCardProps) {
  const reduced = useReducedMotion();
  const tc = TIER_CFG[tier];
  const sc = STATUS_CFG[status];

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <VCPanel accent={tc.accent}>
        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <ClientAvatar name={clientName} color={tc.color} />
            <div className="min-w-0">
              <div
                className="text-[14px] font-semibold leading-tight truncate"
                style={{
                  color: "var(--t-text)",
                  fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                }}
              >
                {clientName}
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <VCChip label={vertical} />
                <VCChip label={phase} color={tc.color} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <VCStatusBadge label={tc.label} variant={tc.badgeVariant} />
            <VCStatusBadge label={sc.label} variant={sc.variant} dot />
          </div>
        </div>

        {/* Intelligence score */}
        <div
          className="flex items-center gap-4 px-5 py-4"
          style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
        >
          <ScoreGauge score={intelligenceScore} color={tc.color} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={11} style={{ color: tc.color }} />
              <span
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--t-dim)" }}
              >
                Intelligence Score
              </span>
            </div>
            <HealthBar score={intelligenceScore} color={tc.color} />
            <div className="flex justify-between mt-1">
              <span className="text-[10px]" style={{ color: "var(--t-dim)" }}>0</span>
              <span className="text-[10px]" style={{ color: "var(--t-dim)" }}>100</span>
            </div>
          </div>
        </div>

        {/* Metrics grid */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-px"
          style={{ backgroundColor: "var(--t-border-subtle)" }}
        >
          {metrics.map((m, i) => (
            <div
              key={i}
              className="px-4 py-3"
              style={{ backgroundColor: "var(--t-surface)" }}
            >
              <MetricCell {...m} />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5">
          <div className="flex items-center gap-1.5">
            <Activity size={10} style={{ color: "var(--t-dim)" }} />
            <span className="text-[10px]" style={{ color: "var(--t-dim)" }}>
              Updated {lastUpdated}
            </span>
          </div>
          <span
            className="text-[10px] font-medium tracking-wide"
            style={{ color: "var(--t-dim)" }}
          >
            vault intelligence
          </span>
        </div>
      </VCPanel>
    </motion.div>
  );
}
