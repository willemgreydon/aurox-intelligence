import { z } from 'zod';

export const simulationAssetClassSchema = z.enum(['stock', 'etf', 'crypto']);
export const simulationOrderSideSchema = z.enum(['buy', 'sell']);
export const simulationOrderStatusSchema = z.enum(['filled', 'rejected', 'cancelled']);
export const simulationTransactionTypeSchema = z.enum(['initial_funding', 'buy', 'sell', 'reset']);
export const simulationLaneIdSchema = z.enum([
  'manual_stock_lane',
  'manual_multi_asset_lane',
  'ai_copilot_lane',
  'signal_follow_lane',
  'agent_sandbox_lane',
]);
export const simulationLaneModeSchema = z.enum(['manual', 'ai-assisted', 'strategy']);
export const simulationSessionStatusSchema = z.enum([
  'draft',
  'starting',
  'running',
  'paused',
  'stopping',
  'stopped',
  'completed',
  'failed',
]);
export const simulationObservationStatusSchema = z.enum(['idle', 'warming', 'watching', 'degraded', 'error']);
export const simulationAssetScopeSchema = z.enum(['stock', 'etf', 'crypto', 'multi-asset']);

export const simulationExecutionModelSchema = z.object({
  feeBps: z.number().min(0).max(5000).default(0),
  slippageBps: z.number().min(0).max(5000).default(0),
  latencyMs: z.number().int().min(0).max(60_000).default(0),
  venue: z.string().max(40).default('simulation_engine'),
});

export const simulationExecutionRecordSchema = z.object({
  executionId: z.string(),
  requestedPrice: z.number(),
  executionPrice: z.number(),
  slippageAmount: z.number(),
  slippageBps: z.number(),
  feeAmount: z.number(),
  notionalAmount: z.number(),
  latencyMs: z.number().int().nonnegative(),
  validationHash: z.string(),
  venue: z.string(),
  model: simulationExecutionModelSchema,
  recordedAt: z.string(),
});

export const simulationExecutionInputSchema = z.object({
  userId: z.string().min(1),
  assetId: z.string().min(1),
  symbol: z.string().min(1),
  assetClass: simulationAssetClassSchema,
  side: simulationOrderSideSchema,
  quantity: z.number().positive().max(1_000_000),
  executionPrice: z.number().positive(),
  requestedPrice: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().max(64).optional(),
  executionModel: simulationExecutionModelSchema.partial().optional(),
});

export const simulationAccountSummarySchema = z.object({
  accountId: z.string(),
  portfolioId: z.string(),
  currency: z.literal('USD'),
  initialCashBalance: z.number(),
  cashBalance: z.number(),
  reservedCash: z.number(),
  availableCash: z.number(),
  investedCapital: z.number(),
  portfolioValue: z.number(),
  equityValue: z.number(),
  unrealizedPnl: z.number(),
  realizedPnl: z.number(),
  buyingPower: z.number(),
  activeInvestmentCount: z.number().int().nonnegative(),
  closedInvestmentCount: z.number().int().nonnegative(),
  positionCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const simulationPositionSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  symbol: z.string(),
  assetClass: simulationAssetClassSchema,
  quantity: z.number(),
  averageCost: z.number(),
  marketPrice: z.number().nullable(),
  marketValue: z.number(),
  costBasis: z.number(),
  unrealizedPnl: z.number(),
  realizedPnl: z.number(),
  openedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  updatedAt: z.string(),
});

export const simulationOrderSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  symbol: z.string(),
  assetClass: simulationAssetClassSchema,
  side: simulationOrderSideSchema,
  status: simulationOrderStatusSchema,
  quantity: z.number(),
  requestedPrice: z.number(),
  executedPrice: z.number(),
  grossAmount: z.number(),
  cashEffect: z.number(),
  realizedPnl: z.number(),
  notes: z.string().nullable(),
  executionRecord: simulationExecutionRecordSchema.nullable().optional(),
  createdAt: z.string(),
  executedAt: z.string(),
});

