# SignedScope: project status (Fri 6 Nov 2026)

## Summary

Brief: own ScopeLock end to end, from research and strategy through design, build, test, PR and launch prep.

1. **Research.** Looked at competitors, pricing, reviews and freelancer pain. The biggest problem is scope creep and unpaid extras. A name collision on "ScopeLock" forced a rename.
2. **Strategy and decisions.** Asked the owner the key questions (listed under Core decisions below).
3. **Design.** Went through four rounds:
   - **v2:** a "paper" style. Rejected as generic and AI-looking.
   - **v3:** bold and colorful. The colors were liked; the type and the amount of text were not.
   - **v4:** approved. Researched type and switched to Plus Jakarta Sans plus JetBrains Mono. Cut the copy hard, added a live five-step interactive demo, and mirrored the static design in Figma (file `pOuAmiM68x3cLukw3uIGJD`).
4. **Build.** Added these features:
   - Prices, currency and a pay link per item.
   - Totals with a comparison to the previous signed total.
   - AI drafting from a pasted client message (Anthropic API), falling back to simple rules.
   - Visit counts per `?ref=` tag, waitlist plans and the rename across the product.
   - New social image, demo GIF and screenshots.
5. **Test.** 10 unit tests and a Playwright run through the flow pass, and CI is green.
6. **PR #4.** Merged to `main` on 5 Nov (`de2d1d9`). The repo is now `tahmidbintaslim/signedscope`.
7. **Code review.** Ran on PR #4 and found 8 issues. They were **not** fixed before the merge.

## Core decisions

| Topic | Decision |
|---|---|
| Name | **SignedScope** (old name ScopeLock is mentioned in the FAQ) |
| AI | AI drafting ships now, in v2 |
| Payments | Agencies use their own payment links (Stripe, Wise, Omise, PayPal, Payoneer). Later, Pro uses the owner's Stripe through Stripe Connect for invoices, pay links and tax |
| Pricing | Flat plans: Free, Pro $19/mo, Agency $49/mo |
| Visual | Bold colors in a Stripe/Framer style without copying Stripe's look. Violet #7C3AED, pink, coral, sun, sky, navy ink |
| Type | Plus Jakarta Sans (free license, covers Vietnamese) with JetBrains Mono, both hosted on our own server |
| Copy | Plain words, no hype, US spelling, no em-dashes. Headline 7 words max, section heads 6 words max. Never invent testimonials or figures |
| Constraints | Page URLs stay the same. Scripts load only from our own site (no inline scripts). The site says it is not a legal e-signature |

## Tasks

### Completed
- [x] Competitor, pricing and pain research, plus the name collision check
- [x] Owner decisions on name, AI, payments and pricing
- [x] v4 design system, home page, interactive demo and motion, plus Figma frames
- [x] Prices, currency, pay link and totals on the new, sign and receipt pages
- [x] AI drafting with the rules fallback (`api/draft.js`)
- [x] Ref visit counts (`api/hit.js`, `scripts/ref-report.js`) and a privacy note for them
- [x] Social image, demo GIF, screenshots, launch kit (`docs/LAUNCH.md`)
- [x] Tests pass and CI is green
- [x] PR #4 merged; repo cloned as `signedscope`
- [x] Code review of PR #4 (8 findings)

### In progress
- [ ] Follow-up PR with the review fixes (waiting for the go-ahead)

### Pending, by priority
**P0: before launch**
- [ ] AI drafting timeout. The Anthropic call can run past the 30-second limit on Vercel, so the rules fallback never runs. Shorten it to about 9 seconds with no retry.
- [ ] Decimal-comma prices. "1.234,50" is read as 1.2345. Reject commas that could be either a decimal or a thousands mark, or read them by locale.
- [ ] Mixed currencies. A change request keeps the previous total but not its currency. Store the currency and refuse to compare totals in different currencies.
- [ ] AI cost abuse. The rate limit lives only in memory and is skipped when there is no IP. Move it to storage, add an overall cap and skip AI when there is no IP.
- [ ] Pay button. Show it only when something was approved and the total is above 0, and say the link belongs to the agency.
- [ ] Privacy page. Say that pasted messages go to Anthropic when AI drafting is on.
- [ ] Point the production domain at the site and update `og:image`, which still uses `scopelock-sable.vercel.app`.
- [ ] Set `ANTHROPIC_API_KEY`, `SIGNING_SECRET` and `BLOB_READ_WRITE_TOKEN` in Vercel production.

**P1**
- [ ] Out-of-scope detection misses "won’t" typed with a curly apostrophe.
- [ ] `money()` can show one decimal place ("$750.5"). Set the minimum decimal places to match.
- [ ] Tests for both of these.
- [ ] Launch posts on the channels listed in `docs/LAUNCH.md`, each with its own `?ref=` tag.

**P2**
- [ ] One shared rate-limit helper and one shared ref pattern.
- [ ] Pro: invoices, pay links and tax through Stripe Connect.
- [ ] Turn waitlist sign-ups into paid plans (billing).

### Blocked (owner action)
- [ ] Trademark check on "SignedScope".
- [ ] Buy signedscope.com or .app. Both were free on 3 Nov.
- [ ] Vercel access and production secrets (see P0).
