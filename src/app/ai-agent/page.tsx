"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { usePlans } from "@/components/PlanProvider";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";

interface OperatorTask {
  id: string;
  title: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: string;
  taskType: string;
  clientName?: string | null;
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: "rgba(0,129,242,0.04)",
        border: "1px solid rgba(0,129,242,0.10)",
      }}
    >
      <div
        className="text-[24px] font-bold leading-none"
        style={{ color: color ?? "var(--t-text)" }}
      >
        {value}
      </div>
      <div
        className="text-[11px] font-medium mt-1.5"
        style={{ color: "var(--t-muted)" }}
      >
        {label}
      </div>
    </div>
  );
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

  return (
    <div className="max-w-[1100px] mx-auto space-y-6">

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

      {/* ── Client Intelligence + Fulfillment Pipeline ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Client Intelligence */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--t-input-bg)",
            border: "1px solid var(--t-border)",
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: "var(--t-border)" }}
          >
            <div className="flex items-center gap-2">
              <Users size={14} style={{ color: "#0081f2" }} />
              <span
                className="text-[13px] font-semibold"
                style={{ color: "var(--t-text)" }}
              >
                Client Intelligence
              </span>
            </div>
            <Link
              href="/clients"
              className="text-[11px] flex items-center gap-1 transition-opacity hover:opacity-100 opacity-70"
              style={{ color: "var(--t-muted)" }}
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>

          <div className="p-4 grid grid-cols-2 gap-3">
            <StatTile
              label="Total Clients"
              value={loadingClients ? "—" : totalClients}
            />
            <StatTile
              label="Active"
              value={loadingClients ? "—" : activeClients}
              color="#22c55e"
            />
            <StatTile
              label="Setup / Onboarding"
              value={loadingClients ? "—" : onboardingClients}
              color="#ff8400"
            />
            <StatTile
              label="Paused / Archived"
              value={loadingClients ? "—" : blockedClients}
              color={blockedClients > 0 ? "#ef4444" : undefined}
            />
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
                {missingConnections} client
                {missingConnections !== 1 ? "s" : ""} missing Meta or GHL
                connection — launch blocked
              </div>
            </div>
          )}
        </div>

        {/* Fulfillment Pipeline */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--t-input-bg)",
            border: "1px solid var(--t-border)",
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: "var(--t-border)" }}
          >
            <div className="flex items-center gap-2">
              <Zap size={14} style={{ color: "#0081f2" }} />
              <span
                className="text-[13px] font-semibold"
                style={{ color: "var(--t-text)" }}
              >
                Fulfillment Pipeline
              </span>
            </div>
            <Link
              href="/operator-queue"
              className="text-[11px] flex items-center gap-1 transition-opacity hover:opacity-100 opacity-70"
              style={{ color: "var(--t-muted)" }}
            >
              Operator Queue <ArrowRight size={11} />
            </Link>
          </div>

          <div className="p-4 grid grid-cols-3 gap-3">
            <StatTile
              label="Open Tasks"
              value={loadingTasks ? "—" : openTasks}
            />
            <StatTile
              label="Urgent"
              value={loadingTasks ? "—" : urgentTasks}
              color={urgentTasks > 0 ? "#ef4444" : undefined}
            />
            <StatTile
              label="Blocked"
              value={loadingTasks ? "—" : blockedTasks}
              color={blockedTasks > 0 ? "#ff8400" : undefined}
            />
          </div>

          <div className="px-4 pb-4 grid grid-cols-2 gap-3">
            <StatTile
              label="Pending Approval"
              value={pendingPlans}
              color={pendingPlans > 0 ? "#ff8400" : undefined}
            />
            <StatTile label="Drafts In Progress" value={draftPlans} />
          </div>
        </div>
      </div>

      {/* ── Approval Queue + Operator Execution ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Approval Queue */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--t-input-bg)",
            border: "1px solid var(--t-border)",
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: "var(--t-border)" }}
          >
            <div className="flex items-center gap-2">
              <CheckSquare size={14} style={{ color: "#0081f2" }} />
              <span
                className="text-[13px] font-semibold"
                style={{ color: "var(--t-text)" }}
              >
                Approval Queue
              </span>
              {pendingPlans > 0 && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    color: "#ff8400",
                    backgroundColor: "rgba(255,132,0,0.10)",
                    border: "1px solid rgba(255,132,0,0.20)",
                  }}
                >
                  {pendingPlans} pending
                </span>
              )}
            </div>
            <Link
              href="/approvals"
              className="text-[11px] flex items-center gap-1 transition-opacity hover:opacity-100 opacity-70"
              style={{ color: "var(--t-muted)" }}
            >
              Review <ArrowRight size={11} />
            </Link>
          </div>

          <div className="p-5 space-y-3">
            {[
              {
                label: "Needs Human Review",
                count: pendingPlans,
                color: "#ff8400",
                icon: Clock,
              },
              {
                label: "Approved Drafts",
                count: approvedPlans,
                color: "#22c55e",
                icon: CheckCircle2,
              },
              {
                label: "Rejected / Changes Requested",
                count: rejectedPlans,
                color: "#ef4444",
                icon: XCircle,
              },
            ].map(({ label, count, color, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between">
                <div
                  className="flex items-center gap-2 text-[12px]"
                  style={{ color: "var(--t-muted)" }}
                >
                  <Icon size={13} style={{ color }} />
                  {label}
                </div>
                <span
                  className="text-[14px] font-bold tabular-nums"
                  style={{
                    color:
                      count > 0 ? color : "rgba(107,122,153,0.35)",
                  }}
                >
                  {count}
                </span>
              </div>
            ))}

            {plans.length === 0 && (
              <p
                className="text-[12px] text-center py-3"
                style={{ color: "rgba(107,122,153,0.50)" }}
              >
                No campaign drafts yet — open the Veronica Console to generate
                one.
              </p>
            )}
          </div>
        </div>

        {/* Operator Execution */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--t-input-bg)",
            border: "1px solid var(--t-border)",
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: "var(--t-border)" }}
          >
            <div className="flex items-center gap-2">
              <ListChecks size={14} style={{ color: "#0081f2" }} />
              <span
                className="text-[13px] font-semibold"
                style={{ color: "var(--t-text)" }}
              >
                Operator Execution
              </span>
            </div>
            <Link
              href="/operator-queue"
              className="text-[11px] flex items-center gap-1 transition-opacity hover:opacity-100 opacity-70"
              style={{ color: "var(--t-muted)" }}
            >
              Full Queue <ArrowRight size={11} />
            </Link>
          </div>

          <div className="p-4">
            {loadingTasks ? (
              <p
                className="text-[12px] text-center py-6"
                style={{ color: "rgba(107,122,153,0.50)" }}
              >
                Loading tasks…
              </p>
            ) : topTasks.length === 0 ? (
              <p
                className="text-[12px] text-center py-6"
                style={{ color: "rgba(107,122,153,0.50)" }}
              >
                No open tasks in the queue.
              </p>
            ) : (
              <div className="space-y-2">
                {topTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
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
                      <div
                        className="text-[12px] font-medium truncate"
                        style={{ color: "var(--t-text)" }}
                      >
                        {task.title}
                      </div>
                      {task.clientName && (
                        <div
                          className="text-[10px] mt-0.5"
                          style={{ color: "rgba(107,122,153,0.65)" }}
                        >
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
        </div>
      </div>

      {/* ── Meta Intelligence ─────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--t-input-bg)",
          border: "1px solid var(--t-border)",
        }}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--t-border)" }}
        >
          <div className="flex items-center gap-2">
            <Brain size={14} style={{ color: "#0081f2" }} />
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--t-text)" }}
            >
              Meta Intelligence
            </span>
          </div>
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded"
            style={{
              color: "rgba(107,122,153,0.55)",
              backgroundColor: "rgba(61,79,110,0.10)",
              border: "1px solid rgba(61,79,110,0.16)",
            }}
          >
            Read-Only
          </span>
        </div>
        <div
          className="px-5 py-5 text-[12px] flex items-center gap-3"
          style={{ color: "rgba(107,122,153,0.60)" }}
        >
          <AlertCircle size={14} className="flex-shrink-0" style={{ color: "rgba(107,122,153,0.45)" }} />
          Meta account intelligence requires an active Meta Business integration.
          Connect an account in{" "}
          <Link
            href="/settings"
            className="underline underline-offset-2 transition-opacity hover:opacity-100 opacity-80"
            style={{ color: "#4aabff" }}
          >
            Settings
          </Link>{" "}
          to unlock live campaign and audience data.
        </div>
      </div>

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
