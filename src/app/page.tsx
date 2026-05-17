"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Users,
  CalendarCheck,
  TrendingDown,
  Megaphone,
  Bot,
  AlertCircle,
  ChevronRight,
  Zap,
  CheckSquare,
  Activity,
  WifiOff,
  Lock,
  ShieldCheck,
  Database,
  EyeOff,
  BarChart3,
  Mic2,
  ArrowRight,
  Clock,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import { usePlans } from "@/components/PlanProvider";

const agentLog = [
  { time: "System", action: "Veronica is online and ready to generate campaign drafts, analyse creatives, and prepare weekly reports.", type: "blue" },
  { time: "Tip", action: "Open a client, run Client Intelligence extraction, then use Veronica Console to generate a live Anthropic campaign draft.", type: "success" },
  { time: "Reminder", action: "All AI-generated drafts require human approval before any campaign can be marked Ready for Meta.", type: "neutral" },
];

const securityPillars = [
  {
    icon: Lock,
    label: "Secure Internal Access",
    desc: "Protected login and authenticated access for Vault Co operators.",
    color: "#0081f2",
    bg: "rgba(0,129,242,0.08)",
    border: "rgba(0,129,242,0.18)",
  },
  {
    icon: ShieldCheck,
    label: "Role-Based Permissions",
    desc: "Admin, media buyer, setter, and future client-viewer roles control what each user can access.",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.08)",
    border: "rgba(167,139,250,0.18)",
  },
  {
    icon: CheckSquare,
    label: "Approval-Gated Execution",
    desc: "Veronica can draft, organize, and recommend. Live actions require human approval.",
    color: "#ff8400",
    bg: "rgba(255,132,0,0.08)",
    border: "rgba(255,132,0,0.18)",
  },
  {
    icon: Database,
    label: "Protected Client Data",
    desc: "Client integrations, intelligence, drafts, and task data stay inside the internal portal.",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.18)",
  },
  {
    icon: EyeOff,
    label: "No External Actions Without Approval",
    desc: "No Meta campaigns, GHL workflows, SMS, emails, or budgets are changed automatically.",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.18)",
  },
];

const statusStrip = [
  { label: "Auth Active", color: "#22c55e", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.20)", icon: Lock },
  { label: "Approval Gate Active", color: "#0081f2", bg: "rgba(0,129,242,0.10)", border: "rgba(0,129,242,0.20)", icon: ShieldCheck },
  { label: "Meta Read-Only", color: "#a78bfa", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.20)", icon: EyeOff },
  { label: "GHL Read-Only", color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.20)", icon: Database },
  { label: "External Execution Disabled", color: "#ff8400", bg: "rgba(255,132,0,0.10)", border: "rgba(255,132,0,0.20)", icon: CheckSquare },
];

