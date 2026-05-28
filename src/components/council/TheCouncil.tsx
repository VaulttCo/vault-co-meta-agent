"use client";

import { useState } from "react";
import {
  Crown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronRight,
  Copy,
  Send,
  ClipboardList,
  Sparkles,
  ShieldCheck,
  Eye,
  TrendingUp,
  BarChart2,
  Users,
  MessageSquare,
  Settings2,
  FileText,
  Target,
} from "lucide-react";
import type { Client } from "@/lib/data";
import type { CampaignDraft } from "@/lib/planStore";
import type { CreativeAsset } from "@/lib/creativeAssets";
import type { StoredAssetAnalysis } from "@/lib/agents/creativeAnalysis";
import { buildCouncilPrompt } from "@/lib/council/buildCouncilPrompt";
import type { CouncilMode, CouncilResponse } from "@/lib/council/types";

// ─── Mode config ──────────────────────────────────────────────────────────────

const COUNCIL_MODES: Array<{
  id: CouncilMode;
  label: string;
  short: string;
  color: string;
  icon: React.ElementType;
  description: string;
}> = [
  {
    id: "campaign_build",
    label: "Council Campaign Build",
    short: "Full Build",
    color: "#c9a84c",
    icon: Crown,
    description: "Full council debate. Pressure-test and rebuild the campaign.",
  },
  {
    id: "improve_and_apply_draft",
    label: "Improve & Apply Draft",
    short: "Improve",
    color: "#0081f2",
    icon: Sparkles,
    description: "Council improves every section. Apply the improved draft to the builder.",
  },
  {
    id: "campaign_qa",
    label: "Council QA",
    short: "QA",
    color: "#f59e0b",
    icon: ShieldCheck,
    description: "Full pre-launch QA audit from all advisors.",
  },
  {
    id: "creative_review",
    label: "Council Creative Review",
    short: "Creative",
    color: "#a78bfa",
    icon: Eye,
    description: "Creative assets reviewed by all council advisors.",
  },
  {
    id: "meta_push_readiness",
    label: "Meta Push Readiness",
    short: "Meta",
    color: "#ef4444",
    icon: TrendingUp,
    description: "Council checks Meta launch readiness. Returns PAUSED payload draft.",
  },
  {
    id: "offer_review",
    label: "Council Offer Review",
    short: "Offer",
    color: "#22c55e",
    icon: Target,
    description: "Council pressure-tests the offer, value prop, and conversion framing.",
  },
  {
    id: "funnel_review",
    label: "Council Funnel Review",
    short: "Funnel",
    color: "#0081f2",
    icon: BarChart2,
    description: "Council audits the full funnel from ad to appointment.",
  },
  {
    id: "strategy_review",
    label: "Council Strategy Review",
    short: "Strategy",
    color: "#c9a84c",
    icon: Settings2,
    description: "Council questions the entire campaign strategy from first principles.",
  },
];

// ─── Advisor config ───────────────────────────────────────────────────────────

const ADVISORS: Array<{
  key: keyof CouncilResponse["councilDebate"];
  label: string;
  badge: string;
  color: string;
  icon: React.ElementType;
}> = [
  { key: "fatalFlawAdvisor", label: "Fatal Flaw", badge: "Risk", color: "#ef4444", icon: AlertTriangle },
  { key: "rightProblemAdvisor", label: "Right Problem", badge: "Strategy", color: "#f59e0b", icon: Target },
  { key: "upsideAdvisor", label: "Upside", badge: "Opportunity", color: "#22c55e", icon: TrendingUp },
  { key: "normalPersonAdvisor", label: "Normal Person", badge: "Customer", color: "#0081f2", icon: Users },
  { key: "nextActionAdvisor", label: "Next Action", badge: "Execution", color: "#c9a84c", icon: ClipboardList },
  { key: "creativeDirectorAgent", label: "Creative Director", badge: "Creative", color: "#a78bfa", icon: Eye },
  { key: "mediaBuyerAgent", label: "Media Buyer", badge: "Media", color: "#0081f2", icon: BarChart2 },
  { key: "copyChiefAgent", label: "Copy Chief", badge: "Copy", color: "#ff8400", icon: MessageSquare },
  { key: "crmGhlAgent", label: "CRM / GHL", badge: "CRM", color: "#22c55e", icon: Zap },
  { key: "complianceRiskAgent", label: "Compliance", badge: "Compliance", color: "#ef4444", icon: ShieldCheck },
  { key: "localMarketAgent", label: "Local Market", badge: "Market", color: "#f59e0b", icon: TrendingUp },
  { key: "chairman", label: "Chairman — Final Call", badge: "Chairman", color: "#c9a84c", icon: Crown },
];

