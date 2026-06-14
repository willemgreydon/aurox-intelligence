'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatChartMonthRange } from '../../lib/chart-date-format';
import { decodeHtmlEntities } from '../../lib/text/decode-html-entities';
import { FreshnessIndicator } from '../market/freshness-indicator';
import {
  MARKET_GRAPH_TIMEFRAMES,
  formatAxisTimestamp,
  formatTooltipTimestamp,
  sliceBarsForTimeframe,
  downsampleBars,
  getAxisFormatForVisibleBars,
  computeAxisTicks,
  type MarketGraphTimeframeId,
} from '../../lib/market-graph-timeframes';
import { getQuoteRefreshIntervalMs, shouldPollQuotes } from '../../lib/market-refresh';
import type { MarketGraphDataMeta } from '../../server/services/market-graph-service';
import { TimeframeSelect } from './timeframe-select';

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
    observedAt?: string | null;
  } | null;
};

type MarketGraphWorkspaceProps = {
  assets: AssetSeries[];
  /** Optional metadata from the server about what was fetched */
  meta?: MarketGraphDataMeta;
  trackedSymbols?: string[];
  newsItems?: Array<{
    id: string;
    title: string;
    url: string | null;
    source: string | null;
    summary: string | null;
    publishedAt: string;
    symbol: string | null;
    tickers?: string[];
  }>;
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
    intradayUnavailable: string;
    dailyFallback: string;
    candlesUnavailable: string;
    insufficientHistory: string;
  };
};

type BrokerLaneStatus = 'active' | 'idle' | 'degraded' | 'simulation';
type SidebarModuleKey = 'lanes' | 'watchlist' | 'news' | 'safety' | 'cta';

type HoverState = {
  index: number;
  panelX: number;
  panelY: number;
  // Canvas size captured at hover time (in the event handler, where reading the
  // ref is safe) so tooltip clamping never reads canvasRef during render.
  canvasWidth: number;
  canvasHeight: number;
};

