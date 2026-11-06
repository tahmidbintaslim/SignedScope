# SignedScope: Market and Competitor Research (Task 2)

- **Prepared:** 2026-11-06.
- **Citations:** Every claim carries a source tag `[S#]`. The full URLs are in the **Sources** table at the end, and every source was accessed on 2026-11-06.
- **Evidence labels:**
  - **P** = primary (the vendor's or regulator's own page).
  - **P-snip** = a primary URL that blocked direct fetching (HTTP 403) or came back empty. The claim comes from the search-engine extract of that page, so re-check it manually.
  - **S** = secondary (news, law-firm or vendor blogs).
  - **R** = user review or forum, used only for complaint themes.
- **"Not verified"** means I could not confirm the point from a primary source today.

---

## 1. Competitor matrix

| Tool | Target segment | Proposal / quote | Contracts & e-sign | Client portal | Payment methods / integrations | Scope change / change order / versions | AI | Localization (TH/BN/MS, local currency) | Lowest paid price: monthly / annual | Free plan / trial |
|---|---|---|---|---|---|---|---|---|---|---|
| **Bonsai** | Freelancers and small teams; priced per user [S1] | Proposals from Essentials up [S1] | Contracts from Essentials up. E-sign is not named as a plan feature on the pricing page [S1] | Essentials and up [S1] | Bonsai Payments (US/UK/CA/AU only), your own Stripe account (any Stripe country except India), or PayPal. Offline payments (wire, cheque) are **not** auto-marked as paid [S2] | No change-order feature found. A help article title says edits update a proposal already sent; the client re-approval flow is not verified [S3] | "Bonsai MCP" connector for Claude, ChatGPT and Gemini [S1] | Pricing page shows English only. "Multi-currency billing" is listed but not by plan [S1]. TH/BN/MS not verified | Basic $15/mo or $9/mo annual. The cheapest plan with proposals, contracts and invoices is **Essentials: $25/mo or $19/mo annual** [S1] | No free plan; 7-day trial [S1] |
| **Moxie** | Freelancers; Teams plan up to 5 members [S4] | "Proposals, quotes & contracts" on Starter [S4] | Contracts on Starter. E-sign is not stated on the pricing page [S4] | **Pro and up only** (white-label) [S4] | Stripe (card, Apple Pay, Google Pay, ACH) and PayPal Business [S5]. No native Square [S5] | Not found (not verified) | Moxie AI assistant on all plans [S4] | USD pricing only. Languages not stated [S4] | **Starter $12/mo or $10/mo annual ($120/yr)**. Pro $25/mo or $20/mo annual [S4] | "Try for free"; the page title says 14-day trial [S4]. Location- and need-based scholarships [S4] |
| **Plutio** | Freelancers and small businesses [S6] | Unlimited proposals with e-sign and view tracking [S6] | Unlimited contracts with e-sign [S6] | All plans; white-label is a $9/mo add-on below Max [S6] | Invoices accept Stripe, PayPal or Square [S6] | Not found. The help overview does not cover editing after signature [S7] | "Plutio Pal" credits: 500/mo on Core. A proposal generation costs 5 credits [S6] | Not stated [S6] | **Core $19/mo or $190/yr (~$15.83/mo)** [S6] | 7-day trial, no card; limited to 3 clients [S6] |
| **HoneyBook** | US/CA/UK/AU small service businesses [S8] | Proposals ("book, sign, pay" in one file) [S8] | Included [S8] | All plans [S8] | Card and ACH through HoneyBook. The page states card fees inconsistently (2.7%+10¢ vs 2.9%+25¢) [S8] | No named change order. Edit-after-sign triggers an "Accept changes" banner, and re-signing is required in some cases [S9] | HoneyBook AI on all plans [S8] | **Only available in US, CA, UK, AU** [S8] | **Starter $29/mo billed annually**. Monthly-billed price not clearly shown (struck-through $36) [S8] | No free plan; 30-day trial, no card [S8] |
| **Dubsado** | Service businesses (CRM + workflows) [S10] | Public proposals on Premier only [S10] | "Legally binding contracts" link; not detailed on the pricing page [S10] | Both plans [S10] | Dubsado Payments (Stripe), Square, PayPal. Supported countries are limited (list not retrieved) [S11] | Not found (not verified) | Not stated on pricing page [S10] | Country and currency chosen at payment setup [S11]. Languages not verified | **Starter $335/yr (~$27.9/mo)**. Monthly price not shown [S10] | 21-day trial of Premier, no card [S10] |
| **PandaDoc** | Sales teams, SMB to enterprise [S12] | Quotes on **Business+ only** [S12] | E-sign on all plans incl. Free [S12] | Not a portal product (not verified) | Payment collection on Business+ (Stripe, Square, Authorize.net, PayPal, QuickBooks Payments, FreshBooks) [S12] | **Version history on Business+**. Editing a sent document **erases all signatures** and returns it to Draft [S13]. No change-order object | AI Assistant from Starter; MCP (beta) on all plans [S12] | Not stated [S12] | **Starter $19/seat/mo annual**. Monthly-billed $35 is from S sources only, not on the primary page [S12][S14] | Free plan (5 docs/mo); 14-day trial [S12] |
| **Proposify** | Sales teams [S15] | Interactive quotes; buyer accepts [S15] | E-sign on all plans [S15] | No | Stripe [S15] | Internal approval workflows (Grow+) before sending. No client change orders found [S15] | AI writing widget + MCP [S15] | UI in 15 languages; proposal content is not translated [S15] | **Build $49/user/mo or $39/user/mo annual** [S15] | 14-day trial [S15] |
| **DocuSign eSignature** | Anyone who needs signatures [S16] | No | Core product; 44+ signing languages [S16] | No | Payment collection only on Business Pro+ [S16] | Not applicable (envelope-level) | "AI-assisted summary" on Personal [S16] | 44+ signing languages (list not shown) [S16] | **Personal $11/mo with annual commitment (5 envelopes/mo)**. Monthly-only price not shown [S16] | No trial on page; 30-day refund on annual plans [S16] |
| **Ignition** (found during research) | Accountants, bookkeepers, agencies, professional services [S17] | Proposals [S18] | Client acceptance [S18] | Not verified | Not shown on pricing page [S17] | **Dedicated Change Orders on accepted proposals**, with client approval (details in §4) [S18] | Not verified | Not verified | Prices not rendered on the page [S17] | 14-day trial, no card [S17] |
| **FlowAccount** (TH, regional) | Thai SMEs and freelancers [S19] | Quotations, billing notes, tax invoices [S19] | Signature and company stamp on documents. This is not verified to be e-sign with audit trail [S19] | Not verified | "FlowPay": card, transfer, QR. PromptPay is not named [S19] | Not verified | Not verified | **Thai + English UI and printing; e-Tax invoice** [S19] | Standard ฿199/mo (list), ฿1,990/yr [S19] | Free plan (basic docs); 30-day full trial [S19] |
| **Bukku** (MY, regional) | Malaysian SMEs (accounting) [S20] | Not shown on pricing page [S20] | Not verified | Not verified | "Payment gateway integrations" (not named) [S20] | Not verified | Not verified | MYR; LHDN e-Invoice on all plans [S20] | Seed RM35/mo or RM350/yr (excl. 8% SST) [S20] | Free "Launch" plan; 30-day Elite trial [S20] |
| **HitPay** (SG/MY/PH, payments, not a proposal tool) | SMEs [S21] | No | No | No | PayNow, DuitNow, cards. Payment links and invoices carry +0.2% [S21] | No | No | SGD/MYR [S21] | No monthly fee; per-transaction pricing [S21] | Not applicable |
| **Bangladesh local tools** | PipraPay (self-hosted, bKash/Nagad/Rocket invoicing) and BillingServ (bKash gateway option) appeared in search [S22][S23] | Not verified | Not verified | Not verified | bKash/Nagad | Not verified | Not verified | Not verified | Not verified | Not verified |

