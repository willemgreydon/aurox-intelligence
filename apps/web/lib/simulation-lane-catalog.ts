import type { SimulationLaneId, SimulationLaneMode } from '@repo/api-contracts';

/**
 * Canonical, server/client-safe catalog of simulation lanes.
 *
 * This is the single source of truth for lane presentation metadata (label,
 * status, capital share, micro-allocation default, asset scopes). It intentionally
 * contains NO I/O and NO 'use client' directive so it can be imported by both the
 * client launchpad and server-side lane-detail service without drift.
 *
 * Financial-safety note: lanes are configuration wrappers around the simulation
 * account. They do not isolate capital, positions, or PnL at the persistence
 * layer — those are portfolio-scoped. Any per-lane number derived elsewhere must
 * be labelled accordingly.
 */

export type SimulationLaneStatus = 'active' | 'limited' | 'planned';
export type SimulationLaneAssetScope = 'stock' | 'etf' | 'crypto' | 'multi-asset';

export type SimulationLaneDefinition = {
  id: SimulationLaneId;
  label: string;
  mode: SimulationLaneMode;
  status: SimulationLaneStatus;
  description: string;
  /** Fraction of base simulation capital this lane defaults to (0.5 = 50%). */
  defaultCapitalShare: number;
  /** Default per-order micro-allocation ratio (0.08 = 8%). Configuration only. */
  defaultMicroRatio: number;
  assetScopeOptions: SimulationLaneAssetScope[];
  supportNote: string;
};

export const SIMULATION_LANE_DEFINITIONS: SimulationLaneDefinition[] = [
  {
    id: 'manual_stock_lane',
    label: 'Manual stock lane',
    mode: 'manual',
    status: 'active',
    description: 'Direct workstation-driven paper trading with explicit buy and sell actions.',
    defaultCapitalShare: 0.5,
    defaultMicroRatio: 0.08,
    assetScopeOptions: ['stock'],
    supportNote: 'Fully supported in simulation for stocks.',
  },
  {
    id: 'manual_multi_asset_lane',
    label: 'Manual multi-asset lane',
    mode: 'manual',
    status: 'limited',
    description: 'Manual lane prepared for cross-asset simulation workflows.',
    defaultCapitalShare: 0.25,
    defaultMicroRatio: 0.05,
    assetScopeOptions: ['multi-asset', 'stock', 'etf', 'crypto'],
    supportNote: 'Stock simulation works now. ETF and crypto execution remain browse-only.',
  },
  {
    id: 'ai_copilot_lane',
    label: 'AI copilot lane',
    mode: 'ai-assisted',
    status: 'planned',
    description: 'Assistant-guided paper trading with human confirmation at every step.',
    defaultCapitalShare: 0.15,
    defaultMicroRatio: 0.03,
    assetScopeOptions: ['stock', 'etf', 'crypto'],
    supportNote: 'Planned only. No autonomous order execution.',
  },
  {
    id: 'signal_follow_lane',
    label: 'Signal-follow lane',
    mode: 'strategy',
    status: 'planned',
    description: 'Strategy bucket that mirrors selected internal signal packs in simulation.',
    defaultCapitalShare: 0.07,
    defaultMicroRatio: 0.02,
    assetScopeOptions: ['stock', 'etf'],
    supportNote: 'Planned only. Requires strategy and controls rollout.',
  },
  {
    id: 'agent_sandbox_lane',
    label: 'Broker-agent sandbox',
    mode: 'strategy',
    status: 'planned',
    description: 'Future agentic simulation lane for broker-like orchestration research.',
    defaultCapitalShare: 0.03,
    defaultMicroRatio: 0.01,
    assetScopeOptions: ['multi-asset', 'stock', 'etf', 'crypto'],
    supportNote: 'Planned only. Simulation safety boundary remains enforced.',
  },
];

export function getSimulationLaneDefinition(
  laneId: SimulationLaneId,
): SimulationLaneDefinition | null {
  return SIMULATION_LANE_DEFINITIONS.find((lane) => lane.id === laneId) ?? null;
}

/**
 * The per-order micro-allocation is a CAP on how much of the lane's max capital a
 * single simulated order may draw, expressed as a percent of max capital. It is
 * NOT a turnover/rotation limit despite legacy "rotation" labelling, and it is
 * currently a configuration value surfaced for transparency — it is not enforced
 * at execution time in the current simulation engine.
 */
export function perOrderMicroAllocationUsd(
  maxCapitalUsd: number,
  microAllocationPercent: number,
): number {
  const capital = Math.max(0, maxCapitalUsd);
  const percent = Math.min(100, Math.max(0, microAllocationPercent));
  return Math.round(((capital * percent) / 100 + Number.EPSILON) * 100) / 100;
}
