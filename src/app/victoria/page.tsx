"use client";
// Victoria AI Sales Coach — Live Call Interface
// The primary interface for real-time sales coaching.
// Replaces the Coming Soon placeholder.

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Mic, MicOff, PhoneCall, PhoneOff, AlertTriangle,
  ChevronRight, Activity, Target, MessageSquare, Zap,
  Radio, User, Users, Clock, BarChart2, RefreshCw,
  BookOpen, UserCircle, Plus, Trash2, Search, ChevronDown, ChevronUp,
  FileText, Loader,
} from "lucide-react";
import { useVictoriaTranscription } from "@/lib/victoria/transcription/useVictoriaTranscription";
import type { CoachingCard, LiveCallSession, ContractorVertical, DealRiskOutput, EmotionalOutput, EmotionalState } from "@/lib/victoria/types";
import { KB_DOMAINS } from "@/lib/victoria/types";
import type { KBSearchResult, VictoriaProspectRow, PreCallBriefing } from "@/lib/victoria/types";

type PageMode = "live_call" | "knowledge_base" | "prospects";

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function PriorityDot({ priority }: { priority: CoachingCard["priority"] }) {
  const colors = {
    critical: "#ef4444",
    high: "#f59e0b",
    normal: "#3b82f6",
    background: "#6b7280",
  };
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: colors[priority] }}
    />
  );
}

function CoachingTypeIcon({ type }: { type: CoachingCard["coaching_type"] }) {
  const icons: Record<CoachingCard["coaching_type"], React.ReactNode> = {
    next_question: <MessageSquare size={13} />,
    probe_deeper: <ChevronRight size={13} />,
    reframe_objection: <RefreshCw size={13} />,
    shut_up_listen: <MicOff size={13} />,
    buying_signal_detected: <Zap size={13} />,
    danger_warning: <AlertTriangle size={13} />,
    positioning_angle: <Target size={13} />,
    close_attempt: <Activity size={13} />,
    rep_warning: <AlertTriangle size={13} />,
    phase_transition: <Radio size={13} />,
  };
  return <span className="opacity-70">{icons[type] ?? <MessageSquare size={13} />}</span>;
}