**Takeaway.** For BD/TH freelancers, no global competitor has a payment rail that works in Bangladesh:
- Stripe is not available in BD [S24].
- HoneyBook is limited to four countries [S8].
- Bonsai Payments is limited to US/UK/CA/AU [S2].

The regional tools (FlowAccount, Bukku) are accounting and tax-document tools. I found no evidence that they offer scope or change-request workflows.

---

## 2. Pricing comparison (entry tier that includes proposal + contract/e-sign + invoicing)

| Tool | Plan | Monthly billing | Annual billing (per-month equiv.) | Billing notes | Source |
|---|---|---|---|---|---|
| **SignedScope (hypothesis)** | Pro / Plus | $10 / $20 | Not set | Basic $5 maybe later | Brief |
| Moxie | Starter (no client portal) | $12 | $10 ($120/yr) | Client portal needs Pro: $25/mo or $20 annual | [S4] |
| Bonsai | Essentials | $25/user | $19/user | Basic ($15/$9) lacks proposals, contracts and payments. Elite needs at least 3 users | [S1] |
| Plutio | Core | $19 | $15.83 ($190/yr) | Annual ≈ 2 months free; trial capped at 3 clients | [S6] |
| HoneyBook | Starter | Not clearly shown | $29 (billed annually) | US/CA/UK/AU only | [S8] |
| Dubsado | Starter | Not shown | ~$27.9 ($335/yr) | Annual only on page | [S10] |
| PandaDoc | Starter (no quotes/payments) | $35/seat (S only, not verified) | $19/seat | Quotes and payments need Business at $49/seat annual | [S12][S14] |
| Proposify | Build | $49/user | $39/user | Send limits apply | [S15] |
| DocuSign | Personal (e-sign only) | Not shown | $11 (annual commitment, billed monthly) | 5 envelopes/mo | [S16] |
| FlowAccount (TH) | Standard | ฿199 list (฿165 shown) | ฿1,990/yr | Monthly billing by credit card only | [S19] |
| Bukku (MY) | Seed | RM35 | RM350/yr | Excl. 8% SST; annual = 10 months | [S20] |

