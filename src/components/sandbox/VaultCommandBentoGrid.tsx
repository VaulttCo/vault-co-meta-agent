"use client";

/** Isolated sandbox — not imported by any production page */

import { useState, useRef, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bot,
  Users,
  TrendingUp,
  DollarSign,
  Brain,
  Activity,
  Zap,
  Target,
  CheckCircle2,
  ArrowUpRight,
  Wifi,
} from "lucide-react";
import { VCGlowIcon, VCStatusBadge, VCChip } from "@/components/ui/VaultUI";

// ── Design tokens ─────────────────────────────────────────────────────────────

const BLUE  = "#0081f2";
const AMBER = "#c9a84c";
const GREEN = "#22c55e";

// ── Bento cell shell ──────────────────────────────────────────────────────────
//
// Aceternity-style pattern:
//  Outer wrapper: 1px gradient border via padding trick
//  Inner surface: dark panel background
//  Spotlight: radial gradient following mouse (disabled when reduced motion)
//  Entry: staggered fade-in from below (disabled when reduced motion)

interface BentoCellProps {
  children: React.ReactNode;
  index: number;
  reduced: boolean;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
  accent?: string;
  minHeight?: number;
}

function BentoCell({
  children,
  index,
  reduced,
  colSpan = 1,
  rowSpan = 1,
  accent = BLUE,
  minHeight = 160,
}: BentoCellProps) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduced || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
    },
    [reduced]
  );

  const colClass =
    colSpan === 3 ? "sm:col-span-3" :
    colSpan === 2 ? "sm:col-span-2" :
                   "sm:col-span-1";

  const rowClass = rowSpan === 2 ? "sm:row-span-2" : "";

  return (
    <motion.div
      className={`col-span-1 ${colClass} ${rowClass}`}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      style={{ minHeight }}
    >
      {/* Gradient border wrapper */}
      <div
        style={{
          height: "100%",
          padding: "1px",
          borderRadius: 16,
          background: hovered && !reduced
            ? `linear-gradient(135deg, ${accent}55 0%, ${accent}18 50%, transparent 100%)`
            : `linear-gradient(135deg, ${accent}28 0%, transparent 60%)`,
          transition: "background 0.3s ease",
        }}
      >
        {/* Inner surface */}
        <div
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => !reduced && setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "relative",
            height: "100%",
            borderRadius: 15,
            backgroundColor: "var(--t-surface)",
            overflow: "hidden",
          }}
        >
          {/* Spotlight overlay */}
          {hovered && !reduced && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 15,
                background: `radial-gradient(280px at ${mouse.x}px ${mouse.y}px, ${accent}14, transparent 70%)`,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          )}

          {/* Content above spotlight */}
          <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Cell content components ───────────────────────────────────────────────────

