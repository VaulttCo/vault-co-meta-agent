"use client";

import { useState, useEffect } from "react";
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

const modules = [
  {
    icon: Bot,
    label: "Veronica AI",
    badge: "Live",
    badgeColor: "#22c55e",
    badgeBg: "rgba(34,197,94,0.12)",
    badgeBorder: "rgba(34,197,94,0.22)",
    desc: "Client operations brain for Meta, launch readiness, integrations, approvals, operator tasks, reporting, and campaign preparation.",
    cta: "Open Veronica",
    href: "/ai-agent",
    iconColor: "#0081f2",
    iconBg: "rgba(0,129,242,0.10)",
    iconBorder: "rgba(0,129,242,0.20)",
    active: true,
  },
  {
    icon: Mic2,
    label: "Victoria AI Sales Coach",
    badge: "Coming Soon",
    badgeColor: "rgba(107,122,153,0.85)",
    badgeBg: "rgba(61,79,110,0.12)",
    badgeBorder: "rgba(61,79,110,0.22)",
    desc: "Sales call coach for Vault Co and client teams. Will guide call questions, objection handling, follow-up, and call review.",
    cta: "Coming Soon",
    href: "/victoria",
    iconColor: "#a78bfa",
    iconBg: "rgba(167,139,250,0.10)",
    iconBorder: "rgba(167,139,250,0.20)",
    active: false,
  },
  {
    icon: BarChart3,
    label: "Vault Co Revenue Dashboard",
    badge: "Phase 1",
    badgeColor: "#ff8400",
    badgeBg: "rgba(255,132,0,0.10)",
    badgeBorder: "rgba(255,132,0,0.20)",
    desc: "Executive view for the Vault Co team. Track revenue, clients, launch blockers, approvals, tasks, retainers, and growth.",
    cta: "Open Revenue Dashboard",
    href: "/revenue-dashboard",
    iconColor: "#ff8400",
    iconBg: "rgba(255,132,0,0.10)",
    iconBorder: "rgba(255,132,0,0.20)",
    active: true,
  },
];

export default function CommandHubPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { plans } = usePlans();

  useEffect(() => {
    getDataProvider().getClients().then((data) => {
      setClients(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

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

  const activeCampaignRows = clients.flatMap((client) =>
    (client.campaigns ?? [])
      .filter((c) => c.status === "active")
      .map((c) => ({ ...c, clientName: client.name, market: client.market }))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* ── Command Hub hero ───────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--t-surface)",
          border: "1px solid var(--t-border)",
          boxShadow: "var(--t-card-shadow)",
        }}
      >
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(0,129,242,0.07)" }} />
        <div className="absolute -top-20 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(255,132,0,0.06)" }} />
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
                { label: "Pending Approvals", value: String(pendingDrafts.length), color: "#ff8400" },
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

      {/* ── Security / Access Control layer ────────────────────────────── */}
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

      {/* ── Hub modules ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.label}
              className="rounded-xl overflow-hidden flex flex-col"
              style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
            >
              <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: mod.iconBg, border: `1px solid ${mod.iconBorder}` }}
                  >
                    <Icon size={18} style={{ color: mod.iconColor }} />
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full flex-shrink-0"
                    style={{ color: mod.badgeColor, backgroundColor: mod.badgeBg, border: `1px solid ${mod.badgeBorder}` }}
                  >
                    {mod.badge}
                  </span>
                </div>
                <div>
                  <div
                    className="text-[14px] font-bold tracking-wide mb-1"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
                  >
                    {mod.label}
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                    {mod.desc}
                  </p>
                </div>
              </div>
              <div className="px-5 pb-5">
                {mod.active ? (
                  <Link
                    href={mod.href}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-90"
                    style={{ backgroundColor: mod.iconBg, border: `1px solid ${mod.iconBorder}`, color: mod.iconColor }}
                  >
                    {mod.cta}
                    <ArrowRight size={12} />
                  </Link>
                ) : (
                  <Link
                    href={mod.href}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-[12px] font-semibold"
                    style={{ backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)", color: "rgba(107,122,153,0.6)" }}
                  >
                    <Clock size={11} />
                    {mod.cta}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Operational stats ──────────────────────────────────────────── */}
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

      {/* ── Campaigns + right rail ─────────────────────────────────────── */}
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
                <Link
                  href="/ai-agent"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors"
                  style={{ backgroundColor: "rgba(0,129,242,0.10)", border: "1px solid rgba(0,129,242,0.20)", color: "#0081f2" }}
                >
                  <Bot size={11} />
                  Open Veronica Console
                </Link>
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
              <Link
                href="/ai-agent"
                className="block w-full text-center text-[11px] font-semibold py-2 rounded-lg transition-colors"
                style={{ color: "#0081f2", backgroundColor: "rgba(0,129,242,0.08)", border: "1px solid rgba(0,129,242,0.18)" }}
              >
                Open Veronica →
              </Link>
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
  );
}
