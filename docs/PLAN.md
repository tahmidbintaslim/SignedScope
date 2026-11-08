# SignedScope: plan to finish (from 8 Nov 2026)

Decisions behind this plan: React + Vite frontend, brand evolved from v4 (violet-to-pink energy plus a real logo, illustrations and device mockups), security first, Supabase project `signedscope` (Singapore) created.

## Product decisions (owner, 8 Nov)
| Topic | Decision |
|---|---|
| Positioning | Lead with **"Get the scope signed. Get the extras paid."** The AI estimator is step zero of creating a scope (paste a brief or a WhatsApp/Slack ask, get priced lines). |
| Pricing | **Starter $0** (3 active scopes, unlimited revisions, email alerts, pay links, receipts) · **Pro $19/mo** (unlimited scopes, AI brief-to-scope, branding, PDF audit export) · **Agency $49/mo** (5 seats, custom domain, team templates, Slack/webhook alerts). Free for everyone during the beta. |
| Legal wording | No legal-binding claims. FAQ says what the record contains (who approved which lines, when, the drawn or typed signature, and a SHA-256 fingerprint anyone can verify), that many places accept electronic records of agreement for service work, and to check local rules for large contracts. No ESIGN/eIDAS claims until a lawyer reviews. |
| Money | SignedScope never holds or moves client money. |
| Languages | English, Bengali, Thai, with locale-aware dates, numbers and currencies. |

## Phases and tasks

### A. Security (done, #14 merged)
- [x] Four-part audit (API, database, frontend, ops) and fixes (#14)
- [x] Supabase project created; all migrations applied; advisor clean
- [ ] Owner: Vercel env vars (Production only): `SIGNING_SECRET`, `BLOB_READ_WRITE_TOKEN`, `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `CRON_SECRET`
- [ ] Owner: Supabase Auth providers (Google, GitHub), TOTP, redirect URL `https://<domain>/login**`
- [ ] Later: token expiry and key rotation (`exp`, `kid`); server-side delete paging

### B. Brand system (Figma first): done, see docs/BRAND.md
- [x] Logo: mark (scope corners + signature check) and wordmark; app icons, favicon (OG template moves to D)
- [x] Color, type and spacing tokens evolved from v4; light and dark
- [x] Illustration set (product moments: brief to scope, signed, change diff, paid, three empty states) and the icon set extended to 50
- [x] Device mockups (laptop, phone) framing real app screens
- [x] Motion principles: durations, easing, hover/press feedback, page transitions, reduced-motion rules

### C. React + Vite foundation: done, see web/README.md
- [x] `web/` app: React 19, TypeScript, Vite, React Router (same URLs: `/`, `/estimate`, `/new`, `/sign`, `/receipt`, `/verify`, `/privacy`, `/thanks`, `/login`, `/app/*`)
- [x] Design system components: Button (pressed and loading feedback), Input, Select, Textarea, Dialog, Sheet, Toast, Tabs, Tooltip, Menu, Card, Badge, Empty state, Skeleton (Table comes with the dashboard in E)
- [x] Data: TanStack Query client, page-code preload on hover/focus/touch, lazy Supabase client, typed API client (per-page queries and optimistic updates come with D and E)
- [x] i18n: react-i18next for en/bn/th (bn/th loaded on demand); Intl for dates, numbers and currencies; language, country, time zone and currency detected and stored locally (profile sync in E)
- [x] Motion: Framer Motion with shared variants; respects reduced motion
- [x] Performance: route code-splitting, motion features after first paint, 160 KB gzip initial JS budget in CI (currently 144 KB); LCP checks with Lighthouse in G
- [x] Build to static files so CSP `script-src 'self'` holds; `api/` unchanged

### D. Public site
- [ ] Homepage per the blueprint: hero with phone mockup and live demo, the quick-ask problem, interactive demo, one how-it-works, benefits, pricing, FAQ
- [ ] `/estimate` as the main free tool, with its own SEO metadata
- [ ] `/templates/[slug]` (5 seed templates) and `/compare/[slug]` pages
- [ ] `/verify` as a trust badge and growth loop on receipts
- [ ] One domain and repo name everywhere; 301s from old URLs

### E. Accounts and onboarding
- [ ] Sign up / sign in (email link, Google, GitHub), two-step setup
- [ ] First-run onboarding: name, business, country, language, currency, rate, payment details, first client and project, first estimate
- [ ] Dashboard, projects, clients, settings, composer, vault rebuilt in React with the new design

### F. Product
- [ ] Starter limit of 3 active scopes; email alerts on every plan
- [ ] Deposit and change-request billing rules (e.g. 50% deposit, 100% on change requests)
- [ ] "Ask a question" per line item on the client page
- [ ] PDF audit export (signature, time, fingerprint)
- [ ] Billing for Pro/Agency (Stripe) after the beta

### G. Quality and launch
- [ ] Playwright e2e for every page, axe scans, Lighthouse budgets in CI
- [ ] Native review of Bengali and Thai; lawyer review of clauses and the privacy notice
- [ ] Domain, OG images, sitemap, Search Console; launch posts with `?ref=` tags

## Order
A → B → C → (D and E in parallel) → F → G. PR #13 (product-first homepage experiment) is kept for reference and will be closed when D lands.
