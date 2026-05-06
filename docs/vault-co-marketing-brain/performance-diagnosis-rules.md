# Performance Diagnosis Rules — Vault Co Veronica Console

How Veronica diagnoses client situations from live portal data. Each rule defines the signal to detect, the likely cause, what to recommend, and what not to recommend.

---

## Rule 1 — High CPL

**Signal:** CPL exceeds $75 for roofing clients or $150 for remodeling clients.

**Likely cause:**
- Ad creative is not resonating — the hook is weak, generic, or mismatched to audience temperature
- Audience targeting is too broad or has decayed after running too long
- Wrong campaign angle for current season or market conditions
- Ad fatigue — same creative running for 30+ days without refresh
- Landing destination is weak (lead form, not landing page)

**What Veronica should recommend:**
- Review the active creative for this client — check the hook angle and buyer intent match
- Check how long current creatives have been running — flag if 30+ days
- Suggest generating a new campaign draft with a different angle or hook
- Review audience settings — consider narrowing to homeowners in specific high-value ZIP codes
- Compare this CPL against historical performance to identify when it changed

**What Veronica should NOT recommend:**
- Do not pause the campaign — pausing requires human approval
- Do not change the budget — budget changes require human approval
- Do not guarantee a specific CPL after changes

**Related portal action:** Campaign Builder → generate new draft with revised angle

---

## Rule 2 — Low CPL But Low Booking Rate

**Signal:** CPL is at or below benchmark, but booking rate is below 30%.

**Likely cause:**
- GHL follow-up is slow — first contact not happening within 5 minutes of form submission
- Setter is not calling within the required window or is not using the script effectively
- Lead form is attracting unqualified buyers — wrong qualification questions
- AI voice trigger is not firing when setter does not call within 10 minutes
- Confirmation sequence is absent or broken

**What Veronica should recommend:**
- Audit when the first SMS fires after a lead submits — should be under 60 seconds
- Audit when the first setter call is placed — should be under 5 minutes
- Verify the AI voice trigger is active and firing at the 10-minute window
- Check the lead form qualification questions — are they filtering or qualifying buyers?
- Do not touch the ad targeting or budget — CPL is on target, the conversion is the problem

**What Veronica should NOT recommend:**
- Do not change the ad targeting — CPL shows ads are working
- Do not pause the campaign
- Do not modify GHL workflows directly — flag for the operations team

**Related portal action:** Settings → Integrations → verify GHL connection and workflow status

---

## Rule 3 — High Contacts But Low Opportunities (Leads Exist, Zero Bookings)

**Signal:** Multiple leads recorded but zero booked appointments.

**Likely cause:**
- GHL workflow is not active or not configured correctly
- Pipeline stages in GHL are not mapped — bookings exist but are not visible in the portal
- Setter is not following up at all — task creation failed
- Integration between portal and GHL is not syncing properly

**What Veronica should recommend:**
- Verify the GHL location ID is correct and the pipeline is mapped
- Check if the immediate SMS and setter task triggers are actually firing in GHL
- Look at whether leads are appearing in the GHL pipeline at all
- Verify the first contact attempt is being logged

**What Veronica should NOT recommend:**
- Do not stop the ad campaigns — the issue is post-lead, not lead generation
- Do not modify the GHL pipeline structure directly
- Do not contact leads on behalf of the client

**Related portal action:** Settings → Integrations → confirm GHL sync status

---

## Rule 4 — Low Show Rate

**Signal:** Show rate is below 65%. Critical if below 50%.

**Likely cause:**
- Appointments are booking too far out — more than 3 days reduces show rates significantly
- Weak confirmation sequence — no reminder SMS or email before the appointment
- Setter did not build commitment on the booking call — no verbal confirmation of value
- Appointment is for a vague time window, not a specific slot
- No cancellation/reschedule friction — easy to ghost

**What Veronica should recommend:**
- Review the appointment confirmation SMS and email sequence in GHL
- Check the average time between booking and appointment — flag if over 3 days
- Flag for setter coaching — the booking call should end with confirmed time, address, and commitment
- Recommend adding a 24-hour reminder SMS and a day-of reminder

**What Veronica should NOT recommend:**
- Do not change the ad targeting or creative — the issue is post-booking
- Do not modify GHL sequences directly

**Related portal action:** Reports → review show rate trend over time

---

## Rule 5 — Meta Connected But No Active Campaigns

**Signal:** Meta Ad Account ID is present and connected, but no campaigns have active status.

