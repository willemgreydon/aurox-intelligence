# i18n Translation Quality Report

**Generated:** 2026-05-10  
**Total i18n keys (en):** 453  
**Locales supported:** 12 (en + 11 regional)

---

## Coverage Summary

| Locale | Language | Translated | Total | Coverage | English Fallbacks |
|--------|----------|-----------|-------|----------|-------------------|
| `en` | English | 453 | 453 | 100% | — |
| `de` | German | 420 | 453 | 92.7% | 33 |
| `zh` | Chinese (Simplified) | 161 | 453 | 35.5% | 292 |
| `ar` | Arabic | 45 | 453 | 9.9% | 408 |
| `es` | Spanish | 45 | 453 | 9.9% | 408 |
| `hi` | Hindi | 45 | 453 | 9.9% | 408 |
| `ja` | Japanese | 45 | 453 | 9.9% | 408 |
| `ko` | Korean | 45 | 453 | 9.9% | 408 |
| `pt` | Portuguese | 44 | 453 | 9.7% | 409 |
| `fr` | French | 42 | 453 | 9.3% | 411 |
| `it` | Italian | 42 | 453 | 9.3% | 411 |
| `nl` | Dutch | 39 | 453 | 8.6% | 414 |

---

## Key Findings

### German (de) — Production Quality at 92.7%

German is the most complete secondary locale. The 33 remaining English fallbacks are intentional or low-priority:

| Key | English Value | Notes |
|-----|--------------|-------|
| `shell.brandTitle` | "Aurox Intelligence" | Brand name — intentionally English |
| `shell.nav.dashboard` | "Dashboard" | Dashboard is an internationalised term |
| `common.live` | "Live" | Status indicator — intentionally English |
| `auth.namePlaceholder` | "Ada Lovelace" | Example name placeholder |
| `simulation.chips.*` | `"1"`, `"25%"`, `"$50"` | Numeric chips — language-neutral |
| `account.chartTypeTrend` | "Trend" | Financial chart type term |
| `account.chartTypeDonut` | "Donut" | Chart type — widely used in German |
| `account.assetScopeEtf` | "ETF" | Financial acronym |

**Recommendation:** German is release-ready. Review the chart type labels (`chartTypeStock`, `chartTypeComparison`, `chartTypeBar`) for German-specific terminology.

### Chinese (zh) — Partial at 35.5%

Chinese has significant coverage of core UI keys from an earlier translation pass but is missing most of the recently added keys (dashboard freshness states, account preferences, simulation labels). A targeted second pass on the `account.*`, `dashboard.*`, and `simulation.*` sections would bring zh to ~70% coverage.

### All Other Locales — Scaffold at ~9%

ar, es, fr, hi, it, ja, ko, nl, pt are at scaffold state — all keys exist (no missing keys) but ~90% use English fallbacks. The system degrades gracefully: English is shown when a locale value matches the English value, which is indistinguishable from a proper English locale to the user.

**Priority for native translation pass:**
1. `common.*` — shared labels used everywhere
2. `shell.*` — navigation and brand shell
3. `auth.*` — login, signup, error messages
4. `dashboard.*` — primary workstation screen
5. `account.*` — settings and preferences
6. `simulation.*` — simulation trading interface

---

## Key Structure Overview

```
en.json
├── shell          (14 keys)   — App shell, nav, auth buttons
├── common         (22 keys)   — Shared labels (save, cancel, loading, etc.)
├── auth           (19 keys)   — Login, signup, error messages
├── dashboard      (40 keys)   — Dashboard page, market pulse, freshness states
├── account        (50 keys)   — Settings, preferences, broker modes
├── simulation     (60 keys)   — Simulation trading interface
├── marketGraph    (26 keys)   — Chart/graph controls
├── observe        (10 keys)   — Market observation workstation
├── home           (30 keys)   — Home/landing page
├── homeSections   (30 keys)   — Landing page sections
├── invest         (8 keys)    — Invest page
├── news           (6 keys)    — News stream widget
├── table          (5 keys)    — Shared data table labels
└── ...            (133 keys)  — Other sections
```

---

## Fallback Behavior

When a key is missing or matches the English value, the system falls back to English silently. This is safe for production — users see English rather than a blank or broken label.

The `pnpm i18n:check` script (added 2026-05-09) detects:
- **Key parity errors:** keys present in en but missing from any locale file (currently 0 — all 453 keys exist in all 12 locales)
- **Hardcoded string warnings:** user-visible UI strings that are not routed through the i18n system

---

## Recommendations

### Immediate (before user-facing multilingual launch)

1. **Commission native translation pass** for es, fr, de (incomplete keys) — highest user impact languages
2. **Audit `account.*` section in zh** — zh has partial coverage but missing the account preferences added in v2.0
3. **Verify RTL layout for ar** — Arabic requires RTL CSS; the localization keys are present but layout testing is needed

### Medium Term

4. **Add pluralization support** — currently `sessionControlsDescription` uses `{{count}}` string replacement; proper i18n libraries handle plurals natively per locale
5. **Add ICU message format** for date/number formatting to avoid manual `toLocaleString` calls with hardcoded `'en-US'`
6. **Namespace the key structure** — current flat namespacing (`account.chartTypeTrend`) will grow; consider migrating to nested feature namespaces

### Low Priority

7. **Chart type and time period labels** — added in v2.0 with English fallbacks; update non-en locales when doing native translation pass
8. **Module ID labels** — `moduleMarketOverview`, `moduleWatchlist`, etc. added in v2.0 with English fallbacks

---

## How to Run Translation QA

```bash
pnpm --filter @repo/web i18n:check
```

This reports:
- Key parity errors (exit code 1 if any found)  
- Hardcoded string warnings (warnings only, exit code 0)

For a full key count report:

```bash
node -e "
const fs = require('fs');
const en = JSON.parse(fs.readFileSync('apps/web/lib/i18n/locales/en.json', 'utf8'));
function count(o) { return Object.values(o).reduce((n,v) => n + (typeof v === 'object' && v !== null ? count(v) : 1), 0); }
console.log('en keys:', count(en));
"
```
