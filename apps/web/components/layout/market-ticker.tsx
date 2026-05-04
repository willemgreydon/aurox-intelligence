import { cn } from '../../lib/utils';
import type { MarketTickerViewModel } from '../../server/mappers/market-ticker-mapper';

type MarketTickerProps = {
  ticker: MarketTickerViewModel;
  labels: {
    aria: string;
    emptyAria: string;
  };
};

type MarketTickerDisplayItem = MarketTickerViewModel['items'][number];

export function MarketTicker({ ticker, labels }: MarketTickerProps) {
  const displayItems: MarketTickerDisplayItem[] = ticker.items;

  if (ticker.items.length === 0) {
    return (
      <div className="market-ticker market-ticker--empty" aria-label={labels.emptyAria}>
        <div className="market-ticker__lead market-ticker__lead--primary">
          <strong>{ticker.title}</strong>
          <span className="market-ticker__meta">{ticker.lastUpdatedLabel}</span>
        </div>
        <span className="market-ticker__meta market-ticker__summary">
          {ticker.emptyStateMessage ?? ticker.sourceSummary}
        </span>
      </div>
    );
  }

  return (
    <div className="market-ticker" aria-label={labels.aria}>
      <div className="market-ticker__lead market-ticker__lead--primary">
        <strong>{ticker.title}</strong>
        <span className="market-ticker__meta">{ticker.lastUpdatedLabel}</span>
      </div>

      <div className="market-ticker__track">
        <div className="market-ticker__marquee">
          {displayItems.map((item) => (
            <div key={item.symbol} className="market-ticker__item" title={item.source ?? undefined}>
              <span className="market-ticker__symbol">{item.label}</span>
              <span className="market-ticker__price">{item.priceLabel}</span>
              <span
                className={cn(
                  'market-ticker__move',
                  item.direction === 'up' && 'market-ticker__move--up',
                  item.direction === 'down' && 'market-ticker__move--down',
                  item.direction === 'flat' && 'market-ticker__move--flat',
                )}
              >
                {item.changeLabel}
              </span>
              <span className="market-ticker__meta">{item.freshnessLabel}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="market-ticker__lead market-ticker__lead--summary">
        <span className="market-ticker__meta">{ticker.sourceSummary}</span>
      </div>
    </div>
  );
}
