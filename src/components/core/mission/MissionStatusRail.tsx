"use client";

// Vault OS Mission Control — Executive Status Rail (Section 6).
// Condensed governance / system-health strip. These are permanent safety gates,
// not live metrics; all are engaged by design. The count of gates here is the
// truthful basis for the Command Header's "System Health" KPI.

import { Lock, ShieldCheck, EyeOff, Database, CheckSquare, type LucideIcon } from "lucide-react";

interface Gate {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: LucideIcon;
}

export const SAFETY_GATES: Gate[] = [
  { label: "Auth Active",                 color: "#22c55e", bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.22)",   icon: Lock        },
  { label: "Approval Gate Active",        color: "#0081f2", bg: "rgba(0,129,242,0.10)",   border: "rgba(0,129,242,0.22)",   icon: ShieldCheck },
  { label: "Meta Read-Only",              color: "#a78bfa", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.22)", icon: EyeOff      },
  { label: "GHL Read-Only",               color: "#f59e0b", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.20)",  icon: Database    },
  { label: "External Execution Disabled", color: "#ff8400", bg: "rgba(255,132,0,0.10)",   border: "rgba(255,132,0,0.22)",   icon: CheckSquare },
];

export function MissionStatusRail() {
  return (
    <div className="hub-fade-up w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {SAFETY_GATES.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(0,0,0,0.30)", border: `1px solid ${s.border}` }}
            >
              <Icon size={13} style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold leading-tight truncate" style={{ color: s.color }}>{s.label}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--t-dim)" }}>Active</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
