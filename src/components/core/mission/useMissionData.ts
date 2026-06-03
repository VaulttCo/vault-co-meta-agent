"use client";

// Vault OS Mission Control — single data orchestrator for the Command Hub.
//
// Fires every real read in parallel under one loading gate (no per-section
// waterfall, no duplicate fetches). Every source is role-guarded server-side
// and already returns a graceful empty payload on error / missing DB, so a
// non-ok response here is treated as "no data" — sections then show VaultUI
// empty states. NOTHING here fabricates values.
//
// Real sources consumed:
//   /api/core/workforce                          → WorkforceMember[]
//   /api/operator-tasks                          → operator tasks (status/priority)
//   /api/core/activity                           → activity[], runs[]
//   /api/core/recommendations?status=pending_review
//   /api/core/drafts                             → draft counts (status=draft = pending)
//   /api/core/proposals?status=pending_review
//   /api/veronica/hermes                         → latest Hermes runs
//   /api/veronica/hermes/skills?limit=100        → Hermes skills library

import { useEffect, useState } from "react";
import type {
  WorkforceMember,
  VaultActivityRow,
  VaultAgentRunRow,
} from "@/lib/core/types";
import { newestTimestamp } from "./relativeTime";

export interface HermesRun {
  id: string;
  status: string;
  created_at: string;
  prompt?: string;
  auto_skill_created?: boolean;
}

export interface HermesSkill {
  id: string;
  name: string;
  last_used_at: string | null;
  usage_count: number | null;
}

export interface MissionData {
  loading: boolean;

  // Workforce
  workforce: WorkforceMember[];
  activeAutomations: number; // active runtime agents — the truthful basis for "Active Automations"

  // Operator tasks
  openTaskCount: number;
  urgentTaskCount: number;

  // Human-review queue (real pending counts) — internal review only, nothing sends
  recPending: number;
  draftPending: number;
  propPending: number;

  // Newest activity message per agent (executive contribution signal). Empty when
  // no real activity exists for that agent — never fabricated.
  latestByAgent: Record<string, { message: string; ts: string }>;

  // Operations feed
  activity: VaultActivityRow[];
  runs: VaultAgentRunRow[];
  failedRunCount: number;
  lastUpdate: string | null; // newest real activity / run timestamp

  // Hermes system layer
  hermesRuns: HermesRun[];
  hermesSkillCount: number;
  hermesLastRun: HermesRun | null;
}

const EMPTY: MissionData = {
  loading: true,
  workforce: [],
  activeAutomations: 0,
  openTaskCount: 0,
  urgentTaskCount: 0,
  recPending: 0,
  draftPending: 0,
  propPending: 0,
  latestByAgent: {},
  activity: [],
  runs: [],
  failedRunCount: 0,
  lastUpdate: null,
  hermesRuns: [],
  hermesSkillCount: 0,
  hermesLastRun: null,
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null; // 401/403/500 → treated as "no data"
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export function useMissionData(): MissionData {
  const [data, setData] = useState<MissionData>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [workforceRes, tasksRes, activityRes, recRes, draftRes, propRes, hermesRes, skillsRes] =
        await Promise.all([
          getJson<{ workforce: WorkforceMember[] }>("/api/core/workforce"),
          getJson<{ tasks: { status: string; priority: string }[] }>("/api/operator-tasks"),
          getJson<{ activity: VaultActivityRow[]; runs: VaultAgentRunRow[] }>("/api/core/activity"),
          getJson<{ counts: { pending_review: number; mission_visible?: number } | null }>(
            "/api/core/recommendations?status=pending_review"
          ),
          getJson<{ counts: { draft: number } | null }>("/api/core/drafts"),
          getJson<{ counts: { pending_review: number } | null }>(
            "/api/core/proposals?status=pending_review"
          ),
          getJson<{ runs: HermesRun[] }>("/api/veronica/hermes"),
          getJson<{ skills: HermesSkill[] }>("/api/veronica/hermes/skills?limit=100"),
        ]);

      if (cancelled) return;

      const workforce = workforceRes?.workforce ?? [];
      const tasks = tasksRes?.tasks ?? [];
      const activity = activityRes?.activity ?? [];
      const runs = activityRes?.runs ?? [];
      const hermesRuns = hermesRes?.runs ?? [];

      const openTaskCount = tasks.filter(
        (t) => t.status === "open" || t.status === "in_progress"
      ).length;
      const urgentTaskCount = tasks.filter(
        (t) => t.priority === "urgent" && (t.status === "open" || t.status === "in_progress")
      ).length;

      const lastUpdate = newestTimestamp([
        ...activity.map((a) => a.created_at),
        ...runs.map((r) => r.started_at),
      ]);

      // Newest real activity message per agent (activity is consumed newest-first
      // by the feed, but don't assume order here — compare timestamps).
      const latestByAgent: Record<string, { message: string; ts: string }> = {};
      for (const a of activity) {
        if (!a.agent || !a.created_at) continue;
        const cur = latestByAgent[a.agent];
        if (!cur || new Date(a.created_at).getTime() > new Date(cur.ts).getTime()) {
          latestByAgent[a.agent] = { message: a.message, ts: a.created_at };
        }
      }

      setData({
        loading: false,
        workforce,
        activeAutomations: workforce.filter((m) => m.meta.active).length,
        openTaskCount,
        urgentTaskCount,
        // Prefer the hygiene-aware visible count so Vera/Vesper-suppressed items
        // don't inflate Mission Control (falls back to raw pending_review).
        recPending: recRes?.counts?.mission_visible ?? recRes?.counts?.pending_review ?? 0,
        draftPending: draftRes?.counts?.draft ?? 0,
        propPending: propRes?.counts?.pending_review ?? 0,
        latestByAgent,
        activity,
        runs,
        failedRunCount: runs.filter((r) => r.status === "error").length,
        lastUpdate,
        hermesRuns,
        hermesSkillCount: skillsRes?.skills?.length ?? 0,
        hermesLastRun: hermesRuns[0] ?? null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
