import { Users, Plus, Search, Target, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

const audiences = [
  { name: "Website Visitors — 30d", type: "Custom", size: "48,200", status: "ready" as const, campaigns: 3, overlap: "12%" },
  { name: "Add to Cart — 14d", type: "Custom", size: "12,800", status: "ready" as const, campaigns: 2, overlap: "8%" },
  { name: "Purchasers — 180d", type: "Custom", size: "31,400", status: "ready" as const, campaigns: 4, overlap: "15%" },
  { name: "Lookalike — Purchasers 1%", type: "Lookalike", size: "~2.1M", status: "ready" as const, campaigns: 1, overlap: "3%" },
  { name: "Lookalike — High LTV 2%", type: "Lookalike", size: "~4.2M", status: "ready" as const, campaigns: 1, overlap: "6%" },
  { name: "Interest — Home Decor", type: "Saved", size: "~8.4M", status: "ready" as const, campaigns: 2, overlap: "22%" },
  { name: "Engaged Video — 75%", type: "Custom", size: "9,100", status: "populating" as const, campaigns: 0, overlap: "—" },
];

const typeMap: Record<string, "orange" | "neutral" | "success"> = {
  Custom: "orange",
  Lookalike: "success",
  Saved: "neutral",
};

const statusMap = { ready: "success" as const, populating: "warning" as const, error: "danger" as const };

export default function AudiencesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Audiences"
        description="7 audiences · 6 ready"
        action={
          <button className="flex items-center gap-2 px-4 py-2 vc-orange-gradient text-white text-sm font-semibold rounded-lg transition-opacity hover:opacity-90">
            <Plus size={14} />
            Create Audience
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Custom Audiences", count: "4", icon: Target, color: "#ff8400" },
          { label: "Lookalike Audiences", count: "2", icon: Users, color: "#0081f2" },
          { label: "Saved Audiences", count: "1", icon: RefreshCw, color: "#22c55e" },
        ].map((item) => (
          <div key={item.label} className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-4 flex items-center gap-4 hover:border-[rgba(0, 129, 242, 0.25)] transition-colors">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}28` }}>
              <item.icon size={16} style={{ color: item.color }} />
            </div>
            <div>
              <div className="text-xl font-bold text-[#f8f8f7] tracking-tight">{item.count}</div>
              <div className="text-xs text-[#6b7a99]">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7a99]" />
        <input
          type="text"
          placeholder="Search audiences..."
          className="w-full pl-8 pr-3 py-2 bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-lg text-sm text-[#f8f8f7] placeholder-[#6b7a99] focus:outline-none focus:border-[#0081f2]/40 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(0, 129, 242, 0.15)]">
              {["Audience Name", "Type", "Est. Size", "Status", "Used In", "Overlap"].map((h) => (
                <th key={h} className={`px-5 py-3.5 text-[10px] font-semibold text-[#3d4f6e] uppercase tracking-widest ${h === "Audience Name" || h === "Type" ? "text-left" : "text-right"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {audiences.map((a, i) => (
              <tr key={a.name} className={`border-b border-[rgba(0, 129, 242, 0.15)]/60 hover:bg-[#0f1a28]/60 transition-colors ${i === audiences.length - 1 ? "border-b-0" : ""}`}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] flex items-center justify-center flex-shrink-0">
                      <Users size={12} className="text-[#6b7a99]" />
                    </div>
                    <span className="text-[#f8f8f7] font-medium">{a.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4"><Badge label={a.type} variant={typeMap[a.type]} /></td>
                <td className="px-5 py-4 text-right text-[#f8f8f7]">{a.size}</td>
                <td className="px-5 py-4 text-right"><Badge label={a.status} variant={statusMap[a.status]} /></td>
                <td className="px-5 py-4 text-right text-[#6b7a99]">{a.campaigns} campaign{a.campaigns !== 1 ? "s" : ""}</td>
                <td className="px-5 py-4 text-right text-[#6b7a99]">{a.overlap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
