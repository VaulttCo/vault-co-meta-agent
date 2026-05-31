/**
 * Awesome Design MD — Vault Co Brand Inspiration Framework
 *
 * Governance-only module. Defines which world-class design brands Veronica
 * Design Mode may draw inspiration from, what principles may be extracted,
 * what is absolutely forbidden to copy, and the required transformation
 * process for converting inspiration into original Vault Co design decisions.
 *
 * This file contains no runnable logic beyond the transformation checklist
 * helper. It has no runtime side effects and no external dependencies.
 *
 * Core rule: Veronica extracts PRINCIPLES, not VISUALS.
 * A Vault Co component must never resemble its inspiration source when seen
 * in isolation. If a designer can identify the source brand from the output,
 * the transformation failed.
 *
 * Usage rules enforced by tool-registry.ts:
 *   - Inspiration-only — no production changes from this file alone
 *   - Direct copying of any kind is forbidden
 *   - Every inspired element must complete the Inspiration → Vault transformation process
 *   - Production use requires the anti-copying checklist to pass and approval granted
 */

// ── Approved Inspiration Brands ───────────────────────────────────────────────

export interface InspirationBrand {
  name: string;
  slug: string;
  /** Why this brand is on the list — the unique design quality it represents */
  designSignature: string;
  /** The abstract principles Veronica may extract */
  extractablePrinciples: readonly string[];
  /** The specific visual or brand language that is off-limits */
  forbiddenElements: readonly string[];
  /** Where this brand's influence is most relevant in the Vault Co portal */
  vaultCoRelevance: string;
}

