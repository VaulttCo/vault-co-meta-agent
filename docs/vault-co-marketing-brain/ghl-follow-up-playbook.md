# GHL Follow-Up Playbook — Vault Co

GoHighLevel workflow rules for all Vault Co clients. Follow-up speed and consistency are the single biggest driver of lead-to-booking conversion rate.

## The Core Rule

**Speed wins.** The first company to make contact after a form submission wins the appointment the majority of the time. Leads that are not contacted within 5 minutes convert at significantly lower rates. Every workflow must be built to compress contact time to under 60 seconds for the first automated touchpoint, and under 5 minutes for the first live call.

## Standard Lead Workflow

### Step 1 — Immediate SMS (within 60 seconds)

Sent automatically when the lead form submits.

**Requirements:**
- Personalized with first name
- References the specific offer (inspection, estimate, assessment)
- Includes company name and local area reference
- Sets expectation for next contact ("Someone from our team will call you in the next few minutes")
- Short — under 160 characters when possible
- TCPA compliant — only sent when lead provided SMS consent in the lead form

**Example:**
> "Hi [First Name], thanks for requesting your free roof inspection with [Company]. Our team in [City] will call you shortly. — [Owner Name]"

### Step 2 — Immediate Email (within 60 seconds)

Sent simultaneously with the SMS.

**Requirements:**
- Subject line: personal and specific, not generic ("Your roof inspection is confirmed" beats "Thank you for your submission")
- Body: confirm the offer, explain the next step, include a direct phone number
- Signed by owner name, not a generic "Team" signature
- Mobile-optimized

### Step 3 — Internal Notification (within 60 seconds)

Sent to the setter, owner, or lead management channel.

**Requirements:**
- Lead name, phone, email, address
- Service requested
- Campaign source (which ad triggered the form)
- Timestamp
- Direct link to the lead record in GHL

**Method:** SMS to setter phone number, or GHL task notification, or Slack/email to internal team depending on client setup.

### Step 4 — Setter Task Created (within 60 seconds)

A GHL task is created and assigned to the designated setter.

**Task includes:**
- Lead name and phone number
- Script guidance: opening line, offer recap, goal (book the inspection/estimate)
- Time-sensitivity note: "Call within 5 minutes for best conversion"
- Next action if no answer: voicemail script, then retry in 20 minutes

### Step 5 — Live Call (within 5 minutes)

The setter makes the first outbound call.

**Call goal:** Book the appointment in one call. Collect address, confirm availability, send calendar link or verbal confirmation.

**If no answer:** Leave a brief voicemail referencing the form submission. Begin retry sequence.

### Step 6 — AI Voice Follow-Up (if no live contact within 10 minutes)

If the setter has not reached the lead within 10 minutes, an AI voice call is triggered.

**AI voice script requirements:**
- Introduce as calling on behalf of [Company]
- Reference the specific form submission
- Ask for a callback or offer to schedule directly
- Compliant with TCPA — do not autoplay recorded messages without disclosure
- Short — 30–45 seconds max

### Step 7 — Day 1 Follow-Up Sequence

If the lead has not been reached or booked after the first hour:

- **1 hour:** Second SMS (different angle — softer, offer-reminder)
- **3 hours:** Second email (social proof or FAQ about the process)
- **End of day:** Setter retry call

### Step 8 — Days 2 and 3

**Day 2:**
- Morning SMS: "Still available for your free inspection — [Day/Time options]"
- Setter call attempt

**Day 3:**
- Final nurture SMS: "We have a few spots this week in [City] — let us know if you'd like to lock one in."
- Setter final call attempt

### Step 9 — Lost Lead Recovery

If the lead has not booked after 3 days of follow-up:

- Move to a longer-term nurture sequence (weekly touch for 30–60 days)
- Add CRM tags: `lost-lead`, `nurture-30d`, and service type tag
- Trigger a re-engagement SMS at Day 7, Day 14, Day 30
- Recovery message angle: "Still thinking about it? We can schedule something easy — no pressure."

**Recovery sequences should always be active.** Most clients do not have them. This is one of the highest-ROI improvements Vault Co makes.

### Stop Conditions

All automated sequences must stop immediately when:

- Appointment is booked (tag: `booked`)
- Lead explicitly asks to stop contact (tag: `do-not-contact`, reply STOP to SMS)
- Lead is marked as sold, closed, or lost-final in CRM

**Failure to stop automation after booking is a compliance risk and a trust destroyer.** Every workflow must include a booked-stop condition.

## Tags Applied on Lead Creation

Standard tags to apply when a new lead enters:

- Service type (e.g., `roofing-inspection`, `storm-damage`, `full-replacement`)
- Campaign source (e.g., `meta-lead-gen`, `storm-campaign-q4`)
- Lead temperature (e.g., `cold-lead`, `warm-retargeting`)
- Stage: `new-lead`

Setter updates stage when:
- Contact made → `contacted`
- Appointment set → `booked`
- No show → `no-show`
- Estimate given → `estimate-sent`
- Closed → `won`
- Not ready → `future-follow-up`

## GHL Pipeline Stages

| Stage | Description |
|---|---|
| New Lead | Form submitted, automation running |
| Contacted | Live phone contact made |
| Appointment Set | Date/time confirmed |
| No Show | Did not show for appointment |
| Estimate Sent | Quote delivered |
| Negotiating | Active sales conversation |
| Closed Won | Job sold |
| Closed Lost | Not moving forward |
| Future Follow-Up | Not ready now, re-engage in 30–90 days |

## What We Never Do

- Set up a campaign without a corresponding GHL workflow
- Send SMS without TCPA consent captured in the lead form
- Allow leads to sit more than 5 minutes without any automated contact
- Run automation past the booked status
- Use generic "Thank you for your message" auto-replies — every first touch must be personalized
- Skip internal notifications — the setter must know the moment a lead comes in
