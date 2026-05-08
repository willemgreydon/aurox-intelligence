# Route Loading States Audit

Date: 2026-05-08

## Route coverage matrix
| Route | Dedicated `loading.tsx` | Fallback acceptable? | Action taken |
|---|---|---|---|
| `/` | Yes (`app/loading.tsx`) | Yes | Kept branded generic fallback |
| `/market` | Yes | No | Kept dedicated market workstation skeleton |
| `/observe` | Yes | No | Added dedicated observer skeleton |
| `/signals` | Yes | No | Added dedicated signals skeleton |
| `/portfolio/intelligence` | Yes | No | Added dedicated portfolio intelligence skeleton |
| `/portfolio` | Yes | No | Added dedicated portfolio skeleton |
| `/invest/simulation` | Yes | No | Added dedicated simulation skeleton |
| `/invest/stocks` | Yes | No | Added dedicated stock-lane skeleton |
| `/invest/etfs` | Yes | No | Added dedicated ETF-lane skeleton |
| `/invest/crypto` | Yes | No | Added dedicated crypto-lane skeleton |
| `/invest/portfolio` | Yes | No | Replaced old lightweight card with shared premium skeleton |
| `/news` | Yes | No | Added dedicated news skeleton |
| `/markets/intelligence` | Yes | No | Added dedicated market-intelligence skeleton |
| `/dashboard` | Yes | No | Added dedicated dashboard skeleton |
| `/admin` | Yes | No | Added dedicated admin skeleton |
| `/admin/monitoring` | Yes | No | Added dedicated monitoring skeleton |
| `/admin/monitoring/providers` | Yes | No | Added dedicated provider-monitoring skeleton |
| `/legal` | Yes | Optional | Added simple legal skeleton for parity |

## Shared skeleton system
- Added `apps/web/components/ui/skeleton-workspace.tsx`.
- Variants now support:
  - `generic`
  - `observe`
  - `dashboard`
  - `markets-intelligence`
  - `admin`
  - `signals`
  - `portfolio`
  - `portfolio-intelligence`
  - `simulation`
  - `asset-lane`
  - `news`

## Guardrails added
- Added test: `apps/web/lib/loading-routes.test.ts`
- Verifies:
  1. required major route loading files exist
  2. route loading files do not use old `"Market graph"` placeholder copy

## Outcome
- Major Aurox workstations now have loading-state parity.
- Global fallback is branded and route-neutral.
- Lightweight regression guard exists to prevent silent fallback regressions.
