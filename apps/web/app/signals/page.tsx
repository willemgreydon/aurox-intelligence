import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { InsightCallout } from '../../components/analytics/insight-callout';
import { AnalysisToolbar } from '../../components/filters/analysis-toolbar';
import { SignalBreakdownPanel } from '../../components/signals/signal-breakdown-panel';
import { SignalScoreCard } from '../../components/signals/signal-score-card';
import { AnalyticsTable } from '../../components/tables/analytics-table';
import { Section } from '../../components/ui/section';
import type { TableColumn } from '../../lib/dashboard/analytics-fixtures';
import { getMessages } from '../../lib/i18n/messages';
import { getRequestLocale } from '../../server/i18n/locale';
import { getSignalsPageData } from '../../server/services/analysis-service';

export const dynamic = 'force-dynamic';

type SignalRow = {
  asset: string;
  interpretation: string;
  score: string;
  price: string;
  updated: string;
};

type HistoryRow = {
  timestamp: string;
  asset: string;
  score: string;
  confidence: string;
  decision: string;
  roi: string;
  outcome: string;
};

const signalColumns: Array<TableColumn<SignalRow>> = [
  { key: 'asset', label: 'Asset' },
  { key: 'interpretation', label: 'Interpretation' },
  { key: 'score', label: 'Score', align: 'right' },
  { key: 'price', label: 'Latest price', align: 'right' },
  { key: 'updated', label: 'Updated', align: 'right' },
];

const historyColumns: Array<TableColumn<HistoryRow>> = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'asset', label: 'Asset' },
  { key: 'score', label: 'Score', align: 'right' },
  { key: 'confidence', label: 'Confidence', align: 'right' },
  { key: 'decision', label: 'Broker decision' },
  { key: 'roi', label: 'ROI', align: 'right' },
  { key: 'outcome', label: 'Prediction vs actual' },
];

