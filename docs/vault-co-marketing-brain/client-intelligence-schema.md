# Client Intelligence Schema

The structured data extracted from every Vault Co client onboarding. This intelligence is injected into every campaign draft the AI generates for that client. The richer the onboarding summary, the more precise and effective the output.

## How It Is Extracted

Client intelligence is extracted by the AI from a free-form onboarding summary written during the intake call. The AI parses the summary and populates each field below. Missing fields are inferred from available context or left as empty strings/arrays.

The extraction is triggered from the Client record in the portal. It can be re-run whenever the onboarding summary is updated.

---

## Schema Reference

### `companyProfile`

Core business information.

| Field | Type | Description |
|---|---|---|
| `ownerName` | string | Full name of the business owner |
| `yearsInBusiness` | string | How long the company has been operating |
| `teamSize` | string | Number of employees or crew size |
| `currentMonthlyRevenue` | string | Approximate monthly revenue |
| `currentCloseRate` | string | Percentage of leads that convert to jobs |
| `avgJobValue` | string | Average ticket per job |
| `biggestBottleneck` | string | Owner's stated biggest business challenge |
| `financingOffered` | boolean | Whether the company offers financing |
| `insuranceWorkExperience` | boolean | Whether they work insurance claims |

---

### `serviceArea`

Geographic targeting intelligence.

| Field | Type | Description |
|---|---|---|
| `primaryCity` | string | Main city of operation |
| `cities` | string[] | All cities served |
| `counties` | string[] | Counties served |
| `targetZips` | string[] | High-value ZIP codes to target |
| `excludeZips` | string[] | ZIP codes to exclude |
| `bestNeighborhoods` | string[] | Neighborhoods with highest conversion history |
| `radiusMiles` | number | Service radius in miles |
| `travelLimit` | string | Maximum distance the company will travel |

---

### `targetMarket`

Ideal customer profile.

| Field | Type | Description |
|---|---|---|
| `idealAgeRange` | string | e.g., "40–65" |
| `householdIncome` | string | e.g., "$80K–$150K" |
| `homeValue` | string | Target home value range |
| `homeAgeTarget` | string | Age of homes most likely to need service |
| `occupations` | string[] | Common occupations of ideal buyers |
| `locationType` | string | Suburban, rural, urban, etc. |
| `preferredJobTypes` | string[] | Job types the client wants more of |

---

### `buyerProfile`

Psychological profile of the ideal buyer.

| Field | Type | Description |
|---|---|---|
| `primaryBuyerType` | string | Primary buyer archetype description |
| `commonFears` | string[] | Top fears homeowners have |
| `commonObjections` | string[] | Most frequent sales objections |
| `urgencyTriggers` | string[] | What creates urgency for this buyer |
| `trustTriggers` | string[] | What builds trust with this buyer |
| `reasonsTheyDelay` | string[] | Why homeowners postpone the decision |
| `reasonsTheyBuy` | string[] | Why homeowners move forward |
| `decisionMaker` | string | Who makes the final decision in the household |

---

### `competitiveAnalysis`

Market and competitive intelligence.

| Field | Type | Description |
|---|---|---|
| `mainCompetitors` | string[] | Named local competitors |
| `competitorWeaknesses` | string[] | Known weaknesses of competitors |
| `clientAdvantage` | string[] | Client's differentiated advantages |
| `localReputation` | string | Client's current market reputation |

---

### `kpiBaseline`

Starting performance metrics.

| Field | Type | Description |
|---|---|---|
| `currentCPL` | string | Current cost per lead |
| `currentBookingRate` | string | Current lead-to-appointment rate |
| `currentCloseRate` | string | Current appointment-to-job rate |
| `currentAdSpend` | string | Current monthly ad investment |
| `revenueGoal` | string | Target monthly or annual revenue |

---

### `salesAudit`

Assessment of current sales process strengths and gaps.

| Field | Type | Description |
|---|---|---|
| `followUpSpeed` | string | How fast they currently respond to leads |
| `followUpChannels` | string[] | How they currently follow up (call, text, email) |
| `crmUsed` | string | CRM currently in use |
| `automationInPlace` | boolean | Whether any automation is currently running |
| `lostLeadRecovery` | string | What they do with unconverted leads |
| `setterExists` | boolean | Whether a dedicated setter role exists |
| `salesScriptUsed` | boolean | Whether a formal sales script is used |
| `biggestSalesGap` | string | Biggest identified gap in the sales process |

