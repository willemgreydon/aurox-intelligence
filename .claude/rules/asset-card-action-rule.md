# Asset Card Action Rule

## Purpose
Asset cards in market overview, rankings, and portfolio views trigger navigation or surface quick actions. They must render from read models only, never compute financial values, and must gate action buttons by execution mode.

## Applies To
- `apps/web/components/market/`
- `apps/web/components/portfolio/`
- `apps/web/components/invest/`

## Rule
An asset card receives a view model with all display values pre-computed:
```ts
type AssetCardViewModel = {
  symbol: string
  name: string
  assetKind: AssetKind
  priceDisplay: string         // pre-formatted: "$182.34"
  changeDisplay: string        // pre-formatted: "+1.23%"
  isPositive: boolean
  signalLabel?: string         // "Bullish" | "Bearish" | "Neutral"
  signalConfidence?: number
  hasLowConfidence?: boolean
  isStale?: boolean
  executionMode: "simulation" | "live"
  canTrade: boolean            // determined server-side
}
```

Action rules:
- "Trade" / "Buy" / "Sell" buttons must only render when `canTrade: true`
- Quick actions must route through server actions — not client-side `fetch()`
- Execution mode must be visually indicated on any card with trade actions
- Low confidence signals must be visually distinguished (muted color, warning icon)

## Forbidden
- Computing `changeDisplay` inside the card component
- Card component calling `getSignalScore(symbol)` directly
- Trade button visible when `canTrade: false`
- Rendering raw `signal.score` number directly (must use mapped label)
- Showing `isStale: true` data without a visual indicator

## Required Pattern
```tsx
// apps/web/components/market/AssetCard.tsx
export function AssetCard({ asset }: { asset: AssetCardViewModel }) {
  return (
    <div className="asset-card">
      <span>{asset.symbol}</span>
      <span className={asset.isPositive ? "text-green" : "text-red"}>{asset.changeDisplay}</span>
      {asset.isStale && <StaleIndicator />}
      {asset.signalLabel && (
        <SignalBadge label={asset.signalLabel} hasLowConfidence={asset.hasLowConfidence} />
      )}
      {asset.canTrade && (
        <TradeButton symbol={asset.symbol} mode={asset.executionMode} />
      )}
    </div>
  )
}
// ✓ No computation, renders pre-shaped view model, gates on canTrade
```

## Validation
```bash
grep -r "AssetCard\|assetCard" apps/web/components --include="*.tsx" -l
grep -r "toFixed\|parseFloat\|Math\." apps/web/components/market --include="*.tsx"
grep -r "canTrade\|executionMode" apps/web/components --include="*.tsx"
```

## Good Example
```tsx
<span className={asset.isPositive ? "text-green" : "text-red"}>{asset.changeDisplay}</span>
// ✓ Displays pre-formatted, pre-colored value from view model
```

## Bad Example
```tsx
const change = ((quote.price - quote.prevClose) / quote.prevClose * 100).toFixed(2)
// ✗ Financial computation inside card component
```

## Safety Notes
A trade button that renders when `canTrade: false` (e.g., market is closed, account is halted) allows user to trigger an action the server will reject. It creates a confusing failure flow. `canTrade` must be a server-side determination included in the view model.
