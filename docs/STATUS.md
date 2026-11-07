# SignedScope: project status (Sat 7 Nov 2026)

The product brief (`docs/PRODUCT-BRIEF.md`) is the source of truth for what SignedScope is. The approved design is the Figma page "SignedScope v5 · Brief to signed quote" in file `pOuAmiM68x3cLukw3uIGJD`.

## Core decisions

| Topic | Decision |
|---|---|
| Wedge | AI estimate and quote: brief → requirements, user stories, hours, milestones, price |
| Price | The AI gives hours only. Price = hours × your rate × (1 + buffer). The AI never writes prices or legal terms |
| Who | Freelancers, studios and agencies (1 to 20) and in-house leads who quote software work. Thailand and Bangladesh first, then Malaysia and Singapore |
| Languages | English, Bengali, Thai |
| Stack | Vercel (static `public/` + Node `api/`), Supabase (Auth, Postgres with RLS, Storage), Resend, Anthropic API |
| Money | SignedScope never holds or moves client money. Manual payment instructions (PromptPay, bank, bKash) or the freelancer's own Stripe link |
| Legal | Not a legal e-signature. Clauses are templates, not legal advice |
| Plans | Free (stays free), Pro $10, Plus $20. Everything free during the beta |
| Media | Real product + custom: three.js hero, 2D demos built from the real UI, tour video recorded from the app, custom icons. No stock photos, no paid generation, no invented logos, figures or testimonials |
| Constraints | URLs `/new`, `/sign`, `/receipt`, `/verify`, `/privacy`, `/thanks` stay. CSP `script-src 'self'` (libraries vendored). Plain words, US spelling, no em-dashes in copy |

## Tasks

### Completed
- [x] Research, audit, validation kit, interview pack (`docs/research/`)
- [x] Quick fixes (#7), AI estimator in en/bn/th (#8)
- [x] Accounts, dashboard, two-step sign-in, RLS tested on real Postgres (#9)
- [x] Proposals, agreements, country clauses, payment schedule, PDF (#10)
- [x] File vault, email notifications, overdue reminders (#11)
- [x] Product brief (#12)
- [x] Figma v5: desktop 1440 and mobile 390 homepage, 19 icons, step/feature/plan components
- [x] Homepage v5 built: three.js hero with HTML fallback, hero brief box that runs the real estimator, estimate demo, client approve-and-sign demo, 60-second tour video with en/bn/th captions, security, comparison, Free/$10/$20 pricing, FAQ (`test/browser/home.e2e.js`)

### Pending, by priority
1. [ ] App screens in Bengali and Thai (only the estimator and tour captions are translated)
2. [ ] Prompt to PDF and a templates gallery
3. [ ] Later: subscription billing, branding on documents, team seats, learning from past projects

### Blocked (owner action)
- [ ] Vercel production env vars: `SIGNING_SECRET`, `BLOB_READ_WRITE_TOKEN` (production is broken without these), then `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `CRON_SECRET` (`docs/SETUP-ACCOUNTS.md`)
- [ ] Create the Supabase project and run both migrations
- [ ] Domain: the live domain is spelled "singedscope"; `og:image` still points at `scopelock-sable.vercel.app`
- [ ] Native review of the Bengali and Thai text: `public/estimate-i18n.js`, `scripts/tour-captions.js` (→ `public/media/tour.*.vtt`), the Thai lines in the home page client demo
- [ ] Lawyer review of the clause library (`public/clauses.js`)
