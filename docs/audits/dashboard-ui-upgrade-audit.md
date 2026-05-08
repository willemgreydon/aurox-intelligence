# Dashboard UI Upgrade Audit

Date: 2026-05-08

## Current dashboard structure (before patch)
- Existing `/dashboard` was a broad analytics page with many sections, tables, and chart modes.
- Layout was comprehensive but not optimized as a high-level executive command center.
- Workflow links to new observation stack (`/alerts`, `/replay`) were weak.

## Data already available
- Observation/regime/anomaly/readiness context via `market-observation-service`.
- Alert state and grouped severity via `alert-center-service`.
- Portfolio metrics and risk context via `portfolio-intelligence-service`.
- News stream and sentiment via `news-service`.
- Provider status and readiness via `admin-service`.

## Missing data / constraints
- No dedicated dashboard executive view-model combining all key surfaces.
- No concise IA framing for “today’s operating system” view.
- No direct panel mapping to all new routes (`/alerts`, `/observe`, `/portfolio/intelligence`, `/news`, `/invest/*`).
- Required degraded behavior needed normalization across multiple service sources.

## Layout weaknesses identified
- Old dashboard had dense module sprawl but weak executive hierarchy.
- Too many low-priority sections for first viewport.
- Limited right-rail escalation flow for alerts/simulation/provider status.
- Not enough cross-linking to new GOD-tier surfaces.

## Patch plan applied
1. Add `dashboard-executive-service` for normalized, degraded-safe executive model.
2. Replace `/dashboard` with new command-center IA:
   - Hero command header + quick actions
   - KPI strip
   - Main workstation grid (left intelligence, right escalation rail)
   - Lower intelligence grid
   - CTA continuation band
3. Add premium dashboard components for reusable panel composition.
4. Add responsive CSS tuned for desktop/laptop/mobile stacking.
5. Add dashboard service tests for degraded handling and internal link safety.
