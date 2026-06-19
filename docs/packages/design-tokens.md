# `packages/design-tokens`

The single source of UI design primitives for Aurox: color, typography, spacing, radius,
shadow, layout, motion, z-index, chart roles, and semantic theme tokens. Tokens are
expressed as CSS custom properties (`--token`) plus a tiny TypeScript module that exports
theme identifiers. The workstation UI references these tokens — it must not hardcode
colors or sizes.

Package name: `@repo/design-tokens`. No runtime TypeScript dependency on any other package.

## Purpose & Boundary

- **Owns:** every reusable visual primitive and semantic theme variable for light and dark.
- **Depends on:** nothing at runtime (devDependency: `typescript` only).
- **Must not:** contain component markup, domain logic, or app-specific layout. It is
  primitives + theme keys only.

**Invariant:** these tokens are the *only* sanctioned source of UI color (and of the
other primitives). Components and CSS must reference `var(--token)` — never raw hex,
inline RGBA, or magic pixel values. This is enforced by the workstation UI rules.
([workstation-ui-rule.md](../../.claude/rules/workstation-ui-rule.md))

## Directory Map

| Path | Responsibility |
|---|---|
| `src/index.ts` | TS entry. Imports `./index.css`, exports `Theme` type, `themes`, and `themeStorageKey`. |
| `src/index.css` | The full token system: primitives + semantic light defaults under `:root`, semantic dark overrides under `[data-theme="dark"]`. |
| `src/light.css` | Light `color-scheme` hook (`:root, [data-theme="light"] { color-scheme: light }`). |
| `src/dark.css` | Dark `color-scheme` hook (`[data-theme="dark"] { color-scheme: dark }`). |

### `package.json` exports

| Specifier | Resolves to | Use |
|---|---|---|
| `@repo/design-tokens` | `src/index.ts` | TS theme keys (`Theme`, `themes`, `themeStorageKey`) |
| `@repo/design-tokens/css` | `src/index.css` | The full token sheet (imported once in `apps/web/app/globals.css`) |
| `@repo/design-tokens/css/light` | `src/light.css` | Light color-scheme hook |
| `@repo/design-tokens/css/dark` | `src/dark.css` | Dark color-scheme hook |

`apps/web/app/globals.css` consumes the tokens with `@import "@repo/design-tokens/css";`.

## Public API

### TypeScript exports (`src/index.ts`)

| Export | Value / type | Purpose |
|---|---|---|
| `Theme` | `'light' \| 'dark'` | The theme union. |
| `themes` | `{ light: 'light', dark: 'dark' } as const` | Theme id lookup. |
| `themeStorageKey` | `'fip-theme'` | `localStorage` key used to persist the chosen theme. |

The CSS side has no JS API — it is a set of custom properties applied via `:root` and the
`[data-theme="dark"]` selector.

## Contracts (token catalogue)

Token groups defined in `src/index.css`. These are the real, current names.

### Primitives

| Group | Tokens (representative) |
|---|---|
| Neutrals | `--color-white`, `--color-black`, `--color-slate-50` … `--color-slate-950` (incl. `-150` step) |
| Accent — blue | `--color-blue-100 … --color-blue-700` |
| Accent — cyan | `--color-cyan-300/400/500` |
| Accent — emerald | `--color-emerald-300/400/500` |
| Accent — amber | `--color-amber-300/400/500` |
| Accent — red | `--color-red-300/400/500` |

### Typography

`--font-family-sans` (IBM Plex Sans), `--font-family-mono` (IBM Plex Mono);
`--font-size-2xs … --font-size-6xl`; `--font-weight-regular/medium/semibold/bold`;
`--line-height-tight/heading/body`.

### Spacing, radius, shadow, layout

| Group | Tokens |
|---|---|
| Spacing | `--space-0` … `--space-32` (4px scale) |
| Radius | `--radius-sm/md/lg/xl/pill` |
| Shadow | `--shadow-sm/md/lg` |
| Layout | `--layout-max-width`, `--layout-content-width`, `--layout-reading-width`, `--header-height` |
| Border width | `--border-width-thin`, `--border-width-strong` |

### Motion & z-index

`--duration-fast/base/slow`, `--ease-standard`, `--ease-emphasis`;
`--z-base/sticky/dropdown/modal`.

### Chart & data roles

`--chart-positive`, `--chart-neutral`, `--chart-caution`, `--chart-negative`,
and series ramp `--chart-series-a … --chart-series-e`. These map to accent primitives so
data-viz colors stay consistent with the palette.

### Semantic theme tokens (the layer components should prefer)

