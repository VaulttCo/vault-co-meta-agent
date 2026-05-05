// Buyer Psychology Agent — analyzes buyer motivations, fears, and hooks for campaign generation.
// Derives structured psychological intelligence from client's buyer profile data.

import type { BuyerProfile, CampaignImplications } from "@/lib/clientIntelligence";

export interface BuyerPsychologyOutput {
  whatBuyerCares: string[];
  urgencyCreators: string[];
  trustCreators: string[];
  hesitationCauses: string[];
  objectionsToHandle: string[];
  resonatingHooks: string[];
  proofPoints: string[];
  bestCTA: string;
  buyerStageNotes: string;
}

export function runBuyerPsychologyAgent(
  buyerProfile: BuyerProfile,
  implications: CampaignImplications,
  service: string
): BuyerPsychologyOutput {
  const isRoofing = /roof|storm|inspect/i.test(service);

  const whatBuyerCares = buyerProfile.buyingMotivations.length > 0
    ? buyerProfile.buyingMotivations
    : isRoofing
    ? ["Protecting their biggest asset", "Long-term quality and peace of mind", "Working with a contractor they can trust"]
    : ["Creating the home they've always wanted", "Quality craftsmanship without stress", "Transparent pricing and timeline"];

  const urgencyCreators = buyerProfile.urgencyTriggers.length > 0
    ? buyerProfile.urgencyTriggers
    : isRoofing
    ? ["Recent storm or hail event", "Visible leaks or missing shingles", "Roof approaching end of life (15–20 years)"]
    : ["Project has been put off for too long", "Financing window is available now", "Season is right for the project type"];

  const trustCreators = buyerProfile.trustTriggers.length > 0
    ? buyerProfile.trustTriggers
    : [
        "Owner personally involved",
        "Real testimonials from local homeowners",
        "Warranty that stands behind the work",
        "Transparent process with no hidden costs",
      ];

  const hesitationCauses = buyerProfile.reasonsTheyDelay.length > 0
    ? buyerProfile.reasonsTheyDelay
    : [
        "Gathering multiple quotes before deciding",
        "Not sure the damage is serious enough to act on now",
        "Budget timing",
        "Don't know which contractor to trust",
      ];

  const objectionsToHandle = buyerProfile.commonObjections.length > 0
    ? buyerProfile.commonObjections
    : implications.whatNotToSay.length > 0
    ? ["Price comparison against cheaper competitors", "Choosing a company they know personally"]
    : ["Price and trust objections are most common in this category"];

  const resonatingHooks = isRoofing
    ? [
        `"Your roof protects everything that matters — is it protecting you?"`,
        `"One inspection. Honest answers. No pressure."`,
        `"The roof you'll never have to replace again."`,
        `"Most homeowners don't know their roof is damaged until it's too late."`,
      ]
    : [
        `"What would your home look like if it was built the way you always imagined?"`,
        `"Finally done the right way — no stress, no surprises."`,
        `"The home you've always wanted is closer than you think."`,
      ];

  const proofPoints = [
    ...trustCreators.slice(0, 3),
    ...(buyerProfile.whyTheyChoose.length > 0 ? buyerProfile.whyTheyChoose.slice(0, 2) : []),
  ];

  const bestCTA = isRoofing
    ? "Book My Free Roof Inspection"
    : "Book My Free Consultation";

  const buyerStageNotes = [
    `Primary buyer type: ${buyerProfile.primaryBuyerType || "high-income suburban homeowner"}`,
    `Decision-making: ${buyerProfile.decisionMaker || "homeowner-led, partner-approved"}`,
    `Income range: ${buyerProfile.incomeNotes || "upper-middle to high income"}`,
    "Buyer is NOT primarily price-driven — sells on trust, quality, warranty",
    "Campaigns should reposition away from price competition toward premium quality and confidence",
  ].join(". ");

  return {
    whatBuyerCares,
    urgencyCreators,
    trustCreators,
    hesitationCauses,
    objectionsToHandle,
    resonatingHooks,
    proofPoints,
    bestCTA,
    buyerStageNotes,
  };
}
