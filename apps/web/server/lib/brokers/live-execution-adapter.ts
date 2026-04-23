import {
  agentError,
  agentOk,
  type AgentContext,
  type AgentResult,
  type BrokerExecutionAdapter,
  type BrokerModeConfig,
  type ExecutionOrderRequest,
  type ExecutionOrderResult,
} from '@repo/agents';
import {
  canUseLiveExecutionForMode,
  getBrokerEnv,
} from '../../env/broker-env';
import { placeBinanceMarketOrder } from './binance-execution-client';
import { placeCoinbaseMarketOrder } from './coinbase-execution-client';

function makeClientOrderId(input: {
  traceId?: string;
  symbol: string;
  side: 'buy' | 'sell';
}): string {
  const trace = (input.traceId ?? crypto.randomUUID()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  const symbol = input.symbol.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  const side = input.side.toUpperCase();
  return `${symbol}-${side}-${trace}`.slice(0, 36);
}

export function createLiveBrokerExecutionAdapter(
  config: BrokerModeConfig,
): BrokerExecutionAdapter {
  const env = getBrokerEnv();

  return {
    executionTarget: 'live',
    async submitOrder(
      request: ExecutionOrderRequest,
      context: AgentContext,
    ): Promise<AgentResult<ExecutionOrderResult>> {
      if (!canUseLiveExecutionForMode(config.id)) {
        return agentError(
          `Live execution is not enabled for mode ${config.id}.`,
          'LIVE_MODE_NOT_ALLOWED',
        );
      }

      if (env.BROKER_EXECUTION_PROVIDER === 'simulation') {
        return agentError(
          'BROKER_EXECUTION_PROVIDER is still set to simulation.',
          'LIVE_PROVIDER_NOT_CONFIGURED',
        );
      }

      if (request.assetKind !== 'crypto') {
        return agentError(
          'Current live broker integration is limited to crypto assets only.',
          'LIVE_ASSET_KIND_UNSUPPORTED',
        );
      }

      const clientOrderId = makeClientOrderId({
        traceId: context.traceId,
        symbol: request.symbol,
        side: request.side,
      });

      try {
        if (env.BROKER_EXECUTION_PROVIDER === 'binance') {
          const brokerResult = await placeBinanceMarketOrder(
            {
              symbol: request.symbol,
              side: request.side,
              quantity: request.quantity,
              clientOrderId,
            },
            request.requestedPrice,
          );

          return agentOk({
            orderId: brokerResult.orderId,
            symbol: brokerResult.symbol,
            side: brokerResult.side,
            quantity: brokerResult.executedQuantity,
            executionPrice: brokerResult.executedPrice,
            requestedPrice: brokerResult.requestedPrice,
            executionTarget: 'live',
            filledAt: new Date(brokerResult.filledAt),
            status: brokerResult.status,
          });
        }

        if (env.BROKER_EXECUTION_PROVIDER === 'coinbase') {
          const brokerResult = await placeCoinbaseMarketOrder(
            {
              symbol: request.symbol,
              side: request.side,
              quantity: request.quantity,
              clientOrderId,
            },
            request.requestedPrice,
          );

          return agentOk({
            orderId: brokerResult.orderId,
            symbol: brokerResult.symbol,
            side: brokerResult.side,
            quantity: brokerResult.executedQuantity,
            executionPrice: brokerResult.executedPrice,
            requestedPrice: brokerResult.requestedPrice,
            executionTarget: 'live',
            filledAt: new Date(brokerResult.filledAt),
            status: brokerResult.status,
          });
        }

        return agentError(
          `Unsupported broker provider: ${env.BROKER_EXECUTION_PROVIDER satisfies never}`,
          'LIVE_PROVIDER_UNSUPPORTED',
        );
      } catch (error) {
        return agentError(
          error instanceof Error ? error.message : 'Live broker submission failed.',
          'LIVE_ORDER_SUBMIT_FAILED',
        );
      }
    },
  };
}