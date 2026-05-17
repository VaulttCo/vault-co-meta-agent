"use client";

// Vault Co Revenue Dashboard — Phase 1
// Uses only real data from Supabase (clients, approvals, drafts, operator tasks).
// No revenue numbers are fabricated. Revenue tracking is flagged as coming soon.

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  CheckSquare,
  ListChecks,
  TrendingUp,
  AlertCircle,
  Clock,
  Zap,
  BarChart3,
  ChevronRight,
  Loader2,
  FileText,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import type { CampaignDraft } from "@/lib/planStore";

interface OperatorTask {
  id: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  description: string | null;
  taskType: string;
  priority: string;
  status: string;
  createdAt: string;
}

export default function RevenueDashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [tasks, setTasks] = useState<OperatorTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDataProvider();
    Promise.all([
      db.getClients(),
      db.getCampaignDrafts(),
      fetch("/api/operator-tasks").then((r) => r.ok ? r.json() : { tasks: [] }).then((d) => d.tasks ?? []),
    ]).then(([c, d, t]) => {
      setClients(c);
      setDrafts(d);
      setTasks(t);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Client breakdown by status
  const onboardingClients = clients.filter((c) => c.status === "onboarding");
  const setupClients = clients.filter((c) => c.status === "setup");
  const activeClients = clients.filter((c) => c.status === "active");
  const pausedClients = clients.filter((c) => c.status === "paused");
  const prelaunchClients = [...onboardingClients, ...setupClients];

  // Approval/draft metrics
  const pendingApprovalDrafts = drafts.filter((d) => d.status === "needs_review");
  const approvedDrafts = drafts.filter((d) => d.status === "approved" || d.status === "ready_for_meta");
  const liveDrafts = drafts.filter((d) => d.status === "live");

  // Operator task metrics
  const openTasks = tasks.filter((t) => t.status === "open" || t.status === "in_progress");
  const urgentTasks = tasks.filter((t) => t.priority === "urgent" && t.status !== "done" && t.status !== "archived");
  const blockedTasks = tasks.filter((t) => t.status === "blocked");
  const recentPriorityTasks = tasks
    .filter((t) => (t.priority === "urgent" || t.priority === "high") && t.status !== "done" && t.status !== "archived")
    .slice(0, 6);

  // Recent approved drafts
  const recentApprovedDrafts = approvedDrafts.slice(0, 5);

  const summaryCards = [
    {
      label: "Total Clients",
      value: loading ? "—" : String(clients.length),
      sub: loading ? "" : `${activeClients.length} active · ${prelaunchClients.length} pre-launch`,
      icon: Users,
      color: "#0081f2",
      bg: "rgba(0,129,242,0.08)",
      border: "rgba(0,129,242,0.15)",
      href: "/clients",
    },
    {
      label: "Pending Approvals",
      value: loading ? "—" : String(pendingApprovalDrafts.length),
      sub: loading ? "" : `${approvedDrafts.length} approved · ${liveDrafts.length} live`,
      icon: CheckSquare,
      color: "#ff8400",
      bg: "rgba(255,132,0,0.08)",
      border: "rgba(255,132,0,0.15)",
      href: "/approvals",
    },
    {
      label: "Open Operator Tasks",
      value: loading ? "—" : String(openTasks.length),
      sub: loading ? "" : `${urgentTasks.length} urgent · ${blockedTasks.length} blocked`,
      icon: ListChecks,
      color: "#a78bfa",
      bg: "rgba(167,139,250,0.08)",
      border: "rgba(167,139,250,0.15)",
      href: "/operator-queue",
    },
    {
      label: "Pre-Launch Clients",
      value: loading ? "—" : String(prelaunchClients.length),
      sub: loading ? "" : `${setupClients.length} setup · ${onboardingClients.length} onboarding`,
      icon: AlertCircle,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.15)",
      href: "/clients",
    },
  ];

  const statusBreakdown = [
    { label: "Active", count: activeClients.length, color: "#22c55e", bg: "rgba(34,197,94,0.10)" },
    { label: "Setup", count: setupClients.length, color: "#0081f2", bg: "rgba(0,129,242,0.10)" },
    { label: "Onboarding", count: onboardingClients.length, color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
    { label: "Paused", count: pausedClients.length, color: "rgba(107,122,153,0.7)", bg: "rgba(61,79,110,0.10)" },
  ];

  const priorityColors: Record<string, string> = {
    urgent: "#ef4444",
    high: "#ff8400",
    medium: "#f59e0b",
    low: "#6b7a99",
  };

  const statusColors: Record<string, string> = {
    open: "#0081f2",
    in_progress: "#22c55e",
    blocked: "#ef4444",
    done: "#6b7a99",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div
        className="relative overflow-hidden rounded-xl"
        style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
      >
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(255,132,0,0.07)" }} />
        <div className="relative px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <TrendingUp size={18} style={{ color: "#ff8400" }} />
              <h1
                className="text-[20px] font-bold tracking-wide"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
              >
                Vault Co Revenue Dashboard
              </h1>
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ color: "#ff8400", backgroundColor: "rgba(255,132,0,0.10)", border: "1px solid rgba(255,132,0,0.20)" }}
              >
                Phase 1
              </span>
            </div>
            <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>
              Executive view — clients, approvals, tasks, and launch status. Revenue tracking coming soon.
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1 text-[11px] flex-shrink-0"
            style={{ color: "var(--t-dim)" }}
          >
            Command Hub <ChevronRight size={11} />
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-xl p-5 flex flex-col gap-3 transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.bg, border: `1px solid ${card.border}` }}>
                  <Icon size={14} style={{ color: card.color }} />
                </div>
                {loading && <Loader2 size={12} className="animate-spin" style={{ color: "var(--t-dim)" }} />}
              </div>
              <div>
                <div className="text-[24px] font-bold" style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: card.color }}>
                  {card.value}
                </div>
                <div className="text-[11px] font-medium" style={{ color: "var(--t-text)" }}>{card.label}</div>
                {card.sub && <div className="text-[10px] mt-0.5" style={{ color: "var(--t-dim)" }}>{card.sub}</div>}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Client status breakdown + Revenue placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Client status breakdown */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
        >
          <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
            <Users size={13} style={{ color: "#0081f2" }} />
            <span className="text-[13px] font-bold tracking-wide" style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
              Client Status
            </span>
            <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--t-dim)" }}>{loading ? "—" : clients.length} total</span>
          </div>
          <div className="p-4 space-y-2.5">
            {statusBreakdown.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[12px] flex-1" style={{ color: "var(--t-text)" }}>{s.label}</span>
                <span
                  className="text-[12px] font-bold px-2 py-0.5 rounded"
                  style={{ color: s.color, backgroundColor: s.bg }}
                >
                  {loading ? "—" : s.count}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t" style={{ borderColor: "var(--t-border-nav)" }}>
              <Link href="/clients" className="text-[11px] font-semibold flex items-center gap-1 transition-colors" style={{ color: "#0081f2" }}>
                View all clients <ChevronRight size={10} />
              </Link>
            </div>
          </div>
        </div>

        {/* Revenue coming soon */}
        <div
          className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
        >
          <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
            <DollarSign size={13} style={{ color: "#ff8400" }} />
            <span className="text-[13px] font-bold tracking-wide" style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
              Revenue &amp; Retainers
            </span>
            <span
              className="ml-auto text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ color: "rgba(107,122,153,0.7)", backgroundColor: "rgba(61,79,110,0.10)", border: "1px solid rgba(61,79,110,0.18)" }}
            >
              Coming Soon
            </span>
          </div>
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,132,0,0.08)", border: "1px solid rgba(255,132,0,0.15)" }}
            >
              <BarChart3 size={20} style={{ color: "#ff8400" }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Revenue tracking coming soon</p>
              <p className="text-[11px] leading-snug max-w-xs" style={{ color: "var(--t-dim)" }}>
                Phase 2 will add monthly retainer totals, MRR growth, client lifetime value, and revenue-per-campaign tracking. Data is not yet available.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {["Monthly Retainers", "MRR Growth", "Client LTV", "Revenue per Campaign"].map((item) => (
                <span
                  key={item}
                  className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                  style={{ color: "rgba(107,122,153,0.6)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Priority tasks + recent approved drafts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top priority tasks */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
        >
          <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
            <Zap size={13} style={{ color: "#a78bfa" }} />
            <span className="text-[13px] font-bold tracking-wide" style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
              Top Priority Tasks
            </span>
            {urgentTasks.length > 0 && (
              <span
                className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: "#ef4444", backgroundColor: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}
              >
                {urgentTasks.length} urgent
              </span>
            )}
          </div>
          <div className="divide-y" style={{ borderColor: "var(--t-border-nav)" }}>
            {loading ? (
              <div className="px-5 py-8 text-center flex items-center justify-center gap-2" style={{ color: "var(--t-dim)" }}>
                <Loader2 size={13} className="animate-spin" />
                <span className="text-[12px]">Loading tasks…</span>
              </div>
            ) : recentPriorityTasks.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[12px]" style={{ color: "var(--t-dim)" }}>No urgent or high-priority tasks open.</p>
              </div>
            ) : (
              recentPriorityTasks.map((task) => (
                <div key={task.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                        style={{ color: priorityColors[task.priority] ?? "#6b7a99", backgroundColor: `${priorityColors[task.priority] ?? "#6b7a99"}15` }}
                      >
                        {task.priority}
                      </span>
                      {task.clientName && (
                        <span className="text-[10px]" style={{ color: "var(--t-dim)" }}>{task.clientName}</span>
                      )}
                    </div>
                    <div className="text-[12px] font-medium leading-snug" style={{ color: "var(--t-text)" }}>{task.title}</div>
                  </div>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                    style={{ color: statusColors[task.status] ?? "#6b7a99", backgroundColor: `${statusColors[task.status] ?? "#6b7a99"}15` }}
                  >
                    {task.status}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="px-5 py-3 border-t" style={{ borderColor: "var(--t-border-nav)" }}>
            <Link href="/operator-queue" className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "#a78bfa" }}>
              Open Operator Queue <ChevronRight size={10} />
            </Link>
          </div>
        </div>

        {/* Recent approved Veronica drafts */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
        >
          <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
            <FileText size={13} style={{ color: "#22c55e" }} />
            <span className="text-[13px] font-bold tracking-wide" style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
              Approved Veronica Drafts
            </span>
            {approvedDrafts.length > 0 && (
              <span
                className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)" }}
              >
                {approvedDrafts.length}
              </span>
            )}
          </div>
          <div className="divide-y" style={{ borderColor: "var(--t-border-nav)" }}>
            {loading ? (
              <div className="px-5 py-8 text-center flex items-center justify-center gap-2" style={{ color: "var(--t-dim)" }}>
                <Loader2 size={13} className="animate-spin" />
                <span className="text-[12px]">Loading drafts…</span>
              </div>
            ) : recentApprovedDrafts.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[12px]" style={{ color: "var(--t-dim)" }}>No approved drafts yet.</p>
                <Link
                  href="/approvals"
                  className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold"
                  style={{ color: "#0081f2" }}
                >
                  Go to Approvals <ChevronRight size={10} />
                </Link>
              </div>
            ) : (
              recentApprovedDrafts.map((draft) => (
                <div key={draft.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: draft.status === "ready_for_meta" ? "#ff8400" : "#22c55e" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium leading-snug truncate" style={{ color: "var(--t-text)" }}>
                      {draft.campaignName}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--t-dim)" }}>
                      {draft.clientName} · {draft.status === "ready_for_meta" ? "Ready for Meta" : "Approved"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-5 py-3 border-t" style={{ borderColor: "var(--t-border-nav)" }}>
            <Link href="/approvals" className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "#22c55e" }}>
              View Approvals Queue <ChevronRight size={10} />
            </Link>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div
        className="flex items-start gap-3 px-5 py-3.5 rounded-xl"
        style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
      >
        <ShieldCheck size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--t-dim)" }} />
        <p className="text-[11px] leading-snug" style={{ color: "var(--t-dim)" }}>
          All data on this dashboard is read-only from Supabase. No revenue figures are fabricated — revenue tracking will be added in Phase 2 when retainer data is available.
        </p>
      </div>

    </div>
  );
}
