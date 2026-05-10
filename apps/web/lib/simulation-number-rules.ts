import type { SimulationAssetClass } from '@repo/api-contracts';

export type QuantityInput = {
  assetClass: SimulationAssetClass;
  symbol: string;
  price: number | null;
  fractionalEnabled?: boolean;
};

export type QuantityNumberRules = {
  minQuantity: number;
  stepQuantity: number;
  defaultQuantity: number;
  minNotional: number;
  stepNotional: number;
  quantityDecimals: number;
  hint: string;
};

export type AgentCapRules = {
  min: number;
  step: number;
  maxNotionalPerTrade: number;
  maxDailyNotional: number;
  maxOpenExposure: number;
  quickValues: number[];
};

function decimalsForStep(step: number) {
  const text = step.toString();
  const index = text.indexOf('.');
  return index < 0 ? 0 : text.length - index - 1;
}

export function getSimulationQuantityRules(input: QuantityInput): QuantityNumberRules {
  const fractionalEnabled = Boolean(input.fractionalEnabled);
  const symbolUpper = input.symbol.trim().toUpperCase();
  const price = typeof input.price === 'number' && Number.isFinite(input.price) ? input.price : null;

  if (input.assetClass === 'stock') {
    const stepQuantity = fractionalEnabled ? 0.01 : 1;
    return {
      minQuantity: fractionalEnabled ? 0.01 : 1,
      stepQuantity,
      defaultQuantity: 1,
      minNotional: 1,
      stepNotional: 1,
      quantityDecimals: decimalsForStep(stepQuantity),
      hint: fractionalEnabled ? 'Fractional shares enabled in simulation.' : 'Whole shares only in simulation.',
    };
  }

  if (input.assetClass === 'etf') {
    const stepQuantity = fractionalEnabled ? 0.01 : 1;
    return {
      minQuantity: fractionalEnabled ? 0.01 : 1,
      stepQuantity,
      defaultQuantity: 1,
      minNotional: 1,
      stepNotional: 1,
      quantityDecimals: decimalsForStep(stepQuantity),
      hint: fractionalEnabled ? 'Fractional ETF units enabled in simulation.' : 'Whole ETF units only in simulation.',
    };
  }

  const isHighPriceCrypto = /BTC|ETH/.test(symbolUpper) || (price !== null && price >= 1000);
  const isLowPriceCrypto = price !== null && price < 5;
  const stepQuantity = isHighPriceCrypto ? 0.0001 : isLowPriceCrypto ? 1 : 0.01;
  const defaultQuantity = isHighPriceCrypto ? 0.001 : 1;
  return {
    minQuantity: stepQuantity,
    stepQuantity,
    defaultQuantity,
    minNotional: 1,
    stepNotional: 1,
    quantityDecimals: decimalsForStep(stepQuantity),
    hint: 'Crypto orders are validated primarily by minimum notional.',
  };
}

export function getAgentCapRules(): AgentCapRules {
  return {
    min: 1,
    step: 1,
    maxNotionalPerTrade: 500,
    maxDailyNotional: 2000,
    maxOpenExposure: 5000,
    quickValues: [500, 1000, 2000, 5000, 10000],
  };
}

export function isStepAligned(value: number, min: number, step: number): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(step) || step <= 0) {
    return false;
  }
  const scaled = (value - min) / step;
  return Math.abs(scaled - Math.round(scaled)) < 1e-8;
}

