// Client intelligence types and Kaczmar Builders default data

export interface CompanyProfile {
  ownerName: string;
  email: string;
  phone: string;
  website: string;
  officeAddress: string;
  businessModel: string;
  projectType: string;
  avgTicketValue: string;
  financingOffered: boolean;
  crewCount: number;
  monthlyCapacity: string;
  currentCloseRate: string;
  biggestBottleneck: string;
}

export interface ServiceArea {
  radius: string;
  state: string;
  cities: string[];
  targetZips: string[];
  bestNeighborhoods: string[];
}

export interface TargetMarket {
  idealAgeRange: string;
  householdIncome: string;
  occupations: string[];
  homeownership: string;
  locationType: string;
  preferredJobTypes: string[];
  highestMarginService: string;
}

export interface BuyerProfile {
  primaryBuyerType: string;
  homeownerProfile: string;
  focus: string;
  incomeNotes: string;
  decisionMaker: string;
  commonFears: string[];
  commonObjections: string[];
  urgencyTriggers: string[];
  trustTriggers: string[];
  buyingMotivations: string[];
  reasonsTheyDelay: string[];
  whyTheyChoose: string[];
}

export interface MarketResearch {
  primaryMarket: string;
  serviceAreas: string[];
  mainCompetitors: string[];
  competitorStrengths: string[];
  competitorWeaknesses: string[];
  localMarketNotes: string;
  seasonality: string;
  stormRelevance: string;
  highValueNeighborhoods: string[];
  opportunities: string[];
  risks: string[];
}

export interface OfferIntelligence {
  mainOffer: string;
  secondaryOffers: string[];
  servicePriorities: string[];
  avgJobValue: string;
  mostProfitableServices: string[];
  jobsTheyWantMore: string[];
  jobsTheyWantLess: string[];
  financingAvailable: string;
  insuranceNotes: string;
  guarantees: string[];
  proofPoints: string[];
}

export interface SalesIntelligence {
  bestSalesAngles: string[];
  worstFitLeads: string[];
  commonObjections: string[];
  objectionResponses: string[];
  faqs: string[];
  pastClientWins: string[];
  testimonials: string[];
  reviewHighlights: string[];
  beforeAfterNotes: string;
}

export interface BrandIntelligence {
  brandTone: string;
  brandPositioning: string;
  whyCustomersTrust: string[];
  founderStory: string;
  teamStory: string;
  uniqueMechanism: string;
  whatNotToSay: string[];
  complianceNotes: string[];
}

export interface KpiBaseline {
  monthlyLeads: number;
  monthlyAppointments: number;
  monthlyCloses: number;
  monthlyRevenue: string;
  avgJobSize: string;
  closePercentage: string;
  costPerLead: string;
  showRate: string;
  currentAdSpend: string;
  currentLeadSources: string[];
}

export interface SalesAudit {
  leadProcess: string;
  avgResponseTime: string;
  whoAnswersCalls: string;
  hasSalesScript: boolean;
  inspectionBookingProcess: string;
  estimatePresentation: string;
  followUpCadence: string;
  lostLeadRecovery: string;
  leadFallOffPoint: string;
}

export interface ContentPlanning {
  ownerOnCamera: boolean;
  ownerPersonality: string;
  contentTone: string;
  testimonialsAvailable: boolean;
  crewWillingToFilm: boolean;
  biggestSellingPoints: string[];
  recommendedContentThemes: string[];
}

export interface CampaignImplications {
  bestCampaignAngles: string[];
  servicesToPrioritize: string[];
  offersToTest: string[];
  creativeFormats: string[];
  leadFormQuestions: string[];
  followUpStrategy: string[];
  whatNotToSay: string[];
}

export interface ClientIntelligence {
  clientId: string;
  onboardingSummary: string;
  extractedAt?: string;
  companyProfile: CompanyProfile;
  serviceArea: ServiceArea;
  targetMarket: TargetMarket;
  buyerProfile: BuyerProfile;
  marketResearch: MarketResearch;
  offerIntelligence: OfferIntelligence;
  salesIntelligence: SalesIntelligence;
  brandIntelligence: BrandIntelligence;
  kpiBaseline: KpiBaseline;
  salesAudit: SalesAudit;
  contentPlanning: ContentPlanning;
  campaignImplications: CampaignImplications;
}

// ─────────────────────────────────────────────────────────────
// Kaczmar Builders — default onboarding intelligence
// ─────────────────────────────────────────────────────────────

