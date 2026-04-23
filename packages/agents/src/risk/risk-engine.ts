export interface RiskConfig {
  maxPositionSize: number;
  maxExposure: number;
  maxDrawdown: number;
}

export interface PortfolioState {
  equity: number;
  exposure: number;
  drawdown: number;
}

export function checkRisk(
  config: RiskConfig,
  portfolio: PortfolioState,
  orderSize: number
) {
  if (orderSize > config.maxPositionSize) {
    return { ok: false, reason: "Position too large" };
  }

  if (portfolio.exposure + orderSize > config.maxExposure) {
    return { ok: false, reason: "Exposure exceeded" };
  }

  if (portfolio.drawdown > config.maxDrawdown) {
    return { ok: false, reason: "Drawdown limit reached" };
  }

  return { ok: true };
}