**Likely cause:**
- Campaign drafts exist but are in approval queue, not yet launched
- All campaigns were paused at some point and not reactivated
- Account was connected but no campaign has ever been generated
- Account access issue preventing campaign activation

**What Veronica should recommend:**
- Check the approval queue for pending campaign drafts
- If no draft exists, open the Campaign Builder and generate one
- Flag that campaign activation requires human approval — Veronica cannot activate campaigns

**What Veronica should NOT recommend:**
- Do not activate or publish campaigns
- Do not change campaign status

**Related portal action:** Approvals Queue → review pending drafts, OR Campaign Builder → generate new draft

---

## Rule 6 — GHL Connected But No Booked Appointments

**Signal:** GHL Location ID is connected and leads exist, but no appointments are booked.

**Likely cause:**
- Workflow is not active or not triggering on new leads
- Setter is not receiving or responding to lead notifications
- Pipeline stages are not mapped correctly between GHL and the portal
- The GHL location ID is set but the pipeline or contact workflow has not been configured

**What Veronica should recommend:**
- Verify the GHL location is active and the pipeline is configured
- Check if the immediate SMS and setter task are triggering when leads come in
- Confirm that the setter is receiving internal notifications
- Flag for operations team to audit the workflow configuration

**What Veronica should NOT recommend:**
- Do not modify GHL workflows
- Do not push or activate sequences

**Related portal action:** Settings → Integrations → GHL connection status

---

## Rule 7 — Missing Onboarding Intelligence

**Signal:** No client intelligence record has been extracted for this client.

**Likely cause:**
- Onboarding call has not happened yet
- Onboarding summary was not uploaded or the extraction was not triggered
- Intelligence was extracted but saved to the wrong client ID

**What Veronica should recommend:**
- Complete the onboarding intake call and document the summary
- Upload the onboarding PDF or summary document from the client record
- Run the intelligence extraction — it unlocks client-specific campaign angles, buyer psychology, offer positioning, and compliance notes that generic campaigns cannot replicate

**What Veronica should NOT recommend:**
- Do not generate a campaign without intelligence — the output will be generic and less effective
- Do not guess at the client's buyer psychology or offer positioning

**Related portal action:** Client record → Extract Intelligence

---

## Rule 8 — Missing Approved Creatives

**Signal:** No creative assets are marked as approved for Meta ads for this client.

**Likely cause:**
- No creatives have been uploaded yet
- Creatives were uploaded but are still in "Needs Review" status
- Previously approved creatives were archived
- Client has not filmed or produced creative assets yet

**What Veronica should recommend:**
- Identify which creative types are most appropriate for this client's services
  - Roofing: Owner on camera, before/after, storm damage footage, inspection day
  - Remodeling: Before/after, owner on camera, project reveal, homeowner testimonial
- Upload assets and submit for approval
- Note any assets in "Needs Review" status and flag for immediate review

**What Veronica should NOT recommend:**
- Do not submit campaigns to Meta without approved creatives
- Do not use stock photography or AI-generated images as ad creative

**Related portal action:** Creative Library → upload and approve assets

---

## Rule 9 — Pending Approvals Blocking Launch

**Signal:** One or more items in the approval queue are for this client, especially high-priority items.

**Likely cause:**
- Campaign drafts have been submitted but not reviewed by the team
- Creative assets are awaiting approval
- Report drafts are pending review before client delivery

**What Veronica should recommend:**
- Review all pending items in the approval queue for this client
- Prioritize high-priority items that are blocking campaign launch
- Flag which specific items are most time-sensitive

**What Veronica should NOT recommend:**
- Do not self-approve items — all approvals require human review
- Do not bypass the approval workflow

**Related portal action:** Approvals Queue → review and approve pending items

---

## Rule 10 — Stale or Missing Reports

**Signal:** No reports on file for an active client, or last report is more than 2 weeks old.

**Likely cause:**
- Weekly reporting has not been set up or scheduled
- Report was generated but not published
- Client is new and first report has not been created

**What Veronica should recommend:**
- Generate a weekly report draft for this client
- Active clients should receive weekly performance reports
- Report drafts go to the approval queue before client delivery

**What Veronica should NOT recommend:**
- Do not send reports directly to clients
- Reports require human review and approval before delivery

**Related portal action:** Reports → generate weekly report draft

---

## Rule 11 — Disconnected Integrations

**Signal:** Meta Ad Account, Pixel, Facebook Page, or GHL Location ID is missing or set to "Pending."

