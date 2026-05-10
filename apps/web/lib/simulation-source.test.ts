import { describe, expect, it } from 'vitest';
import { sanitizeSimulationSourceLabel } from './simulation-source';

describe('sanitizeSimulationSourceLabel', () => {
  it('maps manual_ui to Manual UI', () => {
    expect(sanitizeSimulationSourceLabel('manual_ui')).toBe('Manual UI');
  });

  it('maps stock-lane to Stock lane', () => {
    expect(sanitizeSimulationSourceLabel('stock-lane')).toBe('Stock lane');
  });

  it('strips malformed execution payload tails', () => {
    const input = 'manual_ui","executionRecord":{"executionId":"abc"}';
    expect(sanitizeSimulationSourceLabel(input)).toBe('Manual UI');
  });

  it('handles object inputs safely', () => {
    expect(sanitizeSimulationSourceLabel({ source: 'simulation_engine' })).toBe('Simulation engine');
  });

  it('falls back to Simulation', () => {
    expect(sanitizeSimulationSourceLabel('unknown_source_value')).toBe('Simulation');
  });
});

