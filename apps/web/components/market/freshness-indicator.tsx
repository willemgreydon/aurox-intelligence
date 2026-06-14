'use client';

import { useEffect, useState } from 'react';
import { classifyQuoteFreshness, getQuoteFreshnessShortLabel } from '../../lib/quote-freshness-display';

type FreshnessIndicatorProps = {
  assetClass: string;
  /** Quote observation time (ISO/ms) — drives the staleness classification. */
  observedAt?: string | null;
  price?: number | null;
  className?: string;
};

function ageLabel(ageSeconds: number | null): string {
  if (ageSeconds === null) return 'no timestamp';
  if (ageSeconds < 60) return `${ageSeconds}s ago`;
  if (ageSeconds < 3_600) return `${Math.floor(ageSeconds / 60)}m ago`;
  if (ageSeconds < 86_400) return `${Math.floor(ageSeconds / 3_600)}h ago`;
  return `${Math.floor(ageSeconds / 86_400)}d ago`;
}

/**
 * Tonal quote-freshness chip (AUR-002 / quote-snapshot-rule). A price must never
 * be shown without an accompanying timestamp: a missing/old observation renders
 * as partial/stale/unavailable with an accessible label, never as "live".
 *
 * The clock is read on the client (via state set in an effect) so the staleness
 * reflects the viewer's real time — and so SSR/CSR don't disagree (no hydration
 * drift). It re-evaluates every 30s and whenever `observedAt` changes (e.g. the
 * workspace's live quote poll), so a freshly-polled price reads as live, not stale.
 */
export function FreshnessIndicator({ assetClass, observedAt, price, className }: FreshnessIndicatorProps) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const base = `freshness-chip${className ? ` ${className}` : ''}`;

  // SSR + first paint: neutral placeholder so we never assert a freshness we
  // computed against server time, and never display a price as verified yet.
  if (nowMs === null) {
    return <span className={`observe-chip observe-chip--neutral ${base}`} aria-hidden="true">…</span>;
  }

  const fresh = classifyQuoteFreshness({
    assetClass,
    timestamp: observedAt ?? null,
    price: price ?? null,
    now: nowMs,
  });
  const short = getQuoteFreshnessShortLabel(fresh.state);
  const accessible =
    fresh.state === 'unavailable'
      ? 'Quote unavailable'
      : fresh.lastUpdatedAt === null
        ? 'Quote freshness unknown — no timestamp'
        : `Quote ${short.toLowerCase()} — updated ${ageLabel(fresh.ageSeconds)}`;

  return (
    <span className={`observe-chip observe-chip--${fresh.tone} ${base}`} title={accessible} aria-label={accessible}>
      {short}
    </span>
  );
}
