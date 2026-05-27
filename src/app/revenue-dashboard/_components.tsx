"use client";

// Shared UI components for the Revenue Dashboard portal.
// Underscore prefix keeps this file out of Next.js routing.

import Link from "next/link";
import { ChevronRight, ArrowLeft, CheckCircle2, ToggleLeft, ToggleRight, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { GOLD, GOLD_BG, GOLD_BORDER } from "@/lib/revenue/calculations";

// ─── Page-level loading / error / empty state components ─────────────────────

export function PageLoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 size={22} className="animate-spin" style={{ color: GOLD }} />
      <p className="text-[13px]" style={{ color: "var(--t-dim)" }}>{message}</p>
    </div>
  );
}

export function PageErrorState({
  message = "Unable to load data.",
  detail,
  onRetry,
}: {
  message?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
        <AlertTriangle size={20} style={{ color: "#ef4444" }} />
      </div>
      <div className="text-center space-y-1">
        <p className="text-[14px] font-semibold" style={{ color: "var(--t-text)" }}>{message}</p>
        {detail && <p className="text-[12px]" style={{ color: "var(--t-dim)" }}>{detail}</p>}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 text-[12px] font-semibold px-4 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
          style={{ color: GOLD, backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
          <RefreshCw size={12} />
          Retry
        </button>
      )}
    </div>
  );
}

// ─── Layout wrappers ──────────────────────────────────────────────────────────

