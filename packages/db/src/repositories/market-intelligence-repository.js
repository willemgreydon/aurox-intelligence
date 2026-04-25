import { marketInsightSummarySchema } from '@repo/api-contracts';
import { createDatabaseClient } from '../client';
const marketIntelligenceInsightsTable = 'market_intelligence_insights';
function isMissingMarketIntelligenceSchemaError(error) {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
        return false;
    }
    const databaseError = error;
    return databaseError.code === '42P01' || databaseError.code === '42703';
}
export async function saveMarketIntelligenceBatch(insights) {
    const parsed = insights.map((insight) => marketInsightSummarySchema.parse(insight));
    const client = createDatabaseClient();
    if (!client.isConfigured) {
        return {
            ok: true,
            persisted: false,
            count: parsed.length,
            detail: 'DATABASE_URL is not configured, so market intelligence insights were not persisted.',
        };
    }
    try {
        await client.transaction(async (transactionClient) => {
            for (const insight of parsed) {
                await transactionClient.execute(`
            insert into ${marketIntelligenceInsightsTable} (
              asset_id,
              symbol,
              headline,
              summary,
              stance,
              confidence_score,
              what_changed,
              factors,
              risk_flags,
              provenance,
              generated_at
            ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11)
          `, [
                    insight.assetId,
                    insight.symbol,
                    insight.headline,
                    insight.summary,
                    insight.stance,
                    insight.confidence,
                    insight.whatChanged,
                    JSON.stringify(insight.factors),
                    JSON.stringify(insight.riskFlags),
                    JSON.stringify(insight.provenance),
                    insight.provenance.generatedAt,
                ]);
            }
        });
    }
    catch (error) {
        if (isMissingMarketIntelligenceSchemaError(error)) {
            return {
                ok: true,
                persisted: false,
                count: parsed.length,
                detail: 'Market intelligence table is not available yet; apply the latest database migrations first.',
            };
        }
        throw error;
    }
    return {
        ok: true,
        persisted: true,
        count: parsed.length,
        detail: 'Market intelligence insights were persisted to Postgres.',
    };
}