export const APPROVED_INSPIRATION_BRANDS: readonly InspirationBrand[] = [
  {
    name: "Linear",
    slug: "linear",
    designSignature:
      "Ultra-high information density with zero visual noise. Dark command palette aesthetic. Keyboard-first interaction model. Every pixel of chrome earns its place.",
    extractablePrinciples: [
      "High-density tables that remain readable — tight row height, clear typographic hierarchy",
      "Sidebar navigation that communicates depth without taking up space",
      "Status indicators as minimal colored dots — not verbose badges",
      "Command palette pattern: global keyboard shortcut reveals a focused search/action surface",
      "Progress and priority as glanceable, compact visual primitives",
    ],
    forbiddenElements: [
      "Linear's specific purple-to-indigo gradient brand identity",
      "Linear's exact sidebar structure, icon set, and spacing ratios",
      "The Linear logo, wordmark, or any branded visual",
      "Direct recreation of the Linear issue list layout at pixel level",
      "Linear's specific loading animation or skeleton patterns",
    ],
    vaultCoRelevance:
      "Clients table, campaigns list, operator queue, approvals queue — any high-density list view.",
  },
  {
    name: "Stripe",
    slug: "stripe",
    designSignature:
      "Premium dark mode that feels enterprise-grade without feeling cold. Exceptional typographic hierarchy. Data presented with editorial clarity — numbers are the hero.",
    extractablePrinciples: [
      "Revenue numbers rendered at large scale with supporting context at smaller scale below",
      "Section headers that create scannable document-level hierarchy within a single page",
      "Subtle surface layering — depth communicated through opacity, not hard shadows",
      "Dashboard cards that lead with the metric, not the label",
      "Minimal but precise border usage — borders define containment, not decoration",
    ],
    forbiddenElements: [
      "Stripe's specific indigo/violet gradient accents and brand palette",
      "Stripe's exact card shadow style and elevation system",
      "The Stripe logo, wordmark, or S-mark",
      "Stripe's exact Revenue/MRR dashboard layout",
      "Stripe's documentation typography system (which uses a light-mode default)",
    ],
    vaultCoRelevance:
      "Revenue dashboard, client billing metrics, monthly closeout — any page where financial data is primary.",
  },
  {
    name: "Vercel",
    slug: "vercel",
    designSignature:
      "Dark-first terminal aesthetic with civilian-grade polish. Monospace + sans pairing that reads as technical authority. Command-center density without chaos.",
    extractablePrinciples: [
      "Deployment status as a horizontal timeline of discrete, named stages",
      "Monospace code/ID values alongside proportional label text — clear semantic distinction",
      "Activity feed as a vertical timeline with precise timestamps and action types",
      "Function/log output in contained panels — never raw text on raw background",
      "System health indicators: green dot, red dot, grey dot — no verbose state labels",
    ],
    forbiddenElements: [
      "Vercel's specific black-on-white / white-on-black high-contrast brand aesthetic",
      "The Vercel triangle logo or wordmark",
      "Vercel's exact analytics dashboard chart styles",
      "Vercel's specific font pairing (Geist Sans + Geist Mono)",
      "Direct recreation of the Vercel deployment card layout",
    ],
    vaultCoRelevance:
      "AI console, Veronica operator queue, API status views, campaign processing logs.",
  },
  {
    name: "Apple",
    slug: "apple",
    designSignature:
      "Whitespace as a premium signal. Restraint in every element — if it doesn't need to be there, it isn't. Product and data as the subject; UI is invisible infrastructure.",
    extractablePrinciples: [
      "Generous whitespace that makes dense content feel spacious — space is not wasted, it is earned",
      "Typography at its maximum expressive scale — let numbers be large enough to be experienced",
      "Removal of all redundant UI chrome — no borders around things that don't need borders",
      "Transition timing that feels physically real — ease curves tied to perceived material weight",
      "Single-purpose screens: one primary action, everything else subordinate",
    ],
    forbiddenElements: [
      "Apple's SF Pro / New York font families",
      "Apple's specific light-mode design language or white UI surfaces",
      "Apple's exact icon geometry or glyph style",
      "Any Apple product imagery, product names, or trademark visuals",
      "The Apple logo or any Apple brand mark",
    ],
    vaultCoRelevance:
      "Onboarding flows, single-focus action screens, Veronica hero panel — anywhere premium restraint is the design goal.",
  },
  {
    name: "Arc Browser",
    slug: "arc",
    designSignature:
      "Color and space in perfect tension. Sidebar patterns that feel personal without being chaotic. UI that recedes when you are focused and surfaces when you need it.",
    extractablePrinciples: [
      "Sidebar as a living space — not just a list, but a structured workspace",
      "Boosts / pinned items concept: surfacing the most-used items at the top, contextually",
      "Tab/section grouping through color accent + label — not hard borders",
      "Split-view panels that respect the content's native aspect rather than forcing it",
      "Gradual surface revelation — UI appears when relevant, recedes when not",
    ],
    forbiddenElements: [
      "Arc's specific gradient toolbar aesthetic and color themes",
      "The Arc logo, wordmark, or browser chrome appearance",
      "Arc's exact sidebar spacing and icon scale",
      "Arc's specific New Tab / Easel canvas interface",
      "Any Arc-specific browser UI conventions",
    ],
    vaultCoRelevance:
      "Veronica sidebar tools, client workspace navigation, split-panel layouts on detail pages.",
  },
  {
    name: "Notion",
    slug: "notion",
    designSignature:
      "Structured flexibility. Block-based composition that makes complex information feel orderly. Progressive disclosure of depth — simple on the surface, powerful underneath.",
    extractablePrinciples: [
      "Block-level content model: each section is self-contained, movable, independently styled",
      "Database views — the same data expressed as table, board, calendar, or list based on context",
      "Property labels as a consistent visual primitive across all content types",
      "Inline property editing — click to reveal an editor, not a modal",
      "Callout blocks: surfacing important notes or warnings without breaking the reading flow",
    ],
    forbiddenElements: [
      "Notion's specific light-mode default aesthetic",
      "The Notion logo, wordmark, or N-mark",
      "Notion's exact block drag-and-drop visual affordance",
      "Notion's emoji-based icon system",
      "Notion's exact database view toggle appearance",
    ],
    vaultCoRelevance:
      "Client intelligence views, campaign draft builder, multi-view data surfaces on reporting pages.",
  },
  {
    name: "NVIDIA",
    slug: "nvidia",
    designSignature:
      "Dark luxury that signals technical dominance. Performance data as spectacle. GPU-era aesthetics: precise grids, data visualization at scale, green-accent restraint.",
    extractablePrinciples: [
      "Performance metrics visualized as high-contrast bars and gauges — utilization as art",
      "Data-dense monitoring dashboards with clear section hierarchy and no wasted rows",
      "Dark surface with single-accent glow: the accent carries meaning, not decoration",
      "Technical precision in layout — pixel-perfect grid alignment as a premium signal",
      "Status at a glance: entire system health visible without scrolling",
    ],
    forbiddenElements: [
      "NVIDIA's specific green (#76b900) brand accent",
      "The NVIDIA logo, wordmark, or eye logo mark",
      "NVIDIA's exact GPU monitoring dashboard layout (nvidia-smi, NVML-style displays)",
      "NVIDIA's specific product card and hero imagery style",
      "Any NVIDIA GeForce / RTX / CUDA branded visual language",
    ],
    vaultCoRelevance:
      "Analytics dashboards, performance monitoring views, campaign health overview — high-density status displays.",
  },
  {
    name: "Airbnb",
    slug: "airbnb",
    designSignature:
      "Card grids that convert. Trust signals woven into every detail. Search and filter flows that reduce friction to zero. Emotional warmth in a data-heavy context.",
    extractablePrinciples: [
      "Card grid composition: image/visual anchor + headline + 2 supporting facts + price/CTA",
      "Filter UI as a horizontal pill row — lightweight, always visible, state-persistent",
      "Trust signals embedded inline — verification, review count, status — not in a separate section",
      "Map + list split-panel pattern: spatial and tabular views of the same data simultaneously",
      "Micro-copy that anticipates and neutralizes user anxiety at every conversion point",
    ],
    forbiddenElements: [
      "Airbnb's specific coral/red brand accent (#FF5A5F)",
      "The Airbnb logo, wordmark, or Bélo mark",
      "Airbnb's exact listing card layout and photo treatment",
      "Airbnb's specific search bar design",
      "Any hospitality or home-rental visual language",
    ],
    vaultCoRelevance:
      "Client card grid on /clients, creative asset gallery, filter pill rows on any list page.",
  },
  {
    name: "Framer",
    slug: "framer",
    designSignature:
      "Motion as a design language. Components that communicate their own behavior through animation. Playground canvas UI that invites exploration without confusion.",
    extractablePrinciples: [
      "Entry animations that communicate the structure of a page — content reveals its own hierarchy",
      "Hover interactions that telegraph clickability without requiring a cursor change",
      "Layered component depth: foreground/midground/background working together in motion",
      "Canvas-style workspaces: infinite scroll replaced by spatial organization",
      "Transition choreography: elements don't just appear — they arrive with purpose",
    ],
    forbiddenElements: [
      "Framer's specific purple brand accent and dark canvas aesthetic",
      "The Framer logo, wordmark, or F-mark",
      "Framer's exact canvas / infinite board interface",
      "Framer's specific component library card style",
      "Any direct use of Framer-generated animation presets without re-authoring in Framer Motion",
    ],
    vaultCoRelevance:
      "Veronica hero panel, Command Hub landing, sandbox component animations, onboarding transitions.",
  },
] as const;

