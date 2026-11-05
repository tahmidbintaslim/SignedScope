# SignedScope launch update (2026-11-03)

ScopeLock is now **SignedScope**, because scopelock.app is an unrelated live product ($59/month) sold to the same buyers. The ScopeLock sections further down are the earlier plan. Where they disagree, this section wins.

## Before any public post (owner)

- [ ] Trademark search for "SignedScope" (USPTO TESS, EUIPO TMview, DIP Thailand), then buy `signedscope.com` and `signedscope.app`. Both were unregistered on 2026-11-03.
- [ ] Add both domains to the Vercel project. Make `signedscope.com` primary, and redirect `scopelock-sable.vercel.app/*` to the same path on `signedscope.com`. Existing `/sign#`, `/receipt#` and `/new#cr=` links keep working, because the fragment survives a redirect and the signing secret is unchanged.
- [ ] Optional: set `ANTHROPIC_API_KEY` in Vercel for AI drafts. Without it, drafting uses the rule-based splitter.
- [x] `docs/img/` regenerated (`scripts/capture-screenshots.js`), demo GIF and `public/og.png` recorded (`scripts/capture-demo.js`). Rerun both after the domain moves, and update `og:image` in `public/index.html` to the new domain.
- [ ] Optional: rename the GitHub repo to `signedscope`. GitHub redirects the old URL.
- Stripe live mode and Stripe Connect stay a separate decision, after the build gate (50 waitlist sign-ups or 10 paid).

## Positioning in one line

"Your client signs what they said yes and no to. Every change after that shows up with its price."

## Product Hunt

- Tagline (60 characters max): Every line signed, every change priced
- Description: SignedScope turns scope and UAT checklists into a link your client approves line by line, with prices. Later asks become change requests shown as a priced diff against what they signed, with your own Pay link. No signup for the client.
- Maker comment:

> I'm Tahmid Rafi, an engineer in Bangkok. Every freelancer knows the message: "Can we also add one small thing?" Saying yes is a discount you never agreed to. Saying no feels like risking the client.
>
> SignedScope takes the conversation off your plate. The client signs the scope line by line, with a price on each line. When the next ask comes in, you paste their message, set a price, and send a change request. They see exactly what moved since they signed, accept or reject each change (a rejection needs a reason), sign, and get a Pay button that opens your own Stripe, Wise, Omise, PayPal or Payoneer link.
>
> It is free and open source, with no database: the document lives in the signed link. Pro ($19 flat) is not built yet. The home page has a 30-second demo you can play without signing up.
>
> What is the last "quick change" a client asked you for?

## Show HN

- Title: Show HN: SignedScope, priced change requests your client signs, with no database
- Body: keep the technical body from the ScopeLock draft below, and add one paragraph:

> New in this version: per-line prices, a running total, change requests that show the signed baseline next to the new total, an allow-listed Pay link, and a draft endpoint that turns a pasted client message into lines (Claude if a key is set, rule-based otherwise). I renamed it from ScopeLock after finding an unrelated product with that name.

## Founder-led outreach (first 50 agencies)

Sources: the Shopify Partner directory and Clutch (web and Shopify agencies with 3 to 30 people), plus offshore teams in Bangladesh, Vietnam, the Philippines and Thailand. Send one message per agency, personalized to the agency, and never automated.

> Hi {name}, I build tools for agencies. Quick question: when a client asks for "one small change" after sign-off, how do you usually handle the price? I made a free tool that turns their message into a priced change request they sign: {link}?ref=outreach. There's a 30-second demo on the home page. Would it fit how you work? Blunt feedback welcome.

Attribution: any link with `?ref=<tag>` (for example `?ref=outreach`, `?ref=hn`, `?ref=ph`, `?ref=linkedin`) is counted once per visit, anonymously, and the tag is saved with a waitlist sign-up. Run `BLOB_READ_WRITE_TOKEN=... node scripts/ref-report.js` for visits and sign-ups by tag.

## Measure for 2 weeks

