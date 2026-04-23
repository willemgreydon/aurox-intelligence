import { getBrokerConnectionSummary } from '../env/broker-env';
import { pingBinance } from '../lib/brokers/binance-execution-client';
import {
  getCoinbaseKeyPermissions,
} from '../lib/brokers/coinbase-execution-client';

export interface BrokerConnectivityResult {
  readonly reachable: boolean;
  readonly error: string | null;
}

export interface CoinbasePermissionsResult {
  readonly canTrade: boolean;
  readonly canView: boolean;
  readonly error: string | null;
}

export interface BrokerHealthReport {
  readonly provider: 'simulation' | 'binance' | 'coinbase';
  readonly dryRun: boolean;
  readonly sandboxMode: boolean;
  readonly credentials: {
    readonly binance: boolean;
    readonly coinbase: boolean;
  };
  readonly allowedSymbols: {
    readonly binance: readonly string[];
    readonly coinbase: readonly string[];
  };
  readonly allowedLiveModeIds: readonly string[];
  readonly connectivity: {
    readonly binance: BrokerConnectivityResult | null;
    readonly coinbase: BrokerConnectivityResult | null;
  };
  readonly permissions: {
    readonly coinbase: CoinbasePermissionsResult | null;
  };
  readonly generatedAt: string;
}

async function checkBinanceConnectivity(): Promise<BrokerConnectivityResult> {
  try {
    const reachable = await pingBinance();
    return { reachable, error: null };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : 'Binance connectivity check failed.',
    };
  }
}

async function checkCoinbaseConnectivityAndPermissions(): Promise<{
  connectivity: BrokerConnectivityResult;
  permissions: CoinbasePermissionsResult;
}> {
  try {
    const perms = await getCoinbaseKeyPermissions();
    return {
      connectivity: { reachable: true, error: null },
      permissions: {
        canTrade: perms.can_trade ?? false,
        canView: perms.can_view ?? false,
        error: null,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Coinbase connectivity check failed.';
    return {
      connectivity: { reachable: false, error: message },
      permissions: { canTrade: false, canView: false, error: message },
    };
  }
}

export async function getBrokerHealthReport(): Promise<BrokerHealthReport> {
  const summary = getBrokerConnectionSummary();

  const [binanceResult, coinbaseResult] = await Promise.all([
    summary.hasBinance ? checkBinanceConnectivity() : Promise.resolve(null),
    summary.hasCoinbase ? checkCoinbaseConnectivityAndPermissions() : Promise.resolve(null),
  ]);

  return {
    provider: summary.provider,
    dryRun: summary.dryRun,
    sandboxMode: summary.sandboxMode,
    credentials: {
      binance: summary.hasBinance,
      coinbase: summary.hasCoinbase,
    },
    allowedSymbols: {
      binance: summary.allowedBinanceSymbols,
      coinbase: summary.allowedCoinbaseProductIds,
    },
    allowedLiveModeIds: summary.allowedLiveModeIds,
    connectivity: {
      binance: binanceResult,
      coinbase: coinbaseResult?.connectivity ?? null,
    },
    permissions: {
      coinbase: coinbaseResult?.permissions ?? null,
    },
    generatedAt: new Date().toISOString(),
  };
}