// ── What Veronica May Borrow ──────────────────────────────────────────────────

export const BORROWABLE_PRINCIPLES = {
  description:
    "These are abstract design principles. They have no brand ownership. They belong to the craft of design itself.",

  hierarchy: [
    "The visual weight relationship between primary, secondary, and tertiary elements",
    "The reading-order implied by size, color, and position — not by explicit numbering",
    "Grid structures that create implicit alignment without visible dividers",
    "Typography scale relationships: heading-to-body size ratios",
    "Z-axis layering: which surfaces appear 'above' others through elevation cues",
  ],

  spacingDiscipline: [
    "Consistent inter-element gaps derived from a base unit (Vault Co uses 4px base)",
    "The principle of intentional whitespace — space as a design decision, not an accident",
    "Padding that is proportional to container size — denser containers get tighter padding",
    "Separation of sections through space rather than through borders wherever possible",
    "The relationship between content density and breathing room — never both extremes at once",
  ],

  interactionRestraint: [
    "Hover states that reveal without distracting — affordance without spectacle",
    "Transition timing that mirrors physical material: fast on exit, slower on enter",
    "Focus states that are visible without being jarring",
    "Feedback that is immediate and proportional to the action's weight",
    "The discipline of doing less: removing interactions that add complexity without value",
  ],

  dashboardClarity: [
    "The 'what needs my attention' scan pattern — alerts before metrics, metrics before detail",
    "Data hierarchy: the number is the hero, the label is the footnote",
    "Status at a glance: the ability to read the system state in under 3 seconds",
    "Grouping by workflow relevance, not by data model — show what goes together in use",
    "The discipline of the single primary metric per card — one number, one purpose",
  ],

  premiumRestraint: [
    "The principle of earned decoration — no element exists for beauty alone",
    "Accent colors as semantic signals, not as decoration — they mean something specific",
    "The fewer elements visible, the more each element communicates",
    "Consistency as a luxury signal — when everything matches, users trust the product",
    "The absence of clutter is itself a premium design statement",
  ],
} as const;

