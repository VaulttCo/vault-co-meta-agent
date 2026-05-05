"use client";

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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { clients, approvals } from "@/lib/data";

// Aggregate stats from active clients only
const activeClients = clients.filter((c) => c.status === "active");
const totalSpend = activeClients.reduce((sum, c) => sum + parseInt(c.stats.spend.replace(/\D/g, "")), 0);
const totalLeads = activeClients.reduce((sum, c) => sum + c.stats.leads, 0);
const totalBooked = activeClients.reduce((sum, c) => sum + c.stats.booked, 0);
const avgCpl = totalLeads > 0 ? `$${(totalSpend / totalLeads).toFixed(2)}` : "—";

const stats = [
  { label: "Total Ad Spend", value: `$${totalSpend.toLocaleString()}`, change: "+9.2%", changeType: "up" as const, icon: DollarSign, iconColor: "#ff8400" },
  { label: "Leads Generated", value: totalLeads.toString(), change: "+24.1%", changeType: "up" as const, icon: Users, iconColor: "#0081f2" },
  { label: "Booked Appointments", value: totalBooked.toString(), change: "+11.8%", changeType: "up" as const, icon: CalendarCheck, iconColor: "#22c55e" },
  { label: "Avg. Cost Per Lead", value: avgCpl, change: "-12.4%", changeType: "up" as const, icon: TrendingDown, iconColor: "#a78bfa" },
];

const activeCampaignRows = clients.flatMap((client) =>
  client.campaigns
    .filter((c) => c.status === "active")
    .map((c) => ({ ...c, clientName: client.name, market: client.market }))
);

const agentLog = [
  { time: "14 min ago", action: "Veronica generated a roof inspection campaign draft for JJ Roofing Group — ready for review", type: "blue" },
  { time: "1 hr ago", action: "Veronica flagged low booking rate for Open Forge Construction — Bathroom Remodeling campaign at 20%", type: "warning" },
  { time: "2 hrs ago", action: "Veronica recommended storm damage creative for Acorns Roofing — storm season window active", type: "orange" },
  { time: "3 hrs ago", action: "Veronica detected high CPL on Kaczmar Builders remodeling campaign — $339 vs $200 target", type: "warning" },
  { time: "Yesterday", action: "Veronica prepared weekly report draft for JJ Roofing Group — 27 leads, 7 booked, $55 CPL", type: "success" },
  { time: "Yesterday", action: "Veronica is waiting for approval before Acorns Roofing Meta campaign can go live", type: "neutral" },
];

