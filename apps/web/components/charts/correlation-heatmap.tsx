import { Fragment, type CSSProperties } from 'react';
import type { CorrelationHeatmapViewModel } from '../../server/mappers/market-correlation-mapper';

/**
 * Correlation Heatmap — pairwise correlation of synchronized daily returns across
 * a bounded set of tradable assets (from the pure @repo/signals engine). Colour
 * runs negative (red) → neutral → positive (green) by magnitude. Cells with
 * insufficient overlapping history read "—", never a fabricated 0. Server
 * component; native <title> tooltips, no client JS.
 */

function cellStyle(value: number): CSSProperties {
  const magnitude = Math.min(1, Math.abs(value));
  const hue = value >= 0 ? 'var(--chart-positive)' : 'var(--chart-negative)';
  const pct = (magnitude * 68 + 6).toFixed(0);
  return { background: `color-mix(in srgb, ${hue} ${pct}%, var(--surface-raised))` };
}

export function CorrelationHeatmap({ vm }: { vm: CorrelationHeatmapViewModel }) {
  if (!vm.available) {
    return (
      <div className="corrheat corrheat--empty" role="status">
        <p className="corrheat__empty-text">{vm.emptyReason}</p>
      </div>
    );
  }

  const n = vm.symbols.length;

  return (
    <div className="corrheat">
      <div className="corrheat__viewport">
        <div
          className="corrheat__grid"
          style={{ gridTemplateColumns: `var(--corrheat-rowhead, 3rem) repeat(${n}, minmax(var(--corrheat-cell, 2.85rem), 1fr))` }}
          role="img"
          aria-label={`Correlation heatmap of ${n} assets — ${vm.coverageLabel}, ${vm.windowLabel}.`}
        >
        <span className="corrheat__corner" aria-hidden="true" />
        {vm.symbols.map((symbol) => (
          <span key={`col-${symbol}`} className="corrheat__colhead">
            {symbol}
          </span>
        ))}

        {vm.rows.map((row, i) => {
          const symbol = vm.symbols[i]!;
          return (
            <Fragment key={`row-${symbol}`}>
              <span className="corrheat__rowhead" title={vm.names[symbol] ?? symbol}>
                {symbol}
              </span>
              {row.map((cell, j) => (
                <span
                  key={`${i}-${j}`}
                  className={`corrheat__cell${cell.isDiagonal ? ' corrheat__cell--diag' : ''}${
                    !cell.available ? ' corrheat__cell--na' : ''
                  }`}
                  style={cell.available && !cell.isDiagonal && cell.value !== null ? cellStyle(cell.value) : undefined}
                  title={cell.ariaLabel}
                >
                  {cell.display}
                </span>
              ))}
            </Fragment>
          );
        })}
        </div>
      </div>

      <div className="corrheat__footer">
        <div className="corrheat__legend" aria-hidden="true">
          <span>−1</span>
          <span className="corrheat__legend-bar" />
          <span>+1</span>
        </div>
        <p className="corrheat__caption">
          {vm.windowLabel} · {vm.coverageLabel} · {vm.asOfLabel}. “—” = insufficient overlapping history.
          Correlation ≠ causation.
        </p>
      </div>
    </div>
  );
}
