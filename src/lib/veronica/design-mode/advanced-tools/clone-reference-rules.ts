/**
 * Clone Reference Rules — Vault Co
 *
 * Governance-only module. Defines how Veronica Design Mode may use website
 * analysis and cloning tools (SkillUI, screenshot analysis, URL inspection,
 * v0-style generation from a reference URL) as design reference — and what is
 * absolutely forbidden.
 *
 * These tools are powerful and carry the highest risk in the design toolchain:
 * they can reproduce third-party layouts, copy proprietary visual systems, and
 * introduce legal or brand-safety problems if used without discipline.
 *
 * Core rule: Reference tools produce OBSERVATIONS, not IMPLEMENTATIONS.
 * Anything generated directly from a URL analysis must never ship to production.
 * The only legal output of a clone reference session is a written principle
 * list that is then independently re-implemented in Vault Co brand language.
 *
 * This file has no runtime side effects. Import for governance checks only.
 */

// ── Allowed Uses ──────────────────────────────────────────────────────────────

export const ALLOWED_USES = {
  description:
    "Clone reference tools may only be used for structured design research. The output of every session is a list of extracted principles — never implementation-ready code or markup.",

  studyTargets: [
    {
      target: "Layout patterns",
      detail:
        "How sections are organized relative to each other: sidebar vs. main content, grid column counts, section stacking order, above-the-fold content priority.",
    },
    {
      target: "Section hierarchy",
      detail:
        "Which section carries primary visual weight, how secondary sections are subordinated, how whitespace creates information tiers.",
    },
    {
      target: "Spacing rhythm",
      detail:
        "The apparent base unit (e.g. 8px or 4px grid), inter-section gaps, card padding, label-to-value proximity. Never copy exact pixel values — extract the ratio.",
    },
    {
      target: "Conversion flow",
      detail:
        "How a page moves a user from awareness to action: CTA placement, progressive disclosure of information, friction reduction patterns, trust signals positioning.",
    },
    {
      target: "Navigation structure",
      detail:
        "Sidebar vs. topbar, depth indicators, active state signals, breadcrumb logic. Extract the principle of wayfinding, not the visual chrome.",
    },
    {
      target: "Empty and loading state patterns",
      detail:
        "How top-tier products handle zero-data screens, skeleton structure, error recovery patterns.",
    },
    {
      target: "Interaction affordances",
      detail:
        "Hover states, focus rings, transition cues, button hierarchy signals. Document the behavioral pattern, not the CSS.",
    },
  ],

  permittedOutputs: [
    "A written list of extracted design principles with no brand identifiers",
    "A sketch or wireframe in abstract form (boxes and labels only — no colors, no icons)",
    "A proposal document describing how a principle will be re-implemented in Vault Co tokens",
    "A sandbox component built from scratch using Vault Co primitives after the principle is extracted",
  ],
} as const;

// ── Forbidden Uses ────────────────────────────────────────────────────────────

export const FORBIDDEN_USES = {
  hardForbidden: [
    "Copying a full website or app page into any Vault Co file, even as a starting point",
    "Copying exact page sections — hero, nav, footer, card grid — into Vault Co files",
    "Importing or pasting any HTML, CSS, JSX, or Tailwind classes generated directly from a URL clone",
    "Using generated code from a clone tool as a scaffold that is 'just cleaned up'",
    "Copying brand assets: logos, icons, illustrations, photography, or proprietary SVGs",
    "Cloning any proprietary UI pattern that is a registered design or trademark",
    "Reproducing any layout that would be recognized as belonging to the source site when seen in isolation",
    "Using a clone tool to extract and re-use a site's exact color palette, even with token renaming",
    "Generating a full page from a reference URL and submitting it as a Vault Co design proposal",
  ],

  softForbidden: [
    "Using a cloned layout as a 'wireframe' that is then 'redesigned' — the source structure still carries IP risk",
    "Referencing a cloned layout in a proposal without completing the full transformation process",
    "Sharing clone-tool output externally (screenshot, export, paste) without legal review",
    "Running a clone analysis on a direct competitor's product in a way that could constitute reverse engineering",
    "Treating a clone session as sufficient research without the structured principle extraction step",
  ],

  legalRisk:
    "Website layouts, UI patterns, and component designs may be protected by trade dress law, copyright (in some jurisdictions), or terms of service. Reproducing a site's layout — even without copying its code — can constitute infringement if the reproduction is substantially similar. The transformation process below is the safe harbor: extract the abstract principle, not the concrete implementation.",
} as const;

