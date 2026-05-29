/**
 * Impeccable UI Audit System — Vault Co
 *
 * Structured scoring workflow for evaluating UI components and page sections
 * before they are promoted from sandbox to production or modified in place.
 *
 * This is a static governance module. It does not execute at runtime and has
 * no side effects. Import it to run structured audits in code review tooling,
 * design-mode reports, or AI-assisted pre-redesign analysis.
 *
 * Usage:
 *   1. For sandbox promotion: run PROMOTION_AUDIT_CHECKS against a new component
 *   2. For page section review: run PAGE_SECTION_CHECKS against a target section
 *   3. Score each check 1–5 using the check's own scoringGuide
 *   4. Compute weighted score — see computeAuditScore()
 *   5. Map score to RecommendationLevel — see getRecommendationLevel()
 *   6. Apply the recommendation — Level 1–2 can proceed; Level 3–4 require approval
 */

import { COLORS, DESIGN_PHILOSOPHY } from "../design-principles";

// ── Scoring ────────────────────────────────────────────────────────────────────

/**
 * 1 = critical fail — blocks promotion
 * 2 = poor — requires remediation before promoting
 * 3 = acceptable — conditional pass, document issues
 * 4 = good — promote with minor noted improvements
 * 5 = excellent — promote as-is
 */
export type AuditScore = 1 | 2 | 3 | 4 | 5;

export const SCORE_LABELS: Record<AuditScore, string> = {
  1: "Critical fail — blocks promotion",
  2: "Poor — remediation required",
  3: "Acceptable — conditional pass",
  4: "Good — promote with minor notes",
  5: "Excellent — promote as-is",
};

// ── Pass/fail thresholds ───────────────────────────────────────────────────────

export const PASS_THRESHOLD = 4.0;       // weighted avg ≥ 4.0 → pass
export const CONDITIONAL_THRESHOLD = 3.0; // weighted avg 3.0–3.9 → conditional pass
                                           // weighted avg < 3.0 → fail, hold in sandbox

export type PassFail = "pass" | "conditional-pass" | "fail";

export function getPassFail(weightedScore: number): PassFail {
  if (weightedScore >= PASS_THRESHOLD)       return "pass";
  if (weightedScore >= CONDITIONAL_THRESHOLD) return "conditional-pass";
  return "fail";
}

// ── Recommendation levels ─────────────────────────────────────────────────────

/**
 * Level 1 — Polish only
 *   Score range: 4.0–5.0. Component or section is functionally correct and
 *   visually aligned. Only micro-adjustments needed (token swap, spacing tweak,
 *   label copy). No structural change. No approval gate beyond the standard build check.
 *
 * Level 2 — Component extraction
 *   Score range: 3.0–3.9. Audit reveals a pattern repeated in multiple places,
 *   or a sub-element that should become a named VaultUI primitive. The component
 *   is promotable but the identified pattern should be extracted in a follow-on task.
 *   Requires: documenting the extraction target in VaultUI.tsx or a new ui/ file.
 *
 * Level 3 — Layout restructure
 *   Score range: 2.0–2.9. The section layout is incorrect — wrong hierarchy,
 *   misaligned grid, mobile breakpoint failure, or spacing system violation.
 *   Data and auth logic are safe; only the presentation layer needs rethinking.
 *   Requires: written proposal + explicit user approval before any code is written.
 *
 * Level 4 — Full redesign proposal
 *   Score range: 1.0–1.9. Component or section fails on multiple critical dimensions.
 *   Cannot be patched — needs to be reconceived. May also involve data model changes.
 *   Requires: full audit report, proposal with scope boundaries, phased approval.
 *   Direct redesign is forbidden without completing the approval gate.
 */
export type RecommendationLevel = 1 | 2 | 3 | 4;

export const RECOMMENDATION_LABELS: Record<RecommendationLevel, string> = {
  1: "Polish only — no structural change needed",
  2: "Component extraction — promote with follow-on extraction task",
  3: "Layout restructure — proposal required before coding",
  4: "Full redesign proposal — approval gate mandatory",
};

