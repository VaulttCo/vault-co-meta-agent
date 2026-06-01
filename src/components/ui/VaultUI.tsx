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
// The primary section wrapper. Use for every distinct content block on a page.
// Replaces: raw `div` with surface/border styles, `SectionCard` from _components.tsx,
//           inline `bg-[#0D1520] border ...` patterns, and the `vc-card` utility class.
//
// DO NOT use for:
//   - Cards on the Command Hub (those have custom gradient styles)
//   - The Hermes prompt area (uses a different inner layout)
//   - Anything needing a custom border color that isn't the `accent` prop
//
// Usage:
//   <VCPanel>                          — standard panel
//   <VCPanel accent="blue">            — blue glow edge (Veronica sections)
//   <VCPanel accent="gold">            — gold glow edge (Revenue sections)
//   <VCPanel className="extra-class">  — passthrough className

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
// Standardized header row inside a VCPanel. Always the first child of a VCPanel.
// icon + title (+ optional micro-label) on the left, action slot on the right.
// Replaces: manual `px-5 py-4 border-b flex items-center justify-between` header divs.
//
// Usage:
//   <VCPanel>
//     <VCPanelHeader icon={Users} title="Clients" action={<VCActionLink href="/clients" />} />
//     ...body...
//   </VCPanel>
//
//   <VCPanelHeader icon={Bot} title="Veronica AI" live />       — shows green pulse dot
//   <VCPanelHeader label="Veronica AI" title="Clients" />       — micro-label above title

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
// Icon in a colored glow ring. Use for section intro icons, empty states, and
// module cards. NOT for nav items (those use plain lucide icons directly).
//
// Usage:
//   <VCGlowIcon icon={Bot} color="#0081f2" size={18} ringSize={40} />

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
// Premium stat tile with hover glow. The single KPI component for the whole app.
// Replaces: shared `StatCard` component, inline `StatTile` functions in ai-agent.
//
// EXCEPTION: `revenue-dashboard/clients/[clientId]/page.tsx` has its own local
// StatCard with different props (label/sub/icon/badge, gold theme) — do not
// replace that one; it serves a different layout contract.
//
// size="md" — dashboard overview grids (default, larger value)
// size="sm" — inside panels like Client Intelligence, Fulfillment Pipeline
// accent    — a CSS color string applied as a 2px top border (use sparingly)
// iconColor — when no icon, also controls value text color (e.g. "#22c55e" for active counts)
//
// Usage:
//   <VCStat label="Active Clients" value={5} />
//   <VCStat label="Pending" value={pendingCount} iconColor="#ff8400" size="sm" />
//   <VCStat label="Spend" value="$4,200" icon={DollarSign} iconColor="#a78bfa" />

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
// Semantic status pill for labeling states in panels and headers.
// Replaces ad-hoc inline badge spans (color/bg/border inline styles).
//
// COEXISTS WITH `Badge` from `@/components/ui/Badge` — Badge is used in tables
// for client status (success/warning/danger/neutral/blue/orange variants).
// VCStatusBadge adds `purple` and `gold` variants and an optional `dot` indicator.
// Do NOT remove Badge.tsx — 7 pages import it directly.
//
// Usage:
//   <VCStatusBadge label="Live" variant="success" dot />
//   <VCStatusBadge label="Phase 1" variant="gold" />
//   <VCStatusBadge label="Coming Soon" variant="neutral" />

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
// Tiny metadata chip — smaller than VCStatusBadge, no dot option.
// Use for category tags, type labels, source indicators.
//
// Usage:
//   <VCChip label="GHL" color="#22c55e" />
//   <VCChip label="roofing" />

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
// Centered empty or loading state — always inside a VCPanel or table wrapper.
// Pass `loading` for a spinner, or title+description+action for the empty case.
//
// Usage:
//   <VCEmptyState loading title="Loading clients…" />
//   <VCEmptyState icon={Users} title="No clients yet" description="Add your first client." action={<button>…</button>} />

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

// ─── VCSkeleton ──────────────────────────────────────────────────────────────
// Loading placeholder. Premium restraint — subtle pulsing rows instead of a bare
// "Loading…" string. Use inside panels while data is being fetched.
//
// Usage:
//   <VCSkeleton rows={3} />

