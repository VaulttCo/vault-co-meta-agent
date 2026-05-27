"use client";
// Victoria — Live Transcription Hook
// Bridges the browser microphone to Victoria's coaching pipeline.
//
// Two transcription paths (automatic fallback):
//   1. AssemblyAI real-time streaming (preferred — works in all modern browsers)
//   2. Web Speech API (Chrome-only fallback — no API key needed)
//
// Both paths produce transcript chunks and POST them to /api/victoria/chunks,
// which runs them through the Victoria orchestrator and returns coaching cards.

import { useState, useRef, useCallback, useEffect } from "react";
import type { CoachingCard, ChunkProcessingResult } from "../types";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type TranscriptionProvider = "assemblyai" | "web_speech_api" | "none";
export type TranscriptionStatus =
  | "idle"
  | "requesting_permission"
  | "active"
  | "paused"
  | "error"
  | "ended";

export interface TranscriptionState {
  status: TranscriptionStatus;
  provider: TranscriptionProvider;
  error: string | null;
  lastChunkText: string | null;
}

export interface VictoriaTranscriptionOptions {
  callId: string;
  defaultSpeaker?: "rep" | "prospect"; // Default speaker attribution
  onChunkProcessed?: (result: ChunkProcessingResult) => void;
  onCoachingCard?: (card: CoachingCard) => void;
  onError?: (error: string) => void;
  // How often to submit accumulated speech (seconds)
  chunkIntervalSeconds?: number;
}