// --- Pure geometry helpers ---

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function buildLine(values: number[], width: number, height: number, padPct = 0.05): string {
  if (values.length < 2 || values.some((value) => !Number.isFinite(value))) {
    return '';
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rawRange = max - min;
  const pad = rawRange * padPct;
  const paddedMin = min - pad;
  const paddedMax = max + pad;
  const range = Math.max(1, paddedMax - paddedMin);
  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - paddedMin) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function buildArea(values: number[], width: number, height: number, padPct = 0.05): string {
  if (values.length < 2 || values.some((value) => !Number.isFinite(value))) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rawRange = max - min;
  const pad = rawRange * padPct;
  const paddedMin = min - pad;
  const paddedMax = max + pad;
  const range = Math.max(1, paddedMax - paddedMin);
  const pts = values.map((value, i) => {
    const x = (i / Math.max(1, values.length - 1)) * width;
    const y = height - ((value - paddedMin) / range) * height;
    return `${x},${y}`;
  });
  return `M 0,${height} L ${pts.join(' L ')} L ${width},${height} Z`;
}

function movingAverage(points: HistoryPoint[], period: number): number[] {
  return points.map((_, index) => {
    const slice = points.slice(Math.max(0, index - period + 1), index + 1);
    return average(slice.map((point) => point.close));
  });
}

/**
 * Compute padded y bounds for a value array.
 * Returns { paddedMin, paddedMax, range }.
 */
function paddedBounds(values: number[], padPct = 0.05) {
  if (values.length === 0) return { paddedMin: 0, paddedMax: 1, range: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rawRange = max - min;
  const pad = rawRange * padPct;
  const paddedMin = min - pad;
  const paddedMax = max + pad;
  return { paddedMin, paddedMax, range: Math.max(1, paddedMax - paddedMin) };
}

/**
 * Normalize two price series to 100 at the first value of the primary series.
 * Used for compare mode.
 */
function normalizeTo100(closes: number[]): number[] {
  if (closes.length === 0) return [];
  const base = closes[0];
  if (!base || base === 0) return closes;
  return closes.map((c) => (c / base) * 100);
}

/**
 * Check if OHLC data has meaningful spread (not all bars flat).
 */
function hasOhlcSpread(points: HistoryPoint[]): boolean {
  if (points.length < 2) return false;
  return points.some((p) => Math.abs(p.high - p.low) > 0.001 || Math.abs(p.open - p.close) > 0.001);
}

export function MarketGraphWorkspace({
  assets,
  meta,
  labels,
  variant = 'default',
  trackedSymbols = [],
  newsItems = [],
}: MarketGraphWorkspaceProps) {
  const rawId = useId();
  const chartId = rawId.replace(/[^a-z0-9]/gi, '');
  const areaGradientId = `mgw-area-${chartId}`;

  const normalizedAssets = useMemo(() => {
    const dedupedSymbols = new Map<string, AssetSeries>();
    for (const asset of assets) {
      if (!dedupedSymbols.has(asset.symbol)) {
        dedupedSymbols.set(asset.symbol, asset);
      }
    }
    return [...dedupedSymbols.values()].map((asset) => {
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
    });
  }, [assets]);

  const prioritizedTrackedSymbols = useMemo(
    () => [...new Set(trackedSymbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))],
    [trackedSymbols],
  );

  const watchlistAssets = useMemo(() => {
    const bySymbol = new Map(normalizedAssets.map((asset) => [asset.symbol.toUpperCase(), asset] as const));
    const prioritized = prioritizedTrackedSymbols
      .map((symbol) => bySymbol.get(symbol))
      .filter((asset): asset is AssetSeries => Boolean(asset));
    const remaining = normalizedAssets.filter((asset) => !prioritizedTrackedSymbols.includes(asset.symbol.toUpperCase()));
    return [...prioritized, ...remaining].slice(0, 10);
  }, [normalizedAssets, prioritizedTrackedSymbols]);

  const observerNews = useMemo(() => {
    const prioritySymbols = new Set(prioritizedTrackedSymbols);
    const normalized = [...newsItems]
      .filter((item) => item.title && item.publishedAt)
      .map((item) => {
        const symbol = (item.symbol || item.tickers?.[0] || '').toUpperCase();
        return {
          ...item,
          symbol,
          title: decodeHtmlEntities(item.title).replace(/\s+/g, ' ').trim(),
          summary: decodeHtmlEntities(item.summary ?? '').replace(/\s+/g, ' ').trim(),
          isPriority: symbol ? prioritySymbols.has(symbol) : false,
        };
      })
      .sort((a, b) => {
        if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
    const deduped = new Map<string, (typeof normalized)[number]>();
    for (const item of normalized) {
      const key = `${item.title.toLowerCase()}|${(item.url ?? '').toLowerCase()}`;
      if (!deduped.has(key)) deduped.set(key, item);
    }
    return [...deduped.values()].slice(0, 5);
  }, [newsItems, prioritizedTrackedSymbols]);

  const [symbol, setSymbol] = useState(assets[0]?.symbol ?? '');
  const [compareSymbol, setCompareSymbol] = useState('');
  const [timeframe, setTimeframe] = useState<MarketGraphTimeframeId>('1D');
  const [graphType, setGraphType] = useState<'line' | 'candles'>('line');
  const [showMovingAverage, setShowMovingAverage] = useState(true);
  const [showSignals, setShowSignals] = useState(true);
  const [viewportSize, setViewportSize] = useState<number | null>(null);
  const [viewportOffset, setViewportOffset] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modulesOpen, setModulesOpen] = useState<Record<SidebarModuleKey, boolean>>({
    lanes: true,
    watchlist: true,
    news: true,
    safety: true,
    cta: true,
  });

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [historyFetchPending, setHistoryFetchPending] = useState(false);
  const [historyFetchError, setHistoryFetchError] = useState<string | null>(null);
  const [historyTopUps, setHistoryTopUps] = useState<Record<string, HistoryPoint[]>>({});
  const [quoteOverrides, setQuoteOverrides] = useState<Record<string, { price: number; changePercent?: number; observedAt?: string | null }>>({});

  const mergedAssets = useMemo(() => {
    return normalizedAssets.map((asset) => {
      const topUp = historyTopUps[asset.symbol];
      if (!topUp || topUp.length === 0) return asset;
      const byTimestamp = new Map<string, HistoryPoint>();
      for (const point of [...asset.history, ...topUp]) {
        byTimestamp.set(point.timestamp, point);
      }
      return {
        ...asset,
        snapshot: quoteOverrides[asset.symbol] ?? asset.snapshot,
        history: [...byTimestamp.values()].sort(
          (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
        ),
      };
    });
  }, [historyTopUps, normalizedAssets, quoteOverrides]);

  const selected = mergedAssets.find((asset) => asset.symbol === symbol) ?? mergedAssets[0] ?? null;
  const compare = mergedAssets.find((asset) => asset.symbol === compareSymbol) ?? null;

  const timeframeConfig = MARKET_GRAPH_TIMEFRAMES[timeframe];

  useEffect(() => {
    if (mergedAssets.length === 0) {
      if (symbol !== '') setSymbol('');
      return;
    }
    if (!mergedAssets.some((asset) => asset.symbol === symbol)) {
      setSymbol(mergedAssets[0]!.symbol);
    }
  }, [mergedAssets, symbol]);

  // Slice bars client-side for the selected timeframe.
  // Anchor to the latest available bar timestamp so stale cached data slices correctly.
  // Apply downsampling for 1Y/2Y to keep SVG path complexity manageable.
  const visible = useMemo(() => {
    if (!selected || selected.history.length === 0) return [];
    const lastBar = selected.history[selected.history.length - 1]!;
    const referenceDate = new Date(lastBar.timestamp);
    const { bars } = sliceBarsForTimeframe(selected.history, timeframe, referenceDate);
    const config = MARKET_GRAPH_TIMEFRAMES[timeframe];
    return config.aggregationPolicy === 'downsample'
      ? downsampleBars(bars, config.targetPointCount)
      : bars;
  }, [selected, timeframe]);

  const compareVisible = useMemo(() => {
    if (!compare || compare.history.length === 0) return [];
    const lastBar = compare.history[compare.history.length - 1]!;
    const referenceDate = new Date(lastBar.timestamp);
    const { bars } = sliceBarsForTimeframe(compare.history, timeframe, referenceDate);
    const config = MARKET_GRAPH_TIMEFRAMES[timeframe];
    return config.aggregationPolicy === 'downsample'
      ? downsampleBars(bars, config.targetPointCount)
      : bars;
  }, [compare, timeframe]);

  // Detect if intraday was expected but we only have daily bars.
  // Do this client-side by inspecting actual bar spacing in `visible`,
  // NOT from server meta (which reflects the server's requested timeframe, not the current one).
  const isIntradayTimeframe = timeframe === '1m' || timeframe === '1h';
  const visibleIsDailyFallback = useMemo(() => {
    if (!isIntradayTimeframe) return false;
    if (visible.length === 0) return true;
    if (visible.length < 2) return true;
    const first = new Date(visible[0]!.timestamp).getTime();
    const second = new Date(visible[1]!.timestamp).getTime();
    const deltaMs = second - first;
    return Number.isFinite(deltaMs) && deltaMs >= 6 * 60 * 60 * 1000;
  }, [isIntradayTimeframe, visible]);
  const usingDegradedInterval = isIntradayTimeframe && visibleIsDailyFallback;

  // Effective x-axis format: adapts to actual bar spacing to avoid "00:00" labels
  // when daily bars are shown for an intraday timeframe.
  const effectiveXAxisFormat = useMemo(
    () => getAxisFormatForVisibleBars(timeframe, visible),
    [timeframe, visible],
  );

  // Client-side visible metadata (reflects current timeframe slice, not server meta).
  const visibleMeta = useMemo(() => {
    if (visible.length === 0) {
      return { pointCount: 0, actualStart: null, actualEnd: null, coverageRatio: 0 };
    }
    const config = MARKET_GRAPH_TIMEFRAMES[timeframe];
    const firstBar = visible[0]!;
    const lastBar = visible[visible.length - 1]!;
    const actualStartMs = new Date(firstBar.timestamp).getTime();
    const actualEndMs = new Date(lastBar.timestamp).getTime();
    const requestedStartMs = actualEndMs - config.coverageDays * 24 * 60 * 60 * 1000;
    const requestedWindowMs = actualEndMs - requestedStartMs;
    const actualWindowMs = actualEndMs - actualStartMs;
    const coverageRatio =
      requestedWindowMs > 0 ? Math.min(1, actualWindowMs / requestedWindowMs) : 0;
    return {
      pointCount: visible.length,
      actualStart: firstBar.timestamp,
      actualEnd: lastBar.timestamp,
      coverageRatio,
    };
  }, [visible, timeframe]);

  useEffect(() => {
    let cancelled = false;
    const selectedSymbol = selected?.symbol;
    if (!selectedSymbol) return;
    const requiresTopUp =
      (timeframe === '1Y' || timeframe === '2Y') && visibleMeta.coverageRatio < 0.75;
    if (!requiresTopUp) return;

    setHistoryFetchPending(true);
    setHistoryFetchError(null);
    fetch(`/api/market/history?symbol=${encodeURIComponent(selectedSymbol)}&timeframe=${timeframe}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (cancelled || !payload) return;
        if (payload.degradedReason) {
          setHistoryFetchError(String(payload.degradedReason));
        }
        if (!payload.bars || !Array.isArray(payload.bars)) return;
        setHistoryTopUps((current) => ({
          ...current,
          [selectedSymbol]: payload.bars,
        }));
      })
      .finally(() => {
        if (!cancelled) setHistoryFetchPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.symbol, timeframe, visibleMeta.coverageRatio]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const selectedSymbol = selected?.symbol;
    const selectedAssetClass = selected?.assetClass;
    if (!selectedSymbol || !selectedAssetClass) return;

    const tick = async () => {
      try {
        if (!shouldPollQuotes(typeof document !== 'undefined' ? document.hidden : false)) {
          return;
        }
        const response = await fetch(
          `/api/market/quote?symbol=${encodeURIComponent(selectedSymbol)}&assetClass=${encodeURIComponent(selectedAssetClass)}`,
        );
        if (!response.ok) return;
        const payload = await response.json();
        const quote = payload?.quote;
        if (!cancelled && quote && typeof quote.price === 'number') {
          setQuoteOverrides((current) => ({
            ...current,
            [selectedSymbol]: {
              price: quote.price,
              ...(typeof quote.changePercent === 'number' ? { changePercent: quote.changePercent } : {}),
              observedAt:
                typeof quote.observedAt === 'string'
                  ? quote.observedAt
                  : typeof quote.fetchedAt === 'string'
                    ? quote.fetchedAt
                    : null,
            },
          }));
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(tick, getQuoteRefreshIntervalMs(typeof document !== 'undefined' ? !document.hidden : true));
        }
      }
    };

    timer = setTimeout(tick, 1500);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [selected?.assetClass, selected?.symbol]);

  // Detect if candles mode is meaningful (bars have real OHLC spread).
  const candlesAvailable = hasOhlcSpread(visible);

  const laneStatuses: Array<{ label: string; status: BrokerLaneStatus }> = [
    { label: 'Manual stock lane', status: selected ? 'active' : 'idle' },
    { label: 'ETF comparison lane', status: compare ? 'active' : 'idle' },
    { label: 'Crypto tracking lane', status: watchlistAssets.some((asset) => asset.assetClass === 'crypto') ? 'active' : 'idle' },
    { label: 'Simulation broker lane', status: 'simulation' },
  ];

  useEffect(() => {
    const stored = window.localStorage.getItem('market-sidebar-collapsed');
    setSidebarCollapsed(stored === '1');
  }, []);

  useEffect(() => {
    window.localStorage.setItem('market-sidebar-collapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  function toggleModule(module: SidebarModuleKey) {
    setModulesOpen((current) => ({ ...current, [module]: !current[module] }));
  }

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

  // Compare normalization: both series normalized to 100 at the first close of the primary.
  const compareCloses = hasRenderableSeries && viewportCompare.length > 0
    ? viewportCompare.map((point) => point.close)
    : [];

  const useCompareMode = compareCloses.length > 1;

  // Normalize primary and compare to 100 if compare mode is active.
  const primaryClosesForLine = useCompareMode ? normalizeTo100(closes) : closes;
  const compareClosesNorm = useCompareMode ? normalizeTo100(compareCloses) : compareCloses;

  const { paddedMin: closeMin, paddedMax: closeMax, range: closeRange } = paddedBounds(primaryClosesForLine);

  const allHighLow = hasRenderableSeries
    ? [...viewportVisible.map((p) => p.high), ...viewportVisible.map((p) => p.low)]
    : [];
  const { paddedMin: minPrice, paddedMax: maxPrice, range: priceRange } = paddedBounds(allHighLow);

  const closeLine = hasRenderableSeries ? buildLine(primaryClosesForLine, 980, 420) : '';
  const closeArea = hasRenderableSeries && graphType === 'line' ? buildArea(primaryClosesForLine, 980, 420) : '';
  const maLine = hasRenderableSeries ? buildLine(ma, 980, 420) : '';
  const compareLine = useCompareMode && compareClosesNorm.length > 1 ? buildLine(compareClosesNorm, 980, 420) : null;

  const candleBodyHalf = Math.max(1.5, Math.min(6, Math.floor((940 / Math.max(1, viewportVisible.length)) * 0.38)));

  const lastClose = primaryClosesForLine.at(-1);
  const lastPriceY =
    lastClose !== undefined && hasRenderableSeries
      ? graphType === 'line'
        ? 420 - ((lastClose - closeMin) / closeRange) * 420
        : 400 - ((viewportVisible.at(-1)!.close - minPrice) / priceRange) * 360
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

  // Hover Y based on normalized or raw closes
  const hoveredPrimaryClose =
    hoverState && primaryClosesForLine[hoverState.index] !== undefined
      ? primaryClosesForLine[hoverState.index]!
      : null;
  const hoveredY =
    hoveredPrimaryClose !== null && hoveredX !== null
      ? graphType === 'line'
        ? 420 - ((hoveredPrimaryClose - closeMin) / closeRange) * 420
        : hoveredPoint
          ? 400 - ((hoveredPoint.close - minPrice) / priceRange) * 360
          : null
      : null;

  const yLabelW = 72;
  const yLabelH = 18;
  const xLabelW = 84;
  const xLabelH = 17;

  const tooltipWidth = 188;
  const tooltipHeight = graphType === 'candles' ? 140 : 108;
  // Tooltip clamping uses the canvas size captured in the hover handler (where
  // reading the ref is allowed), so nothing reads canvasRef during render.
  const tooltipLeft = hoverState
    ? Math.max(8, Math.min(hoverState.panelX + 14, hoverState.canvasWidth - tooltipWidth - 8))
    : 8;
  const tooltipTop = hoverState
    ? Math.max(8, Math.min(hoverState.panelY - tooltipHeight - 12, hoverState.canvasHeight - tooltipHeight - 8))
    : 8;

  // Y-axis ticks: based on padded price bounds.
  const yAxisTicks = hasRenderableSeries
    ? Array.from({ length: 5 }, (_, index) => {
        const ratio = index / 4;
        const value = useCompareMode
          ? closeMax - ratio * closeRange
          : maxPrice - ratio * priceRange;
        const y = 20 + ratio * 360;
        const label = useCompareMode ? `${value.toFixed(1)}` : `$${value.toFixed(2)}`;
        return { y, label };
      })
    : [];

  // X-axis ticks: evenly spaced with deduplication; uses effective format to
  // avoid "00:00" labels when daily bars are displayed for an intraday timeframe.
  const xAxisTicks = hasRenderableSeries
    ? computeAxisTicks(viewportVisible, effectiveXAxisFormat, 6).map((tick) => ({
        x: (tick.index / Math.max(1, viewportVisible.length - 1)) * 980,
        label: tick.label,
        timestamp: tick.timestamp,
      }))
    : [];

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
    setHoverState({
      index: nextIndex,
      panelX,
      panelY,
      canvasWidth: canvasRect?.width ?? 980,
      canvasHeight: canvasRect?.height ?? 420,
    });
  }

  function handleChartPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType !== 'touch') return;
    const svgRect = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - svgRect.left) / Math.max(1, svgRect.width)) * 980;
    const clamped = Math.max(0, Math.min(980, relativeX));
    const nextIndex = Math.max(0, Math.min(viewportVisible.length - 1, Math.round((clamped / 980) * (viewportVisible.length - 1))));
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const panelX = canvasRect ? event.clientX - canvasRect.left : 0;
    const panelY = canvasRect ? event.clientY - canvasRect.top : 0;
    setHoverState({
      index: nextIndex,
      panelX,
      panelY,
      canvasWidth: canvasRect?.width ?? 980,
      canvasHeight: canvasRect?.height ?? 420,
    });
  }

  function handleChartMouseLeave() {
    setHoverState(null);
  }

  // Build the degraded message shown below the toolbar.
  function buildDegradedMessage(): string | null {
    if (usingDegradedInterval) {
      return meta?.fallbackReason ?? labels.intradayUnavailable;
    }
    if (meta?.isDegraded && meta.degradedReason) {
      return meta.degradedReason;
    }
    if (meta?.isDegraded) {
      return labels.insufficientHistory;
    }
    return null;
  }

  const degradedMessage = buildDegradedMessage();
  const coverageLoadingMessage = historyFetchPending ? 'Loading additional provider history...' : null;
  const topUpErrorMessage = historyFetchError ? `Top-up unavailable: ${historyFetchError}` : null;

  // Candle mode note: show a note if candles are requested but data has no spread.
  const showCandlesUnavailableNote = graphType === 'candles' && hasRenderableSeries && !candlesAvailable;

  // Last updated string for meta display.
  const lastUpdatedDisplay =
    meta?.lastBarTimestamp
      ? new Date(meta.lastBarTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

  return (
    <div className={`market-graph${variant === 'spotlight' ? ' market-graph--spotlight' : ''}`}>
      <div className={`market-workstation${sidebarCollapsed ? ' market-workstation--sidebar-collapsed' : ''}`}>
      <div ref={canvasRef} className="market-graph__canvas">
        <div className="market-graph__overlay">
          <section className="market-graph__control-panel" aria-label="Chart controls">
            <div className="market-graph__toolbar market-graph__toolbar--primary">
              <div className="market-graph__toolbar-zone market-graph__toolbar-zone--left">
                <label className="market-graph__selector">
                  <span className="market-graph__selector-label">{labels.selectAsset}</span>
                  <select className="market-graph__selector-input" value={symbol} onChange={(event) => setSymbol(event.target.value)}>
                    {mergedAssets.map((asset) => (
                      <option key={asset.symbol} value={asset.symbol}>
                        {asset.symbol} - {asset.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="market-graph__selector market-graph__selector--compare">
                  <span className="market-graph__selector-label">{labels.compare}</span>
                  <select className="market-graph__selector-input" value={compareSymbol} onChange={(event) => setCompareSymbol(event.target.value)}>
                    <option value="">{labels.noCompare}</option>
                    {mergedAssets
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
                  <TimeframeSelect
                    value={timeframe}
                    onChange={setTimeframe}
                    label={labels.timeframe}
                    activePointCount={visibleMeta.pointCount}
                    isDisabled={(tfId) =>
                      (tfId === '1m' || tfId === '1h') && meta !== undefined && meta.actualResolution === 'daily'
                    }
                  />
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
                <div className="market-graph__meta-row">
                  <span className="market-graph__meta-item">
                    {visibleMeta.pointCount} pts
                  </span>
                  <span className="market-graph__meta-item">
                    {timeframe}
                  </span>
                  {meta ? (
                    <>
                      <span className="market-graph__meta-item">
                        req {meta.requestedResolution}
                      </span>
                      <span className="market-graph__meta-item">
                        act {meta.actualResolution}
                      </span>
                      <span className="market-graph__meta-item">
                        {meta.provider} {meta.isFresh ? 'LIVE' : 'STALE'}
                      </span>
                      <span className="market-graph__meta-item">
                        mode {meta.providerQuoteMode ?? 'unknown'}
                      </span>
                      <span className="market-graph__meta-item">
                        cov {(meta.coverageRatio * 100).toFixed(0)}%
                      </span>
                      <span className="market-graph__meta-item">
                        backfill {meta.backfillAttempted ? (meta.backfillSucceeded ? 'ok' : 'fail') : 'n/a'}
                      </span>
                    </>
                  ) : null}
                  {lastUpdatedDisplay ? (
                    <span className="market-graph__meta-item">
                      Updated {lastUpdatedDisplay}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          {/* Degraded / fallback notices */}
          {degradedMessage ? (
            <div className="market-graph__degraded-note" role="status" aria-live="polite">
              {degradedMessage}
            </div>
          ) : null}
          {coverageLoadingMessage ? (
            <div className="market-graph__degraded-note" role="status" aria-live="polite">
              {coverageLoadingMessage}
            </div>
          ) : null}
          {topUpErrorMessage ? (
            <div className="market-graph__degraded-note" role="status" aria-live="polite">
              {topUpErrorMessage}
            </div>
          ) : null}

          {showCandlesUnavailableNote ? (
            <div className="market-graph__degraded-note market-graph__degraded-note--candles" role="status" aria-live="polite">
              {labels.candlesUnavailable}
            </div>
          ) : null}

          {useCompareMode ? (
            <div className="market-graph__compare-note" role="status" aria-live="polite">
              Indexed to 100 at first shared bar
            </div>
          ) : null}

          <div className="market-graph__instrument" role="status" aria-live="polite">
            <div className="market-graph__instrument-identity">
              <strong className="market-graph__instrument-symbol">{selected.symbol}</strong>
              {selected.name ? <span className="market-graph__instrument-name">{selected.name}</span> : null}
              <span className="market-graph__instrument-class">{selected.assetClass.toUpperCase()}</span>
            </div>
            <div className="market-graph__instrument-price-row">
              <span className="market-graph__instrument-price">{priceLabel}</span>
              <span className={`market-graph__instrument-change ${changeToneClass}`}>{changeLabel}</span>
              <FreshnessIndicator
                assetClass={selected.assetClass}
                observedAt={selected.snapshot?.observedAt ?? null}
                price={selected.snapshot?.price ?? null}
              />
            </div>
            <div className="market-graph__instrument-range">{rangeLabel}</div>
          </div>
        </div>

        <svg
          viewBox="0 0 980 420"
          className="market-graph__svg"
          role="img"
          aria-label={labels.chartAriaTemplate.replace('{{symbol}}', selected.symbol)}
          onMouseMove={handleChartMouseMove}
          onPointerMove={handleChartPointerMove}
          onMouseLeave={handleChartMouseLeave}
        >
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-series-a)" stopOpacity="0.18" />
              <stop offset="85%" stopColor="var(--chart-series-a)" stopOpacity="0.03" />
              <stop offset="100%" stopColor="var(--chart-series-a)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g>
            {[0, 1, 2, 3, 4].map((step) => (
              <line key={step} x1="0" y1={step * 105} x2="980" y2={step * 105} className="market-graph__grid" />
            ))}
          </g>

          {yAxisTicks.map((tick) => (
            <text key={tick.y} x="972" y={tick.y} textAnchor="end" className="market-graph__axis-tick">
              {tick.label}
            </text>
          ))}
          {xAxisTicks.map((tick) => (
            <text key={`${tick.timestamp}-${tick.label}`} x={tick.x} y="414" textAnchor="middle" className="market-graph__axis-tick">
              {tick.label}
            </text>
          ))}

          {hasRenderableSeries && graphType === 'line' && closeArea ? (
            <path d={closeArea} fill={`url(#${areaGradientId})`} className="market-graph__area" />
          ) : null}

          {hasRenderableSeries && lastPriceY !== null ? (
            <line
              x1="0"
              y1={lastPriceY}
              x2="980"
              y2={lastPriceY}
              className="market-graph__last-price-line"
            />
          ) : null}

          {hasRenderableSeries ? (
            graphType === 'candles' && !useCompareMode
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

          {hasRenderableSeries && showMovingAverage && !useCompareMode ? (
            <path d={maLine} className="market-graph__average" />
          ) : null}

          {hasRenderableSeries && compareLine ? (
            <path d={compareLine} className="market-graph__compare" />
          ) : null}

          {hasRenderableSeries && showSignals && selected.signal ? (
            <circle
              cx="950"
              cy={400 - ((primaryClosesForLine.at(-1)! - closeMin) / closeRange) * (graphType === 'line' ? 420 : 360)}
              r="6"
              className={`market-graph__signal market-graph__signal--${selected.signal.interpretation}`}
            />
          ) : null}

          {hoveredPoint && hoveredX !== null && hoveredY !== null ? (
            <g className="market-graph__crosshair">
              <line x1={hoveredX} y1="0" x2={hoveredX} y2="420" />
              <line x1="0" y1={hoveredY} x2="980" y2={hoveredY} />
              <circle cx={hoveredX} cy={hoveredY} r="4" className="market-graph__crosshair-point" />

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
                  {useCompareMode
                    ? `${hoveredPrimaryClose?.toFixed(1)}`
                    : `$${hoveredPoint.close.toFixed(2)}`}
                </text>
              </g>

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
                  {formatAxisTimestamp(hoveredPoint.timestamp, effectiveXAxisFormat)}
                </text>
              </g>
            </g>
          ) : null}
        </svg>

        {hoveredPoint && hoverState ? (
          <div
            className="market-graph__tooltip"
            style={{ left: `${tooltipLeft}px`, top: `${tooltipTop}px` }}
            aria-hidden="true"
          >
            <div className="market-graph__tooltip-date">
              {formatTooltipTimestamp(hoveredPoint.timestamp, timeframeConfig.tooltipDateFormat)}
            </div>

            {graphType === 'candles' && !useCompareMode ? (
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
                <span className="market-graph__tooltip-label">{useCompareMode ? 'Idx' : 'Close'}</span>
                <span className="market-graph__tooltip-value">
                  {useCompareMode
                    ? `${hoveredPrimaryClose?.toFixed(2)}`
                    : `$${hoveredPoint.close.toFixed(2)}`}
                </span>
              </div>
            )}

            {showMovingAverage && ma[hoverState.index] !== undefined && !useCompareMode ? (
              <div className="market-graph__tooltip-row">
                <span className="market-graph__tooltip-label">MA(10)</span>
                <span className="market-graph__tooltip-value">${ma[hoverState.index]!.toFixed(2)}</span>
              </div>
            ) : null}

            {compare && useCompareMode && compareClosesNorm[hoverState.index] !== undefined ? (
              <>
                <div className="market-graph__tooltip-row">
                  <span className="market-graph__tooltip-label">{selected.symbol}</span>
                  <span className="market-graph__tooltip-value">{hoveredPrimaryClose?.toFixed(2)}</span>
                </div>
                <div className="market-graph__tooltip-row">
                  <span className="market-graph__tooltip-label">{compare.symbol}</span>
                  <span className="market-graph__tooltip-value">{compareClosesNorm[hoverState.index]!.toFixed(2)}</span>
                </div>
                <div className="market-graph__tooltip-row">
                  <span className="market-graph__tooltip-label">Rel</span>
                  <span className={`market-graph__tooltip-value ${(compareClosesNorm[hoverState.index]! - (hoveredPrimaryClose ?? 100)) >= 0 ? 'market-graph__tooltip-value--up' : 'market-graph__tooltip-value--down'}`}>
                    {((compareClosesNorm[hoverState.index]! - (hoveredPrimaryClose ?? 100))).toFixed(2)}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <aside id="market-workstation-sidebar" className="broker-observer" aria-label="Broker observation workspace">
        <button
          type="button"
          className="broker-observer__mobile-toggle"
          aria-expanded={sidebarOpen}
          aria-controls="broker-observer-content"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          <span>Market sidebar</span>
          <span className="broker-observer__mobile-toggle-icon" aria-hidden="true">
            {sidebarOpen ? '▲' : '▼'}
          </span>
        </button>
        <button
          type="button"
          className="broker-observer__desktop-toggle"
          aria-expanded={!sidebarCollapsed}
          aria-controls="market-workstation-sidebar-content"
          onClick={() => setSidebarCollapsed((value) => !value)}
          title={sidebarCollapsed ? 'Open cockpit' : 'Close cockpit'}
        >
          <span className="broker-observer__desktop-toggle-icon" aria-hidden="true">
            {sidebarCollapsed ? '›' : '‹'}
          </span>
          <span className="broker-observer__desktop-toggle-label">
            {sidebarCollapsed ? 'Open cockpit' : 'Close cockpit'}
          </span>
        </button>

        <div
          id="market-workstation-sidebar-content"
          className={`broker-observer__collapsible${!sidebarCollapsed || sidebarOpen ? ' broker-observer__collapsible--open' : ''}`}
        >
          <div className="broker-observer__scroll">
          <section className="broker-observer__panel">
            <div className="broker-observer__eyebrow">Broker Observation Workspace</div>
            <h3>Simulation cockpit</h3>
            <p>Monitoring lanes, watchlist, market moves, and news context. Execution remains simulation-only.</p>
          </section>

          <section className="broker-observer__panel">
            <button type="button" className="broker-observer__panel-toggle" onClick={() => toggleModule('lanes')} aria-expanded={modulesOpen.lanes}>
              <h4>Broker lanes monitor</h4>
              <span aria-hidden="true">{modulesOpen.lanes ? '−' : '+'}</span>
            </button>
            {modulesOpen.lanes ? (
            <ul className="broker-observer__list">
              {laneStatuses.map((lane) => (
                <li key={lane.label} className="broker-observer__row">
                  <span>{lane.label}</span>
                  <span className={`status-pill status-pill--${lane.status === 'active' ? 'success' : lane.status === 'degraded' ? 'warning' : lane.status === 'simulation' ? 'info' : 'neutral'}`}>
                    {lane.status}
                  </span>
                </li>
              ))}
            </ul>
            ) : null}
          </section>

          <section className="broker-observer__panel broker-observer__panel--watchlist">
            <button type="button" className="broker-observer__panel-toggle" onClick={() => toggleModule('watchlist')} aria-expanded={modulesOpen.watchlist}>
              <h4>Watchlist mini-board</h4>
              <span aria-hidden="true">{modulesOpen.watchlist ? '−' : '+'}</span>
            </button>
            {modulesOpen.watchlist ? (
            <ul className="broker-observer__list">
              {watchlistAssets.length > 0 ? watchlistAssets.map((asset) => (
                <li key={asset.symbol} className="broker-observer__row">
                  <div>
                    <strong>{asset.symbol}</strong>
                    <span className="broker-observer__meta">{asset.assetClass.toUpperCase()}</span>
                  </div>
                  <div className="broker-observer__quote">
                    <strong>{typeof asset.snapshot?.price === 'number' ? `$${asset.snapshot.price.toFixed(2)}` : labels.unavailable}</strong>
                    <span className={typeof asset.snapshot?.changePercent === 'number' ? asset.snapshot.changePercent >= 0 ? 'market-graph__instrument-change--up' : 'market-graph__instrument-change--down' : 'market-graph__instrument-change--flat'}>
                      {typeof asset.snapshot?.changePercent === 'number' ? `${asset.snapshot.changePercent >= 0 ? '+' : ''}${asset.snapshot.changePercent.toFixed(2)}%` : labels.unavailable}
                    </span>
                    <FreshnessIndicator
                      assetClass={asset.assetClass}
                      observedAt={asset.snapshot?.observedAt ?? null}
                      price={asset.snapshot?.price ?? null}
                      className="freshness-chip--compact"
                    />
                  </div>
                </li>
              )) : <li className="broker-observer__empty">No watchlist data available.</li>}
            </ul>
            ) : null}
          </section>

          <section className="broker-observer__panel broker-observer__panel--news">
            <button type="button" className="broker-observer__panel-toggle" onClick={() => toggleModule('news')} aria-expanded={modulesOpen.news}>
              <h4>News observer</h4>
              <span aria-hidden="true">{modulesOpen.news ? '−' : '+'}</span>
            </button>
            {modulesOpen.news ? (
            <ul className="broker-observer__news-list">
              {observerNews.length > 0 ? observerNews.map((item) => (
                <li key={item.id}>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer noopener" className="broker-observer__news-link">
                      <strong>{item.title}</strong>
                    </a>
                  ) : <strong>{item.title}</strong>}
                  <p>{item.summary || 'Market headline update.'}</p>
                  <span className="broker-observer__meta">{item.source || 'Source'} · {new Date(item.publishedAt).toLocaleString('en-US')}</span>
                </li>
              )) : <li className="broker-observer__empty">No relevant headlines available.</li>}
            </ul>
            ) : null}
          </section>

          <section className="broker-observer__panel broker-observer__panel--safety">
            <button type="button" className="broker-observer__panel-toggle" onClick={() => toggleModule('safety')} aria-expanded={modulesOpen.safety}>
              <h4>Broker safety panel</h4>
              <span aria-hidden="true">{modulesOpen.safety ? '−' : '+'}</span>
            </button>
            {modulesOpen.safety ? (
            <>
            <p>Simulation only. No live execution and no real brokerage routing.</p>
            <Link href="/invest/simulation" className="button button--secondary">Open simulation</Link>
            </>
            ) : null}
          </section>

          <section className="broker-observer__panel broker-observer__panel--cta">
            <button type="button" className="broker-observer__panel-toggle" onClick={() => toggleModule('cta')} aria-expanded={modulesOpen.cta}>
              <h4>Quick navigation</h4>
              <span aria-hidden="true">{modulesOpen.cta ? '−' : '+'}</span>
            </button>
            {modulesOpen.cta ? (
            <div className="broker-observer__cta-grid">
              <Link href="/observe" className="button button--secondary">Open full observer</Link>
              <Link href="/invest/simulation" className="button button--secondary">Open simulation</Link>
              <Link href="/signals" className="button button--secondary">Open signals</Link>
            </div>
            ) : null}
          </section>
          </div>
        </div>
      </aside>
      </div>
    </div>
  );
}