// ── URL Analysis Workflow ─────────────────────────────────────────────────────

export const URL_ANALYSIS_WORKFLOW = {
  description:
    "The structured process for analyzing a reference URL using clone or screenshot tools. Every step must be completed in order. The workflow ends at step 4 — never at a generated file.",

  steps: [
    {
      step: 1,
      name: "State the Research Question",
      instruction:
        "Before opening any clone tool, write a one-sentence research question. Example: 'How does Stripe organize its revenue overview dashboard to make the primary metric immediately scannable?' The question must be about a PRINCIPLE, not about copying an element.",
      output: "A written research question with no mention of copying.",
      forbidden: "Opening a clone tool without a written research question first.",
    },
    {
      step: 2,
      name: "Observe — Do Not Export",
      instruction:
        "Use the clone or screenshot tool to observe the reference URL. Take notes on structure, spacing ratios, hierarchy, and interaction patterns. Do NOT export, copy, or save any generated code, HTML, CSS, or Tailwind output.",
      output: "A set of written observations: bullet points describing patterns, not code.",
      forbidden: [
        "Exporting or copying any generated code output",
        "Saving a cloned file to the project directory",
        "Pasting generated markup into any Vault Co file",
      ],
    },
    {
      step: 3,
      name: "Extract the Principle",
      instruction:
        "From your observations, write a principle statement in abstract form — no brand names, no specific colors, no measurements. The principle must describe WHY something works, not WHAT it looks like.",
      output:
        "A principle statement: 'Revenue pages establish hierarchy by rendering the primary metric at 4× the size of supporting metrics, with the label beneath rather than above the value.'",
      forbidden:
        "A principle statement that includes the source brand name, exact pixel values, or visual descriptions tied to that brand.",
    },
    {
      step: 4,
      name: "Map to Vault Co Context",
      instruction:
        "Identify the specific Vault Co page, section, or component where this principle applies. If no current Vault Co surface benefits from the principle, park it and do not implement.",
      output: "A Vault Co page + section mapped to the extracted principle.",
      forbidden: "Implementing the principle on a page that was not explicitly approved.",
    },
    {
      step: 5,
      name: "Complete the Transformation Process",
      instruction:
        "Follow all 6 steps of the Inspiration → Vault transformation process defined in awesome-design-md.ts. The anti-copying checklist must pass before a sandbox component is created.",
      output: "A sandbox component at src/components/sandbox/ built from Vault Co primitives only.",
      forbidden: "Skipping any transformation step because 'the inspiration is just structural'.",
    },
    {
      step: 6,
      name: "Approval Gate",
      instruction:
        "Submit the written proposal — research question, extracted principle, transformation record, anti-copying checklist result, and Impeccable audit score — for explicit user approval before any production file is touched.",
      output: "Written user approval with scope clearly defined.",
      forbidden: "Touching any production file before written approval is received.",
    },
  ],
} as const;

// ── Transformation Rules into Vault Co Design Language ────────────────────────