export default function CommandHubPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTaskCount, setOpenTaskCount] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState("");
  const { plans } = usePlans();
  const router = useRouter();

  useEffect(() => {
    getDataProvider().getClients().then((data) => {
      setClients(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/operator-tasks")
      .then((r) => r.ok ? r.json() : { tasks: [] })
      .then((d) => {
        const open = (d.tasks ?? []).filter(
          (t: { status: string }) => t.status === "open" || t.status === "in_progress"
        ).length;
        setOpenTaskCount(open);
      })
      .catch(() => {});
  }, []);

  function enterModule(href: string, label: string) {
    setTransitionLabel(label);
    setTransitioning(true);
    setTimeout(() => router.push(href), 750);
  }

  const activeClients = clients.filter((c) => c.status === "active");
  const totalSpend = activeClients.reduce((sum, c) => sum + parseInt((c.stats?.spend ?? "$0").replace(/\D/g, "") || "0"), 0);
  const totalLeads = activeClients.reduce((sum, c) => sum + (c.stats?.leads ?? 0), 0);
  const totalBooked = activeClients.reduce((sum, c) => sum + (c.stats?.booked ?? 0), 0);
  const avgCpl = totalLeads > 0 ? `$${(totalSpend / totalLeads).toFixed(0)}` : "—";

  const stats = [
    { label: "Total Ad Spend", value: loading ? "—" : `$${totalSpend.toLocaleString()}`, icon: DollarSign, iconColor: "#ff8400" },
    { label: "Leads Generated", value: loading ? "—" : totalLeads.toString(), icon: Users, iconColor: "#0081f2" },
    { label: "Booked Appointments", value: loading ? "—" : totalBooked.toString(), icon: CalendarCheck, iconColor: "#22c55e" },
    { label: "Avg. Cost Per Lead", value: loading ? "—" : avgCpl, icon: TrendingDown, iconColor: "#a78bfa" },
  ];

  const pendingDrafts = plans.filter((p) => p.status === "needs_review").slice(0, 3);
  const pendingCount = plans.filter((p) => p.status === "needs_review").length;
  const blockedClients = loading ? null : clients.filter((c) => c.status !== "active").length;

  const veronicaStats = [
    { label: "Pending Approvals", value: pendingCount },
    { label: "Open Operator Tasks", value: openTaskCount },
    { label: "Clients Pending Launch", value: blockedClients },
    { label: "Drafts Needing Review", value: pendingCount },
  ];

  const activeCampaignRows = clients.flatMap((client) =>
    (client.campaigns ?? [])
      .filter((c) => c.status === "active")
      .map((c) => ({ ...c, clientName: client.name, market: client.market }))
  );

  return (
    <>
      <style>{`
        @keyframes vaultSweep {
          0%   { transform: translateX(-120%) skewX(-12deg); opacity: 0; }
          30%  { opacity: 0.7; }
          100% { transform: translateX(220%) skewX(-12deg); opacity: 0; }
        }
        @keyframes vaultFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes vaultGlow {
          0%, 100% { text-shadow: 0 0 18px rgba(201,168,76,0.45), 0 0 36px rgba(201,168,76,0.2); }
          50%       { text-shadow: 0 0 28px rgba(201,168,76,0.75), 0 0 56px rgba(201,168,76,0.38); }
        }
        @keyframes vaultDot {
          0%, 100% { opacity: 0.25; transform: scale(0.8); }
          50%       { opacity: 1;    transform: scale(1.15); }
        }
        .vault-overlay     { animation: vaultFadeIn 0.18s ease forwards; }
        .vault-sweep       { animation: vaultSweep 1s ease 0.08s forwards; }
        .vault-wordmark    { animation: vaultGlow 1.8s ease-in-out infinite; }
        .vault-dot-0       { animation: vaultDot 0.9s ease-in-out 0s    infinite; }
        .vault-dot-1       { animation: vaultDot 0.9s ease-in-out 0.25s infinite; }
        .vault-dot-2       { animation: vaultDot 0.9s ease-in-out 0.5s  infinite; }
        .module-card       { transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease; }
        .module-card:hover { transform: translateY(-3px); }
        .module-cta        { transition: background 0.18s ease, box-shadow 0.18s ease; }
        .module-cta:hover  { filter: brightness(1.12); }
      `}</style>

      {/* ── Transition overlay ────────────────────────────────────────── */}
      {transitioning && (
        <div
          className="vault-overlay fixed inset-0 flex flex-col items-center justify-center"
          style={{ zIndex: 9999, backgroundColor: "#07090e" }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="vault-sweep absolute inset-y-0 w-48"
              style={{
                left: 0,
                background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.15), rgba(232,201,122,0.09), transparent)",
              }}
            />
          </div>
          <div className="relative flex flex-col items-center gap-5">
            <Image src="/vaultco-logo.png" alt="Vault Co" width={54} height={54} className="object-contain" priority />
            <div
              className="vault-wordmark text-[26px] font-bold tracking-[0.2em] uppercase"
              style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#c9a84c" }}
            >
              Vault Co
            </div>
            <p
              className="text-[11px] uppercase tracking-[0.22em]"
              style={{ color: "rgba(201,168,76,0.55)" }}
            >
              {transitionLabel}
            </p>
            <div className="flex gap-2 mt-1">
              <span className="vault-dot-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#c9a84c" }} />
              <span className="vault-dot-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#c9a84c" }} />
              <span className="vault-dot-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#c9a84c" }} />
            </div>
          </div>
          <div
            className="absolute bottom-8 text-[9px] tracking-[0.22em] uppercase"
            style={{ color: "rgba(201,168,76,0.25)" }}
          >
            Security-first · AI-assisted · Approval-gated
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Command Hub hero ─────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-xl"
          style={{
            backgroundColor: "var(--t-surface)",
            border: "1px solid var(--t-border)",
            boxShadow: "var(--t-card-shadow)",
          }}
        >
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(0,129,242,0.07)" }} />
          <div className="absolute -top-16 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(201,168,76,0.05)" }} />
          <div className="relative px-6 py-5">
            <div className="flex items-start gap-5">
              <Image src="/vaultco-logo.png" alt="Vault Co" width={52} height={52} className="object-contain flex-shrink-0 mt-0.5" priority />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <h1
                    className="text-[22px] font-bold tracking-wide"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
                  >
                    Vault Co Command Hub
                  </h1>
                  <span
                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                    style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)" }}
                  >
                    <Lock size={8} />
                    Security-first command system
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  Internal operating system for client launch, fulfillment, approvals, revenue visibility, and AI-assisted execution.
                </p>
                <p className="text-[11px] mt-1 font-medium" style={{ color: "rgba(201,168,76,0.65)", letterSpacing: "0.02em" }}>
                  Security-first. AI-assisted. Approval-gated. Operator-controlled. Built for scale.
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--t-dim)" }}>
                  {loading ? "Loading…" : `${clients.length} clients · ${activeClients.length} active`} · Veronica monitoring 24/7
                </p>
              </div>
              <div
                className="hidden lg:flex items-center gap-0 flex-shrink-0 divide-x"
                style={{ borderColor: "var(--t-border-nav)" }}
              >
                {[
                  { label: "Active Clients", value: loading ? "—" : String(activeClients.length), color: "#0081f2" },
                  { label: "Leads (MTD)", value: loading ? "—" : String(totalLeads), color: "#22c55e" },
                  { label: "Pending Approvals", value: String(pendingCount), color: "#ff8400" },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center px-5 py-1" style={{ borderColor: "var(--t-border-nav)" }}>
                    <span className="text-[20px] font-bold" style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: s.color }}>
                      {s.value}
                    </span>
                    <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap" style={{ color: "var(--t-muted)" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── System status strip ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {statusStrip.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(0,0,0,0.25)", border: `1px solid ${s.border}` }}
                >
                  <Icon size={13} style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold leading-tight truncate" style={{ color: s.color }}>{s.label}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.28)" }}>Active</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Hub modules ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* 1 — Veronica Meta AI */}
          <div
            className="module-card rounded-xl overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(140deg, rgba(0,129,242,0.10) 0%, rgba(13,14,18,0.97) 55%)",
              border: "1px solid rgba(0,129,242,0.24)",
              boxShadow: "0 4px 28px rgba(0,129,242,0.12), 0 1px 0 rgba(255,255,255,0.04) inset",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="p-5 flex-1 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "radial-gradient(circle at 40% 40%, rgba(0,129,242,0.28) 0%, rgba(0,129,242,0.07) 70%)",
                    border: "1px solid rgba(0,129,242,0.38)",
                    boxShadow: "0 0 18px rgba(0,129,242,0.28)",
                  }}
                >
                  <Bot size={22} style={{ color: "#4da6ff" }} />
                </div>
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full flex-shrink-0"
                  style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.24)" }}
                >
                  Live
                </span>
              </div>
              <div>
                <div
                  className="text-[15px] font-bold tracking-wide mb-1.5"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
                >
                  Veronica Meta AI
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  Meta ads intelligence and fulfillment command center for Vault Co. Veronica handles client launch readiness, Meta account insights, campaign analysis, client intelligence, operator tasks, approvals, reporting, and campaign preparation.
                </p>
              </div>
              {/* Live counts */}
              <div className="grid grid-cols-2 gap-1.5">
                {veronicaStats.map((vs) => (
                  <div
                    key={vs.label}
                    className="px-2.5 py-2 rounded-lg"
                    style={{ backgroundColor: "rgba(0,129,242,0.07)", border: "1px solid rgba(0,129,242,0.16)" }}
                  >
                    <div
                      className="text-[18px] font-bold leading-none"
                      style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#4da6ff" }}
                    >
                      {vs.value === null ? "—" : vs.value}
                    </div>
                    <div className="text-[9px] mt-0.5 leading-tight" style={{ color: "var(--t-dim)" }}>{vs.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => enterModule("/ai-agent", "Initializing Veronica Meta AI...")}
                className="module-cta flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[12px] font-bold tracking-wide cursor-pointer"
                style={{
                  background: "linear-gradient(90deg, rgba(0,129,242,0.22) 0%, rgba(0,129,242,0.12) 100%)",
                  border: "1px solid rgba(0,129,242,0.38)",
                  color: "#4da6ff",
                  boxShadow: "0 2px 10px rgba(0,129,242,0.15)",
                }}
              >
                Enter Veronica
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* 2 — Vault Co Revenue Dashboard */}
          <div
            className="module-card rounded-xl overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(140deg, rgba(255,132,0,0.09) 0%, rgba(13,14,18,0.97) 55%)",
              border: "1px solid rgba(255,132,0,0.22)",
              boxShadow: "0 4px 28px rgba(255,132,0,0.11), 0 1px 0 rgba(255,255,255,0.04) inset",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="p-5 flex-1 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "radial-gradient(circle at 40% 40%, rgba(255,132,0,0.26) 0%, rgba(255,132,0,0.07) 70%)",
                    border: "1px solid rgba(255,132,0,0.36)",
                    boxShadow: "0 0 18px rgba(255,132,0,0.26)",
                  }}
                >
                  <BarChart3 size={22} style={{ color: "#ffaa44" }} />
                </div>
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full flex-shrink-0"
                  style={{ color: "#ff8400", backgroundColor: "rgba(255,132,0,0.10)", border: "1px solid rgba(255,132,0,0.22)" }}
                >
                  Phase 1
                </span>
              </div>
              <div>
                <div
                  className="text-[15px] font-bold tracking-wide mb-1.5"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
                >
                  Vault Co Revenue Dashboard
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  Leadership view for Jaxon and the Vault Co team. Tracks client status, launch blockers, operator tasks, pending approvals, approved drafts, active clients, fulfillment health, and future revenue visibility.
                </p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => enterModule("/revenue-dashboard", "Loading Revenue Command Center...")}
                className="module-cta flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[12px] font-bold tracking-wide cursor-pointer"
                style={{
                  background: "linear-gradient(90deg, rgba(255,132,0,0.22) 0%, rgba(255,132,0,0.12) 100%)",
                  border: "1px solid rgba(255,132,0,0.36)",
                  color: "#ffaa44",
                  boxShadow: "0 2px 10px rgba(255,132,0,0.15)",
                }}
              >
                Open Revenue Dashboard
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* 3 — Victoria AI Sales Coach */}
          <div
            className="module-card rounded-xl overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(140deg, rgba(167,139,250,0.08) 0%, rgba(13,14,18,0.97) 55%)",
              border: "1px solid rgba(167,139,250,0.18)",
              boxShadow: "0 4px 28px rgba(167,139,250,0.08), 0 1px 0 rgba(255,255,255,0.03) inset",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="p-5 flex-1 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "radial-gradient(circle at 40% 40%, rgba(167,139,250,0.22) 0%, rgba(167,139,250,0.06) 70%)",
                    border: "1px solid rgba(167,139,250,0.30)",
                    boxShadow: "0 0 18px rgba(167,139,250,0.18)",
                  }}
                >
                  <Mic2 size={22} style={{ color: "#b89eff" }} />
                </div>
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full flex-shrink-0"
                  style={{ color: "rgba(167,139,250,0.65)", backgroundColor: "rgba(61,79,110,0.12)", border: "1px solid rgba(61,79,110,0.22)" }}
                >
                  Coming Soon
                </span>
              </div>
              <div>
                <div
                  className="text-[15px] font-bold tracking-wide mb-1.5"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
                >
                  Victoria AI Sales Coach
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  Sales call coach for Vault Co and future client teams. Victoria will guide discovery questions, objection handling, probing prompts, deal strategy, call review, call scoring, and follow-up recommendations using Vault Co sales frameworks.
                </p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => enterModule("/victoria", "Activating Victoria AI Sales Coach...")}
                className="module-cta flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[12px] font-semibold cursor-pointer"
                style={{
                  backgroundColor: "rgba(61,79,110,0.10)",
                  border: "1px solid rgba(61,79,110,0.22)",
                  color: "rgba(167,139,250,0.50)",
                }}
              >
                <Clock size={11} />
                Preview Victoria
              </button>
            </div>
          </div>

        </div>

        {/* ── Security / Access Control layer ──────────────────────────── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
        >
          <div
            className="flex items-center gap-2 px-5 py-3 border-b"
            style={{ borderColor: "var(--t-border-nav)", backgroundColor: "rgba(0,129,242,0.03)" }}
          >
            <ShieldCheck size={13} style={{ color: "#0081f2" }} />
            <span
              className="text-[13px] font-bold tracking-wide"
              style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
            >
              Security &amp; Access Control
            </span>
            <span
              className="ml-auto text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.18)" }}
            >
              Active
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "var(--t-border-nav)" }}>
            {securityPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div key={pillar.label} className="px-4 py-4 flex flex-col gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: pillar.bg, border: `1px solid ${pillar.border}` }}
                  >
                    <Icon size={13} style={{ color: pillar.color }} />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold leading-tight mb-0.5" style={{ color: "var(--t-text)" }}>
                      {pillar.label}
                    </div>
                    <p className="text-[10px] leading-snug" style={{ color: "var(--t-dim)" }}>
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Operational stats ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Integration status notices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { label: "Meta Ads not connected", desc: "Performance analytics will appear once Meta read-only reporting is connected." },
            { label: "GoHighLevel not connected", desc: "Appointment and pipeline data will appear once GHL sync is connected." },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
              style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
            >
              <WifiOff size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--t-dim)" }} />
              <div>
                <p className="text-[12px] font-semibold" style={{ color: "var(--t-muted)" }}>{item.label}</p>
                <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--t-dim)" }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Campaigns + right rail ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Campaign table */}
          <div
            className="lg:col-span-2 rounded-xl overflow-hidden"
            style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
              <div className="flex items-center gap-2">
                <Megaphone size={14} style={{ color: "#0081f2" }} />
                <span className="text-[14px] font-bold tracking-wide" style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                  Active Campaigns
                </span>
              </div>
              <Link href="/campaigns" className="flex items-center gap-1 text-[11px] transition-colors" style={{ color: "var(--t-muted)" }}>
                View all <ChevronRight size={11} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="px-5 py-8 text-center text-[12px]" style={{ color: "var(--t-dim)" }}>Loading campaigns…</div>
              ) : activeCampaignRows.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Megaphone size={24} className="mx-auto mb-3" style={{ color: "var(--t-dim)" }} />
                  <p className="text-[13px] font-medium mb-1" style={{ color: "var(--t-muted)" }}>No active campaigns yet</p>
                  <p className="text-[11px] mb-4" style={{ color: "var(--t-dim)" }}>Use Veronica Console to generate a campaign draft for a client.</p>
                  <button
                    onClick={() => enterModule("/ai-agent", "Initializing Veronica Meta AI...")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                    style={{ backgroundColor: "rgba(0,129,242,0.10)", border: "1px solid rgba(0,129,242,0.20)", color: "#0081f2" }}
                  >
                    <Bot size={11} />
                    Open Veronica Console
                  </button>
                </div>
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--t-border-subtle)" }}>
                      {["Client", "Campaign", "Spend", "Leads", "CPL", "Booked"].map((h) => (
                        <th key={h} className={`px-4 py-3 text-[9px] font-bold uppercase tracking-widest ${h === "Client" || h === "Campaign" ? "text-left" : "text-right"}`} style={{ color: "var(--t-dim)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeCampaignRows.map((c, i) => (
                      <tr key={c.id} className="border-b transition-colors" style={{ borderColor: i === activeCampaignRows.length - 1 ? "transparent" : "var(--t-border-subtle)" }}>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold" style={{ color: "var(--t-text)" }}>{c.clientName}</div>
                          <div className="text-[10px]" style={{ color: "var(--t-muted)" }}>{c.market}</div>
                        </td>
                        <td className="px-4 py-3.5" style={{ color: "var(--t-muted)" }}>{c.name}</td>
                        <td className="px-4 py-3.5 text-right" style={{ color: "var(--t-text)" }}>{c.spend}</td>
                        <td className="px-4 py-3.5 text-right font-semibold" style={{ color: "#0081f2" }}>{c.leads}</td>
                        <td className="px-4 py-3.5 text-right" style={{ color: "var(--t-text)" }}>{c.cpl}</td>
                        <td className="px-4 py-3.5 text-right font-semibold" style={{ color: "#22c55e" }}>{c.booked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Veronica Status */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
            >
              <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
                <div className="flex items-center gap-2">
                  <Activity size={13} style={{ color: "#0081f2" }} />
                  <span className="text-[14px] font-bold tracking-wide" style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                    Veronica Status
                  </span>
                </div>
                <span
                  className="flex items-center gap-1.5 text-[9px] font-bold rounded-full px-2 py-0.5"
                  style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)" }}
                >
                  <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse" />
                  Online
                </span>
              </div>
              <div className="p-3 space-y-2">
                {agentLog.map((entry, i) => (
                  <div key={i} className="flex gap-2.5 p-2.5 rounded-lg" style={{ backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                    <div className="mt-0.5 flex-shrink-0">
                      {entry.type === "success" && <Zap size={11} style={{ color: "#22c55e" }} />}
                      {entry.type === "warning" && <AlertCircle size={11} style={{ color: "#f59e0b" }} />}
                      {entry.type === "blue" && <Bot size={11} style={{ color: "#0081f2" }} />}
                      {entry.type === "neutral" && <AlertCircle size={11} style={{ color: "var(--t-muted)" }} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] leading-snug" style={{ color: "var(--t-text)" }}>{entry.action}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--t-muted)" }}>{entry.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-3 pb-3">
                <button
                  onClick={() => enterModule("/ai-agent", "Initializing Veronica Meta AI...")}
                  className="block w-full text-center text-[11px] font-semibold py-2 rounded-lg transition-colors cursor-pointer"
                  style={{ color: "#0081f2", backgroundColor: "rgba(0,129,242,0.08)", border: "1px solid rgba(0,129,242,0.18)" }}
                >
                  Open Veronica →
                </button>
              </div>
            </div>

            {/* Pending Approvals */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
            >
              <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
                <div className="flex items-center gap-2">
                  <CheckSquare size={13} style={{ color: "#ff8400" }} />
                  <span className="text-[14px] font-bold tracking-wide" style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                    Pending Approvals
                  </span>
                </div>
                {pendingDrafts.length > 0 && (
                  <span className="text-[9px] font-bold rounded-full px-2 py-0.5" style={{ color: "#ff8400", backgroundColor: "rgba(255,132,0,0.10)", border: "1px solid rgba(255,132,0,0.20)" }}>
                    {pendingDrafts.length} pending
                  </span>
                )}
              </div>
              <div className="p-3 space-y-2">
                {pendingDrafts.length === 0 ? (
                  <p className="text-[11px] px-1 py-4 text-center" style={{ color: "var(--t-dim)" }}>No pending approvals</p>
                ) : (
                  pendingDrafts.map((a) => (
                    <div key={a.id} className="flex items-start justify-between gap-3 p-2.5 rounded-lg" style={{ backgroundColor: "rgba(255,132,0,0.04)", border: "1px solid rgba(255,132,0,0.10)" }}>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{a.clientName}</div>
                        <div className="text-[10px] mt-0.5 leading-snug truncate" style={{ color: "var(--t-muted)" }}>{a.campaignName}</div>
                      </div>
                      <Link
                        href="/approvals"
                        className="flex-shrink-0 px-2 py-1 text-[10px] font-semibold rounded-md transition-colors whitespace-nowrap"
                        style={{ color: "#ff8400", backgroundColor: "rgba(255,132,0,0.10)", border: "1px solid rgba(255,132,0,0.20)" }}
                      >
                        Review
                      </Link>
                    </div>
                  ))
                )}
              </div>
              <div className="px-3 pb-3">
                <Link href="/approvals" className="block w-full text-center text-[11px] font-semibold py-1 transition-colors" style={{ color: "var(--t-muted)" }}>
                  View all approvals →
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
