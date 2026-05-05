"use client";
import { WifiOff, BarChart2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Analytics"
        description="Performance analytics across all clients"
      />

      {/* Meta not connected notice */}
      <div
        className="rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4"
        style={{
          backgroundColor: "#0D1520",
          border: "1px solid rgba(61, 79, 110, 0.35)",
          minHeight: "320px",
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(61, 79, 110, 0.15)", border: "1px solid rgba(61, 79, 110, 0.25)" }}
        >
          <WifiOff size={22} style={{ color: "#3d4f6e" }} />
        </div>
        <div>
          <p className="text-[15px] font-semibold" style={{ color: "#6b7a99" }}>Meta Ads not connected</p>
          <p className="text-[12px] mt-2 max-w-sm leading-relaxed" style={{ color: "#3d4f6e" }}>
            Performance analytics will appear once Meta read-only reporting is connected.
            Metrics such as spend, leads, CPL, and booking rates will populate automatically
            once the Meta Marketing API integration is enabled.
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium"
          style={{
            backgroundColor: "rgba(61, 79, 110, 0.10)",
            border: "1px solid rgba(61, 79, 110, 0.20)",
            color: "#3d4f6e",
          }}
        >
          <BarChart2 size={12} />
          Connect Meta Ads in Settings → Integrations
        </div>
      </div>

      {/* GHL not connected notice */}
      <div
        className="rounded-xl p-6 flex items-start gap-4"
        style={{
          backgroundColor: "#0D1520",
          border: "1px solid rgba(61, 79, 110, 0.35)",
        }}
      >
        <WifiOff size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#3d4f6e" }} />
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "#6b7a99" }}>GoHighLevel not connected</p>
          <p className="text-[11px] mt-1 leading-snug" style={{ color: "#3d4f6e" }}>
            Appointment and pipeline data will appear once GHL sync is connected.
            Booking rates, show rates, and pipeline revenue will be available after GHL integration is enabled.
          </p>
        </div>
      </div>
    </div>
  );
}
