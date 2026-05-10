import { Users, WifiOff, ArrowRight, Settings } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AudiencesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Audiences"
        description="Meta Ads audience sync"
      />

      {/* Not connected state */}
      <div
        className="rounded-xl border p-10 flex flex-col items-center text-center gap-5"
        style={{
          backgroundColor: "#0D1520",
          borderColor: "rgba(0, 129, 242, 0.15)",
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: "rgba(61, 79, 110, 0.15)",
            border: "1px solid rgba(61, 79, 110, 0.30)",
          }}
        >
          <WifiOff size={22} style={{ color: "#3d4f6e" }} />
        </div>

        <div>
          <p className="text-[15px] font-semibold" style={{ color: "#f8f8f7" }}>
            No audiences synced
          </p>
          <p className="text-[13px] mt-1.5 max-w-sm mx-auto leading-relaxed" style={{ color: "#6b7a99" }}>
            Connect Meta Ads to sync custom audiences, lookalikes, and saved audiences across all clients.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
            style={{
              backgroundColor: "rgba(61, 79, 110, 0.12)",
              border: "1px solid rgba(61, 79, 110, 0.22)",
              color: "#6b7a99",
            }}
          >
            <Users size={10} />
            Custom Audiences — not synced
          </span>
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
            style={{
              backgroundColor: "rgba(61, 79, 110, 0.12)",
              border: "1px solid rgba(61, 79, 110, 0.22)",
              color: "#6b7a99",
            }}
          >
            <Users size={10} />
            Lookalike Audiences — not synced
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors"
            style={{
              backgroundColor: "rgba(0, 129, 242, 0.10)",
              border: "1px solid rgba(0, 129, 242, 0.25)",
              color: "#0081f2",
            }}
          >
            <Settings size={12} />
            Go to Settings
            <ArrowRight size={11} />
          </Link>
          <Link
            href="/clients"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors"
            style={{
              backgroundColor: "rgba(61, 79, 110, 0.10)",
              border: "1px solid rgba(61, 79, 110, 0.20)",
              color: "#6b7a99",
            }}
          >
            Open Client Integrations
            <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      {/* What will appear once connected */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "#0D1520",
          border: "1px solid rgba(0, 129, 242, 0.10)",
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#3d4f6e" }}>
          What syncs once connected
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Custom Audiences", detail: "Website visitors, video engagers, lead list uploads" },
            { label: "Lookalike Audiences", detail: "1–10% lookalikes built from converter lists" },
            { label: "Saved Audiences", detail: "Interest and demographic targeting sets" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg p-3"
              style={{
                backgroundColor: "rgba(0, 129, 242, 0.04)",
                border: "1px solid rgba(0, 129, 242, 0.08)",
              }}
            >
              <p className="text-[12px] font-semibold mb-0.5" style={{ color: "#6b7a99" }}>{item.label}</p>
              <p className="text-[11px] leading-snug" style={{ color: "#3d4f6e" }}>{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