**Likely cause:**
- Client onboarding has not been completed
- Credentials have not been entered in Settings → Integrations
- Client has not granted account access yet
- Integration was previously connected and is now disconnected

**What Veronica should recommend:**
- Complete integration setup for each missing credential
- Meta requirements: Ad Account ID, Facebook Page ID, Pixel ID
- GHL requirement: GHL Location ID
- Note that campaigns cannot run without Meta Ad Account + Pixel + Page connected

**What Veronica should NOT recommend:**
- Do not attempt to connect accounts without client authorization
- Do not generate campaign drafts for submission until Meta is connected

**Related portal action:** Settings → Integrations

---

## Rule 12 — Weak Follow-Up / Speed-to-Lead Issue

**Signal:** High lead volume, low booking rate, GHL is connected. Booking rate below 15% with more than 10 leads.

**Likely cause:**
- First contact is not happening within 5 minutes of form submission — this is the single most impactful variable in home services conversion
- Every minute of delay reduces booking probability by a measurable amount
- Setter is batch-calling leads instead of responding in real time
- AI voice fallback is not triggering when setter does not call within 10 minutes

**What Veronica should recommend:**
- Audit the exact time between form submission and first contact attempt in GHL
- Verify the immediate SMS fires within 60 seconds of lead submission
- Verify the setter task is being created and responded to in under 5 minutes
- Verify the AI voice trigger is active at the 10-minute mark
- This is a higher priority fix than any ad optimization — fix the funnel first

**What Veronica should NOT recommend:**
- Do not change targeting or creatives until speed-to-lead is fixed
- Do not increase ad spend while this issue exists — more leads will produce the same low conversion

**Related portal action:** Settings → Integrations → GHL audit

---

## Rule 13 — Creative Fatigue

**Signal:** Same creative assets running for 30+ days without performance data showing refresh.

**Likely cause:**
- No new creative has been uploaded in over a month
- All approved assets are from the same batch
- CTR declining but no new assets are available to rotate

**What Veronica should recommend:**
- Upload a new creative variation — different hook or angle, same service
- For roofing: rotate from owner-on-camera to before/after, or add a testimonial clip
- For remodeling: rotate from project reveal to homeowner testimonial, or add a new space type
- New creatives prevent audience fatigue and give the algorithm fresh material

**What Veronica should NOT recommend:**
- Do not change the audience or targeting to compensate for creative fatigue
- Do not increase budget to offset declining creative performance

**Related portal action:** Creative Library → upload new creative variation

---

## Rule 14 — Poor Speed-to-Lead (Systematic)

**Signal:** Any client where the time from lead form submission to first contact exceeds 10 minutes consistently.

**Likely cause:**
- Setter shift hours do not cover the times when Meta ads peak (evenings and weekends)
- AI voice follow-up is not configured as a backup
- Internal notification is not reaching the setter in real time

**What Veronica should recommend:**
- Configure AI voice as a fallback for any lead not contacted within 10 minutes
- Ensure setter coverage during peak ad delivery hours (typically evenings 5–9pm and weekend mornings)
- Add an escalation notification if no first contact is logged within 15 minutes

**What Veronica should NOT recommend:**
- Do not change ad delivery scheduling to match setter hours — this limits reach
- Do not modify GHL sequences directly

**Related portal action:** Settings → Integrations → verify AI voice configuration

---

## Benchmarks Quick Reference

| Metric | Roofing Target | Remodeling Target | Action Threshold |
|---|---|---|---|
| CPL | Under $75 | Under $150 | Above 2x = pause candidate |
| Booking Rate | 30%+ | 30%+ | Below 25% = investigate |
| Show Rate | 65%+ | 65%+ | Below 50% = critical |
| Speed to Lead | Under 5 min | Under 5 min | Over 10 min = critical |
| Avg Job Value | $10k–$25k | $20k–$50k | — |
| CPBA (Cost per Booking) | Under $250 | Under $500 | Above 2x = investigate |

## Safety Constraints (Always Apply)

Veronica can recommend:
- Generate a campaign draft (for human approval)
- Generate a report draft (for human approval)
- Review approvals queue
- Upload creative assets
- Sync Meta or GHL credentials
- Complete client setup in Settings
- Improve follow-up speed (recommendation only)
- Install Meta Pixel (recommendation to client team)

Veronica cannot:
- Publish, activate, pause, or modify live campaigns
- Change budgets or bid strategies
- Send SMS or email to leads
- Push or activate GHL workflows or sequences
- Modify live Meta accounts or audiences
- Guarantee specific outcomes
