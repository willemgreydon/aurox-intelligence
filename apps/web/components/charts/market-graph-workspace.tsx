'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatChartAxisDate, formatChartMonthRange, formatChartTooltipDate } from '../../lib/chart-date-format';

type HistoryPoint = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type AssetSeries = {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  history: HistoryPoint[];
  signal: {
    interpretation: 'bullish' | 'bearish' | 'neutral';
  } | null;
  snapshot: {
    price: number;
    changePercent?: number;
  } | null;
};

type MarketGraphWorkspaceProps = {
  assets: AssetSeries[];
  variant?: 'default' | 'spotlight';
  labels: {
    timeframe: string;
    graphType: string;
    line: string;
    candles: string;
    movingAverage: string;
    signals: string;
    compare: string;
    selectAsset: string;
    noCompare: string;
    lastPrice: string;
    zoomIn: string;
    zoomOut: string;
    panLeft: string;
    panRight: string;
    resetView: string;
    viewport: string;
    historyRange: string;
    chartAriaTemplate: string;
    noData: string;
    unavailable: string;
  };
};

type HoverState = {
  index: number;
  panelX: number;
  panelY: number;
};

const timeframes = [
  { id: '1D', points: 2 },
  { id: '1W', points: 5 },
  { id: '1M', points: 22 },
  { id: '3M', points: 66 },
  { id: '1Y', points: 252 },
  { id: 'ALL', points: Number.POSITIVE_INFINITY },
] as const;

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function buildLine(values: number[], width: number, height: number): string {
  if (values.length < 2 || values.some((value) => !Number.isFinite(value))) {
    return '';
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function buildArea(values: number[], width: number, height: number): string {
  if (values.length < 2 || values.some((v) => !Number.isFinite(v))) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  return `M 0,${height} L ${pts.join(' L ')} L ${width},${height} Z`;
}

function movingAverage(points: HistoryPoint[], period: number) {
  return points.map((_, index) => {
    const slice = points.slice(Math.max(0, index - period + 1), index + 1);
    return average(slice.map((point) => point.close));
  });
}


export function MarketGraphWorkspace({ assets, labels, variant = 'default' }: MarketGraphWorkspaceProps) {
  const rawId = useId();
  const chartId = rawId.replace(/[^a-z0-9]/gi, '');
  const areaGradientId = `mgw-area-${chartId}`;

  const normalizedAssets = useMemo(
    () =>
      assets.map((asset) => {
        const dedupedByTimestamp = new Map<string, HistoryPoint>();
        for (const point of asset.history) {
          const time = new Date(point.timestamp).getTime();
          const isFiniteCandle =
            Number.isFinite(point.open) &&
            Number.isFinite(point.high) &&
            Number.isFinite(point.low) &&
            Number.isFinite(point.close);
          if (!Number.isFinite(time) || !isFiniteCandle) continue;
          dedupedByTimestamp.set(point.timestamp, point);
        }
        return {
          ...asset,
          history: [...dedupedByTimestamp.values()].sort(
            (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
          ),
        };
      }),
    [assets],
  );

  const [symbol, setSymbol] = useState(assets[0]?.symbol ?? '');
  const [compareSymbol, setCompareSymbol] = useState('');
  const [timeframe, setTimeframe] = useState<(typeof timeframes)[number]['id']>('3M');
  const [graphType, setGraphType] = useState<'line' | 'candles'>('line');
  const [showMovingAverage, setShowMovingAverage] = useState(true);
  const [showSignals, setShowSignals] = useState(true);
  const [viewportSize, setViewportSize] = useState<number | null>(null);
  const [viewportOffset, setViewportOffset] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [hoverState, setHoverState] = useState<HoverState | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);

  const selected = normalizedAssets.find((asset) => asset.symbol === symbol) ?? normalizedAssets[0] ?? null;
  const compare = normalizedAssets.find((asset) => asset.symbol === compareSymbol) ?? null;
  const timeframeConfig = timeframes.find((item) => item.id === timeframe) ?? timeframes[3];

  useEffect(() => {
    if (normalizedAssets.length === 0) {
      if (symbol !== '') setSymbol('');
      return;
    }
    if (!normalizedAssets.some((asset) => asset.symbol === symbol)) {
      setSymbol(normalizedAssets[0]!.symbol);
    }
  }, [normalizedAssets, symbol]);

  const visible = useMemo(() => {
    if (!selected) return [];
    if (!Number.isFinite(timeframeConfig.points)) return selected.history;
    return selected.history.slice(-timeframeConfig.points);
  }, [selected, timeframeConfig.points]);

  const compareVisible = useMemo(() => {
    if (!compare) return [];
    if (!Number.isFinite(timeframeConfig.points)) return compare.history;
    return compare.history.slice(-timeframeConfig.points);
  }, [compare, timeframeConfig.points]);

  useEffect(() => {
    const nextLength = visible.length;
    setViewportSize(nextLength > 0 ? nextLength : null);
    setViewportOffset(0);
    setHoverState(null);
  }, [symbol, timeframe, visible.length]);

  const viewportWindow = Math.max(2, Math.min(viewportSize ?? visible.length, visible.length));
  const maxOffset = Math.max(0, visible.length - viewportWindow);

  const viewportVisible = useMemo(() => {
    if (visible.length === 0) return [];
    const start = Math.max(0, Math.min(viewportOffset, maxOffset));
    return visible.slice(start, start + viewportWindow);
  }, [maxOffset, viewportOffset, viewportWindow, visible]);

  const viewportCompare = useMemo(() => {
    if (compareVisible.length === 0) return [];
    const compareWindow = Math.max(2, Math.min(viewportWindow, compareVisible.length));
    const compareMaxOffset = Math.max(0, compareVisible.length - compareWindow);
    const start = Math.max(0, Math.min(viewportOffset, compareMaxOffset));
    return compareVisible.slice(start, start + compareWindow);
  }, [compareVisible, viewportOffset, viewportWindow]);

  if (!selected) {
    return <div className="table-panel__empty">{labels.noData}</div>;
  }

  const hasRenderableSeries = viewportVisible.length >= 2;
  const closes = hasRenderableSeries ? viewportVisible.map((point) => point.close) : [];
  const ma = hasRenderableSeries ? movingAverage(viewportVisible, 10) : [];
  const compareCloses = hasRenderableSeries ? viewportCompare.map((point) => point.close) : [];

  const closeLine = hasRenderableSeries ? buildLine(closes, 980, 420) : '';
  const closeArea = hasRenderableSeries && graphType === 'line' ? buildArea(closes, 980, 420) : '';
  const maLine = hasRenderableSeries ? buildLine(ma, 980, 420) : '';
  const compareLine = hasRenderableSeries && compareCloses.length > 1 ? buildLine(compareCloses, 980, 420) : null;

  const minPrice = hasRenderableSeries ? Math.min(...viewportVisible.map((point) => point.low)) : 0;
  const maxPrice = hasRenderableSeries ? Math.max(...viewportVisible.map((point) => point.high)) : 0;
  const priceRange = hasRenderableSeries ? Math.max(1, maxPrice - minPrice) : 1;

  const closeMin = hasRenderableSeries ? Math.min(...closes) : 0;
  const closeMax = hasRenderableSeries ? Math.max(...closes) : 0;
  const closeRange = hasRenderableSeries ? Math.max(1, closeMax - closeMin) : 1;

  // Dynamic candle body width based on number of candles
  const candleBodyHalf = Math.max(1.5, Math.min(6, Math.floor((940 / Math.max(1, viewportVisible.length)) * 0.38)));

  // Last price reference line
  const lastClose = closes.at(-1);
  const lastPriceY =
    lastClose !== undefined && hasRenderableSeries
      ? graphType === 'line'
        ? 420 - ((lastClose - closeMin) / closeRange) * 420
        : 400 - ((lastClose - minPrice) / priceRange) * 360
      : null;

  const priceLabel = typeof selected.snapshot?.price === 'number' ? `$${selected.snapshot.price.toFixed(2)}` : labels.unavailable;
  const changeLabel =
    typeof selected.snapshot?.changePercent === 'number'
      ? `${selected.snapshot.changePercent > 0 ? '+' : ''}${selected.snapshot.changePercent.toFixed(2)}%`
      : labels.unavailable;

  const changeToneClass =
    typeof selected.snapshot?.changePercent !== 'number'
      ? 'market-graph__instrument-change--flat'
      : selected.snapshot.changePercent > 0
        ? 'market-graph__instrument-change--up'
        : selected.snapshot.changePercent < 0
          ? 'market-graph__instrument-change--down'
          : 'market-graph__instrument-change--flat';

  const rangeLabel = hasRenderableSeries
    ? formatChartMonthRange(viewportVisible[0]?.timestamp ?? null, viewportVisible.at(-1)?.timestamp ?? null, labels.unavailable)
    : labels.unavailable;

  const hoveredPoint = hoverState ? viewportVisible[hoverState.index] ?? null : null;
  const hoveredX =
    hoverState && hasRenderableSeries
      ? (hoverState.index / Math.max(1, viewportVisible.length - 1)) * 980
      : null;
  const hoveredY =
    hoveredPoint && hoveredX !== null
      ? graphType === 'line'
        ? 420 - ((hoveredPoint.close - closeMin) / closeRange) * 420
        : 400 - ((hoveredPoint.close - minPrice) / priceRange) * 360
      : null;

  // Axis label dimensions (SVG units)
  const yLabelW = 72;
  const yLabelH = 18;
  const xLabelW = 72;
  const xLabelH = 17;

  const tooltipWidth = 176;
  const tooltipHeight = graphType === 'candles' ? 130 : 96;
  const canvasWidth = canvasRef.current?.clientWidth ?? 980;
  const canvasHeight = canvasRef.current?.clientHeight ?? 420;
  const tooltipLeft = hoverState
    ? Math.max(8, Math.min(hoverState.panelX + 14, canvasWidth - tooltipWidth - 8))
    : 8;
  const tooltipTop = hoverState
    ? Math.max(8, Math.min(hoverState.panelY - tooltipHeight - 12, canvasHeight - tooltipHeight - 8))
    : 8;

  function zoomIn() {
    setViewportSize((current) => {
      const baseline = current ?? visible.length;
      return Math.max(12, Math.floor(baseline * 0.75));
    });
  }

  function zoomOut() {
    setViewportSize((current) => {
      const baseline = current ?? visible.length;
      return Math.min(visible.length, Math.ceil(baseline * 1.25));
    });
  }

  function handleChartMouseMove(event: React.MouseEvent<SVGSVGElement>) {
    if (!hasRenderableSeries || viewportVisible.length < 2) return;
    const svgRect = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - svgRect.left) / Math.max(1, svgRect.width)) * 980;
    const clamped = Math.max(0, Math.min(980, relativeX));
    const nextIndex = Math.max(0, Math.min(viewportVisible.length - 1, Math.round((clamped / 980) * (viewportVisible.length - 1))));
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const panelX = canvasRect ? event.clientX - canvasRect.left : 0;
    const panelY = canvasRect ? event.clientY - canvasRect.top : 0;
    setHoverState({ index: nextIndex, panelX, panelY });
  }

  function handleChartMouseLeave() {
    setHoverState(null);
  }

  return (
    <div className={`market-graph${variant === 'spotlight' ? ' market-graph--spotlight' : ''}`}>
      <div ref={canvasRef} className="market-graph__canvas">

        {/* Overlay: controls + instrument header */}
        <div className="market-graph__overlay">
          <section className="market-graph__control-panel" aria-label="Chart controls">
            <div className="market-graph__toolbar market-graph__toolbar--primary">
              <div className="market-graph__toolbar-zone market-graph__toolbar-zone--left">
                <label className="market-graph__selector">
                  <span className="market-graph__selector-label">{labels.selectAsset}</span>
                  <select className="market-graph__selector-input" value={symbol} onChange={(event) => setSymbol(event.target.value)}>
                    {assets.map((asset) => (
                      <option key={asset.symbol} value={asset.symbol}>
                        {asset.symbol} – {asset.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="market-graph__selector market-graph__selector--compare">
                  <span className="market-graph__selector-label">{labels.compare}</span>
                  <select className="market-graph__selector-input" value={compareSymbol} onChange={(event) => setCompareSymbol(event.target.value)}>
                    <option value="">{labels.noCompare}</option>
                    {assets
                      .filter((asset) => asset.symbol !== symbol)
                      .map((asset) => (
                        <option key={asset.symbol} value={asset.symbol}>
                          {asset.symbol}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <div className="market-graph__toolbar-zone market-graph__toolbar-zone--center">
                <div className="chart-toolbar__group market-graph__control-group" aria-label={labels.timeframe}>
                  <div className="chart-toolbar market-graph__pill-group">
                    {timeframes.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={item.id === timeframe ? 'control-pill market-graph__pill market-graph__pill--active' : 'control-pill market-graph__pill'}
                        aria-pressed={item.id === timeframe}
                        onClick={() => setTimeframe(item.id)}
                      >
                        {item.id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="market-graph__toolbar-zone market-graph__toolbar-zone--right">
                <div className="chart-toolbar__group market-graph__control-group" aria-label={labels.graphType}>
                  <div className="chart-toolbar market-graph__pill-group">
                    <button
                      type="button"
                      className={graphType === 'line' ? 'control-pill market-graph__pill market-graph__pill--active' : 'control-pill market-graph__pill'}
                      aria-pressed={graphType === 'line'}
                      onClick={() => setGraphType('line')}
                    >
                      {labels.line}
                    </button>
                    <button
                      type="button"
                      className={graphType === 'candles' ? 'control-pill market-graph__pill market-graph__pill--active' : 'control-pill market-graph__pill'}
                      aria-pressed={graphType === 'candles'}
                      onClick={() => setGraphType('candles')}
                    >
                      {labels.candles}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className={`control-pill market-graph__pill market-graph__advanced-toggle${advancedOpen ? ' market-graph__pill--active' : ''}`}
                  aria-expanded={advancedOpen}
                  aria-controls="market-graph-advanced-controls"
                  aria-label="Toggle advanced chart controls"
                  onClick={() => setAdvancedOpen((current) => !current)}
                >
                  ⚙
                </button>
              </div>
            </div>

            {advancedOpen ? (
              <div id="market-graph-advanced-controls" className="market-graph__advanced-panel">
                <div className="chart-toolbar__group" aria-label={labels.viewport}>
                  <div className="chart-toolbar market-graph__pill-group">
                    <button type="button" className="control-pill market-graph__pill" onClick={zoomIn}>
                      {labels.zoomIn}
                    </button>
                    <button type="button" className="control-pill market-graph__pill" onClick={zoomOut}>
                      {labels.zoomOut}
                    </button>
                    <button
                      type="button"
                      className="control-pill market-graph__pill"
                      onClick={() => setViewportOffset((current) => Math.max(0, current - Math.max(1, Math.floor(viewportWindow / 4))))}
                    >
                      {labels.panLeft}
                    </button>
                    <button
                      type="button"
                      className="control-pill market-graph__pill"
                      onClick={() => setViewportOffset((current) => Math.min(maxOffset, current + Math.max(1, Math.floor(viewportWindow / 4))))}
                    >
                      {labels.panRight}
                    </button>
                    <button
                      type="button"
                      className="control-pill market-graph__pill"
                      onClick={() => {
                        setViewportSize(visible.length);
                        setViewportOffset(0);
                      }}
                    >
                      {labels.resetView}
                    </button>
                  </div>
                </div>
                <div className="market-graph__advanced-switches">
                  <label className="market-graph__toggle">
                    <input type="checkbox" checked={showMovingAverage} onChange={() => setShowMovingAverage((value) => !value)} />
                    <span>{labels.movingAverage}</span>
                  </label>
                  <label className="market-graph__toggle">
                    <input type="checkbox" checked={showSignals} onChange={() => setShowSignals((value) => !value)} />
                    <span>{labels.signals}</span>
                  </label>
                </div>
              </div>
            ) : null}
          </section>

          {/* Instrument header — bottom-left of chart canvas */}
          <div className="market-graph__instrument" role="status" aria-live="polite">
            <div className="market-graph__instrument-identity">
              <strong className="market-graph__instrument-symbol">{selected.symbol}</strong>
              {selected.name ? <span className="market-graph__instrument-name">{selected.name}</span> : null}
              <span className="market-graph__instrument-class">{selected.assetClass.toUpperCase()}</span>
            </div>
            <div className="market-graph__instrument-price-row">
              <span className="market-graph__instrument-price">{priceLabel}</span>
              <span className={`market-graph__instrument-change ${changeToneClass}`}>{changeLabel}</span>
            </div>
            <div className="market-graph__instrument-range">{rangeLabel}</div>
          </div>
        </div>

        {/* Chart SVG */}
        <svg
          viewBox="0 0 980 420"
          className="market-graph__svg"
          role="img"
          aria-label={labels.chartAriaTemplate.replace('{{symbol}}', selected.symbol)}
          onMouseMove={handleChartMouseMove}
          onMouseLeave={handleChartMouseLeave}
        >
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-series-a)" stopOpacity="0.18" />
              <stop offset="85%" stopColor="var(--chart-series-a)" stopOpacity="0.03" />
              <stop offset="100%" stopColor="var(--chart-series-a)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <g>
            {[0, 1, 2, 3, 4].map((step) => (
              <line key={step} x1="0" y1={step * 105} x2="980" y2={step * 105} className="market-graph__grid" />
            ))}
          </g>

          {/* Area fill (line mode only) */}
          {hasRenderableSeries && graphType === 'line' && closeArea ? (
            <path d={closeArea} fill={`url(#${areaGradientId})`} className="market-graph__area" />
          ) : null}

          {/* Last price reference line */}
          {hasRenderableSeries && lastPriceY !== null ? (
            <line
              x1="0"
              y1={lastPriceY}
              x2="980"
              y2={lastPriceY}
              className="market-graph__last-price-line"
            />
          ) : null}

          {/* Series: candles or line */}
          {hasRenderableSeries ? (
            graphType === 'candles'
            ? viewportVisible.map((point, index) => {
                const x = (index / Math.max(1, viewportVisible.length - 1)) * 940 + 20;
                const openY = 400 - ((point.open - minPrice) / priceRange) * 360;
                const closeY = 400 - ((point.close - minPrice) / priceRange) * 360;
                const highY = 400 - ((point.high - minPrice) / priceRange) * 360;
                const lowY = 400 - ((point.low - minPrice) / priceRange) * 360;
                const top = Math.min(openY, closeY);
                const bodyHeight = Math.max(2, Math.abs(openY - closeY));
                return (
                  <g key={`${point.timestamp}-${index}`}>
                    <line x1={x} x2={x} y1={highY} y2={lowY} className="market-graph__wick" />
                    <rect
                      x={x - candleBodyHalf}
                      y={top}
                      width={candleBodyHalf * 2}
                      height={bodyHeight}
                      className={point.close >= point.open ? 'market-graph__candle market-graph__candle--up' : 'market-graph__candle market-graph__candle--down'}
                    />
                  </g>
                );
              })
            : <path d={closeLine} className="market-graph__line" />
          ) : (
            <text x="490" y="210" textAnchor="middle" className="market-graph__empty">
              {labels.noData}
            </text>
          )}

          {hasRenderableSeries && showMovingAverage ? <path d={maLine} className="market-graph__average" /> : null}
          {hasRenderableSeries && compareLine ? <path d={compareLine} className="market-graph__compare" /> : null}
          {hasRenderableSeries && showSignals && selected.signal ? (
            <circle
              cx="950"
              cy={400 - ((closes.at(-1)! - minPrice) / priceRange) * 360}
              r="6"
              className={`market-graph__signal market-graph__signal--${selected.signal.interpretation}`}
            />
          ) : null}

          {/* Crosshair */}
          {hoveredPoint && hoveredX !== null && hoveredY !== null ? (
            <g className="market-graph__crosshair">
              <line x1={hoveredX} y1="0" x2={hoveredX} y2="420" />
              <line x1="0" y1={hoveredY} x2="980" y2={hoveredY} />
              <circle cx={hoveredX} cy={hoveredY} r="4" className="market-graph__crosshair-point" />

              {/* Y-axis price label */}
              <g>
                <rect
                  x={980 - yLabelW}
                  y={Math.max(0, Math.min(420 - yLabelH, hoveredY - yLabelH / 2))}
                  width={yLabelW}
                  height={yLabelH}
                  rx="3"
                  className="market-graph__axis-label-bg"
                />
                <text
                  x={980 - yLabelW / 2}
                  y={Math.max(0, Math.min(420 - yLabelH, hoveredY - yLabelH / 2)) + 12}
                  textAnchor="middle"
                  className="market-graph__axis-label-text"
                >
                  ${hoveredPoint.close.toFixed(2)}
                </text>
              </g>

              {/* X-axis date label */}
              <g>
                <rect
                  x={Math.max(0, Math.min(980 - xLabelW, hoveredX - xLabelW / 2))}
                  y={420 - xLabelH}
                  width={xLabelW}
                  height={xLabelH}
                  rx="3"
                  className="market-graph__axis-label-bg"
                />
                <text
                  x={Math.max(0, Math.min(980 - xLabelW, hoveredX - xLabelW / 2)) + xLabelW / 2}
                  y={420 - xLabelH + 12}
                  textAnchor="middle"
                  className="market-graph__axis-label-text"
                >
                  {formatChartAxisDate(hoveredPoint.timestamp)}
                </text>
              </g>
            </g>
          ) : null}
        </svg>

        {/* Tooltip (DOM layer) */}
        {hoveredPoint && hoverState ? (
          <div
            className="market-graph__tooltip"
            style={{ left: `${tooltipLeft}px`, top: `${tooltipTop}px` }}
            aria-hidden="true"
          >
            <div className="market-graph__tooltip-date">{formatChartTooltipDate(hoveredPoint.timestamp)}</div>

            {graphType === 'candles' ? (
              <div className="market-graph__tooltip-ohlc">
                <div className="market-graph__tooltip-row">
                  <span className="market-graph__tooltip-label">O</span>
                  <span className="market-graph__tooltip-value">${hoveredPoint.open.toFixed(2)}</span>
                </div>
                <div className="market-graph__tooltip-row">
                  <span className="market-graph__tooltip-label">H</span>
                  <span className="market-graph__tooltip-value market-graph__tooltip-value--up">${hoveredPoint.high.toFixed(2)}</span>
                </div>
                <div className="market-graph__tooltip-row">
                  <span className="market-graph__tooltip-label">L</span>
                  <span className="market-graph__tooltip-value market-graph__tooltip-value--down">${hoveredPoint.low.toFixed(2)}</span>
                </div>
                <div className="market-graph__tooltip-row">
                  <span className="market-graph__tooltip-label">C</span>
                  <span className={`market-graph__tooltip-value ${hoveredPoint.close >= hoveredPoint.open ? 'market-graph__tooltip-value--up' : 'market-graph__tooltip-value--down'}`}>
                    ${hoveredPoint.close.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="market-graph__tooltip-row market-graph__tooltip-row--primary">
                <span className="market-graph__tooltip-label">Close</span>
                <span className="market-graph__tooltip-value">${hoveredPoint.close.toFixed(2)}</span>
              </div>
            )}

            {showMovingAverage && ma[hoverState.index] !== undefined ? (
              <div className="market-graph__tooltip-row">
                <span className="market-graph__tooltip-label">MA(10)</span>
                <span className="market-graph__tooltip-value">${ma[hoverState.index]!.toFixed(2)}</span>
              </div>
            ) : null}

            {compare && compareCloses[hoverState.index] !== undefined ? (
              <div className="market-graph__tooltip-row">
                <span className="market-graph__tooltip-label">{compare.symbol}</span>
                <span className="market-graph__tooltip-value">${compareCloses[hoverState.index]!.toFixed(2)}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
