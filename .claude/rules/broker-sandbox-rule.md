# Broker Sandbox Rule

## Purpose
All broker adapter development and testing must target sandbox/paper trading endpoints. A broker adapter must never default to live endpoints. Live endpoint activation requires explicit confirmed configuration.

## Applies To
- `packages/agents/src/brokers/`
- Any broker adapter implementation
- Environment configuration for broker credentials

## Rule
Every broker adapter must implement distinct sandbox and live endpoint resolution:

```text
BrokerAdapter {
  sandboxBaseUrl: string    // always defined
  liveBaseUrl: string       // only resolved when live mode explicitly confirmed
  mode: "sandbox" | "live"  // resolved from account readiness gate, not from env directly
}
```

Default behavior if mode is ambiguous:
```text
→ use sandbox endpoint
```

API credentials:
- Sandbox credentials: `BROKER_<NAME>_SANDBOX_API_KEY`
- Live credentials: `BROKER_<NAME>_LIVE_API_KEY`
- They must never be the same variable
- Live credential presence does not activate live mode (readiness gate still required)

New broker adapters must:
1. Implement full sandbox support first
2. Add stub/not-implemented live path
3. Gate live activation behind `assertLiveReadinessGate`
4. Document min_qty, min_notional, tick_size, step_size for all supported instruments

## Forbidden
- Broker adapter that uses live endpoint when `NODE_ENV === "production"`
- Broker adapter that falls through to live if sandbox key is missing
- Storing live and sandbox credentials in the same environment variable
- Broker adapter without sandbox support
- Calling broker live API from `apps/web` routes directly
- Broker adapter that does not validate instrument constraints

## Required Pattern
```ts
// packages/agents/src/brokers/alpaca-adapter.ts
export class AlpacaBrokerAdapter implements BrokerAdapter {
  private readonly baseUrl: string

  constructor(private readonly mode: BrokerMode) {
    this.baseUrl = mode === "live"
      ? "https://api.alpaca.markets"
      : "https://paper-api.alpaca.markets"  // sandbox always available
  }

  async submitOrder(order: BrokerOrder): Promise<BrokerOrderResult> {
    if (this.mode === "live") {
      // live credential explicitly required, not defaulted
      const apiKey = requireEnv("ALPACA_LIVE_API_KEY")
      return this.callLiveApi(apiKey, order)
    }
    const apiKey = requireEnv("ALPACA_SANDBOX_API_KEY")
    return this.callSandboxApi(apiKey, order)
  }
}
```

## Validation
```bash
grep -r "baseUrl\|sandboxUrl\|liveUrl" packages/agents/src/brokers --include="*.ts"
grep -r "LIVE_API_KEY\|SANDBOX_API_KEY" packages/agents/src --include="*.ts"
grep -r "NODE_ENV.*production.*live\|isProduction.*live" packages/agents/src --include="*.ts"
pnpm --filter @repo/agents typecheck
```

## Good Example
```ts
const adapter = new AlpacaBrokerAdapter(resolvedMode)
// resolvedMode comes from readiness gate, not raw env
// adapter defaults to sandbox if mode is unknown
```

## Bad Example
```ts
const baseUrl = process.env.NODE_ENV === "production"
  ? "https://api.alpaca.markets"   // ✗ Live by default in production
  : "https://paper-api.alpaca.markets"
```

## Safety Notes
A broker adapter that uses the live endpoint in production without a readiness gate submits real orders to a real market. Sandbox/live credential confusion is one of the most common causes of accidental live trading in financial systems.
