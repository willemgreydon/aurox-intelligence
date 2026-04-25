import OpenAI from 'openai';
import type { AiSimulationAgentRequest } from '@repo/api-contracts';
import { getAiAgentEnv } from '../../env/ai-agent-env';

let client: OpenAI | null = null;

function getOpenAiClient(): OpenAI {
  if (client) return client;

  const env = getAiAgentEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured. AI simulation agent is unavailable.');
  }

  client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `You are a simulation-only trading assistant operating within the Aurox Intelligence platform.

Safety rules you must follow at all times:
1. You may ONLY propose fictive simulation trades. No real money is involved.
2. When uncertain, always output action: "HOLD".
3. You must not claim guaranteed profit or performance.
4. You must not recommend real-money execution.
5. You must explain your reasoning briefly.
6. The simulationOnly field must ALWAYS be set to true in your output.
7. You must never propose a trade that violates the capital caps provided.
8. If the ranked asset list is empty or market data is stale, default to HOLD.

Available actions:
- HOLD: Do nothing, wait for better conditions
- PROPOSE_BUY: Propose buying a simulated position (requires human confirmation)
- PROPOSE_SELL: Propose selling a simulated position (requires human confirmation)
- SIMULATED_BUY_REQUEST: Request autonomous simulated buy (only in autonomous_simulation mode)
- SIMULATED_SELL_REQUEST: Request autonomous simulated sell (only in autonomous_simulation mode)

Required JSON output schema (output ONLY this JSON, no other text):
{
  "action": "HOLD" | "PROPOSE_BUY" | "PROPOSE_SELL" | "SIMULATED_BUY_REQUEST" | "SIMULATED_SELL_REQUEST",
  "symbol": string | null,
  "assetClass": "stock" | "etf" | "crypto" | null,
  "notional": number | null,
  "confidence": number (0.0 to 1.0),
  "reasoning": string,
  "riskNotes": string,
  "simulationOnly": true,
  "requiresHumanConfirmation": boolean,
  "rejectedReason": string | null,
  "proposedOrder": { "symbol": string, "assetClass": "stock"|"etf"|"crypto", "side": "buy"|"sell", "notional": number, "modeId": string } | null
}`;

function buildUserMessage(request: AiSimulationAgentRequest): string {
  const lines: string[] = [
    '# Simulation Agent Context',
    `Generated at: ${request.generatedAt}`,
    `Autonomy mode: ${request.autonomyMode}`,
    `Mode ID: ${request.modeId}`,
    '',
    '## Capital Caps (Fictive Cash Only)',
    `Max notional per trade: $${request.capSettings.maxNotionalPerTrade}`,
    `Max daily notional: $${request.capSettings.maxDailyNotional}`,
    `Max open exposure: $${request.capSettings.maxOpenExposure}`,
    '',
    '## Portfolio Summary',
    `Cash balance: $${request.portfolioSummary.cashBalance.toFixed(2)}`,
    `Available cash: $${request.portfolioSummary.availableCash.toFixed(2)}`,
    `Equity value: $${request.portfolioSummary.equityValue.toFixed(2)}`,
    `Open positions: ${request.portfolioSummary.openPositionCount}`,
    `Unrealized PnL: $${request.portfolioSummary.unrealizedPnl.toFixed(2)}`,
    `Realized PnL: $${request.portfolioSummary.realizedPnl.toFixed(2)}`,
  ];

  if (request.openPositions.length > 0) {
    lines.push('', '## Open Positions');
    for (const pos of request.openPositions) {
      lines.push(
        `- ${pos.symbol} (${pos.assetClass}): ${pos.quantity} units @ $${pos.averageCost.toFixed(2)} avg cost, market value $${pos.marketValue.toFixed(2)}, unrealized PnL $${pos.unrealizedPnl.toFixed(2)}`,
      );
    }
  } else {
    lines.push('', '## Open Positions: None');
  }

  if (request.rankedAssets.length > 0) {
    lines.push('', '## Ranked Assets (Top Opportunities)');
    for (const asset of request.rankedAssets.slice(0, 5)) {
      lines.push(
        `- ${asset.symbol} (${asset.assetKind}): score=${asset.score.toFixed(2)}, confidence=${asset.confidence.toFixed(2)}, recommendation=${asset.recommendation}`,
        `  Explanation: ${asset.explanation}`,
        `  Signal: ${asset.signalSummary}`,
        `  Risk: ${asset.riskSummary}`,
      );
    }
  } else {
    lines.push('', '## Ranked Assets: None available — prefer HOLD.');
  }

  lines.push(
    '',
    `Market data freshness: ${request.marketFreshnessNote}`,
    '',
    '## Instructions',
    'Analyze the above context and output a single JSON decision object. Default to HOLD if uncertain, if ranked assets are unavailable, or if market data is stale.',
  );

  return lines.join('\n');
}

export async function callOpenAiSimulationAgent(
  request: AiSimulationAgentRequest,
): Promise<unknown> {
  const openai = getOpenAiClient();
  const env = getAiAgentEnv();
  const model = env.OPENAI_SIM_AGENT_MODEL ?? 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(request) },
    ],
    temperature: 0.2,
    max_tokens: 512,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }

  return JSON.parse(content);
}
