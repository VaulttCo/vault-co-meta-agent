/**
 * Vault Co Motion Rules — Framer Motion Governance
 *
 * Defines every approved animation pattern, timing curve, and usage rule
 * for Framer Motion in the Vault Co portal.
 *
 * Status: GOVERNANCE ONLY — not wired into production components yet.
 * Phase 2B will implement these patterns in actual components.
 *
 * Library: framer-motion ^12.40.0 (installed, no components use it yet)
 * Required: "use client" directive on any component that imports framer-motion
 */

import type { Transition, Variants } from "framer-motion";

// ─── Philosophy ───────────────────────────────────────────────────────────────

export const MOTION_PHILOSOPHY = [
  "Motion should feel like a command center — purposeful, never decorative",
  "Animations should reduce cognitive load, not add to it",
  "Entrance animations orient the user; exit animations close context",
  "Data-heavy pages (tables, queues) get NO list-item animations — only wrapper fades",
  "The fastest animation the user won't notice is always the right choice",
  "Never animate elements that haven't changed — motion implies state change",
] as const;

// ─── Approved element types for animation ─────────────────────────────────────

export const ANIMATABLE_ELEMENTS = {
  approved: [
    "Page-level content fade-in on route change (full page wrapper)",
    "Modal/sheet enter and exit (scale + opacity)",
    "Toast/notification slide-in from edge",
    "Sidebar slide-in on mobile (x-axis translate)",
    "Stat value number counting (framer-motion useMotionValue + animate)",
    "Panel stagger on initial page load (max 4 items, 50ms stagger)",
    "Command Hub portal card hover lift (already done in CSS — leave as-is)",
    "Transition overlay on module enter (already in page.tsx — leave as-is)",
    "Empty-state icon entrance (single element, subtle scale)",
    "Tab/filter pill active indicator slide (layout animation)",
  ],

  forbidden: [
    "Individual table rows on scroll-into-view — too many elements, too much motion",
    "Sidebar nav items on every render — nav should be instant",
    "Stat card hover — already handled by CSS (vc-stat-card:hover)",
    "Any element that pulses/loops beyond the vc-dot-live status indicator",
    "Loading skeletons (shimmer is fine in CSS, not framer-motion)",
    "Page exit animations — exits should be instant (navigation feels slow otherwise)",
    "Parallax scrolling effects",
    "Cursor-follow or mouse-tracking effects",
  ],
} as const;

// ─── Timing tokens ────────────────────────────────────────────────────────────

/**
 * All framer-motion transition configs must use these tokens.
 * Never write arbitrary duration/ease values inline.
 */
export const TIMING: Record<string, Transition> = {
  // Instant micro-interactions (under 150ms)
  micro: {
    type: "tween",
    duration: 0.12,
    ease: "easeOut",
  },

  // Standard UI state changes (150–250ms)
  fast: {
    type: "tween",
    duration: 0.18,
    ease: "easeOut",
  },

  // Panel/modal entrances (200–280ms)
  panel: {
    type: "tween",
    duration: 0.22,
    ease: [0.16, 1, 0.3, 1], // custom ease-out-expo
  },

  // Page-level fade-in (250–350ms)
  page: {
    type: "tween",
    duration: 0.28,
    ease: "easeOut",
  },

  // Spring for interactive feedback (feels physical)
  spring: {
    type: "spring",
    stiffness: 400,
    damping: 30,
    mass: 0.8,
  },

  // Gentle spring for layout shifts
  springGentle: {
    type: "spring",
    stiffness: 200,
    damping: 24,
    mass: 1,
  },
} as const;

/** Stagger timing constants — separate from Transition objects */
export const STAGGER = {
  childDelay: 0.05, // 50ms between each sibling
  maxItems:   4,    // never stagger more than 4 siblings
} as const;

// ─── Approved animation variants ─────────────────────────────────────────────

/**
 * Ready-to-use Framer Motion variants.
 * Import these into components — do not define variants inline.
 */

/** Standard page content fade-in */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: TIMING.page,
  },
};

/** Panel entrance — fade + subtle upward drift */
export const panelVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: TIMING.panel,
  },
};

/** Stagger parent container */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.childDelay,
      delayChildren: 0.04,
    },
  },
};

/** Stagger child item */
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: TIMING.fast,
  },
};