// ── What Veronica Cannot Borrow ───────────────────────────────────────────────

export const FORBIDDEN_ELEMENTS = {
  hardForbidden: [
    "Any logo, wordmark, brand mark, or trademark from any brand",
    "Any exact color palette that visually identifies a specific brand",
    "Any layout that, in isolation, would be recognized as belonging to a specific product",
    "Any icon set or glyph geometry that is proprietary to a brand",
    "Any photography, illustration style, or image treatment that identifies a brand",
    "Any copy, tagline, microcopy, or phrasing lifted from a brand's product or marketing",
    "Any font family that is proprietary or exclusively associated with a brand (SF Pro, Geist, etc.)",
  ],

  softForbidden: [
    "Color combinations so distinctive they carry brand-signal even without the logo (e.g., Stripe's indigo + white)",
    "Layout proportions so specific they recreate a brand's signature view (e.g., Linear's exact issue list)",
    "Animation curves or timing that are signature to a single product (e.g., Apple's spring physics)",
    "Navigation structures that are so closely identified with a product they carry brand association",
    "Empty state illustrations that are stylistically identical to a specific brand's illustration system",
  ],

  identityTest:
    "Ask: if a user of [Brand X] saw this element in isolation, would they think it came from [Brand X]? If yes, the inspiration has become copying. Redesign until the answer is no.",
} as const;

// ── Vault Co Translation Rules ────────────────────────────────────────────────

export const VAULT_TRANSLATION_RULES = {
  description:
    "Every principle borrowed from an inspiration brand must pass through this translation layer before it becomes a Vault Co design decision.",

  mandatoryTransformations: [
    "All colors replaced with Vault Co tokens — no inspiration-brand hex values survive",
    "All fonts replaced with Rajdhani + Manrope — no inspiration-brand typefaces survive",
    "All border-radius values normalized to the Vault Co system (rounded-lg / rounded-xl / rounded-full)",
    "All shadows and glows replaced with Vault Co GLOWS constants from design-principles.ts",
    "All spacing values normalized to the Vault Co 4px base grid",
    "All motion durations normalized to the Vault Co animation constraints (≤ 600ms, ≤ 80ms stagger)",
  ],

  contextAdaptation: [
    "The principle must be applied to a Vault Co context — not transplanted from its original context",
    "Linear's density principle applied to a meta-ads campaign list, not to a software issue tracker",
    "Stripe's number-as-hero principle applied to revenue metrics, not to payment processing data",
    "NVIDIA's monitoring aesthetic applied to AI performance, not to GPU hardware metrics",
    "The output must serve the Vault Co user's workflow — not recreate the inspiration product's workflow",
  ],

  brandSeparation: [
    "The completed component must be reviewed against the anti-copying checklist before promotion",
    "At least one Vault Co-specific design decision must be intentionally distinct from the source",
    "The component must use at least one Vault Co token or design element not present in the source",
    "Document the inspiration source AND the principle extracted — not just 'inspired by Linear'",
  ],
} as const;

