import {
  executeSimulationOrder,
  getSimulationWorkspaceIfExists,
  getLatestMarketQuoteSnapshot,
  getCatalogAssetBySymbol,
} from '@repo/db';
import {
  createSimulationBrokerAdapter,
  runUnifiedTradeWorkflow,
  buildManualTradeBundle,
  type BrokerModeConfig,
  type TradeIntentPayload,
  type AgentResult,
  type UnifiedTradeResult,
  type AgentContext,
  type TraceId,
  agentError,
} from '@repo/agents';
import { createLiveBrokerExecutionAdapter } from '../lib/brokers/live-execution-adapter';

function makeContext(userId: string, modeId: string): AgentContext {
  return {
    traceId: crypto.randomUUID() as TraceId,
    userId,
    accountId: userId,
    modeId,
    initiatedAt: new Date().toISOString(),
  };
}

async function loadFreshMarketPrice(symbol: string): Promise<number | null> {
  const snapshot = await getLatestMarketQuoteSnapshot(symbol);

  if (!snapshot) return null;
  if (typeof snapshot.price !== 'number') return null;
  if (!Number.isFinite(snapshot.price) || snapshot.price <= 0) return null;

  return snapshot.price;
}

async function resolveAssetId(symbol: string): Promise<string | null> {
  const asset = await getCatalogAssetBySymbol(symbol);
  return asset?.assetId ?? null;
}

export async function executeTradeForUser(
  intent: TradeIntentPayload,
  config: BrokerModeConfig,
  userId: string,
): Promise<AgentResult<UnifiedTradeResult>> {
  const context = makeContext(userId, config.id);
  const confidence = intent.confidence ?? 0.5;
  const bundle = buildManualTradeBundle(
    intent.symbol,
    intent.assetKind,
    intent.side,
    confidence,
  );

  const adapter =
    config.executionTarget === 'simulation'
      ? createSimulationBrokerAdapter({
          submitOrder: executeSimulationOrder,
        })
      : createLiveBrokerExecutionAdapter(config);

  if (config.executionTarget === 'live' && intent.source === 'ai_autonomous') {
    return agentError(
      'Autonomous live execution is not enabled in this patch. Use manual or ai_suggested flows first.',
      'LIVE_AUTONOMOUS_DISABLED',
    );
  }

  return runUnifiedTradeWorkflow(intent, config, bundle, context, adapter, {
    loadWorkspace: getSimulationWorkspaceIfExists,
    loadMarketPrice: loadFreshMarketPrice,
    resolveAssetId,
  });
}