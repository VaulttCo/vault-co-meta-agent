"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  BarChart3,
  Mic2,
  Lock,
  ShieldCheck,
  Database,
  EyeOff,
  CheckSquare,
  ArrowRight,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import { usePlans } from "@/components/PlanProvider";
import { useAuth } from "@/components/AuthProvider";

const statusStrip = [
  { label: "Auth Active",                 color: "#22c55e", bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.22)",   icon: Lock        },
  { label: "Approval Gate Active",        color: "#0081f2", bg: "rgba(0,129,242,0.10)",   border: "rgba(0,129,242,0.22)",   icon: ShieldCheck },
  { label: "Meta Read-Only",              color: "#a78bfa", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.22)", icon: EyeOff      },
  { label: "GHL Read-Only",              color: "#f59e0b", bg: "rgba(245,158,11,0.10)",   border: "rgba(245,158,11,0.22)",  icon: Database    },
  { label: "External Execution Disabled", color: "#ff8400", bg: "rgba(255,132,0,0.10)",   border: "rgba(255,132,0,0.22)",   icon: CheckSquare },
];

export default function CommandHubPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [openTaskCount, setOpenTaskCount] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState("");
  const { plans } = usePlans();
  const { signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    getDataProvider()
      .getClients()
      .then((data) => { setClients(data); setClientsLoaded(true); })
      .catch(() => setClientsLoaded(true));
  }, []);

  useEffect(() => {
    fetch("/api/operator-tasks")
      .then((r) => (r.ok ? r.json() : { tasks: [] }))
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

  const pendingCount  = plans.filter((p) => p.status === "needs_review").length;
  const activeCount   = clients.filter((c) => c.status === "active").length;
  const blockedCount  = clientsLoaded ? clients.filter((c) => c.status !== "active").length : null;

  const veronicaStats = [
    { label: "Pending Approvals",      value: pendingCount                      },
    { label: "Open Operator Tasks",    value: openTaskCount                     },
    { label: "Clients Pending Launch", value: blockedCount                      },
    { label: "Active Clients",         value: clientsLoaded ? activeCount : null },
  ];

  return (
    <>
      <style>{`
        /* ── Transition overlay keyframes ── */
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
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%       { opacity: 1;  transform: scale(1.2); }
        }
        @keyframes hubFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .vault-overlay  { animation: vaultFadeIn 0.18s ease forwards; }
        .vault-sweep    { animation: vaultSweep 1s ease 0.08s forwards; }
        .vault-wordmark { animation: vaultGlow 1.8s ease-in-out infinite; }
        .vault-dot-0    { animation: vaultDot 0.9s ease-in-out 0s    infinite; }
        .vault-dot-1    { animation: vaultDot 0.9s ease-in-out 0.25s infinite; }
        .vault-dot-2    { animation: vaultDot 0.9s ease-in-out 0.5s  infinite; }
        .hub-fade-up    { animation: hubFadeUp 0.55s ease            both; }
        .hub-fade-up-1  { animation: hubFadeUp 0.55s ease 0.08s      both; }
        .hub-fade-up-2  { animation: hubFadeUp 0.55s ease 0.16s      both; }
        .hub-fade-up-3  { animation: hubFadeUp 0.55s ease 0.24s      both; }

        /* ── Sign out button ── */
        .sign-out-btn {
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
        }
        .sign-out-btn:hover {
          background-color: rgba(255,255,255,0.07) !important;
          border-color: rgba(201,168,76,0.32) !important;
          color: rgba(201,168,76,0.80) !important;
        }

        /* ── Veronica card ── */
        .card-veronica {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-radius: 1rem;
          backdrop-filter: blur(14px);
          background: linear-gradient(145deg, rgba(0,129,242,0.11) 0%, rgba(7,9,14,0.97) 60%);
          border: 1px solid rgba(0,129,242,0.24);
          box-shadow: 0 8px 40px rgba(0,129,242,0.13), 0 1px 0 rgba(255,255,255,0.04) inset;
          transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease, background 0.24s ease;
        }
        .card-veronica:hover {
          transform: translateY(-7px);
          border-color: rgba(0,129,242,0.55);
          box-shadow: 0 24px 80px rgba(0,129,242,0.26), 0 1px 0 rgba(255,255,255,0.07) inset;
          background: linear-gradient(145deg, rgba(0,129,242,0.18) 0%, rgba(7,9,14,0.97) 60%);
        }
        .card-veronica:hover .icon-ring {
          box-shadow: 0 0 40px rgba(0,129,242,0.60);
          transform: scale(1.07);
          border-color: rgba(0,129,242,0.60);
          transition: box-shadow 0.24s ease, transform 0.24s ease, border-color 0.24s ease;
        }
        .card-veronica:hover .cta-btn {
          box-shadow: 0 4px 28px rgba(0,129,242,0.36) !important;
          filter: brightness(1.18);
        }

        /* ── Revenue card ── */
        .card-revenue {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-radius: 1rem;
          backdrop-filter: blur(14px);
          background: linear-gradient(145deg, rgba(255,132,0,0.10) 0%, rgba(7,9,14,0.97) 60%);
          border: 1px solid rgba(255,132,0,0.22);
          box-shadow: 0 8px 40px rgba(255,132,0,0.12), 0 1px 0 rgba(255,255,255,0.04) inset;
          transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease, background 0.24s ease;
        }
        .card-revenue:hover {
          transform: translateY(-7px);
          border-color: rgba(255,132,0,0.52);
          box-shadow: 0 24px 80px rgba(255,132,0,0.24), 0 1px 0 rgba(255,255,255,0.07) inset;
          background: linear-gradient(145deg, rgba(255,132,0,0.17) 0%, rgba(7,9,14,0.97) 60%);
        }
        .card-revenue:hover .icon-ring {
          box-shadow: 0 0 40px rgba(255,132,0,0.60);
          transform: scale(1.07);
          border-color: rgba(255,132,0,0.60);
          transition: box-shadow 0.24s ease, transform 0.24s ease, border-color 0.24s ease;
        }
        .card-revenue:hover .cta-btn {
          box-shadow: 0 4px 28px rgba(255,132,0,0.36) !important;
          filter: brightness(1.18);
        }

        /* ── Victoria card ── */
        .card-victoria {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-radius: 1rem;
          backdrop-filter: blur(14px);
          background: linear-gradient(145deg, rgba(167,139,250,0.09) 0%, rgba(7,9,14,0.97) 60%);
          border: 1px solid rgba(167,139,250,0.18);
          box-shadow: 0 8px 40px rgba(167,139,250,0.09), 0 1px 0 rgba(255,255,255,0.03) inset;
          transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease, background 0.24s ease;
        }
        .card-victoria:hover {
          transform: translateY(-7px);
          border-color: rgba(167,139,250,0.38);
          box-shadow: 0 24px 80px rgba(167,139,250,0.18), 0 1px 0 rgba(255,255,255,0.05) inset;
          background: linear-gradient(145deg, rgba(167,139,250,0.15) 0%, rgba(7,9,14,0.97) 60%);
        }
        .card-victoria:hover .icon-ring {
          box-shadow: 0 0 40px rgba(167,139,250,0.45);
          transform: scale(1.07);
          border-color: rgba(167,139,250,0.52);
          transition: box-shadow 0.24s ease, transform 0.24s ease, border-color 0.24s ease;
        }
        .card-victoria:hover .cta-btn {
          filter: brightness(1.18);
        }

        /* Shared icon ring transition */
        .icon-ring {
          transition: box-shadow 0.24s ease, transform 0.24s ease, border-color 0.24s ease;
        }
        .cta-btn {
          transition: filter 0.18s ease, box-shadow 0.18s ease;
        }
      `}</style>

      {/* ── Transition overlay ────────────────────────────────────────── */}
      {transitioning && (
        <div
          className="vault-overlay fixed inset-0 flex flex-col items-center justify-center"
          style={{ zIndex: 9999, backgroundColor: "#07090e" }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="vault-sweep absolute inset-y-0 w-56"
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
            <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: "rgba(201,168,76,0.55)" }}>
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

      {/* ── Sign out button (fixed, top-right) ──────────────────────────── */}
      <button
        onClick={() => void signOut()}
        className="sign-out-btn fixed top-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-semibold cursor-pointer"
        style={{
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "rgba(255,255,255,0.35)",
        }}
      >
        <LogOut size={11} />
        Sign Out
      </button>

      {/* ── Full-screen Command Hub ──────────────────────────────────────── */}
      <div
        className="w-full min-h-screen flex flex-col items-center justify-center px-4 py-16"
        style={{ backgroundColor: "#07090e" }}
      >
        {/* Ambient glows */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ backgroundColor: "rgba(0,129,242,0.05)" }} />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ backgroundColor: "rgba(201,168,76,0.04)" }} />
          <div className="absolute bottom-0 left-1/3 w-[360px] h-[360px] rounded-full blur-[100px]" style={{ backgroundColor: "rgba(167,139,250,0.04)" }} />
        </div>

        <div className="relative w-full max-w-5xl flex flex-col items-center gap-10">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="hub-fade-up flex flex-col items-center gap-3 text-center">
            <Image src="/vaultco-logo.png" alt="Vault Co" width={62} height={62} className="object-contain" priority />
            <div className="flex items-center justify-center gap-2.5 mt-1 flex-wrap">
              <h1
                className="text-[30px] sm:text-[38px] font-bold tracking-wide"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#e8eaf0" }}
              >
                Vault Co Command Hub
              </h1>
              <span
                className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 self-center flex-shrink-0"
                style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.22)" }}
              >
                <Lock size={8} />
                Security-first
              </span>
            </div>
            <p className="text-[14px] sm:text-[15px] max-w-lg" style={{ color: "rgba(255,255,255,0.42)" }}>
              Choose which Vault Co operating system you want to enter.
            </p>
            <p className="text-[11px] font-medium tracking-wide" style={{ color: "rgba(201,168,76,0.62)" }}>
              Security-first. AI-assisted. Approval-gated. Operator-controlled. Built for scale.
            </p>
          </div>

          {/* ── Three portal cards ─────────────────────────────────────────── */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* 1 — Veronica Meta AI */}
            <div className="hub-fade-up-1 card-veronica">
              <div className="p-6 flex-1 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="icon-ring w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "radial-gradient(circle at 40% 40%, rgba(0,129,242,0.30) 0%, rgba(0,129,242,0.07) 70%)",
                      border: "1px solid rgba(0,129,242,0.38)",
                      boxShadow: "0 0 22px rgba(0,129,242,0.30)",
                    }}
                  >
                    <Bot size={26} style={{ color: "#4da6ff" }} />
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.26)" }}
                  >
                    Live
                  </span>
                </div>

                <div>
                  <div
                    className="text-[18px] font-bold tracking-wide mb-0.5"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#e8eaf0" }}
                  >
                    Veronica Meta AI
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(77,166,255,0.55)" }}>
                    Enter the AI fulfillment portal
                  </p>
                  <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.40)" }}>
                    Meta ads intelligence and fulfillment command center. Handles client launch readiness, Meta account insights, campaign analysis, AI-generated drafts, operator tasks, approval workflows, and reporting preparation.
                  </p>
                </div>

                {/* Live counts */}
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  {veronicaStats.map((vs) => (
                    <div
                      key={vs.label}
                      className="px-3 py-2.5 rounded-xl"
                      style={{ backgroundColor: "rgba(0,129,242,0.07)", border: "1px solid rgba(0,129,242,0.16)" }}
                    >
                      <div
                        className="text-[20px] font-bold leading-none"
                        style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#4da6ff" }}
                      >
                        {vs.value === null ? "—" : vs.value}
                      </div>
                      <div className="text-[9px] mt-0.5 leading-tight" style={{ color: "rgba(255,255,255,0.26)" }}>
                        {vs.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 pb-6">
                <button
                  onClick={() => enterModule("/ai-agent", "Initializing Veronica Meta AI...")}
                  className="cta-btn flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[13px] font-bold tracking-wide cursor-pointer"
                  style={{
                    background: "linear-gradient(90deg, rgba(0,129,242,0.26) 0%, rgba(0,129,242,0.14) 100%)",
                    border: "1px solid rgba(0,129,242,0.40)",
                    color: "#4da6ff",
                    boxShadow: "0 2px 14px rgba(0,129,242,0.18)",
                  }}
                >
                  Enter Veronica
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* 2 — Vault Co Revenue Dashboard */}
            <div className="hub-fade-up-2 card-revenue">
              <div className="p-6 flex-1 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="icon-ring w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "radial-gradient(circle at 40% 40%, rgba(255,132,0,0.28) 0%, rgba(255,132,0,0.07) 70%)",
                      border: "1px solid rgba(255,132,0,0.36)",
                      boxShadow: "0 0 22px rgba(255,132,0,0.28)",
                    }}
                  >
                    <BarChart3 size={26} style={{ color: "#ffaa44" }} />
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ color: "#ff8400", backgroundColor: "rgba(255,132,0,0.10)", border: "1px solid rgba(255,132,0,0.24)" }}
                  >
                    Phase 1
                  </span>
                </div>

                <div>
                  <div
                    className="text-[18px] font-bold tracking-wide mb-0.5"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#e8eaf0" }}
                  >
                    Vault Co Revenue Dashboard
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,170,68,0.55)" }}>
                    Open the leadership dashboard
                  </p>
                  <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.40)" }}>
                    Executive revenue and fulfillment overview for Jaxon and the Vault Co leadership team. Tracks client status, launch blockers, operator workload, fulfillment health, and future billing visibility. Real revenue surfaced when connected.
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6">
                <button
                  onClick={() => enterModule("/revenue-dashboard", "Loading Revenue Command Center...")}
                  className="cta-btn flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[13px] font-bold tracking-wide cursor-pointer"
                  style={{
                    background: "linear-gradient(90deg, rgba(255,132,0,0.26) 0%, rgba(255,132,0,0.14) 100%)",
                    border: "1px solid rgba(255,132,0,0.38)",
                    color: "#ffaa44",
                    boxShadow: "0 2px 14px rgba(255,132,0,0.18)",
                  }}
                >
                  Open Revenue Dashboard
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* 3 — Victoria AI Sales Coach */}
            <div className="hub-fade-up-3 card-victoria">
              <div className="p-6 flex-1 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="icon-ring w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "radial-gradient(circle at 40% 40%, rgba(167,139,250,0.30) 0%, rgba(167,139,250,0.08) 70%)",
                      border: "1px solid rgba(167,139,250,0.40)",
                      boxShadow: "0 0 22px rgba(167,139,250,0.28)",
                    }}
                  >
                    <Mic2 size={26} style={{ color: "#b89eff" }} />
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.26)" }}
                  >
                    Live
                  </span>
                </div>

                <div>
                  <div
                    className="text-[18px] font-bold tracking-wide mb-0.5"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#e8eaf0" }}
                  >
                    Victoria AI Sales Coach
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(184,158,255,0.65)" }}>
                    Enter the sales coaching portal
                  </p>
                  <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.40)" }}>
                    Real-time AI sales coaching for every call. Victoria listens, detects buying signals, surfaces objections, scores trust and urgency, and delivers full post-call reviews, missed opportunity analysis, rep scorecards, and automated follow-up kits.
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6">
                <button
                  onClick={() => enterModule("/victoria", "Activating Victoria AI Sales Coach...")}
                  className="cta-btn flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[13px] font-bold tracking-wide cursor-pointer"
                  style={{
                    background: "linear-gradient(90deg, rgba(167,139,250,0.26) 0%, rgba(167,139,250,0.14) 100%)",
                    border: "1px solid rgba(167,139,250,0.42)",
                    color: "#b89eff",
                    boxShadow: "0 2px 14px rgba(167,139,250,0.18)",
                  }}
                >
                  Enter Victoria
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

          </div>

          {/* ── System status strip ────────────────────────────────────────── */}
          <div className="hub-fade-up w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
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
                    style={{ backgroundColor: "rgba(0,0,0,0.30)", border: `1px solid ${s.border}` }}
                  >
                    <Icon size={13} style={{ color: s.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold leading-tight truncate" style={{ color: s.color }}>{s.label}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.22)" }}>Active</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.16)", letterSpacing: "0.05em" }}>
            Vault Co internal system · All actions are approval-gated · No external writes without human authorization
          </p>

        </div>
      </div>
    </>
  );
}