export const simulationTransactionSchema = z.object({
  id: z.string(),
  orderId: z.string().nullable(),
  positionId: z.string().nullable(),
  transactionType: simulationTransactionTypeSchema,
  assetId: z.string().nullable(),
  symbol: z.string().nullable(),
  assetClass: simulationAssetClassSchema.nullable(),
  quantity: z.number().nullable(),
  price: z.number().nullable(),
  grossAmount: z.number(),
  feeAmount: z.number(),
  cashDelta: z.number(),
  realizedPnl: z.number(),
  description: z.string(),
  createdAt: z.string(),
});

export const simulationSnapshotSchema = z.object({
  id: z.string(),
  cashBalance: z.number(),
  marketValue: z.number(),
  equityValue: z.number(),
  unrealizedPnl: z.number(),
  realizedPnl: z.number(),
  positionCount: z.number().int().nonnegative(),
  takenAt: z.string(),
});

export const simulationWorkspaceSchema = z.object({
  summary: simulationAccountSummarySchema,
  positions: z.array(simulationPositionSchema),
  closedPositions: z.array(simulationPositionSchema),
  orders: z.array(simulationOrderSchema),
  transactions: z.array(simulationTransactionSchema),
  snapshots: z.array(simulationSnapshotSchema),
});

export const simulationSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  laneId: simulationLaneIdSchema,
  laneMode: simulationLaneModeSchema,
  status: simulationSessionStatusSchema,
  observationStatus: simulationObservationStatusSchema,
  observationMessage: z.string().nullable(),
  assetScope: simulationAssetScopeSchema,
  maxCapitalUsd: z.number().nonnegative(),
  microAllocationPercent: z.number().min(0).max(100),
  decisionSource: z.enum(['manual_ui', 'ai_assisted', 'automation']),
  lastHeartbeatAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  pausedAt: z.string().nullable(),
  stoppedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  failedAt: z.string().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastOpenedAt: z.string().nullable(),
});

export const simulationOrderErrorCodeSchema = z.enum([
  'INSUFFICIENT_CASH',
  'INSUFFICIENT_POSITION',
  'NO_POSITION_TO_SELL',
  'ZERO_QUANTITY',
  'MARKET_DATA_UNAVAILABLE',
  'NO_ACTIVE_SESSION',
  'POSITION_STATE_CHANGED',
  'LANE_MISMATCH',
  'UNSUPPORTED_ASSET_CLASS',
  'SCOPE_MISMATCH',
  'VALIDATION_ERROR',
  'INTERNAL_ERROR',
]);

export type SimulationOrderErrorCode = z.infer<typeof simulationOrderErrorCodeSchema>;

export type SimulationAssetClass = z.infer<typeof simulationAssetClassSchema>;
export type SimulationOrderSide = z.infer<typeof simulationOrderSideSchema>;
export type SimulationOrderStatus = z.infer<typeof simulationOrderStatusSchema>;
export type SimulationTransactionType = z.infer<typeof simulationTransactionTypeSchema>;
export type SimulationLaneId = z.infer<typeof simulationLaneIdSchema>;
export type SimulationLaneMode = z.infer<typeof simulationLaneModeSchema>;
export type SimulationSessionStatus = z.infer<typeof simulationSessionStatusSchema>;
export type SimulationObservationStatus = z.infer<typeof simulationObservationStatusSchema>;
export type SimulationAssetScope = z.infer<typeof simulationAssetScopeSchema>;
export type SimulationExecutionModel = z.infer<typeof simulationExecutionModelSchema>;
export type SimulationExecutionRecord = z.infer<typeof simulationExecutionRecordSchema>;
export type SimulationExecutionInput = z.infer<typeof simulationExecutionInputSchema>;
export type SimulationAccountSummary = z.infer<typeof simulationAccountSummarySchema>;
export type SimulationPosition = z.infer<typeof simulationPositionSchema>;
export type SimulationOrder = z.infer<typeof simulationOrderSchema>;
export type SimulationTransaction = z.infer<typeof simulationTransactionSchema>;
export type SimulationSnapshot = z.infer<typeof simulationSnapshotSchema>;
export type SimulationWorkspace = z.infer<typeof simulationWorkspaceSchema>;
export type SimulationSession = z.infer<typeof simulationSessionSchema>;