// ── Anti-Copying Checklist ────────────────────────────────────────────────────

export interface AntiCopyingCheckItem {
  id: string;
  check: string;
  /** If this fails, the component must be revised before it can proceed */
  blocking: boolean;
}

export const ANTI_COPYING_CHECKLIST: readonly AntiCopyingCheckItem[] = [
  // Visual Identity
  { id: "ac-v01", check: "No brand logo, mark, wordmark, or trademark is present in any form", blocking: true },
  { id: "ac-v02", check: "No proprietary font family from any inspiration brand is in use", blocking: true },
  { id: "ac-v03", check: "No color value that identifies a specific brand (even without the logo) is present", blocking: true },
  { id: "ac-v04", check: "No icon geometry that is proprietary or exclusively associated with a specific brand", blocking: true },
  { id: "ac-v05", check: "No photography treatment or illustration style that identifies a specific brand", blocking: false },

  // Layout and Structure
  { id: "ac-l01", check: "The layout, in isolation, would not be recognized as belonging to a specific product by a user of that product", blocking: true },
  { id: "ac-l02", check: "The column structure, card proportions, and grid ratios are not a pixel-level recreation of an existing product", blocking: true },
  { id: "ac-l03", check: "The navigation structure does not recreate a specific product's chrome or shell", blocking: true },
  { id: "ac-l04", check: "Empty state illustrations or graphics do not resemble a specific brand's illustration system", blocking: false },

  // Copy and Content
  { id: "ac-c01", check: "No headline, tagline, label, or microcopy is lifted from a brand's product or marketing", blocking: true },
  { id: "ac-c02", check: "Placeholder copy (Lorem Ipsum equivalents) does not use brand-specific terminology", blocking: false },
  { id: "ac-c03", check: "No 'inspiration text' from a source brand remains in the component output", blocking: true },

  // Motion and Interaction
  { id: "ac-m01", check: "Animation timing curves are Vault Co standard, not a recreation of a brand's signature physics", blocking: false },
  { id: "ac-m02", check: "Hover interactions are functionally derived, not stylistically cloned from a source", blocking: false },

  // Vault Co Authenticity
  { id: "ac-k01", check: "The component uses at least one Vault Co design token not present in the inspiration source", blocking: true },
  { id: "ac-k02", check: "The inspiration source and the extracted principle are documented in the proposal", blocking: true },
  { id: "ac-k03", check: "At least one intentional design decision makes this distinctly Vault Co, not just 'not-[Brand]'", blocking: true },
] as const;

export type AntiCopyingCheckId = (typeof ANTI_COPYING_CHECKLIST)[number]["id"];

export interface AntiCopyingResult {
  componentName: string;
  inspirationSource: string;
  extractedPrinciple: string;
  reviewedAt: string;
  reviewer: string;
  results: Array<{ id: AntiCopyingCheckId; passed: boolean; notes?: string }>;
  blockingFailures: string[];
  cleared: boolean;
}

export function evaluateAntiCopying(
  componentName: string,
  inspirationSource: string,
  extractedPrinciple: string,
  reviewer: string,
  results: Array<{ id: AntiCopyingCheckId; passed: boolean; notes?: string }>
): AntiCopyingResult {
  const blockingFailures: string[] = [];

  for (const result of results) {
    if (!result.passed) {
      const item = ANTI_COPYING_CHECKLIST.find((i) => i.id === result.id);
      if (item?.blocking) {
        blockingFailures.push(`${item.id}: ${item.check}`);
      }
    }
  }

  return {
    componentName,
    inspirationSource,
    extractedPrinciple,
    reviewedAt: new Date().toISOString(),
    reviewer,
    results,
    blockingFailures,
    cleared: blockingFailures.length === 0,
  };
}

// ── Inspiration → Vault Transformation Process ────────────────────────────────

