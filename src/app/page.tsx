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
  { label: "Total Ad Spend", value: `$${totalSpend.toLocaleString()}`, change: "+9.2%", changeType: "up" as const, icon: DollarSign, iconColor: "#f07820" },
  { label: "Leads Generated", value: totalLeads.toString(), change: "+24.1%", changeType: "up" as const, icon: Users, iconColor: "#18b8f0" },
  { label: "Booked Appointments", value: totalBooked.toString(), change: "+11.8%", changeType: "up" as const, icon: CalendarCheck, iconColor: "#22c55e" },
  { label: "Avg. Cost Per Lead", value: avgCpl, change: "-12.4%", changeType: "up" as const, icon: TrendingDown, iconColor: "#a78bfa" },
];

// Flatten active campaigns from all clients for the dashboard table
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

      {/* Branded hero */}
      <div className="relative overflow-hidden rounded-2xl border border-[#1c2438] bg-[#0c0f15]">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#18b8f0]/7 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-0 w-72 h-72 bg-[#f07820]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-5 px-6 py-4">
          <Image src="/vaultco-logo.png" alt="Vault Co" width={58} height={58} className="object-contain flex-shrink-0" priority />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-0.5">
              <h1 className="text-[17px] font-bold text-[#eef1f8] tracking-tight">Client Growth Command Center</h1>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full px-2 py-0.5 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[12px] text-[#5a6278]">
              {clients.length} clients · {activeClients.length} active · Veronica monitoring 24/7 · GHL + Meta connected
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-0 flex-shrink-0 divide-x divide-[#1c2438]">
            {[
              { label: "Active Clients", value: String(activeClients.length), color: "#18b8f0" },
              { label: "Leads (MTD)", value: String(totalLeads), color: "#22c55e" },
              { label: "Pending Approvals", value: String(approvals.length), color: "#f07820" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center px-5 py-1">
                <span className="text-[17px] font-bold" style={{ color: s.color }}>{s.value}</span>
                <span className="text-[10px] text-[#5a6278] font-medium mt-0.5 whitespace-nowrap">{s.label}</span>
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
        <div className="lg:col-span-2 bg-[#0c0f15] border border-[#1c2438] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2438]">
            <div className="flex items-center gap-2">
              <Megaphone size={14} className="text-[#18b8f0]" />
              <span className="text-[13px] font-semibold text-[#eef1f8]">Active Campaigns</span>
            </div>
            <Link href="/campaigns" className="flex items-center gap-1 text-[11px] text-[#5a6278] hover:text-[#18b8f0] transition-colors">
              View all <ChevronRight size={11} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#1c2438]">
                  {["Client", "Campaign", "Spend", "Leads", "CPL", "Booked"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-[9px] font-bold text-[#3d4460] uppercase tracking-widest ${h === "Client" || h === "Campaign" ? "text-left" : "text-right"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeCampaignRows.map((c, i) => (
                  <tr key={c.id} className={`border-b border-[#1c2438]/60 hover:bg-[#131720]/60 transition-colors ${i === activeCampaignRows.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-[#eef1f8]">{c.clientName}</div>
                      <div className="text-[10px] text-[#5a6278]">{c.market}</div>
                    </td>
                    <td className="px-4 py-3.5 text-[#5a6278]">{c.name}</td>
                    <td className="px-4 py-3.5 text-right text-[#eef1f8]">{c.spend}</td>
                    <td className="px-4 py-3.5 text-right text-[#18b8f0] font-semibold">{c.leads}</td>
                    <td className="px-4 py-3.5 text-right text-[#eef1f8]">{c.cpl}</td>
                    <td className="px-4 py-3.5 text-right text-[#22c55e] font-semibold">{c.booked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* AI Agent feed */}
          <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1c2438]">
              <div className="flex items-center gap-2">
                <Activity size={13} className="text-[#18b8f0]" />
                <span className="text-[13px] font-semibold text-[#eef1f8]">Veronica Activity</span>
              </div>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse"></span>
                Live
              </span>
            </div>
            <div className="p-3 space-y-2">
              {agentLog.map((entry, i) => (
                <div key={i} className="flex gap-2.5 p-2.5 rounded-lg bg-[#131720] border border-[#1c2438]/60">
                  <div className="mt-0.5 flex-shrink-0">
                    {entry.type === "success" && <Zap size={11} className="text-[#22c55e]" />}
                    {entry.type === "warning" && <AlertCircle size={11} className="text-[#f59e0b]" />}
                    {entry.type === "blue" && <Bot size={11} className="text-[#18b8f0]" />}
                    {entry.type === "orange" && <AlertCircle size={11} className="text-[#f07820]" />}
                    {entry.type === "neutral" && <AlertCircle size={11} className="text-[#5a6278]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#eef1f8] leading-snug">{entry.action}</p>
                    <p className="text-[10px] text-[#5a6278] mt-0.5">{entry.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 pb-3">
              <Link href="/ai-agent" className="block w-full text-center text-[11px] font-semibold text-[#18b8f0] bg-[#18b8f0]/8 hover:bg-[#18b8f0]/12 border border-[#18b8f0]/18 rounded-lg py-2 transition-colors">
                Open Veronica
              </Link>
            </div>
          </div>

          {/* Pending approvals */}
          <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1c2438]">
              <div className="flex items-center gap-2">
                <CheckSquare size={13} className="text-[#f07820]" />
                <span className="text-[13px] font-semibold text-[#eef1f8]">Pending Approvals</span>
              </div>
              <span className="text-[9px] font-bold text-[#f07820] bg-[#f07820]/10 border border-[#f07820]/20 rounded-full px-2 py-0.5">
                {approvals.length} pending
              </span>
            </div>
            <div className="p-3 space-y-2">
              {pendingApprovals.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-[#131720] border border-[#1c2438]/60">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#eef1f8] truncate">{a.clientName}</div>
                    <div className="text-[10px] text-[#5a6278] mt-0.5 leading-snug truncate">{a.item}</div>
                  </div>
                  <Link href="/approvals" className="flex-shrink-0 px-2 py-1 text-[10px] font-semibold text-[#f07820] bg-[#f07820]/10 border border-[#f07820]/20 rounded-md hover:bg-[#f07820]/18 transition-colors whitespace-nowrap">
                    Review
                  </Link>
                </div>
              ))}
            </div>
            <div className="px-3 pb-3">
              <Link href="/approvals" className="block w-full text-center text-[11px] font-semibold text-[#5a6278] hover:text-[#eef1f8] transition-colors py-1">
                View all approvals →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