/** Modal / dialog entrance */
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: TIMING.panel,
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: TIMING.micro,
  },
};

/** Backdrop fade */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: TIMING.fast },
  exit:    { opacity: 0, transition: TIMING.micro },
};

/** Mobile sidebar slide-in from left */
export const sidebarMobileVariants: Variants = {
  hidden:  { x: "-100%", opacity: 0 },
  visible: { x: 0, opacity: 1, transition: TIMING.panel },
  exit:    { x: "-100%", opacity: 0, transition: TIMING.fast },
};

/** Toast / notification slide-in from top-right */
export const toastVariants: Variants = {
  hidden:  { opacity: 0, x: 40, y: -8 },
  visible: { opacity: 1, x: 0, y: 0, transition: TIMING.panel },
  exit:    { opacity: 0, x: 40, transition: TIMING.fast },
};

/** Empty state icon entrance */
export const emptyStateVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: TIMING.springGentle },
};

// ─── Number animation config ──────────────────────────────────────────────────

/**
 * Config for animating stat/KPI number values using useMotionValue + animate.
 * Apply to VCStat when transitioning from 0 to real data.
 */
export const NUMBER_ANIMATION = {
  duration: 0.6,
  ease: "easeOut",
  formatFn: (v: number) => Math.round(v).toLocaleString(),
  // Only animate numbers that change on first load or on explicit data refresh
  // Do NOT animate on every re-render
} as const;

// ─── Reduced motion ───────────────────────────────────────────────────────────

/**
 * All animated components MUST respect prefers-reduced-motion.
 * Use this config as the fallback transition when reduced motion is detected.
 */
export const REDUCED_MOTION_TRANSITION: Transition = {
  duration: 0,
};

/**
 * Pattern for reduced-motion-aware components:
 *
 * const prefersReducedMotion = useReducedMotion(); // from framer-motion
 * const transition = prefersReducedMotion ? REDUCED_MOTION_TRANSITION : TIMING.panel;
 *
 * <motion.div animate="visible" transition={transition} ... />
 */
export const REDUCED_MOTION_RULE = "Every framer-motion component must call useReducedMotion() and skip animation when true.";

// ─── Implementation checklist ─────────────────────────────────────────────────

export const MOTION_IMPLEMENTATION_CHECKLIST = [
  "[ ] Component has 'use client' directive",
  "[ ] useReducedMotion() is called and respected",
  "[ ] Variant names use pageVariants/panelVariants/etc. from this file — no inline variants",
  "[ ] transition uses a TIMING token from this file — no inline durations",
  "[ ] AnimatePresence wraps conditional renders only (not static lists)",
  "[ ] Element is in ANIMATABLE_ELEMENTS.approved list",
  "[ ] Motion does not block interactivity (no animating clickable elements mid-animation)",
  "[ ] pnpm run build passes before committing",
] as const;

// ─── Phase 2B rollout plan ────────────────────────────────────────────────────

/**
 * Priority order for wiring framer-motion into production components.
 * Do not implement until Phase 2B is approved.
 */
export const PHASE_2B_ROLLOUT = [
  {
    priority: 1,
    component: "Page wrapper fade-in",
    target: "src/components/layout/PortalShell.tsx",
    variant: "pageVariants",
    notes: "Wrap <main> content in motion.main — very low risk, high visual impact",
  },
  {
    priority: 2,
    component: "Modal entrance/exit",
    target: "Add Client modal in src/app/clients/page.tsx",
    variant: "modalVariants + backdropVariants",
    notes: "Use AnimatePresence with modal mount/unmount",
  },
  {
    priority: 3,
    component: "Panel stagger on initial load",
    target: "src/app/ai-agent/page.tsx — Client Intelligence + Fulfillment panels",
    variant: "staggerContainerVariants + staggerItemVariants",
    notes: "Only 4 panels — within staggerMax limit",
  },
  {
    priority: 4,
    component: "Stat value count-up",
    target: "VCStat in VaultUI.tsx",
    variant: "NUMBER_ANIMATION config",
    notes: "Only on initial data load, not on re-renders",
  },
  {
    priority: 5,
    component: "Mobile sidebar slide-in",
    target: "src/components/layout/PortalShell.tsx",
    variant: "sidebarMobileVariants",
    notes: "Replace current CSS transform transition — must check with reduced motion",
  },
] as const;