**Implication.** $10 Pro equals Moxie Starter's annual price [S4] and undercuts every other bundled tool listed here. $20 Plus equals Moxie Pro's annual price, which includes a white-label portal [S4]. Price alone is not a differentiator against Moxie. FlowAccount at ฿165–199/mo [S19] sets a local Thai reference price point (no USD conversion is given here).

---

## 3. Customer complaint themes (label R: user reviews; small visible samples, not representative)

| # | Theme | Evidence (R unless noted) | Implication for SignedScope |
|---|---|---|---|
| 1 | **Billing, auto-renewal and refund disputes** | PandaDoc: TrustScore 2.7, 721 reviews. 7 of the 9 visible 1–2★ reviews cite billing, renewal or pricing (Oct–Nov 2026) [S25]. Bonsai: an unused second account was charged for about 10 months (Sep 2026) [S26] | Make cancellation and renewal transparent. Send a renewal reminder email before annual renewals |
| 2 | **Price increases / plan gating** | HoneyBook Feb 2025 price rise reported by S blogs [S27]. PandaDoc: features moved behind credit packs [S25]. Moxie's portal and PandaDoc's quotes sit on higher tiers [S4][S12] | Keep change requests and payment tracking in the entry tier, since that is the core value |
| 3 | **Bugs in client-facing documents** | HoneyBook: clients could not sign proposals; wrong PDF attached (Oct 2026) [S28]. Plutio "janky" (Oct 2026) [S29]. PandaDoc editor duplicating content [S25] | The client view (approve, sign) must be extremely reliable and simple; that is where trust is lost |
| 4 | **Support hard to reach / AI-only support** | PandaDoc AI chat blocks escalation [S25]. HoneyBook support "didn't really help" [S28]. Bonsai: wants live chat [S26] | A small team can win on human support, but this does not scale. Budget for it |
| 5 | **Learning curve / setup time** | Dubsado: Capterra reviews repeatedly cite a steep setup (via search extract; page blocked) [S30] | Opinionated defaults: a brief → proposal → change request flow with no workflow builder |
| 6 | **Processing-fee distrust / client confusion** | Bonsai: a client thought they had to pay a 3% fee (Trustpilot via S summary) [S31]. HoneyBook: user avoids its payments because of fees [S28] | Supports the "never touch money; use your own link" positioning |
| 7 | **Thin project management** | Moxie: no task durations or dependencies (Jun 2026) [S32] | Do **not** compete on PM. Stay narrow |
| 8 | **Editing signed documents is clumsy** | HoneyBook community: clients re-notified on every edit; users create separate add-on files as a workaround [S33] | Direct evidence for the change-request wedge (see §4) |

---

## 4. Change-request / change-order capability (the claimed wedge)