export const CLONE_TRANSFORMATION_RULES = {
  description:
    "After observing a reference URL, every extracted pattern must be translated through these rules before it may inform a Vault Co component.",

  mandatoryTranslations: [
    "All colors replaced with Vault Co tokens — no hex or RGB values from the reference site survive",
    "All fonts replaced with Rajdhani (headings/values) + Manrope (body) — no reference-site fonts",
    "All spacing values re-derived from the Vault Co 4px base grid — no exact pixel measurements copied",
    "All border-radius values set to the Vault Co system — no reference-site radius values",
    "All shadows and glows replaced with Vault Co GLOWS constants — no reference-site shadow styles",
    "All icons replaced with lucide-react equivalents — no reference-site icon assets",
    "All animation timing re-authored to the Vault Co motion system — no reference-site transitions",
  ],

  structuralRules: [
    "A reference site's grid (e.g. 12-column) informs the PRINCIPLE of column structure, not the exact implementation",
    "A reference site's card proportions inform the RATIO of height-to-width, not the exact pixel dimensions",
    "A reference site's nav depth informs the PRINCIPLE of wayfinding hierarchy, not the exact nav chrome",
    "The Vault Co component must work within the existing VaultUI component system — no new base primitives invented to match a reference",
  ],

  identityBreakers: [
    "Add at least one Vault Co-specific design decision that has no equivalent in the reference source",
    "The completed component must fail the 'source recognition test': a user of the reference site must not recognize the Vault Co output as derived from their product",
    "Document the intentional divergence point: what specific decision makes this Vault Co, not just not-[Brand]",
  ],
} as const;

// ── Legal / Brand Safety Checklist ───────────────────────────────────────────

export interface LegalSafetyCheckItem {
  id: string;
  risk: "legal" | "brand" | "ip" | "tos";
  check: string;
  blocking: boolean;
}

export const LEGAL_BRAND_SAFETY_CHECKLIST: readonly LegalSafetyCheckItem[] = [
  // Legal
  { id: "ls-l01", risk: "legal",  check: "No copyrighted imagery, illustration, or photography from the reference site is present in any Vault Co file", blocking: true },
  { id: "ls-l02", risk: "legal",  check: "No proprietary icon set or glyph geometry from the reference site has been reproduced", blocking: true },
  { id: "ls-l03", risk: "legal",  check: "The completed component is not substantially similar to the reference site layout — a reasonable person would not identify them as the same design", blocking: true },
  { id: "ls-l04", risk: "legal",  check: "No font files or font-face declarations from the reference site have been copied", blocking: true },

  // Intellectual Property
  { id: "ls-i01", risk: "ip",     check: "No HTML, CSS, or JavaScript from the reference site has been copied into any Vault Co file, even with modifications", blocking: true },
  { id: "ls-i02", risk: "ip",     check: "No generated code from a clone tool session has been pasted into any Vault Co file", blocking: true },
  { id: "ls-i03", risk: "ip",     check: "No proprietary interaction pattern (drag-and-drop, canvas behavior, selection model) has been recreated without independent re-implementation", blocking: false },

  // Brand Safety
  { id: "ls-b01", risk: "brand",  check: "No competitor or reference brand is named, referenced, or alluded to in any user-facing Vault Co text, copy, or label", blocking: true },
  { id: "ls-b02", risk: "brand",  check: "No brand color, even if remapped to a different hex value, is used in a combination that creates visual brand association", blocking: false },
  { id: "ls-b03", risk: "brand",  check: "No reference brand's tagline, product name, or marketing copy appears in any Vault Co text", blocking: true },
  { id: "ls-b04", risk: "brand",  check: "The Vault Co component does not imply affiliation, partnership, or endorsement from any reference brand", blocking: true },

  // Terms of Service
  { id: "ls-t01", risk: "tos",    check: "The reference URL analysis was performed for internal design research only — not for commercial reproduction", blocking: false },
  { id: "ls-t02", risk: "tos",    check: "No clone tool output was exported or distributed externally during the analysis session", blocking: true },
  { id: "ls-t03", risk: "tos",    check: "The reference site's robots.txt or terms of service were not violated by the analysis method used", blocking: false },
] as const;

export type LegalSafetyCheckId = (typeof LEGAL_BRAND_SAFETY_CHECKLIST)[number]["id"];

export interface LegalSafetyResult {
  componentName: string;
  referenceUrl: string;
  reviewedAt: string;
  reviewer: string;
  results: Array<{ id: LegalSafetyCheckId; passed: boolean; notes?: string }>;
  blockingFailures: string[];
  cleared: boolean;
}

