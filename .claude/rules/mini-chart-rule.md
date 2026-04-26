# Mini Chart Rule

## Purpose
Mini sparkline charts in asset cards and portfolio rows must display clean, performance-safe, server-provided OHLCV data. They must not cause layout shifts, import heavy charting libraries unnecessarily, or fetch data client-side on mount.

## Applies To
- `apps/web/components/charts/`
- `apps/web/components/market/`
- `apps/web/components/portfolio/`

## Rule
Mini chart requirements:

1. **Data source**: OHLCV data passed as a prop from the server (not fetched client-side on mount)
2. **Data count**: 20–30 data points is sufficient for a sparkline — do not over-fetch
3. **Rendering**: SVG sparkline preferred for simplicity; avoid mounting a full chart library for a mini chart
4. **Color**: Green if last close > first close, red if last close < first close
5. **No axes/labels**: Mini charts are purely visual — no axes, no tick marks, no tooltips (unless explicitly requested)
6. **Static dimensions**: Fixed width and height in the parent container — no layout shift on load
7. **Empty state**: If `data.length === 0`, render a flat gray line — never crash

If a heavier charting library (Recharts, Chart.js, Lightweight Charts) is used, it must be:
- Dynamically imported (`next/dynamic`) to avoid bundle bloat
- Only loaded when the component is actually visible
- Not imported in a layout that mounts for every page

## Forbidden
- `useEffect` that calls `fetch()` to load chart data after mount (causes layout shift)
- Importing `recharts` or `chart.js` in a component that renders in every asset card
- Mini chart that throws when given an empty data array
- Chart that uses `Date.now()` for fake sparkline data
- Re-implementing complex indicator overlays in a mini chart (that's for the full chart view)

## Required Pattern
```tsx
// apps/web/components/charts/MiniSparkline.tsx
interface Props {
  data: number[]          // close prices, passed from server
  isPositive: boolean     // pre-computed server-side
  width?: number
  height?: number
}

export function MiniSparkline({ data, isPositive, width = 80, height = 30 }: Props) {
  if (data.length < 2) {
    return <div style={{ width, height }} className="bg-muted/20 rounded" />
  }
  const points = buildSparklinePoints(data, width, height)
  return (
    <svg width={width} height={height} aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "var(--color-green)" : "var(--color-red)"}
        strokeWidth={1.5}
      />
    </svg>
  )
}
```

## Validation
```bash
grep -r "useEffect.*fetch\|useState.*fetch" apps/web/components/charts --include="*.tsx"
grep -r "import.*recharts\|from 'recharts'\|from \"recharts\"" apps/web/components --include="*.tsx" | grep -v "dynamic"
grep -r "MiniSparkline\|Sparkline" apps/web/components --include="*.tsx"
```

## Good Example
```tsx
<MiniSparkline data={asset.sparklineData} isPositive={asset.isPositive} />
// ✓ Data from server, no client-side fetch, no layout shift
```

## Bad Example
```tsx
const [data, setData] = useState([])
useEffect(() => {
  fetch(`/api/sparkline/${symbol}`).then(r => r.json()).then(setData)
}, [symbol])
return <SparklineChart data={data} />
// ✗ Causes layout shift, makes N provider calls on mount for N cards
```

## Safety Notes
A mini chart that fetches on mount for every asset card in a 50-asset table makes 50 client-side requests on every page navigation. This exhausts provider budgets and causes visible layout flicker. Server-side data passing is both a performance and correctness requirement.