- Waitlist sign-ups by plan (Blob `waitlist/`)
- Replies to outreach, and the number of agencies that send one real link
- Build gate for Pro: 50 waitlist sign-ups or 10 paid

---

# Launch plan: ScopeLock, checkout-sentinel, Thai BOI tech jobs

Prepared 2026-10-26. Stripe is in **test mode** (account "Devsaround"). Nothing has been posted publicly.

## 1. Launch order

| # | Product | Revenue potential | Time to MVP | Reputation value | Verdict |
|---|---|---|---|---|---|
| 1 | **ScopeLock** (UAT and scope sign-off) | Medium-high: B2B, every agency and freelancer has this pain; $19–49/mo | **Shipped today** (stateless, no DB) | Medium-high: novel "no-DB HMAC receipts" angle for HN; a fit for PH | **Launch first** (week 1) |
| 2 | **checkout-sentinel** | Highest per customer (stores lose real money on a broken checkout); $29–149/mo | v0.2 merged, v0.3 read-only dashboard merged; needs a hosted landing page and a demo video | **Highest**: deep OSS (NestJS, BullMQ, Playwright), strongest hiring story | **Launch second** (week 3). Stagger so each launch gets its own HN/PH cycle |
| 3 | **Thai BOI tech-jobs directory** | Low-medium: job-board sponsorships and featured listings; slow to monetise | 1–2 weeks: data curation is the bottleneck, not code | High locally (Thailand dev community, LinkedIn); low on HN | **Launch third** (week 5), as a free public good that builds an audience |

Why ScopeLock goes first even though checkout-sentinel has more revenue: it is done today, it needs no infrastructure to self-serve, and it gives the owner a full launch rehearsal (PH, HN, X, LinkedIn) before the flagship OSS launch.

---

## 2. One-pagers

### ScopeLock (live: https://scopelock-sable.vercel.app)
- **ICP:** freelance developers and 2–20-person web/Shopify agencies doing fixed-price work, initially in SEA and the global remote market. Buyer: agency owner or PM. Trigger: a client dispute or a "while you're at it" request.
- **Pricing:** Free (no cap on links, receipts or change requests). **Pro $19/mo**: workspace, email notifications, branding, PDF, CR log. **Agency $49/mo**: 10 seats, white-label domain, API/webhooks. Early access prices; Pro and Agency are not built yet.
- **MVP scope (shipped):** create a sign-off (scope, UAT and out-of-scope items, paste-to-split), client sign page (accept/reject with comment, acknowledge exclusions, declaration), HMAC-signed receipt with evidence, public verify page, change requests with an added/changed/removed diff against the signed baseline, waitlist (Vercel Blob, private), Stripe Payment Links (test), privacy page.
- **Next for Pro (build only after 10 paid or 50 waitlist sign-ups):** auth plus Postgres workspace; Resend email on sign/reject; logo; PDF via @react-pdf or Playwright; signer email OTP.
- **Stack:** static HTML/CSS/vanilla JS plus five Node serverless functions; `crypto` HMAC; `@vercel/blob`; Stripe Payment Links. No analytics: success is measured by waitlist sign-ups (Blob) and Stripe checkouts.
- **Hosting:** Vercel project `scopelock` (team "My Projects"), production alias `scopelock-sable.vercel.app`. Env: `SIGNING_SECRET` (sensitive), `BLOB_READ_WRITE_TOKEN` (linked store `scopelock-waitlist`), `STRIPE_LINK_PRO` and `STRIPE_LINK_AGENCY` (test links). Cost: $0 on Hobby until traffic grows (switch to Pro if it is used commercially, per Vercel ToS).

