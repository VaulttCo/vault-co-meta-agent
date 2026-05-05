import { TrendingUp, TrendingDown, Calendar, Download, Users, CalendarCheck, DollarSign, Activity } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";

const stats = [
  { label: "Total Leads (MTD)", value: "312", change: "+24.1%", changeType: "up" as const, icon: Users, iconColor: "#18b8f0" },
  { label: "Booked Appointments", value: "84", change: "+11.8%", changeType: "up" as const, icon: CalendarCheck, iconColor: "#22c55e" },
  { label: "Avg. Cost Per Lead", value: "$58.78", change: "-12.4%", changeType: "up" as const, icon: TrendingDown, iconColor: "#f07820" },
  { label: "Total Ad Spend", value: "$18,340", change: "+9.2%", changeType: "up" as const, icon: DollarSign, iconColor: "#a78bfa" },
];

const clientBreakdown = [
  { client: "Acorns Roofing", leads: 94, booked: 29, cpl: "$41.60", cpba: "$134.83", showRate: "82%", spend: "$3,910", barWidth: "94%" },
  { client: "JJ Roofing Group", leads: 88, booked: 24, cpl: "$54.77", cpba: "$201.00", showRate: "72%", spend: "$4,820", barWidth: "88%" },
  { client: "Kaczmar Builders", leads: 69, booked: 13, cpl: "$63.91", cpba: "$339.00", showRate: "58%", spend: "$4,410", barWidth: "69%" },
  { client: "Open Forge Construction", leads: 61, booked: 18, cpl: "$85.25", cpba: "$289.00", showRate: "68%", spend: "$5,200", barWidth: "61%" },
];

const topCampaigns = [
  { client: "Acorns Roofing", name: "Roof Inspection — Free Offer", metric: "CPL", value: "$41.38", delta: "-18.2%", up: true },
  { client: "JJ Roofing Group", name: "Storm Damage Inspection", metric: "Booked", value: "14", delta: "+7", up: true },
  { client: "Open Forge Construction", name: "Remodeling Consultation", metric: "Show Rate", value: "72%", delta: "+8%", up: true },
  { client: "Acorns Roofing", name: "Storm Damage Creative v3", metric: "Leads", value: "36", delta: "+12", up: true },
];

export default function AnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Analytics"
        description="All clients — last 30 days"
        action={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#5a6278] hover:text-[#eef1f8] hover:border-[#263050] transition-colors">
              <Calendar size={13} />
              Last 30 days
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#5a6278] hover:text-[#eef1f8] hover:border-[#263050] transition-colors">
              <Download size={13} />
              Export
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Leads over time chart */}
      <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-[#18b8f0]" />
            <span className="text-[13px] font-semibold text-[#eef1f8]">Leads vs. Booked Appointments</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#5a6278]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#18b8f0]"></span>Leads</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#22c55e]"></span>Booked</span>
          </div>
        </div>
        <div className="h-44 flex items-end gap-1.5 pb-2">
          {[8, 11, 9, 14, 12, 15, 10, 13, 14, 16, 12, 14, 11, 15, 14, 17, 13, 15, 12, 18, 14, 16, 13, 17, 15, 19, 14, 17, 16, 20].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-sm bg-[#18b8f0]/25 border-t border-[#18b8f0]/50" style={{ height: `${h * 5}%` }} />
              <div className="w-full rounded-sm bg-[#22c55e]/30 border-t border-[#22c55e]/50" style={{ height: `${h * 1.8}%` }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-[#3d4460] mt-2">
          <span>Apr 3</span><span>Apr 10</span><span>Apr 17</span><span>Apr 24</span><span>May 3</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Client breakdown */}
        <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-[#eef1f8] mb-4">Client Performance Breakdown</h3>
          <div className="space-y-4">
            {clientBreakdown.map((c) => (
              <div key={c.client}>
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="text-[#eef1f8] font-medium">{c.client}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#5a6278]">{c.leads} leads</span>
                    <span className="text-[#22c55e] font-semibold">{c.booked} booked</span>
                    <span className="text-[#f07820] font-semibold">{c.cpl} CPL</span>
                  </div>
                </div>
                <div className="h-1.5 bg-[#1c2438] rounded-full overflow-hidden">
                  <div className="h-full rounded-full vc-blue-gradient" style={{ width: c.barWidth }} />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#3d4460] mt-1">
                  <span>Show rate: {c.showRate}</span>
                  <span>CPBA: {c.cpba}</span>
                  <span>Spend: {c.spend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top campaigns */}
        <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-[#eef1f8] mb-4">Top Performing Campaigns</h3>
          <div className="space-y-2.5">
            {topCampaigns.map((p) => (
              <div key={p.name} className="flex items-center justify-between p-3 bg-[#131720] border border-[#1c2438]/60 rounded-lg">
                <div>
                  <div className="text-[11px] text-[#5a6278] mb-0.5">{p.client}</div>
                  <div className="text-[12px] text-[#eef1f8] font-medium">{p.name}</div>
                  <div className="text-[10px] text-[#3d4460] mt-0.5">{p.metric}</div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold text-[#eef1f8]">{p.value}</div>
                  <div className={`text-[10px] font-medium flex items-center gap-0.5 justify-end ${p.up ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                    {p.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                    {p.delta}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