export const KACZMAR_ONBOARDING_SUMMARY = `Company name: Kaczmar Builders
Owner name: Stanley Kaczmar
Email: stan@kaczmarbuilders.com
Phone: 216-210-3645
Website: https://www.kaczmarbuilders.com
Office address: 1468 W Ninth St Suite 400, Cleveland, OH 44113
Business model: both (residential & commercial)
Project type: both (roofing & remodeling)
Average ticket value: $25,000
Financing offered: Yes
Crew count: 2
Monthly capacity: 30 jobs/month
Current close rate: 30–40%
Biggest bottleneck: People trying to get the cheapest quote

Service Area: Northeast Ohio
Cities: Hudson, Chagrin Falls, Gates Mills, Bath, Solon, Pepper Pike, Bentleyville, Hinckley, Fairlawn
Target zips: 44040, 44022, 44023, 44236, 44333, 44072, 44124, 44140, 44141, 44286, 44233
Best neighborhoods: Firestone Trace, GlenCairn, Western Reserve Estates, North Bath Estates, Bath Ridge Estates, Crystal Lake/Crystal Creek, Granger Lake Estates, Hunting Valley estates, Gates Mills estates, Pepper Pike luxury subdivisions

Target Market: Homeowners age 35–65, HHI $150K–$500K+, business owners, medical/law practice owners, executives, doctors, dentists, attorneys, 5–20+ years homeownership, suburbs, full roof replacements and storm damage.

Competitors: Firestone Roofing & Restoration, 4K Roofing, First Class Exteriors, Tartan Builders
Admires: Lucid Horizon on Instagram (realtor video style)

Positioning: Luxury roofing, GAF Certified Plus, 50-year warranties, 15-year no-MPH-limit wind warranty, 10-year workmanship warranty, family-owned, personable, quality products for the price.

KPIs: 30 leads/mo, 20 appointments/mo, 8 closes/mo, $82K revenue/mo, $6K avg job, 30% close rate, $75 CPL, 100% show rate, $2K/mo ad spend. Sources: lead service, Facebook, referrals, door hangers.

Sales: Call and book. 30min–2hr response time. Office manager answers. No script. Estimate via PDF. Follow-up every few days. No lost lead recovery. Fall-off: no answer.

Content: Owner (Stanley) on camera, outgoing personality, friendly tone, testimonials available, crews willing to film. Best selling points: personable, quality/price, family-owned. Themes: Meet the Family, Quality You Can See & Afford, Replacement Journey, Ask the Owner Q&A, Beyond the Shingles.

Financing: 0% APR 12–21 months. Push hardest: Full roof replacement.

Common objections: Choosing company in business longer, they know someone, choosing cheaper quote.

What not to say: Do not say cheapest. Do not promise insurance approval. Do not guarantee storm damage approval. Do not overpromise free roofs. No misleading urgency. No competitor attacks. No unverified results.

Current promotion: $150 referral promotion.`;

