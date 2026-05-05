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

// ── Veronica status messages (honest, not fake activity) ──────
const agentLog = [
  { time: "System", action: "Veronica is online and ready to generate campaign drafts, analyse creatives, and prepare weekly reports.", type: "blue" },
  { time: "Tip", action: "Open a client, run Client Intelligence extraction, then use the AI Campaign Builder to generate a live Anthropic campaign draft.", type: "success" },
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

  // Pending campaign drafts from Supabase (needs_review status)
  const pendingDrafts = plans.filter((p) => p.status === "needs_review").slice(0, 3);

  // Active campaigns from Supabase clients
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
          backgroundColor: "#0D1520",
          border: "1px solid rgba(0, 129, 242, 0.15)",
        }}
      >
        <div
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: "rgba(0, 129, 242, 0.08)" }}
        />
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
              {loading ? "Loading…" : `${clients.length} clients · ${activeClients.length} active`} · Veronica monitoring 24/7
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
              { label: "Active Clients", value: loading ? "—" : String(activeClients.length), color: "#0081f2" },
              { label: "Leads (MTD)", value: loading ? "—" : String(totalLeads), color: "#22c55e" },
              { label: "Pending Approvals", value: String(pendingDrafts.length), color: "#ff8400" },
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

      {/* Stats — from Supabase client records (no fake change %) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Meta / GHL not-connected notice */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
          style={{
            backgroundColor: "#0D1520",
            border: "1px solid rgba(61, 79, 110, 0.35)",
          }}
        >
          <WifiOff size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#3d4f6e" }} />
          <div>
            <p className="text-[12px] font-semibold" style={{ color: "#6b7a99" }}>Meta Ads not connected</p>
            <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "#3d4f6e" }}>
              Performance analytics will appear once Meta read-only reporting is connected.
            </p>
          </div>
        </div>
        <div
          className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
          style={{
            backgroundColor: "#0D1520",
            border: "1px solid rgba(61, 79, 110, 0.35)",
          }}
        >
          <WifiOff size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#3d4f6e" }} />
          <div>
            <p className="text-[12px] font-semibold" style={{ color: "#6b7a99" }}>GoHighLevel not connected</p>
            <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "#3d4f6e" }}>
              Appointment and pipeline data will appear once GHL sync is connected.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Campaign table — Supabase data */}
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
            {loading ? (
              <div className="px-5 py-8 text-center text-[12px]" style={{ color: "#3d4f6e" }}>Loading campaigns…</div>
            ) : activeCampaignRows.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[12px] font-medium" style={{ color: "#6b7a99" }}>No active campaigns yet</p>
                <p className="text-[11px] mt-1" style={{ color: "#3d4f6e" }}>Use the AI Campaign Builder to generate a campaign draft for a client.</p>
              </div>
            ) : (
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
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Veronica Status */}
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
                <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse"></span>
                Online
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

          {/* Pending Approvals — Supabase campaign drafts only */}
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
                {pendingDrafts.length} pending
              </span>
            </div>
            <div className="p-3 space-y-2">
              {pendingDrafts.length === 0 ? (
                <p className="text-[11px] px-1 py-3 text-center" style={{ color: "#3d4f6e" }}>No pending approvals</p>
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
                      <div className="text-[11px] font-semibold truncate" style={{ color: "#f8f8f7" }}>
                        {a.clientName}
                      </div>
                      <div className="text-[10px] mt-0.5 leading-snug truncate" style={{ color: "#6b7a99" }}>
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
