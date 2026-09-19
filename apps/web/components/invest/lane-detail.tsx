import Link from 'next/link';
import type { Locale } from '@repo/api-contracts';
import type { AppMessages } from '../../lib/i18n/messages';
import type { SimulationLaneDetailViewModel } from '../../server/services/simulation-lane-detail-service';
import { Section } from '../ui/section';
import { WorkstationPageHeader } from '../asset/workstation-page-header';
import { formatDateTimeLabel } from '../../lib/formatters';
import { formatUsdPrice } from '../../server/lib/quote-display';

type LaneDetailProps = {
  vm: SimulationLaneDetailViewModel;
  locale: Locale;
  messages: AppMessages;
};

function statusTone(status: SimulationLaneDetailViewModel['status']) {
  if (status === 'active') return 'success';
  if (status === 'limited') return 'warning';
  return 'info';
}

export function LaneDetail({ vm, locale, messages }: LaneDetailProps) {
  const t = messages.simulation.laneDetail;
  const common = messages.common;
  const statusText =
    vm.status === 'active'
      ? messages.simulation.laneStatusActive
      : vm.status === 'limited'
        ? messages.simulation.laneStatusLimited
        : messages.simulation.laneStatusPlanned;

  const dateOrDash = (iso: string | null) => (iso ? formatDateTimeLabel(iso, locale) : common.unavailable);

  return (
    <div className="dashboard-page-container">
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow={t.eyebrow}
          title={vm.label}
          description={vm.description}
          summary={vm.supportNote}
          statusLabel={statusText}
          statusTone={statusTone(vm.status)}
          meta={[
            { label: t.modeLabel, value: vm.mode },
            { label: t.assetScopeLabel, value: vm.assetScopeOptions.join(', ') },
            { label: t.executionLabel, value: t.simulationOnly },
          ]}
          actions={[{ href: '/invest/simulation', label: t.backToWorkstation }]}
        />
      </Section>

      {/* Overview / session */}
      <Section className="dashboard-section">
        <div className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">{t.overviewEyebrow}</div>
              <h2>{t.overviewTitle}</h2>
            </div>
            <span className="status-pill status-pill--info">{t.readOnlyBadge}</span>
          </div>
          <div className="analytics-card__body">
            {vm.session ? (
              <dl className="account-metric-grid">
                <div><dt className="text-muted">{t.sessionStatusLabel}</dt><dd>{vm.session.status}</dd></div>
                <div><dt className="text-muted">{t.decisionSourceLabel}</dt><dd>{vm.session.decisionSource}</dd></div>
                <div><dt className="text-muted">{t.observationLabel}</dt><dd>{vm.session.observationStatus}</dd></div>
                <div><dt className="text-muted">{t.assetScopeLabel}</dt><dd>{vm.session.assetScope}</dd></div>
                <div><dt className="text-muted">{t.createdLabel}</dt><dd>{dateOrDash(vm.session.createdAt)}</dd></div>
                <div><dt className="text-muted">{t.startedLabel}</dt><dd>{dateOrDash(vm.session.startedAt)}</dd></div>
                <div><dt className="text-muted">{t.lastActivityLabel}</dt><dd>{dateOrDash(vm.session.lastActivityAt)}</dd></div>
              </dl>
            ) : (
              <div className="aurox-empty-state aurox-empty-state--inline" role="status">
                <p className="aurox-empty-state__title">{t.noSessionTitle}</p>
                <p className="text-muted">{t.noSessionBody}</p>
                <Link href="/invest/broker-modes" className="button button--secondary">{t.configureLaneCta}</Link>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Capital */}
      <Section className="dashboard-section">
        <div className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">{t.capitalEyebrow}</div>
              <h2>{t.capitalTitle}</h2>
              <p className="text-muted">{t.capitalScopeNote}</p>
            </div>
          </div>
          <div className="analytics-card__body">
            {vm.capital ? (
              <dl className="account-metric-grid">
                <div><dt className="text-muted">{t.capitalLimitLabel}</dt><dd className="font-mono tabular-nums">{formatUsdPrice(vm.capital.capitalLimit, locale, common.unavailable)}</dd></div>
                <div><dt className="text-muted">{t.allocatedLabel}</dt><dd className="font-mono tabular-nums">{formatUsdPrice(vm.capital.allocatedCapital, locale, common.unavailable)}</dd></div>
                <div><dt className="text-muted">{t.availableLabel}</dt><dd className="font-mono tabular-nums">{formatUsdPrice(vm.capital.availableCapital, locale, common.unavailable)}</dd></div>
              </dl>
            ) : (
              <p className="text-muted">{common.unavailable}</p>
            )}
            {vm.session ? (
              <div style={{ marginTop: '1rem' }}>
                <dl className="account-metric-grid">
                  <div><dt className="text-muted">{t.maxCapitalLabel}</dt><dd className="font-mono tabular-nums">{formatUsdPrice(vm.session.maxCapitalUsd, locale, common.unavailable)}</dd></div>
                  <div>
                    <dt className="text-muted">{t.microAllocationLabel}</dt>
                    <dd className="font-mono tabular-nums">{vm.session.microAllocationPercent}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t.perOrderAllocationLabel}</dt>
                    <dd className="font-mono tabular-nums">{formatUsdPrice(vm.session.perOrderMicroAllocationUsd, locale, common.unavailable)}</dd>
                  </div>
                </dl>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{t.perOrderAllocationNote}</p>
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      {/* Lane-tagged orders */}
      <Section className="dashboard-section">
        <div className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">{t.ordersEyebrow}</div>
              <h2>{t.ordersTitle}</h2>
              <p className="text-muted">{t.ordersNote}</p>
            </div>
          </div>
          <div className="analytics-card__body" style={{ overflowX: 'auto' }}>
            {vm.laneOrders.length === 0 ? (
              <p className="text-muted">{t.noOrders}</p>
            ) : (
              <table className="table-panel__table">
                <thead>
                  <tr>
                    <th scope="col">{t.colSymbol}</th>
                    <th scope="col">{t.colSide}</th>
                    <th scope="col">{t.colQuantity}</th>
                    <th scope="col">{t.colPrice}</th>
                    <th scope="col">{t.colRealizedPnl}</th>
                    <th scope="col">{t.colExecutedAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.laneOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.symbol}</td>
                      <td>{order.side === 'buy' ? t.sideBuy : t.sideSell}</td>
                      <td className="font-mono tabular-nums">{order.quantity}</td>
                      <td className="font-mono tabular-nums">{formatUsdPrice(order.executedPrice, locale, common.unavailable)}</td>
                      <td className="font-mono tabular-nums">{formatUsdPrice(order.realizedPnl, locale, common.unavailable)}</td>
                      <td>{dateOrDash(order.executedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Section>

      <Section className="dashboard-section">
        <p className="finance-disclaimer text-muted" role="note">{common.simulationDisclosure}</p>
      </Section>
    </div>
  );
}