const VERDICT_CONFIG = {
  ready: { label: "Ready to Launch", color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)" },
  revise: { label: "Revise Before Launch", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)" },
  rebuild: { label: "Rebuild Required", color: "#ff8400", bg: "rgba(255,132,0,0.08)", border: "rgba(255,132,0,0.25)" },
  reject: { label: "Reject — Wrong Direction", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)" },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface TheCouncilProps {
  selectedClient: Client | null;
  goal: string;
  service: string;
  market: string;
  budget: string;
  displayPlan: CampaignDraft | null;
  selectedAssets: CreativeAsset[];
  assetNotes: Record<string, string>;
  assetAnalyses: Record<string, StoredAssetAnalysis>;
  onApplyImprovedDraft: (council: CouncilResponse) => void;
  onAnalysesUpdated: (updates: Record<string, StoredAssetAnalysis>) => void;
}

export function TheCouncil({
  selectedClient,
  goal,
  service,
  market,
  budget,
  displayPlan,
  selectedAssets,
  assetNotes,
  assetAnalyses,
  onApplyImprovedDraft,
  onAnalysesUpdated,
}: TheCouncilProps) {
  const [councilMode, setCouncilMode] = useState<CouncilMode>("campaign_build");
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<"idle" | "success" | "error">("idle");
  const [councilResult, setCouncilResult] = useState<CouncilResponse | null>(null);
  const [rawOutput, setRawOutput] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parseError, setParseError] = useState(false);
  const [expandedAdvisors, setExpandedAdvisors] = useState<Set<string>>(new Set(["chairman"]));
  const [showImprovedDraft, setShowImprovedDraft] = useState(false);
  const [showAssetAnalysis, setShowAssetAnalysis] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [applied, setApplied] = useState(false);
  const [savedApproval, setSavedApproval] = useState(false);
  const [savedTask, setSavedTask] = useState(false);
  const [savedSkill, setSavedSkill] = useState(false);
  const [savingApproval, setSavingApproval] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingSkill, setSavingSkill] = useState(false);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [tasksCreated, setTasksCreated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoSkillCreated, setAutoSkillCreated] = useState(false);
  const [showModes, setShowModes] = useState(false);
  // Pre-analysis tracking
  const [preAnalysisPhase, setPreAnalysisPhase] = useState(false);
  const [analyzingAssetCount, setAnalyzingAssetCount] = useState(0);
  const [analyzedAssetCount, setAnalyzedAssetCount] = useState(0);
  const [analysisWarnings, setAnalysisWarnings] = useState<string[]>([]);

  const hasContext = !!(selectedClient && goal && service) || !!displayPlan;
  const activeMode = COUNCIL_MODES.find((m) => m.id === councilMode) ?? COUNCIL_MODES[0];

  // Runs /api/creatives/analyze for any selected assets that have no analysis yet.
  // Returns a map of freshly fetched analyses (id → StoredAssetAnalysis).
  // Gracefully continues on failure — returns partial results.
  async function runPreAnalysis(): Promise<Record<string, StoredAssetAnalysis>> {
    const missing = selectedAssets.filter((a) => !assetAnalyses[a.id]);
    if (missing.length === 0) return {};

    setPreAnalysisPhase(true);
    setAnalyzingAssetCount(missing.length);
    setAnalyzedAssetCount(0);
    setAnalysisWarnings([]);

    const fresh: Record<string, StoredAssetAnalysis> = {};
    const failedNames: string[] = [];

    // Process in batches of 5 (route allows up to 10; 5 is safe for timeout)
    const BATCH = 5;
    for (let i = 0; i < missing.length; i += BATCH) {
      const batch = missing.slice(i, i + BATCH);
      try {
        const res = await fetch("/api/creatives/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assets: batch.map((a) => ({
              id: a.id,
              assetType: a.assetType,
              service: service || String(a.assetType),
              market: market || undefined,
              notes: assetNotes[a.id] || a.notes || undefined,
              approvedForAds: a.approvedForAds,
              fileName: a.fileName,
              clientName: selectedClient?.name,
            })),
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          results?: Array<{ assetId: string; analysis: StoredAssetAnalysis }>;
        };
        for (const r of data.results ?? []) {
          if (r.assetId && r.analysis) fresh[r.assetId] = r.analysis;
        }
      } catch {
        for (const a of batch) failedNames.push(a.fileName ?? a.id);
      }
      setAnalyzedAssetCount((prev) => prev + batch.length);
    }

    if (failedNames.length > 0) setAnalysisWarnings(failedNames);

    // Notify parent so its assetAnalyses state stays in sync
    if (Object.keys(fresh).length > 0) onAnalysesUpdated(fresh);

    setPreAnalysisPhase(false);
    return fresh;
  }

  async function runCouncil() {
    if (running || !hasContext) return;

    setRunning(true);
    setRunStatus("idle");
    setCouncilResult(null);
    setRawOutput(null);
    setErrorMsg(null);
    setParseError(false);
    setApplied(false);
    setSavedApproval(false);
    setSavedTask(false);
    setSavedSkill(false);
    setTasksCreated(false);
    setAutoSkillCreated(false);
    setExpandedAdvisors(new Set(["chairman"]));
    setShowImprovedDraft(false);
    setShowSummary(false);
    setShowAssetAnalysis(false);
    setAnalysisWarnings([]);

    try {
      // Phase 1: analyze any assets that are missing a visual summary
      const freshAnalyses = await runPreAnalysis();

      // Merge fresh results with existing analyses for the prompt
      const mergedAnalyses: Record<string, StoredAssetAnalysis> = {
        ...assetAnalyses,
        ...freshAnalyses,
      };

      // Map to the shape buildCouncilPrompt expects
      const mappedAnalyses: Record<string, { visualSummary?: string; analysisSource?: string }> = {};
      for (const [id, a] of Object.entries(mergedAnalyses)) {
        mappedAnalyses[id] = {
          visualSummary: a.visual_summary,
          analysisSource: a.analysis_source,
        };
      }

      // Phase 2: build and send the council prompt
      const prompt = buildCouncilPrompt(
        {
          client: selectedClient
            ? {
                id: selectedClient.id,
                name: selectedClient.name,
                market: (selectedClient as { market?: string }).market,
                monthlyBudget: (selectedClient as { monthlyBudget?: string }).monthlyBudget,
                services: (selectedClient as { services?: string[] }).services,
              }
            : null,
          goal,
          service,
          market,
          budget,
          displayPlan,
          selectedAssets,
          assetNotes,
          assetAnalyses: mappedAnalyses,
        },
        councilMode
      );

      const res = await fetch("/api/veronica/hermes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setRunStatus("error");
        setErrorMsg(data.error ?? "Council run failed.");
      } else {
        const output = (data.output as string) ?? "";
        setRawOutput(output);
        setAutoSkillCreated(data.auto_skill_created === true);
        try {
          const clean = output.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
          const parsed = JSON.parse(clean) as CouncilResponse;
          setCouncilResult(parsed);
          setRunStatus("success");
          if (councilMode === "improve_and_apply_draft") setShowImprovedDraft(true);
        } catch {
          setParseError(true);
          setRunStatus("success");
        }
      }
    } catch {
      setRunStatus("error");
      setErrorMsg("Network error. Hermes is unreachable.");
    } finally {
      setRunning(false);
      setPreAnalysisPhase(false);
    }
  }

  async function sendToApprovals() {
    if (!rawOutput) return;
    setSavingApproval(true);
    try {
      const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const title = [
        `Council ${activeMode.short}`,
        selectedClient?.name,
        date,
      ]
        .filter(Boolean)
        .join(" — ");
      const res = await fetch("/api/veronica/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient?.id,
          draftType: "campaign_draft",
          title,
          content: rawOutput,
          agentsUsed: ["the_council", "hermes"],
          dataSources: [],
        }),
      });
      if (res.ok) setSavedApproval(true);
    } catch {
      // non-blocking
    } finally {
      setSavingApproval(false);
    }
  }

  async function saveAsTask() {
    if (!rawOutput) return;
    setSavingTask(true);
    try {
      const title = selectedClient
        ? `Council ${activeMode.short} — ${selectedClient.name}`
        : `Council ${activeMode.short}`;
      const res = await fetch("/api/operator-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient?.id,
          title,
          description: rawOutput,
          taskType: "campaign",
          priority: "high",
          source: "veronica",
          sourceAgent: "the_council",
        }),
      });
      if (res.ok) setSavedTask(true);
    } catch {
      // non-blocking
    } finally {
      setSavingTask(false);
    }
  }

  async function createOperatorTasks() {
    const tasks = councilResult?.nextOperatorTasks;
    if (!tasks?.length) return;
    setCreatingTasks(true);
    try {
      await Promise.allSettled(
        tasks.map((taskText, i) => {
          const title = taskText.slice(0, 70).trim() || `Council Task ${i + 1}`;
          return fetch("/api/operator-tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: selectedClient?.id,
              title: selectedClient ? `${title} — ${selectedClient.name}` : title,
              description: taskText,
              taskType: "campaign",
              priority: i === 0 ? "high" : "medium",
              source: "veronica",
              sourceAgent: "the_council",
            }),
          });
        })
      );
      setTasksCreated(true);
    } catch {
      // non-blocking
    } finally {
      setCreatingTasks(false);
    }
  }

  async function saveAsSkill() {
    if (!rawOutput) return;
    setSavingSkill(true);
    try {
      const res = await fetch("/api/veronica/hermes/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Council ${activeMode.short} — ${selectedClient?.name ?? service}`,
          category: "Campaign Framework",
          description: `Council output: ${activeMode.label}${selectedClient ? ` for ${selectedClient.name}` : ""}`,
          instructions: rawOutput,
        }),
      });
      if (res.ok) setSavedSkill(true);
    } catch {
      // non-blocking
    } finally {
      setSavingSkill(false);
    }
  }

  async function copyOutput() {
    if (!rawOutput) return;
    try {
      await navigator.clipboard.writeText(rawOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available in all contexts
    }
  }

  function handleApply() {
    if (!councilResult || !displayPlan) return;
    onApplyImprovedDraft(councilResult);
    setApplied(true);
  }

  function toggleAdvisor(key: string) {
    setExpandedAdvisors((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const scoreColor = (score: number) =>
    score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  if (!hasContext) return null;

  const verdict = councilResult?.finalVerdict;
  const verdictCfg = verdict ? VERDICT_CONFIG[verdict] : null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--t-surface)",
        border: "1px solid rgba(201,168,76,0.25)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "rgba(201,168,76,0.15)", background: "rgba(201,168,76,0.03)" }}
      >
        <Crown size={13} style={{ color: "#c9a84c" }} />
        <span className="text-[12px] font-semibold" style={{ color: "#c9a84c" }}>
          The Council
        </span>
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{
            color: "#c9a84c",
            backgroundColor: "rgba(201,168,76,0.1)",
            border: "1px solid rgba(201,168,76,0.2)",
          }}
        >
          Strategy Room
        </span>

        {/* Context badges */}
        <div className="ml-auto flex items-center gap-1 flex-wrap">
          {selectedClient && (
            <span
              className="text-[9px] px-2 py-0.5 rounded-full"
              style={{ color: "#0081f2", backgroundColor: "rgba(0,129,242,0.1)", border: "1px solid rgba(0,129,242,0.18)" }}
            >
              {selectedClient.name}
            </span>
          )}
          {displayPlan && (
            <span
              className="text-[9px] px-2 py-0.5 rounded-full"
              style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}
            >
              Draft active
            </span>
          )}
          {selectedAssets.length > 0 && (
            <span
              className="text-[9px] px-2 py-0.5 rounded-full"
              style={{ color: "#a78bfa", backgroundColor: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.15)" }}
            >
              {selectedAssets.length} asset{selectedAssets.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* ── Mode Selector ── */}
        <div>
          <button
            onClick={() => setShowModes((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors"
            style={{
              backgroundColor: `${activeMode.color}10`,
              border: `1px solid ${activeMode.color}30`,
            }}
          >
            <div className="flex items-center gap-2">
              <activeMode.icon size={11} style={{ color: activeMode.color }} />
              <span className="text-[11px] font-semibold" style={{ color: activeMode.color }}>
                {activeMode.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]" style={{ color: "var(--t-dim)" }}>Change mode</span>
              <ChevronDown
                size={10}
                style={{
                  color: "var(--t-dim)",
                  transform: showModes ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s",
                }}
              />
            </div>
          </button>

          {showModes && (
            <div
              className="mt-1.5 rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--t-border)", backgroundColor: "var(--t-surface-2)" }}
            >
              {COUNCIL_MODES.map((mode) => {
                const ModeIcon = mode.icon;
                const isActive = mode.id === councilMode;
                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setCouncilMode(mode.id);
                      setShowModes(false);
                    }}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--t-surface)]"
                    style={{
                      backgroundColor: isActive ? `${mode.color}10` : undefined,
                      borderBottom: "1px solid var(--t-border)",
                    }}
                  >
                    <ModeIcon size={11} style={{ color: mode.color, marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div
                        className="text-[11px] font-semibold leading-tight"
                        style={{ color: isActive ? mode.color : "var(--t-text)" }}
                      >
                        {mode.label}
                      </div>
                      <div className="text-[10px] leading-snug mt-0.5" style={{ color: "var(--t-muted)" }}>
                        {mode.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Convene Button ── */}
        <button
          onClick={runCouncil}
          disabled={running || !hasContext}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-bold transition-opacity disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#c9a84c,#a07830)", color: "#0d0e12" }}
        >
          {running ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              {preAnalysisPhase
                ? `Analyzing assets… (${analyzedAssetCount}/${analyzingAssetCount})`
                : "Council deliberating…"}
            </>
          ) : (
            <>
              <Crown size={12} />
              Convene Council — {activeMode.short}
            </>
          )}
        </button>

        {/* ── Running indicator ── */}
        {running && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
            style={{ backgroundColor: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", color: "#c9a84c" }}
          >
            <Loader2 size={10} className="animate-spin" />
            {preAnalysisPhase
              ? `Analyzing creative assets… ${analyzedAssetCount}/${analyzingAssetCount} complete`
              : `The Council is deliberating on ${activeMode.label.toLowerCase()}…`}
          </div>
        )}

        {/* ── Analysis warnings (metadata fallback notice) ── */}
        {!running && analysisWarnings.length > 0 && (
          <div
            className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg text-[10px]"
            style={{ backgroundColor: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}
          >
            <AlertTriangle size={9} className="flex-shrink-0 mt-0.5" />
            <span>
              Some assets used metadata fallback because visual analysis failed:{" "}
              {analysisWarnings.join(", ")}
            </span>
          </div>
        )}

        {/* ── Error ── */}
        {runStatus === "error" && errorMsg && (
          <div
            className="flex items-start gap-2 px-3 py-2 rounded-lg text-[11px]"
            style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
          >
            <AlertCircle size={10} className="flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── Results ── */}
        {runStatus === "success" && (councilResult || parseError) && (
          <div className="space-y-3">
            {/* Parse error fallback */}
            {parseError && (
              <div className="space-y-2">
                <div
                  className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded"
                  style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}
                >
                  <AlertTriangle size={9} />
                  Hermes returned non-structured output. Showing raw response.
                </div>
                <pre
                  className="text-[11px] leading-relaxed whitespace-pre-wrap break-words overflow-auto rounded-lg p-3"
                  style={{ color: "var(--t-muted)", backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)", maxHeight: "300px" }}
                >
                  {rawOutput}
                </pre>
              </div>
            )}

            {councilResult && (
              <>
                {/* Verdict Banner */}
                {verdictCfg && (
                  <div
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                    style={{ backgroundColor: verdictCfg.bg, border: `1px solid ${verdictCfg.border}` }}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} style={{ color: verdictCfg.color }} />
                      <span className="text-[12px] font-bold" style={{ color: verdictCfg.color }}>
                        {verdictCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: "var(--t-dim)" }}>Approval Score</span>
                      <span
                        className="text-[13px] font-bold"
                        style={{ color: scoreColor(councilResult.approvalReadinessScore ?? 0) }}
                      >
                        {councilResult.approvalReadinessScore ?? 0}
                        <span className="text-[10px] font-normal ml-0.5">/100</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Winning Angle */}
                {councilResult.winningAngle && (
                  <div
                    className="px-3 py-2.5 rounded-lg"
                    style={{ backgroundColor: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#c9a84c" }}>
                      Winning Angle
                    </div>
                    <p className="text-[12px] font-medium leading-snug" style={{ color: "var(--t-text)" }}>
                      {councilResult.winningAngle}
                    </p>
                  </div>
                )}

                {/* Chairman — always expanded, always prominent */}
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: "1px solid rgba(201,168,76,0.35)" }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2"
                    style={{ backgroundColor: "rgba(201,168,76,0.1)", borderBottom: "1px solid rgba(201,168,76,0.2)" }}
                  >
                    <Crown size={11} style={{ color: "#c9a84c" }} />
                    <span className="text-[11px] font-bold" style={{ color: "#c9a84c" }}>
                      Chairman — Final Call
                    </span>
                    <span
                      className="text-[8px] px-1.5 py-0.5 rounded-full ml-auto"
                      style={{ color: "#c9a84c", backgroundColor: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)" }}
                    >
                      Chairman
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: "var(--t-text)" }}>
                      {councilResult.councilDebate.chairman}
                    </p>
                  </div>
                </div>

                {/* Advisor Cards — collapsible grid */}
                <div>
                  <div
                    className="text-[9px] font-bold uppercase tracking-wider mb-2 px-0.5"
                    style={{ color: "var(--t-dim)" }}
                  >
                    Council Debate
                  </div>
                  <div className="space-y-1.5">
                    {ADVISORS.filter((a) => a.key !== "chairman").map((advisor) => {
                      const text = councilResult.councilDebate[advisor.key];
                      if (!text) return null;
                      const isExpanded = expandedAdvisors.has(advisor.key);
                      const AdvisorIcon = advisor.icon;
                      return (
                        <div
                          key={advisor.key}
                          className="rounded-lg overflow-hidden"
                          style={{ border: "1px solid var(--t-border)" }}
                        >
                          <button
                            onClick={() => toggleAdvisor(advisor.key)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--t-surface-2)]"
                          >
                            <AdvisorIcon size={10} style={{ color: advisor.color, flexShrink: 0 }} />
                            <span className="text-[11px] font-semibold flex-1 text-left" style={{ color: "var(--t-text)" }}>
                              {advisor.label}
                            </span>
                            <span
                              className="text-[8px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ color: advisor.color, backgroundColor: `${advisor.color}12`, border: `1px solid ${advisor.color}25` }}
                            >
                              {advisor.badge}
                            </span>
                            {isExpanded ? (
                              <ChevronDown size={9} style={{ color: "var(--t-dim)", flexShrink: 0 }} />
                            ) : (
                              <ChevronRight size={9} style={{ color: "var(--t-dim)", flexShrink: 0 }} />
                            )}
                          </button>
                          {isExpanded && (
                            <div
                              className="px-3 pb-3 pt-1"
                              style={{ borderTop: "1px solid var(--t-border)", backgroundColor: "var(--t-surface-2)" }}
                            >
                              <p className="text-[11px] leading-relaxed whitespace-pre-line" style={{ color: "var(--t-muted)" }}>
                                {text}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Council Summary — collapsible */}
                {councilResult.councilSummary && (
                  <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
                    <button
                      onClick={() => setShowSummary((v) => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--t-surface-2)] transition-colors"
                    >
                      <FileText size={10} style={{ color: "#0081f2" }} />
                      <span className="text-[11px] font-semibold flex-1" style={{ color: "var(--t-text)" }}>Council Summary</span>
                      {showSummary ? (
                        <ChevronDown size={9} style={{ color: "var(--t-dim)" }} />
                      ) : (
                        <ChevronRight size={9} style={{ color: "var(--t-dim)" }} />
                      )}
                    </button>
                    {showSummary && (
                      <div
                        className="px-3 pb-3 space-y-2"
                        style={{ borderTop: "1px solid var(--t-border)", backgroundColor: "var(--t-surface-2)" }}
                      >
                        {Object.entries(councilResult.councilSummary).map(([key, value]) => {
                          if (!value) return null;
                          const label = key
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (c) => c.toUpperCase())
                            .replace("Crm", "CRM");
                          return (
                            <div key={key} className="pt-2">
                              <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--t-dim)" }}>
                                {label}
                              </div>
                              <p className="text-[11px] leading-snug" style={{ color: "var(--t-muted)" }}>{value}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Asset Analysis — collapsible */}
                {(councilResult.assetAnalysis?.photos?.length > 0 || councilResult.assetAnalysis?.videos?.length > 0) && (
                  <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(167,139,250,0.3)" }}>
                    <button
                      onClick={() => setShowAssetAnalysis((v) => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--t-surface-2)]"
                    >
                      <Eye size={10} style={{ color: "#a78bfa" }} />
                      <span className="text-[11px] font-semibold flex-1" style={{ color: "var(--t-text)" }}>Asset Analysis</span>
                      <span
                        className="text-[8px] px-1.5 py-0.5 rounded-full"
                        style={{ color: "#a78bfa", backgroundColor: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}
                      >
                        {(councilResult.assetAnalysis.photos?.length ?? 0) + (councilResult.assetAnalysis.videos?.length ?? 0)} assets
                      </span>
                      {showAssetAnalysis ? (
                        <ChevronDown size={9} style={{ color: "var(--t-dim)" }} />
                      ) : (
                        <ChevronRight size={9} style={{ color: "var(--t-dim)" }} />
                      )}
                    </button>
                    {showAssetAnalysis && (
                      <div
                        className="px-3 pb-3 space-y-3"
                        style={{ borderTop: "1px solid rgba(167,139,250,0.2)", backgroundColor: "var(--t-surface-2)" }}
                      >
                        {councilResult.assetAnalysis.photos?.map((photo, i) => (
                          <div key={i} className="pt-2 space-y-1.5">
                            <div className="text-[10px] font-bold" style={{ color: "#a78bfa" }}>{photo.assetName}</div>
                            {[
                              { label: "What is Visible", value: photo.whatIsVisible },
                              { label: "Best Use", value: photo.bestUse?.replace(/_/g, " ") },
                              { label: "Hook", value: photo.recommendedHook },
                              { label: "Primary Text", value: photo.recommendedPrimaryText },
                              { label: "Headline", value: photo.recommendedHeadline },
                              { label: "CTA", value: photo.recommendedCTA },
                            ].map(({ label, value }) =>
                              value ? (
                                <div key={label} className="px-2 py-1.5 rounded" style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                                  <div className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--t-dim)" }}>{label}</div>
                                  <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>{value}</p>
                                </div>
                              ) : null
                            )}
                            {photo.warnings?.length > 0 && (
                              <div className="space-y-1">
                                {photo.warnings.map((w, wi) => (
                                  <div key={wi} className="flex items-start gap-1.5 px-2 py-1" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 6 }}>
                                    <AlertTriangle size={9} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
                                    <span className="text-[10px]" style={{ color: "#ef4444" }}>{w}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {councilResult.assetAnalysis.videos?.map((video, i) => (
                          <div key={i} className="pt-2 space-y-1.5">
                            <div className="text-[10px] font-bold" style={{ color: "#a78bfa" }}>{video.assetName} (Video)</div>
                            {[
                              { label: "Opening Hook", value: video.openingHook },
                              { label: "First 3 Seconds", value: video.firstThreeSeconds },
                              { label: "Primary Text", value: video.recommendedPrimaryText },
                              { label: "Caption", value: video.recommendedCaption },
                              { label: "Best Use", value: video.bestUse?.replace(/_/g, " ") },
                            ].map(({ label, value }) =>
                              value ? (
                                <div key={label} className="px-2 py-1.5 rounded" style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                                  <div className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--t-dim)" }}>{label}</div>
                                  <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>{value}</p>
                                </div>
                              ) : null
                            )}
                            {video.recommendedCutdowns?.length > 0 && (
                              <div className="px-2 py-1.5 rounded" style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                                <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--t-dim)" }}>Recommended Cutdowns</div>
                                {video.recommendedCutdowns.map((cut, ci) => (
                                  <p key={ci} className="text-[10px]" style={{ color: "var(--t-muted)" }}>• {cut}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Improved Draft Preview — collapsible */}
                {councilResult.improvedDraft && (
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: "1px solid rgba(0,129,242,0.35)" }}
                  >
                    <button
                      onClick={() => setShowImprovedDraft((v) => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--t-surface-2)]"
                    >
                      <Sparkles size={10} style={{ color: "#0081f2" }} />
                      <span className="text-[11px] font-semibold flex-1" style={{ color: "var(--t-text)" }}>
                        Improved Draft Preview
                      </span>
                      {showImprovedDraft ? (
                        <ChevronDown size={9} style={{ color: "#0081f2" }} />
                      ) : (
                        <ChevronRight size={9} style={{ color: "#0081f2" }} />
                      )}
                    </button>
                    {showImprovedDraft && (
                      <div
                        className="p-3 space-y-2"
                        style={{ borderTop: "1px solid rgba(0,129,242,0.2)", backgroundColor: "var(--t-surface-2)" }}
                      >
                        {Object.entries(councilResult.improvedDraft).map(([key, value]) => {
                          if (!value) return null;
                          const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
                          return (
                            <div
                              key={key}
                              className="p-2.5 rounded-lg"
                              style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
                            >
                              <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#0081f2" }}>
                                {label}
                              </div>
                              <p className="text-[11px] leading-snug whitespace-pre-line" style={{ color: "var(--t-muted)" }}>
                                {value}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Changes Made */}
                {councilResult.changesMade?.length > 0 && (
                  <div
                    className="px-3 py-2.5 rounded-lg"
                    style={{ backgroundColor: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#22c55e" }}>
                      Changes Made
                    </div>
                    <div className="space-y-1">
                      {councilResult.changesMade.map((change, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 size={9} style={{ color: "#22c55e", flexShrink: 0, marginTop: 2 }} />
                          <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>{change}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Assets */}
                {councilResult.missingAssets?.length > 0 && (
                  <div
                    className="px-3 py-2.5 rounded-lg"
                    style={{ backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#f59e0b" }}>
                      Missing Assets
                    </div>
                    <div className="space-y-1">
                      {councilResult.missingAssets.map((asset, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <AlertTriangle size={9} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
                          <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>{asset}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Operator Tasks */}
                {councilResult.nextOperatorTasks?.length > 0 && (
                  <div
                    className="px-3 py-2.5 rounded-lg"
                    style={{ backgroundColor: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.15)" }}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#a78bfa" }}>
                      Next Operator Tasks
                    </div>
                    <div className="space-y-1">
                      {councilResult.nextOperatorTasks.map((task, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-[9px] font-bold w-3.5 flex-shrink-0 mt-0.5" style={{ color: "#a78bfa" }}>
                            {i + 1}.
                          </span>
                          <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Action Buttons ── */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {/* Apply Improved Draft */}
                  {councilResult.improvedDraft && displayPlan && (
                    applied ? (
                      <span
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border"
                        style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.3)", backgroundColor: "rgba(34,197,94,0.07)" }}
                      >
                        <CheckCircle2 size={9} />
                        Applied to Campaign Draft
                      </span>
                    ) : (
                      <button
                        onClick={handleApply}
                        className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded border font-semibold transition-opacity"
                        style={{ color: "#0081f2", borderColor: "rgba(0,129,242,0.4)", backgroundColor: "rgba(0,129,242,0.08)" }}
                      >
                        <Sparkles size={9} />
                        Apply to Campaign Draft
                      </button>
                    )
                  )}

                  {/* Send to Approvals */}
                  {savedApproval ? (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: "#22c55e" }}>
                      <CheckCircle2 size={9} />Sent
                      <a href="/approvals" className="hover:underline" style={{ color: "#a78bfa" }}>View →</a>
                    </span>
                  ) : (
                    <button
                      disabled={savingApproval}
                      onClick={sendToApprovals}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-opacity disabled:opacity-50"
                      style={{ color: "#a78bfa", borderColor: "rgba(167,139,250,0.25)", backgroundColor: "rgba(167,139,250,0.06)" }}
                    >
                      {savingApproval ? <Loader2 size={9} className="animate-spin" /> : <Send size={9} />}
                      Approvals
                    </button>
                  )}

                  {/* Save as Task */}
                  {savedTask ? (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: "#22c55e" }}>
                      <CheckCircle2 size={9} />Saved
                    </span>
                  ) : (
                    <button
                      disabled={savingTask}
                      onClick={saveAsTask}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-opacity disabled:opacity-50"
                      style={{ color: "#c9a84c", borderColor: "rgba(201,168,76,0.25)", backgroundColor: "rgba(201,168,76,0.06)" }}
                    >
                      {savingTask ? <Loader2 size={9} className="animate-spin" /> : <ClipboardList size={9} />}
                      Save as Task
                    </button>
                  )}

                  {/* Create Operator Tasks from nextOperatorTasks */}
                  {councilResult.nextOperatorTasks?.length > 0 && (
                    tasksCreated ? (
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: "#22c55e" }}>
                        <CheckCircle2 size={9} />
                        {councilResult.nextOperatorTasks.length} tasks created
                      </span>
                    ) : (
                      <button
                        disabled={creatingTasks}
                        onClick={createOperatorTasks}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-opacity disabled:opacity-50"
                        style={{ color: "#a78bfa", borderColor: "rgba(167,139,250,0.25)", backgroundColor: "rgba(167,139,250,0.06)" }}
                      >
                        {creatingTasks ? <Loader2 size={9} className="animate-spin" /> : <ClipboardList size={9} />}
                        Create {councilResult.nextOperatorTasks.length} Tasks
                      </button>
                    )
                  )}

                  {/* Copy */}
                  <button
                    onClick={copyOutput}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-opacity"
                    style={{
                      color: copied ? "#22c55e" : "var(--t-muted)",
                      borderColor: copied ? "rgba(34,197,94,0.3)" : "var(--t-border)",
                      backgroundColor: "var(--t-surface-2)",
                    }}
                  >
                    {copied ? <CheckCircle2 size={9} /> : <Copy size={9} />}
                    {copied ? "Copied" : "Copy"}
                  </button>

                  {/* Save as Skill */}
                  {savedSkill || autoSkillCreated ? (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: "#c9a84c" }}>
                      <Zap size={9} />
                      {autoSkillCreated ? "Skill auto-saved" : "Skill saved"}
                    </span>
                  ) : (
                    <button
                      disabled={savingSkill}
                      onClick={saveAsSkill}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-opacity disabled:opacity-50"
                      style={{ color: "#c9a84c", borderColor: "rgba(201,168,76,0.2)", backgroundColor: "rgba(201,168,76,0.05)" }}
                    >
                      {savingSkill ? <Loader2 size={9} className="animate-spin" /> : <Zap size={9} />}
                      Save as Skill
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Safety note ── */}
        <div
          className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg"
          style={{ backgroundColor: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.1)" }}
        >
          <ShieldCheck size={9} className="flex-shrink-0 mt-0.5" style={{ color: "#c9a84c" }} />
          <p className="text-[9px] leading-snug" style={{ color: "var(--t-dim)" }}>
            Hermes and The Council can improve, restructure, QA, and package campaign drafts inside Veronica. They cannot publish, launch, activate, change budgets, send emails, push GHL workflows, or push to Meta without approval.
          </p>
        </div>
      </div>
    </div>
  );
}
