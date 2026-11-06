# Estimator prototype test (1–2 weeks)

**Question:** do freelancers trust an AI breakdown enough to quote from it?
**Page:** `/estimate`, in English, Bangla and Thai. Free, with no account.

## Before you start (founder)
1. In Vercel, set `ANTHROPIC_API_KEY`, `SIGNING_SECRET` and connect a Blob store, then redeploy.
2. Optional limits: `ESTIMATE_DAILY_CAP` (default 150 estimates a day across all users) and `AI_DAILY_CAP` (default 200 drafts a day).
3. Ask a native speaker to check the Thai and Bangla wording in `public/estimate-i18n.js`.

## Run it
- 5 or more freelancers (Thai and Bangladeshi), each with **a real brief they quoted recently**.
- Send `https://<domain>/estimate?ref=pilot-<name>` so each answer can be traced to its channel.
- Ask them to compare the estimate with what they actually quoted and say how far off it was.
- Ask them to use the "Would you send this estimate?" box at the end.

## Measure
`BLOB_READ_WRITE_TOKEN=… node scripts/ref-report.js` prints visits by ref and the feedback split (sample runs are left out).

| Signal | Pass |
|---|---|
| Would send (as is + after edits) | 60% or more of answers |
| Hours within ±30% of their real quote | 3 of 5 or more |
| Pays $10 for a month when asked | 2 or more |

If it fails, read the notes. Typical fixes: add the project types they use, ask for their past quotes, or change how the stories are split. Then test again before building accounts.

## Cost guard
- Each estimate is one Claude Opus 5.5 call at medium effort.
- Per IP: 8 an hour. Across all users: `ESTIMATE_DAILY_CAP` a day.
- Briefs and estimates are never stored.
