import { z } from 'zod';

export const assetKindSchema = z.enum(['stock', 'etf', 'crypto']);
export const orderSideSchema = z.enum(['buy', 'sell']);
export const intentSourceSchema = z.enum(['manual', 'ai_suggested', 'ai_autonomous']);
export const executionTargetSchema = z.enum(['simulation', 'live']);
export const sizingModeSchema = z.enum(['quantity', 'notional', 'risk_budget']);

export const orderStateSchema = z.enum([
  'draft',
  'proposed',
  'awaiting_user_approval',
  'rejected_by_policy',
  'rejected_by_risk',
  'approved',
  'submitted',
  'partially_filled',
  'filled',
  'cancelled',
  'expired',
  'failed',
  'reconciled',
]);

export const brokerModeCapitalSchema = z.object({
  maxAbsolute: z.number().positive(),
  maxPercentOfCash: z.number().min(0).max(1),
  maxPerTrade: z.number().positive(),
  microTradingBudget: z.number().positive().optional(),
});

export const brokerModeRiskSchema = z.object({
  maxPositionPercent: z.number().min(0).max(1),
  maxOpenPositions: z.number().int().positive(),
  maxDailyLossPercent: z.number().min(0).max(1),
  maxDrawdownPercent: z.number().min(0).max(1),
  minSignalConfidence: z.number().min(0).max(1),
  maxVolatilityZScore: z.number().positive().optional(),
});

export const brokerModeTradingSchema = z.object({
  allowScalingIn: z.boolean(),
  allowScalingOut: z.boolean(),
  allowOvernight: z.boolean(),
  allowWeekendCrypto: z.boolean(),
  maxOrdersPerDay: z.number().int().positive(),
  cooldownMinutes: z.number().int().nonnegative(),
});

export const brokerModeApprovalsSchema = z.object({
  requireFreshConsent: z.boolean(),
  requireHealthyBrokerConnection: z.boolean(),
  requireHealthyMarketData: z.boolean(),
});

export const brokerModeConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  enabled: z.boolean(),
  requiresVerifiedUser: z.boolean(),
  requireHumanApproval: z.boolean(),
  executionTarget: executionTargetSchema,
  allowedAssetKinds: z.array(assetKindSchema).min(1),
  capital: brokerModeCapitalSchema,
  risk: brokerModeRiskSchema,
  trading: brokerModeTradingSchema,
  approvals: brokerModeApprovalsSchema,
});

export const tradeIntentPayloadSchema = z.object({
  accountId: z.string().min(1),
  modeId: z.string().min(1),
  source: intentSourceSchema,
  symbol: z.string().min(1),
  assetKind: assetKindSchema,
  side: orderSideSchema,
  sizingMode: sizingModeSchema,
  quantity: z.number().positive().optional(),
  notional: z.number().positive().optional(),
  thesis: z.string().min(1).max(1000),
  confidence: z.number().min(0).max(1).optional(),
  strategyTag: z.string().optional(),
});

export const accountCapitalStateSchema = z.object({
  cashBalance: z.number().nonnegative(),
  usedCapitalToday: z.number().nonnegative(),
  openPositionCount: z.number().int().nonnegative(),
  currentDrawdownPercent: z.number().min(0).max(1),
  dailyLossPercent: z.number().min(0).max(1),
  ordersExecutedToday: z.number().int().nonnegative(),
  lastOrderAt: z.string().nullable(),
});

export type AssetKind = z.infer<typeof assetKindSchema>;
export type OrderSide = z.infer<typeof orderSideSchema>;
export type IntentSource = z.infer<typeof intentSourceSchema>;
export type ExecutionTarget = z.infer<typeof executionTargetSchema>;
export type SizingMode = z.infer<typeof sizingModeSchema>;
export type OrderState = z.infer<typeof orderStateSchema>;
export type BrokerModeCapital = z.infer<typeof brokerModeCapitalSchema>;
export type BrokerModeRisk = z.infer<typeof brokerModeRiskSchema>;
export type BrokerModeTrading = z.infer<typeof brokerModeTradingSchema>;
export type BrokerModeApprovals = z.infer<typeof brokerModeApprovalsSchema>;
export type BrokerModeConfig = z.infer<typeof brokerModeConfigSchema>;
export type TradeIntentPayload = z.infer<typeof tradeIntentPayloadSchema>;
export type AccountCapitalState = z.infer<typeof accountCapitalStateSchema>;
