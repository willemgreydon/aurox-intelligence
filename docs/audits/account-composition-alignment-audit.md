# Account composition alignment — 2026-10-02

## Repository truth

Branch: `main`, HEAD: `021c327442e06943a52795e7456d462e0eab2bba`.
The initial working tree contained only the owner's untracked
`SYSTEM_AUDIT_2026-10.md`. It was left untouched. Root `AGENTS.md` and
`docs/AGENTS.md` were inspected. No commits, pushes, merges, deployments,
authentication implementation changes, or database mutations were performed
during the alignment QA pass.

## Current and target state

The account shell already uses a two-column grid with `align-items: start`.
The opening cockpit nests another `Section`, whose global `--space-20`
padding placed the identity card exactly 80px below the workspace sidebar on
desktop. Its nested shell also left a capped-width card off-center within the
right column. The previous card-to-welcome gap was `--space-4` (16px).

The opening section now has an explicit `account-cockpit__opening` class with
zero top padding. The parent grid establishes its top line. The card uses
`margin-inline: auto` within its existing containing block, and the hero's
semantic gap uses `--space-5` (20px). The same gap also separates the welcome
region from the metrics. No translation, negative margin, positioned layout,
or duplicated markup was added.

## Migration, invariants, and rollback

This is a direct presentation update with no data or contract migration.
Card width, aspect ratio, artwork, number, material layers, accessible label,
pointer interaction, and reduced-motion rules are preserved. The desktop card
remains 736 × 464.125px at 1280/1440/1536px. The sidebar remains 352px wide and
the grid gap remains 24px. The bounded outer shell remains 1216px wide at those
desktop sizes. The right column is 840px wide, with the card centered to within
0.016px. At 1024px its existing responsive card width remains 549.6875px.

At the existing 960px stacking breakpoint and below, document flow remains
sidebar → identity card → welcome. Removing the redundant nested padding
leaves the existing 24px grid gap between sidebar and card. No new breakpoint
is introduced. At 390px the card remains 342 × 215.65625px.

Future section-padding changes can break the shared top line; card width or
container changes can cause overflow; hero-gap changes can collapse the second
information layer. Browser tests assert these structural relationships.
Rollback consists of removing the opening class and its padding rule,
restoring the hero gap to `--space-4`, and removing the card's auto inline
margins. No database rollback is needed.

## Browser method and measured geometry

QA ran the current source in an isolated `/private/tmp/aurox-composition-alignment`
development copy using the installed Next.js server and existing signed-session
authentication code. Repository calls were replaced only in that temporary copy
with an in-memory fixture; database URLs were empty. The fixture represents
Claus Nisslmüller with no simulated positions. This validates the actual account
markup, CSS, hydration, and interactions without accessing production account
data. It is not a production authentication or financial-data integration test.

The Playwright regression accepts `E2E_STORAGE_STATE` for a pre-established
local session; its default registration mechanism remains available. The
viewport matrix now also includes 1024, 1440, and 1536px.

All coordinates below are CSS pixels from `getBoundingClientRect()`, after
fonts and hydration settle, with pointer motion neutralized.

| Width | sidebarTop | cardTop | topDelta | cardBottom | nextContentTop | postCardGap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1280 before | 221.797 | 301.797 | 80 | 765.922 | 781.922 | 16 |
| 1280 final | 221.797 | 221.797 | 0 | 685.922 | 705.922 | 20 |
| 1440 final | 221.797 | 221.797 | 0 | 685.922 | 705.922 | 20 |
| 1536 final | 221.797 | 221.797 | 0 | 685.922 | 705.922 | 20 |
| 1024 final | 221.797 | 221.797 | 0 | 568.422 | 588.422 | 20 |
| 961 final | 221.797 | 221.797 | 0 | 532.500 | 552.500 | 20 |
| 960 final (stacked) | 267.078 | 820.094 | 553.016 | 1284.219 | 1304.219 | 20 |
| 768 final (stacked) | 267.078 | 844.313 | 577.234 | 1282.109 | 1302.109 | 20 |
| 390 final (stacked) | 268.891 | 876.719 | 607.828 | 1092.375 | 1112.375 | 20 |
| 320 final (stacked) | 268.891 | 876.719 | 607.828 | 1048.234 | 1068.234 | 20 |
| 1920 final | 221.797 | 221.797 | 0 | 685.922 | 705.922 | 20 |

The previous gap was 16px at every measured width. Desktop top alignment is
intentionally not required for stacked layouts. Every measured viewport has
`document.documentElement.scrollWidth === window.innerWidth`.

Desktop opening screenshots and the 390px opening flow were visually inspected.
No card/sidebar clipping or welcome collision was observed. Normal pointer tilt
responds and returns to rest; reduced motion produces `transform: none`.
The 390px card fits fully within the viewport when scrolled into view; the
navigation overlay opens/closes and sidebar links remain available. The
preloader is removed from the DOM after hydration in both motion modes.

All final viewport samples had zero additional CLS and zero card/welcome
coordinate movement during the 500ms post-hydration observation window.
Initial page/header layout shifts were observed in both the original and final
development renders; this pass does not claim that initial-load CLS is zero.

Screenshots, before/final geometry JSON, interaction results, and validation
logs are retained in `/private/tmp/aurox-composition-alignment/`. In particular:
`final-1440.png`, `final-390-opening.png`, `final-390-full.png`,
`final-geometry.json`, and `interactions.json`.

## Validation

- Account and overflow Playwright: 120 passed (12 account, 108 overflow).
- Targeted Vitest: 33 passed across layout-polish and account-analytics.
- Pre-shipping full web Vitest suite: 614 passed across 82 test files.
- `pnpm typecheck:web`: passed.
- `pnpm build:web`: passed using the production configuration with database
  URLs explicitly empty; the build used Turbopack.
- Web lint: existing 28 errors and 22 warnings. Before/after lint logs are
  identical; no new diagnostics. Focused lint on modified TypeScript files passes.
- `git diff --check`: passed.

SIDEBAR ↔ IDENTITY CARD TOP ALIGNMENT: PASS

POST-CARD CONTENT RHYTHM: PASS

390PX MOBILE: PASS

HORIZONTAL OVERFLOW: PASS
