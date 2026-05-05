// Market Research Agent — derives structured campaign intelligence from client market data.
// Architecture is prepared for future web research; currently uses stored intelligence fields.

import type { MarketResearch, ServiceArea, TargetMarket, CampaignImplications } from "@/lib/clientIntelligence";

export interface MarketResearchOutput {
  localMarketSummary: string;
  competitorAngle: string;
  buyerDemandNotes: string;
  seasonalityNotes: string;
  recommendedAngles: string[];
  servicesToPrioritize: string[];
  riskNotes: string[];
  complianceNotes: string[];
}

export function runMarketResearchAgent(
  market: MarketResearch,
  serviceArea: ServiceArea,
  targetMarket: TargetMarket,
  implications: CampaignImplications,
  service: string
): MarketResearchOutput {
  const isRoofing = /roof|storm|inspect/i.test(service);

  const localMarketSummary = market.localMarketNotes ||
    `${market.primaryMarket} market with ${market.mainCompetitors.length} primary competitors. ` +
    `Service area covers ${serviceArea.cities.slice(0, 4).join(", ")} and surrounding suburbs. ` +
    `Target buyer is ${targetMarket.idealAgeRange} with HHI ${targetMarket.householdIncome}.`;

  const competitorAngle = market.competitorWeaknesses.length > 0
    ? `Competitors weak on: ${market.competitorWeaknesses.slice(0, 2).join("; ")}. ` +
      `Position against ${market.mainCompetitors[0] ?? "price-focused competitors"} by emphasizing quality and warranty.`
    : `Differentiate from local competitors by emphasizing warranty strength, owner involvement, and premium quality.`;

  const buyerDemandNotes = targetMarket.preferredJobTypes.length > 0
    ? `Highest demand: ${targetMarket.preferredJobTypes.join(", ")}. ` +
      `Ideal prospect: ${targetMarket.householdIncome} homeowner in ${serviceArea.bestNeighborhoods.slice(0, 2).join(", ")}.`
    : `Focus on premium homeowners who value quality and long-term protection over lowest price.`;

  const seasonalityNotes = market.seasonality ||
    (isRoofing
      ? "Peak demand in spring and fall. Storm events create urgent lead windows."
      : "Steady year-round demand with slight uptick in spring and summer for exterior projects.");

  const recommendedAngles = implications.bestCampaignAngles.length > 0
    ? implications.bestCampaignAngles
    : [
        `Premium ${service} for high-value suburban homeowners`,
        `Quality and warranty over the cheapest quote`,
        `Owner-led, family-owned trust positioning`,
      ];

  const servicesToPrioritize = implications.servicesToPrioritize.length > 0
    ? implications.servicesToPrioritize
    : [service];

  const riskNotes = market.risks.length > 0
    ? market.risks
    : [
        "Price-sensitive leads will waste ad spend — qualify for budget intent in lead form",
        "Seasonality dips require creative refresh to maintain engagement in slow months",
      ];

  const complianceNotes = isRoofing
    ? [
        "Storm damage language: use 'we'll help you understand your options' not guaranteed approval",
        "Do not use superlative claims without verification",
        "Insurance references require careful phrasing per Meta and Ohio regulations",
      ]
    : [
        "No guaranteed ROI or home value increase claims",
        "Before/after content must be authentic client work only",
        "Do not use unenforceable urgency claims",
      ];

  return {
    localMarketSummary,
    competitorAngle,
    buyerDemandNotes,
    seasonalityNotes,
    recommendedAngles,
    servicesToPrioritize,
    riskNotes,
    complianceNotes,
  };
}
