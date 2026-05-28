"use client";

/** Isolated sandbox preview — not imported by any production page */

import { ClientIntelligenceMetricCard } from "@/components/ui/ClientIntelligenceMetricCard";

export default function ClientIntelligenceMetricCardPreview() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--t-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: 16,
      }}
    >
      <p className="vc-label mb-2">sandbox — client intelligence metric card</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 16,
          width: "100%",
          maxWidth: 780,
        }}
      >
        <ClientIntelligenceMetricCard
          clientName="Sullivan Roofing"
          vertical="roofing"
          phase="Phase 2"
          tier="elite"
          intelligenceScore={92}
          metrics={[
            { label: "ROAS",    value: "7.55×",  change: "+14.2%", changeType: "up"   },
            { label: "Spend",   value: "$24.8k",  change: "+8.3%",  changeType: "up"   },
            { label: "Revenue", value: "$187k",   change: "+28.1%", changeType: "up"   },
            { label: "CPL",     value: "$34.20",  change: "-11.0%", changeType: "down" },
          ]}
          status="live"
          lastUpdated="2h ago"
        />

        <ClientIntelligenceMetricCard
          clientName="Horizon HVAC"
          vertical="hvac"
          phase="Phase 1"
          tier="growth"
          intelligenceScore={67}
          metrics={[
            { label: "ROAS",    value: "4.20×",  change: "+5.1%",  changeType: "up"   },
            { label: "Spend",   value: "$9.4k",   change: "-2.1%",  changeType: "down" },
            { label: "Revenue", value: "$39.5k",  change: "+3.8%",  changeType: "up"   },
            { label: "CPL",     value: "$51.80",  change: "+4.0%",  changeType: "down" },
          ]}
          status="review"
          lastUpdated="6h ago"
        />
      </div>
    </div>
  );
}