export function evaluateLegalSafety(
  componentName: string,
  referenceUrl: string,
  reviewer: string,
  results: Array<{ id: LegalSafetyCheckId; passed: boolean; notes?: string }>
): LegalSafetyResult {
  const blockingFailures: string[] = [];

  for (const result of results) {
    if (!result.passed) {
      const item = LEGAL_BRAND_SAFETY_CHECKLIST.find((i) => i.id === result.id);
      if (item?.blocking) {
        blockingFailures.push(`[${item.risk.toUpperCase()}] ${item.id}: ${item.check}`);
      }
    }
  }

  return {
    componentName,
    referenceUrl,
    reviewedAt: new Date().toISOString(),
    reviewer,
    results,
    blockingFailures,
    cleared: blockingFailures.length === 0,
  };
}

// ── Approval Gate ─────────────────────────────────────────────────────────────

export const CLONE_REFERENCE_APPROVAL_GATE = {
  description:
    "The approval gate that must be cleared before any clone-reference-inspired component may be created — even in sandbox.",

  requiredBeforeSandbox: [
    "Written research question submitted and approved by user before clone session begins",
    "URL analysis workflow steps 1–4 completed and documented",
    "Anti-copying checklist from awesome-design-md.ts submitted for review",
    "Legal/brand safety checklist passed with zero blocking failures",
  ],

  requiredBeforeProductionProposal: [
    "All six URL analysis workflow steps complete with documented outputs",
    "Sandbox component built from Vault Co primitives only (no reference site code)",
    "Anti-copying checklist cleared (awesome-design-md.ts evaluateAntiCopying())",
    "Legal/brand safety checklist cleared (evaluateLegalSafety() above)",
    "Impeccable UI audit run with score ≥ 3.0 (impeccable-audit.ts)",
    "UX Flow Approval Checklist completed if the component introduces a new user flow (ux-pro-max.ts)",
    "Written proposal submitted with all of the above documented",
    "Explicit user approval received — scope clearly defined, no open-ended 'proceed as needed'",
  ],

  absoluteBlockers: [
    "Any clone tool output (HTML, CSS, JSX, Tailwind) present in any Vault Co file",
    "Any legal/brand safety blocking failure unresolved",
    "Absence of a written research question — retroactive documentation is not accepted",
    "Production file touched before written approval received",
  ],
} as const;

// ── Sandbox-Only Requirement ──────────────────────────────────────────────────

export const SANDBOX_ONLY_RULE = {
  rule:
    "Every component whose design was informed by a clone reference session — even partially — must spend time as a sandbox component before any production proposal is written.",

  sandboxPath: "src/components/sandbox/",

  sandboxMinimumChecks: [
    "Component renders correctly in isolation with no production page context",
    "Component uses only Vault Co tokens — no reference-site colors, fonts, or spacing values",
    "Component passes the anti-copying checklist",
    "Component passes the legal/brand safety checklist",
    "Component passes the Impeccable UI audit at score ≥ 3.0",
  ],

  sandboxProhibitions: [
    "Importing a sandbox component into any production page file before explicit approval",
    "Using a sandbox component as a direct sub-component of another production component",
    "Treating a sandbox component as 'done' based on visual inspection alone — checklists must run",
    "Committing a sandbox component that contains any reference-site code, even commented out",
  ],

  promotionPath:
    "sandbox → anti-copy cleared → legal cleared → impeccable audit ≥ 3.0 → written proposal → user approval → src/components/ui/ or inline production placement",
} as const;

// ── Summary Formatter ─────────────────────────────────────────────────────────

export function formatLegalSafetySummary(result: LegalSafetyResult): string {
  const status = result.cleared ? "CLEARED" : "BLOCKED";
  const blockers =
    result.blockingFailures.length > 0
      ? `\nBlocking failures:\n${result.blockingFailures.map((b) => `  ✗ ${b}`).join("\n")}`
      : "";

  return [
    `Clone Reference Legal Safety — ${result.componentName}`,
    `Status: ${status} | Reference: ${result.referenceUrl}`,
    `Reviewer: ${result.reviewer} | ${result.reviewedAt}`,
    blockers,
  ]
    .filter(Boolean)
    .join("\n");
}
