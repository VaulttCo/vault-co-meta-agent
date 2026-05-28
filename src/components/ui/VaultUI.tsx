/**
 * Vault Co UI System
 *
 * Single source of truth for all reusable Vault Co UI primitives.
 * Every page and feature in this app should use these components
 * to maintain the premium dark command-center aesthetic.
 *
 * Design tokens live in src/app/globals.css (@theme inline + :root)
 *
 * Color palette:
 *   Blue accent:   #0081f2   (primary glow, active nav, cta)
 *   Amber/gold:    #c9a84c   (priority states, revenue highlights)
 *   Orange:        #ff8400   (warnings, CTA buttons, onboarding)
 *   Success:       #22c55e   (live/active status)
 *   Danger:        #ef4444   (error, blocked, urgent)
 *
 * CSS var tokens (set in globals.css :root):
 *   --t-bg         page background
 *   --t-surface    card/panel background
 *   --t-surface-2  nested element background
 *   --t-border     default border
 *   --t-border-subtle  very faint border
 *   --t-text       primary text
 *   --t-text-body  body text
 *   --t-muted      secondary/placeholder text
 *   --t-dim        very dim decorative text
 *   --t-input-bg   form input background
 *   --t-sidebar-bg sidebar background
 */

"use client";

import { LucideIcon, TrendingUp, TrendingDown, Loader2, AlertTriangle } from "lucide-react";

// ─── VCPanel ────────────────────────────────────────────────────────────────
// The primary section wrapper. Use for every distinct content block.
// Replaces raw div + vc-card / SectionCard / inline surface styles.

interface VCPanelProps {
  children: React.ReactNode;
  className?: string;
  /** Adds a subtle left-colored glow edge */
  accent?: "blue" | "gold" | "orange" | "green" | "red" | "purple";
}

const accentBorder: Record<string, string> = {
  blue:   "rgba(0,129,242,0.30)",
  gold:   "rgba(201,168,76,0.30)",
  orange: "rgba(255,132,0,0.28)",
  green:  "rgba(34,197,94,0.28)",
  red:    "rgba(239,68,68,0.28)",
  purple: "rgba(167,139,250,0.28)",
};

const accentGlow: Record<string, string> = {
  blue:   "0 0 20px rgba(0,129,242,0.07)",
  gold:   "0 0 20px rgba(201,168,76,0.07)",
  orange: "0 0 20px rgba(255,132,0,0.07)",
  green:  "0 0 20px rgba(34,197,94,0.07)",
  red:    "0 0 20px rgba(239,68,68,0.07)",
  purple: "0 0 20px rgba(167,139,250,0.07)",
};

