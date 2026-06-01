"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bot,
  Brain,
  ShieldCheck,
  Lock,
  Users,
  CheckSquare,
  AlertCircle,
  Zap,
  ListChecks,
  FileText,
  Megaphone,
  ImageIcon,
  ArrowRight,
  EyeOff,
  CheckCircle2,
  XCircle,
  Sparkles,
  Clock,
  Terminal,
  Play,
  AlertTriangle,
} from "lucide-react";
import { usePlans } from "@/components/PlanProvider";
import { getDataProvider } from "@/lib/data/data-provider";
import { VCStat, VCPanel, VCPanelHeader, VCActionLink } from "@/components/ui/VaultUI";
import { VAIWorkforce } from "@/components/sandbox/VAIWorkforce";
import { VOperationsFeed } from "@/components/sandbox/VOperationsFeed";
import type { Client } from "@/lib/data";
import type { VeronicaHermesRunRow, VeronicaHermesSkillRow } from "@/lib/supabase/types";

interface OperatorTask {
  id: string;
  title: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: string;
  taskType: string;
  clientName?: string | null;
}


const priorityColor = (p: string) => {
  if (p === "urgent") return "#ef4444";
  if (p === "high") return "#ff8400";
  if (p === "medium") return "#0081f2";
  return "rgba(107,122,153,0.6)";
};

