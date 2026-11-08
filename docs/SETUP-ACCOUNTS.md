# Turning on accounts (Supabase)

Accounts add `/login` and the `/app` workspace. Until they are set up, the site works as before without accounts, and `/login` says "coming soon".

## 1. Create the Supabase project
1. Go to supabase.com and create a project. The free tier is fine to start. Pick the region closest to your users, for example Singapore.
2. Open **SQL Editor** and run each file in `supabase/migrations/` in name order (`…_init.sql`, `…_vault_notify.sql`, `…_security.sql`, `…_private_helpers.sql`, `…_review_fixes.sql`).
   - With the Supabase CLI instead: `supabase link` then `supabase db push`.

## 2. Sign-in methods
In **Authentication → Providers**:
- **Email:** on. Turn on "Confirm email". The app signs people in with a one-time link, so no password is needed.
- **Google:** create an OAuth client in Google Cloud and paste its ID and secret.
- **GitHub:** create an OAuth app in GitHub settings and paste its ID and secret.

In **Authentication → URL Configuration**:
- Site URL: `https://<your domain>`
- Redirect URLs: `https://<your domain>/login**` (the login page keeps a `?next=` path; never put a wildcard in the host).
- Previews: never add a pattern such as `https://*.vercel.app/**`, which lets any Vercel deployment receive sign-in tokens. Use a separate Supabase project for previews, or a pattern pinned to your team, e.g. `https://signedscope-*-<team>.vercel.app/login`.

In **Authentication → Multi-Factor**: turn on **TOTP**. Users switch it on for themselves in Settings.

## 3. Vercel environment variables
| Name | Where to find it | Secret? |
|---|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL | No |
| `SUPABASE_ANON_KEY` | Project Settings → API → anon / publishable key | No (safe in the browser; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role / secret key | **Yes. Server only. Never share it.** |

Accounts switch on only when all three are set. Redeploy after adding them.

**Scope secrets to Production only.** Vercel's default is "All Environments", which would put the service role key in every pull-request preview. Set `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET` and `SIGNING_SECRET` for Production, and use separate keys (or none) for Preview.

The content security policy in `vercel.json` allows connections only to this project's Supabase host. If you use a different project, update `connect-src` there.

## 3b. Files and email (optional)
- **Files:** the second migration (`supabase/migrations/20261106010000_vault_notify.sql`) creates a private `vault` bucket (25 MB per file) with per-user rules. Run it the same way as the first.
- **Email notifications:** create a Resend account, verify your sending domain, then set:

| Name | Value | Secret? |
|---|---|---|
| `RESEND_API_KEY` | Resend API key | **Yes** |
| `EMAIL_FROM` | e.g. `SignedScope <hello@yourdomain.com>` (domain verified in Resend) | No |
| `APP_URL` | `https://<your domain>` (used for links in emails) | No |
| `CRON_SECRET` | `openssl rand -hex 32`; Vercel sends it to the daily reminder job | **Yes** |

The daily job (`/api/reminders`, 02:07 UTC, which is 09:07 in Bangkok) emails each freelancer about client payments that are 1, 7, 14 or 30 days overdue. Emails only ever go to the freelancer, never to their client. Each person chooses which emails they get in Settings.

## 4. Check it works
1. Open `/login`, sign in with your email, and confirm you land on `/app`.
2. Create a client and a project.
3. Run an AI estimate and save it to the project.
4. Click **New scope from estimate** and send it.
5. Open the client link in a private window. The project should show **Viewed**.
6. Sign it there. The project should show **Signed** and **Approved**, with activity.

## How the data is protected
- Two-step sign-in is enforced by the database: once a user turns on an authenticator app, a session without the code can read or change nothing (restrictive policies), and the API refuses it too.
- Every table has Row Level Security. A signed-in user can only read and change their own rows, and can only link them to their own clients and projects. `test/db.test.js` checks this against a real Postgres in CI.
- Browsers can read documents but cannot create or edit them. The server files a document after checking the user's session, and records "viewed" and "signed" from the sealed link.
- Payments marked paid by a user are stored as `paid_manual`. `paid_provider` can only be set by the server, which is reserved for verified payment-provider webhooks later.
- SignedScope never holds or moves money.
