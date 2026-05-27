"use client";
// Victoria AI Sales Coach — Live Call Interface
// The primary interface for real-time sales coaching.
// Replaces the Coming Soon placeholder.

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Mic, MicOff, PhoneCall, PhoneOff, AlertTriangle,
  ChevronRight, Activity, Target, MessageSquare, Zap,
  Radio, User, Users, Clock, BarChart2, RefreshCw,
} from "lucide-react";
import { useVictoriaTranscription } from "@/lib/victoria/transcription/useVictoriaTranscription";
import type { CoachingCard, LiveCallSession, ContractorVertical } from "@/lib/victoria/types";

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
// Start Call Modal
// ─────────────────────────────────────────────────────────────

interface StartCallForm {
  prospect_name: string;
  prospect_company: string;
  prospect_vertical: ContractorVertical;
  current_marketing: string;
  prior_call_summary: string;
}

function StartCallModal({ onStart }: { onStart: (form: StartCallForm) => void }) {
  const [form, setForm] = useState<StartCallForm>({
    prospect_name: "",
    prospect_company: "",
    prospect_vertical: "roofing",
    current_marketing: "",
    prior_call_summary: "",
  });

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
  const [callId, setCallId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ prospect_name: string; company: string } | null>(null);
  const [coachingCards, setCoachingCards] = useState<CoachingCard[]>([]);
  const [currentCard, setCurrentCard] = useState<CoachingCard | null>(null);
  const [sessionState, setSessionState] = useState<Partial<LiveCallSession> | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [manualText, setManualText] = useState("");
  const [manualSpeaker, setManualSpeaker] = useState<"rep" | "prospect">("prospect");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardsEndRef = useRef<HTMLDivElement>(null);

  const onCoachingCard = useCallback((card: CoachingCard) => {
    setCurrentCard(card);
    setCoachingCards((prev) => [card, ...prev].slice(0, 20));
  }, []);

  const onChunkProcessed = useCallback(
    (result: { session_phase?: string; discovery_depth?: number }) => {
      setSessionState((prev) => ({
        ...prev,
        phase: result.session_phase as LiveCallSession["phase"],
      }));
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
    setCallDuration(0);
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

  // ─────────────────────────────────────────────────────────────
  // Render: Pre-call
  // ─────────────────────────────────────────────────────────────

  if (!callId) {
    return (
      <StartCallModal
        onStart={isStarting ? () => {} : handleStartCall}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Render: Active Call
  // ─────────────────────────────────────────────────────────────

  const isLive = transcription.state.status === "active";
  const isPaused = transcription.state.status === "paused";

  return (
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

      {/* ── Right: Session Intelligence Panel ───────────── */}
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
          <p
            className="text-[13px] font-bold tracking-wide"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
          >
            Call Intelligence
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Phase */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--t-muted)" }}>Phase</p>
            <div
              className="px-3 py-2 rounded-lg text-center"
              style={{ backgroundColor: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}
            >
              <p className="text-[13px] font-bold capitalize" style={{ color: "#a78bfa" }}>
                {(sessionState?.phase ?? "rapport").replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {/* Deal Scores */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--t-muted)" }}>
              <BarChart2 size={10} className="inline mr-1 mb-0.5" />
              Deal Scores
            </p>
            <div className="space-y-2.5">
              <ScoreBar label="Trust" score={sessionState?.scores?.trust ?? 30} color="#22c55e" />
              <ScoreBar label="Pain Depth" score={sessionState?.scores?.pain_depth ?? 0} color="#f59e0b" />
              <ScoreBar label="Urgency" score={sessionState?.scores?.urgency ?? 20} color="#3b82f6" />
              <ScoreBar label="Close Ready" score={sessionState?.scores?.close_readiness ?? 10} color="#a78bfa" />
              <ScoreBar label="Deal Risk" score={sessionState?.scores?.deal_risk ?? 70} color="#ef4444" />
            </div>
          </div>

          {/* Discovery */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--t-muted)" }}>Discovery Depth</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${currentCard?.source_agent === "discovery" ? (currentCard as CoachingCard & { depth_score?: number }).depth_score ?? 0 : 0}%`,
                    backgroundColor: "#22c55e",
                  }}
                />
              </div>
              <span className="text-[12px] font-bold tabular-nums" style={{ color: "#22c55e" }}>
                {currentCard?.source_agent === "discovery" ? "..." : "—"}
              </span>
            </div>
          </div>

          {/* Transcription status */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--t-muted)" }}>Microphone</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>Status</span>
                <span
                  className="text-[11px] font-semibold capitalize"
                  style={{ color: isLive ? "#22c55e" : isPaused ? "#f59e0b" : "var(--t-dim)" }}
                >
                  {transcription.state.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>Provider</span>
                <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                  {transcription.state.provider === "assemblyai"
                    ? "AssemblyAI"
                    : transcription.state.provider === "web_speech_api"
                    ? "Web Speech"
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>Active speaker</span>
                <span className="text-[11px] capitalize font-semibold" style={{ color: "var(--t-text)" }}>
                  {transcription.currentSpeaker}
                </span>
              </div>
              {transcription.state.lastChunkText && (
                <p
                  className="text-[10px] italic leading-snug pt-1 truncate"
                  style={{ color: "var(--t-dim)" }}
                  title={transcription.state.lastChunkText}
                >
                  &ldquo;{transcription.state.lastChunkText.slice(0, 60)}…&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Error */}
          {transcription.state.error && (
            <div
              className="px-3 py-2 rounded-lg"
              style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <p className="text-[11px]" style={{ color: "#ef4444" }}>
                {transcription.state.error}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