### checkout-sentinel
- **ICP:** Shopify Plus / WooCommerce merchants doing $50k+/month and the agencies that maintain them. Trigger: a theme or app update silently broke add-to-cart and someone noticed days later.
- **Pricing:** OSS self-host (MIT) free forever. **Hosted Starter $29/mo**: 3 journeys, every 15 minutes, Slack/email. **Growth $99/mo**: 15 journeys, every 5 minutes, mobile and desktop, screenshots, 90-day history. **Agency $149/mo**: 50 stores, client-facing status pages.
- **MVP scope:** the v0.3 read-only dashboard demo (merged, needs Pages enabled) plus a landing page with a waitlist and a Stripe link (copy ScopeLock's pattern: `api/checkout`, `api/waitlist`). Hosted multi-tenant runner comes after 10 waitlist sign-ups with a stated budget.
- **Stack:** existing NestJS API, BullMQ worker, Playwright, Postgres, Redis, Vue 3 dashboard. Hosted: Fly.io or Railway for API, worker and Redis (Playwright needs a real container; not Vercel functions), Neon Postgres, Vercel for landing and dashboard.
- **Hosting:** landing on Vercel; dashboard demo on GitHub Pages (owner action: Settings > Pages > Source = GitHub Actions).

### Thai BOI tech-jobs directory (working name "BOI Jobs TH")
- **ICP:** foreign software engineers who want to move to Thailand (work permit and visa through a BOI-promoted company), plus Thai-based engineers changing jobs. Secondary: BOI companies that want foreign talent (they pay).
- **Pricing:** free to browse, with email alerts free. **Featured employer $99/month**, **job post $49/30 days**. Later, a "relocation pack" guide at $19 one-off.
- **MVP scope:** about 80 hand-verified companies (name, BOI promotion evidence link, sponsors visas Y/N/unknown with source, stack, careers URL); jobs pulled **only** from public ATS JSON feeds (Greenhouse, Lever, Ashby, Workable, SmartRecruiters) and company career pages that allow it in robots.txt. **No LinkedIn or JobsDB scraping.** Every claim links to its source, with a "last verified" date and a "report a correction" link.
- **Stack:** Astro static site plus a nightly GitHub Action that fetches ATS feeds into JSON; Vercel Cron as an alternative; Blob for alerts sign-up.
- **Hosting:** Vercel, $0.
- **Risk to manage:** BOI status and visa sponsorship change. Label it "community-maintained, verify with the employer", never give immigration advice, and add a disclaimer.

---

## 3. Open-source star strategy

**Rules that move stars:** a hero image or GIF in the first screen, a one-line value proposition, a "try it in 30 s" path (hosted demo or `npx`/`docker compose up`), honest status badges, 8–20 relevant topics, a social preview image (Settings > Social preview, 1280×640), a pinned repo order on the profile, and a launch post per repo spaced at least 2 weeks apart. Ask for stars only once, in the README footer.

**Pin order on github.com/tahmidbintaslim:** checkout-sentinel, scopelock, shopify-ucp, sun-ui, promptpay-storefront, gmail-auto-unsubscribe.

| Repo | Polish before its launch | README hero line | Demo GIF (≤ 20 s, 800 px wide) | Topics |
|---|---|---|---|---|
| **checkout-sentinel** | Enable Pages for the v0.3 dashboard; add a "Deploy in 5 min" compose section at the top; badges (CI, license, release); CHANGELOG v0.3 | "Find out your Shopify/WooCommerce checkout is broken before your customers do." | Break the fixture's Add to cart then mobile run fails then Slack alert with screenshot then fix then recovery alert | `shopify` `woocommerce` `synthetic-monitoring` `playwright` `ecommerce` `checkout` `uptime-monitoring` `nestjs` `bullmq` `vue3` `self-hosted` `observability` |
| **scopelock** (repo is public) | Set topics and a social preview from `docs/img/01-landing.png`; add a GitHub Action running `npm test` | "Scope and UAT sign-off links with signed receipts." | New sign-off then client accepts/rejects then receipt then change request showing the CHANGED/ADDED diff (the frames in `docs/img/` are ready) | `agency` `freelance` `scope-creep` `uat` `sign-off` `hmac` `tamper-evident` `serverless` `vercel` `no-database` `project-management` |
| **shopify-ucp** | Fix the 9 known issues first (P3 list), add the read-only MCP playground. **Don't promote until the playground works** | "Make any Shopify store callable by AI agents over MCP." | Agent asks "waterproof jackets under $150" then `tools/call` trace then products | `mcp` `model-context-protocol` `shopify` `shopify-app` `ai-agents` `agentic-commerce` `remix` `polaris` |
| **sun-ui** | Register the npm scope and publish 0.1.0; add a "SaaS settings screen" example; link Storybook in the About box | "26 MUI v7 components, one variant/color/size API, light and dark tokens." | Change the variant prop across components then toggle dark mode then token table | `react` `mui` `design-system` `component-library` `storybook` `design-tokens` `typescript` `dark-mode` |
| **promptpay-storefront** | QR preview is live (PR #6). Add a "WooCommerce plugin waitlist" CTA plus a Stripe link | "PromptPay QR payments for WooCommerce, with exact totals, slip upload and duplicate-slip rejection." | Type a PromptPay ID and amount then QR renders then scan it on a phone | `promptpay` `thailand` `woocommerce` `qr-code` `emvco` `payments` `wordpress-plugin` |
| **gmail-auto-unsubscribe** | PR #6 merged (demo GIF). Submit to the Chrome Web Store ($5 developer fee, owner); add a privacy section near the top | "Unsubscribe from every Gmail newsletter in one click, without the extension ever reading your mail." | The existing 15 s run GIF | `chrome-extension` `gmail` `unsubscribe` `privacy` `manifest-v3` `productivity` `email` |

---

## 4. Launch kit for ScopeLock (drafts; the owner posts)

Voice rules applied: plain first person, no emoji, no em dashes, sentence case, US spelling, no slogan. Every claim below is something the product or the repo supports. I make no claim about your past client work; add one yourself if you want it.

Before posting:
1. The GitHub repo is already public. Set the topics, the social preview and the About link.
2. Optional: a custom domain. Check the price first.

Separate, owner-approved step, not a launch blocker: Stripe live mode. The landing page only has waitlist buttons today, so no payment can happen until live mode is approved and the buttons are pointed at checkout again.

### Product Hunt

- Name: ScopeLock
- Tagline (60 characters max): Scope and UAT sign-off links with signed receipts
- Topics: Productivity, Freelance, SaaS, Developer Tools
- Description (260 characters max): ScopeLock turns a scope and UAT checklist into a link. The client accepts or rejects each item and signs. The client gets an HMAC-signed receipt link that anyone can verify, and new asks become change requests with a diff. No signup and no database on the free tier.
- Gallery: `docs/img/01-landing.png`, `02-create.png`, `04-client-review.png`, `05-receipt.png`, `07-client-diff.png`, and `demo.gif`
- Maker comment:

> I'm Tahmid Rafi, a Lead Full Stack Software Engineer & Solutions Architect in Bangkok. I built ScopeLock to settle one sentence: "I thought that was included."
>
> You list what is in scope, the UAT checks and what is out of scope. The client gets a link, accepts or rejects each item (a rejection needs a comment), acknowledges the exclusions and signs. The client gets a receipt link signed with HMAC-SHA256, to keep and send to you. Any change to the document fails verification.
>
> For a new ask, you start a change request from the signed receipt. The client sees added, changed and removed items compared with what they approved.
>
> The free tier stores no documents. The document is in the link's URL fragment, and the waitlist stores an email address and a keyed IP hash. Pro and Agency are planned and not built yet, at $19 and $49 per month. You can join the waitlist for either.
>
> What would you need to see before you send this to a client?

### Show HN

- Title: Show HN: ScopeLock, scope sign-off links with HMAC receipts and no database
- Body:

> ScopeLock turns a scope and UAT checklist into a link. The client accepts or rejects each item and signs, and the client gets a signed receipt link to keep and send to the agency.
>
> How it works: there is no database. The document is JSON, base64url-encoded and signed by the server with HMAC-SHA256 as `v1.<payload>.<mac>`. It lives in the URL fragment, so it does not reach server logs. Signing returns a receipt token that embeds the document, its SHA-256, the decisions, a timestamp, the country and a user agent hash, signed the same way. Verify recomputes the MAC with a constant-time compare. A change request embeds the parent receipt's hash and items, so the client sees a diff against the baseline.
>
> Limits: signer identity is self-declared, and there is no email check yet. Rotating the server secret invalidates every old link until I add key IDs. It is a record of agreement, not a qualified e-signature.
>
> The code is about 500 lines of JavaScript and CSS plus HTML: five serverless functions on Vercel and static pages. MIT license: github.com/tahmidbintaslim/scopelock. Live: https://scopelock-sable.vercel.app
>
> I would like critique of the threat model, and opinions on whether keeping no state is a feature or a liability for this kind of tool.

### X thread

1. Scope disputes usually come down to one sentence: "I thought that was included." I built ScopeLock for that. It turns a scope and UAT checklist into a sign-off link with a signed receipt. [demo.gif]
2. You list what is in scope, the UAT checks and what is out. The client accepts or rejects every item. A rejection needs a comment, and each exclusion needs an explicit acknowledgment.
3. When the client signs, they get a receipt link signed with HMAC-SHA256 to keep and send to you. Any change to the document fails verification, and anyone can check one on the verify page.
4. For a new ask, start a change request from the signed receipt. The client sees added, changed and removed items compared with what they approved. [07-client-diff.png]
5. The free tier stores no documents. The document sits in the URL fragment. There is no database, no signup and no client login.
6. Pro and Agency are planned and not built yet, at $19 and $49 per month, with a waitlist for each. Try it: https://scopelock-sable.vercel.app. Code, MIT: github.com/tahmidbintaslim/scopelock

### LinkedIn

> I built ScopeLock, a tool that turns a scope and UAT checklist into a sign-off link.
>
> The client accepts or rejects each item, comments on any rejection, acknowledges the exclusions and signs. The client gets a receipt link signed with HMAC-SHA256. A later request becomes a change request that shows added, changed and removed items compared with what the client approved.
>
> The free tier has no signup, no client login and no database. The document lives in the link.
>
> I'm Tahmid Rafi, a Lead Full Stack Software Engineer & Solutions Architect in Bangkok. If you run an agency or freelance, I would like to know whether you would send this to a client, and what is missing.
>
> https://scopelock-sable.vercel.app

### Claude and MCP directories

ScopeLock is not an MCP server, so there is nothing to list. A follow-up of about one day: a small `scopelock-mcp` server with `create_signoff(items)` and `verify_receipt(url)` tools. Once it exists, list it on the official MCP Registry (registry.modelcontextprotocol.io), mcp.so, Smithery and Glama. shopify-ucp fits those directories better, after its playground works.

### Launch-day checklist

T-7 to T-2 days
- [ ] Set the topics, social preview and About link on `tahmidbintaslim/scopelock` (it is already public)
- [ ] Make a 1270 by 760 thumbnail for Product Hunt and crop the gallery screenshots to that size; the full-page captures are too tall
- [ ] Optional: buy a domain and add it to the project
- [ ] Separate step, only when you approve it: Stripe live mode (live Payment Links, then update `STRIPE_LINK_PRO` and `STRIPE_LINK_AGENCY`, point the Pro and Agency buttons at `/api/checkout` again, redeploy, make one real $19 purchase and refund it)
- [ ] Schedule Product Hunt for Tuesday to Thursday at 00:01 PT. That is 14:01 in Bangkok until the US moves to standard time on November 1, 2026, and 15:01 after that. Ask 10 people to try it and comment honestly

Launch day (Bangkok time)
- [ ] Product Hunt goes live (00:01 PT); post the maker comment
- [ ] 15 minutes later: X thread and LinkedIn post
- [ ] About 13:00 UTC (US morning, 20:00 in Bangkok) Show HN; stay for 3 hours and answer every comment with technical detail
- [ ] Every 2 hours: Vercel runtime errors and logs, the waitlist count (Blob `waitlist/`)
- [ ] Reply to every Product Hunt and Hacker News comment within 30 minutes

T+1 to T+7 days
- [ ] Email the first 50 waitlist sign-ups personally and ask for a 15 minute call
- [ ] Post a follow-up with real numbers
- [ ] Decide on building Pro: 10 paid early access sign-ups, or 50 Pro or Agency waitlist sign-ups