| Tool | Capability | Quality assessment | Evidence |
|---|---|---|---|
| **Ignition** | Named **Change Order** created from an *accepted* proposal. You add, remove or reprice services; the client gets an email to review and approve; on acceptance the accepted proposal PDF updates and renewals use the new services. You can accept on the client's behalf if they consented. Article updated 29 May 2026 | **Strongest found.** Not verified: past-version history, invoicing link, plan limits. Aimed at accountants and agencies, not BD/TH freelancers | [S18] P |
| **HoneyBook** | No change-order object. Editing a sent or signed file triggers rules: approval only, or approval plus re-sign; once a payment is made, the service block **cannot be edited**; editing an invoice cancels autopay. The client sees an "Accept changes" banner. Client-side diff or version history is not stated | Medium. Real approval loop, but implicit and rule-heavy. Community uses separate "add-on" files as a workaround [S33]. Only US/CA/UK/AU | [S9] P, [S33] R |
| **Wethos** | Editing a signed proposal creates an **amended version** that must be re-signed; prior signed versions are kept; scheduled invoices pause until re-sign | Medium-strong versioning. Priced-delta presentation not described | [S34] P |
| **PandaDoc** | Version history (Business+). Editing a sent document **wipes all signatures** and returns it to Draft | Weak for change requests: it amounts to re-sending the whole document | [S13] P |
| **Better Proposals** | Accepted proposals can't be edited; duplicate, change and resend; the original stays visible | Weak (manual duplicate) | [S35] P |
| **Nusii** | Editing an accepted proposal removes all signatures and voids the original | Weak | [S36] P-snip |
| **Planning Pod** (events) | Change order for a signed proposal; earlier signed PDFs retained | Exists in a different vertical | [S37] P-snip |
| **Proposify** | Internal approval rules (price, discount) before sending; not client change orders | Not a change-order feature | [S15] P |
| **Bonsai, Moxie, Plutio, Dubsado, DocuSign** | No change-order or amendment feature found on pricing pages or by help-centre search | **Not verified either way.** Absence of evidence is not proof; check each in-app | [S1][S4][S6][S10][S16] |
| **Indie "scope creep" tools** | Scopebarrier (AI scope-vs-request report for web devs), Uncreep, StayInScope, a free Landolio tracker | Not verified (vendor or launch pages). Signals that many people are trying this idea | [S38] S |

**Skeptical verdict.**
- "Client-approved change requests" exists already as a named feature (Ignition) and as an implicit flow (HoneyBook, Wethos).
- SignedScope cannot claim to be first. A defensible claim would be the *combination* of four things, none of which I found in one freelancer-priced tool:
  1. a scope baseline with explicit version numbers;
  2. a client-facing **diff** showing what changed, the price delta and the timeline delta;
  3. one-click approval or e-sign of only the delta;
  4. an automatic payment request for the delta using the freelancer's own link, plus a running "approved total vs paid" ledger.
- None of these four elements is unique on its own.
- Interviews must test whether freelancers send formal change requests at all, or whether they negotiate in WhatsApp or Messenger and then invoice.

---

## 5. Payment-provider feasibility (freelancer receiving money)

