import type { SimulationAssetClass, SimulationLaneId } from '@repo/api-contracts';

export type PreparedSimulationTicket = {
  intent: 'prepare';
  side: 'buy' | 'sell';
  symbol: string;
  assetClass: SimulationAssetClass;
  lane: SimulationLaneId;
  source: string;
};

function normalizeLane(value: string | null | undefined): SimulationLaneId | null {
  if (
    value === 'manual_stock_lane' ||
    value === 'manual_multi_asset_lane' ||
    value === 'ai_copilot_lane' ||
    value === 'signal_follow_lane' ||
    value === 'agent_sandbox_lane'
  ) {
    return value;
  }
  return null;
}

function normalizeAssetClass(value: string | null | undefined): SimulationAssetClass | null {
  if (value === 'stock' || value === 'etf' || value === 'crypto') {
    return value;
  }
  return null;
}

export function parsePreparedSimulationTicket(input: Record<string, string | undefined>): PreparedSimulationTicket | null {
  const intent = input.intent?.toLowerCase();
  if (intent !== 'prepare') {
    return null;
  }

  const sideRaw = input.side?.toLowerCase();
  if (sideRaw !== 'buy' && sideRaw !== 'sell') {
    return null;
  }

  const symbol = input.symbol?.trim().toUpperCase();
  if (!symbol) {
    return null;
  }

  const assetClass = normalizeAssetClass(input.assetClass?.toLowerCase());
  if (!assetClass) {
    return null;
  }

  const lane = normalizeLane(input.lane);
  if (!lane) {
    return null;
  }

  return {
    intent: 'prepare',
    side: sideRaw,
    symbol,
    assetClass,
    lane,
    source: input.source?.trim() || 'simulation',
  };
}

/**
 * Resolve the human-readable reason a simulation trade ticket is disabled.
 *
 * Extracted verbatim from the inline ternary that previously lived in the
 * simulation page so the prepared-ticket form (and any future inline ticket)
 * share one legible code path. Returns `undefined` when the trade is enabled.
 *
 * The localized strings are passed in (this module must stay free of the i18n
 * `messages` dependency). The STOCK fresh-quote message remains a hardcoded
 * English literal exactly as it was in the page — the etf/crypto branches use
 * the provided localized strings, the stock branch does not have an i18n key.
 */
export function resolveTradeDisabledReason(input: {
  isReadOnly: boolean;
  statusMessage: string;
  price: number | null | undefined;
  assetClass: SimulationAssetClass;
  symbol: string;
  side: 'buy' | 'sell';
  hasPosition: boolean;
  /** Pre-resolved localized strings (the page passes these from `messages`). */
  freshEtfQuoteRequired: string;
  freshCryptoQuoteRequired: string;
  noOpenPositionToSellTemplate: string;
}): string | undefined {
  if (input.isReadOnly) {
    return input.statusMessage;
  }

  if (input.price == null) {
    if (input.assetClass === 'etf') {
      return `${input.freshEtfQuoteRequired} (${input.symbol})`;
    }
    if (input.assetClass === 'crypto') {
      return `${input.freshCryptoQuoteRequired} (${input.symbol})`;
    }
    // Stock branch: preserved verbatim — there is no i18n key for this string.
    return `Fresh stock quote required before simulation execution. (${input.symbol})`;
  }

  if (input.side === 'sell' && !input.hasPosition) {
    return input.noOpenPositionToSellTemplate.replace('{{symbol}}', input.symbol);
  }

  return undefined;
}