const pendingApprovals = approvals.slice(0, 3);

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Branded hero — matches onboarding portal dual-gradient style */}
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          backgroundColor: "#0D1520",
          border: "1px solid rgba(0, 129, 242, 0.15)",
        }}
      >
        {/* Blue glow top-left */}
        <div
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: "rgba(0, 129, 242, 0.08)" }}
        />
        {/* Orange glow top-right */}
        <div
          className="absolute -top-20 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: "rgba(255, 132, 0, 0.07)" }}
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
                  color: "#f8f8f7",
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
            <p className="text-[12px]" style={{ color: "#6b7a99" }}>
              {clients.length} clients · {activeClients.length} active · Veronica monitoring 24/7 · GHL + Meta connected
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "#3d4f6e" }}>
              Veronica by Vault Co — AI Growth Operator
            </p>
          </div>
          <div
            className="hidden lg:flex items-center gap-0 flex-shrink-0 divide-x"
            style={{ borderColor: "rgba(0, 129, 242, 0.12)" }}
          >
            {[
              { label: "Active Clients", value: String(activeClients.length), color: "#0081f2" },
              { label: "Leads (MTD)", value: String(totalLeads), color: "#22c55e" },
              { label: "Pending Approvals", value: String(approvals.length), color: "#ff8400" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center px-5 py-1"
                style={{ borderColor: "rgba(0, 129, 242, 0.12)" }}
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
                <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap" style={{ color: "#6b7a99" }}>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Campaign table */}
        <div
          className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{
            backgroundColor: "#0D1520",
            border: "1px solid rgba(0, 129, 242, 0.15)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "rgba(0, 129, 242, 0.12)" }}
          >
            <div className="flex items-center gap-2">
              <Megaphone size={14} style={{ color: "#0081f2" }} />
              <span
                className="text-[14px] font-bold tracking-wide"
                style={{
                  fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                  color: "#f8f8f7",
                }}
              >
                Active Campaigns
              </span>
            </div>
            <Link
              href="/campaigns"
              className="flex items-center gap-1 text-[11px] transition-colors"
              style={{ color: "#6b7a99" }}
            >
              View all <ChevronRight size={11} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b" style={{ borderColor: "rgba(0, 129, 242, 0.10)" }}>
                  {["Client", "Campaign", "Spend", "Leads", "CPL", "Booked"].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[9px] font-bold uppercase tracking-widest ${h === "Client" || h === "Campaign" ? "text-left" : "text-right"}`}
                      style={{ color: "#3d4f6e" }}
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
                      borderColor: i === activeCampaignRows.length - 1 ? "transparent" : "rgba(0, 129, 242, 0.08)",
                    }}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold" style={{ color: "#f8f8f7" }}>{c.clientName}</div>
                      <div className="text-[10px]" style={{ color: "#6b7a99" }}>{c.market}</div>
                    </td>
                    <td className="px-4 py-3.5" style={{ color: "#6b7a99" }}>{c.name}</td>
                    <td className="px-4 py-3.5 text-right" style={{ color: "#f8f8f7" }}>{c.spend}</td>
                    <td className="px-4 py-3.5 text-right font-semibold" style={{ color: "#0081f2" }}>{c.leads}</td>
                    <td className="px-4 py-3.5 text-right" style={{ color: "#f8f8f7" }}>{c.cpl}</td>
                    <td className="px-4 py-3.5 text-right font-semibold" style={{ color: "#22c55e" }}>{c.booked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Veronica Activity feed */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: "#0D1520",
              border: "1px solid rgba(0, 129, 242, 0.15)",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3.5 border-b"
              style={{ borderColor: "rgba(0, 129, 242, 0.12)" }}
            >
              <div className="flex items-center gap-2">
                <Activity size={13} style={{ color: "#0081f2" }} />
                <span
                  className="text-[14px] font-bold tracking-wide"
                  style={{
                    fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                    color: "#f8f8f7",
                  }}
                >
                  Veronica Activity
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
                <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse"></span>
                Live
              </span>
            </div>
            <div className="p-3 space-y-2">
              {agentLog.map((entry, i) => (
                <div
                  key={i}
                  className="flex gap-2.5 p-2.5 rounded-lg"
                  style={{
                    backgroundColor: "rgba(0, 129, 242, 0.04)",
                    border: "1px solid rgba(0, 129, 242, 0.08)",
                  }}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {entry.type === "success" && <Zap size={11} style={{ color: "#22c55e" }} />}
                    {entry.type === "warning" && <AlertCircle size={11} style={{ color: "#f59e0b" }} />}
                    {entry.type === "blue" && <Bot size={11} style={{ color: "#0081f2" }} />}
                    {entry.type === "orange" && <AlertCircle size={11} style={{ color: "#ff8400" }} />}
                    {entry.type === "neutral" && <AlertCircle size={11} style={{ color: "#6b7a99" }} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] leading-snug" style={{ color: "#f8f8f7" }}>{entry.action}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#6b7a99" }}>{entry.time}</p>
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

          {/* Pending approvals */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: "#0D1520",
              border: "1px solid rgba(0, 129, 242, 0.15)",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3.5 border-b"
              style={{ borderColor: "rgba(0, 129, 242, 0.12)" }}
            >
              <div className="flex items-center gap-2">
                <CheckSquare size={13} style={{ color: "#ff8400" }} />
                <span
                  className="text-[14px] font-bold tracking-wide"
                  style={{
                    fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                    color: "#f8f8f7",
                  }}
                >
                  Pending Approvals
                </span>
              </div>
              <span
                className="text-[9px] font-bold rounded-full px-2 py-0.5"
                style={{
                  color: "#ff8400",
                  backgroundColor: "rgba(255, 132, 0, 0.10)",
                  border: "1px solid rgba(255, 132, 0, 0.20)",
                }}
              >
                {approvals.length} pending
              </span>
            </div>
            <div className="p-3 space-y-2">
              {pendingApprovals.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-lg"
                  style={{
                    backgroundColor: "rgba(255, 132, 0, 0.04)",
                    border: "1px solid rgba(255, 132, 0, 0.10)",
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold truncate" style={{ color: "#f8f8f7" }}>
                      {a.clientName}
                    </div>
                    <div className="text-[10px] mt-0.5 leading-snug truncate" style={{ color: "#6b7a99" }}>
                      {a.item}
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
              ))}
            </div>
            <div className="px-3 pb-3">
              <Link
                href="/approvals"
                className="block w-full text-center text-[11px] font-semibold py-1 transition-colors"
                style={{ color: "#6b7a99" }}
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
