import type { SimulationAssetClass } from '@repo/api-contracts';
import { getSimulationQuantityRules } from './simulation-number-rules';

export type QuantityMode = 'quantity' | 'notional';

export type QuantityRulesInput = {
  assetClass: SimulationAssetClass;
  symbol: string;
  price: number | null;
  fractionalEnabled?: boolean;
};

export type QuantityRules = {
  minQuantity: number;
  step: number;
  minNotional: number;
  quantityDecimals: number;
  hint: string;
};

function decimalsForStep(step: number) {
  const text = step.toString();
  const index = text.indexOf('.');
  return index < 0 ? 0 : text.length - index - 1;
}

export function getQuantityRules(input: QuantityRulesInput): QuantityRules {
  const rules = getSimulationQuantityRules(input);
  const step = rules.stepQuantity;
  return {
    minQuantity: rules.minQuantity,
    step,
    minNotional: rules.minNotional,
    quantityDecimals: rules.quantityDecimals ?? decimalsForStep(step),
    hint: rules.hint,
  };
}

export function notionalToQuantity(notional: number, price: number, step: number) {
  if (!Number.isFinite(notional) || !Number.isFinite(price) || !Number.isFinite(step) || price <= 0 || step <= 0) {
    return null;
  }
  const raw = notional / price;
  return Math.floor(raw / step) * step;
}

export function quantityToNotional(quantity: number, price: number) {
  if (!Number.isFinite(quantity) || !Number.isFinite(price) || price <= 0) {
    return null;
  }
  return quantity * price;
}
