import type { SimulationPosition } from '@repo/api-contracts';
import type { BrokerModeConfig, TradeIntentPayload } from '../types/broker-types';
import type { AgentResult } from '../types/agent-types';
import type { PolicyCheckResult } from '../types/policy-types';
import { agentOk } from '../types/agent-types';

export function runPositionLimitAgent(
  positions: SimulationPosition[],
  config: BrokerModeConfig,
  intent: TradeIntentPayload,
  portfolioValue: number,
): AgentResult<PolicyCheckResult[]> {
  const checks: PolicyCheckResult[] = [];
  const openPositions = positions.filter((p) => p.closedAt === null);
  const isSell = intent.side === 'sell';

  // Sells close existing positions — they do not open new ones.
  // The maxOpenPositions cap only applies when opening new positions (buys).
  const withinPositionCap = isSell || openPositions.length < config.risk.maxOpenPositions;
  checks.push(
    withinPositionCap
      ? {
          checkId: 'position.maxOpen',
          verdict: 'approved',
          reason: isSell
            ? 'Sell order: max open positions limit not applicable (closing position).'
            : `Open positions (${openPositions.length}) within limit of ${config.risk.maxOpenPositions}.`,
        }
      : {
          checkId: 'position.maxOpen',
          verdict: 'rejected',
          reason: `Open position limit reached: ${openPositions.length} of ${config.risk.maxOpenPositions} maximum.`,
          constraintApplied: 'risk.maxOpenPositions',
        },
  );

  if (intent.notional !== undefined && portfolioValue > 0) {
    const existingPosition = openPositions.find((p) => p.symbol === intent.symbol);
    const existingValue = existingPosition?.marketValue ?? 0;

    // For sells, the projected concentration decreases (we are reducing the position).
    // Use Math.max(0, ...) to avoid negative concentration when selling more than held.
    const projectedConcentration = isSell
      ? Math.max(0, existingValue - intent.notional) / portfolioValue
      : (existingValue + intent.notional) / portfolioValue;

    const withinConcentration = projectedConcentration <= config.risk.maxPositionPercent;

    checks.push(
      withinConcentration
        ? {
            checkId: 'position.concentration',
            verdict: 'approved',
            reason: `Projected ${intent.symbol} concentration (${(projectedConcentration * 100).toFixed(1)}%) is within the ${(config.risk.maxPositionPercent * 100).toFixed(0)}% limit.`,
          }
        : {
            checkId: 'position.concentration',
            verdict: 'rejected',
            reason: `Projected ${intent.symbol} concentration (${(projectedConcentration * 100).toFixed(1)}%) exceeds the ${(config.risk.maxPositionPercent * 100).toFixed(0)}% limit.`,
            constraintApplied: 'risk.maxPositionPercent',
          },
    );
  }

  return agentOk<PolicyCheckResult[]>(checks);
}
