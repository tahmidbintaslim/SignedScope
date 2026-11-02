# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary A: web and Shopify agency owners and project managers** (3 to 30 people). Job: get a client to approve scope at kickoff, sign off UAT at handover so the final milestone can be invoiced, and agree in writing to every change before it is quoted.
- **Primary B: offshore and nearshore dev teams** (Bangladesh, Vietnam, the Philippines, Thailand) serving US, UK, EU and AU clients across time zones, often on fixed-price or Upwork milestones.
- **The client (signer):** opens one link in any browser, with no account, decides on each item and signs.

## Product Purpose
Turn a scope or UAT checklist into a link the client accepts or rejects item by item and signs, producing a tamper-evident receipt. New asks become change requests shown as a diff against the signed version. Success: the agency gets the final milestone signed and paid, and every change paid for.

## Positioning
Item-level decisions (every rejection needs a reason) plus change requests linked by hash to the signed revision, with a receipt anyone can verify, and no stored documents on the free tier. Email approval has no structure; PDF plus e-signature signs a whole file and cannot diff changes.

## Operating Context
Used at three moments: kickoff scope, UAT handover, change requests. Agencies paste existing checklists or start from templates (Shopify store launch, WordPress site handover, mobile app UAT). Clients sign on desktop or phone, often non-technical.

## Capabilities and Constraints
- Stateless: `POST /api/seal` returns `v1.<base64url(json)>.<hmac>`; data lives in the URL fragment (`/sign#`, `/receipt#`, `/new#cr=`). `/verify` recomputes the HMAC.
- App URLs `/new`, `/sign`, `/receipt`, `/verify`, `/privacy`, `/thanks` must not change (links already sent).
- Limits: up to 100 items of 600 characters, one link of about 60,000 characters.
- CSP: `script-src 'self'`, no inline scripts, no third-party scripts or analytics.
- Marketing site: Astro static at repo root, deployed on Vercel.
- Pricing: Free $0 (works today); Pro $19/month and Agency $49/month are planned, waitlist only.
- Not a legally binding e-signature; signer identity is self-declared.

## Brand Commitments
- Name: ScopeLock (binding). Logo, colors and type are open for redesign.
- Voice: plain, first person from the builder (Tahmid Rafi, Bangkok), concrete, no hype, no em-dashes in body copy, US spelling.
- Open source, MIT license.
- Visual direction (owner, 2026-11-02): the category-standard SaaS look, played straight. Craft bar: Cal.com and Loom (friendly, light, simple product demos for small teams).

## Evidence on Hand
- Real product screens and demo GIF: `public/img/demo.gif`, `public/img/04-client-review.jpg`, `public/img/05-receipt.jpg`, `public/img/07-client-diff.jpg`.
- No testimonials, customer logos, user counts or case studies exist. Never fabricate them; the product itself is the proof.

## Product Principles
1. Show the receipt, not adjectives: the signed artifact is the proof.
2. Honest limits: say what it is not (not an e-signature, Pro not built yet).
3. Zero friction for the client: no account, one link, works on a phone.
4. Money outcome first, mechanism second.

## Accessibility & Inclusion
WCAG 2.2 AA. Signers are often non-technical and may read English as a second language: plain words, large targets, works at phone width.
