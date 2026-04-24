import type { getSimulationWorkspace } from '@repo/db';

export type SimulationActivityLane = {
  id: string;
  label: string;
  mode: 'manual' | 'ai-assisted' | 'strategy';
  status: 'active' | 'limited' | 'planned';
  capitalLimit: number;
  allocatedCapital: number;
  availableCapital: number;
  activePositions: number;
  recentOrders: number;
  note: string;
};

type DecisionContext = {
  laneId: string | null;
  source: string | null;
};

function parseDecisionContext(notes: string | null | undefined): DecisionContext {
  if (!notes) {
    return { laneId: null, source: null };
  }

  const pairs = notes
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [key, ...rest] = chunk.split('=');
      return [key?.trim(), rest.join('=').trim()] as const;
    });

  const values = new Map<string, string>();

  for (const [key, value] of pairs) {
    if (!key || !value) {
      continue;
    }

    values.set(key, value);
  }

  return {
    laneId: values.get('lane') ?? null,
    source: values.get('source') ?? null,
  };
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function buildSimulationActivityLanes(workspace: Awaited<ReturnType<typeof getSimulationWorkspace>>): SimulationActivityLane[] {
  const manualCapitalLimit = roundCurrency(workspace.summary.initialCashBalance * 0.5);
  const manualAllocatedCapital = roundCurrency(
    Math.min(workspace.summary.investedCapital, manualCapitalLimit),
  );
  const ordersWithContext = workspace.orders.map((order) => ({
    order,
    context: parseDecisionContext(order.notes),
  }));
  const laneOrderCount = {
    manualStock: ordersWithContext.filter((entry) => entry.context.laneId === 'manual_stock_lane').length,
    manualMultiAsset: ordersWithContext.filter((entry) => entry.context.laneId === 'manual_multi_asset_lane').length,
    aiCopilot: ordersWithContext.filter((entry) => entry.context.laneId === 'ai_copilot_lane').length,
    signalFollow: ordersWithContext.filter((entry) => entry.context.laneId === 'signal_follow_lane').length,
    agentSandbox: ordersWithContext.filter((entry) => entry.context.laneId === 'agent_sandbox_lane').length,
  };
  const fallbackManualStockOrders = workspace.orders.filter((order) => order.assetClass === 'stock').length;
  const manualRecentOrders = laneOrderCount.manualStock || fallbackManualStockOrders;
  const diversifiedCapitalLimit = roundCurrency(workspace.summary.initialCashBalance * 0.25);

  return [
    {
      id: 'manual-core',
      label: 'Manual stock lane',
      mode: 'manual',
      status: 'active',
      capitalLimit: manualCapitalLimit,
      allocatedCapital: manualAllocatedCapital,
      availableCapital: roundCurrency(Math.max(0, manualCapitalLimit - manualAllocatedCapital)),
      activePositions: workspace.positions.length,
      recentOrders: manualRecentOrders,
      note: 'Manual stock simulation is active. Stock orders are executed with deterministic accounting, auditable history, and lane-tagged order context.',
    },
    {
      id: 'manual-multi',
      label: 'Manual multi-asset lane',
      mode: 'manual',
      status: 'limited',
      capitalLimit: diversifiedCapitalLimit,
      allocatedCapital: 0,
      availableCapital: diversifiedCapitalLimit,
      activePositions: 0,
      recentOrders: laneOrderCount.manualMultiAsset,
      note: 'Manual lane prepared for cross-asset simulation workflows. Stock simulation works now. ETF and crypto execution remain browse-only unless explicitly enabled by implementation.',
    },
    {
      id: 'ai-assist',
      label: 'AI-assisted lane',
      mode: 'ai-assisted',
      status: 'planned',
      capitalLimit: roundCurrency(workspace.summary.initialCashBalance * 0.15),
      allocatedCapital: 0,
      availableCapital: roundCurrency(workspace.summary.initialCashBalance * 0.15),
      activePositions: 0,
      recentOrders: laneOrderCount.aiCopilot,
      note: 'Planned only. Assistant-guided paper trading with human confirmation at every step. No autonomous order execution is enabled.',
    },
    {
      id: 'signal-follow',
      label: 'Signal-follow lane',
      mode: 'strategy',
      status: 'planned',
      capitalLimit: roundCurrency(workspace.summary.initialCashBalance * 0.07),
      allocatedCapital: 0,
      availableCapital: roundCurrency(workspace.summary.initialCashBalance * 0.07),
      activePositions: 0,
      recentOrders: laneOrderCount.signalFollow,
      note: 'Planned only. Strategy bucket that mirrors selected internal signal packs in simulation. Requires strategy controls and signal pack rollout before activation.',
    },
    {
      id: 'agent-sandbox',
      label: 'Broker-agent sandbox',
      mode: 'strategy',
      status: 'planned',
      capitalLimit: roundCurrency(workspace.summary.initialCashBalance * 0.03),
      allocatedCapital: 0,
      availableCapital: roundCurrency(workspace.summary.initialCashBalance * 0.03),
      activePositions: 0,
      recentOrders: laneOrderCount.agentSandbox,
      note: 'Planned only. Future agentic simulation lane for broker-like orchestration research. Simulation safety boundary remains enforced. No real execution.',
    },
  ];
}
