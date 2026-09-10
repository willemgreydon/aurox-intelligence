import type { Locale } from '@repo/api-contracts';
import type { AppMessages } from '../../lib/i18n/messages';
import type { MiniIndicatorChartModel } from '../../lib/charts/mini-indicator-model';
import type { SignalScoreLabel, SignalVisualState } from '../../components/signals/signal-score-types';
import type { MarketAssetClassId, MarketCatalogEntry } from '../services/stock-simulation-service';
import { deriveAssetDecisionIntelligence } from '../services/decision-intelligence-service';
import { deriveMiniIndicatorChartModel } from '../lib/mini-indicator-model';
import {
  formatFreshnessLabel,
  formatPercentChange,
  formatUsdPrice,
  getQuoteTimestamp,
} from '../lib/quote-display';

/**
 * Pre-shaped, display-ready view model for one market roster card/row. Every
 * value here is final — the component renders it without further computation
 * (read-model-rule / aurox-ui-boundaries). Signal, risk, and mini-chart values
 * are derived once here via the canonical decision-intelligence path so the
 * roster stays consistent with the rest of the workstation.
 */
export type MarketRosterCardViewModel = {
  assetId: string;
  symbol: string;
  title: string;
  categoryLabel: string;
  thesis: string;
  assetClass: MarketAssetClassId;
  detailHref: string;
  strategyLaneId: 'manual_stock_lane' | 'manual_multi_asset_lane';
  priceLabel: string;
  changeLabel: string;
  freshnessLabel: string;
  actionAvailability: 'available' | 'simulated' | 'planned' | 'unavailable';
  insightStance: 'positive' | 'negative' | 'neutral';
  riskSummary: string;
  riskLabel: 'Low' | 'Medium' | 'High' | 'Extreme';
  sparkline: number[];
  miniChartModel: MiniIndicatorChartModel;
  isWatched: boolean;
  signal: {
    score: number;
    label: SignalScoreLabel;
    confidence: number;
    explanation: string;
    indicators: string[];
    visualState?: SignalVisualState;
  };
};

/** Detail route per asset class. Stocks use the dedicated stock detail; ETF and
 * crypto use their invest-scoped detail routes. */
function detailHrefFor(assetClass: MarketAssetClassId, symbol: string): string {
  const encoded = encodeURIComponent(symbol);
  switch (assetClass) {
    case 'stock':
      return `/stocks/${encoded}`;
    case 'etf':
      return `/invest/etfs/${encoded}`;
    case 'crypto':
      return `/invest/crypto/${encoded}`;
  }
}

/** Manual simulation lane per asset class (matches the invest surfaces). */
function laneFor(assetClass: MarketAssetClassId): 'manual_stock_lane' | 'manual_multi_asset_lane' {
  return assetClass === 'stock' ? 'manual_stock_lane' : 'manual_multi_asset_lane';
}

function insightStanceFor(changePercent: number | null | undefined): 'positive' | 'negative' | 'neutral' {
  if (typeof changePercent !== 'number' || changePercent === 0) return 'neutral';
  return changePercent > 0 ? 'positive' : 'negative';
}

/**
 * Pure sync mapper: catalog entries + server-loaded sparkline series → roster
 * card view models. No I/O — every dependency (quotes, sparklines) is passed in.
 */
export function mapCatalogEntriesToRoster(
  entries: MarketCatalogEntry[],
  sparklineBySymbol: Record<string, number[]>,
  ctx: { locale: Locale; messages: AppMessages },
): MarketRosterCardViewModel[] {
  const { locale, messages } = ctx;

  return entries.map((entry) => {
    const { asset, quote, position } = entry;
    const sparkline = sparklineBySymbol[asset.symbol] ?? [];
    const changePercent = quote?.changePercent ?? null;

    const decision = deriveAssetDecisionIntelligence({
      symbol: asset.symbol,
      assetClass: asset.assetClass,
      history: sparkline,
      latestPrice: quote?.price ?? null,
      dayMovePercent: changePercent,
      quantity: position?.quantity ?? 1,
      portfolioValue: 100000,
    });
    const miniChartModel = deriveMiniIndicatorChartModel(sparkline, decision.signal.score);

    const riskSummary = position
      ? `Held ${position.quantity.toFixed(4)} · Market value ${formatUsdPrice(position.marketValue, locale, messages.common.unavailable)}`
      : asset.riskSummary;

    return {
      assetId: asset.assetId,
      symbol: asset.symbol,
      title: asset.name,
      categoryLabel: asset.sector ?? asset.category,
      thesis: asset.thesis,
      assetClass: asset.assetClass,
      detailHref: detailHrefFor(asset.assetClass, asset.symbol),
      strategyLaneId: laneFor(asset.assetClass),
      priceLabel: formatUsdPrice(quote?.price ?? null, locale, messages.common.unavailable),
      changeLabel: formatPercentChange(changePercent, messages.common.partial),
      freshnessLabel: formatFreshnessLabel(getQuoteTimestamp(quote), locale, messages.common.unavailable),
      actionAvailability: asset.actionAvailability,
      insightStance: insightStanceFor(changePercent),
      riskSummary,
      riskLabel: decision.risk.label,
      sparkline,
      miniChartModel,
      isWatched: entry.isWatched,
      signal: {
        score: decision.signal.score,
        label: decision.signal.label,
        confidence: decision.signal.confidence,
        explanation: decision.signal.explanation,
        indicators: decision.signal.contributingIndicators,
        visualState: decision.signal.visualState,
      },
    };
  });
}
