"use client";
import { useState, useEffect } from "react";
import { WifiOff, BarChart2, RefreshCw, TrendingUp, Users, DollarSign, Target, Loader2, Calendar } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface MetaAggregate {
  connected: boolean;
  totalSpend: number;
  totalLeads: number;
  totalImpressions: number;
  totalClicks: number;
  avgCpl: number | null;
  clientsWithData: number;
  lastSyncedAt: string | null;
  campaigns: Array<{
    clientId: string;
    clientName: string;
    campaignName: string;
    spend: number;
    leads: number;
    impressions: number;
    clicks: number;
    cpl: number | null;
  }>;
}

interface GHLAggregate {
  connected: boolean;
  totalContacts: number;
  totalAppointments: number;
  totalBooked: number;
  totalPipelineValue: number;
  totalClosedRevenue: number;
  clientsWithData: number;
  lastSyncedAt: string | null;
}

export default function AnalyticsPage() {
  const [meta, setMeta] = useState<MetaAggregate | null>(null);
  const [ghl, setGHL] = useState<GHLAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const [metaRes, ghlRes] = await Promise.all([
        fetch("/api/analytics/meta-aggregate"),
        fetch("/api/analytics/ghl-aggregate"),
      ]);
      const metaData = metaRes.ok ? await metaRes.json() : null;
      const ghlData = ghlRes.ok ? await ghlRes.json() : null;
      setMeta(metaData);
      setGHL(ghlData);
    } catch {
      setMeta(null);
      setGHL(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const hasMetaData = meta?.connected && (meta.totalSpend > 0 || meta.totalLeads > 0);
  const hasGHLData = ghl?.connected && (ghl.totalContacts > 0 || ghl.totalAppointments > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Analytics"
          description="Performance analytics across all clients"
        />
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#0D1520] border border-[rgba(0,129,242,0.15)] text-[#6b7a99] hover:text-[#f8f8f7] transition-colors disabled:opacity-50"
        >
          {refreshing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-[#0081f2]" />
        </div>
      ) : (
        <>
          {/* Meta Ads Section */}
          <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(0,129,242,0.15)]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#1877f2]/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#1877f2]">M</span>
                </div>
                <span className="text-[13px] font-semibold text-[#f8f8f7]">Meta Ads Performance</span>
                {hasMetaData && meta?.lastSyncedAt && (
                  <span className="text-[10px] text-[#3d4f6e]">
                    · Last synced {new Date(meta.lastSyncedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              {hasMetaData ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-[#22c55e]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" /> Live Data
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-[#3d4f6e]">
                  <WifiOff size={10} /> Not Connected
                </span>
              )}
            </div>

            {hasMetaData ? (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: DollarSign, label: "Total Spend", value: "$" + meta!.totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), color: "#ff8400" },
                    { icon: Users, label: "Total Leads", value: meta!.totalLeads.toLocaleString(), color: "#0081f2" },
                    { icon: Target, label: "Avg CPL", value: meta!.avgCpl != null ? "$" + meta!.avgCpl.toFixed(2) : "—", color: "#22c55e" },
                    { icon: TrendingUp, label: "Impressions", value: meta!.totalImpressions.toLocaleString(), color: "#a78bfa" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-[#0f1a28] rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon size={11} style={{ color }} />
                        <span className="text-[10px] text-[#3d4f6e]">{label}</span>
                      </div>
                      <div className="text-[18px] font-bold" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
                {meta!.campaigns.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-[#3d4f6e] uppercase tracking-wider mb-2">Campaign Breakdown</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="border-b border-[rgba(0,129,242,0.15)]">
                            {["Client", "Campaign", "Spend", "Leads", "CPL", "Impressions"].map((h) => (
                              <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-[#3d4f6e] uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {meta!.campaigns.map((c, i) => (
                            <tr key={i} className="border-b border-[rgba(0,129,242,0.08)] hover:bg-[#0f1a28]/60 transition-colors">
                              <td className="px-3 py-2.5 text-[#6b7a99]">{c.clientName}</td>
                              <td className="px-3 py-2.5 text-[#f8f8f7]">{c.campaignName}</td>
                              <td className="px-3 py-2.5 text-[#ff8400] font-semibold">${c.spend.toFixed(2)}</td>
                              <td className="px-3 py-2.5 text-[#0081f2] font-semibold">{c.leads}</td>
                              <td className="px-3 py-2.5 text-[#22c55e]">{c.cpl != null ? "$" + c.cpl.toFixed(2) : "—"}</td>
                              <td className="px-3 py-2.5 text-[#6b7a99]">{c.impressions.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-[#3d4f6e]">
                  Data source: Meta Marketing API · {meta!.clientsWithData} client{meta!.clientsWithData !== 1 ? "s" : ""} with synced data · Read-only
                </p>
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[rgba(61,79,110,0.15)] border border-[rgba(61,79,110,0.25)]">
                  <WifiOff size={18} className="text-[#3d4f6e]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#6b7a99]">Meta Ads not connected</p>
                  <p className="text-[11px] mt-1 max-w-sm leading-relaxed text-[#3d4f6e]">
                    Performance analytics will appear once Meta read-only reporting is connected.
                    Go to a client profile → Integrations tab to connect Meta Ads.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[rgba(61,79,110,0.10)] border border-[rgba(61,79,110,0.20)] text-[#3d4f6e]">
                  <BarChart2 size={11} />
                  Add META_ACCESS_TOKEN to Vercel env vars to enable
                </div>
              </div>
            )}
          </div>

          {/* GoHighLevel Section */}
          <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(0,129,242,0.15)]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#22c55e]/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#22c55e]">G</span>
                </div>
                <span className="text-[13px] font-semibold text-[#f8f8f7]">GoHighLevel Pipeline</span>
                {hasGHLData && ghl?.lastSyncedAt && (
                  <span className="text-[10px] text-[#3d4f6e]">
                    · Last synced {new Date(ghl.lastSyncedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              {hasGHLData ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-[#22c55e]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" /> Live Data
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-[#3d4f6e]">
                  <WifiOff size={10} /> Not Connected
                </span>
              )}
            </div>

            {hasGHLData ? (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: Users, label: "Total Contacts", value: ghl!.totalContacts.toLocaleString(), color: "#0081f2" },
                    { icon: Calendar, label: "Appointments", value: ghl!.totalAppointments.toLocaleString(), color: "#a78bfa" },
                    { icon: Target, label: "Booked", value: ghl!.totalBooked.toLocaleString(), color: "#22c55e" },
                    { icon: DollarSign, label: "Pipeline Value", value: "$" + ghl!.totalPipelineValue.toLocaleString(), color: "#ff8400" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-[#0f1a28] rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon size={11} style={{ color }} />
                        <span className="text-[10px] text-[#3d4f6e]">{label}</span>
                      </div>
                      <div className="text-[18px] font-bold" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#3d4f6e]">
                  Data source: GoHighLevel API · {ghl!.clientsWithData} client{ghl!.clientsWithData !== 1 ? "s" : ""} with synced data · Read-only
                </p>
              </div>
            ) : (
              <div className="p-6 flex items-start gap-4">
                <WifiOff size={16} className="flex-shrink-0 mt-0.5 text-[#3d4f6e]" />
                <div>
                  <p className="text-[13px] font-semibold text-[#6b7a99]">GoHighLevel not connected</p>
                  <p className="text-[11px] mt-1 leading-snug text-[#3d4f6e]">
                    Appointment and pipeline data will appear once GHL sync is connected.
                    Go to a client profile → Integrations tab to connect GoHighLevel.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