export function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl overflow-hidden ${className}`}
      style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  icon: Icon, title, badge, subtitle,
}: {
  icon: React.ElementType; title: string; badge?: React.ReactNode; subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
        <Icon size={13} style={{ color: GOLD }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold tracking-wide"
          style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
          {title}
        </div>
        {subtitle && <p className="text-[11px] mt-0.5" style={{ color: "var(--t-dim)" }}>{subtitle}</p>}
      </div>
      {badge}
    </div>
  );
}

// ─── Shared page header for sub-pages ────────────────────────────────────────

export function RevenuePageHeader({
  title, subtitle, badge,
}: {
  title: string; subtitle?: string; badge?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl"
      style={{ backgroundColor: "var(--t-surface)", border: `1px solid ${GOLD_BORDER}`, boxShadow: "var(--t-card-shadow)" }}>
      <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: "rgba(201,168,76,0.04)" }} />
      <div className="relative px-6 py-4 flex items-start justify-between gap-4">
        <div>
          <Link href="/revenue-dashboard"
            className="inline-flex items-center gap-1 text-[11px] font-medium mb-2"
            style={{ color: "rgba(107,122,153,0.7)" }}>
            <ArrowLeft size={10} /> Revenue Overview
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[20px] font-bold tracking-wide"
              style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && <p className="text-[12px] mt-0.5" style={{ color: "var(--t-muted)" }}>{subtitle}</p>}
        </div>
        <Link href="/" className="flex items-center gap-1 text-[11px] flex-shrink-0" style={{ color: "var(--t-dim)" }}>
          Command Hub <ChevronRight size={11} />
        </Link>
      </div>
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export function ProjectionBadge({ label = "PROJECTION" }: { label?: string }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ color: "#a78bfa", backgroundColor: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.20)" }}>
      {label}
    </span>
  );
}

export function EstimateBadge() {
  return (
    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ color: GOLD, backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
      ESTIMATE
    </span>
  );
}

export function PhaseBadge({ label = "PHASE 2" }: { label?: string }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.20)" }}>
      {label}
    </span>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────

export function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b" style={{ borderColor: "var(--t-border-nav)" }}>
        {cols.map((h) => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function TableEmpty({ colSpan, message, loading }: { colSpan: number; message: string; loading?: boolean }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-8 text-center">
        {loading ? (
          <div className="flex items-center justify-center gap-2" style={{ color: "var(--t-dim)" }}>
            <Loader2 size={13} className="animate-spin" />
            <span className="text-[12px]">Loading…</span>
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: "var(--t-dim)" }}>{message}</p>
        )}
      </td>
    </tr>
  );
}

// ─── Row components ───────────────────────────────────────────────────────────

export function EarningsRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: "var(--t-dim)" }}>{label}</span>
      <span className="text-[12px] font-semibold flex-shrink-0" style={{ color }}>{value}</span>
    </div>
  );
}

export function ScenarioRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: "var(--t-dim)" }}>{label}</span>
      <span className="text-[12px] font-bold flex-shrink-0" style={{ color }}>{value}</span>
    </div>
  );
}

export function PaymentStatusCell({ paid }: { paid: boolean }) {
  return paid ? (
    <div className="flex items-center gap-1">
      <CheckCircle2 size={12} style={{ color: "#22c55e" }} />
      <span className="text-[11px]" style={{ color: "#22c55e" }}>Pipeline ✓</span>
    </div>
  ) : (
    <span className="text-[11px]" style={{ color: "rgba(107,122,153,0.5)" }}>Billing Req.</span>
  );
}

// ─── Calculator inputs / outputs ──────────────────────────────────────────────

export function CalcInput({
  label, value, onChange, min = 0, max, prefix, suffix,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; prefix?: string; suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-bold uppercase tracking-widest"
        style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-[12px] flex-shrink-0" style={{ color: "var(--t-dim)" }}>{prefix}</span>}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.max(min, Math.min(max ?? Infinity, v)));
          }}
          className="w-full px-2.5 py-2 rounded-lg text-[13px] font-semibold bg-transparent outline-none"
          style={{
            backgroundColor: "rgba(0,129,242,0.04)",
            border: "1px solid rgba(61,79,110,0.25)",
            color: "var(--t-text)",
            fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
          }}
        />
        {suffix && <span className="text-[12px] flex-shrink-0" style={{ color: "var(--t-dim)" }}>{suffix}</span>}
      </div>
    </div>
  );
}

export function CalcOutput({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-3 space-y-1"
      style={{ backgroundColor: "rgba(0,129,242,0.03)", border: "1px solid rgba(61,79,110,0.15)" }}>
      <div className="text-[9px] font-bold uppercase tracking-widest"
        style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
        {label}
      </div>
      <div className="text-[18px] font-bold"
        style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color }}>
        {value}
      </div>
    </div>
  );
}

// ─── GHL / Invoice helpers ────────────────────────────────────────────────────

export function InvoiceStatusBadge({ active, ghlConnected }: { active: boolean; ghlConnected: boolean }) {
  if (!active) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: "rgba(107,122,153,0.7)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}>
      Not Active
    </span>
  );
  if (!ghlConnected) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)" }}>
      Needs GHL
    </span>
  );
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: "#0081f2", backgroundColor: "rgba(0,129,242,0.08)", border: "1px solid rgba(0,129,242,0.20)" }}>
      Ready to Invoice
    </span>
  );
}

export function RecurringToggle({
  clientId, isOn, isSaving, disabled, onToggle,
}: {
  clientId: string; isOn: boolean; isSaving: boolean; disabled?: boolean;
  onToggle: (clientId: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(clientId)}
      disabled={isSaving || disabled}
      className="flex items-center gap-1.5 transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed">
      {isSaving
        ? <Loader2 size={16} className="animate-spin" style={{ color: "rgba(107,122,153,0.5)" }} />
        : isOn
        ? <ToggleRight size={20} style={{ color: "#22c55e" }} />
        : <ToggleLeft  size={20} style={{ color: "rgba(107,122,153,0.5)" }} />}
      <span className="text-[10px] font-medium"
        style={{ color: isOn ? "#22c55e" : "rgba(107,122,153,0.5)" }}>
        {isSaving ? "Saving…" : isOn ? "Active" : "Off"}
      </span>
    </button>
  );
}

// ─── Billing connection empty state ───────────────────────────────────────────

export function BillingEmptyState() {
  return (
    <div className="relative overflow-hidden rounded-xl px-6 py-5"
      style={{ backgroundColor: "var(--t-surface)", border: `1px solid ${GOLD_BORDER}`, boxShadow: "var(--t-card-shadow)" }}>
      <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: "rgba(201,168,76,0.06)" }} />
      <div className="relative flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
          <span style={{ color: GOLD, fontSize: 18 }}>$</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold mb-1"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
            Invoice Tracking Requires Connected Billing Data
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-dim)" }}>
            Connect Stripe or manual invoice records to activate invoiced amounts, outstanding balances, and payout reporting.
            All figures on this dashboard are projections and estimates based on the Vault Co offer structure — no invoiced or confirmed amounts are shown until billing is connected.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {["Stripe — Not Connected", "Manual Invoice Records — Not Connected"].map((label) => (
              <span key={label} className="text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-not-allowed"
                style={{ color: "rgba(107,122,153,0.6)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Safety note ──────────────────────────────────────────────────────────────

export function SafetyNote({ text }: { text?: string }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5 rounded-xl"
      style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <span style={{ color: "var(--t-dim)", fontSize: 13, flexShrink: 0, marginTop: 1 }}>🛡</span>
      <p className="text-[11px] leading-snug" style={{ color: "var(--t-dim)" }}>
        {text ?? "Revenue Dashboard is read-only. No external writes · No Stripe or GHL calls · No invoice creation in Phase 1. Auth unchanged."}
      </p>
    </div>
  );
}
