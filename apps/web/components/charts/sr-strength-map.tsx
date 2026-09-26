import type { StructureMapVM } from '../../server/mappers/candle-intelligence-mapper';

/**
 * Support / Resistance Strength Map — the nearest deterministic S/R levels from
 * the candle-intelligence market-structure engine, positioned around the current
 * price with a strength read (touch count) and distance. Answers "where is the
 * nearest structure, how strong is it, and how far away?" Server component.
 */

function fmtPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

function strengthLabel(touches: number): string {
  if (touches >= 4) return 'Strong';
  if (touches >= 2) return 'Moderate';
  return 'Weak';
}

function strengthDots(touches: number): string {
  const filled = Math.min(5, Math.max(1, touches));
  return '●'.repeat(filled) + '○'.repeat(5 - filled);
}

export function SRStrengthMap({ structure }: { structure: StructureMapVM }) {
  if (!structure.support && !structure.resistance) return null;

  return (
    <div className="srmap" role="group" aria-label="Support and resistance levels">
      {structure.resistance ? (
        <div className="srmap__level srmap__level--resistance">
          <div className="srmap__head">
            <span className="srmap__kind">Resistance</span>
            <span className="srmap__strength-label">{strengthLabel(structure.resistance.touches)}</span>
          </div>
          <span className="srmap__price">{fmtPrice(structure.resistance.price)}</span>
          <span className="srmap__strength" title={`${structure.resistance.touches} touches`} aria-label={`${structure.resistance.touches} touches`}>
            {strengthDots(structure.resistance.touches)}
          </span>
          <span className="srmap__dist">{(structure.resistance.distancePct * 100).toFixed(1)}% above</span>
        </div>
      ) : null}

      {structure.currentPrice !== null ? (
        <div className="srmap__level srmap__level--current">
          <span className="srmap__kind">Current price</span>
          <span className="srmap__price">{fmtPrice(structure.currentPrice)}</span>
        </div>
      ) : null}

      {structure.support ? (
        <div className="srmap__level srmap__level--support">
          <div className="srmap__head">
            <span className="srmap__kind">Support</span>
            <span className="srmap__strength-label">{strengthLabel(structure.support.touches)}</span>
          </div>
          <span className="srmap__price">{fmtPrice(structure.support.price)}</span>
          <span className="srmap__strength" title={`${structure.support.touches} touches`} aria-label={`${structure.support.touches} touches`}>
            {strengthDots(structure.support.touches)}
          </span>
          <span className="srmap__dist">{Math.abs(structure.support.distancePct * 100).toFixed(1)}% below</span>
        </div>
      ) : null}
    </div>
  );
}
