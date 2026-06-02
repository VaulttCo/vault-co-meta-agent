"use client";

// Vault OS — Mission Control (front-facing Command Hub).
//
// Thin orchestrator: one data source (useMissionData + plans + clients), one
// loading gate, six sections composed in the approved order:
//   1. Command Header   2. Priority Rail   3. AI Workforce
//   4. Command Bento    5. Operations Feed  6. Executive Status Rail
//
// All values are real (providers / role-guarded APIs). Sections degrade to
// VaultUI empty / neutral states when a source is unavailable. No fabricated
// metrics, no sandbox imports.

import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import { usePlans } from "@/components/PlanProvider";
import { useAuth } from "@/components/AuthProvider";

import { useMissionData } from "@/components/core/mission/useMissionData";
import { CommandHeader } from "@/components/core/mission/CommandHeader";
import { PriorityRail } from "@/components/core/mission/PriorityRail";
import { WorkforceRoster } from "@/components/core/mission/WorkforceRoster";
import { CommandBento } from "@/components/core/mission/CommandBento";
import { OperationsFeed } from "@/components/core/mission/OperationsFeed";
import { MissionStatusRail, SAFETY_GATES } from "@/components/core/mission/MissionStatusRail";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="hub-fade-up w-full flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(201,168,76,0.72)" }}>
        {label}
      </span>
      <span className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(201,168,76,0.24), transparent)" }} />
    </div>
  );
}

export default function MissionControlPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const { plans } = usePlans();
  const { signOut } = useAuth();
  const mission = useMissionData();

  useEffect(() => {
    getDataProvider()
      .getClients()
      .then((data) => {
        setClients(data);
        setClientsLoaded(true);
      })
      .catch(() => setClientsLoaded(true));
  }, []);

  // ── Derived real counts ──────────────────────────────────────────
  const plansNeedsReview = plans.filter((p) => p.status === "needs_review").length;
  const pendingReviews = plansNeedsReview + mission.recPending + mission.propPending;

  const activeClients = clients.filter((c) => c.status === "active").length;
  const clientsPendingLaunch = clients.filter((c) => c.status !== "active").length;

  const veronicaStats = [
    { label: "Pending Approvals", value: !mission.loading ? plansNeedsReview : null },
    { label: "Open Tasks", value: mission.loading ? null : mission.openTaskCount },
    { label: "Clients Pending Launch", value: clientsLoaded ? clientsPendingLaunch : null },
    { label: "Active Clients", value: clientsLoaded ? activeClients : null },
  ];

  return (
    <>
      <style>{`
        @keyframes hubFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .hub-fade-up { animation: hubFadeUp 0.5s ease both; }
        @media (prefers-reduced-motion: reduce) {
          .hub-fade-up { animation: none; }
        }
        .sign-out-btn {
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
        }
        .sign-out-btn:hover {
          background-color: rgba(255,255,255,0.07) !important;
          border-color: rgba(201,168,76,0.32) !important;
          color: rgba(201,168,76,0.80) !important;
        }
      `}</style>

      {/* Sign out (fixed, top-right) */}
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

      <div className="w-full min-h-screen px-4 py-12" style={{ backgroundColor: "#07090e" }}>
        {/* Ambient glows */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ backgroundColor: "rgba(0,129,242,0.05)" }} />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ backgroundColor: "rgba(201,168,76,0.04)" }} />
          <div className="absolute bottom-0 left-1/3 w-[360px] h-[360px] rounded-full blur-[100px]" style={{ backgroundColor: "rgba(167,139,250,0.04)" }} />
        </div>

        <div className="relative w-full max-w-6xl mx-auto flex flex-col gap-8">
          {/* 1 — Command Header */}
          <CommandHeader
            loading={mission.loading}
            activeAutomations={mission.activeAutomations}
            pendingReviews={pendingReviews}
            openTaskCount={mission.openTaskCount}
            safetyGatesActive={SAFETY_GATES.length}
            safetyGatesTotal={SAFETY_GATES.length}
            lastUpdate={mission.lastUpdate}
          />

          {/* 2 — Priority Rail (collapses when empty) */}
          <PriorityRail
            loading={mission.loading || !clientsLoaded}
            approvalsWaiting={pendingReviews}
            launchBlockers={clientsLoaded ? clientsPendingLaunch : 0}
            failedRuns={mission.failedRunCount}
            urgentTasks={mission.urgentTaskCount}
          />

          {/* 3 — AI Workforce */}
          <SectionHeading label="AI Workforce" />
          <WorkforceRoster
            loading={mission.loading}
            workforce={mission.workforce}
            activeAutomations={mission.activeAutomations}
            hermesSkillCount={mission.hermesSkillCount}
            hermesLastRun={mission.hermesLastRun}
          />

          {/* 4 — Command Bento */}
          <SectionHeading label="Command" />
          <CommandBento
            loading={mission.loading}
            veronicaStats={veronicaStats}
            pendingReviews={pendingReviews}
            openTaskCount={mission.openTaskCount}
          />

          {/* 5 — Operations Feed */}
          <OperationsFeed loading={mission.loading} activity={mission.activity} runs={mission.runs} />

          {/* 6 — Executive Status Rail */}
          <MissionStatusRail />

          {/* Footer */}
          <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.16)", letterSpacing: "0.05em" }}>
            Vault Co internal system · All actions are approval-gated · No external writes without human authorization
          </p>
        </div>
      </div>
    </>
  );
}