export function getRecommendationLevel(weightedScore: number): RecommendationLevel {
  if (weightedScore >= 4.0) return 1;
  if (weightedScore >= 3.0) return 2;
  if (weightedScore >= 2.0) return 3;
  return 4;
}

// ── Audit categories ──────────────────────────────────────────────────────────

export type AuditCategory =
  | "layout-hierarchy"
  | "spacing"
  | "typography"
  | "component-consistency"
  | "mobile-responsiveness"
  | "motion-restraint"
  | "data-honesty"
  | "luxury-alignment";

export const CATEGORY_LABELS: Record<AuditCategory, string> = {
  "layout-hierarchy":        "Layout Hierarchy",
  "spacing":                 "Spacing",
  "typography":              "Typography",
  "component-consistency":   "Component Consistency",
  "mobile-responsiveness":   "Mobile Responsiveness",
  "motion-restraint":        "Motion Restraint",
  "data-honesty":            "Data Honesty",
  "luxury-alignment":        "Vault Co Luxury Alignment",
};

// ── Check definition ──────────────────────────────────────────────────────────

export interface AuditCheck {
  /** Unique identifier — use kebab-case */
  id: string;
  category: AuditCategory;
  description: string;
  /** What a passing implementation looks like */
  passCriteria: string;
  /** What a failing implementation looks like */
  failCriteria: string;
  /** Concrete description of what each score looks like for this specific check */
  scoringGuide: Record<AuditScore, string>;
  /**
   * Weight multiplier applied to this check's score.
   * 3 = must-pass (failure here nearly always blocks promotion)
   * 2 = important (failure here triggers conditional-pass at minimum)
   * 1 = nice-to-have (failure here is a note, not a blocker)
   */
  weight: 1 | 2 | 3;
}

// ── Audit check result ────────────────────────────────────────────────────────

export interface AuditCheckResult {
  checkId: string;
  score: AuditScore;
  notes?: string;
  /** Specific code locations or patterns that caused a low score */
  blockers?: string[];
}

// ── Full audit result ─────────────────────────────────────────────────────────

export interface ComponentAuditResult {
  /** e.g. "ClientIntelligenceMetricCard" or "overview-stat-row on /clients/[id]" */
  target: string;
  targetType: "component" | "page-section" | "page";
  auditedAt: string;        // ISO date string
  auditor: string;          // "manual" | "veronica-design-mode" | agent name
  results: AuditCheckResult[];
  /** Weighted average across all checks, rounded to 2 decimal places */
  weightedScore: number;
  passFail: PassFail;
  recommendationLevel: RecommendationLevel;
  /** Ordered list of recommended actions. Level 3–4 items require approval. */
  recommendations: string[];
  /** If any single check scores 1, the whole audit is blocked regardless of average */
  criticalBlockers: string[];
}

// ── Score computation ─────────────────────────────────────────────────────────