export interface UseVictoriaTranscriptionReturn {
  state: TranscriptionState;
  // Start listening (requests mic permission)
  startListening: (speaker?: "rep" | "prospect") => Promise<void>;
  // Pause transcription (mic stays open)
  pauseListening: () => void;
  // Resume after pause
  resumeListening: () => void;
  // Stop transcription completely
  stopListening: () => void;
  // Manually submit a text chunk (for test mode)
  submitManualChunk: (text: string, speaker: "rep" | "prospect") => Promise<void>;
  // Toggle which speaker is active
  setSpeaker: (speaker: "rep" | "prospect") => void;
  currentSpeaker: "rep" | "prospect";
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useVictoriaTranscription(
  options: VictoriaTranscriptionOptions
): UseVictoriaTranscriptionReturn {
  const {
    callId,
    defaultSpeaker = "prospect",
    onChunkProcessed,
    onCoachingCard,
    onError,
    chunkIntervalSeconds = 8,
  } = options;

  const [state, setState] = useState<TranscriptionState>({
    status: "idle",
    provider: "none",
    error: null,
    lastChunkText: null,
  });

  const [currentSpeaker, setCurrentSpeaker] = useState<"rep" | "prospect">(defaultSpeaker);

  // Refs for mutable state that shouldn't trigger re-renders
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const assemblyWsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const accumulatedTextRef = useRef<string>("");
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const speakerRef = useRef<"rep" | "prospect">(defaultSpeaker);

  // Keep speakerRef in sync
  useEffect(() => {
    speakerRef.current = currentSpeaker;
  }, [currentSpeaker]);

  const setSpeaker = useCallback((speaker: "rep" | "prospect") => {
    setCurrentSpeaker(speaker);
    speakerRef.current = speaker;
  }, []);

  // ── Submit a chunk to Victoria's orchestrator ───────────────

  const submitChunk = useCallback(
    async (text: string, speaker: "rep" | "prospect") => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length < 3) return;

      setState((prev) => ({ ...prev, lastChunkText: trimmed }));

      try {
        const res = await fetch("/api/victoria/chunks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            call_id: callId,
            speaker,
            text: trimmed,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string };
          console.error("[Victoria:Transcription] Chunk rejected:", errData.error);
          onError?.(errData.error ?? "Failed to process chunk");
          return;
        }

        const result = await res.json() as ChunkProcessingResult & {
          coaching_card?: CoachingCard | null;
        };

        onChunkProcessed?.(result);
        if (result.coaching_card) {
          onCoachingCard?.(result.coaching_card);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        console.error("[Victoria:Transcription] Submit failed:", msg);
        onError?.(msg);
      }
    },
    [callId, onChunkProcessed, onCoachingCard, onError]
  );

  // ── Manual chunk submission (test mode / manual entry) ─────

  const submitManualChunk = useCallback(
    async (text: string, speaker: "rep" | "prospect") => {
      await submitChunk(text, speaker);
    },
    [submitChunk]
  );

  // ── Flush accumulated text as a chunk ──────────────────────

  const flushAccumulatedText = useCallback(() => {
    const text = accumulatedTextRef.current.trim();
    if (text.length > 0) {
      accumulatedTextRef.current = "";
      submitChunk(text, speakerRef.current);
    }
  }, [submitChunk]);

  // ── Chunk timer — flushes every N seconds ──────────────────

  const startChunkTimer = useCallback(() => {
    if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
    chunkTimerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        flushAccumulatedText();
      }
    }, chunkIntervalSeconds * 1000);
  }, [chunkIntervalSeconds, flushAccumulatedText]);

  const stopChunkTimer = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
  }, []);

  // ── Web Speech API path (Chrome fallback) ──────────────────

  const startWebSpeechAPI = useCallback(async () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      throw new Error("Web Speech API not supported in this browser");
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (isPausedRef.current) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text.length > 0) {
            // Accumulate and let the timer flush
            accumulatedTextRef.current += (accumulatedTextRef.current ? " " : "") + text;
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg = `Speech recognition error: ${event.error}`;
      console.error("[Victoria:WebSpeech]", msg);
      if (event.error !== "no-speech") {
        setState((prev) => ({ ...prev, status: "error", error: msg }));
        onError?.(msg);
      }
    };

    recognition.onend = () => {
      // Auto-restart if not intentionally stopped
      if (!isPausedRef.current && recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // Ignore — may already be running
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [onError]);

  // ── AssemblyAI real-time streaming path ────────────────────

  const startAssemblyAI = useCallback(
    async (token: string, stream: MediaStream) => {
      const sampleRate = 16000;

      // Set up AudioContext to capture mic at 16kHz PCM
      const audioContext = new AudioContext({ sampleRate });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const ws = new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${sampleRate}&token=${token}`
      );
      assemblyWsRef.current = ws;

      ws.onopen = () => {
        // Start sending audio once WebSocket is open
        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (event: AudioProcessingEvent) => {
          if (isPausedRef.current || ws.readyState !== WebSocket.OPEN) return;

          const inputData = event.inputBuffer.getChannelData(0);
          // Convert Float32 to Int16 PCM
          const pcm = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          ws.send(pcm.buffer);
        };
      };

      ws.onmessage = (msg: MessageEvent) => {
        const data = JSON.parse(msg.data as string) as {
          message_type: string;
          text?: string;
          audio_start?: number;
          audio_end?: number;
        };

        if (data.message_type === "FinalTranscript" && data.text) {
          const text = data.text.trim();
          if (text.length > 0 && !isPausedRef.current) {
            // Directly submit final transcripts (AssemblyAI already segments them)
            submitChunk(text, speakerRef.current);
          }
        }
      };

      ws.onerror = (err) => {
        console.error("[Victoria:AssemblyAI] WebSocket error:", err);
        onError?.("AssemblyAI connection error");
      };

      ws.onclose = () => {
        // Clean up audio nodes
        try {
          processor.disconnect();
          source.disconnect();
        } catch {
          // Ignore cleanup errors
        }
      };
    },
    [submitChunk, onError]
  );

  // ── Main startListening function ───────────────────────────

  const startListening = useCallback(
    async (speaker?: "rep" | "prospect") => {
      if (speaker) {
        setSpeaker(speaker);
      }
      isPausedRef.current = false;

      setState((prev) => ({ ...prev, status: "requesting_permission", error: null }));

      // Request microphone permission
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        mediaStreamRef.current = stream;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Microphone permission denied";
        setState((prev) => ({ ...prev, status: "error", error: msg }));
        onError?.(msg);
        return;
      }

      // Try AssemblyAI first
      try {
        const tokenRes = await fetch("/api/victoria/transcription/token");
        const tokenData = await tokenRes.json() as { available: boolean; provider: string; token?: string };

        if (tokenData.available && tokenData.token) {
          await startAssemblyAI(tokenData.token, stream);
          startChunkTimer(); // Still use timer for additional context flushing
          setState({ status: "active", provider: "assemblyai", error: null, lastChunkText: null });
          return;
        }
      } catch {
        console.warn("[Victoria:Transcription] AssemblyAI unavailable — falling back to Web Speech API");
      }

      // Fallback: Web Speech API (Chrome only)
      try {
        await startWebSpeechAPI();
        startChunkTimer();
        setState({ status: "active", provider: "web_speech_api", error: null, lastChunkText: null });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Transcription not available in this browser";
        setState((prev) => ({ ...prev, status: "error", error: msg }));
        onError?.(msg);

        // Release mic
        stream.getTracks().forEach((t) => t.stop());
      }
    },
    [setSpeaker, startAssemblyAI, startWebSpeechAPI, startChunkTimer, onError]
  );

  // ── Pause / Resume ─────────────────────────────────────────

  const pauseListening = useCallback(() => {
    isPausedRef.current = true;
    flushAccumulatedText(); // Flush what we have before pausing
    setState((prev) => ({ ...prev, status: "paused" }));
  }, [flushAccumulatedText]);

  const resumeListening = useCallback(() => {
    isPausedRef.current = false;
    setState((prev) => ({ ...prev, status: "active" }));
  }, []);

  // ── Stop listening completely ──────────────────────────────

  const stopListening = useCallback(() => {
    isPausedRef.current = true;

    // Flush any remaining accumulated text
    flushAccumulatedText();

    // Stop chunk timer
    stopChunkTimer();

    // Stop Web Speech API
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }

    // Close AssemblyAI WebSocket
    if (assemblyWsRef.current) {
      try {
        assemblyWsRef.current.close();
      } catch {
        // Ignore
      }
      assemblyWsRef.current = null;
    }

    // Close AudioContext
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // Ignore
      }
      audioContextRef.current = null;
    }

    // Release microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    setState({ status: "ended", provider: "none", error: null, lastChunkText: null });
  }, [flushAccumulatedText, stopChunkTimer]);

  // ── Cleanup on unmount ─────────────────────────────────────

  useEffect(() => {
    return () => {
      stopListening();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    startListening,
    pauseListening,
    resumeListening,
    stopListening,
    submitManualChunk,
    setSpeaker,
    currentSpeaker,
  };
}

// ─────────────────────────────────────────────────────────────
// Web Speech API — Window augmentation
// Full type declarations are in speech-recognition.d.ts
// ─────────────────────────────────────────────────────────────

declare global {
  interface Window {
    SpeechRecognition: { prototype: SpeechRecognition; new(): SpeechRecognition } | undefined;
    webkitSpeechRecognition: { prototype: SpeechRecognition; new(): SpeechRecognition } | undefined;
  }
}
