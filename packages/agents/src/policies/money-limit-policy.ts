import type { TradeIntentPayload, BrokerModeConfig, AccountCapitalState } from '../types/broker-types';
import type { PolicyCheckResult } from '../types/policy-types';

export function computeAllowedCapital(config: BrokerModeConfig, account: AccountCapitalState): number {
  return Math.min(
    config.capital.maxAbsolute,
    account.cashBalance * config.capital.maxPercentOfCash,
  );
}

export function computeAllowedOrderNotional(
  config: BrokerModeConfig,
  account: AccountCapitalState,
  allowedCapital: number,
): number {
  const remainingBudget = Math.max(0, allowedCapital - account.usedCapitalToday);
  return Math.min(remainingBudget, config.capital.maxPerTrade);
}

export function checkMoneyLimitPolicy(
  intent: TradeIntentPayload,
  config: BrokerModeConfig,
  account: AccountCapitalState,
): PolicyCheckResult[] {
  const checks: PolicyCheckResult[] = [];

  const allowedCapital = computeAllowedCapital(config, account);
  const allowedOrderNotional = computeAllowedOrderNotional(config, account, allowedCapital);

  checks.push(
    account.cashBalance > 0
      ? { checkId: 'money.cashAvailable', verdict: 'approved', reason: 'Account has available cash.' }
      : { checkId: 'money.cashAvailable', verdict: 'rejected', reason: 'Account has no available cash.' },
  );

  checks.push(
    allowedCapital > 0
      ? {
          checkId: 'money.capitalEnvelope',
          verdict: 'approved',
          reason: `Allowed capital envelope: $${allowedCapital.toFixed(2)}.`,
          constraintApplied: 'capital.maxAbsolute + capital.maxPercentOfCash',
        }
      : {
          checkId: 'money.capitalEnvelope',
          verdict: 'rejected',
          reason: 'Capital envelope is exhausted for this mode.',
          constraintApplied: 'capital.maxAbsolute + capital.maxPercentOfCash',
        },
  );

  if (intent.notional !== undefined) {
    const withinBudget = intent.notional <= allowedOrderNotional;
    checks.push(
      withinBudget
        ? {
            checkId: 'money.orderBudget',
            verdict: 'approved',
            reason: `Order notional $${intent.notional.toFixed(2)} fits within allowed order budget of $${allowedOrderNotional.toFixed(2)}.`,
          }
        : {
            checkId: 'money.orderBudget',
            verdict: 'rejected',
            reason: `Order notional $${intent.notional.toFixed(2)} exceeds allowed order budget of $${allowedOrderNotional.toFixed(2)}.`,
            constraintApplied: 'capital.maxPerTrade + remainingModeBudget',
          },
    );
  }

  const withinPositionCap = account.openPositionCount < config.risk.maxOpenPositions;
  checks.push(
    withinPositionCap
      ? {
          checkId: 'money.positionCap',
          verdict: 'approved',
          reason: `Open positions (${account.openPositionCount}) within limit of ${config.risk.maxOpenPositions}.`,
        }
      : {
          checkId: 'money.positionCap',
          verdict: 'rejected',
          reason: `Open position limit reached: ${account.openPositionCount} of ${config.risk.maxOpenPositions} maximum.`,
          constraintApplied: 'risk.maxOpenPositions',
        },
  );

  return checks;
}
