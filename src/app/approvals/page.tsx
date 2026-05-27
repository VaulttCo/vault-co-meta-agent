"use client";

import { useState, useEffect } from "react";
import {
  CheckSquare,
  X,
  Eye,
  Megaphone,
  DollarSign,
  FileText,
  ImageIcon,
  GitPullRequest,
  Settings,
  Bot,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MessageSquare,
  RadioTower,
  Film,
  AlertCircle,
  Archive,
  ChevronDown,
  ChevronUp,
  Layers,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Loader2,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { usePlans } from "@/components/PlanProvider";
import { useAuth } from "@/components/AuthProvider";
import {
  draftStatusLabel,
  draftStatusVariant,
  type DraftStatus,
  type CampaignDraft,
} from "@/lib/planStore";
import {
  approvalPriorityVariant,
  approvalPriorityLabel,
  type ApprovalIconType,
} from "@/lib/data";
import type { MetaPreviewPayload, SafetyCheckItem } from "@/lib/metaPreview";

// ── Meta Payload Preview Modal ────────────────────────────────

function safetyIcon(status: SafetyCheckItem["status"]) {
  if (status === "pass") return <CheckCircle size={11} className="text-[#22c55e] flex-shrink-0 mt-0.5" />;
  if (status === "fail") return <XCircle size={11} className="text-[#ef4444] flex-shrink-0 mt-0.5" />;
  if (status === "warn") return <AlertTriangle size={11} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />;
  return <HelpCircle size={11} className="flex-shrink-0 mt-0.5" style={{ color: "var(--t-dim)" }} />;
}

function safetyColor(status: SafetyCheckItem["status"]) {
  if (status === "pass") return "#22c55e";
  if (status === "fail") return "#ef4444";
  if (status === "warn") return "#f59e0b";
  return "var(--t-dim)";
}

function MetaPayloadPreviewModal({
  draftId,
  onClose,
}: {
  draftId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<MetaPreviewPayload | null>(null);
  const [activeTab, setActiveTab] = useState<"campaign" | "ads" | "lead_form" | "tracking" | "safety" | "push_readiness">("campaign");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/campaign-drafts/${draftId}/meta-preview`)
      .then((r) => r.ok ? r.json() : r.json().then((b) => Promise.reject(b.error ?? "Failed to load preview")))
      .then((body) => { setPayload(body.preview); setLoading(false); })
      .catch((e) => { setError(typeof e === "string" ? e : "Failed to load preview"); setLoading(false); });
  }, [draftId]);

  const tabs = [
    { id: "campaign" as const, label: "Campaign" },
    { id: "ads" as const, label: `Ads (${payload?.ads.length ?? 0})` },
    { id: "lead_form" as const, label: "Lead Form" },
    { id: "tracking" as const, label: "Tracking" },
    { id: "safety" as const, label: "Safety" },
    { id: "push_readiness" as const, label: "Push Readiness" },
  ];

  const passCount = payload?.safetyChecklist.filter((c) => c.status === "pass").length ?? 0;
  const failCount = payload?.safetyChecklist.filter((c) => c.status === "fail").length ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--t-surface)",
          border: "1px solid var(--t-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: "var(--t-border)" }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#c9a84c]/10 border border-[#c9a84c]/20">
            <Layers size={14} className="text-[#c9a84c]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>
              Meta Payload Preview
            </div>
            <div className="text-[10px]" style={{ color: "var(--t-muted)" }}>
              Preview only — no Meta action taken
            </div>
          </div>
          {/* Preview-only badge */}
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/25 flex items-center gap-1">
            <ShieldCheck size={9} />
            PREVIEW ONLY
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg border transition-colors hover:opacity-80"
            style={{ borderColor: "var(--t-border)", color: "var(--t-dim)" }}
          >
            <X size={14} />
          </button>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--t-muted)" }} />
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <AlertCircle size={20} className="text-[#ef4444] mx-auto mb-2" />
              <div className="text-[12px] text-[#ef4444]">{error}</div>
            </div>
          </div>
        )}

        {payload && !loading && (
          <>
            {/* Safety summary bar */}
            <div
              className="flex items-center gap-4 px-5 py-2 border-b flex-shrink-0"
              style={{ backgroundColor: "var(--t-surface-2)", borderColor: "var(--t-border)" }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
                {payload.campaign.name}
              </span>
              <span className="ml-auto flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-[#22c55e]">
                  <CheckCircle size={10} />
                  {passCount} pass
                </span>
                {failCount > 0 && (
                  <span className="flex items-center gap-1 text-[#ef4444]">
                    <XCircle size={10} />
                    {failCount} issue{failCount > 1 ? "s" : ""}
                  </span>
                )}
                {payload.missingRequirements.length === 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
                    Launch ready
                  </span>
                )}
              </span>
            </div>

            {/* Tabs */}
            <div
              className="flex gap-0 border-b flex-shrink-0 overflow-x-auto"
              style={{ borderColor: "var(--t-border)" }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-4 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors border-b-2"
                  style={{
                    color: activeTab === tab.id ? "#c9a84c" : "var(--t-muted)",
                    borderBottomColor: activeTab === tab.id ? "#c9a84c" : "transparent",
                    backgroundColor: "transparent",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">

              {/* ── Campaign tab ── */}
              {activeTab === "campaign" && (
                <div className="space-y-3">
                  <div
                    className="rounded-xl p-4 space-y-2"
                    style={{ backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Megaphone size={12} className="text-[#0081f2]" />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[#0081f2]">Campaign Object</span>
                    </div>
                    {[
                      ["Name", payload.campaign.name],
                      ["Objective", payload.campaign.objective],
                      ["Type", payload.campaign.campaignType],
                      ["Daily Budget", payload.campaign.dailyBudget],
                      ["Status", payload.campaign.status],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start gap-3 text-[11px]">
                        <span className="w-28 flex-shrink-0 font-medium" style={{ color: "var(--t-dim)" }}>{label}</span>
                        <span
                          style={{
                            color: value === "PAUSED_PREVIEW_ONLY" ? "#f59e0b" : "var(--t-text)",
                            fontFamily: value === "PAUSED_PREVIEW_ONLY" ? "monospace" : undefined,
                          }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-start gap-3 text-[11px] mt-1">
                      <span className="w-28 flex-shrink-0 font-medium" style={{ color: "var(--t-dim)" }}>Notes</span>
                      <span className="text-[#f59e0b] italic">{payload.campaign.notes}</span>
                    </div>
                  </div>

                  {/* Ad Sets */}
                  <div className="flex items-center gap-2 mt-4 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
                      Ad Sets ({payload.adSets.length})
                    </span>
                  </div>
                  {payload.adSets.map((adSet, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-4 space-y-1.5"
                      style={{
                        backgroundColor: "var(--t-surface-2)",
                        border: adSet.launchBlocker ? "1px solid rgba(245,158,11,0.25)" : "1px solid var(--t-border)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[11px] font-semibold" style={{ color: "var(--t-text)" }}>{adSet.name}</span>
                        {adSet.audienceTemperature && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                            style={{
                              backgroundColor: adSet.audienceTemperature === "cold" ? "rgba(96,165,250,0.12)" : adSet.audienceTemperature === "hot" ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.12)",
                              color: adSet.audienceTemperature === "cold" ? "#60a5fa" : adSet.audienceTemperature === "hot" ? "#ef4444" : "#fbbf24",
                            }}
                          >
                            {adSet.audienceTemperature}
                          </span>
                        )}
                        {adSet.budgetAmount && (
                          <span className="text-[9px] font-semibold ml-auto" style={{ color: "var(--t-muted)" }}>
                            {adSet.budgetSplit} · {adSet.budgetAmount}
                          </span>
                        )}
                      </div>
                      {adSet.purpose && (
                        <div className="text-[10px] mb-2 italic" style={{ color: "var(--t-muted)" }}>{adSet.purpose}</div>
                      )}
                      {adSet.launchBlocker && (
                        <div className="flex items-start gap-1.5 rounded-lg px-2.5 py-2 mb-2" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                          <AlertTriangle size={10} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
                          <span className="text-[10px] text-[#f59e0b]">{adSet.launchBlocker}</span>
                        </div>
                      )}
                      {[
                        ["Audience", adSet.audience],
                        ["Location", adSet.locationTargeting],
                        ["Optimization", adSet.optimizationEvent],
                        ["Status", adSet.status],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-start gap-3 text-[11px]">
                          <span className="w-24 flex-shrink-0" style={{ color: "var(--t-dim)" }}>{label}</span>
                          <span style={{ color: value === "PAUSED_PREVIEW_ONLY" ? "#f59e0b" : "var(--t-text)", fontFamily: value === "PAUSED_PREVIEW_ONLY" ? "monospace" : undefined }}>
                            {value}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-start gap-3 text-[11px]">
                        <span className="w-24 flex-shrink-0" style={{ color: "var(--t-dim)" }}>Placements</span>
                        <span style={{ color: "var(--t-text)" }}>{adSet.placements.join(", ") || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Ads tab ── */}
              {activeTab === "ads" && (
                <div className="space-y-3">
                  {payload.ads.some((a) => a.adSetAssignment) && (
                    <div
                      className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ backgroundColor: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}
                    >
                      <Layers size={10} className="text-[#a78bfa]" />
                      <span className="text-[10px] font-semibold text-[#a78bfa]">Creative-to-Ad Mapping (Option B)</span>
                      <span className="text-[10px]" style={{ color: "var(--t-muted)" }}>— one ad per asset, assigned to best-fit ad set</span>
                    </div>
                  )}
                  {payload.ads.map((ad, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-4"
                      style={{
                        backgroundColor: "var(--t-surface-2)",
                        border: `1px solid ${ad.approvedForAds ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Film size={12} className="text-[#a78bfa]" />
                        <span className="text-[11px] font-semibold" style={{ color: "var(--t-text)" }}>{ad.name}</span>
                        <span
                          className="ml-auto text-[10px] px-2 py-0.5 rounded-full border"
                          style={{
                            color: ad.approvedForAds ? "#22c55e" : "#f59e0b",
                            backgroundColor: ad.approvedForAds ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                            borderColor: ad.approvedForAds ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)",
                          }}
                        >
                          {ad.approvedForAds ? "Creative approved" : "Creative not approved"}
                        </span>
                      </div>
                      {ad.adSetAssignment && (
                        <div className="flex items-center gap-2 mb-3 rounded-lg px-2.5 py-1.5" style={{ backgroundColor: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                          <Layers size={9} className="text-[#a78bfa] flex-shrink-0" />
                          <span className="text-[10px] text-[#a78bfa] font-medium">{ad.adSetAssignment}</span>
                          {ad.adSetAudienceTemperature && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1"
                              style={{
                                backgroundColor: ad.adSetAudienceTemperature === "cold" ? "rgba(96,165,250,0.12)" : ad.adSetAudienceTemperature === "hot" ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.12)",
                                color: ad.adSetAudienceTemperature === "cold" ? "#60a5fa" : ad.adSetAudienceTemperature === "hot" ? "#ef4444" : "#fbbf24",
                              }}
                            >
                              {ad.adSetAudienceTemperature}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="space-y-1.5 text-[11px]">
                        {ad.assetId && (
                          <div className="flex gap-3">
                            <span className="w-28 flex-shrink-0" style={{ color: "var(--t-dim)" }}>Asset</span>
                            <span style={{ color: "var(--t-text)" }}>{ad.fileName ?? ad.assetId}</span>
                          </div>
                        )}
                        {ad.assetType && (
                          <div className="flex gap-3">
                            <span className="w-28 flex-shrink-0" style={{ color: "var(--t-dim)" }}>Type</span>
                            <span style={{ color: "var(--t-text)" }}>{ad.assetType} {ad.fileType ? `(${ad.fileType})` : ""}</span>
                          </div>
                        )}
                        {ad.primaryTexts.map((text, j) => (
                          <div key={j} className="flex gap-3">
                            <span className="w-28 flex-shrink-0" style={{ color: "var(--t-dim)" }}>Primary Text {j + 1}</span>
                            <span style={{ color: "var(--t-text)" }}>{text}</span>
                          </div>
                        ))}
                        <div className="flex gap-3">
                          <span className="w-28 flex-shrink-0" style={{ color: "var(--t-dim)" }}>Headline</span>
                          <span style={{ color: "var(--t-text)" }}>{ad.headline}</span>
                        </div>
                        {ad.description && (
                          <div className="flex gap-3">
                            <span className="w-28 flex-shrink-0" style={{ color: "var(--t-dim)" }}>Description</span>
                            <span style={{ color: "var(--t-text)" }}>{ad.description}</span>
                          </div>
                        )}
                        <div className="flex gap-3">
                          <span className="w-28 flex-shrink-0" style={{ color: "var(--t-dim)" }}>CTA</span>
                          <span style={{ color: "var(--t-text)" }}>{ad.cta}</span>
                        </div>
                        {ad.placements.length > 0 && (
                          <div className="flex gap-3">
                            <span className="w-28 flex-shrink-0" style={{ color: "var(--t-dim)" }}>Placements</span>
                            <span style={{ color: "var(--t-text)" }}>{ad.placements.join(", ")}</span>
                          </div>
                        )}
                        {ad.copyGenerationNote && (
                          <div className="mt-2 rounded-lg px-2.5 py-2" style={{ backgroundColor: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)" }}>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-[#c9a84c] mb-0.5">Why this copy matches this creative</div>
                            <div className="text-[10px]" style={{ color: "var(--t-muted)" }}>{ad.copyGenerationNote}</div>
                          </div>
                        )}
                        <div className="flex gap-3">
                          <span className="w-28 flex-shrink-0" style={{ color: "var(--t-dim)" }}>Status</span>
                          <span className="font-mono text-[#f59e0b]">{ad.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Lead Form tab ── */}
              {activeTab === "lead_form" && (
                <div
                  className="rounded-xl p-4 space-y-2"
                  style={{ backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={12} className="text-[#ff8400]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#ff8400]">Lead Form</span>
                  </div>
                  {[
                    ["Form Name", payload.leadForm.formName],
                    ["Intro Copy", payload.leadForm.introCopy],
                    ["Consent Language", payload.leadForm.consentLanguage],
                    ["Thank You Copy", payload.leadForm.thankYouCopy],
                  ].map(([label, value]) => value ? (
                    <div key={label} className="flex items-start gap-3 text-[11px]">
                      <span className="w-32 flex-shrink-0" style={{ color: "var(--t-dim)" }}>{label}</span>
                      <span style={{ color: "var(--t-text)" }}>{value}</span>
                    </div>
                  ) : null)}
                  {payload.leadForm.qualificationQuestions.length > 0 && (
                    <div className="flex items-start gap-3 text-[11px]">
                      <span className="w-32 flex-shrink-0" style={{ color: "var(--t-dim)" }}>Questions</span>
                      <ul className="space-y-0.5" style={{ color: "var(--t-text)" }}>
                        {payload.leadForm.qualificationQuestions.map((q, i) => (
                          <li key={i}>• {q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {payload.leadForm.contactFields.length > 0 && (
                    <div className="flex items-start gap-3 text-[11px]">
                      <span className="w-32 flex-shrink-0" style={{ color: "var(--t-dim)" }}>Contact Fields</span>
                      <span style={{ color: "var(--t-text)" }}>{payload.leadForm.contactFields.join(", ")}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tracking tab ── */}
              {activeTab === "tracking" && (
                <div
                  className="rounded-xl p-4 space-y-2"
                  style={{ backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <RadioTower size={12} className="text-[#22c55e]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#22c55e]">Tracking & Integrations</span>
                  </div>
                  {[
                    {
                      label: "Ad Account",
                      connected: payload.tracking.adAccountConnected,
                      id: payload.tracking.adAccountId,
                    },
                    {
                      label: "Meta Pixel",
                      connected: payload.tracking.pixelConnected,
                      id: payload.tracking.pixelId,
                    },
                    {
                      label: "Facebook Page",
                      connected: payload.tracking.facebookPageConnected,
                      id: payload.tracking.facebookPageId,
                    },
                  ].map(({ label, connected, id }) => (
                    <div key={label} className="flex items-center gap-3 text-[11px]">
                      <span className="w-28 flex-shrink-0" style={{ color: "var(--t-dim)" }}>{label}</span>
                      <span
                        className="flex items-center gap-1.5"
                        style={{ color: connected ? "#22c55e" : "#ef4444" }}
                      >
                        {connected ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {connected ? (id ?? "Connected") : "Not connected"}
                      </span>
                    </div>
                  ))}
                  {payload.tracking.lastSyncedAt && (
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="w-28 flex-shrink-0" style={{ color: "var(--t-dim)" }}>Last Synced</span>
                      <span style={{ color: "var(--t-muted)" }}>
                        {new Date(payload.tracking.lastSyncedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Safety tab ── */}
              {activeTab === "safety" && (
                <div className="space-y-2">
                  {payload.safetyChecklist.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                      style={{
                        backgroundColor: "var(--t-surface-2)",
                        border: `1px solid ${safetyColor(item.status)}22`,
                      }}
                    >
                      {safetyIcon(item.status)}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold mb-0.5" style={{ color: safetyColor(item.status) }}>
                          {item.label}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--t-muted)" }}>{item.detail}</div>
                      </div>
                    </div>
                  ))}

                  {payload.missingRequirements.length > 0 && (
                    <div
                      className="rounded-xl p-4 mt-2"
                      style={{ backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={11} className="text-[#ef4444]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#ef4444]">
                          Required Before Launch
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {payload.missingRequirements.map((req, i) => (
                          <li key={i} className="text-[11px] text-[#ef4444] flex items-start gap-1.5">
                            <span className="mt-0.5">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {payload.missingRequirements.length === 0 && (
                    <div
                      className="rounded-xl p-4 flex items-center gap-2"
                      style={{ backgroundColor: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}
                    >
                      <CheckCircle size={13} className="text-[#22c55e]" />
                      <span className="text-[12px] text-[#22c55e] font-medium">
                        All requirements met — ready for human approval to launch
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Push Readiness Gate tab ── */}
              {activeTab === "push_readiness" && (() => {
                // ── Compute each gate check from payload data ─────────────────
                const draftApproved = ["approved", "ready_for_meta", "pushed_paused", "live"].includes(payload.draftStatus);
                const hasAds = payload.ads.length > 0;
                const allCreativesApproved = hasAds && payload.ads.every((a) => a.approvedForAds);
                const adAccountConnected = payload.tracking.adAccountConnected;
                const pixelConnected = payload.tracking.pixelConnected;
                const pageConnected = payload.tracking.facebookPageConnected;
                const leadFormComplete =
                  payload.leadForm.qualificationQuestions.length > 0 &&
                  !!payload.leadForm.consentLanguage;
                const noComplianceBlockers =
                  !payload.missingRequirements.some((r) =>
                    !r.startsWith("⚠") && (r.toLowerCase().includes("policy risk") || r.toLowerCase().includes("compliance violation"))
                  );
                const noHighRisk = !payload.safetyChecklist.some(
                  (c) => c.status === "fail" && (c.label.toLowerCase().includes("risk") || c.label.toLowerCase().includes("disallowed"))
                );
                const previewExists = true; // We are inside the modal — preview was built.

                type GateStatus = "pass" | "fail" | "warn" | "unknown";
                interface GateCheck {
                  label: string;
                  status: GateStatus;
                  detail: string;
                  manualOnly?: boolean;
                }

                // Check for actual disallowed phrase violations in safety checklist
                const disallowedItem = payload.safetyChecklist.find((c) => c.label === "Disallowed Phrases");
                const hasActualViolations = disallowedItem?.status === "fail";
                const hasHighPolicyRisk = payload.safetyChecklist.some(
                  (c) => c.status === "fail" && (c.label === "Meta Policy Risk" || c.label === "Disallowed Phrases")
                );

                // Retargeting blocked specifically
                const retargetingItem = payload.safetyChecklist.find((c) => c.label === "Retargeting Ad Set");
                const retargetingBlocked = retargetingItem?.status === "warn";

                const checks: GateCheck[] = [
                  {
                    label: "Campaign Draft Approved",
                    status: draftApproved ? "pass" : "fail",
                    detail: draftApproved
                      ? `Status: ${payload.draftStatus} — draft has been approved for Meta push review.`
                      : `Draft must be approved before push. Current status: ${payload.draftStatus}. Submit for approval in the Campaign Builder.`,
                  },
                  {
                    label: "All Creative Assets Approved for Ads",
                    status: !hasAds ? "warn" : allCreativesApproved ? "pass" : "fail",
                    detail: !hasAds
                      ? "No ad variations found in draft — add creatives in Campaign Builder first."
                      : allCreativesApproved
                      ? `${payload.ads.length} ad variation${payload.ads.length !== 1 ? "s" : ""} — all approved for Meta ads.`
                      : `${payload.ads.filter((a) => !a.approvedForAds).length} of ${payload.ads.length} creative(s) not yet approved. Approve in Creative Library → mark as Approved for Ads.`,
                  },
                  {
                    label: "Meta Ad Account Connected",
                    status: adAccountConnected ? "pass" : "fail",
                    detail: adAccountConnected
                      ? `Ad Account: ${payload.tracking.adAccountId ?? "connected"} — Meta ad account is active.`
                      : "No connected Meta ad account. Connect in Client → Integrations → Meta. Required for all campaign launches.",
                  },
                  {
                    // Pixel is a WARNING (not a hard blocker) for instant-form lead campaigns.
                    // Hard blocker only when retargeting ad set is included.
                    label: "Meta Pixel Confirmed",
                    status: pixelConnected ? "pass" : retargetingBlocked ? "warn" : "warn",
                    detail: pixelConnected
                      ? `Pixel ID: ${payload.tracking.pixelId ?? "confirmed"} — website event tracking active.`
                      : "Meta Pixel ID missing. Add in Client → Integrations → Meta. Required for retargeting and website event optimization. Instant-form prospecting ad sets can launch without Pixel.",
                  },
                  {
                    // Facebook Page is a WARNING (not a hard blocker) for prospecting-only campaigns.
                    label: "Facebook Page Connected",
                    status: pageConnected ? "pass" : "warn",
                    detail: pageConnected
                      ? `Page ID: ${payload.tracking.facebookPageId ?? "connected"} — Facebook Page confirmed.`
                      : "Facebook Page ID missing. Add in Client → Integrations → Meta. Required for retargeting ad set and social proof placement. Prospecting ad sets can run without it.",
                  },
                  {
                    label: "Lead Form Configured",
                    status: leadFormComplete ? "pass" : "fail",
                    detail: leadFormComplete
                      ? `${payload.leadForm.qualificationQuestions.length} qualification question(s) — consent language present.`
                      : "Lead form missing qualification questions or consent language. Complete in Campaign Builder → Lead Form section.",
                  },
                  {
                    // Only fail if actual violations were found in copy, not just if the compliance
                    // section has a "phrases to avoid" advisory list.
                    label: "No Compliance Blockers",
                    status: hasActualViolations || hasHighPolicyRisk ? "fail" : noComplianceBlockers ? "pass" : "warn",
                    detail: hasActualViolations
                      ? `Compliance violation detected in ad copy. Review the Safety tab → Disallowed Phrases. Resolve before Meta push.`
                      : hasHighPolicyRisk
                      ? "HIGH policy risk detected. Review Safety tab and resolve all HIGH-risk flags before launch."
                      : noComplianceBlockers
                      ? "No compliance or policy-risk blockers detected in generated copy."
                      : "Review approval warnings in Safety tab before launching.",
                  },
                  {
                    label: "No HIGH Policy Risk Phrases",
                    status: noHighRisk ? "pass" : "warn",
                    detail: noHighRisk
                      ? "Ad copy passed policy phrase scan — no HIGH-risk patterns detected."
                      : "One or more policy patterns flagged. Review Safety tab → Meta Policy Risk for details.",
                  },
                  ...(retargetingBlocked ? [{
                    label: "Retargeting Ad Set Status",
                    status: "warn" as GateStatus,
                    detail: `Retargeting ad set is paused — Pixel and/or Facebook Page missing. Prospecting ad sets are unaffected and can launch. To enable retargeting: add Pixel ID + Facebook Page ID in Client → Integrations → Meta.`,
                  }] : []),
                  {
                    label: "Meta Payload Preview Generated",
                    status: previewExists ? "pass" : "fail",
                    detail: "Preview payload built successfully — campaign structure, ad sets, ads, lead form, and tracking are all defined. No Meta API write has occurred.",
                  },
                  {
                    label: "GHL Follow-up Sequence Verified",
                    status: "warn",
                    detail: "Manual verification required. Confirm the GHL automation sequence is live and a test lead has been submitted before any Meta push.",
                    manualOnly: true,
                  },
                  {
                    label: "Human Operator Confirmation",
                    status: "unknown",
                    detail: "An authorized operator must manually unlock push actions. This cannot be automated. No campaign, ad set, ad, or budget has been created in Meta.",
                    manualOnly: true,
                  },
                ];

                const passCount = checks.filter((c) => c.status === "pass").length;
                const warnCount = checks.filter((c) => c.status === "warn").length;

                // Segment-level readiness — hard blockers stop all push; Pixel/Page only block retargeting
                const draftBlocker = !draftApproved;
                const accountBlocker = !adAccountConnected;
                const assetBlocker = !allCreativesApproved && hasAds;
                const complianceBlocker = hasActualViolations || hasHighPolicyRisk;
                const hardBlocked = draftBlocker || accountBlocker || assetBlocker || complianceBlocker;
                const trackingWarnings = (!pixelConnected ? 1 : 0) + (!pageConnected ? 1 : 0);

                const summaryLine = hardBlocked
                  ? complianceBlocker
                    ? "Push blocked · Resolve compliance violations before Meta submission"
                    : draftBlocker
                    ? "Push blocked · Campaign draft requires human approval"
                    : accountBlocker
                    ? "Push blocked · Meta ad account required for all campaign launches"
                    : assetBlocker
                    ? "Push blocked · Creative assets require approval before Meta submission"
                    : "Push blocked · Resolve all issues before Meta submission"
                  : trackingWarnings > 0
                  ? `Prospecting eligible · Intent eligible · Retargeting blocked · ${trackingWarnings} tracking warning${trackingWarnings > 1 ? "s" : ""}`
                  : "Ready for paused Meta push · Human approval required";

                return (
                  <div className="space-y-3">

                    {/* Gate header */}
                    <div
                      className="rounded-xl p-4"
                      style={{ backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Lock size={12} className="text-[#c9a84c]" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-[#c9a84c]">
                          Meta Push Readiness Gate
                        </span>
                        <span
                          className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                          style={{
                            color: hardBlocked ? "#ef4444" : warnCount > 0 ? "#f59e0b" : "#22c55e",
                            backgroundColor: hardBlocked ? "rgba(239,68,68,0.08)" : warnCount > 0 ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)",
                            borderColor: hardBlocked ? "rgba(239,68,68,0.25)" : warnCount > 0 ? "rgba(245,158,11,0.25)" : "rgba(34,197,94,0.25)",
                          }}
                        >
                          {hardBlocked ? "Push Blocked" : warnCount > 0 ? "Warnings Present" : "Ready for Paused Push"}
                        </span>
                      </div>

                      {/* Segment-level readiness pills */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center gap-1"
                          style={{
                            color: hardBlocked ? "#ef4444" : "#22c55e",
                            backgroundColor: hardBlocked ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)",
                            borderColor: hardBlocked ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)",
                          }}
                        >
                          {hardBlocked ? <XCircle size={9} /> : <CheckCircle size={9} />}
                          Prospecting {hardBlocked ? "blocked" : "eligible"}
                        </span>
                        <span
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center gap-1"
                          style={{
                            color: hardBlocked ? "#ef4444" : "#22c55e",
                            backgroundColor: hardBlocked ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)",
                            borderColor: hardBlocked ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)",
                          }}
                        >
                          {hardBlocked ? <XCircle size={9} /> : <CheckCircle size={9} />}
                          Intent {hardBlocked ? "blocked" : "eligible"}
                        </span>
                        <span
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center gap-1"
                          style={{
                            color: hardBlocked || !pixelConnected || !pageConnected ? "#f59e0b" : "#22c55e",
                            backgroundColor: hardBlocked || !pixelConnected || !pageConnected ? "rgba(245,158,11,0.07)" : "rgba(34,197,94,0.07)",
                            borderColor: hardBlocked || !pixelConnected || !pageConnected ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)",
                          }}
                        >
                          {hardBlocked || !pixelConnected || !pageConnected ? <AlertTriangle size={9} /> : <CheckCircle size={9} />}
                          Retargeting {hardBlocked || !pixelConnected || !pageConnected ? "blocked" : "ready"}
                        </span>
                        {trackingWarnings > 0 && (
                          <span
                            className="text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center gap-1"
                            style={{ color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.07)", borderColor: "rgba(245,158,11,0.2)" }}
                          >
                            <AlertTriangle size={9} />
                            {trackingWarnings} tracking warning{trackingWarnings > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Operational summary line */}
                      <p
                        className="text-[11px] font-medium mb-2 leading-snug"
                        style={{ color: hardBlocked ? "#ef4444" : trackingWarnings > 0 ? "#f59e0b" : "#22c55e" }}
                      >
                        {summaryLine}
                      </p>

                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                        This gate is{" "}
                        <span className="font-semibold text-[#c9a84c]">read-only</span> — it validates
                        the current state without making any API calls or writes.
                      </p>
                    </div>

                    {/* Checklist */}
                    {checks.map((check, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                        style={{
                          backgroundColor: "var(--t-surface-2)",
                          border: `1px solid ${
                            check.status === "pass" ? "rgba(34,197,94,0.18)" :
                            check.status === "fail" ? "rgba(239,68,68,0.18)" :
                            check.status === "warn" ? "rgba(245,158,11,0.18)" :
                            "rgba(107,122,153,0.18)"
                          }`,
                        }}
                      >
                        {check.status === "pass" && <CheckCircle size={11} className="text-[#22c55e] flex-shrink-0 mt-0.5" />}
                        {check.status === "fail" && <XCircle size={11} className="text-[#ef4444] flex-shrink-0 mt-0.5" />}
                        {check.status === "warn" && <AlertTriangle size={11} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />}
                        {check.status === "unknown" && <Lock size={11} className="flex-shrink-0 mt-0.5" style={{ color: "var(--t-dim)" }} />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="text-[11px] font-semibold"
                              style={{
                                color: check.status === "pass" ? "#22c55e" :
                                       check.status === "fail" ? "#ef4444" :
                                       check.status === "warn" ? "#f59e0b" :
                                       "var(--t-muted)",
                              }}
                            >
                              {check.label}
                            </span>
                            {check.manualOnly && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                                style={{ backgroundColor: "rgba(107,122,153,0.12)", color: "var(--t-dim)", border: "1px solid rgba(107,122,153,0.2)" }}
                              >
                                Manual
                              </span>
                            )}
                          </div>
                          <div className="text-[10px]" style={{ color: "var(--t-muted)" }}>{check.detail}</div>
                        </div>
                      </div>
                    ))}

                    {/* Disabled Push Placeholder */}
                    <div
                      className="rounded-xl p-5 mt-2"
                      style={{ backgroundColor: "rgba(42,46,66,0.35)", border: "1px solid rgba(42,46,66,0.6)" }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Lock size={13} style={{ color: "var(--t-dim)" }} />
                        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
                          Push to Meta — Not Available
                        </span>
                      </div>
                      <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "var(--t-muted)" }}>
                        Meta push is not available in this build. This readiness gate prepares the future
                        <span className="font-semibold text-[#c9a84c]"> paused-push workflow</span>.
                        When the push action is implemented, it will only create campaigns in{" "}
                        <span className="font-mono text-[#f59e0b]">PAUSED</span> status and will require all
                        checks above to pass plus an explicit operator unlock.
                      </p>
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold cursor-not-allowed"
                        style={{
                          backgroundColor: "rgba(42,46,66,0.5)",
                          border: "1px solid rgba(42,46,66,0.8)",
                          color: "var(--t-dim)",
                          opacity: 0.5,
                        }}
                      >
                        <Lock size={12} />
                        Push to Meta (Paused) — Locked
                      </button>
                      <p className="text-[10px] text-center mt-2" style={{ color: "var(--t-dim)" }}>
                        No Meta API calls are made. No data is sent. This is a planning-only gate.
                      </p>
                    </div>

                  </div>
                );
              })()}

            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 border-t flex items-center gap-2 flex-shrink-0"
              style={{ borderColor: "var(--t-border)", backgroundColor: "var(--t-surface-2)" }}
            >
              <ShieldCheck size={11} className="text-[#c9a84c]" />
              <span className="text-[10px]" style={{ color: "var(--t-muted)" }}>
                Preview generated {new Date(payload.generatedAt).toLocaleTimeString()} — No Meta API calls made. No data sent.
              </span>
              <button
                onClick={onClose}
                className="ml-auto text-[11px] px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
                style={{ color: "var(--t-muted)", borderColor: "var(--t-border)" }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Veronica draft types ──────────────────────────────────────

interface VeronicaDraft {
  id: string;
  clientId: string | null;
  clientName: string | null;
  draftType: string;
  title: string;
  content: string;
  sourcePrompt: string | null;
  agentsUsed: string[];
  dataSources: string[];
  approvalStatus: "needs_review" | "approved" | "changes_requested" | "archived";
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const DRAFT_TYPE_LABELS: Record<string, string> = {
  campaign_draft: "Campaign Draft",
  ghl_workflow_blueprint: "GHL Workflow Blueprint",
  client_message_draft: "Client Message Draft",
  creative_brief: "Creative Brief",
  internal_task_list: "Internal Task List",
  report_draft: "Report Draft",
  ad_copy_draft: "Ad Copy Draft",
};

const DRAFT_TYPE_COLORS: Record<string, string> = {
  campaign_draft: "#0081f2",
  ghl_workflow_blueprint: "#22c55e",
  client_message_draft: "#f59e0b",
  creative_brief: "#a78bfa",
  internal_task_list: "#6b7a99",
  report_draft: "#6b7a99",
  ad_copy_draft: "#ff8400",
};

const AGENT_LABELS: Record<string, string> = {
  client_health: "Client Health",
  launch_readiness: "Launch Readiness",
  client_intelligence: "Client Intelligence",
  media_buyer: "Media Buyer",
  ghl_followup: "GHL Follow-Up",
  sales_conversion: "Sales Conversion",
  creative_strategist: "Creative Strategist",
  offer_messaging: "Offer & Messaging",
  reporting: "Reporting",
  operator_priority: "Operator Priority",
  client_retention: "Client Retention",
  upsell_opportunity: "Upsell Opportunity",
  capacity_scaling: "Capacity & Scaling",
  data_quality: "Data Quality",
  compliance_risk: "Compliance & Risk",
  landing_page_cro: "Landing Page CRO",
  appointment_setter: "Appointment Setter",
  client_communication: "Client Communication",
  ghl_workflow_builder: "GHL Workflow Builder",
};

// ── Veronica draft card ───────────────────────────────────────

function VeronicaDraftCard({
  draft,
  canApprove,
  onStatusChange,
  feedback,
}: {
  draft: VeronicaDraft;
  canApprove: boolean;
  onStatusChange: (id: string, status: VeronicaDraft["approvalStatus"]) => Promise<void>;
  feedback?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const typeColor = DRAFT_TYPE_COLORS[draft.draftType] ?? "#6b7a99";
  const typeLabel = DRAFT_TYPE_LABELS[draft.draftType] ?? draft.draftType;

  const isNeedsReview = draft.approvalStatus === "needs_review";
  const isApproved = draft.approvalStatus === "approved";
  const isChangesRequested = draft.approvalStatus === "changes_requested";
  const isArchived = draft.approvalStatus === "archived";

  const borderColor = isNeedsReview
    ? "rgba(201, 168, 76, 0.25)"
    : isApproved
    ? "rgba(34, 197, 94, 0.20)"
    : isChangesRequested
    ? "rgba(245, 158, 11, 0.20)"
    : "var(--t-border)";

  const shortContent =
    draft.content.length > 350 ? draft.content.slice(0, 350).trimEnd() + "…" : draft.content;

  const formattedDate = new Date(draft.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function handleAction(status: VeronicaDraft["approvalStatus"]) {
    setUpdating(true);
    try {
      await onStatusChange(draft.id, status);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--t-surface)",
        border: `1px solid ${borderColor}`,
        boxShadow: "var(--t-card-shadow)",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${typeColor}15`,
            border: `1px solid ${typeColor}28`,
          }}
        >
          <Archive size={15} style={{ color: typeColor }} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[12px] font-bold" style={{ color: "var(--t-text)" }}>
              {draft.clientName ?? "No client attached"}
            </span>
            <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>·</span>
            <span className="text-[10px] font-semibold" style={{ color: "var(--t-muted)" }}>
              Veronica Draft
            </span>

            {/* Draft type badge */}
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
              style={{
                color: typeColor,
                backgroundColor: `${typeColor}12`,
                borderColor: `${typeColor}28`,
              }}
            >
              {typeLabel}
            </span>

            {/* Status badge */}
            {isNeedsReview && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/25">
                Needs Review
              </span>
            )}
            {isApproved && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/25">
                Approved
              </span>
            )}
            {isChangesRequested && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/25">
                Changes Requested
              </span>
            )}
            {isArchived && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#6b7a99]/10 text-[#6b7a99] border border-[#6b7a99]/25">
                Archived
              </span>
            )}
          </div>

          {/* Title */}
          <div className="text-[13px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
            {draft.title}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 text-[11px] flex-wrap mb-2" style={{ color: "var(--t-muted)" }}>
            <span>{formattedDate}</span>
            {draft.clientId && (
              <>
                <span>·</span>
                <Link
                  href={`/clients/${draft.clientId}`}
                  className="hover:underline"
                  style={{ color: "var(--t-muted)" }}
                >
                  View Client
                </Link>
              </>
            )}
          </div>

          {/* Agents used */}
          {draft.agentsUsed.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {draft.agentsUsed.map((a) => (
                <span
                  key={a}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: "var(--t-surface-2)",
                    color: "var(--t-dim)",
                    border: "1px solid var(--t-border)",
                  }}
                >
                  {AGENT_LABELS[a] ?? a}
                </span>
              ))}
            </div>
          )}

          {/* Data sources */}
          {draft.dataSources.length > 0 && (
            <div className="text-[10px] mb-2" style={{ color: "var(--t-dim)" }}>
              Sources: {draft.dataSources.join(", ")}
            </div>
          )}

          {/* Content preview */}
          <div
            className="rounded-lg p-3 mt-2"
            style={{
              backgroundColor: "var(--t-surface-2)",
              border: "1px solid var(--t-border)",
            }}
          >
            {expanded ? (
              <pre
                className="text-[11px] leading-relaxed whitespace-pre-wrap break-words overflow-auto"
                style={{ color: "var(--t-text)", maxHeight: "400px" }}
              >
                {draft.content}
              </pre>
            ) : (
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                {shortContent}
              </p>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 mt-2 text-[10px] font-medium transition-colors hover:opacity-80"
              style={{ color: typeColor }}
            >
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {expanded ? "Collapse" : "Review Draft"}
            </button>
          </div>

          {feedback && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#22c55e]">
              <CheckCircle2 size={11} />
              {feedback}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2 flex-wrap justify-end">
          {isNeedsReview && canApprove && (
            <>
              <button
                disabled={updating}
                onClick={() => handleAction("changes_requested")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#f59e0b] border border-[#f59e0b]/30 rounded-lg hover:bg-[#f59e0b]/10 transition-colors disabled:opacity-50"
              >
                <MessageSquare size={12} />
                Request Changes
              </button>
              <button
                disabled={updating}
                onClick={() => handleAction("approved")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[#22c55e] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <CheckCircle2 size={12} />
                Mark Approved
              </button>
            </>
          )}

          {isChangesRequested && canApprove && (
            <button
              disabled={updating}
              onClick={() => handleAction("needs_review")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ color: "var(--t-muted)", borderColor: "var(--t-border)" }}
            >
              Reopen
            </button>
          )}

          {isApproved && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#22c55e] px-3 py-1.5 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg">
              <CheckCircle2 size={11} />
              Approved
            </span>
          )}

          {!isArchived && canApprove && (
            <button
              disabled={updating}
              onClick={() => handleAction("archived")}
              className="w-7 h-7 flex items-center justify-center rounded-lg border transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: "var(--t-border)", color: "var(--t-dim)" }}
              title="Archive"
            >
              <Archive size={12} />
            </button>
          )}

          {!canApprove && isNeedsReview && (
            <span
              className="text-[10px] px-2 py-1.5 rounded-lg flex items-center gap-1"
              style={{ color: "var(--t-dim)", backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}
            >
              <ShieldCheck size={10} />
              Admin approval required
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Mock approvals icon maps ──────────────────────────────────

const iconMap: Record<ApprovalIconType, React.ElementType> = {
  campaign: Megaphone,
  copy: FileText,
  budget: DollarSign,
  creative: ImageIcon,
  report: GitPullRequest,
  workflow: Settings,
};

const iconColorMap: Record<ApprovalIconType, string> = {
  campaign: "#0081f2",
  copy: "#ff8400",
  budget: "#22c55e",
  creative: "#a78bfa",
  report: "#6b7a99",
  workflow: "#0081f2",
};

// ── Draft risk helper ─────────────────────────────────────────

function parseRisk(metaRisk: string): { label: string; color: string } {
  if (metaRisk.startsWith("HIGH")) return { label: "High Risk", color: "#ef4444" };
  if (metaRisk.startsWith("MEDIUM")) return { label: "Med Risk", color: "#f59e0b" };
  return { label: "Low Risk", color: "#22c55e" };
}

// ── Campaign draft approval card ──────────────────────────────

function DraftCard({
  draft,
  onUpdate,
  canApprove,
  canMarkReady,
}: {
  draft: CampaignDraft;
  onUpdate: (id: string, status: DraftStatus) => void;
  canApprove: boolean;
  canMarkReady: boolean;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const risk = parseRisk(draft.compliance.metaRisk);
  const isActive = draft.status === "needs_review";
  const isApproved = draft.status === "approved";
  const changesRequested = draft.status === "changes_requested";
  const isReadyOrLive = ["ready_for_meta", "pushed_paused", "live"].includes(draft.status);
  const isRejected = draft.status === "rejected";

  return (
    <>
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--t-surface)",
        border: isActive
          ? "1px solid rgba(0, 129, 242, 0.25)"
          : isApproved
          ? "1px solid rgba(34, 197, 94, 0.20)"
          : "1px solid var(--t-border)",
        boxShadow: "var(--t-card-shadow)",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0081f2]/10 border border-[#0081f2]/20">
          <Bot size={15} className="text-[#0081f2]" />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[12px] font-bold" style={{ color: "var(--t-text)" }}>{draft.clientName}</span>
            <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>·</span>
            <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>AI Campaign Draft</span>
            <Badge label={draftStatusLabel[draft.status]} variant={draftStatusVariant[draft.status]} />
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1"
              style={{
                color: risk.color,
                backgroundColor: `${risk.color}15`,
                borderColor: `${risk.color}28`,
              }}
            >
              <ShieldCheck size={9} />
              {risk.label}
            </span>
          </div>
          <div className="text-[13px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>{draft.campaignName}</div>
          <div className="flex items-center gap-2 text-[11px] flex-wrap mb-2" style={{ color: "var(--t-muted)" }}>
            <span>{draft.service}</span>
            <span>·</span>
            <span>{draft.market}</span>
            <span>·</span>
            <span>{draft.budget}</span>
            <span>·</span>
            <span>{draft.goal}</span>
          </div>
          <div className="text-[10px]" style={{ color: "var(--t-dim)" }}>
            Submitted by {draft.createdBy} · {draft.updatedAt}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2 flex-wrap justify-end">
          <Link
            href={`/ai-agent?draft=${draft.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#6b7a99] border border-[rgba(0, 129, 242, 0.15)] rounded-lg hover:text-[#f8f8f7] hover:border-[rgba(0, 129, 242, 0.25)] transition-colors"
          >
            <Eye size={12} />
            View Draft
          </Link>

          {(isActive || isApproved) && (
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border rounded-lg transition-colors hover:opacity-80"
              style={{ color: "#c9a84c", borderColor: "rgba(201,168,76,0.3)", backgroundColor: "rgba(201,168,76,0.06)" }}
            >
              <Layers size={12} />
              Meta Preview
            </button>
          )}

          {isActive && (
            <>
              <button
                onClick={() => onUpdate(draft.id, "changes_requested")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#f59e0b] border border-[#f59e0b]/30 rounded-lg hover:bg-[#f59e0b]/10 transition-colors"
              >
                <MessageSquare size={12} />
                Request Changes
              </button>
              {canApprove ? (
                <>
                  <button
                    onClick={() => onUpdate(draft.id, "rejected")}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[rgba(0, 129, 242, 0.15)] text-[#6b7a99] hover:text-[#ef4444] hover:border-[#ef4444]/30 transition-colors"
                    title="Reject"
                  >
                    <X size={13} />
                  </button>
                  <button
                    onClick={() => onUpdate(draft.id, "approved")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[#22c55e] text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <CheckCircle2 size={12} />
                    Approve
                  </button>
                </>
              ) : (
                <span className="text-[10px] px-2 py-1.5 rounded-lg flex items-center gap-1" style={{ color: "var(--t-dim)", backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}>
                  <ShieldCheck size={10} />
                  Admin approval required
                </span>
              )}
            </>
          )}

          {isApproved && (
            canMarkReady ? (
              <button
                onClick={() => onUpdate(draft.id, "ready_for_meta")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold vc-orange-gradient text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <RadioTower size={12} />
                Mark Ready for Meta
              </button>
            ) : (
              <span className="text-[10px] px-2 py-1.5 rounded-lg flex items-center gap-1" style={{ color: "var(--t-dim)", backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}>
                <ShieldCheck size={10} />
                Admin only
              </span>
            )
          )}

          {changesRequested && (
            <span className="text-[11px] text-[#f59e0b] px-3 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg">
              Awaiting revision
            </span>
          )}

          {isReadyOrLive && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#22c55e] px-3 py-1.5 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg">
              <CheckCircle2 size={11} />
              {draftStatusLabel[draft.status]}
            </span>
          )}

          {isRejected && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#ef4444] px-3 py-1.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg">
              <XCircle size={11} />
              Rejected
            </span>
          )}
        </div>
      </div>
    </div>

    {showPreview && (
      <MetaPayloadPreviewModal draftId={draft.id} onClose={() => setShowPreview(false)} />
    )}
    </>
  );
}

// ── Creative approval card ─────────────────────────────────────

function CreativeApprovalCard({ draft }: { draft: CampaignDraft }) {
  const intel = draft.creativeIntelligenceUsed!;
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "changes">("pending");

  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--t-surface)",
        border: status === "approved"
          ? "1px solid rgba(34, 197, 94, 0.20)"
          : status === "rejected"
          ? "1px solid rgba(239, 68, 68, 0.20)"
          : status === "changes"
          ? "1px solid rgba(245, 158, 11, 0.20)"
          : "1px solid rgba(167, 139, 250, 0.25)",
        boxShadow: "var(--t-card-shadow)",
      }}
    >
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#a78bfa]/10 border border-[#a78bfa]/20">
          <Film size={15} className="text-[#a78bfa]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[12px] font-bold" style={{ color: "var(--t-text)" }}>{draft.clientName}</span>
            <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>·</span>
            <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>Creative Approval Request</span>
            {status === "pending" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/25">
                Needs Approval
              </span>
            )}
            {status === "approved" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/25">
                Approved
              </span>
            )}
            {status === "rejected" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/25">
                Rejected
              </span>
            )}
            {status === "changes" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/25">
                Changes Requested
              </span>
            )}
          </div>
          <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>{intel.assetType}</div>
          <div className="text-[12px] mb-1" style={{ color: "var(--t-muted)" }}>{intel.creativeStrength}</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {intel.trustSignals.slice(0, 3).map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 rounded-full">{s}</span>
            ))}
          </div>
          <div className="text-[11px] mb-1" style={{ color: "var(--t-muted)" }}>
            <span style={{ color: "var(--t-dim)" }}>Used in:</span> {draft.campaignName}
          </div>
          {intel.complianceNote && (
            <div className="flex items-start gap-1.5 mt-2">
              <AlertCircle size={11} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#f59e0b]">{intel.complianceNote}</p>
            </div>
          )}
        </div>
        {status === "pending" && (
          <div className="flex items-center gap-2 flex-shrink-0 ml-2 flex-wrap justify-end">
            <Link
              href={`/ai-agent?draft=${draft.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#6b7a99] border border-[rgba(0, 129, 242, 0.15)] rounded-lg hover:text-[#f8f8f7] hover:border-[rgba(0, 129, 242, 0.25)] transition-colors"
            >
              <Eye size={12} />
              View Draft
            </Link>
            <button
              onClick={() => setStatus("changes")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#f59e0b] border border-[#f59e0b]/30 rounded-lg hover:bg-[#f59e0b]/10 transition-colors"
            >
              <MessageSquare size={12} />
              Request Changes
            </button>
            <button
              onClick={() => setStatus("rejected")}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[rgba(0, 129, 242, 0.15)] text-[#6b7a99] hover:text-[#ef4444] hover:border-[#ef4444]/30 transition-colors"
              title="Reject"
            >
              <X size={13} />
            </button>
            <button
              onClick={() => setStatus("approved")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[#22c55e] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <CheckCircle2 size={12} />
              Approve Creative
            </button>
          </div>
        )}
        {status !== "pending" && (
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {status === "approved" && (
              <span className="flex items-center gap-1.5 text-[11px] text-[#22c55e] px-3 py-1.5 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg">
                <CheckCircle2 size={11} />
                Approved
              </span>
            )}
            {status === "rejected" && (
              <span className="flex items-center gap-1.5 text-[11px] text-[#ef4444] px-3 py-1.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg">
                <XCircle size={11} />
                Rejected
              </span>
            )}
            {status === "changes" && (
              <span className="text-[11px] text-[#f59e0b] px-3 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg">
                Awaiting revision
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const { plans, updateStatus } = usePlans();
  const { can } = useAuth();
  const canApprove = can("canApproveCampaigns");
  const canMarkReady = can("canMarkReadyForMeta");

  // Prevent hydration mismatch: localStorage-derived counts are 0 on the server
  // and may differ on the client. Render stable placeholders until after mount.
  const [mounted, setMounted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Veronica drafts state
  const [veronicaDrafts, setVeronicaDrafts] = useState<VeronicaDraft[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [draftFeedback, setDraftFeedback] = useState<Record<string, string>>({});

  useEffect(() => { setMounted(true); }, []);

  // Fetch veronica drafts from the server on mount
  useEffect(() => {
    fetch("/api/veronica/drafts")
      .then((r) => r.ok ? r.json() : { drafts: [] })
      .then((body) => setVeronicaDrafts(body.drafts ?? []))
      .catch(() => {});
  }, []);

  async function handleVeronicaStatusChange(
    id: string,
    status: VeronicaDraft["approvalStatus"]
  ) {
    const res = await fetch(`/api/veronica/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalStatus: status }),
    });
    if (res.ok) {
      setVeronicaDrafts((prev) =>
        prev.map((d) => (d.id === id ? { ...d, approvalStatus: status } : d))
      );
      if (status === "approved") {
        const body = await res.json().catch(() => ({}));
        const msg = body.taskAlreadyExists
          ? "Draft approved. Operator task already exists."
          : body.createdTaskId
          ? "Draft approved. Operator task created."
          : "Draft approved.";
        setDraftFeedback((prev) => ({ ...prev, [id]: msg }));
      }
    }
  }

  // Actionable: require human review or revision
  const actionableDrafts = mounted
    ? plans.filter((p) => ["needs_review", "changes_requested"].includes(p.status))
    : [];
  // Approved: admin must mark ready for Meta before launch
  const approvedDrafts = mounted
    ? plans.filter((p) => p.status === "approved")
    : [];
  // History: terminal or launched — no further action needed
  const historyDrafts = mounted
    ? plans.filter((p) =>
        ["ready_for_meta", "pushed_paused", "live", "rejected"].includes(p.status)
      )
    : [];
  const creativePendingDrafts = mounted
    ? plans.filter((p) => p.creativeIntelligenceUsed && !p.creativeIntelligenceUsed.approvedForAds)
    : [];
  const needsReviewCount = mounted ? plans.filter((p) => p.status === "needs_review").length : 0;
  const changesRequestedCount = mounted
    ? plans.filter((p) => p.status === "changes_requested").length
    : 0;
  const approvedCount = mounted ? approvedDrafts.length : 0;

  // Veronica draft computed lists
  const veronicaNeedsReview = veronicaDrafts.filter((d) =>
    ["needs_review", "changes_requested"].includes(d.approvalStatus)
  );
  const veronicaApproved = veronicaDrafts.filter((d) => d.approvalStatus === "approved");
  const veronicaArchived = veronicaDrafts.filter((d) => d.approvalStatus === "archived");
  const veronicaNeedsReviewCount = veronicaNeedsReview.length;

  const totalPending =
    needsReviewCount +
    changesRequestedCount +
    creativePendingDrafts.length +
    veronicaNeedsReviewCount;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Approvals"
        description={`${totalPending} items awaiting review`}
      />

      {/* Safety notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-[#f59e0b]/5 border border-[#f59e0b]/15 rounded-xl mb-6">
        <ShieldCheck size={13} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
        <p className="text-[12px] leading-snug" style={{ color: "var(--t-muted)" }}>
          <span className="text-[#f59e0b] font-semibold">AI Safety: </span>
          AI-generated campaign drafts require human approval before launch, budget changes, or Meta publishing.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: "Needs Review", count: needsReviewCount, color: "#0081f2" },
          { label: "Changes Requested", count: changesRequestedCount, color: "#f59e0b" },
          { label: "Approved / Ready", count: approvedCount, color: "#22c55e" },
          { label: "Creative Approval", count: creativePendingDrafts.length, color: "#a78bfa" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
          >
            <span className="text-[22px] font-bold" style={{ color: s.color, fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif" }}>
              {s.count}
            </span>
            <span className="text-[12px]" style={{ color: "var(--t-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Needs Action ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Bot size={13} className="text-[#0081f2]" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
            Needs Your Review
          </h3>
          {actionableDrafts.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#0081f2]/15 text-[#0081f2] border border-[#0081f2]/25 rounded-full">
              {actionableDrafts.length} actionable
            </span>
          )}
        </div>

        {actionableDrafts.length === 0 ? (
          <div className="rounded-xl p-10 flex flex-col items-center text-center" style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}>
              <Bot size={16} style={{ color: "var(--t-dim)" }} />
            </div>
            <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>
              No approvals waiting for review
            </div>
            <p className="text-[12px] mb-4" style={{ color: "var(--t-muted)" }}>
              Generate a campaign with Veronica and submit it for approval to see it here.
            </p>
            <Link
              href="/ai-agent"
              className="flex items-center gap-2 px-4 py-2 vc-blue-gradient text-white text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Bot size={13} />
              Open Veronica
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {actionableDrafts.map((draft) => (
              <DraftCard key={draft.id} draft={draft} onUpdate={updateStatus} canApprove={canApprove} canMarkReady={canMarkReady} />
            ))}
          </div>
        )}
      </section>

      {/* ── Approved — Pending Meta Launch ── */}
      {approvedDrafts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={13} className="text-[#22c55e]" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
              Approved — Pending Meta Launch
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/25 rounded-full">
              {approvedDrafts.length} approved
            </span>
          </div>
          <div className="space-y-3">
            {approvedDrafts.map((draft) => (
              <DraftCard key={draft.id} draft={draft} onUpdate={updateStatus} canApprove={canApprove} canMarkReady={canMarkReady} />
            ))}
          </div>
        </section>
      )}

      {/* ── History (collapsed by default) ── */}
      {historyDrafts.length > 0 && (
        <section className="mb-8">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 mb-3 text-left w-full group"
          >
            <span className="text-[11px] font-bold text-[#3d4f6e] uppercase tracking-widest">
              History
            </span>
            <span className="text-[10px] text-[#3d4f6e] bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.12)] px-2 py-0.5 rounded-full">
              {historyDrafts.length} completed
            </span>
            <span className="text-[10px] text-[#3d4f6e] ml-auto group-hover:text-[#6b7a99] transition-colors">
              {showHistory ? "Hide ↑" : "Show ↓"}
            </span>
          </button>
          {showHistory && (
            <div className="space-y-3">
              {historyDrafts.map((draft) => (
                <DraftCard key={draft.id} draft={draft} onUpdate={updateStatus} canApprove={canApprove} canMarkReady={canMarkReady} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Creative Approval Requests ── */}
      {creativePendingDrafts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Film size={13} className="text-[#a78bfa]" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
              Creative Approval Requests
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/25 rounded-full">
              {creativePendingDrafts.length} pending
            </span>
          </div>
          <div className="flex items-start gap-2.5 px-4 py-3 bg-[#a78bfa]/5 border border-[#a78bfa]/15 rounded-xl mb-3">
            <AlertCircle size={13} className="text-[#a78bfa] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#6b7a99] leading-snug">
              <span className="text-[#a78bfa] font-semibold">Creative Review: </span>
              These campaigns use creative assets that have not yet been approved for Meta ads. Review and approve each creative before the campaign can launch.
            </p>
          </div>
          <div className="space-y-3">
            {creativePendingDrafts.map((draft) => (
              <CreativeApprovalCard key={`creative-${draft.id}`} draft={draft} />
            ))}
          </div>
        </section>
      )}

      {/* ── Veronica Drafts ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Archive size={13} className="text-[#c9a84c]" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
            Veronica Drafts
          </h3>
          {veronicaNeedsReviewCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/25 rounded-full">
              {veronicaNeedsReviewCount} needs review
            </span>
          )}
        </div>

        {/* Safety notice */}
        <div className="flex items-start gap-2.5 px-4 py-3 bg-[#c9a84c]/5 border border-[#c9a84c]/15 rounded-xl mb-3">
          <ShieldCheck size={13} className="text-[#c9a84c] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] leading-snug" style={{ color: "var(--t-muted)" }}>
            <span className="text-[#c9a84c] font-semibold">Approval-gated: </span>
            These are internal drafts saved from Veronica. Marking a draft approved does not send, publish, or activate anything externally. Human sign-off required before any content is used.
          </p>
        </div>

        {/* Needs review + changes requested */}
        {veronicaNeedsReview.length > 0 && (
          <div className="space-y-3 mb-4">
            {veronicaNeedsReview.map((draft) => (
              <VeronicaDraftCard
                key={draft.id}
                draft={draft}
                canApprove={canApprove}
                onStatusChange={handleVeronicaStatusChange}
                feedback={draftFeedback[draft.id]}
              />
            ))}
          </div>
        )}

        {/* Approved Veronica drafts */}
        {veronicaApproved.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={11} className="text-[#22c55e]" />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
                Approved
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 rounded-full">
                {veronicaApproved.length}
              </span>
            </div>
            <div className="space-y-3">
              {veronicaApproved.map((draft) => (
                <VeronicaDraftCard
                  key={draft.id}
                  draft={draft}
                  canApprove={canApprove}
                  onStatusChange={handleVeronicaStatusChange}
                  feedback={draftFeedback[draft.id]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Archived toggle */}
        {veronicaArchived.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="flex items-center gap-2 text-left group mb-2"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
                Archived
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ color: "var(--t-dim)", backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}
              >
                {veronicaArchived.length}
              </span>
              <span className="text-[10px] ml-1 group-hover:opacity-80" style={{ color: "var(--t-dim)" }}>
                {showArchived ? "Hide ↑" : "Show ↓"}
              </span>
            </button>
            {showArchived && (
              <div className="space-y-3">
                {veronicaArchived.map((draft) => (
                  <VeronicaDraftCard
                    key={draft.id}
                    draft={draft}
                    canApprove={canApprove}
                    onStatusChange={handleVeronicaStatusChange}
                    feedback={draftFeedback[draft.id]}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {veronicaDrafts.length === 0 && (
          <div
            className="rounded-xl p-10 flex flex-col items-center text-center"
            style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}
            >
              <Archive size={16} style={{ color: "var(--t-dim)" }} />
            </div>
            <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>
              No Veronica drafts saved yet
            </div>
            <p className="text-[12px] mb-4" style={{ color: "var(--t-muted)" }}>
              Ask Veronica a question and use &ldquo;Save Draft&rdquo; to create an approval-ready blueprint.
            </p>
            <Link
              href="/ai-agent"
              className="flex items-center gap-2 px-4 py-2 vc-blue-gradient text-white text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Bot size={13} />
              Open Veronica
            </Link>
          </div>
        )}
      </section>

    </div>
  );
}
