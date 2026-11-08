# SignedScope web app (React + Vite)

The new front end. It replaces the pages in `public/` one by one (phases D and E in `docs/PLAN.md`) and keeps every URL. The Node API in `api/` is unchanged.

## Run
```
npm run dev --prefix ..          # API dev server on :3100 (SIGNING_SECRET=... PORT=3100)
npm run dev                      # this app on :5173, /api proxied to :3100
npm test                         # unit tests (Vitest + Testing Library)
npm run build                    # typecheck, build to dist/, check the 160 KB initial JS budget
node e2e/kit.mjs                 # browser check of /kit: axe, light/dark, phone, dialog, toast, focus
```

## Structure
- `src/app`: providers, layout, routes (`routes.tsx` lists every URL, each page is code-split), `AppLink` (preloads a page on hover, focus or touch).
- `src/ui`: design-system components (Button, Field/Input/Select/Textarea, Card, Badge, Skeleton, Dialog and sheet, Toast, Tabs, Tooltip, Menu, EmptyState, Icon, Logo). `/kit` shows them all.
- `src/lib`: API client, Supabase (loaded only when needed), TanStack Query client, locale detection and Intl formatters.
- `src/i18n`: en (bundled), bn and th (loaded on demand). Tests require identical keys.
- `src/motion`: Framer Motion tokens and variants from `docs/BRAND.md`. Features load after first paint (`LazyMotion`); reduced motion is respected.

## Rules
- Styles use only `--ss-*` tokens from `public/brand/tokens.css`.
- No inline scripts (CSP `script-src 'self'`).
- Every control has a visible label or `aria-label`; dialogs trap and restore focus; navigation moves focus to the new page's heading.
- Dates, numbers and money go through `usePrefs()` formatters, never string concatenation.
