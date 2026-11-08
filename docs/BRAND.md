# SignedScope brand system (v6)

Design source: Figma file `pOuAmiM68x3cLukw3uIGJD`, page **SignedScope v6 · Brand system**. Code source: `public/brand/`. When one changes, change the other.

## Logo
- **Mark** (`brand/mark.svg`): the corners of an agreed scope and a signature stroke that ends in a check, on the violet-to-pink gradient.
- **Lockup** (`brand/wordmark.svg`, `brand/wordmark-dark.svg`): mark plus "SignedScope" in Plus Jakarta Sans ExtraBold, -3% tracking, "Scope" in brand color. Text is outlined, so it renders without the font.
- Clear space: 25% of the mark on every side. Minimum size: 16px.
- Don't recolor the gradient, rotate, outline, add effects, or set the wordmark in another font.
- App icons: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (full bleed), `favicon-32.png`. `/favicon.svg` is the mark.

## Color
Tokens live in `brand/tokens.css` as `--ss-*` custom properties with light and dark values (dark follows the OS unless `<html data-theme>` is set).

| Token | Light | Dark | Use |
|---|---|---|---|
| bg / surface / surface-raised | #FFFFFF / #F5F7FC / #FFFFFF | #0B1230 / #121A3B / #1A2350 | Page, panels, cards |
| text / text-muted | #0B1230 / #5A6480 | #F5F7FC / #A3ACC2 | Body and secondary text |
| border | #E3E8F2 | #26305A | Dividers, inputs |
| brand / brand-soft / on-brand | #7C3AED / #F3EEFF / #FFFFFF | #A78BFA / #2E1065 / #0B1230 | Primary actions, selection |
| accent | #FF4FA3 | #FF7AB8 | Highlights, gradient end |
| success / warning / danger | #047857 / #8A5A00 / #C62A31 | #34D399 / #FFC233 / #FF8A80 | Status |

The brand gradient (violet → pink → coral) appears once per view: the logo, one hero accent, or the main call to action. Sun, mint and sky are for small accents and charts.

## Type
- Plus Jakarta Sans for words; JetBrains Mono for amounts, codes and fingerprints. Both self-hosted.
- Bengali: Anek Bangla. Thai: IBM Plex Sans Thai. Both OFL; self-host the subsets when those locales ship.
- Scale (size/line height): Display 64/67, H1 48/53, H2 36/41, H3 24/30, Body L 18/29, Body 16/26, Small 14/21, Label 13/18 (+2% tracking), Mono 13/20.

## Space, radius, depth
- 4px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96.
- Radius: inputs and buttons 12, cards 16, sheets and dialogs 24, hero panels 32.
- Shadows: sm, md, lg, brand (see tokens). No heavy borders.

## Icons
`brand/icons.svg` is a sprite of 50 line icons (24px grid, 1.8 stroke, round caps). Use `<svg class="i" aria-hidden="true"><use href="/brand/icons.svg#home"/></svg>` next to a visible label, or give the button an `aria-label`.

## Illustrations and mockups
- `brand/illustrations/`: brief-to-scope, signed, change-diff, paid (400×300) and empty states for projects, clients and inbox (200×160).
- `brand/mockups/`: laptop-dashboard and phone-sign.
- They show real product moments with made-up sample names. Never present them as real customers, and never invent testimonials or figures.

## Motion
| Token | Value | Use |
|---|---|---|
| duration-fast | 120ms | Press, hover, focus |
| duration-base | 200ms | Popovers, toasts, tabs |
| duration-slow | 320ms | Dialogs, sheets |
| duration-page | 400ms | Route changes |
| ease-standard | cubic-bezier(0.2, 0, 0, 1) | Most UI |
| ease-enter | cubic-bezier(0.05, 0.7, 0.1, 1) | Things arriving |
| ease-exit | cubic-bezier(0.3, 0, 0.8, 0.15) | Things leaving |
| spring | stiffness 400, damping 30 | Checks, presses, drag |

- Button press: scale 0.97. Loading: spinner in place, width locked.
- Card hover: lift 2px with shadow md. Focus: 2px brand ring with 2px offset, no animation.
- Approving a line: check draws, row tints mint, total counts up.
- Dialogs fade and scale from 0.96; sheets slide 24px. Toasts rise 12px and auto-hide after 4s (pause on hover).
- Page change: fade and rise 8px; lists stagger 40ms.
- Reduced motion: opacity only, 120ms or less, no autoplay.