| Country | Provider | Available to individuals? | Payment link or QR? | Public API for status? | Notes (verified facts only) |
|---|---|---|---|---|---|
| **BD** | Stripe | **No.** BD is not in Stripe's country list [S24] | Not applicable | Not applicable | Freelancers can't use Stripe Payment Links domestically |
| BD | PayPal | **Not verified / appears unavailable.** paypal.com/bd serves the US homepage with no BD content [S39]. S sources say no BD accounts [S40] | Not applicable | Not applicable | Do not offer "PayPal" as a BD default |
| BD | Payoneer | Payoneer offers Payment Requests and Payment Links [S41]. BD-specific eligibility not verified on a primary page. S news reports a bKash ↔ Payoneer link for freelancers [S42] | Link (Payoneer-hosted) [S41] | "Developer APIs" exist [S41]. Freelancer-level status API not verified | Most realistic international option; verify in interviews |
| BD | Wise | Wise can **send** BDT to bank, bKash and Nagad accounts (limits 250k BDT/day and 450k BDT/month to wallets) [S43]. BD is **not** in the hold-money list [S44]. "Can't get USD account details" if your address is in Bangladesh [S45, P-snip] | No receiving link for BD residents | Not applicable | Clients abroad can pay *to* a BD freelancer's bKash or bank via Wise transfers |
| BD | bKash | Personal Retail Account for people without a trade licence; QR, gateway and USSD; Business Dashboard payment links for Merchant and PRA holders [S46 P-snip][S47 S] | **Both** (QR, payment link) | Tokenized checkout API with *Query Payment* and *Search Transaction* [S48]. Eligibility not stated | Domestic BDT only. API access needs a merchant agreement (not verified) |
| BD | Nagad | Not verified | Not verified | No public official docs found. Community SDKs say the docs come from Nagad on merchant onboarding [S49] | Treat as manual "mark as paid" |
| **TH** | Stripe | **Yes.** TH listed [S24]. Individual and sole-proprietor business types exist [S50 P-snip] | Payment Links incl. PromptPay (THB) [S51] | Yes (Stripe API and webhooks) | PromptPay via Stripe only for TH accounts [S51] |
| TH | PromptPay (direct) | Individuals register mobile number or citizen ID with a bank; citizen ID links to one account [S52 P-snip][S53 S] | QR (bank-generated) | **No public scheme-level status API found.** Status needs a PSP (e.g., Stripe) | For a direct personal PromptPay QR, SignedScope can only record "client says paid" or "freelancer confirms" |
| TH | PayPal | Business accounts can receive; payment links and invoicing listed [S54] | Link | PayPal APIs (not checked) | Personal-account limits not verified |
| TH | Wise | **Conflicting.** Wise help: "temporarily stopped issuing currencies and account details for customers in Thailand" [S44] vs S news of a 2026 TH launch [S55] | Not verified | Not applicable | Re-check before relying on it |
| **MY** | Stripe | **Yes** [S24]. Stripe Services Agreement covers businesses incl. sole proprietors [S56 P-snip]. **FPX needs a Business Registration Number** [S57] | Payment Links incl. FPX (MYR) [S57] | Yes | Stripe DuitNow: no Stripe doc found (not verified) |
| MY | DuitNow | Individuals register mobile, NRIC or passport as a DuitNow ID [S58 P-snip]. **DuitNow Request** lets individuals request money (RM50k/day) [S59] | Request (P2P). QR via merchant acquirers (e.g., HitPay) [S60] | PayNet APIs are Issuer/Acquirer APIs for participants [S61]. No direct merchant access verified | HitPay: DuitNow **refunds not supported** [S60] |
| MY | Wise | **Personal accounts only** can hold money [S44] | Not verified | Not applicable | |
| **SG** | Stripe | **Yes** [S24]. New verification rules for non-individual accounts (incl. sole props) from Sept 2026; Individual accounts exempt from the representative rule [S62 P-snip] | Payment Links incl. PayNow (SGD, domestic only, S$0.50–200k) [S63] | Yes (webhooks) | PayNow QR expires after 1 hour [S63] |
| SG | PayNow (direct) | Individuals via mobile, NRIC/FIN or VPA; businesses via UEN [S64] | QR (SGQR) for paying | No API mentioned [S64] | |
| SG | HitPay | Individual eligibility not stated [S21] | PayNow links and invoices (+0.2%) [S21] | Not verified | PayNow online 0.65%+S$0.30 (≥S$100) [S21] |
| SG | Wise | Listed with no restriction [S44] | Not verified | Not applicable | |

**Product implication.**
- Automated "paid" status is only realistic where the freelancer has Stripe: TH, MY and SG [S24]. bKash merchant API status queries are also possible but eligibility is not verified [S48].
- In BD, and for direct PromptPay, DuitNow or PayNow, status must be **manual confirmation**, for example a client "I've paid" button plus the freelancer's confirmation and an optional receipt upload.
- Bonsai already treats offline methods as not auto-marked [S2], so manual tracking is normal in this category.

---

## 6. Localization notes (headlines only; no legal conclusions)

| Market | Business-document language | E-signature law headline | Source |
|---|---|---|---|
| **Bangladesh** | Not verified. Interviews should confirm whether freelancers serving foreign clients use English docs and what local clients expect | ICT Act 2006: s.5 lets a subscriber authenticate an electronic record by digital signature; s.6 gives legal recognition of electronic records. S sources note a certificate from a licensed Certifying Authority is needed for a recognised digital signature, and that the English and Bangla texts differ ("digital" vs "electronic" signature) | [S65 P-snip: UNODC copy of Act], [S66 S] |
| **Thailand** | Thai required for some tax docs: not verified. FlowAccount offers Thai and English docs and e-Tax invoices [S19] | Electronic Transactions Act B.E. 2544 (2001; amended 2008, 2019): enforceability can't be denied solely because a transaction is electronic; reliability tiers; family and succession matters excluded (per S summaries) | [S67 S], [S68 P-snip Adobe] |
| **Malaysia** | Not verified. LHDN e-Invoice is supported by local tools [S20] | Electronic Commerce Act 2006 (Act 658) s.9: an e-signature satisfies a legal signature requirement if it is attached to or logically associated with the message, identifies the signer and their approval, and is reliable for the purpose. The Digital Signature Act 1997 continues for digital signatures (s.9(3), s.10 seals) | [S69 P (WIPO Lex)] |
| **Singapore** | English is common (not verified) | Electronic Transactions Act 2010 s.8: a signature requirement is met by a method that identifies the person and their intention; First Schedule exclusions (e.g., wills). Amendment status of the schedule is conflicting in sources | [S70 P-snip (IMDA PDF, empty fetch)], [S71 S] |