export default async function SignalsPage() {
  const [data, locale] = await Promise.all([getSignalsPageData(), getRequestLocale()]);
  const messages = getMessages(locale);
  const signalRows = data.signals.map((signal) => ({
    asset: signal.assetName,
    interpretation: signal.interpretationLabel,
    score: signal.scoreLabel,
    price: signal.latestPriceLabel,
    updated: signal.notes[1] ?? messages.common.unavailable,
  }));
  const leadSignal = data.signals[0];
  const historyRows: HistoryRow[] = data.signals.map((signal) => ({
    timestamp: signal.notes[1] ?? messages.common.unavailable,
    asset: signal.assetName,
    score: signal.scoreLabel,
    confidence: `${Math.round(signal.confidenceScore * 100)}%`,
    decision: signal.interpretationLabel,
    roi: 'n/a',
    outcome: 'n/a',
  }));

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow={messages.shell.nav.signals}
          title={data.overview.title}
          description={data.overview.description}
          summary={data.overview.summary}
          statusLabel={data.overview.statusLabel}
          statusTone={data.overview.statusTone}
          meta={[
            { label: messages.common.lastUpdated, value: data.overview.lastUpdatedLabel },
            { label: 'Tracked signals', value: String(data.signals.length) },
          ]}
          actions={[
            { href: '/dashboard', label: messages.home.openDashboard },
            { href: '/forecasts', label: `View ${messages.shell.nav.forecasts.toLowerCase()}` },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <AnalysisToolbar
          title="Provider-backed signal review"
          subtitle="Signal outputs are deterministic features derived from tracked market history and surfaced with transparent component breakdowns."
        />
      </Section>

      <Section className="dashboard-section">
        {leadSignal ? (
          <div className="analytics-two-grid">
            <SignalScoreCard
              title={leadSignal.assetName}
              signal={{
                score: leadSignal.score,
                confidence: leadSignal.confidenceScore,
                explanation: leadSignal.notes[0] ?? 'Composite signal derived from provider-backed price history.',
                label:
                  leadSignal.score <= -0.65
                    ? 'Strong Bearish'
                    : leadSignal.score <= -0.2
                      ? 'Bearish'
                      : leadSignal.score >= 0.65
                        ? 'Strong Bullish'
                        : leadSignal.score >= 0.2
                          ? 'Bullish'
                          : 'Neutral',
                visualState:
                  leadSignal.interpretation === 'bullish'
                    ? 'bullish'
                    : leadSignal.interpretation === 'bearish'
                      ? 'bearish'
                      : 'neutral',
              }}
              indicators={[
                `MA spread ${leadSignal.scoreBreakdown.movingAverageContrib.toFixed(3)}`,
                `Momentum ${leadSignal.scoreBreakdown.momentumContrib.toFixed(3)}`,
                `Trend ${leadSignal.scoreBreakdown.trendContrib.toFixed(3)}`,
              ]}
            />
            <SignalBreakdownPanel
              title={`${leadSignal.assetName} breakdown`}
              items={[
                { label: 'Latest price', value: leadSignal.latestPriceLabel, tone: 'neutral' },
                { label: 'Short MA', value: leadSignal.shortMovingAverageLabel, tone: 'positive' },
                { label: 'Long MA', value: leadSignal.longMovingAverageLabel, tone: 'neutral' },
                { label: 'Momentum', value: leadSignal.momentumLabel, tone: leadSignal.interpretation === 'bullish' ? 'positive' : leadSignal.interpretation === 'bearish' ? 'negative' : 'neutral' },
                { label: 'Volatility', value: leadSignal.volatilityLabel, tone: 'neutral' },
                { label: 'Trend strength', value: leadSignal.trendStrengthLabel, tone: leadSignal.interpretation === 'bullish' ? 'positive' : leadSignal.interpretation === 'bearish' ? 'negative' : 'neutral' },
              ]}
            />
          </div>
        ) : (
          <div className="table-panel__empty">No tracked assets currently have sufficient history to derive signals.</div>
        )}
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-two-grid">
          <AnalyticsTable
            title="Signal universe"
            subtitle="Signal snapshot table for the tracked stock universe."
            columns={signalColumns}
            rows={signalRows}
            emptyMessage="No signal rows are available yet."
          />
          <InsightCallout
            title="Signals stay truthful"
            body="Signals are calculated from observable provider data and pure indicator logic with no opaque model-side fabrication."
          />
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="section__eyebrow">Signal intelligence tabs</div>
        <div className="market-pagination__actions" style={{ marginBottom: '0.75rem' }}>
          <span className="button button--secondary" aria-current="page">Current Signals</span>
          <span className="button button--secondary">Decision History</span>
          <span className="button button--secondary">Prediction Accuracy</span>
          <span className="button button--secondary">ROI by Signal Type</span>
          <span className="button button--secondary">News Impact</span>
        </div>
        <div className="analytics-strip">
          <div className="analytics-stat"><div className="analytics-stat__label">Hit rate</div><div className="analytics-stat__value">n/a</div></div>
          <div className="analytics-stat"><div className="analytics-stat__label">Average ROI</div><div className="analytics-stat__value">n/a</div></div>
          <div className="analytics-stat"><div className="analytics-stat__label">Average confidence</div><div className="analytics-stat__value">{leadSignal ? `${Math.round(leadSignal.confidenceScore * 100)}%` : 'n/a'}</div></div>
          <div className="analytics-stat"><div className="analytics-stat__label">Drawdown after signal</div><div className="analytics-stat__value">n/a</div></div>
          <div className="analytics-stat"><div className="analytics-stat__label">False positive rate</div><div className="analytics-stat__value">n/a</div></div>
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <AnalyticsTable
          title="Decision history"
          subtitle="Signal-to-decision trace including confidence, outcome placeholders, and ROI tracking hooks."
          columns={historyColumns}
          rows={historyRows}
          emptyMessage="No signal decision history exists yet."
        />
      </Section>
    </>
  );
}
