// Victoria AI Sales Coach — Coming Soon
// Static page only. No AI calls, no API calls, no external requests.

import {
  Mic2,
  PhoneCall,
  MessageSquare,
  BarChart2,
  Repeat2,
  BookOpen,
  Star,
  Lock,
} from "lucide-react";

const plannedFeatures = [
  {
    icon: PhoneCall,
    label: "Live Sales Call Coaching",
    desc: "Real-time guidance during client sales calls — questions, pacing, and closing cues surfaced as you go.",
    color: "#a78bfa",
  },
  {
    icon: MessageSquare,
    label: "Objection Handling",
    desc: "Structured frameworks for price, timing, and competitor objections tailored to home-service clients.",
    color: "#0081f2",
  },
  {
    icon: BookOpen,
    label: "Question Prompts",
    desc: "Pre-built discovery question flows that surface buying intent, job urgency, and decision-making authority.",
    color: "#22c55e",
  },
  {
    icon: BarChart2,
    label: "Call Scoring",
    desc: "AI review of recorded calls with scores for rapport, discovery, presentation, and close effectiveness.",
    color: "#ff8400",
  },
  {
    icon: Repeat2,
    label: "Follow-Up Recommendations",
    desc: "Structured follow-up sequence recommendations based on call outcome, objection type, and lead temperature.",
    color: "#f59e0b",
  },
  {
    icon: Star,
    label: "Vault Co Sales Frameworks",
    desc: "Proprietary Vault Co frameworks for roofing and home-service sales embedded into every coaching session.",
    color: "#c9a84c",
  },
];

export default function VictoriaComingSoonPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--t-surface)",
          border: "1px solid var(--t-border)",
          boxShadow: "var(--t-card-shadow)",
        }}
      >
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(167,139,250,0.07)" }} />
        <div className="absolute -top-10 right-0 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(255,132,0,0.05)" }} />
        <div className="relative px-8 py-10 flex flex-col items-center text-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)" }}
          >
            <Mic2 size={28} style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2.5 mb-2">
              <h1
                className="text-[28px] font-bold tracking-wide"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
              >
                Victoria AI Sales Coach
              </h1>
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
                style={{ color: "rgba(107,122,153,0.85)", backgroundColor: "rgba(61,79,110,0.12)", border: "1px solid rgba(61,79,110,0.22)" }}
              >
                Coming Soon
              </span>
            </div>
            <p className="text-[14px] max-w-xl mx-auto leading-relaxed" style={{ color: "var(--t-muted)" }}>
              AI-powered sales coaching for Vault Co and client teams. Victoria will guide call questions, handle objections, score calls, and recommend follow-up — all inside the Command Hub.
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-semibold"
            style={{ backgroundColor: "rgba(61,79,110,0.10)", border: "1px solid rgba(61,79,110,0.18)", color: "rgba(107,122,153,0.7)" }}
          >
            <Lock size={11} />
            No AI calls active — planned feature only
          </div>
        </div>
      </div>

      {/* Planned features */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
      >
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
          <span
            className="text-[14px] font-bold tracking-wide"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
          >
            Planned Features
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0" style={{ borderColor: "var(--t-border-nav)" }}>
          {plannedFeatures.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.label}
                className={`px-6 py-5 flex gap-4 ${i % 2 === 0 && i < plannedFeatures.length - 1 ? "sm:border-r" : ""}`}
                style={{ borderColor: "var(--t-border-nav)" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${feature.color}14`, border: `1px solid ${feature.color}28` }}
                >
                  <Icon size={14} style={{ color: feature.color }} />
                </div>
                <div>
                  <div className="text-[12px] font-semibold mb-0.5" style={{ color: "var(--t-text)" }}>{feature.label}</div>
                  <p className="text-[11px] leading-snug" style={{ color: "var(--t-dim)" }}>{feature.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status note */}
      <div
        className="flex items-start gap-3 px-5 py-4 rounded-xl"
        style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
      >
        <Lock size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--t-dim)" }} />
        <p className="text-[11px] leading-snug" style={{ color: "var(--t-dim)" }}>
          Victoria is in the planning phase. No sales coaching logic, AI calls, or external connections are active. This page will be updated when development begins.
        </p>
      </div>

    </div>
  );
}