Defined for light under `:root` and overridden for dark under `[data-theme="dark"]`:

| Category | Tokens (representative) |
|---|---|
| App / surfaces | `--app-bg`, `--app-bg-elevated`, `--app-bg-strong`, `--surface-base/raised/strong/inverse/accent/analytics/chart/chart-muted` |
| Borders | `--border-subtle/default/strong`, `--border-chart-grid`, `--grid-line` |
| Text | `--text-primary/secondary/tertiary/inverse/accent/axis/legend` |
| Actions | `--action-primary-bg(-hover)`, `--action-primary-text`, `--action-secondary-*`, `--control-compact-*` |
| Tables / rows | `--row-hover-bg`, `--row-selected-bg`, `--table-header-bg`, `--table-row-border`, `--table-row-height` |
| Density | `--panel-density-compact`, `--control-height-compact` |
| Emphasis / confidence | `--stat-emphasis-bg`, `--confidence-band-bg`, `--confidence-band-strong`, `--focus-ring`, `--hero-glow` |
| Status | `--status-success-bg/-text`, `--status-info-bg/-text`, `--status-warning-bg/-text`, `--status-danger-bg/-text` |

## Invariants

- **Tokens are the only source of UI color.** No hardcoded hex/RGBA or magic px in
  components or CSS — reference `var(--token)`.
- **Two layers, one direction.** Semantic tokens reference primitives; components
  reference semantic (and chart-role) tokens. Components should rarely reach for raw
  primitives directly.
- **Light = `:root`, dark = `[data-theme="dark"]`.** The dark block must override every
  semantic token the light block defines so theme switches are complete and there is no
  fallthrough.
- **`color-scheme` is set** for both themes (`light.css` / `dark.css` and inline in
  `index.css`) so native form controls and scrollbars match the active theme.
- **Theme persistence key is fixed:** `themeStorageKey = 'fip-theme'`. Do not invent a
  second storage key.
- **Status uses text + color, never color alone** — semantic status tokens come in
  `-bg`/`-text` pairs so P&L/status can satisfy accessibility (text label + color).
  ([accessibility-rule.md](../../.claude/rules/accessibility-rule.md))

## Failure Modes

| Condition | Behavior / guidance |
|---|---|
| `data-theme` attribute missing | Light semantics apply (defined on `:root`); UI still renders correctly. |
| A new semantic token added to light but not dark | Dark theme falls through to the light value — a visual bug. Always add the dark override too. |
| Component uses a raw hex instead of a token | Breaks theming and accessibility; flagged by the workstation UI rule validation. |
| Token referenced but undefined | The CSS `var()` resolves to nothing/inherited — prefer providing a fallback only at primitive boundaries, not for semantics. |

## How to Extend

1. **Add a primitive** (e.g. a new accent step) under the primitive section of
   `src/index.css`.
2. **Add or update a semantic token** in both the `:root` light block **and** the
   `[data-theme="dark"]` block — never only one.
3. **Map data-viz** through the `--chart-*` roles so charts inherit palette changes.
4. **Reference, don't duplicate:** semantic tokens should `var(--primitive)` rather than
   re-specify a hex, so a palette change propagates everywhere.
5. **Theme keys:** if a third theme is ever added, extend the `Theme` union and `themes`
   map in `src/index.ts` and add a matching `[data-theme="..."]` block.

## Testing Notes

- There is no `test` script and no Zod surface — verification is structural.
- After changes, run `pnpm build:web` and confirm the token sheet imports cleanly via
  `apps/web/app/globals.css` (`@import "@repo/design-tokens/css";`).
- Manually verify both themes: toggle `data-theme` and confirm every semantic token has a
  dark counterpart (no light value bleeding into dark).
- Audit usage: `grep -r "#[0-9a-fA-F]\{6\}\|rgba(" apps/web/components` should not turn up
  hardcoded colors that belong in tokens.

## Current vs Future

| Capability | Status |
|---|---|
| Light + dark token system | Current |
| `Theme` / `themes` / `themeStorageKey` TS exports | Current |
| Chart role + series tokens | Current |
| Additional themes (e.g. high-contrast) | Future — extend `Theme` + add a `[data-theme]` block |

## Related

- Rules: [`workstation-ui-rule.md`](../../.claude/rules/workstation-ui-rule.md), [`financial-ui-safety-rule.md`](../../.claude/rules/financial-ui-safety-rule.md), [`accessibility-rule.md`](../../.claude/rules/accessibility-rule.md)
- [`docs/architecture/overview.md`](../architecture/overview.md)