export function VCSkeleton({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded-full animate-pulse"
          style={{ backgroundColor: "var(--t-surface-3)", width: `${92 - i * 14}%` }}
        />
      ))}
      <span className="sr-only">Loading…</span>
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
// Horizontal row of filter pills (tab-style, single selection).
// Replaces manual `vc-filter-pill` button loops.
//
// Usage:
//   <VCFilterBar options={["All","Active","Paused"]} active={filter} onChange={setFilter} />

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
// Search field with left magnifier icon. Always pair with VCFilterBar on list pages.
// Uses `vc-input` class for consistent focus glow (no JS onFocus/onBlur needed).
//
// Usage:
//   <VCSearchInput value={q} onChange={setQ} placeholder="Search clients…" className="max-w-xs" />

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
// Small muted right-arrow link. Always the `action` prop of VCPanelHeader.
// Renders as a Next.js Link — no router push needed.
//
// Usage:
//   <VCPanelHeader ... action={<VCActionLink href="/clients" />} />
//   <VCPanelHeader ... action={<VCActionLink href="/approvals" label="Review" />} />

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

// ─── VCButton ────────────────────────────────────────────────────────────────
// Standard CTA button. Three variants:
//   orange — primary actions (Add Client, Generate, Submit)
//   blue   — secondary AI/navigation actions
//   ghost  — tertiary / cancel actions
//
// For the Add Client button in PageHeader.action, use a raw <button> with
// `backgroundColor: "#ff8400"` — PageHeader is not inside a VCPanel.
//
// Usage:
//   <VCButton onClick={handleSave}>Save Draft</VCButton>
//   <VCButton variant="blue" size="sm"><Plus size={12} /> Add</VCButton>
//   <VCButton variant="ghost" onClick={onClose}>Cancel</VCButton>

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
// 8px colored circle for urgent/high/medium/low priority in task lists.
// Also exports `priorityColors` map for programmatic color lookup.
//
// Usage:
//   <VCPriorityDot priority="urgent" />
//   <span style={{ color: priorityColors[task.priority] }}>{task.priority}</span>

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
// Micro uppercase label rendered above a section title or stat group.
// Wraps the `vc-label` CSS class. Use in page bodies, not inside VCPanelHeader
// (VCPanelHeader has its own `label` prop for this).
//
// Usage:
//   <VCSectionLabel>Executive Revenue Snapshot</VCSectionLabel>
//   <h2 className="text-[18px] font-bold">…</h2>

export function VCSectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="vc-label mb-1">{children}</p>;
}

// ─── VCPageWrapper ────────────────────────────────────────────────────────────
// Standard page content wrapper. Constrains width and adds vertical spacing
// between sections. Use as the root element of every page's return value.
// Most existing pages use `max-w-7xl mx-auto space-y-5` inline — this is
// the canonical equivalent. Migrate gradually; do not break existing layouts.
//
// Usage:
//   return (
//     <VCPageWrapper>
//       <PageHeader ... />
//       <VCPanel>…</VCPanel>
//     </VCPageWrapper>
//   );

export function VCPageWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`max-w-7xl mx-auto space-y-5 ${className}`}>
      {children}
    </div>
  );
}

// ─── VCBentoCell ─────────────────────────────────────────────────────────────
// Promoted from src/components/sandbox/VaultCommandBentoGrid.tsx.
// Bento grid cell with gradient border, spotlight hover, and staggered entry.
// Cells assemble into a CSS grid on the consuming page (sm:grid-cols-3 pattern).
//
// Spotlight and stagger animations are fully gated on useReducedMotion().
// Border radius: 12px outer / 11px inner — matches system maximum (rounded-xl).
// Fixes from sandbox: borderRadius 16→12, 15→11.
//
// Usage:
//   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
//     <VCBentoCell index={0} colSpan={2} accent="#0081f2" minHeight={320}>
//       {children}
//     </VCBentoCell>
//     <VCBentoCell index={1} colSpan={1} rowSpan={2} accent="#22c55e">
//       {children}
//     </VCBentoCell>
//   </div>

import { useState, useRef, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface VCBentoCellProps {
  children: React.ReactNode;
  /** Stagger index — cell N enters with delay N × 60ms. Default 0. */
  index?: number;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
  /** CSS color string for gradient border and spotlight. Default Vault Co blue. */
  accent?: string;
  minHeight?: number;
  className?: string;
}

export function VCBentoCell({
  children,
  index = 0,
  colSpan = 1,
  rowSpan = 1,
  accent = "#0081f2",
  minHeight = 160,
  className = "",
}: VCBentoCellProps) {
  const reduced = useReducedMotion() ?? false;
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
      className={`col-span-1 ${colClass} ${rowClass} ${className}`}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      style={{ minHeight }}
    >
      {/* 1px gradient border via padding trick */}
      <div
        style={{
          height: "100%",
          padding: "1px",
          borderRadius: 12,
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
            borderRadius: 11,
            backgroundColor: "var(--t-surface)",
            overflow: "hidden",
          }}
        >
          {/* Spotlight overlay — disabled when reduced motion or not hovered */}
          {hovered && !reduced && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 11,
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
