// Victoria — Keyword Detector
// Runs synchronously on every transcript chunk before any AI call.
// Fast regex/string matching only — zero latency.
// Flags chunks so the orchestrator knows which agents to trigger.

import type { ObjectionCategory } from "../types";

// ─────────────────────────────────────────────────────────────
// Objection keyword patterns (prospect speech only)
// ─────────────────────────────────────────────────────────────

interface ObjectionPattern {
  category: ObjectionCategory;
  patterns: RegExp[];
}

const OBJECTION_PATTERNS: ObjectionPattern[] = [
  {
    category: "price",
    patterns: [
      /too expensive/i,
      /can't afford/i,
      /out of (?:my )?budget/i,
      /that's a lot/i,
      /cost too much/i,
      /too much money/i,
      /\$[\d,]+\s*(?:is|seems|feels)?\s*(?:too|a lot|high)/i,
      /price (?:is|seems) high/i,
      /cheaper/i,
      /what(?:'s| is) the price/i,
      /how much (?:does|is|do) (?:it|this|that)/i,
    ],
  },
  {
    category: "timing",
    patterns: [
      /not the right time/i,
      /bad timing/i,
      /maybe (?:next|in a few)/i,
      /wait until/i,
      /not right now/i,
      /slow season/i,
      /busy season/i,
      /after (?:the|this) (?:season|winter|summer|year|month)/i,
    ],
  },
  {
    category: "authority",
    patterns: [
      /talk to (?:my )?(?:wife|husband|partner|business partner|co-owner)/i,
      /run it by/i,
      /check with/i,
      /not (?:the only|sole) (?:decision|person)/i,
      /need (?:to|my) partner/i,
      /can't decide (?:alone|by myself)/i,
    ],
  },
  {
    category: "trust",
    patterns: [
      /how do (?:i|we) know/i,
      /prove (?:it|that|to me)/i,
      /seen (?:results|proof)/i,
      /show me (?:results|proof|evidence)/i,
      /guarantee/i,
      /what if (?:it|this) doesn't work/i,
      /track record/i,
      /references/i,
    ],
  },
  {
    category: "agency_skepticism",
    patterns: [
      /burned before/i,
      /tried (?:that|this|agencies?|marketing) before/i,
      /another agency/i,
      /didn't work/i,
      /wasted (?:money|time)/i,
      /last (?:agency|company|person)/i,
      /same (?:story|promise|thing)/i,
      /tired of/i,
      /skeptical/i,
      /fool me/i,
    ],
  },
  {
    category: "already_have_marketing",
    patterns: [
      /already (?:have|doing|running|working with) (?:someone|an agency|marketing|ads)/i,
      /currently (?:work|working) with/i,
      /have (?:someone|a company|an agency|a person)/i,
      /doing (?:our|my) own marketing/i,
      /handle (?:our|my) own/i,
      /in-house/i,
    ],
  },
  {
    category: "cash_flow",
    patterns: [
      /cash (?:is )?tight/i,
      /slow (?:month|season|period|time)/i,
      /not a great time (?:financially|money-wise)/i,
      /short on cash/i,
      /financial(?:ly)? (?:tight|stressed|difficult)/i,
      /money (?:is|isn't|isn't) (?:great|flowing|there)/i,
    ],
  },
  {
    category: "think_about_it",
    patterns: [
      /(?:need to|let me|gonna|going to) (?:think|sleep on it|consider)/i,
      /think about it/i,
      /get back to you/i,
      /give me (?:some|a few|a couple) (?:days|time|weeks)/i,
      /not ready to (?:commit|decide|pull the trigger)/i,
    ],
  },
  {
    category: "send_info",
    patterns: [
      /send (?:me|over|us) (?:some |the )?(?:info|information|details|proposal|pricing|stuff)/i,
      /email me/i,
      /can you (?:email|send)/i,
      /something in writing/i,
      /look it over/i,
      /review (?:it|the information)/i,
    ],
  },
  {
    category: "guarantee",
    patterns: [
      /guarantee/i,
      /guaranteed results/i,
      /what if (?:it|this) doesn't work/i,
      /money back/i,
      /refund/i,
      /no risk/i,
      /promise (?:results|leads|jobs)/i,
    ],
  },
  {
    category: "competitor",
    patterns: [
      /looking at (?:other|a few|some) (?:options|companies|agencies)/i,
      /comparing/i,
      /getting (?:other|a few|more) quotes/i,
      /talking to (?:a few|other|some)/i,
      /another (?:option|company|agency|quote)/i,
    ],
  },
  {
    category: "busy",
    patterns: [
      /too busy/i,
      /slammed right now/i,
      /overwhelmed/i,
      /don't have (?:time|bandwidth)/i,
      /can't take on/i,
      /maxed out/i,
      /swamped/i,
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Buying signal patterns (prospect speech only)
// ─────────────────────────────────────────────────────────────

interface BuyingSignalPattern {
  signal_type: string;
  patterns: RegExp[];
}

const BUYING_SIGNAL_PATTERNS: BuyingSignalPattern[] = [
  {
    signal_type: "onboarding_question",
    patterns: [
      /how (?:long|quickly) (?:does|do|will) (?:it|this|setup|onboarding)/i,
      /how (?:long|soon) (?:to|before|until) (?:we|i|it)/i,
      /how do we (?:get|start|begin)/i,
      /what(?:'s| is) (?:the|our) next step/i,
      /what do we (?:need|have to) (?:do|provide|send)/i,
    ],
  },
  {
    signal_type: "implementation_question",
    patterns: [
      /what do you (?:need|require) from (?:us|me)/i,
      /what (?:information|access|assets) do you need/i,
      /who would we (?:work|deal|talk) with/i,
      /how does (?:this|it) work/i,
      /what(?:'s| is) (?:the|your) process/i,
    ],
  },
  {
    signal_type: "timeline_curiosity",
    patterns: [
      /when (?:could|can|would) we (?:start|begin|get going)/i,
      /how soon/i,
      /when would (?:i|we) (?:see|start|expect) (?:results|leads|calls)/i,
      /turnaround time/i,
    ],
  },
  {
    signal_type: "pricing_specifics",
    patterns: [
      /what(?:'s| is) (?:included|in the price|in that)/i,
      /what do (?:i|we) get/i,
      /what(?:'s| is) the (?:monthly|total|all-in) (?:cost|price|investment)/i,
      /payment (?:plan|options|terms)/i,
    ],
  },
  {
    signal_type: "exclusivity_interest",
    patterns: [
      /(?:are you|do you) work(?:ing)? with (?:my|any|other) competitors/i,
      /(?:is|are) (?:there|we) (?:exclusive|exclusivity)/i,
      /just (?:us|one|one company) in/i,
      /our area(?:'s)? (?:taken|locked|exclusive)/i,
    ],
  },
  {
    signal_type: "reference_request",
    patterns: [
      /(?:can i|could i|can we) (?:talk to|speak with|call) (?:someone|a client|a customer)/i,
      /references/i,
      /case (?:studies|study)/i,
      /examples of (?:your work|what you've done)/i,
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Emotional shift patterns (prospect speech only)
// ─────────────────────────────────────────────────────────────

const EMOTIONAL_SHIFT_PATTERNS: RegExp[] = [
  /honestly/i,
  /to be (?:honest|frank|real)/i,
  /between you and me/i,
  /i(?:'m| am) (?:frustrated|stressed|worried|scared|nervous|anxious)/i,
  /i(?:'m| am) (?:tired of|done with|fed up)/i,
  /i(?:'ve| have) (?:lost|losing) sleep/i,
  /it(?:'s| is) killing (?:me|us)/i,
  /i (?:really|desperately|badly) (?:need|want)/i,
  /excited/i,
  /this (?:sounds|seems|looks) (?:great|perfect|amazing|interesting)/i,
  /i love (?:this|that|the idea)/i,
  /makes sense/i,
  /that(?:'s| is) exactly (?:what|it|the)/i,
];

// ─────────────────────────────────────────────────────────────
// Detection results
// ─────────────────────────────────────────────────────────────

export interface KeywordDetectionResult {
  contains_objection: boolean;
  contains_buying_signal: boolean;
  contains_emotional_shift: boolean;
  objection_keywords_found: string[];
  objection_categories: ObjectionCategory[];
  buying_signal_keywords_found: string[];
  buying_signal_types: string[];
}

export function detectKeywords(
  text: string,
  speaker: "rep" | "prospect"
): KeywordDetectionResult {
  const result: KeywordDetectionResult = {
    contains_objection: false,
    contains_buying_signal: false,
    contains_emotional_shift: false,
    objection_keywords_found: [],
    objection_categories: [],
    buying_signal_keywords_found: [],
    buying_signal_types: [],
  };

  // Only run prospect-speech detection on prospect turns
  if (speaker !== "prospect") return result;

  // Objection detection
  for (const objectionPattern of OBJECTION_PATTERNS) {
    for (const regex of objectionPattern.patterns) {
      const match = text.match(regex);
      if (match) {
        result.contains_objection = true;
        result.objection_keywords_found.push(match[0]);
        if (!result.objection_categories.includes(objectionPattern.category)) {
          result.objection_categories.push(objectionPattern.category);
        }
      }
    }
  }

  // Buying signal detection
  for (const signalPattern of BUYING_SIGNAL_PATTERNS) {
    for (const regex of signalPattern.patterns) {
      const match = text.match(regex);
      if (match) {
        result.contains_buying_signal = true;
        result.buying_signal_keywords_found.push(match[0]);
        if (!result.buying_signal_types.includes(signalPattern.signal_type)) {
          result.buying_signal_types.push(signalPattern.signal_type);
        }
      }
    }
  }

  // Emotional shift detection
  for (const regex of EMOTIONAL_SHIFT_PATTERNS) {
    if (regex.test(text)) {
      result.contains_emotional_shift = true;
      break;
    }
  }

  return result;
}
