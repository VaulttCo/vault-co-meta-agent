"use client";

// Vault OS — Mission Control (Phase 7).
//
// `/` is the live command center of the Vault Co private AI operating system.
// It composes the tracked Mission Control components in src/components/core/mission
// over real, role-guarded, mock-safe data. Every panel degrades gracefully on its
// own (a failed fetch → empty/standby state), so one failing source never crashes
// the page.
//
// SAFETY: this surface is read/recommend/draft/prioritize only. It renders counts
// and links; it never sends, launches, changes budgets, or mutates GHL/Stripe/
// Meta/SMS/email/workflows. Approval links lead to internal-status-only queues.
// The active workforce is exactly the five Vault Core executives (vega, veronica,
// valentina, valerie, vanessa); Victoria appears only as the AI Sales Coach
// product surface; Vivian is not started.

import { useEffect, useState } from "react";

import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import { usePlans } from "@/components/PlanProvider";
import { useAuth } from "@/components/AuthProvider";

import { useMissionData } from "@/components/core/mission/useMissionData";
import { CommandHeader } from "@/components/core/mission/CommandHeader";
import { MissionStatusRail, SAFETY_GATES } from "@/components/core/mission/MissionStatusRail";
import { PriorityRail } from "@/components/core/mission/PriorityRail";
import { ActionCenter } from "@/components/core/mission/ActionCenter";
import { WorkforceRoster } from "@/components/core/mission/WorkforceRoster";
import { LivingMemoryPreview } from "@/components/core/mission/LivingMemoryPreview";
import { ReviewQueue } from "@/components/core/mission/ReviewQueue";
import { CommandBento } from "@/components/core/mission/CommandBento";
import { OperationsFeed } from "@/components/core/mission/OperationsFeed";

export default function MissionControlPage() {
  const m = useMissionData();
  const { plans } = usePlans();
  const { user, signOut } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);

  useEffect(() => {
    getDataProvider()
      .getClients()
      .then((data) => { setClients(data); setClientsLoaded(true); })
      .catch(() => setClientsLoaded(true));
  }, []);

  // ── Derived real counts ──────────────────────────────────────────
  const plansNeedsReview = plans.filter((p) => p.status === "needs_review").length;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const pendingLaunch = clientsLoaded ? clients.filter((c) => c.status !== "active").length : null;

  // Human-review queue total — recommendations + drafts + proposals + plans.
  const pendingReviews = m.recPending + m.draftPending + m.propPending + plansNeedsReview;

  // Client / revenue / growth signals for the navigation bento.
  const veronicaStats = [
    { label: "Pending Approvals",      value: plansNeedsReview },
    { label: "Open Operator Tasks",    value: m.openTaskCount },
    { label: "Clients Pending Launch", value: pendingLaunch },
    { label: "Active Clients",         value: clientsLoaded ? activeClients : null },
  ];

  return (
    <div className="relative w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* 1 · Command Header — identity, operator context, four live KPIs, sign out */}
      <CommandHeader
        loading={m.loading}
        activeAutomations={m.activeAutomations}
        pendingReviews={pendingReviews}
        openTaskCount={m.openTaskCount}
        safetyGatesActive={SAFETY_GATES.length}
        safetyGatesTotal={SAFETY_GATES.length}
        lastUpdate={m.lastUpdate}
        userName={user?.name ?? null}
        userRole={user?.role ?? null}
        onSignOut={() => void signOut()}
      />

      {/* 2 · Mission Status Rail — permanent governance safety gates */}
      <MissionStatusRail />

      {/* 3 · Priority Rail — collapses entirely when nothing needs attention */}
      <PriorityRail
        loading={m.loading}
        approvalsWaiting={pendingReviews}
        launchBlockers={pendingLaunch ?? 0}
        failedRuns={m.failedRunCount}
        urgentTasks={m.urgentTaskCount}
      />

      {/* 4 · Action Center — cleaned operator workflow ("what needs my attention today") */}
      <ActionCenter
        loading={m.loading}
        recVisible={m.recPending}
        recHidden={m.recHidden}
        plansNeedsReview={plansNeedsReview}
        draftPending={m.draftPending}
        propPending={m.propPending}
        urgentTasks={m.urgentTaskCount}
        failedRuns={m.failedRunCount}
        lastUpdate={m.lastUpdate}
      />

      {/* 5 · Active Workforce — the six Vault Core executives */}
      <WorkforceRoster
        loading={m.loading}
        workforce={m.workforce}
        hermesSkillCount={m.hermesSkillCount}
        hermesLastRun={m.hermesLastRun}
        latestByAgent={m.latestByAgent}
      />

      {/* 5 · Living Vault Memory (centerpiece) + Human Review Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <LivingMemoryPreview />
        </div>
        <div className="lg:col-span-5">
          <ReviewQueue
            loading={m.loading}
            recPending={m.recPending}
            draftPending={m.draftPending}
            propPending={m.propPending}
            plansNeedsReview={plansNeedsReview}
          />
        </div>
      </div>

      {/* 6 · Command Bento — workspaces + client / revenue / growth signals */}
      <CommandBento
        loading={m.loading || !clientsLoaded}
        veronicaStats={veronicaStats}
        pendingReviews={pendingReviews}
        openTaskCount={m.openTaskCount}
      />

      {/* 7 · Operations Feed — live runtime activity + agent runs */}
      <OperationsFeed loading={m.loading} activity={m.activity} runs={m.runs} />
    </div>
  );
}