function VeronicaCell({ reduced }: { reduced: boolean }) {
  return (
    <div style={{ padding: "24px 28px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <VCGlowIcon icon={Bot} color={BLUE} size={18} ringSize={40} />
          <div>
            <p style={{ color: "var(--t-dim)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 2 }}>
              AI AGENT
            </p>
            <p style={{ color: "var(--t-text)", fontSize: 15, fontWeight: 700, fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", letterSpacing: "0.03em" }}>
              Veronica AI
            </p>
          </div>
        </div>
        <VCStatusBadge label="Live" variant="success" dot />
      </div>

      {/* Pulse line — decorative */}
      {!reduced && (
        <div style={{ margin: "16px 0", height: 32, display: "flex", alignItems: "center", gap: 3 }}>
          {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 1, 0.4, 0.7, 0.6, 0.9, 0.5, 1, 0.3].map((h, i) => (
            <motion.div
              key={i}
              style={{
                flex: 1,
                borderRadius: 2,
                backgroundColor: BLUE,
                opacity: 0.6,
              }}
              animate={{ height: [`${h * 100}%`, `${(h * 0.5 + 0.3) * 100}%`, `${h * 100}%`] }}
              transition={{ duration: 1.4 + i * 0.07, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>
      )}

      {/* Footer chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <VCChip label="claude-sonnet-4-6" color={BLUE} />
        <VCChip label="campaigns" />
        <VCChip label="intelligence" />
        <span style={{ color: "var(--t-dim)", fontSize: 10, marginLeft: "auto" }}>
          active · 3 tasks
        </span>
      </div>
    </div>
  );
}

function StatCell({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  badge?: React.ReactNode;
}) {
  return (
    <div style={{ padding: "20px 22px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 10,
            backgroundColor: `${accent}14`,
            border: `1px solid ${accent}28`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon size={14} style={{ color: accent }} />
        </div>
        {badge}
      </div>
      <div>
        <p
          style={{
            fontSize: 26, fontWeight: 700, lineHeight: 1,
            color: "var(--t-text)",
            fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
          }}
        >
          {value}
        </p>
        <p style={{ fontSize: 11, color: "var(--t-muted)", marginTop: 4, fontWeight: 600 }}>
          {label}
        </p>
        {sub && (
          <p style={{ fontSize: 10, color: "var(--t-dim)", marginTop: 2 }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

function LeadPipelineCell() {
  const rows = [
    { label: "New leads",     value: "27",  color: BLUE  },
    { label: "Booked",        value: "7",   color: GREEN },
    { label: "Show rate",     value: "71%", color: AMBER },
    { label: "CPL",           value: "$55", color: "var(--t-text)" },
    { label: "Pipeline",      value: "$84k",color: AMBER },
  ];

  return (
    <div style={{ padding: "20px 22px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Target size={13} style={{ color: AMBER }} />
        <p style={{ color: "var(--t-dim)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
          Lead Pipeline
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>
        {rows.map((r, i) => (
          <div
            key={r.label}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "7px 0",
              borderBottom: i < rows.length - 1 ? "1px solid var(--t-border-subtle)" : "none",
            }}
          >
            <span style={{ fontSize: 11, color: "var(--t-muted)" }}>{r.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: r.color, fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif" }}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntelligenceCell() {
  const clients = [
    { name: "JJ Roofing",   score: 72, tier: "growth"   as const },
    { name: "Open Forge",   score: 85, tier: "elite"    as const },
    { name: "Acorns Roof",  score: 38, tier: "standard" as const },
    { name: "Kaczmar Build",score: 61, tier: "standard" as const },
  ];

  const tierColor = (t: "elite" | "growth" | "standard") =>
    t === "elite" ? AMBER : t === "growth" ? BLUE : "var(--t-muted)";

  return (
    <div style={{ padding: "20px 28px", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Brain size={13} style={{ color: BLUE }} />
          <p style={{ color: "var(--t-dim)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
            Intelligence Coverage
          </p>
        </div>
        <VCStatusBadge label="2 / 4 active" variant="blue" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {clients.map((c) => (
          <div
            key={c.name}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              backgroundColor: "var(--t-surface-2)",
              border: "1px solid var(--t-border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "var(--t-text)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: tierColor(c.tier), fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif" }}>
                {c.score}
              </span>
            </div>
            {/* Mini score bar */}
            <div style={{ height: 3, borderRadius: 2, backgroundColor: "rgba(107,122,153,0.15)" }}>
              <div
                style={{
                  height: "100%", borderRadius: 2, width: `${c.score}%`,
                  background: `linear-gradient(to right, ${tierColor(c.tier)}70, ${tierColor(c.tier)})`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignHealthCell() {
  return (
    <div style={{ padding: "20px 22px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <CheckCircle2 size={13} style={{ color: GREEN }} />
        <p style={{ color: "var(--t-dim)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
          Campaign Health
        </p>
      </div>
      <div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          <VCStatusBadge label="4 Live" variant="success" dot />
          <VCStatusBadge label="2 Draft" variant="neutral" />
        </div>
        <p style={{ fontSize: 11, color: "var(--t-muted)" }}>All active campaigns within budget</p>
      </div>
    </div>
  );
}

function QuickActionCell() {
  return (
    <div style={{ padding: "20px 22px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Zap size={13} style={{ color: AMBER }} />
        <p style={{ color: "var(--t-dim)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
          Quick Actions
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { label: "Build campaign", icon: ArrowUpRight, color: BLUE  },
          { label: "Extract intel",  icon: Brain,        color: AMBER },
          { label: "View approvals", icon: Activity,     color: GREEN },
        ].map(({ label, icon: Icon, color }) => (
          <div
            key={label}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 10px", borderRadius: 8,
              backgroundColor: "var(--t-surface-2)",
              border: "1px solid var(--t-border-subtle)",
              cursor: "default",
            }}
          >
            <Icon size={11} style={{ color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "var(--t-text)", fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Grid ──────────────────────────────────────────────────────────────────────

export function VaultCommandBentoGrid() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(1, 1fr)",
        gap: 12,
      }}
      className="sm:grid-cols-3"
    >
      {/* Row 1: Veronica hero (2/3) + Active Clients (1/3) */}
      <BentoCell index={0} reduced={reduced} colSpan={2} accent={BLUE} minHeight={190}>
        <VeronicaCell reduced={reduced} />
      </BentoCell>

      <BentoCell index={1} reduced={reduced} colSpan={1} accent={GREEN} minHeight={190}>
        <StatCell
          icon={Users}
          label="Active Clients"
          value="4"
          sub="2 elite · 2 standard"
          accent={GREEN}
          badge={<VCStatusBadge label="+1 this mo" variant="success" />}
        />
      </BentoCell>

      {/* Row 2: ROAS (1/3) + Campaign Health (1/3) + Lead Pipeline tall (1/3 × 2 rows) */}
      <BentoCell index={2} reduced={reduced} colSpan={1} accent={BLUE} minHeight={150}>
        <StatCell
          icon={TrendingUp}
          label="Avg ROAS"
          value="6.1×"
          sub="target 5.0×"
          accent={BLUE}
        />
      </BentoCell>

      <BentoCell index={3} reduced={reduced} colSpan={1} accent={GREEN} minHeight={150}>
        <CampaignHealthCell />
      </BentoCell>

      <BentoCell index={4} reduced={reduced} colSpan={1} rowSpan={2} accent={AMBER} minHeight={320}>
        <LeadPipelineCell />
      </BentoCell>

      {/* Row 3: Spend (1/3) + Quick Actions (1/3) [pipeline continues] */}
      <BentoCell index={5} reduced={reduced} colSpan={1} accent={AMBER} minHeight={150}>
        <StatCell
          icon={DollarSign}
          label="Ad Spend MTD"
          value="$6.9k"
          sub="of $8.5k budget"
          accent={AMBER}
        />
      </BentoCell>

      <BentoCell index={6} reduced={reduced} colSpan={1} accent={BLUE} minHeight={150}>
        <QuickActionCell />
      </BentoCell>

      {/* Row 4: Intelligence coverage (3/3 full-width) */}
      <BentoCell index={7} reduced={reduced} colSpan={3} accent={BLUE} minHeight={170}>
        <IntelligenceCell />
      </BentoCell>
    </div>
  );
}

// ── Sandbox preview ───────────────────────────────────────────────────────────

export default function VaultCommandBentoGridPreview() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--t-bg)",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <p
            style={{
              color: "var(--t-dim)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            sandbox — vault command bento grid
          </p>
          <p style={{ color: "var(--t-muted)", fontSize: 12 }}>
            Aceternity-inspired bento layout · spotlight on hover · staggered entry
          </p>
        </div>

        <VaultCommandBentoGrid />
      </div>
    </div>
  );
}
