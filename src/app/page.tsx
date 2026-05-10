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

export default function DashboardPage() {
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

      {/* Branded hero */}
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--t-surface)",
          border: "1px solid var(--t-border)",
          boxShadow: "var(--t-card-shadow)",
        }}
      >
        <div
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: "rgba(0, 129, 242, 0.07)" }}
        />
        <div
          className="absolute -top-20 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: "rgba(255, 132, 0, 0.06)" }}
        />
        <div className="relative flex items-center gap-5 px-6 py-5">
          <Image
            src="/vaultco-logo.png"
            alt="Vault Co"
            width={52}
            height={52}
            className="object-contain flex-shrink-0"
            priority
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <h1
                className="text-[20px] font-bold tracking-wide"
                style={{
                  fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                  color: "var(--t-text)",
                }}
              >
                Client Growth Command Center
              </h1>
              <span
                className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                style={{
                  color: "#22c55e",
                  backgroundColor: "rgba(34, 197, 94, 0.10)",
                  border: "1px solid rgba(34, 197, 94, 0.20)",
                }}
              >
                <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>
              {loading ? "Loading…" : `${clients.length} clients · ${activeClients.length} active`} · Veronica monitoring 24/7
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--t-dim)" }}>
              Veronica by Vault Co — AI Growth Operator
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
              <div
                key={s.label}
                className="flex flex-col items-center px-5 py-1"
                style={{ borderColor: "var(--t-border-nav)" }}
              >
                <span
                  className="text-[20px] font-bold"
                  style={{
                    fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                    color: s.color,
                  }}
                >
                  {s.value}
                </span>
                <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap" style={{ color: "var(--t-muted)" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
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
            style={{
              backgroundColor: "var(--t-surface)",
              border: "1px solid var(--t-border)",
            }}
          >
            <WifiOff size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--t-dim)" }} />
            <div>
              <p className="text-[12px] font-semibold" style={{ color: "var(--t-muted)" }}>{item.label}</p>
              <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--t-dim)" }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Campaign table */}
        <div
          className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--t-surface)",
            border: "1px solid var(--t-border)",
            boxShadow: "var(--t-card-shadow)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "var(--t-border-nav)" }}
          >
            <div className="flex items-center gap-2">
              <Megaphone size={14} style={{ color: "#0081f2" }} />
              <span
                className="text-[14px] font-bold tracking-wide"
                style={{
                  fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                  color: "var(--t-text)",
                }}
              >
                Active Campaigns
              </span>
            </div>
            <Link
              href="/campaigns"
              className="flex items-center gap-1 text-[11px] transition-colors"
              style={{ color: "var(--t-muted)" }}
            >
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
                      <th
                        key={h}
                        className={`px-4 py-3 text-[9px] font-bold uppercase tracking-widest ${h === "Client" || h === "Campaign" ? "text-left" : "text-right"}`}
                        style={{ color: "var(--t-dim)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCampaignRows.map((c, i) => (
                    <tr
                      key={c.id}
                      className="border-b transition-colors"
                      style={{
                        borderColor: i === activeCampaignRows.length - 1 ? "transparent" : "var(--t-border-subtle)",
                      }}
                    >
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
            style={{
              backgroundColor: "var(--t-surface)",
              border: "1px solid var(--t-border)",
              boxShadow: "var(--t-card-shadow)",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3.5 border-b"
              style={{ borderColor: "var(--t-border-nav)" }}
            >
              <div className="flex items-center gap-2">
                <Activity size={13} style={{ color: "#0081f2" }} />
                <span
                  className="text-[14px] font-bold tracking-wide"
                  style={{
                    fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                    color: "var(--t-text)",
                  }}
                >
                  Veronica Status
                </span>
              </div>
              <span
                className="flex items-center gap-1.5 text-[9px] font-bold rounded-full px-2 py-0.5"
                style={{
                  color: "#22c55e",
                  backgroundColor: "rgba(34, 197, 94, 0.10)",
                  border: "1px solid rgba(34, 197, 94, 0.20)",
                }}
              >
                <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse" />
                Online
              </span>
            </div>
            <div className="p-3 space-y-2">
              {agentLog.map((entry, i) => (
                <div
                  key={i}
                  className="flex gap-2.5 p-2.5 rounded-lg"
                  style={{
                    backgroundColor: "var(--t-surface-2)",
                    border: "1px solid var(--t-border-subtle)",
                  }}
                >
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
                style={{
                  color: "#0081f2",
                  backgroundColor: "rgba(0, 129, 242, 0.08)",
                  border: "1px solid rgba(0, 129, 242, 0.18)",
                }}
              >
                Open Veronica →
              </Link>
            </div>
          </div>

          {/* Pending Approvals */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: "var(--t-surface)",
              border: "1px solid var(--t-border)",
              boxShadow: "var(--t-card-shadow)",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3.5 border-b"
              style={{ borderColor: "var(--t-border-nav)" }}
            >
              <div className="flex items-center gap-2">
                <CheckSquare size={13} style={{ color: "#ff8400" }} />
                <span
                  className="text-[14px] font-bold tracking-wide"
                  style={{
                    fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                    color: "var(--t-text)",
                  }}
                >
                  Pending Approvals
                </span>
              </div>
              {pendingDrafts.length > 0 && (
                <span
                  className="text-[9px] font-bold rounded-full px-2 py-0.5"
                  style={{
                    color: "#ff8400",
                    backgroundColor: "rgba(255, 132, 0, 0.10)",
                    border: "1px solid rgba(255, 132, 0, 0.20)",
                  }}
                >
                  {pendingDrafts.length} pending
                </span>
              )}
            </div>
            <div className="p-3 space-y-2">
              {pendingDrafts.length === 0 ? (
                <p className="text-[11px] px-1 py-4 text-center" style={{ color: "var(--t-dim)" }}>No pending approvals</p>
              ) : (
                pendingDrafts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-lg"
                    style={{
                      backgroundColor: "rgba(255, 132, 0, 0.04)",
                      border: "1px solid rgba(255, 132, 0, 0.10)",
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold truncate" style={{ color: "var(--t-text)" }}>
                        {a.clientName}
                      </div>
                      <div className="text-[10px] mt-0.5 leading-snug truncate" style={{ color: "var(--t-muted)" }}>
                        {a.campaignName}
                      </div>
                    </div>
                    <Link
                      href="/approvals"
                      className="flex-shrink-0 px-2 py-1 text-[10px] font-semibold rounded-md transition-colors whitespace-nowrap"
                      style={{
                        color: "#ff8400",
                        backgroundColor: "rgba(255, 132, 0, 0.10)",
                        border: "1px solid rgba(255, 132, 0, 0.20)",
                      }}
                    >
                      Review
                    </Link>
                  </div>
                ))
              )}
            </div>
            <div className="px-3 pb-3">
              <Link
                href="/approvals"
                className="block w-full text-center text-[11px] font-semibold py-1 transition-colors"
                style={{ color: "var(--t-muted)" }}
              >
                View all approvals →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
