import { createHash } from 'node:crypto';
import type { NewsArticleNormalized, NewsIntelligenceSnapshot, NewsIntelligenceEventType, MarketImpactHorizon } from '@repo/api-contracts';

type AssetRef = { assetId: string; symbol: string; assetClass: 'stock' | 'etf' | 'crypto' | 'macro' | 'other' };

type ExtractInput = {
  article: NewsArticleNormalized;
  assets: AssetRef[];
};

const EVENT_PATTERNS: Array<{ type: NewsIntelligenceEventType; matchers: RegExp[] }> = [
  { type: 'earnings', matchers: [/\bearnings\b/i, /\bquarterly results?\b/i] },
  { type: 'guidance', matchers: [/\bguidance\b/i, /\boutlook\b/i] },
  { type: 'revenue', matchers: [/\brevenue\b/i, /\bsales\b/i] },
  { type: 'profit', matchers: [/\bprofit\b/i, /\bnet income\b/i] },
  { type: 'margin', matchers: [/\bmargin\b/i] },
  { type: 'layoffs', matchers: [/\blayoffs?\b/i, /\bjob cuts?\b/i] },
  { type: 'product_launch', matchers: [/\bproduct launch\b/i, /\bunveiled\b/i, /\brelease\b/i] },
  { type: 'regulatory', matchers: [/\bregulator(y|s)\b/i, /\bprobe\b/i, /\bfine\b/i] },
  { type: 'lawsuit', matchers: [/\blawsuit\b/i, /\bsued\b/i, /\blegal action\b/i] },
  { type: 'analyst_rating', matchers: [/\bupgrade\b/i, /\bdowngrade\b/i, /\bprice target\b/i] },
  { type: 'merger_acquisition', matchers: [/\bmerger\b/i, /\bacquisition\b/i, /\bbuyout\b/i] },
  { type: 'macro_event', matchers: [/\bmacro\b/i, /\bgdp\b/i, /\bunemployment\b/i] },
  { type: 'inflation_rates', matchers: [/\binflation\b/i, /\brate hike\b/i, /\binterest rates?\b/i] },
  { type: 'etf_flow', matchers: [/\betf inflows?\b/i, /\betf outflows?\b/i, /\bflow data\b/i] },
  { type: 'crypto_exchange_event', matchers: [/\bexchange\b/i, /\bdelisting\b/i, /\blisting\b/i] },
  { type: 'on_chain_event', matchers: [/\bon-chain\b/i, /\bwallet\b/i, /\bstaking\b/i] },
  { type: 'security_breach', matchers: [/\bhack(ed|ing)?\b/i, /\bsecurity breach\b/i, /\bexploit\b/i] },
  { type: 'liquidity_event', matchers: [/\bliquidity\b/i, /\bfunding crunch\b/i] },
  { type: 'bankruptcy_default_risk', matchers: [/\bbankrupt(cy)?\b/i, /\bdefault\b/i, /\binsolvency\b/i] },
  { type: 'supply_chain', matchers: [/\bsupply chain\b/i, /\bshipment\b/i] },
  { type: 'management_change', matchers: [/\bceo\b/i, /\bexecutive change\b/i, /\bsteps down\b/i] },
];

const POSITIVE_PATTERNS = [/\bbeat(s|ing)?\b/i, /\bupgrade\b/i, /\bstrong\b/i, /\bgrowth\b/i, /\bapproval\b/i];
const NEGATIVE_PATTERNS = [/\bmiss(es|ed)?\b/i, /\bdowngrade\b/i, /\bfall(s|ing)?\b/i, /\bweak\b/i, /\bcut\b/i, /\bconcern\b/i];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function articleText(article: NewsArticleNormalized) {
  return `${article.title} ${article.summary ?? ''}`.trim();
}

function dedupe<T>(values: T[]) {
  return [...new Set(values)];
}

function sentimentScore(text: string) {
  const positive = POSITIVE_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const negative = NEGATIVE_PATTERNS.filter((pattern) => pattern.test(text)).length;
  if (positive === 0 && negative === 0) return 0;
  return clamp((positive - negative) / Math.max(positive + negative, 1), -1, 1);
}

function sentimentLabel(score: number): 'positive' | 'neutral' | 'negative' | 'mixed' {
  if (score >= 0.25) return 'positive';
  if (score <= -0.25) return 'negative';
  return 'neutral';
}

function extractEventTypes(text: string): NewsIntelligenceEventType[] {
  const events = EVENT_PATTERNS.filter((entry) => entry.matchers.some((pattern) => pattern.test(text))).map((entry) => entry.type);
  return dedupe(events);
}

function computeRiskScore(events: NewsIntelligenceEventType[], score: number) {
  let risk = 35;
  if (events.includes('security_breach')) risk += 35;
  if (events.includes('bankruptcy_default_risk')) risk += 35;
  if (events.includes('regulatory') || events.includes('lawsuit')) risk += 20;
  if (events.includes('layoffs') || events.includes('guidance')) risk += 10;
  if (score < -0.35) risk += 15;
  if (score > 0.35) risk -= 10;
  return clamp(risk, 0, 100);
}