---

### `contentPlanning`

Creative and content production intelligence.

| Field | Type | Description |
|---|---|---|
| `ownerOnCamera` | boolean | Whether owner is willing to appear on camera |
| `existingVideoAssets` | boolean | Whether any existing video exists |
| `beforeAfterLibrary` | boolean | Whether a before/after photo library exists |
| `reviewPlatforms` | string[] | Where client reviews live (Google, Yelp, etc.) |
| `reviewCount` | string | Approximate total review count |
| `avgRating` | string | Average star rating |
| `recommendedContentThemes` | string[] | Content themes recommended based on intelligence |
| `contentProductionNotes` | string | Notes on production capacity and willingness |

---

### `marketResearch`

Market-level intelligence used to inform campaign targeting.

| Field | Type | Description |
|---|---|---|
| `marketSize` | string | Description of market size and density |
| `mainCompetitors` | string[] | Key competitors in the market |
| `competitorWeaknesses` | string[] | Identified weaknesses of competitors |
| `opportunities` | string[] | Market opportunities to exploit |
| `threats` | string[] | Market threats or challenges |
| `seasonality` | string | Seasonal patterns for this market and service |
| `stormHistory` | string | Recent storm history relevant to the market |

---

### `offerIntelligence`

Offer structure and value proposition details.

| Field | Type | Description |
|---|---|---|
| `mainOffer` | string | Primary offer for advertising (e.g., "Free Roof Inspection") |
| `secondaryOffers` | string[] | Additional offers available |
| `financingAvailable` | string | Financing details if offered |
| `guarantees` | string[] | Warranties and guarantees offered |
| `proofPoints` | string[] | Specific claims that can be proven |
| `jobsTheyWantMore` | string[] | Job types the client wants to prioritize |
| `jobsTheyWantLess` | string[] | Job types the client wants to reduce |
| `pricingPosition` | string | Premium, mid-market, or value pricing |

---

### `salesIntelligence`

Sales process and conversion intelligence.

| Field | Type | Description |
|---|---|---|
| `bestSalesAngles` | string[] | Angles that have worked best historically |
| `worstSalesAngles` | string[] | Approaches that have not worked |
| `resonatingHooks` | string[] | Hooks or messages that resonate with buyers |
| `closingStrengths` | string[] | Where the sales process is strongest |
| `closingWeaknesses` | string[] | Where the sales process loses deals |

---

### `brandIntelligence`

Brand voice and positioning constraints.

| Field | Type | Description |
|---|---|---|
| `brandPositioning` | string | How the company wants to be perceived |
| `uniqueMechanism` | string | What makes this company uniquely different |
| `brandVoice` | string | Tone and communication style |
| `whatNotToSay` | string[] | Specific phrases or claims to avoid |
| `competitorsThatShouldNotBeMentioned` | string[] | Competitors not to reference |

---

### `campaignImplications`

Pre-derived campaign recommendations extracted from intelligence.

| Field | Type | Description |
|---|---|---|
| `bestCampaignAngles` | string[] | Campaign angles most likely to perform |
| `leadFormQuestions` | string[] | Qualification questions recommended for this client |
| `followUpStrategy` | string[] | Follow-up approach based on sales audit |
| `audienceRecommendation` | string | Recommended audience targeting approach |
| `creativeRecommendation` | string | Recommended creative types based on assets and owner style |

---

## Intelligence Quality Tiers

| Tier | Description | Campaign Impact |
|---|---|---|
| Full | All major sections populated | Maximum personalization — unique copy, audience, offer angle, psychology |
| Partial | Company profile + buyer profile populated | Moderate personalization — copy and audience shaped by intelligence |
| Minimal | Company profile only | Light personalization — name and service references only |
| None | No intelligence available | Generic mock output — not recommended for live campaigns |

**Recommendation:** Always complete the onboarding extraction before generating any live campaign draft. A campaign built without client intelligence is significantly less effective and requires more human revision.
