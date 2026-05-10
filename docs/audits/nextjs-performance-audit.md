# Next.js Performance Audit (May 9, 2026)

## Slowest Paths Found
- `loadQuoteSnapshots` was repeatedly asked for very large symbol sets on heavy routes.
- `getSimulationWorkstationStateForCurrentUser` loaded full tradable/watchlist universes and then fetched quotes for all candidates.
- `/alerts` loaded up to `300` rows on initial render.
- `/observe` persisted-event read path fetched `120` rows by default.
- `/invest/simulation` initial journal load requested `150` rows.

## Blocking Server Calls
- Provider refresh in `loadQuoteSnapshots` could block initial route render when stale symbols existed.
- Workstation state + quotes + workspace aggregation was the dominant blocking sequence for simulation/portfolio routes.

## Duplicate / Oversized Query Patterns
- Broad symbol lists were frequently passed into quote loading even when only first page/visible cards were rendered.
- Full-route composition included expensive lists before above-the-fold summaries were completed.

## Client Bundle / Hydration Hotspots
- Market graph and observe workstations are heavy client islands.
- The largest risk here is oversized props (too many rows/symbols), not just code size.

## DB Timeout Causes
- Simulation workstation path can fan out with large symbol sets and quote joins.
- Large alert/event limits increase query and serialization time.

## Provider Fetch Causes
- Stale/missing snapshot sets triggered provider refresh on initial render.
- No explicit cached-first mode existed for selected routes.

## Patch Plan Applied
1. Add `cached-first` option to quote snapshot loader for non-blocking route renders.
2. Add symbol caps to quote loader and route-level defaults.
3. Cap workstation tradable assets/watchlist before quote fetch.
4. Reduce initial rows for alerts/events/journal.
5. Keep stale/degraded behavior explicit, no fake data.

## Follow-up Plan
- Introduce dedicated route-level summary endpoints for `/dashboard` and `/portfolio/intelligence`.
- Add DB indexes or query splitting for simulation workstation aggregates if timeout persists.
- Add incremental loading (`load more`) for observer timeline and alert list.
