# Task 3: Customer validation kit

**Goal:** find out, with evidence, whether web developers, UI/UX designers and small studios in Bangladesh and Thailand have a frequent, costly problem between "client brief" and "paid project". In particular: unpaid extra work from scope changes. Then find out whether they will pay $10 or $20 a month to fix it.

**Positioning under test (founder decision, 6 Nov):** the full workflow from brief to paid project, led by versioned scope and change requests the client approves.
**Pricing under test:** Pro $10 / Plus $20 per month. $5 Basic only if the Bangladesh evidence calls for it.

> All thresholds below are **proposed** and should be agreed before the first interview. Changing them after seeing the data defeats the purpose.

---

## 1. Recruitment plan (20 interviews)

| Cohort | Count | Profile mix | Where to find them |
|---|---|---|---|
| Bangladesh | 8 | 3 web developers, 3 UI/UX designers, 2 studio owners (2–5 people) | Your network; local freelancer and dev Facebook groups (follow the group rules); Upwork/Fiverr sellers who work with international clients |
| Thailand | 8 | 3 / 3 / 2 | The people from your earlier survey (ask them first); local dev and design communities; co-working spaces |
| Malaysia / Singapore | 4 | Any mix | LinkedIn outreach; referrals from earlier interviews |

- **Ask:** "30-minute research call about how you handle client projects. I'm not selling anything." Offer a small thank-you (for example a gift card), the same for everyone.
- **Pace:** 4 to 5 interviews a week. After every 5, review the notes for new themes.
- **Tag each person's source** (for example `?ref=` on any link you send) so channel quality can be compared later.

## 2. Qualification criteria (screener)

Must meet **all**:
- [ ] Works as a freelancer or owns or co-owns a studio of 1–5 people.
- [ ] Main work is web development, UI/UX design, or a mix.
- [ ] Has had **3 or more client projects in the last 6 months**.
- [ ] Decides which tools they pay for.
- [ ] At least some projects are fixed-price or milestone-based, not only hourly.

Disqualify: employees with no own clients; enterprise or agency staff above 5 people; people who only want a free invoice generator.

Screener questions (2 minutes, by chat or form):
1. What kind of client work do you do?
2. Roughly how many client projects did you complete in the last 6 months?
3. How do you usually price: fixed price, milestones, hourly, or retainer?
4. Who decides which tools you pay for?
5. Which country are most of your clients in?

## 3. Interview script (30 minutes)

**Rules:**
- Ask about the past, not the future.
- Ask for specific stories, not opinions.
- Do not pitch until part B.
- Write down actual words.

### Part A: problem (20 minutes)

1. *Warm-up:* Tell me about the last project you won from a new client.
2. What happened between their first message and you starting work?
3. How did you prepare the proposal or quote? How long did it take?
4. Where did the requirements come from? (email, LINE, WhatsApp, Messenger, a call?)
5. How did you write down what was included and what was not?
6. How did the client say "yes"? Was anything signed?
7. How did you ask for the deposit or payment? How did you know it arrived?
8. **Think of the last time a client asked for something extra mid-project. Walk me through exactly what happened.**
   - Did you charge for it? Why or why not?
   - Roughly how many hours or how much money was it?
   - What did you say to the client? What did they say?
9. How often does that happen? (last 3 months)
10. Which tools did you use across all of this? What do you pay for today?
11. What was the most frustrating or time-consuming part?
12. Have you tried to fix it? (template, spreadsheet, tool, contract clause). What happened?

### Part B: prototype (8 minutes)

Use the live site only once the production fixes in `01-product-audit.md` §3.1 are done.

1. **5-second test:** show the home page for 5 seconds, then hide it. *"What do you think this product does? Who is it for?"*
2. **Task:** *"Here's a client message: 'Hi! Can we add a booking page and 3 more pages?' Use this to send your client something to approve."* Watch without helping. Note where they hesitate.
3. *"How many steps did that feel like? What was confusing?"*
4. *"What would stop you from using this on your next real project?"*

### Part C: willingness to pay (2 minutes)

See §5.

## 4. Interview notes template

Copy one per interview into `docs/research/interviews/<date>-<cohort>-<n>.md`. Use no names; use an ID.