export function computeAuditScore(
  checks: AuditCheck[],
  results: AuditCheckResult[]
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const result of results) {
    const check = checks.find((c) => c.id === result.checkId);
    if (!check) continue;
    weightedSum += result.score * check.weight;
    totalWeight += check.weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

export function hasCriticalBlocker(results: AuditCheckResult[]): boolean {
  return results.some((r) => r.score === 1);
}

// ── Audit checks ──────────────────────────────────────────────────────────────
// Each check is independently scoreable. Run all or a category subset.

export const LAYOUT_HIERARCHY_CHECKS: AuditCheck[] = [
  {
    id: "lh-visual-weight",
    category: "layout-hierarchy",
    description: "Primary content has highest visual weight; supporting content is clearly subordinate.",
    passCriteria: "One dominant element (large value, hero stat, or section title) anchors the layout. Supporting elements are visually smaller.",
    failCriteria: "Multiple elements compete for attention at the same visual weight, creating no clear entry point.",
    scoringGuide: {
      1: "No hierarchy — all elements same size, weight, and color. Reader's eye has no path.",
      2: "Weak hierarchy — some size difference but no color or weight differentiation.",
      3: "Partial hierarchy — primary element is larger but supporting elements are too prominent.",
      4: "Good hierarchy — clear primary and secondary levels. Minor tuning needed.",
      5: "Excellent hierarchy — immediate clear focal point, natural eye flow, proper layering.",
    },
    weight: 3,
  },
  {
    id: "lh-grid-alignment",
    category: "layout-hierarchy",
    description: "Elements align to a consistent grid. No orphaned elements or misaligned rows.",
    passCriteria: "All elements snap to a defined grid (e.g. 4-col, 3-col). Cell edges align across rows.",
    failCriteria: "Mixed grid systems in the same section, or elements that break grid without reason.",
    scoringGuide: {
      1: "No grid system evident. Elements float at arbitrary widths.",
      2: "Grid used inconsistently — some rows break it.",
      3: "Grid mostly consistent but 1–2 exceptions exist.",
      4: "Consistent grid with a single justified exception.",
      5: "Perfect grid alignment. Every element belongs to the system.",
    },
    weight: 2,
  },
  {
    id: "lh-section-separation",
    category: "layout-hierarchy",
    description: "Distinct sections are visually separated. No ambiguity about where one section ends and another begins.",
    passCriteria: "Consistent `space-y-5` (20px) between major sections. Panel borders provide containment.",
    failCriteria: "Sections bleed into each other, share no border or separator, or use inconsistent gaps.",
    scoringGuide: {
      1: "No section separation. Everything runs together.",
      2: "Minimal separation — hard to tell where sections begin.",
      3: "Sections separated but inconsistently (some 12px, some 32px).",
      4: "Consistent separation with one minor gap inconsistency.",
      5: "Perfect separation. Consistent spacing system throughout.",
    },
    weight: 2,
  },
];

export const SPACING_CHECKS: AuditCheck[] = [
  {
    id: "sp-padding-consistency",
    category: "spacing",
    description: "Padding inside panels and cards follows the Vault Co system (px-5 py-4 for panels, px-4 py-3 for compact cells).",
    passCriteria: "Panel padding is 20px horizontal / 16px vertical (px-5 py-4). Compact cells are 16px / 12px. Consistent throughout.",
    failCriteria: "Mixed padding values with no clear system. Some elements padded 8px, others 32px, no pattern.",
    scoringGuide: {
      1: "Arbitrary padding everywhere. No relationship between values.",
      2: "Some padding consistency but 3+ different values in use.",
      3: "Two padding systems in use — one primary, one exception.",
      4: "Consistent padding with a single justified deviation.",
      5: "Perfect padding consistency. Matches Vault Co system exactly.",
    },
    weight: 2,
  },
  {
    id: "sp-gap-system",
    category: "spacing",
    description: "Gaps between grid or flex children use consistent values (gap-3 = 12px, gap-4 = 16px, gap-5 = 20px).",
    passCriteria: "Gap values are one of: 8px, 12px, 16px, 20px. Not mixed arbitrarily.",
    failCriteria: "Custom gap values (gap-[7px], gap-[18px]) without justification.",
    scoringGuide: {
      1: "Completely arbitrary gap values.",
      2: "2+ custom gap values not in the spacing system.",
      3: "One custom gap value with a justified reason.",
      4: "System-compliant gaps with one minor exception.",
      5: "All gaps from the Vault Co spacing system.",
    },
    weight: 1,
  },
  {
    id: "sp-no-wasted-space",
    category: "spacing",
    description: "No large empty areas that add no visual function. Space is intentional, not accidental.",
    passCriteria: "Every whitespace region either separates sections (purposeful) or provides breathing room for content (controlled).",
    failCriteria: "Sections with 60px+ of empty space where 20px is sufficient. Cards with very little content and a lot of empty bottom space.",
    scoringGuide: {
      1: "Large dead zones dominate the layout. Feels unfinished.",
      2: "Several sections with too much empty space.",
      3: "One section with excess space that could be tightened.",
      4: "Good density with one intentional but excessive gap.",
      5: "Every space is intentional. Dense without feeling cramped.",
    },
    weight: 1,
  },
];

export const TYPOGRAPHY_CHECKS: AuditCheck[] = [
  {
    id: "ty-font-family",
    category: "typography",
    description: "Only Rajdhani (headings/values) and Manrope (body/labels) are in use. No new fonts introduced.",
    passCriteria: "All large values and headings use `font-family: var(--font-rajdhani)`. All body copy uses the default (Manrope). No @import or font-face added.",
    failCriteria: "New font family introduced. System font fallback used as primary. Default browser font visible.",
    scoringGuide: {
      1: "New font introduced or system font visible.",
      2: "Rajdhani missing from values that should use it.",
      3: "One element using wrong font family.",
      4: "Font family correct with one minor exception.",
      5: "Perfect font family usage throughout.",
    },
    weight: 3,
  },
  {
    id: "ty-size-scale",
    category: "typography",
    description: "Font sizes follow the Vault Co scale: 10px labels, 11–12px body, 13–14px panel headers, 18–28px values/stats.",
    passCriteria: "No arbitrary sizes like 15.5px or text-[17px]. Every size belongs to the scale.",
    failCriteria: "Multiple arbitrary intermediate sizes used. No consistent relationship between text levels.",
    scoringGuide: {
      1: "Arbitrary font sizes with no scale.",
      2: "2+ off-scale sizes.",
      3: "One off-scale size with a marginal justification.",
      4: "Scale-compliant with one documented exception.",
      5: "Perfect adherence to the Vault Co type scale.",
    },
    weight: 2,
  },
  {
    id: "ty-label-style",
    category: "typography",
    description: "Section labels use the vc-label pattern: 10px, uppercase, tracking-widest, var(--t-dim) color.",
    passCriteria: "All section category labels use `vc-label` CSS class or matching inline style. Not mixed with body text.",
    failCriteria: "Labels at body size, not uppercase, or using the wrong color token.",
    scoringGuide: {
      1: "No label system — labels look identical to body copy.",
      2: "Labels present but wrong size, case, or color.",
      3: "Labels correct in most places but inconsistent in one section.",
      4: "Labels correct with one minor deviation.",
      5: "Fully consistent vc-label usage.",
    },
    weight: 1,
  },
];

export const COMPONENT_CONSISTENCY_CHECKS: AuditCheck[] = [
  {
    id: "cc-panel-system",
    category: "component-consistency",
    description: "Section wrappers use VCPanel (or the vc-panel CSS class). No raw bg-[#0D1520] border rounded-xl patterns.",
    passCriteria: "Every distinct content block uses VCPanel or vc-panel. No inline surface+border+radius duplicates.",
    failCriteria: "Raw bg-[#0D1520] border border-[rgba...] rounded-xl patterns used instead of the system component.",
    scoringGuide: {
      1: "No VCPanel usage. All panels are raw divs with hardcoded colors.",
      2: "VCPanel used inconsistently — half raw, half system.",
      3: "VCPanel used mostly but 1–2 raw patterns remain.",
      4: "VCPanel consistent with one approved exception.",
      5: "Perfect VCPanel usage. Zero raw panel patterns.",
    },
    weight: 3,
  },
  {
    id: "cc-stat-primitive",
    category: "component-consistency",
    description: "KPI metric tiles use VCStat from VaultUI. No custom inline stat tiles that duplicate the pattern.",
    passCriteria: "All metric/stat cells use VCStat. Only approved exception: revenue-dashboard/clients/[clientId] local StatCard.",
    failCriteria: "New custom stat tile built inline when VCStat could be used.",
    scoringGuide: {
      1: "Custom stat tiles everywhere, VCStat not used.",
      2: "VCStat available but not used in 3+ places it should be.",
      3: "VCStat used in most places, 1 justified custom exception.",
      4: "VCStat used correctly, one documented deviation.",
      5: "VCStat used everywhere appropriate. Zero duplicates.",
    },
    weight: 2,
  },
  {
    id: "cc-badge-chips",
    category: "component-consistency",
    description: "Status indicators use VCStatusBadge. Category tags use VCChip. No custom inline pill/badge spans.",
    passCriteria: "VCStatusBadge for semantic states (live, paused, review, warning). VCChip for metadata tags. No raw inline spans with matching styles.",
    failCriteria: "Inline spans with custom background/color/border that duplicate VCStatusBadge functionality.",
    scoringGuide: {
      1: "All badges are custom inline spans.",
      2: "VCStatusBadge exists in codebase but not used in this component.",
      3: "Partially used — some custom badges remain.",
      4: "Badge system used correctly with one justified raw span.",
      5: "VCStatusBadge and VCChip used exclusively and correctly.",
    },
    weight: 2,
  },
  {
    id: "cc-color-tokens",
    category: "component-consistency",
    description: "All colors use CSS custom properties (var(--t-*)) or the Vault Co hex constants. No arbitrary hex values.",
    passCriteria: "Background, text, and border colors all reference defined tokens. Accent colors are the 6 approved Vault Co values.",
    failCriteria: "Hex values like #1a2535, #b0bac9, rgba(50,60,80,0.5) that are not in the design token set.",
    scoringGuide: {
      1: "Majority of colors are arbitrary hex values not in the token set.",
      2: "Several off-token colors used.",
      3: "One off-token color with a marginal reason.",
      4: "Token-compliant with one documented exception.",
      5: "100% token-compliant. Zero arbitrary colors.",
    },
    weight: 3,
  },
];

export const MOBILE_RESPONSIVENESS_CHECKS: AuditCheck[] = [
  {
    id: "mr-no-overflow",
    category: "mobile-responsiveness",
    description: "At 390px viewport width, no horizontal overflow occurs. `document.body.scrollWidth === 390`.",
    passCriteria: "Confirmed via Playwright or browser DevTools at 390px. scrollWidth equals viewport width.",
    failCriteria: "Horizontal scroll appears at any mobile breakpoint.",
    scoringGuide: {
      1: "Severe overflow — page is completely broken on mobile.",
      2: "Overflow in multiple sections.",
      3: "Overflow in one section that requires scrolling.",
      4: "No overflow but one element clips slightly without scrolling.",
      5: "Zero overflow. Confirmed at 390px viewport.",
    },
    weight: 3,
  },
  {
    id: "mr-grid-collapse",
    category: "mobile-responsiveness",
    description: "Multi-column grids collapse to 1 or 2 columns on mobile using Tailwind responsive prefixes (sm:, md:, lg:).",
    passCriteria: "Grids use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` pattern. No fixed `grid-cols-4` without responsive prefix.",
    failCriteria: "Fixed column count with no collapse. Cells shrink to unusable widths on mobile.",
    scoringGuide: {
      1: "All grids fixed-column. Mobile layout completely broken.",
      2: "Most grids fixed. Mobile is barely usable.",
      3: "Grids collapse except one that needs a responsive fix.",
      4: "Proper collapse throughout with one minor breakpoint issue.",
      5: "Perfect responsive grid collapse. All viewports tested.",
    },
    weight: 3,
  },
  {
    id: "mr-touch-targets",
    category: "mobile-responsiveness",
    description: "Interactive elements (buttons, links, filter pills) have a minimum 36px touch target height on mobile.",
    passCriteria: "Buttons and clickable elements are at least 36px tall on mobile. Filter pills at least 28px.",
    failCriteria: "Touch targets below 24px — difficult to tap accurately on a phone.",
    scoringGuide: {
      1: "Tiny touch targets throughout — below 20px in several places.",
      2: "Several interactive elements below 28px.",
      3: "One interactive element that's too small.",
      4: "All targets adequate with one borderline element.",
      5: "All touch targets meet or exceed 36px on mobile.",
    },
    weight: 2,
  },
  {
    id: "mr-text-readability",
    category: "mobile-responsiveness",
    description: "Text remains readable at mobile viewport. No truncation of critical labels. No font size below 10px on mobile.",
    passCriteria: "Client names, metric labels, and status badges remain fully readable at 390px without truncation of meaning.",
    failCriteria: "Labels truncate to 2 characters. Numbers overflow their containers. Critical info is invisible on mobile.",
    scoringGuide: {
      1: "Critical information is unreadable on mobile.",
      2: "Several labels truncate or overflow.",
      3: "One label truncates in a minor way.",
      4: "All text readable with one minor overflow on long strings.",
      5: "Perfect readability across all mobile text.",
    },
    weight: 2,
  },
];

export const MOTION_RESTRAINT_CHECKS: AuditCheck[] = [
  {
    id: "mo-reduced-motion",
    category: "motion-restraint",
    description: "All animations are gated on `!useReducedMotion()`. Static render is correct when motion is disabled.",
    passCriteria: "useReducedMotion() called at component root. All animated elements either skip animation or use `initial={false}` when reduced is true.",
    failCriteria: "Animation plays regardless of prefers-reduced-motion system setting.",
    scoringGuide: {
      1: "useReducedMotion not imported. All animations unconditional.",
      2: "useReducedMotion imported but not applied to all animations.",
      3: "Applied to most animations but one unconditional animation exists.",
      4: "Fully respected with one minor edge case.",
      5: "Perfect reduced-motion compliance. Static render verified.",
    },
    weight: 3,
  },
  {
    id: "mo-no-infinite-functional",
    category: "motion-restraint",
    description: "Infinite repeat animations exist only on decorative background elements. No functional UI element loops infinitely.",
    passCriteria: "Infinite animations: only ambient orbs, waveform decorations, dot-grid pulses. Buttons, panels, labels: no infinite loops.",
    failCriteria: "A badge, stat value, or interactive element pulses or loops continuously.",
    scoringGuide: {
      1: "Functional elements animate infinitely — severely distracting.",
      2: "2+ functional elements with infinite animation.",
      3: "One functional element with an infinite animation.",
      4: "All infinite animations are decorative only.",
      5: "Zero infinite animations on functional elements. Decorative use justified.",
    },
    weight: 3,
  },
  {
    id: "mo-duration",
    category: "motion-restraint",
    description: "Entry/exit transition durations are ≤ 600ms. No easing that makes UI feel sluggish.",
    passCriteria: "All entry transitions: 250–400ms. Exit transitions: 150–300ms. No transitions > 600ms on interactive elements.",
    failCriteria: "Entry animations lasting 1s+. UI feels slow to respond.",
    scoringGuide: {
      1: "Transitions > 1000ms on interactive or functional elements.",
      2: "Several transitions between 600–1000ms.",
      3: "One transition slightly over 600ms.",
      4: "All durations within range with one 500ms entry.",
      5: "All durations 250–400ms. Feels snappy and premium.",
    },
    weight: 2,
  },
  {
    id: "mo-stagger-restraint",
    category: "motion-restraint",
    description: "Staggered animations use ≤ 80ms per item delay. Total stagger duration does not exceed 500ms for the full set.",
    passCriteria: "Stagger delay: 50–80ms per item. For 8 items: 0ms to 560ms total. Feels orchestrated, not slow.",
    failCriteria: "150ms+ per item stagger. A 6-item grid takes 900ms to complete — feels broken.",
    scoringGuide: {
      1: "Stagger > 150ms per item or total > 1000ms.",
      2: "Stagger 100–150ms per item.",
      3: "Stagger 80–100ms per item.",
      4: "Stagger 60–80ms per item.",
      5: "Stagger 50–70ms. Feels orchestrated and premium.",
    },
    weight: 1,
  },
];

export const DATA_HONESTY_CHECKS: AuditCheck[] = [
  {
    id: "dh-no-fabrication",
    category: "data-honesty",
    description: "No prop values are hardcoded in JSX when the component is wired to a production page. Every rendered value has a named data source.",
    passCriteria: "All values passed as props come from `client.*`, `intel.*`, or a defined data provider field. No inline `score={75}` or `tier='elite'`.",
    failCriteria: "Hardcoded values that look like real data — `intelligenceScore={72}`, `change='+12%'` — baked into the production wiring.",
    scoringGuide: {
      1: "Multiple fabricated values wired into production rendering.",
      2: "One fabricated value with real data around it.",
      3: "One edge-case fabricated fallback (e.g. ?? 'Elite').",
      4: "All values from real sources; one honest '—' fallback.",
      5: "100% honest data. Every value from a named field or cleanly absent.",
    },
    weight: 3,
  },
  {
    id: "dh-degraded-rendering",
    category: "data-honesty",
    description: "Optional props degrade cleanly when absent. No empty gaps, no broken layout, no placeholder text that implies real data.",
    passCriteria: "Missing `intelligenceScore` hides the gauge section entirely. Missing `tier` renders neutral styling. Missing `phase` hides the chip. No '—' chip labels visible.",
    failCriteria: "Component breaks when optional prop is missing. Or worse: renders a placeholder that looks like real data.",
    scoringGuide: {
      1: "Component crashes or renders broken layout when props are absent.",
      2: "Component renders empty containers or confused layout.",
      3: "Component degrades but leaves small gaps or placeholder artifacts.",
      4: "Clean degradation with one minor cosmetic note.",
      5: "Perfect graceful degradation. No empty gaps, no misleading content.",
    },
    weight: 3,
  },
  {
    id: "dh-change-delta",
    category: "data-honesty",
    description: "Trend indicators (up/down arrows, percentage change) are only shown when a real delta value exists from the data model.",
    passCriteria: "No changeType, no change badge rendered. If a delta exists in the data, it is displayed with the correct direction.",
    failCriteria: "Trend badges hardcoded or always shown as 'up' regardless of data.",
    scoringGuide: {
      1: "Hardcoded trend directions shown on all metrics.",
      2: "Trends shown on most metrics without real delta data.",
      3: "One metric shows a trend without a real delta source.",
      4: "Trends only shown when real delta exists, with one uncertain edge case.",
      5: "Trends shown only from real historical delta. Zero synthetic deltas.",
    },
    weight: 3,
  },
];

export const LUXURY_ALIGNMENT_CHECKS: AuditCheck[] = [
  {
    id: "la-dark-base",
    category: "luxury-alignment",
    description: "Background is always dark. No white or light-gray surfaces in the dark theme render path.",
    passCriteria: "All surfaces use var(--t-surface), var(--t-surface-2), or var(--t-bg). No #fff, #ffffff, or white class in this component's dark-mode render.",
    failCriteria: "White or light surfaces visible in dark mode.",
    scoringGuide: {
      1: "Component has white backgrounds in dark mode.",
      2: "Light surfaces in 2+ places.",
      3: "One light surface that appears in edge case.",
      4: "Dark throughout with one borderline light element.",
      5: "100% dark surfaces. No light bleed.",
    },
    weight: 3,
  },
  {
    id: "la-accent-restraint",
    category: "luxury-alignment",
    description:
      `${DESIGN_PHILOSOPHY[2]} — One dominant accent per component. Blue for AI/active, gold for revenue/priority, orange for action/warning. Not all three at once.`,
    passCriteria: "One primary accent anchors the component. A secondary accent is used sparingly (one element). No three-accent component.",
    failCriteria: "Blue + amber + orange all used at similar visual weight in one component.",
    scoringGuide: {
      1: "Three or more accent colors competing at equal weight.",
      2: "Two accents at the same weight with no clear hierarchy.",
      3: "Primary + secondary accent with a slight imbalance.",
      4: "Clean primary + secondary hierarchy with correct semantic usage.",
      5: "Perfect accent restraint. One dominant accent, premium feel.",
    },
    weight: 2,
  },
  {
    id: "la-border-radius",
    category: "luxury-alignment",
    description: "Border radius does not exceed `rounded-xl` (12px) on panels and cards. Small elements may use `rounded-lg` (8px) or `rounded-full`.",
    passCriteria: "Panels: rounded-xl (12px). Inner cells: rounded-lg (8px) or rounded-xl. Pills: rounded-full. No rounded-3xl or rounded-[20px]+ on panels.",
    failCriteria: "Overly rounded cards that feel like consumer SaaS rather than a command center.",
    scoringGuide: {
      1: "Rounded-3xl or larger on main panels. Feels like a mobile app.",
      2: "Several elements exceed rounded-xl.",
      3: "One element slightly over rounded-xl.",
      4: "Correct radius throughout with one justified rounded-2xl.",
      5: "Perfect radius system. Command-center feel preserved.",
    },
    weight: 1,
  },
  {
    id: "la-glow-restraint",
    category: "luxury-alignment",
    description: "Glow effects (box-shadow, drop-shadow, radial-gradient background) are subtle. Max spread 20px. Not stacked on the same element.",
    passCriteria: "Glow used on icon rings, accent top-borders, or orbs. Not on every element. Never two glow sources on the same element.",
    failCriteria: "Heavy glow on all cards simultaneously, creating a neon look rather than premium restraint.",
    scoringGuide: {
      1: "Heavy glow on every element. Neon effect, not luxury.",
      2: "Glow overused — 5+ elements glowing at similar intensity.",
      3: "Glow used on 3 elements but one is too intense.",
      4: "Glow used on 1–2 elements at appropriate intensity.",
      5: "Single, precise glow application. Premium restraint.",
    },
    weight: 2,
  },
];

// ── Full check set ─────────────────────────────────────────────────────────────

/** All checks — use for a full component or page-section audit */
export const ALL_AUDIT_CHECKS: AuditCheck[] = [
  ...LAYOUT_HIERARCHY_CHECKS,
  ...SPACING_CHECKS,
  ...TYPOGRAPHY_CHECKS,
  ...COMPONENT_CONSISTENCY_CHECKS,
  ...MOBILE_RESPONSIVENESS_CHECKS,
  ...MOTION_RESTRAINT_CHECKS,
  ...DATA_HONESTY_CHECKS,
  ...LUXURY_ALIGNMENT_CHECKS,
];

/** Minimal check set for sandbox promotion decisions — focus on the blockers */
export const PROMOTION_AUDIT_CHECKS: AuditCheck[] = ALL_AUDIT_CHECKS.filter(
  (c) => c.weight === 3
);

/** Component-only subset — skips page-level layout hierarchy checks */
export const COMPONENT_AUDIT_CHECKS: AuditCheck[] = ALL_AUDIT_CHECKS.filter(
  (c) =>
    c.category !== "layout-hierarchy" ||
    c.id === "lh-visual-weight"
);

// ── Automated grep checks ──────────────────────────────────────────────────────
// Run these against the component file before scoring. Failures here automatically
// force score 1 on the corresponding check.

export const AUTOMATED_GREP_CHECKS = {
  /** Presence of any of these in the component file → score 1 on la-dark-base */
  lightSurfaces: [
    "#fff",
    "#ffffff",
    "bg-white",
    "bg-gray-",
    "bg-slate-",
    "background: white",
    "background-color: white",
  ],

  /** Presence of any of these → score 1 on ty-font-family */
  newFonts: [
    "@import url(",
    "@font-face",
    "font-family: 'Inter'",
    "font-family: 'Poppins'",
    "font-family: 'DM Sans'",
  ],

  /** Presence of any of these → score 1 on mo-reduced-motion */
  unconditionalAnimation: [
    "animate-spin",
    "animate-pulse",
    "animate-bounce",
    "animate-ping",
  ],

  /** Presence of any of these in production wiring (not sandbox) → score 1 on dh-no-fabrication */
  fabricatedValues: [
    "intelligenceScore={",
    "tier=\"elite\"",
    "tier=\"growth\"",
    "tier=\"standard\"",
    "change=\"+",
    "change=\"-",
    "changeType=\"up\"",
    "changeType=\"down\"",
  ],

  /** Presence → score 1 on cc-color-tokens (arbitrary hex in non-token context) */
  arbitraryHex: [
    "bg-\\[#(?!0D1520|13151c|0f1a28|152030)",
  ],
} as const;

// ── Reference colors used in luxury checks ────────────────────────────────────
export const APPROVED_ACCENT_COLORS = [
  COLORS.blue,
  COLORS.orange,
  COLORS.gold,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
] as const;

// ── Summary report helper ─────────────────────────────────────────────────────

/** Generate a concise text summary of an audit result for inclusion in a PR or report */
export function formatAuditSummary(result: ComponentAuditResult): string {
  const level = RECOMMENDATION_LABELS[result.recommendationLevel];
  const status = result.passFail.toUpperCase();
  const blocker = result.criticalBlockers.length > 0
    ? `\nBLOCKERS: ${result.criticalBlockers.join(", ")}`
    : "";

  return [
    `Impeccable Audit — ${result.target}`,
    `Status: ${status} | Score: ${result.weightedScore} / 5.0`,
    `Recommendation: Level ${result.recommendationLevel} — ${level}`,
    blocker,
    result.recommendations.length > 0
      ? `\nRecommendations:\n${result.recommendations.map((r) => `  • ${r}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