export default function VeronicaOverviewPage() {
  const { plans } = usePlans();
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<OperatorTask[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Hermes Operator state
  const [hermesPrompt, setHermesPrompt] = useState("");
  const [hermesOutput, setHermesOutput] = useState<string | null>(null);
  const [hermesError, setHermesError] = useState<string | null>(null);
  const [hermesLoading, setHermesLoading] = useState(false);
  const hermesOutputRef = useRef<HTMLDivElement>(null);
  const [hermesRuns, setHermesRuns] = useState<VeronicaHermesRunRow[]>([]);
  const [hermesRunsLoading, setHermesRunsLoading] = useState(true);
  const [hermesSkills, setHermesSkills] = useState<VeronicaHermesSkillRow[]>([]);
  const [hermesSkillsLoading, setHermesSkillsLoading] = useState(true);
  const [runningSkillId, setRunningSkillId] = useState<string | null>(null);

  useEffect(() => {
    getDataProvider()
      .getClients()
      .then((c) => {
        setClients(c);
        setLoadingClients(false);
      })
      .catch(() => setLoadingClients(false));
  }, []);

  useEffect(() => {
    fetch("/api/operator-tasks")
      .then((r) => r.json())
      .then((d: { tasks?: OperatorTask[] }) => {
        setTasks(d.tasks ?? []);
        setLoadingTasks(false);
      })
      .catch(() => setLoadingTasks(false));
  }, []);

  function fetchHermesRuns() {
    fetch("/api/veronica/hermes")
      .then((r) => r.json())
      .then((d: { runs?: VeronicaHermesRunRow[] }) => {
        setHermesRuns(d.runs ?? []);
        setHermesRunsLoading(false);
      })
      .catch(() => setHermesRunsLoading(false));
  }

  function fetchHermesSkills() {
    fetch("/api/veronica/hermes/skills")
      .then((r) => r.json())
      .then((d: { skills?: VeronicaHermesSkillRow[] }) => {
        setHermesSkills(d.skills ?? []);
        setHermesSkillsLoading(false);
      })
      .catch(() => setHermesSkillsLoading(false));
  }

  useEffect(() => { fetchHermesRuns(); fetchHermesSkills(); }, []);

  // ── Client stats ────────────────────────────────────────────
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const onboardingClients = clients.filter(
    (c) => c.status === "setup" || c.status === "onboarding"
  ).length;
  const blockedClients = clients.filter(
    (c) => c.status === "paused" || c.status === "archived"
  ).length;
  const missingConnections = clients.filter(
    (c) => !c.metaAccountId || !c.ghlLocationId
  ).length;

  // ── Plan stats ──────────────────────────────────────────────
  const pendingPlans = plans.filter((p) => p.status === "needs_review").length;
  const approvedPlans = plans.filter(
    (p) => p.status === "approved" || p.status === "ready_for_meta"
  ).length;
  const draftPlans = plans.filter((p) => p.status === "draft").length;
  const rejectedPlans = plans.filter(
    (p) => p.status === "rejected" || p.status === "changes_requested"
  ).length;

  // ── Task stats ──────────────────────────────────────────────
  const openTasks = tasks.filter(
    (t) => t.status === "open" || t.status === "in_progress"
  ).length;
  const urgentTasks = tasks.filter((t) => t.priority === "urgent").length;
  const blockedTasks = tasks.filter((t) => t.status === "blocked").length;
  const topTasks = tasks
    .filter((t) => t.status !== "done" && t.status !== "archived")
    .sort((a, b) => {
      const order: Record<string, number> = {
        urgent: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    })
    .slice(0, 5);

  async function runHermes() {
    if (!hermesPrompt.trim() || hermesLoading) return;
    setHermesLoading(true);
    setHermesOutput(null);
    setHermesError(null);
    try {
      const res = await fetch("/api/veronica/hermes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: hermesPrompt }),
      });
      const data: { output?: string | null; error?: string | null } = await res.json();
      if (data.error) {
        setHermesError(data.error);
      } else {
        setHermesOutput(data.output ?? null);
        setTimeout(() => hermesOutputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
      }
    } catch {
      setHermesError("Unable to reach Hermes. Check your connection and try again.");
    } finally {
      setHermesLoading(false);
      fetchHermesRuns();
      fetchHermesSkills();
    }
  }

  async function runSkill(skill: VeronicaHermesSkillRow) {
    if (runningSkillId) return;
    setRunningSkillId(skill.id);
    setHermesOutput(null);
    setHermesError(null);
    try {
      const res = await fetch("/api/veronica/hermes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: skill.instructions, skill_id: skill.id }),
      });
      const data: { output?: string | null; error?: string | null } = await res.json();
      if (data.error) {
        setHermesError(data.error);
      } else {
        setHermesPrompt(skill.instructions);
        setHermesOutput(data.output ?? null);
        setTimeout(() => hermesOutputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
      }
    } catch {
      setHermesError("Unable to reach Hermes. Check your connection and try again.");
    } finally {
      setRunningSkillId(null);
      fetchHermesRuns();
      fetchHermesSkills();
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-5">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-6 py-6 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,129,242,0.10) 0%, rgba(0,79,176,0.05) 60%, rgba(5,7,11,0) 100%)",
          border: "1px solid rgba(0,129,242,0.18)",
        }}
      >
        <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,129,242,0.20) 0%, rgba(0,79,176,0.12) 100%)",
              border: "1px solid rgba(0,129,242,0.28)",
            }}
          >
            <Bot size={22} style={{ color: "#0081f2" }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-[20px] font-bold"
                style={{
                  fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                  color: "var(--t-text)",
                }}
              >
                Veronica Meta AI
              </h1>
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5"
                style={{
                  color: "#22c55e",
                  backgroundColor: "rgba(34,197,94,0.10)",
                  border: "1px solid rgba(34,197,94,0.20)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse inline-block" />
                ACTIVE
              </span>
            </div>
            <p
              className="text-[13px] mt-1 leading-relaxed"
              style={{ color: "var(--t-muted)", maxWidth: "580px" }}
            >
              AI fulfillment and Meta ads intelligence portal — campaign
              strategy, client intelligence, creative analysis, and
              approval-ready growth plans for Vault Co client teams.
            </p>
          </div>

          <Link
            href="/ai-agent/console"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold flex-shrink-0 transition-all"
            style={{
              backgroundColor: "rgba(0,129,242,0.14)",
              border: "1px solid rgba(0,129,242,0.30)",
              color: "#4aabff",
            }}
          >
            <Sparkles size={13} />
            Open Console
            <ArrowRight size={12} />
          </Link>
        </div>

        {/* Security pillars */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { icon: ShieldCheck, label: "Approval-Gated" },
            { icon: EyeOff, label: "Meta Read-Only" },
            { icon: Lock, label: "Operator-Controlled" },
            { icon: CheckSquare, label: "No External Writes" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
              style={{
                color: "rgba(107,122,153,0.75)",
                backgroundColor: "rgba(61,79,110,0.10)",
                border: "1px solid rgba(61,79,110,0.18)",
              }}
            >
              <Icon size={10} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Vault Core — private AI operating system entry ─────── */}
      <div
        className="rounded-2xl px-6 py-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(0,129,242,0.12) 0%, rgba(167,139,250,0.06) 55%, rgba(5,7,11,0) 100%)",
          border: "1px solid rgba(0,129,242,0.22)",
        }}
      >
        <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "radial-gradient(circle at 40% 40%, rgba(0,129,242,0.30) 0%, rgba(0,129,242,0.08) 70%)", border: "1px solid rgba(0,129,242,0.32)" }}
          >
            <Brain size={22} style={{ color: "#0081f2" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[18px] font-bold tracking-wide" style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                Vault Core
              </h2>
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ color: "#0081f2", background: "rgba(0,129,242,0.12)", border: "1px solid rgba(0,129,242,0.24)" }}>
                Private OS
              </span>
            </div>
            <p className="text-[13px] mt-1 leading-relaxed max-w-2xl" style={{ color: "var(--t-text-body)" }}>
              Private AI operating system for Vault Co. Five active executives monitoring intelligence,
              finance, marketing, conversations, recommendations, and executive priorities — 24/7, human-approved.
            </p>
          </div>
          <Link
            href="/vault-core"
            className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold tracking-wide self-start"
            style={{ background: "linear-gradient(90deg, rgba(0,129,242,0.26) 0%, rgba(0,129,242,0.14) 100%)", border: "1px solid rgba(0,129,242,0.4)", color: "#4da6ff", boxShadow: "0 2px 14px rgba(0,129,242,0.16)" }}
          >
            Enter Vault Core
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── AI Workforce (preview — full system lives in Vault Core) ── */}
      <VAIWorkforce
        pendingPlans={pendingPlans}
        draftPlans={draftPlans}
        approvedPlans={approvedPlans}
        hermesRuns={hermesRuns}
        hermesSkills={hermesSkills}
        hermesRunsLoading={hermesRunsLoading}
      />
      <div className="-mt-2">
        <Link href="/workforce" className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "#0081f2" }}>
          Open the full Workforce in Vault Core
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* ── Client Intelligence + Fulfillment Pipeline ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Client Intelligence */}
        <VCPanel>
          <VCPanelHeader
            icon={Users}
            title="Client Intelligence"
            action={<VCActionLink href="/clients" />}
          />
          <div className="p-4 grid grid-cols-2 gap-3">
            <VCStat size="sm" label="Total Clients"        value={loadingClients ? "—" : totalClients} />
            <VCStat size="sm" label="Active"               value={loadingClients ? "—" : activeClients}    iconColor="#22c55e" />
            <VCStat size="sm" label="Setup / Onboarding"   value={loadingClients ? "—" : onboardingClients} iconColor="#ff8400" />
            <VCStat size="sm" label="Paused / Archived"    value={loadingClients ? "—" : blockedClients}    iconColor={blockedClients > 0 ? "#ef4444" : undefined} />
          </div>
          {!loadingClients && missingConnections > 0 && (
            <div className="px-4 pb-4">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
                style={{
                  backgroundColor: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  color: "#ef4444",
                }}
              >
                <AlertCircle size={12} className="flex-shrink-0" />
                {missingConnections} client{missingConnections !== 1 ? "s" : ""} missing Meta or GHL connection — launch blocked
              </div>
            </div>
          )}
        </VCPanel>

        {/* Fulfillment Pipeline */}
        <VCPanel>
          <VCPanelHeader
            icon={Zap}
            title="Fulfillment Pipeline"
            action={<VCActionLink href="/operator-queue" label="Operator Queue" />}
          />
          <div className="p-4 grid grid-cols-3 gap-3">
            <VCStat size="sm" label="Open Tasks"  value={loadingTasks ? "—" : openTasks} />
            <VCStat size="sm" label="Urgent"      value={loadingTasks ? "—" : urgentTasks} iconColor={urgentTasks > 0 ? "#ef4444" : undefined} />
            <VCStat size="sm" label="Blocked"     value={loadingTasks ? "—" : blockedTasks} iconColor={blockedTasks > 0 ? "#ff8400" : undefined} />
          </div>
          <div className="px-4 pb-4 grid grid-cols-2 gap-3">
            <VCStat size="sm" label="Pending Approval"  value={pendingPlans} iconColor={pendingPlans > 0 ? "#ff8400" : undefined} />
            <VCStat size="sm" label="Drafts In Progress" value={draftPlans} />
          </div>
        </VCPanel>
      </div>

      {/* ── Approval Queue + Operator Execution ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Approval Queue */}
        <VCPanel>
          <VCPanelHeader
            icon={CheckSquare}
            title="Approval Queue"
            action={<VCActionLink href="/approvals" label="Review" />}
          />
          <div className="p-5 space-y-3">
            {[
              { label: "Needs Human Review",          count: pendingPlans,  color: "#ff8400", icon: Clock        },
              { label: "Approved Drafts",              count: approvedPlans, color: "#22c55e", icon: CheckCircle2 },
              { label: "Rejected / Changes Requested", count: rejectedPlans, color: "#ef4444", icon: XCircle     },
            ].map(({ label, count, color, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--t-muted)" }}>
                  <Icon size={13} style={{ color }} />
                  {label}
                </div>
                <span
                  className="text-[15px] font-bold tabular-nums"
                  style={{ fontFamily: "var(--font-rajdhani)", color: count > 0 ? color : "rgba(107,122,153,0.30)" }}
                >
                  {count}
                </span>
              </div>
            ))}
            {plans.length === 0 && (
              <p className="text-[12px] text-center py-3" style={{ color: "rgba(107,122,153,0.45)" }}>
                No campaign drafts yet — open the Veronica Console to generate one.
              </p>
            )}
          </div>
        </VCPanel>

        {/* Operator Execution */}
        <VCPanel>
          <VCPanelHeader
            icon={ListChecks}
            title="Operator Execution"
            action={<VCActionLink href="/operator-queue" label="Full Queue" />}
          />
          <div className="p-4">
            {loadingTasks ? (
              <p className="text-[12px] text-center py-6" style={{ color: "rgba(107,122,153,0.45)" }}>
                Loading tasks…
              </p>
            ) : topTasks.length === 0 ? (
              <p className="text-[12px] text-center py-6" style={{ color: "rgba(107,122,153,0.45)" }}>
                No open tasks in the queue.
              </p>
            ) : (
              <div className="space-y-2">
                {topTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-colors"
                    style={{
                      backgroundColor: "rgba(0,129,242,0.04)",
                      border: "1px solid rgba(0,129,242,0.09)",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0"
                      style={{ backgroundColor: priorityColor(task.priority) }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium truncate" style={{ color: "var(--t-text)" }}>
                        {task.title}
                      </div>
                      {task.clientName && (
                        <div className="text-[10px] mt-0.5" style={{ color: "rgba(107,122,153,0.60)" }}>
                          {task.clientName}
                        </div>
                      )}
                    </div>
                    <span
                      className="text-[9px] font-bold uppercase flex-shrink-0 mt-0.5"
                      style={{ color: priorityColor(task.priority) }}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </VCPanel>
      </div>

      {/* ── Meta Intelligence ─────────────────────────────────── */}
      <VCPanel>
        <VCPanelHeader
          icon={Brain}
          title="Meta Intelligence"
          action={
            <span className="vc-label px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(61,79,110,0.10)", border: "1px solid rgba(61,79,110,0.16)" }}>
              Read-Only
            </span>
          }
        />
        <div className="px-5 py-4 text-[12px] flex items-start gap-3" style={{ color: "rgba(107,122,153,0.60)" }}>
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "rgba(107,122,153,0.45)" }} />
          <span>
            Meta account intelligence requires an active Meta Business integration. Connect an account in{" "}
            <Link href="/settings" className="underline underline-offset-2 transition-opacity hover:opacity-100 opacity-80" style={{ color: "#4aabff" }}>
              Settings
            </Link>{" "}
            to unlock live campaign and audience data.
          </span>
        </div>
      </VCPanel>

      {/* ── Hermes Operator ───────────────────────────────────── */}
      <div className="vc-panel">
        {/* Card header */}
        <div className="vc-panel-header">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(0,129,242,0.18) 0%, rgba(0,79,176,0.10) 100%)",
                border: "1px solid rgba(0,129,242,0.28)",
              }}
            >
              <Terminal size={13} style={{ color: "#4aabff" }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold leading-tight" style={{ color: "var(--t-text)" }}>
                Hermes Operator
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                Execution layer connected to Veronica
              </div>
            </div>
          </div>
          <span className="vc-label px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(61,79,110,0.10)", border: "1px solid rgba(61,79,110,0.16)" }}>
            External
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* Safety warning */}
          <div
            className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg text-[11px] leading-relaxed"
            style={{
              backgroundColor: "rgba(255,132,0,0.05)",
              border: "1px solid rgba(255,132,0,0.16)",
              color: "rgba(255,160,50,0.85)",
            }}
          >
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#ff8400" }} />
            <span>
              Hermes can prepare drafts, SOPs, audits, and operator plans. It cannot launch ads,
              change budgets, send emails, delete data, or modify production systems without approval.
            </span>
          </div>

          {/* Prompt textarea */}
          <div className="space-y-2">
            <label
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "rgba(107,122,153,0.65)" }}
            >
              Prompt
            </label>
            <textarea
              rows={4}
              placeholder="Describe the task for Hermes — e.g. &quot;Draft a 30-day onboarding SOP for a new roofing client&quot;"
              value={hermesPrompt}
              onChange={(e) => setHermesPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runHermes();
              }}
              className="w-full rounded-lg px-3.5 py-3 text-[12px] resize-none outline-none transition-all"
              style={{
                backgroundColor: "rgba(0,129,242,0.04)",
                border: "1px solid rgba(61,79,110,0.28)",
                color: "var(--t-text)",
                lineHeight: "1.6",
              }}
            />
          </div>

          {/* Run button */}
          <button
            onClick={runHermes}
            disabled={hermesLoading || !hermesPrompt.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "rgba(0,129,242,0.14)",
              border: "1px solid rgba(0,129,242,0.30)",
              color: "#4aabff",
            }}
          >
            {hermesLoading ? (
              <>
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "rgba(74,171,255,0.4)", borderTopColor: "transparent" }}
                />
                Running Hermes…
              </>
            ) : (
              <>
                <Play size={12} />
                Run Hermes
              </>
            )}
          </button>

          {/* Error state */}
          {hermesError && (
            <div
              className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg text-[11px] leading-relaxed"
              style={{
                backgroundColor: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.16)",
                color: "#ef4444",
              }}
            >
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{hermesError}</span>
            </div>
          )}

          {/* Output panel */}
          {hermesOutput !== null && !hermesError && (
            <div ref={hermesOutputRef} className="space-y-1.5">
              <div
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "rgba(107,122,153,0.65)" }}
              >
                Output
              </div>
              <div
                className="rounded-lg px-4 py-4 text-[12px] leading-relaxed whitespace-pre-wrap"
                style={{
                  backgroundColor: "rgba(0,129,242,0.04)",
                  border: "1px solid rgba(0,129,242,0.12)",
                  color: "var(--t-text)",
                  fontFamily: "inherit",
                  maxHeight: "420px",
                  overflowY: "auto",
                }}
              >
                {hermesOutput}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Operations Feed ───────────────────────────────────── */}
      <VOperationsFeed
        runs={hermesRuns}
        skills={hermesSkills}
        runsLoading={hermesRunsLoading}
        skillsLoading={hermesSkillsLoading}
        runningSkillId={runningSkillId}
        onRunSkill={runSkill}
      />

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div>
        <div
          className="text-[10px] font-bold uppercase tracking-widest mb-3"
          style={{ color: "rgba(107,122,153,0.55)" }}
        >
          Quick Actions
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            {
              href: "/ai-agent/console",
              label: "Veronica Console",
              icon: Sparkles,
              color: "#0081f2",
              badge: undefined as string | undefined,
              highlight: true,
            },
            {
              href: "/clients",
              label: "Manage Clients",
              icon: Users,
              color: "#0081f2",
              badge: undefined,
              highlight: false,
            },
            {
              href: "/approvals",
              label: "Review Approvals",
              icon: CheckSquare,
              color: "#ff8400",
              badge: pendingPlans > 0 ? String(pendingPlans) : undefined,
              highlight: false,
            },
            {
              href: "/operator-queue",
              label: "Operator Queue",
              icon: ListChecks,
              color: "#0081f2",
              badge: urgentTasks > 0 ? `${urgentTasks} urgent` : undefined,
              highlight: false,
            },
            {
              href: "/campaigns",
              label: "View Campaigns",
              icon: Megaphone,
              color: "#0081f2",
              badge: undefined,
              highlight: false,
            },
            {
              href: "/reports",
              label: "Client Reports",
              icon: FileText,
              color: "#0081f2",
              badge: undefined,
              highlight: false,
            },
            {
              href: "/creatives",
              label: "Creative Library",
              icon: ImageIcon,
              color: "#0081f2",
              badge: undefined,
              highlight: false,
            },
          ].map(({ href, label, icon: Icon, color, badge, highlight }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all"
              style={{
                backgroundColor: highlight
                  ? "rgba(0,129,242,0.08)"
                  : "var(--t-input-bg)",
                border: highlight
                  ? "1px solid rgba(0,129,242,0.22)"
                  : "1px solid var(--t-border)",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${color}14`,
                  border: `1px solid ${color}28`,
                }}
              >
                <Icon size={15} style={{ color }} />
              </div>
              <span
                className="text-[12px] font-medium flex-1 truncate"
                style={{
                  color: highlight ? "#4aabff" : "var(--t-muted)",
                }}
              >
                {label}
              </span>
              {badge && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    color: "#ff8400",
                    backgroundColor: "rgba(255,132,0,0.12)",
                    border: "1px solid rgba(255,132,0,0.20)",
                  }}
                >
                  {badge}
                </span>
              )}
              <ArrowRight
                size={12}
                style={{ color: "rgba(107,122,153,0.40)" }}
                className="flex-shrink-0"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
