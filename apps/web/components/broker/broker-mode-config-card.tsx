import type { BrokerModeConfig } from '@repo/agents';
import { Card } from '../ui/card';

type Props = {
  config: BrokerModeConfig;
  tier: number;
};

function formatPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function formatUsd(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function BrokerModeConfigCard({ config, tier }: Props) {
  const isLive = config.executionTarget === 'live';
  const isEnabled = config.enabled;
  const statusLabel = !isEnabled ? 'Disabled' : isLive ? 'Live — not active' : 'Simulation';
  const statusTone = !isEnabled ? 'info' : isLive ? 'warning' : 'success';

  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Mode {tier}</div>
          <h3>{config.label}</h3>
          <p>
            {config.requireHumanApproval
              ? 'Every order requires manual confirmation before execution.'
              : config.executionTarget === 'simulation'
                ? 'Autonomous execution within simulation guardrails.'
                : 'Autonomous live execution — requires verified account and broker connection.'}
          </p>
        </div>
        <span className={`status-pill status-pill--${statusTone}`}>{statusLabel}</span>
      </div>

      <div className="analytics-card__body">
        <div className="section__eyebrow" style={{ marginBottom: '0.5rem' }}>Capital</div>
        <ul>
          <li>Max absolute: {formatUsd(config.capital.maxAbsolute)}</li>
          <li>Max % of cash: {formatPercent(config.capital.maxPercentOfCash)}</li>
          <li>Max per trade: {formatUsd(config.capital.maxPerTrade)}</li>
          {config.capital.microTradingBudget !== undefined && (
            <li>Micro-trade budget: {formatUsd(config.capital.microTradingBudget)}</li>
          )}
        </ul>

        <div className="section__eyebrow" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Risk guardrails</div>
        <ul>
          <li>Max positions: {config.risk.maxOpenPositions}</li>
          <li>Max position size: {formatPercent(config.risk.maxPositionPercent)}</li>
          <li>Daily loss circuit: {formatPercent(config.risk.maxDailyLossPercent)}</li>
          <li>Drawdown circuit: {formatPercent(config.risk.maxDrawdownPercent)}</li>
          <li>Min signal confidence: {formatPercent(config.risk.minSignalConfidence)}</li>
          {config.risk.maxVolatilityZScore !== undefined && (
            <li>Max volatility z-score: {config.risk.maxVolatilityZScore.toFixed(1)}</li>
          )}
        </ul>

        <div className="section__eyebrow" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Trading rules</div>
        <ul>
          <li>Max orders / day: {config.trading.maxOrdersPerDay}</li>
          <li>Cooldown: {config.trading.cooldownMinutes} min</li>
          <li>Scaling in: {config.trading.allowScalingIn ? 'Allowed' : 'Blocked'}</li>
          <li>Overnight: {config.trading.allowOvernight ? 'Allowed' : 'Blocked'}</li>
          <li>Weekend crypto: {config.trading.allowWeekendCrypto ? 'Allowed' : 'Blocked'}</li>
        </ul>

        <div className="section__eyebrow" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Requirements</div>
        <ul>
          <li>Verified user: {config.requiresVerifiedUser ? 'Required' : 'Not required'}</li>
          <li>Human approval: {config.requireHumanApproval ? 'Required' : 'Not required'}</li>
          <li>Execution target: {config.executionTarget}</li>
          <li>Allowed assets: {config.allowedAssetKinds.join(', ')}</li>
          {config.approvals.requireHealthyBrokerConnection && (
            <li>Broker connection: Required</li>
          )}
        </ul>
      </div>
    </Card>
  );
}
