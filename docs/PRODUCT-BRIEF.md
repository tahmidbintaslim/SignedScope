# SignedScope product brief

Status: working draft, 6 Nov 2026. Built from the interview findings, the master GTM plan and the decisions in this repo. Change it here, not in chat.

## Corrections to the earlier summary
| Earlier summary said | Corrected to | Why |
|---|---|---|
| For freelance web devs and designers | Anyone who quotes software work: freelancers, small studios and agencies (1 to 20 people), plus in-house leads who estimate for a client or a boss | Interviews: the pain is estimation itself, and people asked about scaling to teams |
| The problem is unpaid extras | The problem is **estimating and quoting**. Unpaid extras come second. | Interviews: requirements analysis, functional/non-functional breakdown, stories, milestones, timeline and fair price are the slow part |
| Breakdown = features, hours, price | Requirements analysis first: functional and non-functional requirements, user stories, milestones, timeline, then price | Named directly in the interviews |
| Proposal or agreement | Plus PDF templates and **prompt to PDF** (describe the document, get a draft you edit) | Interviews |
| (not mentioned) | Secure accounts (magic link, Google, GitHub, two-step sign-in), dashboard, file vault, share links | Interviews; trust is the first objection ("why not a Google Doc?") |
| Clauses | Clauses that change by country (TH, BD, MY, SG first) | Interviews |
| Free beta, then paid | A **Free plan that stays free** for onboarding, plus Pro $10 / Plus $20. Everything is free during the beta. | Interviews asked for free tiers; you chose $10/$20 |

## One line
Paste a client brief. Get the requirements, stories, timeline and a fair price in minutes, then send it as a document your client can approve and sign.

## Who it is for
- **First:** freelance developers, designers and small studios in Thailand and Bangladesh who quote websites, apps and software.
- **Next:** Malaysia and Singapore; small agencies with a few people sharing one workspace.
- **Languages:** English, Bengali, Thai.

## The problem, in their words
1. Turning a messy brief into a proper requirements list takes hours.
2. Estimating hours and a timeline is guesswork, so quotes are too low or too slow.
3. Pricing extra features fairly mid-project is awkward, so extras often go unpaid.
4. A Google Doc has no structure, no approval trail and no link between the quote, the signature and the payments.

## The product (in order of the workflow)
1. **Estimate.** Paste a brief (no signup). The AI returns functional and non-functional requirements, user stories, features with hours, milestones and a timeline. The price is your rate × hours + buffer. The AI never sets the price.
2. **Document.** One click turns the estimate into a scope, proposal or agreement. Start from a template, or describe what you need (prompt to PDF). Add clauses for the client's country.
3. **Share.** Send a sealed link. The client reads it in their language, approves line by line and signs without an account. You see when it was viewed and signed.
4. **Get paid.** The payment schedule becomes payment requests with your own instructions (PromptPay, bank, bKash, Stripe link). Reminders go to you when a payment is late.
5. **Change.** A new request is estimated the same way and sent as a priced change for approval.
6. **Keep.** Every brief, estimate, document, signature and file lives in the project, in a private vault.

## What SignedScope is not
- Not a payment processor. It never holds or moves client money.
- Not a legal e-signature service or a law firm. Clauses are templates, not legal advice.
- Not a project management tool. It stops at "approved and paid".

## Why pay for it instead of a Google Doc
- The estimate is done for you, from the brief, in your language.
- The client approves a fixed version; the link proves what was agreed (hash on the receipt).
- Approval, payment requests, reminders and changes are joined up in one place.

## Plans
| | Free | Pro $10/mo | Plus $20/mo |
|---|---|---|---|
| AI estimates | a few per month | more | most |
| Documents and share links | yes | yes | yes |
| Templates, prompt to PDF, country clauses | basic | all | all |
| Vault storage | small | larger | largest |
| Branding on documents | no | yes | yes |
| Team seats | no | no | yes (later) |

Exact limits are set after the beta, from real usage. During the beta every feature is free.

## Homepage
- **Headline:** "From client brief to signed quote." Subline: "Paste a brief. Get requirements, stories, a timeline and a fair price in minutes, then send it for approval."
- **Main action:** "Try the AI estimate, no signup" with the brief box on the homepage itself.
- **Story:** brief → requirements and stories → timeline and price → document → client signs → payment requests.
- **Media:** a three.js 3D hero (a brief turning into a structured document); 2D interactive demos built from the real UI; short videos recorded from the real app; custom vector icons and illustrations. No stock photos, no paid image generation, no invented logos, numbers or testimonials.
- **Trust section:** how accounts, sealed links, the vault and "we never hold your money" work.

## Success measures for the beta
Set before launch, from `docs/research/02-validation-kit.md`. Main signal: share of people who try an estimate and then create a document for a real client.

## Not yet built
Prompt to PDF, PDF templates gallery, app screens in Bengali and Thai, learning from your past projects to improve estimates, team seats, subscription billing.
