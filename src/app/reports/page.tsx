import { FileText, Download, Calendar, TrendingUp, Users, CalendarCheck, DollarSign, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { clients } from "@/lib/data";

// Only clients with stats (active) get reports
const reportRows = clients.map((c) => ({
  client: c.name,
  period: "May 2026 — Week 1",
  status: c.status === "active" ? "ready" : c.status === "setup" ? "pending" : "pending",
  leads: c.stats.leads,
  booked: c.stats.booked,
  cpl: c.stats.cpl,
  spend: c.stats.spend,
  note: c.status !== "active" ? c.status : null,
}));

type ReportStatus = "ready" | "pending";

const reportStatusVariant: Record<ReportStatus, "success" | "neutral"> = {
  ready: "success",
  pending: "neutral",
};

// Totals from active clients
const activeClients = clients.filter((c) => c.status === "active");
const totalLeads = activeClients.reduce((sum, c) => sum + c.stats.leads, 0);
const totalBooked = activeClients.reduce((sum, c) => sum + c.stats.booked, 0);
const totalSpend = activeClients.reduce((sum, c) => sum + parseInt(c.stats.spend.replace(/\D/g, "")), 0);
const avgCpl = totalLeads > 0 ? `$${(totalSpend / totalLeads).toFixed(2)}` : "—";

export default function ReportsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Reports"
        description="Client performance reports — prepared by Veronica weekly"
        action={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#5a6278] hover:text-[#eef1f8] hover:border-[#263050] transition-colors">
              <Calendar size={13} />
              May 2026
            </button>
            <button className="flex items-center gap-2 px-4 py-2 vc-orange-gradient text-white text-[13px] font-semibold rounded-lg transition-opacity hover:opacity-90">
              <FileText size={13} />
              Generate All
            </button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Leads (Active Clients)", value: String(totalLeads), icon: Users, color: "#18b8f0" },
          { label: "Total Booked (MTD)", value: String(totalBooked), icon: CalendarCheck, color: "#22c55e" },
          { label: "Avg. CPL (All Active)", value: avgCpl, icon: TrendingUp, color: "#f07820" },
          { label: "Total Spend (MTD)", value: `$${totalSpend.toLocaleString()}`, icon: DollarSign, color: "#a78bfa" },
        ].map((s) => (
          <div key={s.label} className="bg-[#0c0f15] border border-[#1c2438] rounded-xl p-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: `${s.color}15`, border: `1px solid ${s.color}28` }}
            >
              <s.icon size={14} style={{ color: s.color }} />
            </div>
            <div className="text-[18px] font-bold text-[#eef1f8] tracking-tight">{s.value}</div>
            <div className="text-[11px] text-[#5a6278] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Reports table */}
      <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#1c2438]">
              {["Client", "Report Period", "Status", "Leads", "Booked", "CPL", "Spend", ""].map(
                (h, i) => (
                  <th
                    key={`${h}-${i}`}
                    className={`px-4 py-3.5 text-[9px] font-bold text-[#3d4460] uppercase tracking-widest ${
                      h === "Client" || h === "Report Period" ? "text-left" : h === "" ? "" : "text-right"
                    }`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {reportRows.map((r, i) => (
              <tr
                key={r.client}
                className={`border-b border-[#1c2438]/60 hover:bg-[#131720]/60 transition-colors group ${
                  i === reportRows.length - 1 ? "border-b-0" : ""
                }`}
              >
                <td className="px-4 py-3.5">
                  <div className="font-semibold text-[#eef1f8]">{r.client}</div>
                  {r.note && (
                    <div className="text-[10px] text-[#5a6278] mt-0.5 capitalize">{r.note} — no data yet</div>
                  )}
                </td>
                <td className="px-4 py-3.5 text-[#5a6278]">{r.period}</td>
                <td className="px-4 py-3.5">
                  <Badge
                    label={r.status === "ready" ? "Ready" : "No data"}
                    variant={reportStatusVariant[r.status as ReportStatus]}
                  />
                  {r.status === "ready" && (
                    <div className="flex items-center gap-1 mt-1">
                      <Sparkles size={9} className="text-[#c9a84c]" />
                      <span className="text-[10px] text-[#5a6278]">Prepared by Veronica</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right">
                  {r.leads > 0 ? (
                    <span className="text-[#18b8f0] font-semibold">{r.leads}</span>
                  ) : (
                    <span className="text-[#3d4460]">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right">
                  {r.booked > 0 ? (
                    <span className="text-[#22c55e] font-semibold">{r.booked}</span>
                  ) : (
                    <span className="text-[#3d4460]">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right text-[#eef1f8]">{r.cpl}</td>
                <td className="px-4 py-3.5 text-right text-[#eef1f8]">{r.spend !== "$0" ? r.spend : "—"}</td>
                <td className="px-4 py-3.5">
                  {r.status === "ready" && (
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#18b8f0] bg-[#18b8f0]/10 border border-[#18b8f0]/20 rounded-md hover:bg-[#18b8f0]/18 transition-colors">
                        View
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#131720] border border-[#1c2438] text-[#5a6278] hover:text-[#eef1f8] transition-colors">
                        <Download size={12} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
