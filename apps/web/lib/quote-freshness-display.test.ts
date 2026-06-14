import { describe, expect, it } from 'vitest';
import {
  classifyQuoteFreshness,
  getQuoteFreshnessShortLabel,
} from './quote-freshness-display';

// Fixed reference instant: 2024-01-16 15:00 UTC = 10:00 ET, a Tuesday → US market OPEN.
const MARKET_OPEN_NOW = Date.parse('2024-01-16T15:00:00.000Z');
// 2024-01-16 23:00 UTC = 18:00 ET, Tuesday → US market CLOSED.
const MARKET_CLOSED_NOW = Date.parse('2024-01-16T23:00:00.000Z');

describe('classifyQuoteFreshness', () => {
  it('equity quote from yesterday with the market closed is market_closed (benign, not bad)', () => {
    const result = classifyQuoteFreshness({
      assetClass: 'stock',
      timestamp: MARKET_CLOSED_NOW - 18 * 60 * 60 * 1000, // ~18h old (prior close)
      price: 187.32,
      now: MARKET_CLOSED_NOW,
    });
    expect(result.state).toBe('market_closed');
    expect(result.tone).toBe('info');
    expect(result.isTradableForSimulation).toBe(true);
    expect(result.isReliableForValuation).toBe(true);
  });

  it('equity quote that is old DURING market hours is stale, not market_closed', () => {
    const result = classifyQuoteFreshness({
      assetClass: 'stock',
      timestamp: MARKET_OPEN_NOW - 3 * 60 * 60 * 1000, // 3h old during open hours
      price: 187.32,
      now: MARKET_OPEN_NOW,
      marketOpen: true,
    });
    expect(result.state).toBe('stale');
    expect(result.tone).toBe('danger');
    expect(result.isTradableForSimulation).toBe(false);
    expect(result.isReliableForValuation).toBe(false);
  });

  it('crypto quote within minutes is live and tradable (24/7, never market_closed)', () => {
    const result = classifyQuoteFreshness({
      assetClass: 'crypto',
      timestamp: MARKET_CLOSED_NOW - 60 * 1000, // 60s old, equity market closed but crypto trades
      price: 42150.5,
      now: MARKET_CLOSED_NOW,
    });
    expect(result.state).toBe('live');
    expect(result.isTradableForSimulation).toBe(true);
    expect(result.isReliableForValuation).toBe(true);
  });

  it('crypto quote past the live threshold becomes delayed then stale, and stops being tradable', () => {
    const delayed = classifyQuoteFreshness({
      assetClass: 'crypto',
      timestamp: MARKET_CLOSED_NOW - 5 * 60 * 1000, // 5 min
      price: 42150.5,
      now: MARKET_CLOSED_NOW,
    });
    expect(delayed.state).toBe('delayed');
    expect(delayed.isTradableForSimulation).toBe(false); // engine rejects crypto > 120s

    const stale = classifyQuoteFreshness({
      assetClass: 'crypto',
      timestamp: MARKET_CLOSED_NOW - 30 * 60 * 1000, // 30 min
      price: 42150.5,
      now: MARKET_CLOSED_NOW,
    });
    expect(stale.state).toBe('stale');
    expect(stale.isTradableForSimulation).toBe(false);
    expect(stale.isReliableForValuation).toBe(false);
  });

  it('a present price with an incomplete payload is partial', () => {
    const result = classifyQuoteFreshness({
      assetClass: 'stock',
      timestamp: MARKET_OPEN_NOW - 1000,
      price: 187.32,
      hasCompletePayload: false,
      now: MARKET_OPEN_NOW,
    });
    expect(result.state).toBe('partial');
    expect(result.isTradableForSimulation).toBe(false);
    expect(result.isReliableForValuation).toBe(false);
  });

  it('a present price but missing/invalid timestamp is partial', () => {
    const result = classifyQuoteFreshness({
      assetClass: 'stock',
      timestamp: 'not-a-date',
      price: 187.32,
      now: MARKET_OPEN_NOW,
    });
    expect(result.state).toBe('partial');
    expect(result.lastUpdatedAt).toBeNull();
  });

  it('no usable price is unavailable regardless of timestamp', () => {
    expect(
      classifyQuoteFreshness({ assetClass: 'crypto', timestamp: MARKET_OPEN_NOW, price: null, now: MARKET_OPEN_NOW }).state,
    ).toBe('unavailable');
    expect(
      classifyQuoteFreshness({ assetClass: 'stock', timestamp: MARKET_OPEN_NOW, price: 0, now: MARKET_OPEN_NOW }).state,
    ).toBe('unavailable');
  });

  it('a stale but present equity price still surfaces (not hidden) with the age recorded', () => {
    const result = classifyQuoteFreshness({
      assetClass: 'stock',
      timestamp: MARKET_OPEN_NOW - 90 * 60 * 1000, // 90 min during open → delayed
      price: 187.32,
      now: MARKET_OPEN_NOW,
      marketOpen: true,
    });
    expect(result.state).toBe('delayed');
    expect(result.ageSeconds).toBe(90 * 60);
    expect(result.lastUpdatedAt).toBe(MARKET_OPEN_NOW - 90 * 60 * 1000);
  });

  it('carries the provider label through', () => {
    const result = classifyQuoteFreshness({
      assetClass: 'crypto',
      timestamp: MARKET_OPEN_NOW,
      price: 42150,
      provider: 'finnhub',
      now: MARKET_OPEN_NOW,
    });
    expect(result.providerLabel).toBe('finnhub');
  });
});

describe('getQuoteFreshnessShortLabel', () => {
  it('falls back to English labels when none provided', () => {
    expect(getQuoteFreshnessShortLabel('live')).toBe('Live');
    expect(getQuoteFreshnessShortLabel('market_closed')).toBe('Market closed');
    expect(getQuoteFreshnessShortLabel('unavailable')).toBe('Unavailable');
  });

  it('uses the German i18n label set when provided', () => {
    const de = {
      live: 'Live',
      delayed: 'Verzögert',
      market_closed: 'Markt geschlossen',
      stale: 'Veraltet',
      partial: 'Partial',
      unavailable: 'Nicht verfügbar',
    } as const;
    expect(getQuoteFreshnessShortLabel('market_closed', de)).toBe('Markt geschlossen');
    expect(getQuoteFreshnessShortLabel('stale', de)).toBe('Veraltet');
    expect(getQuoteFreshnessShortLabel('unavailable', de)).toBe('Nicht verfügbar');
  });
});
