"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  changeType: "up" | "down" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ label, value, change, changeType, icon: Icon, iconColor = "#0081f2" }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-5 transition-all duration-150 hover:shadow-[0_0_20px_rgba(0,129,242,0.06)]"
      style={{
        backgroundColor: "#0D1520",
        border: "1px solid rgba(0, 129, 242, 0.15)",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: `${iconColor}14`,
            border: `1px solid ${iconColor}28`,
          }}
        >
          <Icon size={16} style={{ color: iconColor }} />
        </div>
        <div
          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
          style={
            changeType === "up"
              ? { backgroundColor: "rgba(34, 197, 94, 0.10)", color: "#22c55e" }
              : changeType === "down"
              ? { backgroundColor: "rgba(239, 68, 68, 0.10)", color: "#ef4444" }
              : { backgroundColor: "rgba(107, 122, 153, 0.10)", color: "#6b7a99" }
          }
        >
          {changeType === "up" && <TrendingUp size={10} />}
          {changeType === "down" && <TrendingDown size={10} />}
          {change}
        </div>
      </div>
      <div
        className="text-2xl font-bold mb-1 tracking-wide"
        style={{
          fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
          color: "#f8f8f7",
        }}
      >
        {value}
      </div>
      <div className="text-xs font-medium" style={{ color: "#6b7a99" }}>{label}</div>
    </div>
  );
}
