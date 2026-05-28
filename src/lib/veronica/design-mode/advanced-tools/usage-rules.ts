/**
 * Vault Co Advanced Design Tool Usage Rules
 *
 * Governance layer for how 21st.dev, Magic UI, and Aceternity UI
 * components may be used within the portal. These rules are enforced
 * during Veronica Design Mode audits before any component ships to prod.
 *
 * All rules are additive on top of the core design principles in
 * ../design-principles.ts and component rules in ../component-rules.ts.
 */

import { COLORS, GLOWS } from "../design-principles";

// ─── 21st.dev Magic MCP Rules ─────────────────────────────────────────────────

export const MAGIC_MCP_RULES = {
  outputDestination:
    "All generated components land in src/components/sandbox/ — never directly in src/components/ui/",

  reviewRequirements: [
    "Strip any hardcoded color values and replace with Vault Co CSS variables",
    "Remove default Tailwind config assumptions (e.g. primary, secondary color names)",
    "Verify no conflicting @layer base or @layer utilities blocks are introduced",
    "Check that generated component does not import from shadcn paths if shadcn is not fully installed",
    "Confirm Framer Motion import is from the already-installed package (framer-motion)",
  ],

  promptingGuidelines: [
    "Always specify 'dark theme, no light mode' in component prompts",
    `Specify background color as '${COLORS.surface}' or 'bg-[#0D1520]'`,
    `Specify primary accent as '${COLORS.blue}' (Vault Co blue)`,
    "Ask for Tailwind v4 compatible output where possible",
    "Request 'no border-radius utilities above rounded-xl'",
  ],

  forbidden: [
    "Do not prompt for full page layouts — components only",
    "Do not accept components with @apply directives that reference undefined utilities",
    "Do not accept components that add new fonts or font imports",
  ],
} as const;

// ─── Magic UI Animation Rules ─────────────────────────────────────────────────

export const MAGIC_UI_ANIMATION_RULES = {
  permittedEffects: [
    "shimmer-text — approved for Veronica hero headline only",
    "border-beam — approved for Veronica console outer border (subtle, slow)",
    "animated-gradient-text — approved for section headers, low opacity",
    "ripple — approved for primary CTA buttons on Command Hub only",
    "dot-pattern / grid-pattern — approved as background texture (10–20% opacity max)",
  ],

  forbiddenEffects: [
    "aurora — too decorative, conflicts with premium restraint principle",
    "confetti / particles — not appropriate for a command center",
    "typing-animation on data fields — interferes with real data legibility",
    "neon-glow or pulsing borders on revenue/data tables",
    "infinite scroll marquees on non-decorative content",
  ],

  animationConstraints: {
    maxDuration: "600ms for enter/exit transitions",
    repeatBehavior: "Never infinite on functional UI — only on decorative backgrounds",
    glowIntensity: `Max shadow spread: 20px. Use GLOWS constants from design-principles.ts`,
    reducedMotion:
      "Every Magic UI component must respect prefers-reduced-motion. Wrap in motion-safe: classes.",
  },

  tokenRemapping: {
    description:
      "Magic UI uses its own color naming. All values must be remapped to Vault Co tokens before use.",
    mappings: {
      "Magic 'primary'":    COLORS.blue,
      "Magic 'secondary'":  COLORS.blueLight,
      "Magic 'background'": COLORS.bgPage,
      "Magic 'foreground'": COLORS.text,
      "Magic 'muted'":      COLORS.muted,
      "Magic 'border'":     COLORS.border,
      "Magic 'accent'":     COLORS.orange,
    },
  },
} as const;

// ─── Aceternity UI Cinematic Component Rules ──────────────────────────────────

export const ACETERNITY_RULES = {
  approvedComponentCategories: [
    "Spotlight / radial glow effects — Veronica hero only",
    "Animated border gradients — panel borders on Veronica console",
    "Background grid / dot patterns — page-level texture (opacity ≤ 0.15)",
    "Card hover tilt — Command Hub module cards only",
    "Text reveal / word fade — Veronica status messaging only",
  ],

  forbiddenComponentCategories: [
    "3D perspective transforms on data tables or stat grids",
    "Parallax scroll effects on any revenue or reporting page",
    "Full-bleed animated backgrounds on client detail pages",
    "Any component that introduces its own color theme or CSS variables",
    "Aceternity components that depend on next-themes (we do not use it)",
  ],

  integrationProcess: [
    "1. Copy component source from ui.aceternity.com into src/components/sandbox/",
    "2. Replace all cn() calls with the existing src/lib/utils.ts cn()",
    "3. Replace hardcoded colors with Vault Co CSS variable equivalents",
    "4. Wrap component in motion-safe: to respect reduced-motion",
    "5. Demo in isolation before proposing for a production page",
    "6. Submit to Veronica Design Mode audit (page-audit.ts) before merging",
  ],

  glowReferenceValues: GLOWS,
} as const;

// ─── Cloning / Inspiration Rules ─────────────────────────────────────────────

export const CLONING_RULES = {
  permitted: [
    "Studying component patterns from Magic UI, Aceternity, shadcn, Radix for implementation ideas",
    "Copying individual utility functions (e.g. cn, animation variants) with full review",
    "Adapting motion patterns from public demos into Vault Co brand-compliant implementations",
  ],

  forbidden: [
    "Cloning entire page layouts from competitor or inspiration sites",
    "Copying components verbatim without token remapping",
    "Running any 'init' or 'add all' commands that touch globals.css or tailwind.config",
    "Installing design systems that define their own CSS variable layer (Chakra, MUI, Mantine)",
  ],

  reviewCheckpoint:
    "Any copy-pasted component must pass the Veronica pre-redesign checklist in ../page-audit.ts before being proposed for production.",
} as const;

// ─── Vault Co Brand Compliance Rules ─────────────────────────────────────────

export const BRAND_COMPLIANCE_RULES = {
  mustPass: [
    "Background is always dark — never pure white, never light gray",
    "Primary accent is Vault Co blue (#0081f2) — not a third-party default",
    "Typography remains Rajdhani (headings) + Manrope (body) — no new fonts",
    "Spacing follows the Vault Co spacing system — no arbitrary padding resets",
    "No rounded corners > rounded-xl (12px) on panels and cards",
    "No box shadows that use rgb colors outside the Vault Co glow palette",
  ],

  automatedChecks: [
    "grep new component source for hardcoded #fff, #ffffff, white — must be zero",
    "grep new component source for font-family: — must be zero new declarations",
    "grep new component source for @layer base — must be zero (protects globals.css)",
    "grep new component source for tailwind.config — must be zero (Tailwind v4 project)",
  ],

  humanApprovalTriggers: [
    "Any glow effect wider than 24px spread",
    "Any animation with duration > 800ms",
    "Any component that adds a new color not in the Vault Co palette",
    "Any full-page or hero section redesign",
    "Any change to Veronica, clients, revenue, or reporting pages",
  ],
} as const;
