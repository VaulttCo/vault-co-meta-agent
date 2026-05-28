"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  /** Optional top-border accent color — highlight priority metrics */
  accent?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "#0081f2",
  accent,
}: StatCardProps) {
  return (
    <div
      className="vc-stat-card"
      style={
        accent
          ? { borderTopColor: accent, borderTopWidth: "2px" }
          : undefined
      }
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: `${iconColor}14`,
            border: `1px solid ${iconColor}26`,
          }}
        >
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        {change && (
          <div
            className="flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full"
            style={
              changeType === "up"
                ? { backgroundColor: "rgba(34,197,94,0.10)", color: "#22c55e" }
                : changeType === "down"
                ? { backgroundColor: "rgba(239,68,68,0.10)", color: "#ef4444" }
                : { backgroundColor: "rgba(107,122,153,0.10)", color: "#6b7a99" }
            }
          >
            {changeType === "up" && <TrendingUp size={9} />}
            {changeType === "down" && <TrendingDown size={9} />}
            {change}
          </div>
        )}
      </div>
      <div
        className="text-[26px] font-bold leading-none mb-1.5 tracking-wide"
        style={{
          fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
          color: "var(--t-text)",
        }}
      >
        {value}
      </div>
      <div className="text-[11px] font-medium" style={{ color: "var(--t-muted)" }}>
        {label}
      </div>
    </div>
  );
}
