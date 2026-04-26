# /mini-chart-upgrade

## Purpose
Upgrade mini sparkline charts and inline price charts for better visual quality and data fidelity.

## When to Use
- When mini charts are not showing for assets
- When sparklines need a visual upgrade
- After adding historical data to the read model

## Claude Code Prompt

```text
Upgrade Aurox mini chart / sparkline components.

Target: [USER PROVIDES: e.g. asset card sparklines, portfolio position mini charts]

Audit current mini charts:
1. Is historical data available in the read model?
2. How many data points are being shown?
3. Are the charts responsive to the card size?
4. Are they showing price changes with appropriate color (green up, red down)?
5. Are they accessible (title/label for screen readers)?
6. Do they handle empty/missing data gracefully?

Upgrade:
- Show at least 20-30 data points for meaningful shape
- Color gradient based on net change (positive/negative)
- Thin line, no axis labels (for space efficiency)
- Tooltip on hover showing date/price if space allows
- Graceful empty state if no history available

Rules:
- Historical data must come from read model (not computed in component)
- Chart rendering library must be already present in the repo (do not add new dependencies without discussion)
- Must not block render if historical data is loading

Report:

Mini Chart Upgrade
==================
Data points shown: <before> → <after>
Color coding: added / already present
Empty state: added / already present

Files changed:
- apps/web/components/<chart-component>

Verification:
pnpm build:web
```

## Validation Commands
```bash
pnpm build:web
```

## Expected Output
Upgraded mini charts with meaningful data density and graceful empty states.

## Safety Notes
- Do not add new charting dependencies without user approval.
- Historical data must not be faked if unavailable — show empty state.