export const TRANSFORMATION_PROCESS = {
  description:
    "The six-step process for converting a design inspiration into an original Vault Co implementation. All six steps must be completed before a sandbox component is proposed for production.",

  steps: [
    {
      step: 1,
      name: "Identify the Principle, Not the Visual",
      instruction:
        "Name the abstract design principle you observed — not what it looks like, but why it works. 'Linear's issue list is good because high-density rows with consistent left-anchor columns let you scan many items quickly' — not 'I want it to look like Linear.'",
      output: "A one-sentence principle statement that has no brand name in it.",
    },
    {
      step: 2,
      name: "Map the Principle to a Vault Co Context",
      instruction:
        "Identify where in the Vault Co portal this principle is relevant. Which page, which section, which user workflow does it serve? If no current page or workflow benefits from it, park it — don't invent a use case.",
      output: "A specific Vault Co page + section where this principle applies.",
    },
    {
      step: 3,
      name: "Translate to Vault Co Tokens and Brand",
      instruction:
        "Re-implement the principle from scratch using only Vault Co tokens, fonts, spacing, and design constraints. Do not copy markup or CSS. Do not start from the source component's code. Start from the principle.",
      output: "A sandbox component in src/components/sandbox/ built from Vault Co primitives only.",
    },
    {
      step: 4,
      name: "Run the Anti-Copying Checklist",
      instruction:
        "Run evaluateAntiCopying() against the sandbox component. All blocking items must pass. Document the inspiration source and the extracted principle in the checklist result.",
      output: "A passing AntiCopyingResult with cleared: true and all blocking items passing.",
    },
    {
      step: 5,
      name: "Run the Impeccable UI Audit",
      instruction:
        "Run the standard Impeccable UI audit from impeccable-audit.ts against the sandbox component. Score must be ≥ 3.0 to proceed to proposal. Score < 3.0 means rework the component before proposing.",
      output: "A ComponentAuditResult with weightedScore ≥ 3.0.",
    },
    {
      step: 6,
      name: "Write the Promotion Proposal",
      instruction:
        "Document the full chain: inspiration brand → extracted principle → Vault Co context → transformation decisions → anti-copying clearance → impeccable audit score → proposed production placement. Submit for explicit user approval before touching any production file.",
      output: "A written proposal with all six steps documented and explicit user approval received.",
    },
  ],

  prohibited: [
    "Skipping step 1 and going straight to implementation ('I'll just make it look like X')",
    "Starting from a source brand's code or markup and modifying it",
    "Using 'it's just for inspiration' as justification for skipping the anti-copying checklist",
    "Proposing production placement before all six steps are complete",
    "Treating a passing anti-copying check as sufficient — the Impeccable audit is also required",
  ],
} as const;

// ── Brand × Context Applicability Map ────────────────────────────────────────
// Quick reference: which brand's principles are most useful for which Vault Co surface.

export const BRAND_CONTEXT_MAP: Record<string, readonly string[]> = {
  "/clients": ["linear", "airbnb"],
  "/clients/[id]": ["stripe", "linear"],
  "/campaigns": ["linear", "vercel"],
  "/ai-agent": ["vercel", "linear"],
  "/ai-agent/console": ["vercel", "nvidia"],
  "/analytics": ["stripe", "nvidia"],
  "/revenue-dashboard": ["stripe", "nvidia"],
  "/revenue-dashboard/clients/[clientId]": ["stripe", "apple"],
  "/approvals": ["linear", "airbnb"],
  "/creatives": ["airbnb", "framer"],
  "/operator-queue": ["linear", "vercel"],
  "/victoria": ["vercel", "notion"],
  "onboarding": ["apple", "airbnb"],
  "veronica-hero": ["framer", "arc", "apple"],
  "sandbox-components": ["framer", "magic-ui", "aceternity"],
} as const;

export function getBrandsForContext(routeOrSurface: string): readonly InspirationBrand[] {
  const slugs = BRAND_CONTEXT_MAP[routeOrSurface] ?? [];
  return APPROVED_INSPIRATION_BRANDS.filter((b) =>
    (slugs as readonly string[]).includes(b.slug)
  );
}