UI language:
- DocuSign offers 44+ signing languages [S16]. Proposify's UI comes in 15 languages, but proposal content is not translated [S15].
- None of the global freelancer tools checked (Bonsai, Moxie, Plutio, HoneyBook, Dubsado) shows Thai, Bangla or Malay UI on its pricing page (not verified in-app).

---

## 7. Differentiation opportunities and reasons SignedScope might fail

### Opportunities (evidence-based)

| # | Opportunity | Evidence |
|---|---|---|
| 1 | **Rail-agnostic payment tracking** for countries where incumbents' rails don't work (BD has no Stripe and no PayPal page; HoneyBook is limited to 4 countries; Bonsai Payments to 4) | [S24][S39][S8][S2] |
| 2 | **Delta-only change approval** (diff, price delta, approve or sign, pay link), versus PandaDoc wiping signatures and Better Proposals' duplicate-and-resend | [S13][S35][S9] |
| 3 | **Thai/Bangla client-facing documents.** I found no global freelancer tool with Thai, Bangla or Malay | §1, §6 |
| 4 | **Local QR and payment-link helpers** (PromptPay via Stripe TH, PayNow via Stripe SG, bKash PRA QR) shown on the approval page | [S51][S63][S46] |
| 5 | **Entry-tier completeness.** Competitors gate quotes, portal or payments on higher tiers (PandaDoc Business, Moxie Pro, Bonsai Essentials) | [S12][S4][S1] |
| 6 | **Trust and fee transparency.** SignedScope takes no processing fee, which answers complaint themes 1 and 6 | §3 |

### Reasons SignedScope might fail

1. **The wedge isn't unique.** Ignition already has client-approved change orders, and HoneyBook and Wethos have versioned re-approval [S18][S9][S34]. Indie scope-creep tools are proliferating [S38].
2. **Marketplace capture in BD.** If most BD web freelancers work through Upwork or Fiverr, where Payoneer is the payout route [S42], the platform already handles contracts and payments. The addressable segment is off-platform direct clients only, and its size is not verified.
3. **Manual payment status weakens the "payment tracking" promise.** In BD and for direct PromptPay, DuitNow or PayNow there is no public status API (§5), so tracking depends on users self-reporting.
4. **Willingness to pay $10/month in BD/TH is unproven.** Moxie sells a broader bundle at the same price [S4]. FlowAccount and Bukku have free plans [S19][S20].
5. **Clients may refuse formal approval steps.** Change negotiation may happen in chat apps, and clients may ignore "Accept changes" links (a HoneyBook community post reports a client paying without approving [S72 R]).
6. **Legal-weight expectations.** BD's ICT Act framework references licensed Certifying Authorities [S66]. If clients expect "legally binding" signatures, a simple click-to-approve may be perceived as weak (no legal conclusion drawn).
7. **Incumbent fast-follow.** Bonsai, Moxie or Plutio could add a change-order button cheaply. Plutio already bundles AI proposal generation [S6].
8. **Billing SignedScope itself.** Collecting $10 subscriptions from BD users needs a merchant-of-record or a local gateway, because Stripe is unavailable in BD [S24]. Not researched here.

---

## 8. Recommended initial segment and market

**Recommendation (confidence: LOW–MEDIUM).** Interview two candidate segments in parallel and commit after about 15–20 interviews each.

| Option | Segment | Why | Risks |
|---|---|---|---|
| **A (lead)** | **Thailand: freelance web developers and 1–5-person studios billing Thai SMB clients in THB** | Stripe is available, and PromptPay Payment Links give automated status [S24][S51]. No global freelancer tool showed Thai docs. FlowAccount proves Thai SMEs pay for document software (฿165–199/mo) [S19] but shows no scope or change features | FlowAccount may add the feature. Thai tax-document expectations are not verified |
| **B** | **Bangladesh: off-marketplace freelance web developers and designers with direct overseas clients (USD, English docs)** | Incumbents' payment rails are absent (no Stripe [S24]; no PayPal BD page [S39]), so rail-agnostic tracking fits best. Docs can be in English | Status must be manual. Marketplace capture. Price sensitivity. Subscription billing is hard |
| Comparison | MY/SG | Stripe plus FPX/PayNow is available [S57][S63]. Use these markets for price benchmarks (Bukku RM35 [S20], HitPay [S21]) | More crowded and more expensive markets |