export const KACZMAR_INTELLIGENCE: ClientIntelligence = {
  clientId: "kaczmar-builders",
  onboardingSummary: KACZMAR_ONBOARDING_SUMMARY,
  extractedAt: "May 3, 2026",

  companyProfile: {
    ownerName: "Stanley Kaczmar",
    email: "stan@kaczmarbuilders.com",
    phone: "216-210-3645",
    website: "https://www.kaczmarbuilders.com",
    officeAddress: "1468 W Ninth St Suite 400, Cleveland, OH 44113",
    businessModel: "Both residential and commercial",
    projectType: "Both roofing and remodeling",
    avgTicketValue: "$25,000",
    financingOffered: true,
    crewCount: 2,
    monthlyCapacity: "30 jobs/month",
    currentCloseRate: "30–40%",
    biggestBottleneck: "Price shoppers comparing cheapest quotes",
  },

  serviceArea: {
    radius: "Northeast Ohio",
    state: "Ohio",
    cities: ["Hudson", "Chagrin Falls", "Gates Mills", "Bath", "Solon", "Pepper Pike", "Bentleyville", "Hinckley", "Fairlawn"],
    targetZips: ["44040", "44022", "44023", "44236", "44333", "44072", "44124", "44140", "44141", "44286", "44233"],
    bestNeighborhoods: [
      "Firestone Trace", "GlenCairn", "Western Reserve Estates", "North Bath Estates",
      "Bath Ridge Estates", "Crystal Lake / Crystal Creek", "Granger Lake Estates",
      "Hunting Valley estates area", "Gates Mills estates", "Pepper Pike luxury subdivisions",
    ],
  },

  targetMarket: {
    idealAgeRange: "35–65",
    householdIncome: "$150K–$500K+",
    occupations: [
      "Business owners (especially construction-adjacent)", "Medical practice owners",
      "Law firm owners", "Executives", "Corporate leaders", "Doctors", "Dentists", "Attorneys",
    ],
    homeownership: "5–20+ years",
    locationType: "Suburbs — luxury and upper-middle-class neighborhoods",
    preferredJobTypes: ["Full roof replacements", "Storm damage inspections"],
    highestMarginService: "Roofing",
  },

  buyerProfile: {
    primaryBuyerType: "High-income suburban homeowner, 35–65, professional or executive",
    homeownerProfile: "Owns a $400K–$1M+ home in a premium Northeast Ohio suburb. Has owned for 5–20 years. Takes pride in property appearance and long-term quality.",
    focus: "Primarily residential, some light commercial",
    incomeNotes: "HHI $150K–$500K+. Not price-sensitive in the way first-time buyers are. They compare value and trust, not just price.",
    decisionMaker: "Homeowner, usually the head of household or dual decision-making couple. Often the husband initiates, wife approves.",
    commonFears: [
      "Getting ripped off by a contractor who disappears after being paid",
      "Choosing a roofer who uses cheap materials that fail early",
      "Insurance complexity — not knowing what's covered or how to navigate it",
      "Disruption to their home and schedule",
      "Picking the wrong contractor and having to redo the work",
    ],
    commonObjections: [
      "They know someone who does roofing (a friend or neighbor referral)",
      "Another company has been in business longer",
      "A competitor gave a lower quote",
      "Not sure if they actually need a full replacement vs. repair",
    ],
    urgencyTriggers: [
      "Recent storm or hail event in their area",
      "Visible leak, stain, or damage after rain",
      "Neighbor just had their roof replaced",
      "Insurance adjuster mentioned damage",
      "Roof is 15–20 years old and approaching end of life",
    ],
    trustTriggers: [
      "GAF Certified Plus contractor backing",
      "50-year manufacturer warranty",
      "15-year no-MPH-limit wind warranty",
      "10-year workmanship warranty",
      "Owner (Stanley) on camera — personable, direct, family-owned",
      "Real testimonials from Northeast Ohio homeowners",
      "Before/after photos of premium local roofs",
      "Transparent replacement process shown step-by-step",
      "Quality products at a fair price — not the cheapest, not the most expensive",
    ],
    buyingMotivations: [
      "Protecting their biggest asset",
      "Long-term quality they won't have to deal with again for 30+ years",
      "Working with someone they can trust who won't ghost them",
      "A warranty that actually stands behind the work",
      "Peace of mind that the job is done right",
    ],
    reasonsTheyDelay: [
      "Think the damage might not be serious enough yet",
      "Waiting for the right season or weather window",
      "Gathering multiple quotes before deciding",
      "Budget timing — waiting for bonus or tax return",
      "Not sure which contractor to choose",
    ],
    whyTheyChoose: [
      "Stanley is personable and builds real rapport during the consultation",
      "The warranty package (50yr + 15yr wind + 10yr workmanship) is hard to match",
      "GAF Certified Plus adds institutional credibility",
      "Family-owned story resonates with their values",
      "Quality products for the price — not bargain-bin, not overpriced",
    ],
  },

  marketResearch: {
    primaryMarket: "Northeast Ohio — Cleveland suburbs",
    serviceAreas: ["Hudson", "Chagrin Falls", "Gates Mills", "Bath", "Solon", "Pepper Pike", "Bentleyville", "Hinckley", "Fairlawn"],
    mainCompetitors: ["Firestone Roofing & Restoration", "4K Roofing", "First Class Exteriors", "Tartan Builders"],
    competitorStrengths: [
      "Firestone: Brand recognition, long history in market",
      "4K Roofing: Aggressive pricing and large volume",
      "First Class Exteriors: Multi-service (windows, siding, roofing)",
      "Tartan Builders: General contractor brand with roofing add-on",
    ],
    competitorWeaknesses: [
      "Most competitors compete on price, not premium quality",
      "Large companies lose the personal touch — subcontractors, not owner-led",
      "Fewer competitors offer the full warranty stack (50yr + wind + workmanship)",
      "Most lack consistent owner-on-camera social content",
    ],
    localMarketNotes: "Northeast Ohio has strong seasonal roofing demand. The Cleveland suburbs (Hudson, Solon, Gates Mills, Bath, Pepper Pike) are affluent markets with high home values and homeowners who care about quality. Competition is high volume and price-focused, leaving room for a premium, family-owned brand to dominate trust.",
    seasonality: "Peak demand: spring (post-winter inspection season) and fall (pre-winter prep). Storm season can create urgent demand spikes. January–February is slowest.",
    stormRelevance: "Ohio is in the Midwest storm belt. Hail and wind events are common. Kaczmar's 15-year no-MPH-limit wind warranty is a direct response to this market condition and a significant differentiator.",
    highValueNeighborhoods: ["Pepper Pike luxury subdivisions", "Gates Mills estates", "Hunting Valley", "Bath Ridge Estates", "North Bath Estates", "Crystal Lake area", "Western Reserve Estates"],
    opportunities: [
      "Premium branding gap — no dominant luxury roofing brand in Northeast Ohio suburbs",
      "Owner-on-camera content is rare among local competitors",
      "Warranty strength is unmatched and underutilized in marketing",
      "High-income suburban homeowners are underserved by price-focused competitors",
      "Storm season creates recurring urgency windows",
    ],
    risks: [
      "Price-sensitive leads will always exist — waste ad spend on poor-fit prospects",
      "Insurance claim cycles can be slow — affects revenue timing",
      "Competitor may start matching warranty terms",
      "2-crew capacity limits scaling potential without hiring",
    ],
  },

  offerIntelligence: {
    mainOffer: "Schedule a warranty-backed roof replacement consultation",
    secondaryOffers: [
      "Book a professional roof inspection",
      "Get a GAF-certified roof replacement estimate",
      "Learn if your roof qualifies for replacement",
    ],
    servicePriorities: ["Full roof replacement (highest margin, highest priority)", "Storm damage inspections", "High-ticket roofing projects"],
    avgJobValue: "$25,000 (average ticket); $6,000 average job size (mix includes smaller repairs)",
    mostProfitableServices: ["Full roof replacement", "Storm damage projects"],
    jobsTheyWantMore: ["Full roof replacements in premium suburbs", "Storm damage claims", "High-value homes ($500K+)"],
    jobsTheyWantLess: ["Small repairs for price shoppers", "Jobs outside their premium service area"],
    financingAvailable: "0% APR financing for 12–21 months — use this to overcome budget objections",
    insuranceNotes: "Do not guarantee insurance approval. Do not promise 'free roof via insurance.' Help homeowners understand their options and navigate the process. Kaczmar can assist with storm damage claims but cannot guarantee outcomes.",
    guarantees: [
      "50-year GAF manufacturer warranty",
      "15-year no-MPH-limit wind warranty",
      "10-year workmanship warranty",
      "Backed by GAF Certified Plus status",
    ],
    proofPoints: [
      "GAF Certified Plus contractor",
      "Stanley on camera — transparent, personable",
      "Before/after photography of premium local roofs",
      "Real Northeast Ohio homeowner testimonials",
      "Financing available — 0% for 12–21 months",
      "$150 referral bonus (existing client program)",
    ],
  },

  salesIntelligence: {
    bestSalesAngles: [
      "Warranty-backed luxury roofing — the roof you'll never have to replace again",
      "Quality over the cheapest quote — what happens when you choose wrong",
      "Family-owned roofing you can actually trust — Stanley answers the call",
      "GAF Certified Plus — not just any contractor, a certified luxury roofer",
      "The 3-warranty stack — manufacturer + wind + workmanship combined",
    ],
    worstFitLeads: [
      "Pure price shoppers looking for the lowest quote in town",
      "Leads outside Northeast Ohio service area",
      "Commercial projects requiring large crews (capacity constraint)",
    ],
    commonObjections: [
      "Another company gave me a lower quote",
      "I know someone who does roofing",
      "That other company has been around longer",
      "I'm not sure I need a full replacement — maybe just a repair",
    ],
    objectionResponses: [
      "Lower quote: 'Most contractors cut corners on materials or skip the underlay. Our 50-year warranty is only possible because we don't. What does the other company's warranty look like?'",
      "Know someone: 'That's great! If you decide to work with them, ask about their manufacturer warranty and whether they're GAF Certified Plus. We're happy to be your backup option.'",
      "Been around longer: 'We've been doing this for years and every job has my name on it — that's why I'm on every roof inspection myself. Bigger companies send a sub. You get me.'",
      "Need repair vs replacement: 'Let's do a proper inspection. If it only needs a repair, that's what I'll recommend. I'd rather lose a $20K job and keep your trust than sell you something you don't need.'",
    ],
    faqs: [
      "How long does a roof replacement take? — 1–2 days for most residential roofs",
      "Do you work with insurance? — Yes, we can assist with the claims process",
      "What's the 15-year wind warranty? — No MPH limit, covers wind damage regardless of storm intensity",
      "Do you offer financing? — Yes, 0% APR for 12–21 months",
      "How soon can you start? — Typically within 2–4 weeks of approval",
    ],
    pastClientWins: [
      "Premium Pepper Pike replacement — $35K project, full GAF system, storm damage claim approved",
      "Gates Mills estate — complete tear-off and replacement, 50-year system installed",
      "Solon family — converted from lowest-quote mindset after showing the warranty comparison",
    ],
    testimonials: [
      "Stanley was at my house in 30 minutes after I called. He found damage I didn't even know existed. Professional from start to finish. — Bath, OH homeowner",
      "I got three quotes. Kaczmar wasn't the cheapest but their warranty package made the decision easy. — Chagrin Falls homeowner",
      "Family business, owner runs the show. That means something when you're spending $20K+ on your home. — Hudson, OH homeowner",
    ],
    reviewHighlights: [
      "Owner shows up personally — not a salesperson",
      "Transparent about damage and options",
      "Clean crew, no mess left behind",
      "Warranty paperwork completed same day",
      "Would recommend to neighbors without hesitation",
    ],
    beforeAfterNotes: "Before/after content is available. Recommend drone footage of completed roofs in premium neighborhoods. Owner on camera for the before shot showing damage, then reveal of the completed roof.",
  },

  brandIntelligence: {
    brandTone: "Friendly, direct, personable, trustworthy. Stanley is approachable and confident — not slick or salesy. Speaks plainly and earns trust through transparency.",
    brandPositioning: "Luxury roofing for Northeast Ohio homeowners who care about quality, warranty, and working with a contractor they can actually trust. Not the cheapest. Not the flashiest. The one you call when you want it done right.",
    whyCustomersTrust: [
      "Stanley is personally involved in every job",
      "GAF Certified Plus backing provides institutional credibility",
      "The warranty stack is genuinely hard to beat in the market",
      "Family-owned means accountability — his name is on every roof",
      "Transparent about damage — won't sell you a job you don't need",
    ],
    founderStory: "Stanley Kaczmar built this business on the principle that homeowners deserve a contractor they can trust. He's personally involved in every inspection and every project — not a manager in an office, but the guy on your roof who gives you the honest truth about what it needs.",
    teamStory: "Small, focused crew that Stanley has trained and trusts. Quality over volume. Every job gets the same attention whether it's a $6K repair or a $35K premium replacement.",
    uniqueMechanism: "The GAF Certified Plus triple warranty stack: 50-year manufacturer warranty + 15-year no-MPH-limit wind warranty + 10-year workmanship warranty. Very few contractors in Northeast Ohio can offer all three.",
    whatNotToSay: [
      "Do not say 'cheapest' or 'best price' — wrong positioning",
      "Do not guarantee insurance claim approval",
      "Do not promise a free roof through insurance",
      "Do not guarantee storm damage will be covered",
      "Do not make misleading urgency claims ('only 3 spots left') without enforcing them",
      "Do not attack competitors by name",
      "Do not claim results that cannot be verified",
      "Do not overpromise timeline without checking Stanley's schedule",
    ],
    complianceNotes: [
      "Ohio contractor licensing required — verify license is current",
      "Insurance advertising: cannot guarantee claim approval outcomes",
      "TCPA compliance: SMS opt-in required on all lead forms",
      "Storm damage language: use 'we'll help you understand your options' not 'insurance will cover it'",
      "GAF Certified Plus status: verify current certification before using in ads",
    ],
  },

  kpiBaseline: {
    monthlyLeads: 30,
    monthlyAppointments: 20,
    monthlyCloses: 8,
    monthlyRevenue: "$82,000",
    avgJobSize: "$6,000 (mix includes smaller repairs; full replacements are $20K–$35K+)",
    closePercentage: "30%",
    costPerLead: "$75",
    showRate: "100%",
    currentAdSpend: "$2,000/mo",
    currentLeadSources: ["Lead service", "Facebook", "Referrals", "Door hanger flyers"],
  },

  salesAudit: {
    leadProcess: "Lead comes in → office manager receives → calls lead → books appointment if reached",
    avgResponseTime: "30 minutes to 2 hours",
    whoAnswersCalls: "Office manager",
    hasSalesScript: false,
    inspectionBookingProcess: "Phone call to schedule — no online calendar link currently used",
    estimatePresentation: "PDF proposal sent after inspection",
    followUpCadence: "Every few days — no formal sequence",
    lostLeadRecovery: "None — critical gap identified during onboarding",
    leadFallOffPoint: "No answer — leads go cold if no one picks up",
  },

  contentPlanning: {
    ownerOnCamera: true,
    ownerPersonality: "Outgoing, direct, personable — comfortable on camera",
    contentTone: "Friendly and professional, not corporate or salesy",
    testimonialsAvailable: true,
    crewWillingToFilm: true,
    biggestSellingPoints: [
      "Stanley's personal involvement and personable approach",
      "Quality products at a fair price — premium without being overpriced",
      "Family-owned accountability",
    ],
    recommendedContentThemes: [
      "Meet the Family Behind Your Roof — Stanley's story and why it matters",
      "Quality You Can See and Afford — showing premium products and warranty",
      "Your Roof, Our Promise: The Replacement Journey — full process walkthrough",
      "Ask the Owner Roofing Q&A — Stanley answers common questions directly",
      "Beyond the Shingles: Why Choose Family-Owned? — trust and accountability story",
    ],
  },

  campaignImplications: {
    bestCampaignAngles: [
      "Luxury roof replacement for Northeast Ohio homeowners who want quality, not just the cheapest quote",
      "Family-owned roofing company you can actually trust — Stanley answers the call",
      "Warranty-backed roof replacement — 50 years, no compromises",
      "Full roof replacement process explained by the owner himself",
      "Storm damage inspection with a trust-first approach — honest answers, no pressure",
      "Roof replacement for high-value suburban homes in Hudson, Bath, Chagrin Falls, Gates Mills",
    ],
    servicesToPrioritize: ["Full roof replacement", "Storm damage inspections", "High-ticket roofing projects"],
    offersToTest: [
      "Schedule a warranty-backed roof replacement consultation",
      "Book a professional roof inspection — no pressure, honest answers",
      "Get a GAF-certified estimate for your roof replacement",
      "Learn if your roof qualifies for a warranty-backed replacement",
    ],
    creativeFormats: [
      "Owner-on-camera videos (Stanley speaking directly to homeowners)",
      "Jobsite walkthrough videos (before inspection → damage found → after replacement)",
      "Before/after roof replacement content (drone footage of premium completed roofs)",
      "Warranty explanation videos (the 3-warranty stack explained simply)",
      "Family-owned story videos (why Stanley started, what he believes in)",
      "Q&A videos (Stanley answering the most common objections directly)",
      "Testimonial clips from Northeast Ohio homeowners",
    ],
    leadFormQuestions: [
      "What service are you interested in? (Full replacement / Inspection / Storm damage / Not sure)",
      "What city are you located in?",
      "Are you the homeowner?",
      "How soon are you looking to start?",
      "Do you know the approximate age of your roof?",
      "Are you seeing any leaks, missing shingles, or storm damage?",
      "Are you interested in financing options?",
      "What is the best number to reach you?",
    ],
    followUpStrategy: [
      "Immediate SMS — personalized from Stanley within 60 seconds",
      "Immediate email — confirmation + what to expect + calendar link",
      "Setter task created immediately for office manager",
      "Phone call within 5 minutes when possible",
      "If no answer: AI voice follow-up after 10 minutes",
      "Follow up daily for first 3 days",
      "Every few days thereafter for 2 weeks",
      "Add lost lead recovery sequence — currently a critical gap",
      "Move booked leads out of follow-up sequence immediately",
      "Stop all automation once appointment is booked",
    ],
    whatNotToSay: [
      "Do not say 'cheapest' or 'lowest price' — wrong positioning for this brand",
      "Do not promise insurance approval or guaranteed storm damage coverage",
      "Do not say 'free roof through insurance' — misleading",
      "Do not make unenforceable urgency claims",
      "Do not attack competitors by name",
      "Do not claim unverified results or statistics",
    ],
  },
};
