'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { MarketStateConstellationViewModel } from '../../server/mappers/market-state-constellation-mapper';

type ConstellationLabels = {
  title: string; description: string; openFullscreen: string; closeFullscreen: string; reset: string;
  homeEyebrow: string; homeTitle: string; homeDescription: string; structure: string; relationships: string;
  openWorkstation: string; correlationTitle: string; correlationDescription: string;
  legendLabel: string; bullish: string; bearish: string; neutral: string; sizeConfidence: string;
  momentumAxis: string; volatilityAxis: string; selectedAsset: string; selectPrompt: string; assetClass: string;
  momentum: string; volatility: string; confidence: string; signal: string; asOf: string; openAsset: string;
  explanation: string; summary: string; resetHint: string;
};

type Props = { vm: MarketStateConstellationViewModel; labels: ConstellationLabels };

const VIEW_W = 1000;
const VIEW_H = 560;
const PAD = { top: 34, right: 16, bottom: 36, left: 46 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;
const cx = (nx: number) => PAD.left + nx * PLOT_W;
const cy = (ny: number) => PAD.top + (1 - ny) * PLOT_H;

export function MarketStateConstellation({ vm, labels }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const selected = vm.nodes.find((node) => node.assetId === selectedId) ?? null;

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [fullscreen]);

  if (!vm.available) {
    return <div className="constellation constellation--empty" role="status"><p className="constellation__empty-text">{vm.emptyReason}</p></div>;
  }

  const zeroX = cx(vm.zeroMomentumX);
  const medianY = cy(vm.medianVolatilityY);
  const chart = (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="constellation__svg" role="img" aria-label={labels.summary} preserveAspectRatio="xMidYMid meet">
      <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} className="constellation__frame" rx={10} />
      <line x1={zeroX} x2={zeroX} y1={PAD.top} y2={PAD.top + PLOT_H} className="constellation__ref constellation__ref--vertical" />
      <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={medianY} y2={medianY} className="constellation__ref constellation__ref--horizontal" />
      <text x={PAD.left + PLOT_W - 8} y={PAD.top + 16} textAnchor="end" className="constellation__quadrant">{vm.quadrants.topRight}</text>
      <text x={PAD.left + 8} y={PAD.top + 16} textAnchor="start" className="constellation__quadrant">{vm.quadrants.topLeft}</text>
      <text x={PAD.left + PLOT_W - 8} y={PAD.top + PLOT_H - 8} textAnchor="end" className="constellation__quadrant">{vm.quadrants.bottomRight}</text>
      <text x={PAD.left + 8} y={PAD.top + PLOT_H - 8} textAnchor="start" className="constellation__quadrant">{vm.quadrants.bottomLeft}</text>
      <text x={PAD.left + PLOT_W / 2} y={VIEW_H - 10} textAnchor="middle" className="constellation__axis">← {labels.momentumAxis} · {labels.momentumAxis} →</text>
      <text x={14} y={PAD.top + PLOT_H / 2} textAnchor="middle" className="constellation__axis" transform={`rotate(-90 14 ${PAD.top + PLOT_H / 2})`}>{labels.volatilityAxis} ↑</text>
      {vm.nodes.map((node) => {
        const x = cx(node.nx); const y = cy(node.ny); const r = 5 + node.sizeScale * 7;
        const isSelected = node.assetId === selectedId;
        return (
          <a key={node.assetId} href={node.href} aria-label={node.ariaLabel} aria-current={isSelected ? 'true' : undefined}
            onClick={(event) => { event.preventDefault(); setSelectedId((current) => current === node.assetId ? null : node.assetId); }}>
            <g className={`constellation-node ${node.toneClass}${isSelected ? ' constellation-node--selected' : ''}`}>
              <title>{node.ariaLabel}</title>
              <circle cx={x} cy={y} r={r + 7} className="constellation-node__hit" />
              <circle cx={x} cy={y} r={r + 5} className="constellation-node__halo" opacity={0.12 + node.sizeScale * 0.22} />
              <circle cx={x} cy={y} r={r} className="constellation-node__core" />
              {node.sizeScale >= 0.62 ? <text x={x} y={y - r - 4} textAnchor="middle" className="constellation-node__label">{node.symbol}</text> : null}
            </g>
          </a>
        );
      })}
    </svg>
  );

  const inspector = selected ? (
    <aside className="constellation__inspector" aria-live="polite" aria-label={labels.selectedAsset}>
      <div className="constellation__inspector-head"><div><span className="constellation__inspector-kicker">{labels.selectedAsset}</span><h3>{selected.symbol}<span>{selected.name}</span></h3></div><button type="button" className="button button--ghost button--compact" onClick={() => setSelectedId(null)} aria-label={labels.resetHint}>×</button></div>
      <dl className="constellation__metrics">
        <div><dt>{labels.signal}</dt><dd>{selected.directionLabel}</dd></div><div><dt>{labels.momentum}</dt><dd>{selected.momentumLabel}</dd></div>
        <div><dt>{labels.volatility}</dt><dd>{selected.volatilityLabel}</dd></div><div><dt>{labels.confidence}</dt><dd>{selected.confidenceLabel}</dd></div>
        <div><dt>{labels.assetClass}</dt><dd>{selected.assetClass}</dd></div><div><dt>{labels.asOf}</dt><dd>{vm.asOfLabel}</dd></div>
      </dl>
      <p className="constellation__explanation">{labels.explanation}</p><Link className="button button--secondary button--compact" href={selected.href}>{labels.openAsset}</Link>
    </aside>
  ) : <p className="constellation__select-prompt">{labels.selectPrompt}</p>;

  const surface = (
    <div className={`constellation${fullscreen ? ' constellation--fullscreen' : ''}`}>
      <div className="constellation__toolbar"><span className="constellation__toolbar-summary">{vm.pointCountLabel} · {vm.asOfLabel}</span><div className="constellation__toolbar-actions"><button type="button" className="button button--secondary button--compact" onClick={() => setSelectedId(null)}>{labels.reset}</button><button type="button" className="button button--primary button--compact" onClick={() => setFullscreen((current) => !current)}>{fullscreen ? labels.closeFullscreen : labels.openFullscreen}</button></div></div>
      <div className="constellation__stage">{chart}</div>{inspector}
      <div className="constellation__footer"><ul className="constellation__legend" aria-label={labels.legendLabel}><li><span className="constellation__swatch constellation__swatch--bullish" aria-hidden="true" /> {labels.bullish}</li><li><span className="constellation__swatch constellation__swatch--bearish" aria-hidden="true" /> {labels.bearish}</li><li><span className="constellation__swatch constellation__swatch--neutral" aria-hidden="true" /> {labels.neutral}</li><li className="constellation__legend-note">{labels.sizeConfidence}</li></ul><p className="constellation__caption">{vm.pointCountLabel} · {vm.summary} {labels.explanation}</p></div>
    </div>
  );

  return fullscreen ? <div className="constellation__fullscreen-layer">{surface}</div> : surface;
}