**Interviews must confirm:**
1. How often a project's scope changes, and whether the person currently prices and approves changes in writing or only in chat.
2. Losses from scope creep in the last 3 projects: unpaid hours or money.
3. Whether clients would click an approve or sign link for a change. What makes it "official" for the client (PDF, e-sign, stamp)?
4. How they get paid today, by client type: bKash, Payoneer, Wise, PromptPay, bank transfer. Would they accept "client marks paid, you confirm"?
5. Current tools and spend (FlowAccount, Google Docs, Canva, Bonsai, Moxie), and willingness to pay $10 vs $20 monthly or annually.
6. The share of work that is off-marketplace (BD) and the language of client documents (TH/BD).
7. Whether "SignedScope never touches money" is a selling point or irrelevant.

---

## Sources (all accessed 2026-11-06)

| ID | Type | URL |
|---|---|---|
| S1 | P | https://www.hellobonsai.com/pricing |
| S2 | P-snip | https://help.hellobonsai.com/en/articles/1867512-integrated-payment-methods-bonsai-supports |
| S3 | P-snip | https://help.hellobonsai.com/en/articles/5448975-reorganizing-line-items-on-proposals |
| S4 | P | https://www.withmoxie.com/pricing |
| S5 | P-snip | https://help.withmoxie.com/en/articles/4793732-integrate-moxie-with-stripe ; https://feedback.withmoxie.com/integration-feature-requests/p/square-payment-integration |
| S6 | P | https://www.plutio.com/pricing |
| S7 | P-snip | https://help.plutio.com/help/proposals-overview |
| S8 | P | https://www.honeybook.com/pricing |
| S9 | P | https://help.honeybook.com/en/articles/6252653-when-to-notify-clients-of-file-changes |
| S10 | P | https://www.dubsado.com/pricing |
| S11 | P-snip | https://help.dubsado.com/en/articles/15920623-connect-a-payment-processor-with-dubsado-payments-square-or-paypal |
| S12 | P | https://www.pandadoc.com/pricing/ |
| S13 | P | https://support.pandadoc.com/en/articles/9714571-version-history |
| S14 | S | https://fynk.com/en/blog/pandadoc-starter-plan/ ; https://www.usagepricing.com/blueprint/pandadoc |
| S15 | P | https://www.proposify.com/pricing |
| S16 | P | https://ecom.docusign.com/plans-and-pricing/esignature |
| S17 | P | https://www.ignitionapp.com/pricing |
| S18 | P | https://support.ignitionapp.com/en/articles/15198048-create-and-send-change-orders |
| S19 | P | https://flowaccount.com/en/pricing |
| S20 | P | https://www.bukku.my/pricing |
| S21 | P | https://www.hitpayapp.com/pricing |
| S22 | S | https://marketplace.whmcs.com/group/piprapay |
| S23 | S | https://cdn.billingserv.com/integrations/bkash/ |
| S24 | P | https://stripe.com/global |
| S25 | R | https://www.trustpilot.com/review/pandadoc.com |
| S26 | R | https://www.trustpilot.com/review/hellobonsai.com |
| S27 | S | https://agiled.app/blog/honeybook-review |
| S28 | R | https://www.trustpilot.com/review/honeybook.com |
| S29 | R | https://www.trustpilot.com/review/plutio.com |
| S30 | R (blocked; via search extract) | https://capterra.com/p/206389/Dubsado/reviews/ |
| S31 | S (summarising Trustpilot) | https://agiled.app/blog/bonsai-review |
| S32 | R | https://www.trustpilot.com/review/withmoxie.com |
| S33 | R | https://community.honeybook.com/talk-product-7/change-an-invoice-without-approval-1879 ; https://community.honeybook.com/talk-product-7/editing-the-invoice-in-a-proposal-contract-invoice-smart-file-5320 |
| S34 | P | https://support.wethos.co/en/articles/7858504-editing-signed-proposals |
| S35 | P | https://help.betterproposals.io/en/articles/4592167-editing-an-accepted-proposal |
| S36 | P-snip | https://nusii.com/docs/getting-started/editing-an-accepted-proposal/ |
| S37 | P-snip | https://planningpod.com/help-center/creating-a-change-order-for-a-signed-proposal |
| S38 | S | https://scopebarrier.vercel.app/ ; https://www.hunted.space/product/uncreep ; https://www.hunted.space/product/stayinscope ; https://dev.to/landolio/i-built-a-scope-creep-tracker-after-a-client-turned-a-3-page-website-into-an-11-page-one-for-free-40pj |
| S39 | P | https://www.paypal.com/bd/home |
| S40 | S | https://www.nsave.com/bangladesh/paypal |
| S41 | P | https://www.payoneer.com/solutions/receive-payments/ |
| S42 | S | https://en.prothomalo.com/corporate/local/freelancers-now-to-receive-payoneer-payments-through-bkash |
| S43 | P | https://wise.com/help/articles/2932161/guide-to-bdt-transfers |
| S44 | P | https://wise.com/help/articles/2813542/where-do-i-need-to-live-to-hold-money-with-wise |
| S45 | P-snip | https://wise.com/help/articles/2810318/can-i-get-usd-account-details |
| S46 | P-snip | https://www.bkash.com/en/page/personal-retail-account |
| S47 | S | https://www.tbsnews.net/economy/corporates/bkash-introduces-business-dashboard-streamline-transactions-352219 |
| S48 | P | https://developer.bka.sh/docs |
| S49 | S | https://github.com/codeboxrcodehub/nagad |
| S50 | P-snip | https://support.stripe.com/questions/what-information-is-required-to-open-a-stripe-account-in-thailand |
| S51 | P | https://docs.stripe.com/payments/promptpay |
| S52 | P-snip | https://www.bangkokbank.com/en/fragments/accordions/promptpay-registration |
| S53 | S | https://en.wikipedia.org/wiki/PromptPay |
| S54 | P | https://www.paypal.com/th/webapps/mpp/home |
| S55 | S | https://thepaypers.com/payments/news/wise-secures-five-licences-in-thailand-in-latest-apac-expansion |
| S56 | P-snip | https://stripe.com/legal/ssa/my |
| S57 | P | https://docs.stripe.com/payments/fpx |
| S58 | P-snip | https://knowledgebase.paynet.my/hc/en-us/articles/49480623045657-How-Do-I-Register-for-DuitNow-Transfer |
| S59 | P | https://paynet.my/personal-solutions/duitnow-request.html |
| S60 | P | https://docs.hitpayapp.com/payment-methods/duitnow |
| S61 | P | https://docs.developer.paynet.my/docs |
| S62 | P-snip | https://support.stripe.com/questions/2026-updates-to-singapore-verification-requirements |
| S63 | P | https://docs.stripe.com/payments/paynow |
| S64 | P | https://www.abs.org.sg/consumer-banking/pay-now |
| S65 | P-snip | https://sherloc.unodc.org/cld/uploads/res/document/information-and-telecommunication-act_html/Bangladesh_Information_and_Telecommunication_Act_2006.pdf |
| S66 | S | https://legalseba.com/bd-articles/?p=1555 ; https://helpx.adobe.com/legal/esignatures/regulations/bangladesh.html |
| S67 | S | https://www.lawplusltd.com/2020/04/validity-of-electronic-signatures-in-thailand/ ; https://www.tilleke.com/resources/thailands-legal-system-undergoes-major-digital-reforms |
| S68 | P-snip | https://helpx.adobe.com/legal/esignatures/regulations/thailand.html |
| S69 | P | https://www.wipo.int/wipolex/en/legislation/details/8179 |
| S70 | P-snip | https://imda.gov.sg/-/media/Imda/Files/Regulation-Licensing-and-Consultations/Acts-Regulations/Electronic-Transactions-Act.pdf?la=en ; https://sso.agc.gov.sg/Act/ETA2010 |
| S71 | S | https://www.amt-law.com/asset/pdf/bulletins13_pdf/SG_en_20210831.pdf |
| S72 | R | https://community.honeybook.com/talk-product-7/customer-making-payments-on-updated-smart-file-without-approving-changes-5714 |

**Gaps (not verified):**
- Monthly-billed prices for HoneyBook, Dubsado and DocuSign; PandaDoc's monthly price on its primary page.
- Ignition's pricing figures.
- In-app change-order features at Bonsai, Moxie, Plutio and Dubsado.
- Nagad's official API.
- Whether individuals can generate a DuitNow QR.
- Language requirements for business documents in each market.
- Market sizes: no statistics are included on purpose.
