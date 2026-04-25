import { Card } from '../ui/card';

type TradeRiskOverlayProps = {
  maxPositionSizeSuggestion: number;
  estimatedVolatility: number;
  drawdownWarning: string | null;
  liquidityWarning: string | null;
  stopLossSuggestion: number;
  exposureImpactPercent: number;
  concentrationWarning: string | null;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
};

export function TradeRiskOverlay(props: TradeRiskOverlayProps) {
  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Trade risk overlay</div>
          <h3>{props.riskLevel} risk</h3>
          <p>Deterministic risk review before simulation execution.</p>
        </div>
      </div>
      <div className="analytics-card__body">
        <p>Max position suggestion: ${props.maxPositionSizeSuggestion.toFixed(2)}</p>
        <p>Estimated volatility: {(props.estimatedVolatility * 100).toFixed(2)}%</p>
        <p>Exposure impact: {props.exposureImpactPercent.toFixed(2)}%</p>
        <p>Stop-loss suggestion: ${props.stopLossSuggestion.toFixed(2)}</p>
        {props.drawdownWarning ? <p>{props.drawdownWarning}</p> : null}
        {props.liquidityWarning ? <p>{props.liquidityWarning}</p> : null}
        {props.concentrationWarning ? <p>{props.concentrationWarning}</p> : null}
      </div>
    </Card>
  );
}
