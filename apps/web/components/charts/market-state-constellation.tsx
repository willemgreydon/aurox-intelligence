import Link from 'next/link';
import type { MarketStateConstellationViewModel } from '../../server/mappers/market-state-constellation-mapper';

/**
 * Market State Constellation — the signature Aurox market-at-a-glance view.
 *
 * Each tradable asset is a point: x = momentum, y = realized volatility, colour
 * = deterministic signal direction, size = signal confidence. Reference lines
 * mark zero momentum (vertical) and median volatility (horizontal), creating
 * four interpretable regions. Server component: nodes are real <Link>s, tooltips
 * are native SVG <title> (no client JS, keyboard + screen-reader friendly).
 *
 * This is observation, not advice — no quadrant is labelled "buy".
 */

const VIEW_W = 1000;
const VIEW_H = 560;
const PAD = { top: 34, right: 16, bottom: 36, left: 46 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

function cx(nx: number): number {
  return PAD.left + nx * PLOT_W;
}
function cy(ny: number): number {
  // ny = 1 is highest volatility → top of the plot.
  return PAD.top + (1 - ny) * PLOT_H;
}

export function MarketStateConstellation({ vm }: { vm: MarketStateConstellationViewModel }) {
  if (!vm.available) {
    return (
      <div className="constellation constellation--empty" role="status">
        <p className="constellation__empty-text">{vm.emptyReason}</p>
      </div>
    );
  }

  const zeroX = cx(vm.zeroMomentumX);
  const medianY = cy(vm.medianVolatilityY);

  return (
    <div className="constellation">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="constellation__svg"
        role="img"
        aria-label={vm.summary}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Plot frame */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={PLOT_W}
          height={PLOT_H}
          className="constellation__frame"
          rx={10}
        />

        {/* Reference lines */}
        <line x1={zeroX} x2={zeroX} y1={PAD.top} y2={PAD.top + PLOT_H} className="constellation__ref constellation__ref--vertical" />
        <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={medianY} y2={medianY} className="constellation__ref constellation__ref--horizontal" />

        {/* Quadrant labels (faint, corners) */}
        <text x={PAD.left + PLOT_W - 8} y={PAD.top + 16} textAnchor="end" className="constellation__quadrant">{vm.quadrants.topRight}</text>
        <text x={PAD.left + 8} y={PAD.top + 16} textAnchor="start" className="constellation__quadrant">{vm.quadrants.topLeft}</text>
        <text x={PAD.left + PLOT_W - 8} y={PAD.top + PLOT_H - 8} textAnchor="end" className="constellation__quadrant">{vm.quadrants.bottomRight}</text>
        <text x={PAD.left + 8} y={PAD.top + PLOT_H - 8} textAnchor="start" className="constellation__quadrant">{vm.quadrants.bottomLeft}</text>

        {/* Axis captions */}
        <text x={PAD.left + PLOT_W / 2} y={VIEW_H - 10} textAnchor="middle" className="constellation__axis">
          ← Declining momentum · Advancing →
        </text>
        <text
          x={14}
          y={PAD.top + PLOT_H / 2}
          textAnchor="middle"
          className="constellation__axis"
          transform={`rotate(-90 14 ${PAD.top + PLOT_H / 2})`}
        >
          Volatility ↑
        </text>

        {/* Nodes */}
        {vm.nodes.map((node) => {
          const x = cx(node.nx);
          const y = cy(node.ny);
          const r = 5 + node.sizeScale * 7;
          const showLabel = node.sizeScale >= 0.62;
          return (
            <Link key={node.assetId} href={node.href} aria-label={node.ariaLabel}>
              <g className={`constellation-node ${node.toneClass}`}>
                <title>{node.ariaLabel}</title>
                <circle cx={x} cy={y} r={r + 5} className="constellation-node__halo" opacity={0.12 + node.sizeScale * 0.22} />
                <circle cx={x} cy={y} r={r} className="constellation-node__core" />
                {showLabel ? (
                  <text x={x} y={y - r - 4} textAnchor="middle" className="constellation-node__label">
                    {node.symbol}
                  </text>
                ) : null}
              </g>
            </Link>
          );
        })}
      </svg>

      {/* Legend + caption */}
      <div className="constellation__footer">
        <ul className="constellation__legend" aria-label="Signal direction legend">
          <li><span className="constellation__swatch constellation__swatch--bullish" aria-hidden="true" /> Bullish</li>
          <li><span className="constellation__swatch constellation__swatch--bearish" aria-hidden="true" /> Bearish</li>
          <li><span className="constellation__swatch constellation__swatch--neutral" aria-hidden="true" /> Neutral</li>
          <li className="constellation__legend-note">node size = signal confidence</li>
        </ul>
        <p className="constellation__caption">
          {vm.pointCountLabel} · momentum vs. realized volatility · {vm.asOfLabel}. Observation of market
          structure — not investment advice.
        </p>
      </div>
    </div>
  );
}
