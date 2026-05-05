import { Plus, Filter, Search, MoreHorizontal, Play, Pause } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { clients, clientStatusVariant, campaignStatusVariant, type CampaignStatus } from "@/lib/data";

// Flatten all campaigns across all clients
const allCampaigns = clients.flatMap((client) =>
  client.campaigns.map((c) => ({
    ...c,
    clientName: client.name,
    clientStatus: client.status,
    market: client.market,
  }))
);

function getCpba(spend: string, booked: number): string {
  if (booked === 0) return "—";
  const s = parseInt(spend.replace(/\D/g, ""));
  if (!s) return "—";
  return `$${Math.round(s / booked).toLocaleString()}`;
}

function getNextAction(status: CampaignStatus, leads: number, booked: number, spend: string): {
  label: string;
  color: string;
  bg: string;
} {
  if (status === "draft") return { label: "Launch Pending", color: "#f07820", bg: "#f07820" };
  if (status === "paused") return { label: "Review", color: "#f59e0b", bg: "#f59e0b" };
  const spendNum = parseInt(spend.replace(/\D/g, ""));
  const cpl = leads > 0 ? spendNum / leads : 0;
  const bookRate = leads > 0 ? booked / leads : 0;
  if (cpl > 130) return { label: "Optimize CPL", color: "#ef4444", bg: "#ef4444" };
  if (bookRate < 0.2 && leads >= 5) return { label: "Improve Booking Rate", color: "#f59e0b", bg: "#f59e0b" };
  if (bookRate >= 0.3 && leads >= 10) return { label: "Scale Budget", color: "#22c55e", bg: "#22c55e" };
  return { label: "Monitor", color: "#5a6278", bg: "#5a6278" };
}

export default function CampaignsPage() {
  const activeCount = allCampaigns.filter((c) => c.status === "active").length;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Campaigns"
        description={`${allCampaigns.length} campaigns · ${activeCount} active`}
        action={
          <button className="flex items-center gap-2 px-4 py-2 vc-orange-gradient text-white text-[13px] font-semibold rounded-lg transition-opacity hover:opacity-90">
            <Plus size={14} />
            New Campaign
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6278]" />
          <input
            type="text"
            placeholder="Search campaigns..."
            className="w-full pl-8 pr-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#eef1f8] placeholder-[#5a6278] focus:outline-none focus:border-[#18b8f0]/40 transition-colors"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#5a6278] hover:text-[#eef1f8] hover:border-[#263050] transition-colors">
          <Filter size={13} />
          Filter by Client
        </button>
        {["All", "Active", "Paused", "Draft"].map((f) => (
          <button
            key={f}
            className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              f === "All"
                ? "bg-[#131720] border border-[#263050] text-[#eef1f8]"
                : "text-[#5a6278] hover:text-[#eef1f8]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#1c2438]">
              {["Client", "Campaign", "Market", "Status", "Spend", "Leads", "CPL", "Booked", "CPBA", "Next Action", ""].map(
                (h, i) => (
                  <th
                    key={`${h}-${i}`}
                    className={`px-4 py-3.5 text-[9px] font-bold text-[#3d4460] uppercase tracking-widest ${
                      h === "Client" || h === "Campaign" || h === "Market" || h === "Next Action"
                        ? "text-left"
                        : h === ""
                        ? ""
                        : "text-right"
                    }`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {allCampaigns.map((c, i) => {
              const cpba = getCpba(c.spend, c.booked);
              const nextAction = getNextAction(c.status, c.leads, c.booked, c.spend);
              return (
                <tr
                  key={c.id}
                  className={`border-b border-[#1c2438]/60 hover:bg-[#131720]/60 transition-colors group ${
                    i === allCampaigns.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-[#eef1f8]">{c.clientName}</div>
                    <Badge label={c.clientStatus} variant={clientStatusVariant[c.clientStatus]} />
                  </td>
                  <td className="px-4 py-3.5 text-[#5a6278]">{c.name}</td>
                  <td className="px-4 py-3.5 text-[#5a6278]">{c.market}</td>
                  <td className="px-4 py-3.5">
                    <Badge label={c.status} variant={campaignStatusVariant[c.status]} />
                  </td>
                  <td className="px-4 py-3.5 text-right text-[#eef1f8]">{c.spend !== "$0" ? c.spend : "—"}</td>
                  <td className="px-4 py-3.5 text-right text-[#18b8f0] font-semibold">
                    {c.leads > 0 ? c.leads : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[#eef1f8]">{c.cpl}</td>
                  <td className="px-4 py-3.5 text-right text-[#22c55e] font-semibold">
                    {c.booked > 0 ? c.booked : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[#a78bfa] font-semibold">{cpba}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                      style={{
                        color: nextAction.color,
                        backgroundColor: `${nextAction.bg}12`,
                        border: `1px solid ${nextAction.bg}28`,
                      }}
                    >
                      {nextAction.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {c.status === "active" ? (
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#131720] border border-[#1c2438] text-[#f59e0b] hover:border-[#f59e0b]/40 transition-colors">
                          <Pause size={11} />
                        </button>
                      ) : (
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#131720] border border-[#1c2438] text-[#22c55e] hover:border-[#22c55e]/40 transition-colors">
                          <Play size={11} />
                        </button>
                      )}
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#131720] border border-[#1c2438] text-[#5a6278] hover:text-[#eef1f8] transition-colors">
                        <MoreHorizontal size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