function CoachingCardDisplay({ card }: { card: CoachingCard }) {
  const borderColors = {
    critical: "rgba(239,68,68,0.5)",
    high: "rgba(245,158,11,0.4)",
    normal: "rgba(59,130,246,0.3)",
    background: "rgba(107,114,128,0.2)",
  };
  const bgColors = {
    critical: "rgba(239,68,68,0.06)",
    high: "rgba(245,158,11,0.05)",
    normal: "rgba(59,130,246,0.04)",
    background: "rgba(107,114,128,0.03)",
  };

  return (
    <div
      className="rounded-xl p-5 space-y-3"
      style={{
        border: `1px solid ${borderColors[card.priority]}`,
        backgroundColor: bgColors[card.priority],
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <PriorityDot priority={card.priority} />
        <CoachingTypeIcon type={card.coaching_type} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>
          {card.coaching_type.replace(/_/g, " ")}
        </span>
        <span className="ml-auto text-[10px]" style={{ color: "var(--t-dim)" }}>
          {Math.round(card.confidence * 100)}% confidence
        </span>
      </div>

      {/* Headline */}
      <p
        className="text-[16px] font-bold leading-snug"
        style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
      >
        {card.headline}
      </p>

      {/* Primary Action */}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>What to do</p>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-text)" }}>
          {card.primary_action}
        </p>
      </div>

      {/* Why */}
      {card.why && (
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
          {card.why}
        </p>
      )}

      {/* Suggested Language */}
      {card.suggested_language && (
        <div
          className="px-4 py-3 rounded-lg"
          style={{ backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#c9a84c" }}>
            Say this
          </p>
          <p className="text-[13px] italic leading-relaxed" style={{ color: "var(--t-text)" }}>
            &ldquo;{card.suggested_language}&rdquo;
          </p>
        </div>
      )}

      {/* What Not To Do */}
      {card.what_not_to_do && (
        <div
          className="px-4 py-3 rounded-lg"
          style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#ef4444" }}>
            Do not
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-text)" }}>
            {card.what_not_to_do}
          </p>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {card.context_tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: "rgba(107,114,128,0.12)", color: "var(--t-muted)" }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>{label}</span>
        <span className="text-[11px] font-bold" style={{ color }}>{score}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Deal Risk Panel
// ─────────────────────────────────────────────────────────────

const RECOMMENDATION_LABELS: Record<string, { label: string; color: string }> = {
  continue_discovery:  { label: "Keep Discovering",   color: "#3b82f6" },
  deepen_pain:         { label: "Deepen the Pain",     color: "#f59e0b" },
  address_objection:   { label: "Handle Objection",   color: "#f59e0b" },
  position_now:        { label: "Position Vault Co",   color: "#22c55e" },
  attempt_close:       { label: "Ask for the Close",   color: "#a78bfa" },
  schedule_followup:   { label: "Schedule Follow-up",  color: "#6b7280" },
  rescue_call:         { label: "RESCUE CALL",         color: "#ef4444" },
};

function DealRiskPanel({ data }: { data: DealRiskOutput }) {
  const rec = RECOMMENDATION_LABELS[data.recommendation] ?? { label: data.recommendation, color: "#6b7280" };
  const b = data.scoring_breakdown;

  return (
    <div className="space-y-3">
      {/* Overall score */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: data.overall_score >= 70 ? "rgba(167,139,250,0.12)" : data.overall_score >= 45 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${data.overall_score >= 70 ? "rgba(167,139,250,0.3)" : data.overall_score >= 45 ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`,
          }}
        >
          <span
            className="text-[16px] font-black tabular-nums leading-none"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: data.overall_score >= 70 ? "#a78bfa" : data.overall_score >= 45 ? "#f59e0b" : "#ef4444" }}
          >
            {data.overall_score}
          </span>
          <span className="text-[8px] uppercase tracking-wide" style={{ color: "var(--t-dim)" }}>/ 100</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--t-muted)" }}>
            Recommendation
          </p>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${rec.color}18`, color: rec.color, border: `1px solid ${rec.color}40` }}
          >
            {rec.label}
          </span>
        </div>
      </div>

      {/* Dimension bars */}
      <div className="space-y-1.5">
        {([
          ["Trust",       b.trust,        "#22c55e"],
          ["Pain Clarity", b.pain_clarity, "#f59e0b"],
          ["Urgency",     b.urgency,      "#3b82f6"],
          ["Authority",   b.authority,    "#a78bfa"],
          ["Budget Fit",  b.budget_fit,   "#06b6d4"],
          ["Engagement",  b.engagement,   "#ec4899"],
        ] as [string, { score: number; evidence: string }, string][]).map(([label, dim, color]) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px]" style={{ color: "var(--t-muted)" }}>{label}</span>
              <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{dim.score}</span>
            </div>
            <div className="h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
              <div className="h-1 rounded-full transition-all duration-700" style={{ width: `${dim.score}%`, backgroundColor: color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Biggest risk */}
      <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#ef4444" }}>Biggest Risk</p>
        <p className="text-[11px] leading-snug" style={{ color: "var(--t-text)" }}>{data.biggest_risk}</p>
      </div>

      {/* Tactical advice */}
      <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#c9a84c" }}>Do This Now</p>
        <p className="text-[11px] leading-snug" style={{ color: "var(--t-text)" }}>{data.rep_tactical_advice}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Emotional State Panel
// ─────────────────────────────────────────────────────────────

const EMOTIONAL_META: Record<EmotionalState, { emoji: string; color: string; label: string }> = {
  open_engaged:  { emoji: "🟢", color: "#22c55e", label: "Open & Engaged" },
  hesitant:      { emoji: "🟡", color: "#f59e0b", label: "Hesitant" },
  skeptical:     { emoji: "🟠", color: "#f97316", label: "Skeptical" },
  frustrated:    { emoji: "🔴", color: "#ef4444", label: "Frustrated" },
  confused:      { emoji: "⚪", color: "#9ca3af", label: "Confused" },
  excited:       { emoji: "🟣", color: "#a78bfa", label: "Excited" },
  defensive:     { emoji: "🔴", color: "#ef4444", label: "Defensive" },
  hopeful:       { emoji: "🔵", color: "#3b82f6", label: "Hopeful" },
  resigned:      { emoji: "⚫", color: "#6b7280", label: "Resigned" },
  urgent:        { emoji: "🟣", color: "#a78bfa", label: "Urgent" },
};

function EmotionalPanel({ data }: { data: EmotionalOutput }) {
  const meta = EMOTIONAL_META[data.emotional_state] ?? { emoji: "⚪", color: "#6b7280", label: data.emotional_state };
  const directionArrow = data.direction === "improving" ? "↑" : data.direction === "declining" ? "↓" : "→";
  const directionColor = data.direction === "improving" ? "#22c55e" : data.direction === "declining" ? "#ef4444" : "#6b7280";

  return (
    <div className="space-y-2.5">
      {/* State header */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[18px]"
          style={{ backgroundColor: `${meta.color}12`, border: `1px solid ${meta.color}30` }}
        >
          {meta.emoji}
        </div>
        <div>
          <p className="text-[13px] font-bold" style={{ color: meta.color }}>{meta.label}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] capitalize" style={{ color: "var(--t-muted)" }}>{data.intensity} intensity</span>
            <span className="font-bold text-[11px]" style={{ color: directionColor }}>{directionArrow}</span>
            <span className="text-[10px]" style={{ color: directionColor }}>{data.direction}</span>
          </div>
        </div>
        {data.detected_shift && (
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
            SHIFTED
          </span>
        )}
      </div>

      {/* Alert */}
      {data.alert && (
        <div
          className="px-3 py-2 rounded-lg"
          style={{
            backgroundColor: data.alert.type === "shutdown" ? "rgba(239,68,68,0.08)" : "rgba(167,139,250,0.08)",
            border: `1px solid ${data.alert.type === "shutdown" ? "rgba(239,68,68,0.25)" : "rgba(167,139,250,0.25)"}`,
          }}
        >
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: data.alert.type === "shutdown" ? "#ef4444" : "#a78bfa" }}>
            {data.alert.urgency === "immediate" ? "⚡ Immediate" : "Soon"} — {data.alert.type.replace(/_/g, " ")}
          </p>
          <p className="text-[11px] leading-snug" style={{ color: "var(--t-text)" }}>{data.alert.action}</p>
        </div>
      )}

      {/* Signal evidence */}
      <p className="text-[10px] italic leading-snug" style={{ color: "var(--t-dim)" }}>
        {data.signal_evidence}
      </p>

      {/* Rep advice */}
      <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--t-border)" }}>
        <p className="text-[11px] leading-snug" style={{ color: "var(--t-muted)" }}>{data.rep_recommendation}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Knowledge Base View
// ─────────────────────────────────────────────────────────────

const VERTICALS = [
  { value: "roofing", label: "Roofing" },
  { value: "hvac", label: "HVAC" },
  { value: "remodeling", label: "Remodeling" },
  { value: "landscaping", label: "Landscaping" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "painting", label: "Painting" },
  { value: "general_contracting", label: "General Contracting" },
  { value: "home_services", label: "Home Services" },
  { value: "other", label: "Other" },
];

function KBView() {
  const [entries, setEntries] = useState<KBSearchResult[]>([]);
  const [domainFilter, setDomainFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    domain: "objection_handling",
    title: "",
    content: "",
    vertical_relevance: [] as string[],
  });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/victoria/kb${domainFilter ? `?domain=${domainFilter}` : ""}`;
      const res = await fetch(url);
      const data = await res.json() as { entries: KBSearchResult[] };
      setEntries(data.entries ?? []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [domainFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleAdd = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/victoria/kb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ domain: "objection_handling", title: "", content: "", vertical_relevance: [] });
        setShowForm(false);
        await fetchEntries();
      }
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/victoria/kb/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const toggleVertical = (v: string) => {
    setForm((f) => ({
      ...f,
      vertical_relevance: f.vertical_relevance.includes(v)
        ? f.vertical_relevance.filter((x) => x !== v)
        : [...f.vertical_relevance, v],
    }));
  };

  const inputStyle = {
    backgroundColor: "var(--t-surface-2)",
    border: "1px solid var(--t-border)",
    color: "var(--t-text)",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 py-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-[20px] font-bold"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
          >
            Knowledge Base
          </h2>
          <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>
            Vault Co sales intelligence — injected into Victoria&rsquo;s agents during calls
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold"
          style={{ backgroundColor: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}
        >
          <Plus size={13} /> Add Entry
        </button>
      </div>

      {/* Add entry form */}
      {showForm && (
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>New Knowledge Entry</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--t-muted)" }}>Domain *</label>
              <select
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
                style={inputStyle}
              >
                {KB_DOMAINS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--t-muted)" }}>Title *</label>
              <input
                type="text"
                placeholder="e.g. How to handle price objections"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--t-muted)" }}>Content *</label>
            <textarea
              rows={5}
              placeholder="Paste the knowledge content here..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-[12px] outline-none resize-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-muted)" }}>
              Vertical Relevance (optional — leave empty for all verticals)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {VERTICALS.map((v) => {
                const active = form.vertical_relevance.includes(v.value);
                return (
                  <button
                    key={v.value}
                    onClick={() => toggleVertical(v.value)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all"
                    style={{
                      backgroundColor: active ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                      color: active ? "#a78bfa" : "var(--t-muted)",
                      border: `1px solid ${active ? "rgba(167,139,250,0.3)" : "var(--t-border)"}`,
                    }}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={saving || !form.title.trim() || !form.content.trim()}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold"
              style={{
                backgroundColor: form.title.trim() && form.content.trim() ? "rgba(167,139,250,0.2)" : "rgba(107,114,128,0.1)",
                color: form.title.trim() && form.content.trim() ? "#a78bfa" : "var(--t-dim)",
                border: `1px solid ${form.title.trim() && form.content.trim() ? "rgba(167,139,250,0.3)" : "var(--t-border)"}`,
              }}
            >
              {saving ? "Saving…" : "Save Entry"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-[12px]"
              style={{ color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Domain filter */}
      <div className="flex items-center gap-2">
        <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>Filter:</span>
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-[11px] outline-none"
          style={inputStyle}
        >
          <option value="">All domains</option>
          {KB_DOMAINS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <span className="text-[11px]" style={{ color: "var(--t-dim)" }}>
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* Entry list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={20} className="animate-spin opacity-40" style={{ color: "var(--t-muted)" }} />
        </div>
      ) : entries.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl text-center"
          style={{ backgroundColor: "var(--t-surface)", border: "1px dashed var(--t-border)" }}
        >
          <BookOpen size={28} className="mb-3 opacity-20" style={{ color: "var(--t-muted)" }} />
          <p className="text-[13px]" style={{ color: "var(--t-muted)" }}>No entries yet. Add Vault Co knowledge above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <KBEntryRow key={entry.id} entry={entry} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function KBEntryRow({ entry, onDelete }: { entry: KBSearchResult; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const domainLabel = KB_DOMAINS.find((d) => d.value === entry.domain)?.label ?? entry.domain;

  return (
    <div
      className="rounded-xl"
      style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0"
          style={{ backgroundColor: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}
        >
          {domainLabel}
        </span>
        <p className="text-[13px] font-semibold flex-1 truncate" style={{ color: "var(--t-text)" }}>{entry.title}</p>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: "var(--t-muted)" }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          className="p-1 rounded opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: "#ef4444" }}
        >
          <Trash2 size={13} />
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4">
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-muted)", whiteSpace: "pre-wrap" }}>
            {entry.content}
          </p>
          {entry.vertical_relevance.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.vertical_relevance.map((v) => (
                <span key={v} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "var(--t-dim)" }}>
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Prospects View
// ─────────────────────────────────────────────────────────────

function ProspectsView({ onStartCallWithProspect }: { onStartCallWithProspect: (prospect: VictoriaProspectRow) => void }) {
  const [prospects, setProspects] = useState<VictoriaProspectRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<VictoriaProspectRow | null>(null);
  const [briefing, setBriefing] = useState<PreCallBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", company: "", vertical: "roofing", phone: "", email: "" });
  const [creating, setCreating] = useState(false);

  const fetchProspects = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = `/api/victoria/prospects${q ? `?search=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json() as { prospects: VictoriaProspectRow[] };
      setProspects(data.prospects ?? []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  useEffect(() => {
    const t = setTimeout(() => fetchProspects(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search, fetchProspects]);

  const handleBriefing = async (p: VictoriaProspectRow) => {
    setSelected(p);
    setBriefing(null);
    setBriefingLoading(true);
    try {
      const res = await fetch(`/api/victoria/prospects/${p.id}/briefing`, { method: "POST" });
      const data = await res.json() as { briefing: PreCallBriefing };
      setBriefing(data.briefing ?? null);
    } catch { /* silent */ } finally {
      setBriefingLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newForm.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/victoria/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      if (res.ok) {
        setNewForm({ name: "", company: "", vertical: "roofing", phone: "", email: "" });
        setShowNewForm(false);
        await fetchProspects();
      }
    } catch { /* silent */ } finally {
      setCreating(false);
    }
  };

  const inputStyle = {
    backgroundColor: "var(--t-surface-2)",
    border: "1px solid var(--t-border)",
    color: "var(--t-text)",
  };

  const urgencyColors: Record<string, string> = {
    low: "#6b7280", medium: "#f59e0b", high: "#ef4444", urgent: "#a78bfa",
  };

  return (
    <div className="grid grid-cols-[1fr_340px] gap-4 h-full max-h-[calc(100vh-80px)]">

      {/* Left: Prospect list */}
      <div className="space-y-4 overflow-hidden flex flex-col">
        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: "var(--t-muted)" }} />
            <input
              type="text"
              placeholder="Search prospects…"
              value={search}
              onChange={handleSearch}
              className="w-full pl-8 pr-3 py-2 rounded-lg text-[13px] outline-none"
              style={inputStyle}
            />
          </div>
          <button
            onClick={() => setShowNewForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold flex-shrink-0"
            style={{ backgroundColor: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}
          >
            <Plus size={12} /> New Prospect
          </button>
        </div>

        {/* New prospect form */}
        {showNewForm && (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>New Prospect</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Name *" value={newForm.name}
                onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                className="px-3 py-2 rounded-lg text-[12px] outline-none" style={inputStyle} />
              <input type="text" placeholder="Company" value={newForm.company}
                onChange={(e) => setNewForm((f) => ({ ...f, company: e.target.value }))}
                className="px-3 py-2 rounded-lg text-[12px] outline-none" style={inputStyle} />
              <input type="text" placeholder="Phone" value={newForm.phone}
                onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))}
                className="px-3 py-2 rounded-lg text-[12px] outline-none" style={inputStyle} />
              <input type="email" placeholder="Email" value={newForm.email}
                onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))}
                className="px-3 py-2 rounded-lg text-[12px] outline-none" style={inputStyle} />
            </div>
            <select value={newForm.vertical}
              onChange={(e) => setNewForm((f) => ({ ...f, vertical: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-[12px] outline-none" style={inputStyle}>
              {VERTICALS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating || !newForm.name.trim()}
                className="px-4 py-1.5 rounded-lg text-[12px] font-semibold"
                style={{ backgroundColor: "rgba(167,139,250,0.2)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}>
                {creating ? "Saving…" : "Create"}
              </button>
              <button onClick={() => setShowNewForm(false)} className="px-4 py-1.5 rounded-lg text-[12px]"
                style={{ color: "var(--t-muted)", border: "1px solid var(--t-border)" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={20} className="animate-spin opacity-40" style={{ color: "var(--t-muted)" }} />
            </div>
          ) : prospects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCircle size={28} className="mb-2 opacity-20" style={{ color: "var(--t-muted)" }} />
              <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No prospects yet.</p>
            </div>
          ) : (
            prospects.map((p) => (
              <div
                key={p.id}
                onClick={() => { setSelected(p); setBriefing(null); }}
                className="px-4 py-3 rounded-xl cursor-pointer transition-all"
                style={{
                  backgroundColor: selected?.id === p.id ? "rgba(167,139,250,0.08)" : "var(--t-surface)",
                  border: `1px solid ${selected?.id === p.id ? "rgba(167,139,250,0.3)" : "var(--t-border)"}`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                    style={{ backgroundColor: "rgba(167,139,250,0.1)", color: "#a78bfa" }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{p.name}</p>
                    <p className="text-[11px] truncate" style={{ color: "var(--t-muted)" }}>
                      {p.company ?? "—"} · {p.vertical ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize"
                      style={{ backgroundColor: `${urgencyColors[p.urgency_level] ?? "#6b7280"}18`, color: urgencyColors[p.urgency_level] ?? "#6b7280" }}
                    >
                      {p.urgency_level}
                    </span>
                    <span className="text-[9px]" style={{ color: "var(--t-dim)" }}>
                      {p.total_calls} {p.total_calls === 1 ? "call" : "calls"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Detail + Briefing */}
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
      >
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <UserCircle size={32} className="mb-3 opacity-20" style={{ color: "var(--t-muted)" }} />
            <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>Select a prospect to view details and generate a pre-call briefing.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Prospect header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p
                  className="text-[17px] font-bold"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
                >
                  {selected.name}
                </p>
                <span
                  className="text-[9px] px-2 py-0.5 rounded-full font-bold capitalize"
                  style={{ backgroundColor: `${urgencyColors[selected.urgency_level] ?? "#6b7280"}18`, color: urgencyColors[selected.urgency_level] ?? "#6b7280" }}
                >
                  {selected.urgency_level} urgency
                </span>
              </div>
              <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                {selected.company} · {selected.vertical} · {selected.total_calls} call{selected.total_calls !== 1 ? "s" : ""}
              </p>
              {selected.phone && <p className="text-[11px]" style={{ color: "var(--t-dim)" }}>{selected.phone}</p>}
              {selected.deal_stage && (
                <span
                  className="inline-block text-[9px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
                >
                  Stage: {selected.deal_stage.replace(/_/g, " ")}
                </span>
              )}
            </div>

            {/* Known intel */}
            {selected.known_pain_points.length > 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-muted)" }}>Known Pain Points</p>
                <ul className="space-y-1">
                  {selected.known_pain_points.map((p, i) => (
                    <li key={i} className="flex gap-2 text-[11px]" style={{ color: "var(--t-text)" }}>
                      <span style={{ color: "#f59e0b" }}>•</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.known_objections.length > 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-muted)" }}>Known Objections</p>
                <ul className="space-y-1">
                  {selected.known_objections.map((o, i) => (
                    <li key={i} className="flex gap-2 text-[11px]" style={{ color: "var(--t-text)" }}>
                      <span style={{ color: "#ef4444" }}>•</span> {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.next_step && (
              <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
                <p className="text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "#c9a84c" }}>Agreed Next Step</p>
                <p className="text-[11px]" style={{ color: "var(--t-text)" }}>{selected.next_step}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleBriefing(selected)}
                disabled={briefingLoading}
                className="flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold"
                style={{ backgroundColor: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}
              >
                {briefingLoading ? <Loader size={12} className="animate-spin" /> : <FileText size={12} />}
                {briefingLoading ? "Generating briefing…" : "Generate Pre-Call Briefing"}
              </button>
              <button
                onClick={() => onStartCallWithProspect(selected)}
                className="flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold"
                style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}
              >
                <PhoneCall size={12} /> Start Call with {selected.name.split(" ")[0]}
              </button>
            </div>

            {/* Briefing */}
            {briefing && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>Pre-Call Briefing</p>

                <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--t-border)" }}>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-text)" }}>{briefing.prospect_summary}</p>
                </div>

                <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: "#c9a84c" }}>Open With</p>
                  <p className="text-[11px] italic" style={{ color: "var(--t-text)" }}>&ldquo;{briefing.opening_question}&rdquo;</p>
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-muted)" }}>Recommended Approach</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-text)" }}>{briefing.recommended_approach}</p>
                </div>

                {briefing.things_to_avoid.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#ef4444" }}>Avoid</p>
                    {briefing.things_to_avoid.map((t, i) => (
                      <p key={i} className="text-[11px] flex gap-1.5" style={{ color: "var(--t-muted)" }}>
                        <span style={{ color: "#ef4444" }}>✕</span> {t}
                      </p>
                    ))}
                  </div>
                )}

                <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--t-border)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--t-muted)" }}>Urgency</p>
                  <p className="text-[11px]" style={{ color: "var(--t-text)" }}>{briefing.urgency_assessment}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mode Toggle — top-level navigation between Victoria modes
// ─────────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange, callActive }: { mode: PageMode; onChange: (m: PageMode) => void; callActive: boolean }) {
  const tabs: { id: PageMode; label: string; icon: React.ReactNode }[] = [
    { id: "live_call", label: "Live Call", icon: <PhoneCall size={12} /> },
    { id: "knowledge_base", label: "Knowledge Base", icon: <BookOpen size={12} /> },
    { id: "prospects", label: "Prospects", icon: <UserCircle size={12} /> },
  ];

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl mb-4"
      style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", width: "fit-content" }}
    >
      {tabs.map((tab) => {
        const isActive = mode === tab.id;
        const disabled = tab.id === "live_call" && false; // always enabled
        return (
          <button
            key={tab.id}
            onClick={() => !disabled && onChange(tab.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              backgroundColor: isActive ? "rgba(167,139,250,0.15)" : "transparent",
              color: isActive ? "#a78bfa" : "var(--t-muted)",
              border: `1px solid ${isActive ? "rgba(167,139,250,0.3)" : "transparent"}`,
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.id === "live_call" && callActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Start Call Modal
// ─────────────────────────────────────────────────────────────

interface StartCallForm {
  prospect_name: string;
  prospect_company: string;
  prospect_vertical: ContractorVertical;
  current_marketing: string;
  prior_call_summary: string;
  prospect_id?: string;
}

function StartCallModal({ onStart, linkedProspect }: { onStart: (form: StartCallForm) => void; linkedProspect?: VictoriaProspectRow | null }) {
  const [form, setForm] = useState<StartCallForm>({
    prospect_name: linkedProspect?.name ?? "",
    prospect_company: linkedProspect?.company ?? "",
    prospect_vertical: (linkedProspect?.vertical as ContractorVertical) ?? "roofing",
    current_marketing: "",
    prior_call_summary: "",
    prospect_id: linkedProspect?.id,
  });

  // Sync if linkedProspect changes
  useEffect(() => {
    if (linkedProspect) {
      setForm((f) => ({
        ...f,
        prospect_name: linkedProspect.name,
        prospect_company: linkedProspect.company ?? "",
        prospect_vertical: (linkedProspect.vertical as ContractorVertical) ?? "roofing",
        prospect_id: linkedProspect.id,
      }));
    }
  }, [linkedProspect]);

  const isValid = form.prospect_name.trim().length > 0 && form.prospect_company.trim().length > 0;

  return (
    <div className="max-w-lg mx-auto mt-12 space-y-6">
      {/* Victoria Header */}
      <div className="text-center space-y-2">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
          style={{ backgroundColor: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)" }}
        >
          <PhoneCall size={24} style={{ color: "#a78bfa" }} />
        </div>
        <h1
          className="text-[26px] font-bold tracking-wide"
          style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
        >
          Victoria
        </h1>
        <p className="text-[13px]" style={{ color: "var(--t-muted)" }}>
          AI sales coach for Vault Co. Tell Victoria who you&rsquo;re calling before the call starts.
        </p>
        {linkedProspect && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <UserCircle size={10} /> Linked to {linkedProspect.name} — memory will be loaded
          </div>
        )}
      </div>

      {/* Form */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-muted)" }}>
              Prospect Name *
            </label>
            <input
              type="text"
              placeholder="John Miller"
              value={form.prospect_name}
              onChange={(e) => setForm((f) => ({ ...f, prospect_name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
              style={{
                backgroundColor: "var(--t-surface-2)",
                border: "1px solid var(--t-border)",
                color: "var(--t-text)",
              }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-muted)" }}>
              Company *
            </label>
            <input
              type="text"
              placeholder="Miller Roofing Co"
              value={form.prospect_company}
              onChange={(e) => setForm((f) => ({ ...f, prospect_company: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
              style={{
                backgroundColor: "var(--t-surface-2)",
                border: "1px solid var(--t-border)",
                color: "var(--t-text)",
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-muted)" }}>
            Industry
          </label>
          <select
            value={form.prospect_vertical}
            onChange={(e) => setForm((f) => ({ ...f, prospect_vertical: e.target.value as ContractorVertical }))}
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
            style={{
              backgroundColor: "var(--t-surface-2)",
              border: "1px solid var(--t-border)",
              color: "var(--t-text)",
            }}
          >
            <option value="roofing">Roofing</option>
            <option value="hvac">HVAC</option>
            <option value="remodeling">Remodeling</option>
            <option value="landscaping">Landscaping</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="painting">Painting</option>
            <option value="general_contracting">General Contracting</option>
            <option value="home_services">Home Services</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-muted)" }}>
            Current Marketing (optional)
          </label>
          <input
            type="text"
            placeholder="HomeAdvisor, Google Ads, referrals..."
            value={form.current_marketing}
            onChange={(e) => setForm((f) => ({ ...f, current_marketing: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
            style={{
              backgroundColor: "var(--t-surface-2)",
              border: "1px solid var(--t-border)",
              color: "var(--t-text)",
            }}
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-muted)" }}>
            Prior Call Notes (optional)
          </label>
          <textarea
            placeholder="Spoke last week, mentioned slow season..."
            value={form.prior_call_summary}
            onChange={(e) => setForm((f) => ({ ...f, prior_call_summary: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
            style={{
              backgroundColor: "var(--t-surface-2)",
              border: "1px solid var(--t-border)",
              color: "var(--t-text)",
            }}
          />
        </div>

        <button
          onClick={() => isValid && onStart(form)}
          disabled={!isValid}
          className="w-full py-3 rounded-xl text-[14px] font-bold tracking-wide transition-all"
          style={{
            backgroundColor: isValid ? "#a78bfa" : "rgba(107,114,128,0.2)",
            color: isValid ? "white" : "var(--t-muted)",
            cursor: isValid ? "pointer" : "not-allowed",
            fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
          }}
        >
          Start Live Coaching Session
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Victoria Page
// ─────────────────────────────────────────────────────────────

export default function VictoriaPage() {
  const [pageMode, setPageMode] = useState<PageMode>("live_call");
  const [linkedProspect, setLinkedProspect] = useState<VictoriaProspectRow | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ prospect_name: string; company: string } | null>(null);
  const [coachingCards, setCoachingCards] = useState<CoachingCard[]>([]);
  const [currentCard, setCurrentCard] = useState<CoachingCard | null>(null);
  const [sessionState, setSessionState] = useState<Partial<LiveCallSession> | null>(null);
  const [dealRisk, setDealRisk] = useState<DealRiskOutput | null>(null);
  const [emotionalData, setEmotionalData] = useState<EmotionalOutput | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [manualText, setManualText] = useState("");
  const [manualSpeaker, setManualSpeaker] = useState<"rep" | "prospect">("prospect");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [activeIntelTab, setActiveIntelTab] = useState<"scores" | "deal_risk" | "emotional">("scores");

  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardsEndRef = useRef<HTMLDivElement>(null);

  const onCoachingCard = useCallback((card: CoachingCard) => {
    setCurrentCard(card);
    setCoachingCards((prev) => [card, ...prev].slice(0, 20));
  }, []);

  const onChunkProcessed = useCallback(
    (result: {
      session_phase?: string;
      session_scores?: LiveCallSession["scores"];
      discovery_depth?: number;
      deal_risk?: DealRiskOutput | null;
      emotional_signals?: EmotionalOutput | null;
    }) => {
      setSessionState((prev) => ({
        ...prev,
        phase: result.session_phase as LiveCallSession["phase"],
        scores: result.session_scores ?? prev?.scores,
      }));
      if (result.deal_risk) {
        setDealRisk(result.deal_risk);
        // Auto-switch tab to deal risk on first meaningful score
        if (result.deal_risk.overall_score !== 0) setActiveIntelTab("deal_risk");
      }
      if (result.emotional_signals) {
        setEmotionalData(result.emotional_signals);
        // Auto-switch to emotional tab on alert
        if (result.emotional_signals.alert) setActiveIntelTab("emotional");
      }
    },
    []
  );

  const transcription = useVictoriaTranscription(
    callId
      ? {
          callId,
          onCoachingCard,
          onChunkProcessed,
          onError: (err) => console.error("[Victoria UI] Transcription error:", err),
          chunkIntervalSeconds: 8,
        }
      : { callId: "__placeholder__" }
  );

  // Auto-scroll to latest card
  useEffect(() => {
    cardsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [coachingCards.length]);

  // Duration timer
  useEffect(() => {
    if (transcription.state.status === "active" || transcription.state.status === "paused") {
      if (!durationTimerRef.current) {
        durationTimerRef.current = setInterval(() => {
          setCallDuration((d) => d + 1);
        }, 1000);
      }
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [transcription.state.status]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Start call ──────────────────────────────────────────────

  const handleStartCall = useCallback(async (form: StartCallForm) => {
    setIsStarting(true);
    try {
      const res = await fetch("/api/victoria/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect_id: form.prospect_id,
          prospect: {
            name: form.prospect_name,
            company: form.prospect_company,
            vertical: form.prospect_vertical,
            current_marketing: form.current_marketing,
            prior_call_summary: form.prior_call_summary,
          },
          is_test_call: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        alert(err.error ?? "Failed to start session");
        return;
      }

      const data = await res.json() as { call_id: string };
      setCallId(data.call_id);
      setSessionInfo({ prospect_name: form.prospect_name, company: form.prospect_company });
      setCallDuration(0);

      // Start live audio transcription
      await transcription.startListening();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start call");
    } finally {
      setIsStarting(false);
    }
  }, [transcription]);

  // ── End call ────────────────────────────────────────────────

  const handleEndCall = useCallback(async () => {
    transcription.stopListening();

    if (callId) {
      await fetch("/api/victoria/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_id: callId, status: "completed" }),
      });
    }

    setCallId(null);
    setSessionInfo(null);
    setCurrentCard(null);
    setCoachingCards([]);
    setDealRisk(null);
    setEmotionalData(null);
    setCallDuration(0);
    setActiveIntelTab("scores");
  }, [callId, transcription]);

  // ── Manual chunk submission ─────────────────────────────────

  const handleManualSubmit = useCallback(async () => {
    if (!callId || !manualText.trim()) return;
    setIsSubmittingManual(true);
    try {
      await transcription.submitManualChunk(manualText.trim(), manualSpeaker);
      setManualText("");
    } finally {
      setIsSubmittingManual(false);
    }
  }, [callId, manualText, manualSpeaker, transcription]);

  // Handle starting call from Prospects view
  const handleStartCallWithProspect = useCallback((prospect: VictoriaProspectRow) => {
    setLinkedProspect(prospect);
    setPageMode("live_call");
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Render: Pre-call (mode-aware)
  // ─────────────────────────────────────────────────────────────

  if (!callId) {
    return (
      <div>
        <ModeToggle mode={pageMode} onChange={setPageMode} callActive={false} />
        {pageMode === "live_call" && (
          <StartCallModal
            onStart={isStarting ? () => {} : handleStartCall}
            linkedProspect={linkedProspect}
          />
        )}
        {pageMode === "knowledge_base" && <KBView />}
        {pageMode === "prospects" && (
          <ProspectsView onStartCallWithProspect={handleStartCallWithProspect} />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Render: Active Call
  // ─────────────────────────────────────────────────────────────

  const isLive = transcription.state.status === "active";
  const isPaused = transcription.state.status === "paused";

  return (
    <div>
      <ModeToggle mode="live_call" onChange={() => {}} callActive={true} />
    <div className="grid grid-cols-[1fr_320px] gap-4 h-full max-h-[calc(100vh-80px)]">

      {/* ── Left: Coaching cards ─────────────────────────── */}
      <div className="flex flex-col gap-4 overflow-hidden">

        {/* Call header */}
        <div
          className="flex items-center gap-4 px-5 py-3 rounded-xl"
          style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
        >
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              backgroundColor: isLive ? "rgba(34,197,94,0.12)" : isPaused ? "rgba(245,158,11,0.1)" : "rgba(107,114,128,0.1)",
              border: `1px solid ${isLive ? "rgba(34,197,94,0.3)" : isPaused ? "rgba(245,158,11,0.25)" : "rgba(107,114,128,0.2)"}`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: isLive ? "#22c55e" : isPaused ? "#f59e0b" : "#6b7280" }}
            />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isLive ? "#22c55e" : isPaused ? "#f59e0b" : "#6b7280" }}>
              {isLive ? "Live" : isPaused ? "Paused" : transcription.state.status}
            </span>
          </div>

          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>
              {sessionInfo?.prospect_name} · {sessionInfo?.company}
            </p>
            <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
              {transcription.state.provider === "assemblyai" ? "AssemblyAI" : transcription.state.provider === "web_speech_api" ? "Web Speech" : "Manual"} ·{" "}
              Mic: {transcription.currentSpeaker === "rep" ? "Rep" : "Prospect"}
            </p>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Clock size={13} style={{ color: "var(--t-muted)" }} />
            <span className="text-[13px] font-mono" style={{ color: "var(--t-text)" }}>
              {formatDuration(callDuration)}
            </span>
          </div>

          {/* Speaker toggle */}
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--t-border)" }}
          >
            {(["prospect", "rep"] as const).map((s) => (
              <button
                key={s}
                onClick={() => transcription.setSpeaker(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-all"
                style={{
                  backgroundColor: transcription.currentSpeaker === s ? "rgba(167,139,250,0.15)" : "transparent",
                  color: transcription.currentSpeaker === s ? "#a78bfa" : "var(--t-muted)",
                }}
              >
                {s === "prospect" ? <User size={11} /> : <Users size={11} />}
                {s === "prospect" ? "Prospect" : "Rep"}
              </button>
            ))}
          </div>

          {/* Mic controls */}
          <div className="flex gap-2">
            {isLive ? (
              <button
                onClick={() => transcription.pauseListening()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
              >
                <MicOff size={12} /> Pause
              </button>
            ) : isPaused ? (
              <button
                onClick={() => transcription.resumeListening()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}
              >
                <Mic size={12} /> Resume
              </button>
            ) : null}

            <button
              onClick={handleEndCall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              <PhoneOff size={12} /> End Call
            </button>
          </div>
        </div>

        {/* Current coaching card */}
        <div className="overflow-y-auto space-y-3 flex-1">
          {currentCard ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider px-1" style={{ color: "var(--t-muted)" }}>
                Live Coaching
              </p>
              <CoachingCardDisplay card={currentCard} />
            </>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-16 rounded-xl text-center"
              style={{ backgroundColor: "var(--t-surface)", border: "1px dashed var(--t-border)" }}
            >
              <Activity size={32} className="mb-3 opacity-30" style={{ color: "var(--t-muted)" }} />
              <p className="text-[13px]" style={{ color: "var(--t-muted)" }}>
                {isLive ? "Listening... coaching cards will appear as the conversation unfolds." : "Start the microphone to begin live coaching."}
              </p>
            </div>
          )}

          {/* History */}
          {coachingCards.length > 1 && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider px-1 pt-2" style={{ color: "var(--t-muted)" }}>
                Earlier ({coachingCards.length - 1})
              </p>
              <div className="space-y-2 opacity-60">
                {coachingCards.slice(1, 6).map((card) => (
                  <div
                    key={card.id}
                    className="px-4 py-3 rounded-lg flex items-center gap-2.5"
                    style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
                  >
                    <PriorityDot priority={card.priority} />
                    <p className="text-[12px] truncate flex-1" style={{ color: "var(--t-text)" }}>{card.headline}</p>
                    <span className="text-[10px] shrink-0" style={{ color: "var(--t-dim)" }}>
                      #{card.chunk_index}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div ref={cardsEndRef} />
        </div>

        {/* Manual text input (backup/testing) */}
        <div
          className="px-4 py-3 rounded-xl space-y-2"
          style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-dim)" }}>
            Manual entry (testing / mic backup)
          </p>
          <div className="flex gap-2">
            <select
              value={manualSpeaker}
              onChange={(e) => setManualSpeaker(e.target.value as "rep" | "prospect")}
              className="px-2 py-1.5 rounded-lg text-[12px] outline-none"
              style={{ backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}
            >
              <option value="prospect">Prospect</option>
              <option value="rep">Rep</option>
            </select>
            <input
              type="text"
              placeholder="Type or paste transcript text..."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleManualSubmit()}
              className="flex-1 px-3 py-1.5 rounded-lg text-[12px] outline-none"
              style={{ backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
            />
            <button
              onClick={handleManualSubmit}
              disabled={isSubmittingManual || !manualText.trim()}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                backgroundColor: manualText.trim() ? "rgba(167,139,250,0.15)" : "rgba(107,114,128,0.08)",
                color: manualText.trim() ? "#a78bfa" : "var(--t-dim)",
                border: `1px solid ${manualText.trim() ? "rgba(167,139,250,0.3)" : "var(--t-border)"}`,
              }}
            >
              {isSubmittingManual ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: Intelligence Panel (tabbed) ──────────── */}
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
      >
        {/* Phase + Tab bar */}
        <div className="border-b" style={{ borderColor: "var(--t-border-nav)" }}>
          {/* Phase */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>Phase</span>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full capitalize"
              style={{ backgroundColor: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}
            >
              {(sessionState?.phase ?? "rapport").replace(/_/g, " ")}
            </span>
            {emotionalData?.alert && (
              <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-bold animate-pulse" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                ALERT
              </span>
            )}
          </div>
          {/* Tabs */}
          <div className="flex">
            {(["scores", "deal_risk", "emotional"] as const).map((tab) => {
              const labels = { scores: "Scores", deal_risk: "Deal Risk", emotional: "Emotional" };
              const isActive = activeIntelTab === tab;
              const hasBadge = tab === "emotional" && emotionalData?.alert;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveIntelTab(tab)}
                  className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors relative"
                  style={{
                    color: isActive ? "#a78bfa" : "var(--t-dim)",
                    borderBottom: isActive ? "2px solid #a78bfa" : "2px solid transparent",
                    backgroundColor: isActive ? "rgba(167,139,250,0.05)" : "transparent",
                  }}
                >
                  {labels[tab]}
                  {hasBadge && <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-red-500" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── Scores tab ── */}
          {activeIntelTab === "scores" && (
            <>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--t-muted)" }}>
                  <BarChart2 size={10} className="inline mr-1 mb-0.5" />
                  Close Readiness
                </p>
                <div className="space-y-2">
                  <ScoreBar label="Trust"       score={sessionState?.scores?.trust ?? 30}             color="#22c55e" />
                  <ScoreBar label="Pain Depth"  score={sessionState?.scores?.pain_depth ?? 0}          color="#f59e0b" />
                  <ScoreBar label="Urgency"     score={sessionState?.scores?.urgency ?? 20}            color="#3b82f6" />
                  <ScoreBar label="Authority"   score={sessionState?.scores?.authority ?? 50}          color="#a78bfa" />
                  <ScoreBar label="Budget Fit"  score={sessionState?.scores?.budget_fit ?? 50}         color="#06b6d4" />
                  <ScoreBar label="Engagement"  score={sessionState?.scores?.emotional_engagement ?? 30} color="#ec4899" />
                  <ScoreBar label="Close Ready" score={sessionState?.scores?.close_readiness ?? 10}   color="#a78bfa" />
                  <ScoreBar label="Deal Risk"   score={sessionState?.scores?.deal_risk ?? 70}          color="#ef4444" />
                </div>
              </div>

              {/* Microphone section */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--t-muted)" }}>Microphone</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>Status</span>
                    <span className="text-[11px] font-semibold capitalize" style={{ color: isLive ? "#22c55e" : isPaused ? "#f59e0b" : "var(--t-dim)" }}>
                      {transcription.state.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>Provider</span>
                    <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                      {transcription.state.provider === "assemblyai" ? "AssemblyAI" : transcription.state.provider === "web_speech_api" ? "Web Speech" : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>Active speaker</span>
                    <span className="text-[11px] capitalize font-semibold" style={{ color: "var(--t-text)" }}>
                      {transcription.currentSpeaker}
                    </span>
                  </div>
                  {transcription.state.lastChunkText && (
                    <p className="text-[10px] italic leading-snug pt-1 truncate" style={{ color: "var(--t-dim)" }} title={transcription.state.lastChunkText}>
                      &ldquo;{transcription.state.lastChunkText.slice(0, 55)}…&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {transcription.state.error && (
                <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <p className="text-[11px]" style={{ color: "#ef4444" }}>{transcription.state.error}</p>
                </div>
              )}
            </>
          )}

          {/* ── Deal Risk tab ── */}
          {activeIntelTab === "deal_risk" && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>
                <Target size={10} className="inline mr-1 mb-0.5" />
                Deal Risk Assessment
              </p>
              {dealRisk ? (
                <DealRiskPanel data={dealRisk} />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Activity size={24} className="mb-2 opacity-20" style={{ color: "var(--t-muted)" }} />
                  <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                    Deal risk scores will appear after the 3rd transcript chunk.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Emotional tab ── */}
          {activeIntelTab === "emotional" && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>
                <Zap size={10} className="inline mr-1 mb-0.5" />
                Prospect Emotional State
              </p>
              {emotionalData ? (
                <EmotionalPanel data={emotionalData} />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Activity size={24} className="mb-2 opacity-20" style={{ color: "var(--t-muted)" }} />
                  <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                    Emotional state will appear after the first prospect utterance.
                  </p>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
    </div>
  );
}