export function VCPanel({ children, className = "", accent }: VCPanelProps) {
  return (
    <div
      className={`vc-panel ${className}`}
      style={
        accent
          ? {
              borderColor: accentBorder[accent],
              boxShadow: `var(--t-card-shadow), ${accentGlow[accent]}`,
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

// ─── VCPanelHeader ───────────────────────────────────────────────────────────
// Standardized header row inside a VCPanel.
// icon + title (+ optional label) on the left, action slot on the right.

interface VCPanelHeaderProps {
  icon?: LucideIcon;
  iconColor?: string;
  label?: string;
  title: string;
  action?: React.ReactNode;
  /** Renders a live status dot before the title */
  live?: boolean;
}

export function VCPanelHeader({
  icon: Icon,
  iconColor = "#0081f2",
  label,
  title,
  action,
  live,
}: VCPanelHeaderProps) {
  return (
    <div className="vc-panel-header">
      <div className="flex flex-col gap-0.5 min-w-0">
        {label && <span className="vc-label">{label}</span>}
        <div className="flex items-center gap-2">
          {live && <span className="vc-dot vc-dot-live" />}
          {Icon && <Icon size={14} style={{ color: iconColor, flexShrink: 0 }} />}
          <span
            className="text-[13px] font-semibold truncate"
            style={{ color: "var(--t-text)" }}
          >
            {title}
          </span>
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ─── VCGlowIcon ─────────────────────────────────────────────────────────────
// Icon in a glowing ring — used for section intro icons and module cards.

interface VCGlowIconProps {
  icon: LucideIcon;
  color?: string;
  size?: number;
  ringSize?: number;
}

export function VCGlowIcon({
  icon: Icon,
  color = "#0081f2",
  size = 16,
  ringSize = 36,
}: VCGlowIconProps) {
  return (
    <div
      className="vc-icon-ring flex-shrink-0"
      style={{
        width: ringSize,
        height: ringSize,
        background: `radial-gradient(circle at 40% 40%, ${color}28 0%, ${color}08 70%)`,
        border: `1px solid ${color}30`,
        boxShadow: `0 0 14px ${color}22`,
      }}
    >
      <Icon size={size} style={{ color }} />
    </div>
  );
}

// ─── VCStat ─────────────────────────────────────────────────────────────────
// Premium stat tile. Use wherever a numeric KPI is displayed.
// Replaces both StatCard (big card) and StatTile (inline tile) patterns.

interface VCStatProps {
  label: string;
  value: string | number | null;
  /** Trend badge */
  change?: string;
  changeType?: "up" | "down" | "neutral";
  /** Optional icon in top-left */
  icon?: LucideIcon;
  iconColor?: string;
  /** Top accent bar color (CSS color string) */
  accent?: string;
  /** Size variant */
  size?: "sm" | "md";
}

export function VCStat({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "#0081f2",
  accent,
  size = "md",
}: VCStatProps) {
  const isSm = size === "sm";
  return (
    <div
      className="vc-stat-card"
      style={
        accent
          ? {
              borderTopColor: accent,
              borderTopWidth: "2px",
            }
          : undefined
      }
    >
      {Icon && (
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
      )}
      <div
        className={isSm ? "text-[22px] font-bold leading-none" : "text-[26px] font-bold leading-none"}
        style={{
          fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
          color: iconColor === "#0081f2" ? "var(--t-text)" : iconColor,
        }}
      >
        {value === null ? "—" : value}
      </div>
      <div
        className={`font-medium mt-1.5 leading-tight ${isSm ? "text-[10px]" : "text-[11px]"}`}
        style={{ color: "var(--t-muted)" }}
      >
        {label}
      </div>
      {!Icon && change && (
        <div className="mt-2">
          <div
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={
              changeType === "up"
                ? { backgroundColor: "rgba(34,197,94,0.10)", color: "#22c55e" }
                : changeType === "down"
                ? { backgroundColor: "rgba(239,68,68,0.10)", color: "#ef4444" }
                : { backgroundColor: "rgba(107,122,153,0.10)", color: "#6b7a99" }
            }
          >
            {changeType === "up" && <TrendingUp size={8} />}
            {changeType === "down" && <TrendingDown size={8} />}
            {change}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VCStatusBadge ───────────────────────────────────────────────────────────
// Semantic status pill. Replaces ad-hoc inline badge spans.

type StatusVariant = "success" | "warning" | "danger" | "neutral" | "blue" | "orange" | "purple" | "gold";

interface VCStatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  dot?: boolean;
}

const badgeStyles: Record<StatusVariant, React.CSSProperties> = {
  success: { color: "#22c55e", backgroundColor: "rgba(34,197,94,0.10)",   border: "1px solid rgba(34,197,94,0.22)"   },
  warning: { color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.10)",  border: "1px solid rgba(245,158,11,0.20)"  },
  danger:  { color: "#ef4444", backgroundColor: "rgba(239,68,68,0.10)",   border: "1px solid rgba(239,68,68,0.22)"   },
  neutral: { color: "#6b7a99", backgroundColor: "rgba(107,122,153,0.10)", border: "1px solid rgba(107,122,153,0.20)" },
  blue:    { color: "#0081f2", backgroundColor: "rgba(0,129,242,0.10)",   border: "1px solid rgba(0,129,242,0.22)"   },
  orange:  { color: "#ff8400", backgroundColor: "rgba(255,132,0,0.10)",   border: "1px solid rgba(255,132,0,0.22)"   },
  purple:  { color: "#b89eff", backgroundColor: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.20)" },
  gold:    { color: "#c9a84c", backgroundColor: "rgba(201,168,76,0.10)",  border: "1px solid rgba(201,168,76,0.22)"  },
};

export function VCStatusBadge({ label, variant = "neutral", dot }: VCStatusBadgeProps) {
  const style = badgeStyles[variant];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={style}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: style.color as string }}
        />
      )}
      {label}
    </span>
  );
}

// ─── VCChip ──────────────────────────────────────────────────────────────────
// Tiny tag / metadata chip. Smaller than VCStatusBadge.

interface VCChipProps {
  label: string;
  color?: string;
}

export function VCChip({ label, color = "#6b7a99" }: VCChipProps) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
      style={{
        color,
        backgroundColor: `${color}14`,
        border: `1px solid ${color}28`,
      }}
    >
      {label}
    </span>
  );
}

// ─── VCEmptyState ─────────────────────────────────────────────────────────────
// Centered empty / loading state for panels and tables.

interface VCEmptyStateProps {
  loading?: boolean;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}

export function VCEmptyState({
  loading,
  title = "Nothing here yet",
  description,
  action,
  icon: Icon,
}: VCEmptyStateProps) {
  if (loading) {
    return (
      <div className="vc-empty-state">
        <Loader2 size={18} className="animate-spin" style={{ color: "#0081f2" }} />
        <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>
          {title}
        </p>
      </div>
    );
  }

  return (
    <div className="vc-empty-state">
      {Icon && (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: "rgba(0,129,242,0.06)",
            border: "1px solid rgba(0,129,242,0.14)",
          }}
        >
          <Icon size={18} style={{ color: "var(--t-dim)" }} />
        </div>
      )}
      {!Icon && (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: "rgba(107,122,153,0.07)",
            border: "1px solid rgba(107,122,153,0.14)",
          }}
        >
          <AlertTriangle size={16} style={{ color: "var(--t-dim)" }} />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>
          {title}
        </p>
        {description && (
          <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── VCDivider ───────────────────────────────────────────────────────────────
// Subtle horizontal separator.

export function VCDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-px w-full ${className}`}
      style={{ backgroundColor: "var(--t-border-subtle)" }}
    />
  );
}

// ─── VCFilterBar ─────────────────────────────────────────────────────────────
// Horizontal filter pill row.

interface VCFilterBarProps<T extends string> {
  options: T[];
  active: T;
  onChange: (v: T) => void;
}

export function VCFilterBar<T extends string>({
  options,
  active,
  onChange,
}: VCFilterBarProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`vc-filter-pill ${opt === active ? "active" : ""}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── VCSearchInput ────────────────────────────────────────────────────────────
// Search field with magnifier icon — used at top of list/table pages.

import { Search } from "lucide-react";

interface VCSearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function VCSearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}: VCSearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={13}
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "var(--t-dim)" }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="vc-input pl-8 pr-3 py-2"
      />
    </div>
  );
}

