import { describe, expect, it } from 'vitest';
import {
  SIMULATION_LANE_DEFINITIONS,
  getSimulationLaneDefinition,
  perOrderMicroAllocationUsd,
} from './simulation-lane-catalog';

describe('simulation lane catalog', () => {
  it('exposes all five canonical lanes', () => {
    expect(SIMULATION_LANE_DEFINITIONS).toHaveLength(5);
    expect(SIMULATION_LANE_DEFINITIONS.map((lane) => lane.id)).toEqual([
      'manual_stock_lane',
      'manual_multi_asset_lane',
      'ai_copilot_lane',
      'signal_follow_lane',
      'agent_sandbox_lane',
    ]);
  });

  it('resolves a known lane and returns null for an unknown id', () => {
    expect(getSimulationLaneDefinition('manual_stock_lane')?.status).toBe('active');
    // @ts-expect-error - exercising the null path with an invalid id
    expect(getSimulationLaneDefinition('nope')).toBeNull();
  });

  it('manual multi-asset lane declares multi-asset scope; stock lane is stock-only', () => {
    expect(getSimulationLaneDefinition('manual_stock_lane')?.assetScopeOptions).toEqual(['stock']);
    expect(getSimulationLaneDefinition('manual_multi_asset_lane')?.assetScopeOptions).toContain('multi-asset');
  });

  it('per-order micro-allocation matches the documented formula (maxCapital × %)', () => {
    // The user scenario: $50,000 max capital, 1% micro-allocation → $500 per order.
    expect(perOrderMicroAllocationUsd(50000, 1)).toBe(500);
    expect(perOrderMicroAllocationUsd(50000, 8)).toBe(4000);
  });

  it('clamps micro-allocation inputs defensively', () => {
    expect(perOrderMicroAllocationUsd(-100, 5)).toBe(0);
    expect(perOrderMicroAllocationUsd(1000, -5)).toBe(0);
    expect(perOrderMicroAllocationUsd(1000, 250)).toBe(1000);
  });
});