function computeOpportunityScore(events: NewsIntelligenceEventType[], score: number) {
  let opportunity = 40;
  if (events.includes('earnings') || events.includes('product_launch')) opportunity += 20;
  if (events.includes('analyst_rating') || events.includes('etf_flow')) opportunity += 10;
  if (events.includes('security_breach') || events.includes('bankruptcy_default_risk')) opportunity -= 25;
  if (score > 0.35) opportunity += 15;
  if (score < -0.35) opportunity -= 15;
  return clamp(opportunity, 0, 100);
}

function horizonFromEvents(events: NewsIntelligenceEventType[]): MarketImpactHorizon {
  if (events.includes('security_breach') || events.includes('earnings')) return 'intraday';
  if (events.includes('regulatory') || events.includes('analyst_rating') || events.includes('etf_flow')) return 'short_term';
  if (events.includes('management_change') || events.includes('merger_acquisition')) return 'medium_term';
  if (events.includes('bankruptcy_default_risk') || events.includes('supply_chain')) return 'long_term';
  return 'unknown';
}

function recencyUrgency(publishedAt: string) {
  const ageHours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 3_600_000);
  if (ageHours <= 2) return 0.95;
  if (ageHours <= 12) return 0.8;
  if (ageHours <= 24) return 0.65;
  if (ageHours <= 72) return 0.45;
  return 0.2;
}

function relevanceForAssets(article: NewsArticleNormalized, assets: AssetRef[]) {
  if (article.symbols.length === 0) return 0.2;
  const symbolSet = new Set(article.symbols.map((symbol) => symbol.toUpperCase()));
  const matched = assets.filter((asset) => symbolSet.has(asset.symbol.toUpperCase())).length;
  return clamp(matched > 0 ? 0.7 + matched * 0.08 : 0.35, 0, 1);
}

export function buildContentHash(article: { title: string; url: string; sourceName: string; publishedAt: string }) {
  return createHash('sha256')
    .update(`${article.title}|${article.url}|${article.sourceName}|${article.publishedAt}`)
    .digest('hex');
}

export function extractNewsIntelligenceSnapshot(input: ExtractInput): NewsIntelligenceSnapshot {
  const text = articleText(input.article);
  const events = extractEventTypes(text);
  const sentiment = sentimentScore(text);
  const relevance = relevanceForAssets(input.article, input.assets);
  const urgency = recencyUrgency(input.article.publishedAt);
  const novelty = clamp(events.length > 0 ? 0.65 + events.length * 0.04 : 0.35, 0, 1);
  const risk = computeRiskScore(events, sentiment);
  const opportunity = computeOpportunityScore(events, sentiment);
  const confidence = clamp(0.45 + relevance * 0.25 + urgency * 0.2 + novelty * 0.1, 0, 1);
  const entities = dedupe([
    ...input.article.symbols,
    ...text.match(/\b[A-Z]{2,6}\b/g) ?? [],
  ]).slice(0, 20);
  const topics = dedupe(events.map((event) => event.replace(/_/g, ' ')));
  const hints = [
    risk >= 75 ? 'Elevated news risk: tighten simulation exposure and verify guardrails.' : null,
    opportunity >= 70 ? 'Opportunity signal present: consider prepare-buy with strict limits.' : null,
    urgency >= 0.75 ? 'High urgency: prioritize operator review before next decision cycle.' : null,
  ].filter((item): item is string => Boolean(item));
  const explanation = [
    `Sentiment ${sentiment.toFixed(2)} with relevance ${(relevance * 100).toFixed(0)}%.`,
    `Detected events: ${events.length > 0 ? events.join(', ') : 'none'}.`,
    `Risk ${risk.toFixed(0)}/100 and opportunity ${opportunity.toFixed(0)}/100.`,
  ];

  return {
    id: '',
    articleId: input.article.id,
    provider: input.article.provider,
    contentHash: input.article.contentHash,
    symbols: input.article.symbols,
    assetIds: input.article.assetIds,
    assetClasses: input.article.assetClasses,
    entities,
    topics,
    eventTypes: events,
    sentimentScore: sentiment,
    sentimentLabel: sentimentLabel(sentiment),
    relevanceScore: relevance,
    urgencyScore: urgency,
    noveltyScore: novelty,
    riskScore: risk,
    opportunityScore: opportunity,
    confidence,
    marketImpactHorizon: horizonFromEvents(events),
    affectedSignals: events.some((event) => event === 'earnings' || event === 'guidance') ? ['momentum', 'quality'] : ['news'],
    affectedRiskFactors: risk >= 60 ? ['headline_risk', 'volatility_risk'] : ['headline_risk'],
    extractedIndicators: {
      eventCount: events.length,
      symbolCount: input.article.symbols.length,
      language: input.article.language,
    },
    decisionHints: hints,
    explanation,
    sourceUrl: input.article.url,
    sourceTitle: input.article.title,
    sourceName: input.article.sourceName,
    publishedAt: input.article.publishedAt,
    createdAt: new Date().toISOString(),
  };
}
