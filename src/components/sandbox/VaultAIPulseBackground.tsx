"use client";

/** Isolated sandbox — not imported by any production page */

import { motion, useReducedMotion } from "framer-motion";

// ── Design tokens ─────────────────────────────────────────────────────────────

const BLUE  = "#0081f2";
const AMBER = "#c9a84c";

// ── Types ─────────────────────────────────────────────────────────────────────

type Accent    = "blue" | "amber" | "dual";
type Intensity = "subtle" | "medium";

export interface VaultAIPulseBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Which accent color anchors the glow. Default: "blue" */
  accent?: Accent;
  /** How visible the ambient orbs are. Default: "subtle" */
  intensity?: Intensity;
}

// ── Orb config per accent ─────────────────────────────────────────────────────

interface OrbDef {
  color: string;
  x: number;   // percent from left
  y: number;   // percent from top
  rem: number; // diameter
  duration: number;
  delay: number;
}

const BLUE_ORBS: OrbDef[] = [
  { color: BLUE,  x: 12,  y: 22,  rem: 28, duration: 5.2, delay: 0   },
  { color: BLUE,  x: 72,  y: 60,  rem: 20, duration: 7.0, delay: 1.6 },
  { color: BLUE,  x: 50,  y: 88,  rem: 14, duration: 9.0, delay: 3.1 },
];

const AMBER_ORBS: OrbDef[] = [
  { color: AMBER, x: 82,  y: 18,  rem: 22, duration: 6.1, delay: 0.8 },
  { color: AMBER, x: 28,  y: 78,  rem: 16, duration: 8.2, delay: 2.3 },
];

function getOrbs(accent: Accent): OrbDef[] {
  if (accent === "blue")  return BLUE_ORBS;
  if (accent === "amber") return AMBER_ORBS;
  return [...BLUE_ORBS, ...AMBER_ORBS];
}

// ── Animated orb ──────────────────────────────────────────────────────────────

function PulseOrb({
  orb,
  baseOpacity,
  peakOpacity,
  shouldAnimate,
}: {
  orb: OrbDef;
  baseOpacity: number;
  peakOpacity: number;
  shouldAnimate: boolean;
}) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: baseOpacity, scale: 1 }}
      animate={
        shouldAnimate
          ? { opacity: [baseOpacity, peakOpacity, baseOpacity], scale: [1, 1.1, 1] }
          : { opacity: baseOpacity, scale: 1 }
      }
      transition={{
        duration: orb.duration,
        delay: orb.delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{
        position: "absolute",
        left:   `${orb.x}%`,
        top:    `${orb.y}%`,
        width:  `${orb.rem}rem`,
        height: `${orb.rem}rem`,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${orb.color}38 0%, ${orb.color}00 70%)`,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        willChange: "opacity, transform",
      }}
    />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VaultAIPulseBackground({
  children,
  className = "",
  style,
  accent    = "blue",
  intensity = "subtle",
}: VaultAIPulseBackgroundProps) {
  const reduced       = useReducedMotion();
  const shouldAnimate = !reduced;

  const baseOpacity = intensity === "medium" ? 0.16 : 0.10;
  const peakOpacity = intensity === "medium" ? 0.30 : 0.18;

  const primaryColor = accent === "amber" ? AMBER : BLUE;
  const orbs         = getOrbs(accent);

  return (
    <div
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
    >
      {/* Subtle dot grid — inline, no globals.css */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.022) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          pointerEvents: "none",
        }}
      />

      {/* Ambient pulse orbs */}
      {orbs.map((orb, i) => (
        <PulseOrb
          key={i}
          orb={orb}
          baseOpacity={baseOpacity}
          peakOpacity={peakOpacity}
          shouldAnimate={shouldAnimate}
        />
      ))}

      {/* Edge vignette — pulls focus to center content */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 35%, var(--t-surface, #0D1520) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Top accent line */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: `linear-gradient(to right, transparent 5%, ${primaryColor}45 50%, transparent 95%)`,
          pointerEvents: "none",
        }}
      />

      {/* Content sits above all layers */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

// ── Sandbox preview ───────────────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  width: "100%",
  maxWidth: 600,
  height: 200,
  borderRadius: 16,
};

function PreviewCard({
  accent,
  intensity,
  label,
  title,
  sub,
  borderColor,
}: {
  accent: Accent;
  intensity?: Intensity;
  label: string;
  title: string;
  sub: string;
  borderColor: string;
}) {
  return (
    <VaultAIPulseBackground
      accent={accent}
      intensity={intensity}
      style={{
        ...CARD_STYLE,
        backgroundColor: "var(--t-surface, #0D1520)",
        border: `1px solid ${borderColor}`,
      }}
    >
      <div style={{ padding: "32px 40px" }}>
        <p
          style={{
            color: "var(--t-dim, #3d4f6e)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          {label}
        </p>
        <p
          style={{
            color: "var(--t-text, #e8eaf0)",
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
            letterSpacing: "0.02em",
            lineHeight: 1.1,
          }}
        >
          {title}
        </p>
        <p
          style={{
            color: "var(--t-muted, #6b7a99)",
            fontSize: 12,
            marginTop: 6,
          }}
        >
          {sub}
        </p>
      </div>
    </VaultAIPulseBackground>
  );
}

export default function VaultAIPulseBackgroundPreview() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--t-bg, #05070B)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px",
        gap: 20,
      }}
    >
      <p
        style={{
          color: "var(--t-dim, #3d4f6e)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        sandbox — vault ai pulse background
      </p>

      <PreviewCard
        accent="blue"
        intensity="subtle"
        label="Blue · Subtle"
        title="Veronica AI Overview"
        sub="Primary Vault Co pulse — blue orbs, subtle intensity"
        borderColor="rgba(0,129,242,0.15)"
      />

      <PreviewCard
        accent="amber"
        intensity="subtle"
        label="Amber · Subtle"
        title="Revenue Command Hub"
        sub="Gold tier pulse — amber orbs, subtle intensity"
        borderColor="rgba(201,168,76,0.15)"
      />

      <PreviewCard
        accent="dual"
        intensity="medium"
        label="Dual · Medium"
        title="Command Center"
        sub="Blue + amber together — richer presence for hero sections"
        borderColor="rgba(0,129,242,0.12)"
      />

      <PreviewCard
        accent="blue"
        intensity="medium"
        label="Blue · Medium"
        title="Client Intelligence"
        sub="Stronger presence for feature highlight panels"
        borderColor="rgba(0,129,242,0.20)"
      />
    </div>
  );
}
