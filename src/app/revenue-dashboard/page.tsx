"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp, DollarSign, Users, ChevronRight,
  Layers, BarChart3, Calculator, Trophy,
  Target, ArrowUpRight, Zap, RefreshCw,
} from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import {
  SETUP_FEE, M1_PAYMENT, JAXON_SETUP_PCT, NICK_SETUP_PCT,
  RECURRING_PCT, EST_JOBS_PER_MONTH, JAXON_PER_SETUP, NICK_PER_SETUP,
  GOLD, GOLD_BG, GOLD_BORDER,
  fmtCurrency, parseAmount,
} from "@/lib/revenue/calculations";
import {
  ProjectionBadge, EstimateBadge, EarningsRow, SectionCard,
  BillingEmptyState, SafetyNote,
} from "./_components";

export default function RevenueDashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDataProvider().getClients()
      .then(setClients).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const activeClients  = useMemo(() => clients.filter((c) => c.status === "active"),   [clients]);
  const setupClients   = useMemo(() => clients.filter((c) => c.status === "setup"),    [clients]);
  const revenueClients = useMemo(() => clients.filter((c) => c.status !== "archived"), [clients]);

  const { projectedSetupRevenue, projectedJaxonSetup, projectedNickSetup } = useMemo(() => {
    const rev = activeClients.length * SETUP_FEE + setupClients.length * M1_PAYMENT;
    return {
      projectedSetupRevenue: rev,
      projectedJaxonSetup:   rev * JAXON_SETUP_PCT,
      projectedNickSetup:    rev * NICK_SETUP_PCT,
    };
  }, [activeClients, setupClients]);

  const recurringPotential = useMemo(() =>
    activeClients.reduce((sum, c) => {
      const jobVal = parseAmount(c.avgJobValue);
      return sum + jobVal * EST_JOBS_PER_MONTH * RECURRING_PCT;
    }, 0),
  [activeClients]);

  const projectedNickTotal = useMemo(
    () => projectedNickSetup + recurringPotential,
    [projectedNickSetup, recurringPotential]
  );

  const subPages = [
    {
      href: "/revenue-dashboard/setup-pipeline",
      icon: Layers, label: "Setup Pipeline",
      desc: loading ? "Loading…" : `${revenueClients.length} clients · $${(SETUP_FEE / 1000).toFixed(0)}k per setup`,
      color: GOLD, bg: GOLD_BG, border: GOLD_BORDER,
    },
    {
      href: "/revenue-dashboard/partner-earnings",
      icon: Users, label: "Partner Earnings",
      desc: loading ? "Loading…" : `Jaxon ${fmtCurrency(projectedJaxonSetup)} · Nick ${fmtCurrency(projectedNickTotal)}`,
      color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.18)",
    },
    {
      href: "/revenue-dashboard/leaderboard",
      icon: Trophy, label: "Client Leaderboard",
      desc: loading ? "Loading…" : `${revenueClients.length} clients ranked by total value`,
      color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.18)",
    },
    {
      href: "/revenue-dashboard/forecast",
      icon: Calculator, label: "Forecast Calculator",
      desc: "Model earnings across any time horizon",
      color: "#0081f2", bg: "rgba(0,129,242,0.08)", border: "rgba(0,129,242,0.18)",
    },
    {
      href: "/revenue-dashboard/scenarios",
      icon: BarChart3, label: "Scenario Modeling",
      desc: "Low / Middle / High 12-month projections",
      color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.18)",
    },
    {
      href: "/revenue-dashboard/ghl-tracker",
      icon: RefreshCw, label: "GHL Revenue Tracker",
      desc: "Recurring billing toggles · Phase 2 invoice prep",
      color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.18)",
    },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl"
        style={{ backgroundColor: "var(--t-surface)", border: `1px solid ${GOLD_BORDER}`, boxShadow: "var(--t-card-shadow)" }}>
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: "rgba(201,168,76,0.05)" }} />
        <div className="relative px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <TrendingUp size={18} style={{ color: GOLD }} />
              <h1 className="text-[22px] font-bold tracking-wide"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                Vault Co Revenue Dashboard
              </h1>
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ color: GOLD, backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
                Phase 1
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ color: "rgba(107,122,153,0.7)", backgroundColor: "rgba(61,79,110,0.10)", border: "1px solid rgba(61,79,110,0.18)" }}>
                Billing Not Connected
              </span>
            </div>
            <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>
              Setup revenue · partner earnings · recurring projections · scenario modeling.
              All figures are projections until Stripe or Square is connected.
            </p>
          </div>
          <Link href="/" className="flex items-center gap-1 text-[11px] flex-shrink-0"
            style={{ color: "var(--t-dim)" }}>
            Command Hub <ChevronRight size={11} />
          </Link>
        </div>
      </div>

      {/* ── Executive Revenue Snapshot ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: GOLD }}>
            Executive Revenue Snapshot
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: GOLD_BORDER }} />
          <ProjectionBadge />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              label: "Gross Setup Revenue",
              value: loading ? "—" : fmtCurrency(projectedSetupRevenue),
              sub:   loading ? "" : `${activeClients.length + setupClients.length} clients in paid phases`,
              icon: DollarSign, color: GOLD, bg: GOLD_BG, border: GOLD_BORDER, badge: "projection",
            },
            {
              label: "Jaxon Earnings (57%)",
              value: loading ? "—" : fmtCurrency(projectedJaxonSetup),
              sub:   "Setup revenue × 0.57",
              icon: Users, color: "#0081f2", bg: "rgba(0,129,242,0.08)", border: "rgba(0,129,242,0.18)", badge: "projection",
            },
            {
              label: "Nick Setup Earnings (43%)",
              value: loading ? "—" : fmtCurrency(projectedNickSetup),
              sub:   "Setup revenue × 0.43",
              icon: Target, color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.18)", badge: "projection",
            },
            {
              label: "Recurring Revenue Potential",
              value: loading ? "—" : fmtCurrency(recurringPotential) + "/mo",
              sub:   `${activeClients.length} active clients · est. ${EST_JOBS_PER_MONTH} jobs/mo × 5%`,
              icon: ArrowUpRight, color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.18)", badge: "estimate",
            },
            {
              label: "Active Revenue Clients",
              value: loading ? "—" : String(activeClients.length),
              sub:   loading ? "" : `${revenueClients.length} total in pipeline`,
              icon: Zap, color: GOLD, bg: GOLD_BG, border: GOLD_BORDER, badge: "",
            },
            {
              label: "Nick Projected Monthly",
              value: loading ? "—" : fmtCurrency(projectedNickTotal),
              sub:   "Setup + recurring at current volume",
              icon: BarChart3, color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.18)", badge: "estimate",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl p-5 flex flex-col gap-3"
                style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}>
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: card.bg, border: `1px solid ${card.border}` }}>
                    <Icon size={14} style={{ color: card.color }} />
                  </div>
                  {card.badge === "projection" && <ProjectionBadge />}
                  {card.badge === "estimate"   && <EstimateBadge />}
                </div>
                <div>
                  <div className="text-[22px] font-bold"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: card.color }}>
                    {card.value}
                  </div>
                  <div className="text-[11px] font-medium mt-0.5" style={{ color: "var(--t-text)" }}>{card.label}</div>
                  {card.sub && <div className="text-[10px] mt-0.5" style={{ color: "var(--t-dim)" }}>{card.sub}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Small Partner Earnings Summary ──────────────────────────────────── */}
      <SectionCard>
        <div className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold uppercase tracking-wide"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                Partner Earnings Split
              </span>
              <ProjectionBadge />
            </div>
            <Link href="/revenue-dashboard/partner-earnings"
              className="flex items-center gap-1 text-[11px] font-medium"
              style={{ color: GOLD }}>
              Full Details <ChevronRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wide mb-2"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#0081f2" }}>
                Jaxon (Setup 57%)
              </div>
              <EarningsRow label="Projected Earnings" value={loading ? "—" : fmtCurrency(projectedJaxonSetup)} color="#0081f2" />
              <EarningsRow label="Per New Client"      value={fmtCurrency(JAXON_PER_SETUP)}                    color="#0081f2" />
              <EarningsRow label="Recurring Share"     value="$0"                                              color="rgba(107,122,153,0.5)" />
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wide mb-2"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#a78bfa" }}>
                Nick (Setup 43% + Recurring 100%)
              </div>
              <EarningsRow label="Projected Setup"      value={loading ? "—" : fmtCurrency(projectedNickSetup)}                   color="#a78bfa" />
              <EarningsRow label="Recurring Potential"  value={loading ? "—" : fmtCurrency(recurringPotential) + "/mo"}            color="#22c55e" />
              <EarningsRow label="Per New Client"       value={fmtCurrency(NICK_PER_SETUP)}                                       color="#a78bfa" />
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wide mb-2"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: GOLD }}>
                Vault Co (Setup + 5% Recurring)
              </div>
              <EarningsRow label="Gross Setup"         value={loading ? "—" : fmtCurrency(projectedSetupRevenue)}               color={GOLD} />
              <EarningsRow label="Recurring Potential" value={loading ? "—" : fmtCurrency(recurringPotential) + "/mo"}           color={GOLD} />
              <EarningsRow label="Setup Split"         value="57% Jaxon · 43% Nick"                                             color="var(--t-dim)" />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Small Setup Pipeline Summary ────────────────────────────────────── */}
      <SectionCard>
        <div className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold uppercase tracking-wide"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                Setup Revenue Pipeline
              </span>
              <ProjectionBadge label="BILLING REQ. FOR ACTUALS" />
            </div>
            <Link href="/revenue-dashboard/setup-pipeline"
              className="flex items-center gap-1 text-[11px] font-medium"
              style={{ color: GOLD }}>
              Full Pipeline <ChevronRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "In Pipeline",       value: loading ? "—" : String(revenueClients.length),                          color: "var(--t-text)" },
              { label: "M1 Due",            value: loading ? "—" : String(setupClients.length),                            color: "#f59e0b"       },
              { label: "Fully Active",      value: loading ? "—" : String(activeClients.length),                           color: "#22c55e"       },
              { label: "Gross Setup Value", value: loading ? "—" : fmtCurrency(revenueClients.length * SETUP_FEE),         color: GOLD            },
            ].map((item) => (
              <div key={item.label} className="rounded-lg p-3 text-center"
                style={{ backgroundColor: "rgba(0,129,242,0.03)", border: "1px solid rgba(61,79,110,0.12)" }}>
                <div className="text-[18px] font-bold"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: item.color }}>
                  {item.value}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--t-dim)" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── Small GHL Revenue Share Summary ────────────────────────────────── */}
      <SectionCard>
        <div className="p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold uppercase tracking-wide"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                GHL Revenue Share Tracker
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)" }}>
                PHASE 2
              </span>
            </div>
            <Link href="/revenue-dashboard/ghl-tracker"
              className="flex items-center gap-1 text-[11px] font-medium"
              style={{ color: GOLD }}>
              Manage Toggles <ChevronRight size={11} />
            </Link>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-dim)" }}>
            Configure recurring billing toggles for each active client. GHL Closed Won sync and Stripe invoice creation require Phase 2 connections.
            {!loading && activeClients.length > 0 && (
              <> {activeClients.length} active client{activeClients.length !== 1 ? "s" : ""} eligible for recurring billing.</>
            )}
          </p>
        </div>
      </SectionCard>

      {/* ── Revenue Portal Quick Nav ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: GOLD }}>
            Revenue Portal
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: GOLD_BORDER }} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {subPages.map((page) => {
            const Icon = page.icon;
            return (
              <Link key={page.href} href={page.href}
                className="rounded-xl p-4 flex items-center gap-3 group transition-colors"
                style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = page.border; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--t-border)"; }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: page.bg, border: `1px solid ${page.border}` }}>
                  <Icon size={15} style={{ color: page.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                    {page.label}
                  </div>
                  <div className="text-[10px] mt-0.5 truncate" style={{ color: "var(--t-dim)" }}>{page.desc}</div>
                </div>
                <ChevronRight size={13} className="flex-shrink-0" style={{ color: "var(--t-dim)" }} />
              </Link>
            );
          })}
        </div>
      </div>

      <BillingEmptyState />
      <SafetyNote />

    </div>
  );
}
