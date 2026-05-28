"use client";

import { TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  subvalue?: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  /** Gold accent = revenue-tier metric */
  tier?: "blue" | "gold";
}

function MetricCard({
  label,
  value,
  subvalue,
  change,
  changeType = "neutral",
  tier = "blue",
}: MetricCardProps) {
  const accentColor = tier === "gold" ? "#c9a84c" : "#0081f2";
  const accentAlpha14 = tier === "gold" ? "#c9a84c14" : "#0081f214";
  const accentAlpha26 = tier === "gold" ? "#c9a84c26" : "#0081f226";

  const changeStyle =
    changeType === "up"
      ? { backgroundColor: "rgba(34,197,94,0.10)", color: "#22c55e" }
      : changeType === "down"
      ? { backgroundColor: "rgba(239,68,68,0.10)", color: "#ef4444" }
      : { backgroundColor: "rgba(107,122,153,0.10)", color: "#6b7a99" };

  return (
    <div
      className="vc-stat-card relative overflow-hidden"
      style={{ borderTopColor: accentColor, borderTopWidth: "2px" }}
    >
      {/* Subtle radial glow from top-left icon */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 120,
          height: 120,
          background: `radial-gradient(circle at 20% 20%, ${accentColor}09, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: accentAlpha14,
            border: `1px solid ${accentAlpha26}`,
          }}
        >
          <DollarSign size={15} style={{ color: accentColor }} />
        </div>

        {change && (
          <div
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={changeStyle}
          >
            {changeType === "up" && <TrendingUp size={9} />}
            {changeType === "down" && <TrendingDown size={9} />}
            {changeType === "neutral" && <Minus size={9} />}
            {change}
          </div>
        )}
      </div>

      {/* Primary value */}
      <div
        className="text-[28px] font-bold leading-none mb-1 tracking-wide"
        style={{
          fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
          color: "var(--t-text)",
        }}
      >
        {value}
      </div>

      {/* Sub-value (e.g. "of $50,000 budget") */}
      {subvalue && (
        <div className="text-[11px] mb-2" style={{ color: "var(--t-dim)" }}>
          {subvalue}
        </div>
      )}

      {/* Label */}
      <div className="vc-label">{label}</div>

      {/* Bottom accent line */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(to right, ${accentColor}30, transparent)`,
        }}
      />
    </div>
  );
}

/** Isolated sandbox preview — not imported by any production page */
export default function MagicMetricCardPreview() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--t-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        gap: 24,
      }}
    >
      <p className="vc-label mb-4">sandbox — magic metric card preview</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          width: "100%",
          maxWidth: 900,
        }}
      >
        <MetricCard
          label="Total Ad Spend"
          value="$24,810"
          subvalue="of $30,000 budget"
          change="+12.4%"
          changeType="up"
          tier="blue"
        />
        <MetricCard
          label="Revenue Generated"
          value="$187,400"
          subvalue="attributed to Meta"
          change="+28.1%"
          changeType="up"
          tier="gold"
        />
        <MetricCard
          label="Cost Per Lead"
          value="$34.20"
          change="-8.3%"
          changeType="down"
          tier="blue"
        />
        <MetricCard
          label="ROAS"
          value="7.55×"
          subvalue="target 5.0×"
          change="neutral"
          changeType="neutral"
          tier="gold"
        />
      </div>
    </div>
  );
}
