'use client';

import { useId } from 'react';
import {
  MARKET_GRAPH_TIMEFRAMES,
  MARKET_GRAPH_TIMEFRAME_ORDER,
  type MarketGraphTimeframeId,
} from '../../lib/market-graph-timeframes';

type TimeframeSelectProps = {
  value: MarketGraphTimeframeId;
  onChange: (value: MarketGraphTimeframeId) => void;
  /** Visible field label (e.g. "Range"). */
  label: string;
  /** Predicate for options that are unavailable from the active provider. */
  isDisabled?: (id: MarketGraphTimeframeId) => boolean;
  /** Optional point count of the active timeframe, shown as a compact caption. */
  activePointCount?: number | null;
};

/**
 * Compact time-range dropdown for dense chart/cockpit headers.
 *
 * Replaces the wide horizontal pill group (1m…2Y) that overflowed beside the
 * asset/compare selectors and chart-mode toggles. Uses a native <select> styled
 * to match the existing cockpit selectors — keyboard accessible, dark-theme
 * aligned, no hydration risk. Behaviour is identical to the old pills: changing
 * the value calls `onChange` with the selected timeframe id.
 */
export function TimeframeSelect({ value, onChange, label, isDisabled, activePointCount }: TimeframeSelectProps) {
  const selectId = useId();
  return (
    <label className="market-graph__selector market-graph__selector--timeframe" htmlFor={selectId}>
      <span className="market-graph__selector-label">{label}</span>
      <span className="market-graph__timeframe-control">
        <select
          id={selectId}
          className="market-graph__selector-input market-graph__timeframe-input"
          value={value}
          aria-label="Select chart time range"
          onChange={(event) => onChange(event.target.value as MarketGraphTimeframeId)}
        >
          {MARKET_GRAPH_TIMEFRAME_ORDER.map((id) => {
            const config = MARKET_GRAPH_TIMEFRAMES[id];
            const disabled = isDisabled?.(id) ?? false;
            return (
              <option key={id} value={id} disabled={disabled}>
                {config.label} · {config.displayLabel}
                {disabled ? ' (unavailable)' : ''}
              </option>
            );
          })}
        </select>
        {activePointCount !== null && activePointCount !== undefined ? (
          <span
            className="market-graph__timeframe-meta num-bubble num-bubble--muted num-bubble--small"
            aria-label={`${activePointCount} visible candles`}
          >
            {activePointCount}
          </span>
        ) : null}
      </span>
    </label>
  );
}
