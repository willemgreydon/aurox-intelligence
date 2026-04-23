import type { TradeIntentPayload, BrokerModeConfig, AccountCapitalState } from '../types/broker-types';
import type { PolicyCheckResult } from '../types/policy-types';

export function checkModePolicy(
  intent: TradeIntentPayload,
  config: BrokerModeConfig,
  account: AccountCapitalState,
): PolicyCheckResult[] {
  const checks: PolicyCheckResult[] = [];

  checks.push(
    config.enabled
      ? { checkId: 'mode.enabled', verdict: 'approved', reason: 'Mode is active.' }
      : { checkId: 'mode.enabled', verdict: 'rejected', reason: `Mode "${config.label}" is not enabled.` },
  );

  const assetAllowed = config.allowedAssetKinds.includes(intent.assetKind);
  checks.push(
    assetAllowed
      ? { checkId: 'mode.assetKind', verdict: 'approved', reason: `Asset kind "${intent.assetKind}" is permitted by this mode.` }
      : {
          checkId: 'mode.assetKind',
          verdict: 'rejected',
          reason: `Asset kind "${intent.assetKind}" is not permitted. Allowed: ${config.allowedAssetKinds.join(', ')}.`,
          constraintApplied: 'allowedAssetKinds',
        },
  );

  checks.push(
    config.requireHumanApproval && intent.source === 'ai_autonomous'
      ? {
          checkId: 'mode.humanApproval',
          verdict: 'requires_approval',
          reason: 'This mode requires human approval before autonomous execution.',
          constraintApplied: 'requireHumanApproval',
        }
      : { checkId: 'mode.humanApproval', verdict: 'approved', reason: 'Human approval gate passed.' },
  );

  if (intent.notional !== undefined) {
    const withinPerTrade = intent.notional <= config.capital.maxPerTrade;
    checks.push(
      withinPerTrade
        ? { checkId: 'mode.perTradeLimit', verdict: 'approved', reason: 'Order notional is within per-trade limit.' }
        : {
            checkId: 'mode.perTradeLimit',
            verdict: 'rejected',
            reason: `Order notional $${intent.notional} exceeds per-trade limit of $${config.capital.maxPerTrade}.`,
            constraintApplied: 'capital.maxPerTrade',
          },
    );
  }

  if (intent.confidence !== undefined) {
    const meetsConfidence = intent.confidence >= config.risk.minSignalConfidence;
    checks.push(
      meetsConfidence
        ? { checkId: 'mode.confidence', verdict: 'approved', reason: 'Signal confidence meets threshold.' }
        : {
            checkId: 'mode.confidence',
            verdict: 'rejected',
            reason: `Signal confidence ${intent.confidence.toFixed(2)} is below minimum ${config.risk.minSignalConfidence.toFixed(2)}.`,
            constraintApplied: 'risk.minSignalConfidence',
          },
    );
  }

  const withinDailyOrders = account.ordersExecutedToday < config.trading.maxOrdersPerDay;
  checks.push(
    withinDailyOrders
      ? { checkId: 'mode.dailyOrders', verdict: 'approved', reason: 'Daily order count within limit.' }
      : {
          checkId: 'mode.dailyOrders',
          verdict: 'rejected',
          reason: `Daily order limit of ${config.trading.maxOrdersPerDay} reached (${account.ordersExecutedToday} executed today).`,
          constraintApplied: 'trading.maxOrdersPerDay',
        },
  );

  const withinDailyLoss = account.dailyLossPercent < config.risk.maxDailyLossPercent;
  checks.push(
    withinDailyLoss
      ? { checkId: 'mode.dailyLoss', verdict: 'approved', reason: 'Daily loss within limit.' }
      : {
          checkId: 'mode.dailyLoss',
          verdict: 'rejected',
          reason: `Daily loss circuit breached: ${(account.dailyLossPercent * 100).toFixed(2)}% >= limit of ${(config.risk.maxDailyLossPercent * 100).toFixed(2)}%.`,
          constraintApplied: 'risk.maxDailyLossPercent',
        },
  );

  const withinDrawdown = account.currentDrawdownPercent < config.risk.maxDrawdownPercent;
  checks.push(
    withinDrawdown
      ? { checkId: 'mode.drawdown', verdict: 'approved', reason: 'Drawdown within limit.' }
      : {
          checkId: 'mode.drawdown',
          verdict: 'rejected',
          reason: `Drawdown circuit breached: ${(account.currentDrawdownPercent * 100).toFixed(2)}% >= limit of ${(config.risk.maxDrawdownPercent * 100).toFixed(2)}%.`,
          constraintApplied: 'risk.maxDrawdownPercent',
        },
  );

  return checks;
}