// ─── VCActionLink ─────────────────────────────────────────────────────────────
// Small "View all →" style link used in panel headers.

import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface VCActionLinkProps {
  href: string;
  label?: string;
}

export function VCActionLink({ href, label = "View all" }: VCActionLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 text-[11px] font-medium transition-opacity opacity-60 hover:opacity-100"
      style={{ color: "var(--t-muted)" }}
    >
      {label}
      <ArrowRight size={10} />
    </Link>
  );
}

// ─── VCButtonPrimary ─────────────────────────────────────────────────────────
// The primary CTA button (orange).

interface VCButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  size?: "sm" | "md";
  variant?: "orange" | "blue" | "ghost";
}

const btnBase =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const btnVariants: Record<string, string> = {
  orange: "text-white",
  blue:   "text-white",
  ghost:  "",
};

const btnSizes: Record<string, string> = {
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-4 py-2 text-[13px]",
};

export function VCButton({
  onClick,
  children,
  disabled,
  type = "button",
  size = "md",
  variant = "orange",
}: VCButtonProps) {
  const inlineStyle: React.CSSProperties =
    variant === "orange"
      ? { backgroundColor: "#ff8400" }
      : variant === "blue"
      ? { backgroundColor: "#0081f2" }
      : {
          backgroundColor: "transparent",
          border: "1px solid var(--t-border)",
          color: "var(--t-muted)",
        };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${btnBase} ${btnVariants[variant]} ${btnSizes[size]}`}
      style={inlineStyle}
    >
      {children}
    </button>
  );
}

// ─── VCPriorityDot ────────────────────────────────────────────────────────────
// Colored dot for priority levels in task/queue tables.

type Priority = "urgent" | "high" | "medium" | "low";

const priorityColors: Record<Priority, string> = {
  urgent: "#ef4444",
  high:   "#ff8400",
  medium: "#0081f2",
  low:    "rgba(107,122,153,0.6)",
};

export function VCPriorityDot({ priority }: { priority: Priority }) {
  const color = priorityColors[priority] ?? priorityColors.low;
  return (
    <span
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
      title={priority}
    />
  );
}

export { priorityColors };

// ─── VCSectionLabel ───────────────────────────────────────────────────────────
// Micro uppercase label used above section headings.

export function VCSectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="vc-label mb-1">{children}</p>;
}

// ─── VCPageWrapper ────────────────────────────────────────────────────────────
// Standard page content wrapper — max width + consistent padding.

export function VCPageWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`max-w-7xl mx-auto space-y-5 ${className}`}>
      {children}
    </div>
  );
}
