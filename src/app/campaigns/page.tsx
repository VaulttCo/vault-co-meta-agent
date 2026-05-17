"use client";
import { useState, useEffect } from "react";
import { Plus, Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { clientStatusVariant, campaignStatusVariant, type CampaignStatus } from "@/lib/data";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";

interface CampaignRow {
  id: string; name: string; type: string; status: CampaignStatus;
  budget: string; spend: string; leads: number; cpl: string; booked: number;
  clientName: string; clientStatus: string; market: string;
}

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
  if (status === "draft") return { label: "Launch Pending", color: "#ff8400", bg: "#ff8400" };
  if (status === "paused") return { label: "Review", color: "#f59e0b", bg: "#f59e0b" };
  const spendNum = parseInt(spend.replace(/\D/g, ""));
  const cpl = leads > 0 ? spendNum / leads : 0;
  const bookRate = leads > 0 ? booked / leads : 0;
  if (cpl > 130) return { label: "Optimize CPL", color: "#ef4444", bg: "#ef4444" };
  if (bookRate < 0.2 && leads >= 5) return { label: "Improve Booking Rate", color: "#f59e0b", bg: "#f59e0b" };
  if (bookRate >= 0.3 && leads >= 10) return { label: "Scale Budget", color: "#22c55e", bg: "#22c55e" };
  return { label: "Monitor", color: "#6b7a99", bg: "#6b7a99" };
}

export default function CampaignsPage() {
  const [allCampaigns, setAllCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const clients = await getDataProvider().getClients();
        const rows: CampaignRow[] = clients.flatMap((client) =>
          (client.campaigns ?? []).map((c) => ({
            ...c,
            clientName: client.name,
            clientStatus: client.status,
            market: client.market,
          }))
        );
        if (!cancelled) setAllCampaigns(rows);
      } catch {
        // fall through to empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeCount = allCampaigns.filter((c) => c.status === "active").length;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Campaigns"
        description={loading ? "Loading…" : `${allCampaigns.length} campaigns · ${activeCount} active`}
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
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7a99]" />
          <input
            type="text"
            placeholder="Search campaigns..."
            className="w-full pl-8 pr-3 py-2 rounded-lg text-[13px] focus:outline-none transition-colors"
          style={{ backgroundColor: "var(--t-input-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-colors" style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
          <Filter size={13} />
          Filter by Client
        </button>
        {["All", "Active", "Paused", "Draft"].map((f) => (
          <button
            key={f}
            className="px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={
              f === "All"
                ? { backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }
                : { color: "var(--t-muted)", backgroundColor: "transparent", border: "1px solid transparent" }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}>
        {loading && (
          <div className="px-5 py-12 text-center text-[12px]" style={{ color: "var(--t-dim)" }}>Loading campaigns…</div>
        )}
        {!loading && allCampaigns.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="text-[13px] font-medium" style={{ color: "var(--t-muted)" }}>No campaigns yet</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--t-dim)" }}>Campaign data is pulled from client records in Supabase.</p>
          </div>
        )}
        {!loading && allCampaigns.length > 0 && <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--t-border-subtle)" }}>
              {["Client", "Campaign", "Market", "Status", "Spend", "Leads", "CPL", "Booked", "CPBA", "Next Action", ""].map(
                (h, i) => (
                  <th
                    key={`${h}-${i}`}
                    className={`px-4 py-3.5 text-[9px] font-bold uppercase tracking-widest ${
                      h === "Client" || h === "Campaign" || h === "Market" || h === "Next Action"
                        ? "text-left"
                        : h === ""
                        ? ""
                        : "text-right"
                    }`}
                    style={{ color: "var(--t-dim)" }}
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
                  className={`border-b transition-colors group ${
                    i === allCampaigns.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <div className="font-semibold" style={{ color: "var(--t-text)" }}>{c.clientName}</div>
                    <Badge label={c.clientStatus} variant={clientStatusVariant[c.clientStatus as keyof typeof clientStatusVariant] ?? "neutral"} />
                  </td>
                  <td className="px-4 py-3.5" style={{ color: "var(--t-muted)" }}>{c.name}</td>
                  <td className="px-4 py-3.5" style={{ color: "var(--t-muted)" }}>{c.market}</td>
                  <td className="px-4 py-3.5">
                    <Badge label={c.status} variant={campaignStatusVariant[c.status]} />
                  </td>
                  <td className="px-4 py-3.5 text-right" style={{ color: "var(--t-text)" }}>{c.spend !== "$0" ? c.spend : "—"}</td>
                  <td className="px-4 py-3.5 text-right font-semibold" style={{ color: "#0081f2" }}>
                    {c.leads > 0 ? c.leads : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right" style={{ color: "var(--t-text)" }}>{c.cpl}</td>
                  <td className="px-4 py-3.5 text-right font-semibold" style={{ color: "#22c55e" }}>
                    {c.booked > 0 ? c.booked : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold" style={{ color: "#a78bfa" }}>{cpba}</td>
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
                    <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <span
                        className="text-[10px] px-2 py-1 rounded-md whitespace-nowrap"
                        style={{
                          color: "#3d4f6e",
                          backgroundColor: "rgba(61, 79, 110, 0.10)",
                          border: "1px solid rgba(61, 79, 110, 0.18)",
                        }}
                        title="Campaign status is managed in Meta Ads Manager"
                      >
                        Managed in Meta
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>}
      </div>
    </div>
  );
}
