// Victoria — Missed Opportunity Detector
// Analyzes the COMPLETE call transcript to surface every moment where value was left on the table.
// Rule-based, synchronous — no AI, no I/O.
// Server-side only.

import type { LiveCallSession, MissedOpportunity, MissedOpportunityType, TranscriptChunk } from "../../types";

// ─────────────────────────────────────────────────────────────
// Pattern libraries
// ─────────────────────────────────────────────────────────────

const EMOTIONAL_SIGNAL_WORDS = [
  /\b(frustrated|frustration|frustrating)\b/i,
  /\b(stressed|stressful|stress)\b/i,
  /\b(overwhelmed|overwhelming)\b/i,
  /\b(scared|scary|afraid|fear)\b/i,
  /\b(worried|worrying|worry|concerned)\b/i,
  /\b(struggling|struggle)\b/i,
  /\b(desperate|desperately)\b/i,
  /\b(stuck|stagnant)\b/i,
  /\b(embarrassing|embarrassed)\b/i,
  /\b(burned|burnt|burned before|been burned)\b/i,
  /\b(failed|failing|failure)\b/i,
  /\b(exhausted|tired of)\b/i,
  /\b(behind|falling behind|can't keep up)\b/i,
  /\b(losing (jobs|leads|clients|money|ground))\b/i,
  /\b(wasting money|throwing money)\b/i,
];

const EMOTIONAL_ACKNOWLEDGMENT = [
  /i hear you/i,
  /that makes sense/i,
  /i can (imagine|understand|see)/i,
  /that (sounds|must be)/i,
  /tell me more about/i,
  /what does that mean for you/i,
  /how long has that/i,
  /how has that affected/i,
  /that's (important|significant|real)/i,
  /sounds like (that's|you're|this)/i,
  /i appreciate you sharing/i,
  /circle back.{0,20}said/i,
];

const BUYING_SIGNAL_PATTERNS = [
  /\b(how does it work|how would it work)\b/i,
  /\b(what('s| is) (the|your) process)\b/i,
  /\b(when (can|could) (we|you) (start|begin|get started))\b/i,
  /\b(what (would|does) it cost)\b/i,
  /\b(this (sounds|seems|looks) (good|great|interesting|promising))\b/i,
  /\b(i('m| am) (definitely|seriously|really) (interested|considering))\b/i,
  /\b(tell me more (about the|about your) (pricing|program|package|system))\b/i,
  /\b(what results (have you|do you) (seen|get|get for))\b/i,
  /\b(how soon (can|could) we)\b/i,
  /\b(i (want|need) to (do this|get started|move forward))\b/i,
  /\b(what('s| is) the next step)\b/i,
  /\b(how do (we|i) (sign up|get started|move forward))\b/i,
];

const TRIAL_CLOSE_PATTERNS = [
  /what would (it|that) take/i,
  /what would need to (be true|happen)/i,
  /if (that|the|we could|i could).{0,30}(would you|would that)/i,
  /sounds like (you're|you are) (seeing|thinking|considering)/i,
  /what (else|other than that) is/i,
  /is there anything else/i,
  /besides (that|the)/i,
  /make sense to (move forward|get started)/i,
  /ready to (get started|move forward|take the next)/i,
  /what would getting started/i,
];

const PITCH_PATTERNS = [
  /our (platform|system|program|service|solution|product)/i,
  /vault co (offers|provides|gives|helps|can)/i,
  /\b(we offer|we provide|we help|we give|we use|we have)\b/i,
  /\b(60.day|sixty.day)\b/i,
  /\b(our campaign|our ads|our strategy|our approach|our method)\b/i,
  /\b(feature|dashboard|portal|crm|software|tool|technology)\b/i,
  /\bincluded (in|with) (the|our|your) (program|package|plan)\b/i,
  /\b(roi|return on investment)\b/i,
  /\bstart(ing)? at \$|pricing starts/i,
];

const OBJECTION_PHRASES = [
  /\b(too expensive|can't afford|costs? (too much|a lot))\b/i,
  /\b(budget|don't have the (money|budget|funds))\b/i,
  /\b(need to (think|sleep on it|consider|talk to))\b/i,
  /\b(not (sure|ready|the right time))\b/i,
  /\b(let me think)\b/i,
  /\b(send me (the|some|more) (info|information|details))\b/i,
  /\b(already (have|use|using|working with))\b/i,
  /\b(tried (that|an agency|marketing|ads) before)\b/i,
  /\b(talk to my (wife|husband|partner|business partner))\b/i,
  /\b(competitor|another (company|agency|option))\b/i,
];

const OBJECTION_ISOLATION_PHRASES = [
  /besides that/i,
  /other than (that|the)/i,
  /if (that|the price|that weren't)/i,
  /is (that|the price|cost) the only/i,
  /anything else/i,
  /only (thing|concern|issue|problem|obstacle)/i,
  /what else/i,
];

const SHALLOW_QUESTION_PATTERNS = [
  /^(is|are|do|does|did|can|have|has|was|were|will|would|could|should) .{0,40}\?$/i,
];

const FAILED_CLOSE_RETREAT = [
  /okay,? (sure|understood|got it|no problem)/i,
  /no worries/i,
  /take your time/i,
  /\b(whenever you're ready|when you're ready)\b/i,
  /\b(we can always (revisit|come back|chat later))\b/i,
  /\b(that's (fine|okay|alright|totally fine|completely fine))\b/i,
  /\b(i'll (send|follow up|be in touch|circle back))\b/i,
];

const FAILED_CLOSE_DEFLECT = [
  /\b(think about it|think it over)\b/i,
  /\b(not (the right|a good|the best) time)\b/i,
  /\b(busy|slammed|swamped)\b/i,
  /\b(call me (back|next week|in a few))\b/i,
  /\b(talk to (my|the) (wife|husband|partner))\b/i,
  /\b(get back to you|let you know)\b/i,
];

const TRUST_BREAK_PATTERNS = [
  /\b(actually,? (you|what|the thing|the reality))\b/i,
  /\b(but (actually|the truth is|the reality is))\b/i,
  /\b(you're wrong|that's not right|that's incorrect)\b/i,
  /\bno, (but|the thing|what)\b/i,
  /\b(trust me|believe me|i promise)\b/i,
  /\b(every (client|customer|contractor|business) (we work with|we've worked with))\b/i,
];

const CLOSE_LANGUAGE = [
  /\b(ready to (get started|move forward|begin|go))\b/i,
  /\b(want to (get started|move forward|do this))\b/i,
  /\b(make sense to (move|get|go|start))\b/i,
  /\b(next step (would be|is to|is for|would))\b/i,
  /\b(get you (started|set up|onboarded|enrolled))\b/i,
  /\b(what would (it|that) take (to|for) (get|move|start))\b/i,
  /\b(let's (get started|move forward|do this|go ahead))\b/i,
  /\b(can we (go ahead|move forward|get started))\b/i,
  /\b(are you (ready|good|set) to)\b/i,
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) return m[0];
  }
  return null;
}

function makeId(type: MissedOpportunityType, idx: number): string {
  return `missed_${type}_${idx}`;
}

function repTurnsAfter(transcript: TranscriptChunk[], fromIndex: number, count: number): TranscriptChunk[] {
  return transcript
    .filter((c) => c.chunk_index > fromIndex && c.speaker === "rep")
    .slice(0, count);
}

// ─────────────────────────────────────────────────────────────
// Individual detectors
// ─────────────────────────────────────────────────────────────

function detectEmotionalIgnores(session: LiveCallSession): MissedOpportunity[] {
  const { transcript } = session;
  const results: MissedOpportunity[] = [];

  for (let i = 0; i < transcript.length - 1; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "prospect") continue;

    const hasEmotionalSignal = matchesAny(chunk.text, EMOTIONAL_SIGNAL_WORDS);
    if (!hasEmotionalSignal) continue;

    // Get next 2 rep turns
    const nextRepTurns = repTurnsAfter(transcript, chunk.chunk_index, 2);
    if (nextRepTurns.length === 0) continue;

    const nextRepText = nextRepTurns.map((c) => c.text).join(" ");
    const acknowledged = matchesAny(nextRepText, EMOTIONAL_ACKNOWLEDGMENT);
    const pivotedToPitch = matchesAny(nextRepText, PITCH_PATTERNS);

    if (!acknowledged && pivotedToPitch) {
      const signal = firstMatch(chunk.text, EMOTIONAL_SIGNAL_WORDS) ?? "emotional signal";
      results.push({
        id: makeId("emotional_cue_ignored", i),
        chunk_index: chunk.chunk_index,
        type: "emotional_cue_ignored",
        severity: "critical",
        what_happened: `Prospect revealed emotional pain ("${signal}") — rep pivoted to pitch without acknowledging it`,
        why_it_mattered: "Emotional acknowledgment is the gateway to deeper trust. When ignored, the prospect feels unheard and closes down.",
        what_should_have_happened: `Rep should have mirrored: "I hear that — what's been the real impact of that on you and your business?" Then paused and listened.`,
        evidence: `"${chunk.text.slice(0, 80)}…"`,
      });
    } else if (!acknowledged && !pivotedToPitch) {
      results.push({
        id: makeId("emotional_cue_ignored", i),
        chunk_index: chunk.chunk_index,
        type: "emotional_cue_ignored",
        severity: "high",
        what_happened: `Prospect showed emotional vulnerability — rep moved on without acknowledging it`,
        why_it_mattered: "Emotional signals are buying signals in disguise. Skipping them leaves pain on the table and trust unbuilt.",
        what_should_have_happened: `Rep should have slowed down: "Before we move on — what you said about [that] — tell me more."`,
        evidence: `"${chunk.text.slice(0, 80)}…"`,
      });
    }
  }

  return results;
}

function detectBuyingSignalIgnores(session: LiveCallSession): MissedOpportunity[] {
  const { transcript } = session;
  const results: MissedOpportunity[] = [];

  for (let i = 0; i < transcript.length - 1; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "prospect") continue;
    if (!chunk.contains_buying_signal && !matchesAny(chunk.text, BUYING_SIGNAL_PATTERNS)) continue;

    const nextRepTurns = repTurnsAfter(transcript, chunk.chunk_index, 2);
    if (nextRepTurns.length === 0) continue;

    const nextRepText = nextRepTurns.map((c) => c.text).join(" ");
    const usedTrialClose = matchesAny(nextRepText, TRIAL_CLOSE_PATTERNS);
    const pitchedInstead = matchesAny(nextRepText, PITCH_PATTERNS);

    if (!usedTrialClose && pitchedInstead) {
      results.push({
        id: makeId("buying_signal_ignored", i),
        chunk_index: chunk.chunk_index,
        type: "buying_signal_ignored",
        severity: "critical",
        what_happened: "Prospect signaled buying interest — rep responded by dumping more features instead of trial closing",
        why_it_mattered: "Buying signals are the green light. Continuing to pitch after one is lit burns the trust and overwhelms the buyer.",
        what_should_have_happened: `Rep should have stopped and asked: "It sounds like you see how this could work for you — what would need to happen to move forward?"`,
        evidence: `"${chunk.text.slice(0, 80)}…"`,
      });
    } else if (!usedTrialClose && !pitchedInstead) {
      results.push({
        id: makeId("buying_signal_ignored", i),
        chunk_index: chunk.chunk_index,
        type: "buying_signal_ignored",
        severity: "high",
        what_happened: "Prospect showed interest — rep missed the cue and continued without a trial close",
        why_it_mattered: "Every missed trial close is a missed momentum step. The prospect's energy peaks here — it must be captured.",
        what_should_have_happened: `Rep should have asked: "You said [X] — what would getting that result mean for you?"`,
        evidence: `"${chunk.text.slice(0, 80)}…"`,
      });
    }
  }

  return results.slice(0, 4);
}

function detectObjectionNotIsolated(session: LiveCallSession): MissedOpportunity[] {
  const { transcript } = session;
  const results: MissedOpportunity[] = [];

  for (let i = 0; i < transcript.length - 1; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "prospect") continue;
    if (!chunk.contains_objection && !matchesAny(chunk.text, OBJECTION_PHRASES)) continue;

    const nextRepTurns = repTurnsAfter(transcript, chunk.chunk_index, 2);
    if (nextRepTurns.length === 0) continue;

    const nextRepText = nextRepTurns.map((c) => c.text).join(" ");
    const isolated = matchesAny(nextRepText, OBJECTION_ISOLATION_PHRASES);

    if (!isolated) {
      const objMatch = firstMatch(chunk.text, OBJECTION_PHRASES);
      results.push({
        id: makeId("objection_not_isolated", i),
        chunk_index: chunk.chunk_index,
        type: "objection_not_isolated",
        severity: "high",
        what_happened: `Prospect raised an objection ("${objMatch ?? "concern"}") — rep tried to handle it without isolating it first`,
        why_it_mattered: "Handling an objection that might be a smokescreen wastes everyone's time and signals inexperience. Isolation reveals the real blocker.",
        what_should_have_happened: `Rep should have said: "I appreciate you sharing that. Besides [the objection], is there anything else that would prevent you from moving forward today?"`,
        evidence: `"${chunk.text.slice(0, 80)}…"`,
      });
    }
  }

  return results.slice(0, 3);
}

function detectShallowProbing(session: LiveCallSession): MissedOpportunity[] {
  const { transcript } = session;
  const results: MissedOpportunity[] = [];

  for (let i = 0; i < transcript.length - 1; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "rep") continue;

    const wordCount = chunk.text.split(/\s+/).filter(Boolean).length;
    if (wordCount > 10) continue; // Not a short turn
    if (!chunk.text.trim().endsWith("?")) continue; // Not a question

    // Check if it's a yes/no question
    const isYesNo = matchesAny(chunk.text, SHALLOW_QUESTION_PATTERNS);
    if (!isYesNo) continue;

    // Check if prospect actually gave a substantive answer (> 20 words)
    const prospectResponse = transcript.find(
      (c) => c.chunk_index > chunk.chunk_index && c.speaker === "prospect"
    );

    if (!prospectResponse) continue;

    const prospectWordCount = prospectResponse.text.split(/\s+/).filter(Boolean).length;
    if (prospectWordCount > 20) continue; // Prospect gave a real answer — not shallow

    results.push({
      id: makeId("shallow_probing", i),
      chunk_index: chunk.chunk_index,
      type: "shallow_probing",
      severity: "medium",
      what_happened: `Rep asked a closed/surface question that yielded a minimal response`,
      why_it_mattered: "Yes/no questions shut down conversation flow and prevent you from discovering the emotional depth needed to close.",
      what_should_have_happened: `Instead of "${chunk.text.slice(0, 50).trim()}", ask: "Tell me more about that — what does that look like day-to-day?"`,
      evidence: `Rep: "${chunk.text.slice(0, 50).trim()}" → Prospect: "${prospectResponse.text.slice(0, 50).trim()}"`,
    });
  }

  return results.slice(0, 3);
}

function detectPrematurePitchingMissed(session: LiveCallSession): MissedOpportunity[] {
  const { transcript } = session;
  const depthScore = session.discovery.depth_score;

  if (depthScore >= 45) return []; // Discovery was adequate — not premature

  const results: MissedOpportunity[] = [];

  for (let i = 0; i < transcript.length; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "rep") continue;
    if (!matchesAny(chunk.text, PITCH_PATTERNS)) continue;

    // Only flag early chunks where discovery was still shallow
    if (chunk.chunk_index > transcript.length * 0.6) continue; // Past 60% of call

    results.push({
      id: makeId("premature_pitching", i),
      chunk_index: chunk.chunk_index,
      type: "premature_pitching",
      severity: "critical",
      what_happened: `Rep pitched Vault Co at discovery depth ${depthScore}/100 — pain was not vivid enough`,
      why_it_mattered: "Prospects don't buy features — they buy solutions to painful problems. Pitching before the pain is vivid means selling to a cold lead inside a warm call.",
      what_should_have_happened: `Rep should have stayed in discovery: "Before I go there — I want to make sure I understand the full picture. Financially, what's this costing you each month?"`,
      evidence: `Discovery depth: ${depthScore}/100. "${chunk.text.slice(0, 70)}…"`,
    });

    if (results.length >= 2) break;
  }

  return results;
}

function detectLostMomentum(session: LiveCallSession): MissedOpportunity[] {
  const { timeline } = session;
  const results: MissedOpportunity[] = [];

  const momentumDeclines = timeline.filter(
    (e) => e.event_type === "momentum_declining" || e.event_type === "trust_declining"
  );

  for (const evt of momentumDeclines.slice(0, 2)) {
    // Look at what the rep was doing around this time
    const repChunksAround = session.transcript.filter(
      (c) => c.speaker === "rep" && Math.abs(c.chunk_index - evt.chunk_index) <= 2
    );
    const repText = repChunksAround.map((c) => c.text).join(" ");
    const wasPitching = matchesAny(repText, PITCH_PATTERNS);

    results.push({
      id: makeId("lost_momentum", evt.chunk_index),
      chunk_index: evt.chunk_index,
      type: "lost_momentum",
      severity: "high",
      what_happened: `Deal momentum dropped around chunk ${evt.chunk_index}${wasPitching ? " — rep was pitching" : ""}`,
      why_it_mattered: "Momentum loss is a leading indicator of a deal dying. Once it drops, it's very hard to recover without a sharp emotional re-engagement.",
      what_should_have_happened: `Rep should have sensed the shift and pivoted: "I notice you seem a little hesitant — what's going through your mind right now?"`,
      evidence: evt.description,
    });
  }

  return results;
}

function detectFailedClose(session: LiveCallSession): MissedOpportunity[] {
  const { transcript } = session;
  const results: MissedOpportunity[] = [];

  for (let i = 0; i < transcript.length - 2; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "rep") continue;
    if (!matchesAny(chunk.text, CLOSE_LANGUAGE)) continue;

    // Find prospect's response
    const prospectResp = transcript.find(
      (c) => c.chunk_index > chunk.chunk_index && c.speaker === "prospect"
    );
    if (!prospectResp) continue;

    const prospectDeflected = matchesAny(prospectResp.text, FAILED_CLOSE_DEFLECT);
    if (!prospectDeflected) continue;

    // Find rep's response to the deflection
    const repResp = transcript.find(
      (c) => c.chunk_index > prospectResp.chunk_index && c.speaker === "rep"
    );
    if (!repResp) continue;

    const repRetreated = matchesAny(repResp.text, FAILED_CLOSE_RETREAT);
    if (!repRetreated) continue;

    results.push({
      id: makeId("failed_close", i),
      chunk_index: chunk.chunk_index,
      type: "failed_close",
      severity: "critical",
      what_happened: `Rep attempted a close → prospect deflected with "${prospectResp.text.slice(0, 40)}" → rep backed off without re-engaging`,
      why_it_mattered: "\"Think about it\" is almost always a smokescreen. Backing off signals that the rep doesn't believe in the product enough to handle resistance.",
      what_should_have_happened: `Rep should have acknowledged then dug in: "Of course — I want to make sure this is right for you. When you say 'think about it,' what specifically is giving you pause?"`,
      evidence: `Close: "${chunk.text.slice(0, 45)}…" → Deflect: "${prospectResp.text.slice(0, 45)}…"`,
    });

    if (results.length >= 2) break;
  }

  return results;
}

function detectOverexplainingMissed(session: LiveCallSession): MissedOpportunity[] {
  const { transcript } = session;
  const results: MissedOpportunity[] = [];
  const OVEREXPLAIN_THRESHOLD = 150;

  for (const chunk of transcript) {
    if (chunk.speaker !== "rep") continue;
    const wordCount = chunk.text.split(/\s+/).filter(Boolean).length;
    if (wordCount < OVEREXPLAIN_THRESHOLD) continue;

    results.push({
      id: makeId("overexplaining", chunk.chunk_index),
      chunk_index: chunk.chunk_index,
      type: "overexplaining",
      severity: "high",
      what_happened: `Rep spoke for ${wordCount} words in a single turn without checking for understanding`,
      why_it_mattered: "Prospects disengage after ~60 words. Long monologues shift the dynamic from dialogue to lecture and kill engagement.",
      what_should_have_happened: `After 60 words, pause and ask: "Does that make sense?" or "What questions do you have so far?" Then listen.`,
      evidence: `"${chunk.text.slice(0, 80)}…" (${wordCount} words)`,
    });

    if (results.length >= 2) break;
  }

  return results;
}

function detectTrustBreaking(session: LiveCallSession): MissedOpportunity[] {
  const { transcript } = session;
  const results: MissedOpportunity[] = [];

  for (let i = 0; i < transcript.length; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "rep") continue;

    const hasTrustBreaker = matchesAny(chunk.text, TRUST_BREAK_PATTERNS);
    if (!hasTrustBreaker) continue;

    const phrase = firstMatch(chunk.text, TRUST_BREAK_PATTERNS) ?? "dismissive language";
    results.push({
      id: makeId("trust_breaking", i),
      chunk_index: chunk.chunk_index,
      type: "trust_breaking",
      severity: "high",
      what_happened: `Rep used trust-eroding language ("${phrase}") that may have signaled dismissiveness`,
      why_it_mattered: "Trust is built one sentence at a time and lost in one phrase. Dismissive or corrective language triggers the prospect's sales defense.",
      what_should_have_happened: `Rep should have used empathy-first language: "I completely understand where you're coming from — and here's what most [contractors/roofers/etc.] we work with find…"`,
      evidence: `"${chunk.text.slice(0, 80)}…"`,
    });

    if (results.length >= 2) break;
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export function detectMissedOpportunities(session: LiveCallSession): MissedOpportunity[] {
  const allMissed: MissedOpportunity[] = [
    ...detectEmotionalIgnores(session),
    ...detectBuyingSignalIgnores(session),
    ...detectObjectionNotIsolated(session),
    ...detectFailedClose(session),         // Critical — ordered high
    ...detectPrematurePitchingMissed(session),
    ...detectLostMomentum(session),
    ...detectOverexplainingMissed(session),
    ...detectShallowProbing(session),
    ...detectTrustBreaking(session),
  ];

  // De-duplicate by chunk_index + type
  const seen = new Set<string>();
  const deduped = allMissed.filter((m) => {
    const key = `${m.chunk_index}_${m.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by severity then chunk order
  const rank = { critical: 3, high: 2, medium: 1 };
  return deduped
    .sort((a, b) => (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0))
    .slice(0, 12); // Cap at 12 — be selective, not exhaustive
}