```markdown
# Interview <ID>
- Date / length / interviewer:
- Cohort: BD | TH | MY/SG    Role: dev | designer | studio (size)
- Projects in last 6 months:      Pricing model:
- Source (where recruited):

## Last project story (their words)
-

## Change request story (Q8)
- What was asked:
- Charged?  yes / partly / no        Value lost (hours or money):
- How handled:
- Frequency (last 3 months):

## Current tools and spend
-

## Pain scores (see scorecard)
| Pain | Freq 0–3 | Severity 0–3 | Cost noted | Workaround |
|---|---|---|---|---|

## Prototype test
- 5-second answer:
- Task completed without help?  yes / with hints / no     Time:
- Confusion points:
- Blockers to real use:

## Willingness to pay
- Response to $10 / $20:
- Commitment level reached (0–4):

## Surprises / quotes worth keeping
-
```

## 5. Pain scorecard

Score each pain **only from a specific story the person told**, not from agreement with a leading question.

| Pain hypothesis (plan §3.5) | Frequency 0–3 | Severity 0–3 |
|---|---|---|
| P1 Unpaid extra work from scope changes | 0 never · 1 once in 6 months · 2 monthly · 3 most projects | 0 none · 1 annoying · 2 lost hours · 3 lost real money or a client |
| P2 Proposals take too long to prepare | same | same |
| P3 Requirements scattered across chat and email | same | same |
| P4 Approval or agreement hard to get or track | same | same |
| P5 Payment requests disconnected or forgotten | same | same |
| P6 Client process feels unprofessional | same | same |

**Pain score = frequency × severity (0–9).** A pain is "strong" for a person at **6 or more**.
Also record: their current workaround, any money or hours they put on it, and whether they already pay for a tool for it. A person paying for a tool is the strongest signal.

## 6. Willingness-to-pay test

Ask only after part B. Climb the commitment ladder and record the **highest rung reached**:

| Rung | Ask | Signal |
|---|---|---|
| 0 | — | Polite interest only |
| 1 | "Can I send you the link when it's ready?" | Weak |
| 2 | "Would you use it on your next real project if I set it up with you?" (design partner) | Medium |
| 3 | "Pilot is $10 a month (or $20 for a studio). Want to start now?" | Strong, once paid |
| 4 | Pays for a pilot, or prepays 3 months at a discount | Strongest |

- Ask the price straight. Don't ask "what would you pay?"; people underestimate.
- If they say it's too expensive, ask: "Compared to what?" and "What would it need to do to be worth $10?"
- Use your own Stripe Payment Link for the pilot (subscription billing to SignedScope only, never client money).

## 7. Prototype test script (separate usability sessions, 5 people)

Run these after the website and demo reset (Task 5), with people who were **not** interviewed.

| Task | Success = | Measure |
|---|---|---|
| T1 5-second test on the home page | Says roughly "clients approve scope or changes and pay for them" | Correct or incorrect |
| T2 Find out how many steps it takes | Finds and states it | Time |
| T3 Turn a sample brief into a document and share the link | Done with no hints | Time, number of errors |
| T4 Act as the client: approve 2 lines, reject 1, sign | Done with no hints | Time |
| T5 Find where it explains security | Finds it | Correct or incorrect |

Note every hesitation longer than 5 seconds and every wrong click.

## 8. Go / no-go criteria (proposed: agree before starting)

| Gate | Pass if | Fail means |
|---|---|---|
| **G1 Problem** | ≥ 10 of 20 score **P1 or another pain at 6 or more**, and ≥ 6 give a specific lost amount or hours from the last 3 months | Change the lead pain (for example to P2 proposal speed) or the segment; do not build |
| **G1b Lead pain** | P1 (scope change) is the top or second pain in at least one cohort | Rewrite positioning around the stronger pain |
| **G2 Comprehension** | ≥ 4 of 5 pass T1 without explanation | Rewrite the home page before more interviews |
| **G3 Usability** | ≥ 4 of 5 complete T3 and T4 without hints, in under 10 minutes for T3 | Simplify the flow before building more |
| **G4 Willingness to pay** | ≥ 5 people reach rung 3 or 4 within 2 weeks of their interview (plan target: 10 paying in the 90 days) | Re-test price, segment or value; do not start the MVP build |
| **Cohort pick** | The cohort with more rung 3–4 results and the higher median P1 score becomes the first launch market | Tie: pick the one with easier reach (lower recruiting effort) |

**Decision meeting:** after 20 interviews, or earlier if 10 interviews show G1 clearly failing.

## 9. Tracking sheet (one row per person)

`ID · cohort · role · source · projects in 6 months · P1 score · top pain · top pain score · lost value · current tool spend · T1 pass · rung reached · paid (y/n) · notes`

A simple spreadsheet is enough. Report weekly totals: interviews done, strong P1 count, highest rung per cohort.
