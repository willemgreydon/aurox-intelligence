import { Card } from '../../components/ui/card';
import { getSimulationWorkspace } from '@repo/db';
import { getMessages } from '../../lib/i18n/messages';
import { requireCurrentSession } from '../../server/auth/session';
import { getRequestLocale } from '../../server/i18n/locale';
import { getAccountOverviewData } from '../../server/services/account-service';

export default async function AccountOverviewPage() {
  const auth = await requireCurrentSession('/account');
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const [overview, simulation] = await Promise.all([
    getAccountOverviewData(auth),
    getSimulationWorkspace(auth.user.id).catch(() => null),
  ]);

  return (
    <div className="account-stack">
      <Card>
        <div className="account-panel">
          <div className="section__eyebrow">Overview</div>
          <h2 className="account-panel__title">Welcome back, {overview.user.name}</h2>
          <p className="account-panel__description">
            Your authenticated workspace is active. From here you can update profile details, rotate your password, and review session activity.
          </p>
        </div>
      </Card>

      <div className="account-grid">
        <Card>
          <div className="account-panel">
            <h3 className="account-panel__title">Membership</h3>
            <dl className="account-stats">
              <div>
                <dt>Member since</dt>
                <dd>{overview.memberSinceLabel}</dd>
              </div>
              <div>
                <dt>Signed in as</dt>
                <dd>{overview.user.email}</dd>
              </div>
              <div>
                <dt>Account role</dt>
                <dd>{overview.user.role}</dd>
              </div>
            </dl>
          </div>
        </Card>

        <Card>
          <div className="account-panel">
            <h3 className="account-panel__title">Current session</h3>
            <dl className="account-stats">
              <div>
                <dt>Session expires</dt>
                <dd>{overview.sessionExpiresLabel}</dd>
              </div>
              <div>
                <dt>Active sessions</dt>
                <dd>{String(overview.activeSessionCount)}</dd>
              </div>
              <div>
                <dt>Last activity</dt>
                <dd>{overview.recentSessions[0]?.lastSeenLabel ?? 'Pending activity'}</dd>
              </div>
            </dl>
          </div>
        </Card>
      </div>

      <Card>
        <div className="account-panel">
          <div className="account-panel__header">
            <div>
              <div className="section__eyebrow">{messages.account.preferencesTitle}</div>
              <h3 className="account-panel__title">Personalized workspace defaults</h3>
              <p className="account-panel__description">{messages.account.preferencesDescription}</p>
            </div>
          </div>
          <dl className="account-stats">
            <div>
              <dt>{messages.account.locale}</dt>
              <dd>{overview.preferences.locale.toUpperCase()}</dd>
            </div>
            <div>
              <dt>{messages.account.defaultChartType}</dt>
              <dd>{overview.preferences.defaultChartType}</dd>
            </div>
            <div>
              <dt>{messages.account.defaultTimePeriod}</dt>
              <dd>{overview.preferences.defaultTimePeriod}</dd>
            </div>
            <div>
              <dt>{messages.account.trackedSymbols}</dt>
              <dd>{overview.preferences.trackedSymbols.join(', ') || 'None configured'}</dd>
            </div>
            <div>
              <dt>{messages.account.visibleModules}</dt>
              <dd>{overview.preferences.visibleModules.join(', ')}</dd>
            </div>
            <div>
              <dt>{messages.account.preferredBrokerMode}</dt>
              <dd>{overview.preferences.simulationPreferences.preferredBrokerMode}</dd>
            </div>
            <div>
              <dt>{messages.account.brokerModeCapitalLimitUsd}</dt>
              <dd>{overview.preferences.simulationPreferences.brokerModeCapitalLimitUsd.toFixed(0)} USD</dd>
            </div>
            <div>
              <dt>{messages.account.microTradeAllocationPercent}</dt>
              <dd>{overview.preferences.simulationPreferences.microTradeAllocationPercent}%</dd>
            </div>
            <div>
              <dt>{messages.account.defaultAssetScope}</dt>
              <dd>{overview.preferences.simulationPreferences.defaultAssetScope}</dd>
            </div>
            <div>
              <dt>{messages.account.orderActivityDigest}</dt>
              <dd>{overview.preferences.activityPreferences.orderActivityDigest ? 'On' : 'Off'}</dd>
            </div>
            <div>
              <dt>{messages.account.laneStatusAlerts}</dt>
              <dd>{overview.preferences.activityPreferences.laneStatusAlerts ? 'On' : 'Off'}</dd>
            </div>
          </dl>
        </div>
      </Card>

      {simulation ? (
        <Card>
          <div className="account-panel">
            <div className="account-panel__header">
              <div>
                <div className="section__eyebrow">Simulation account</div>
                <h3 className="account-panel__title">Investment and activity snapshot</h3>
                <p className="account-panel__description">
                  Clear split between active investments, closed investments, and watchlist-only symbols.
                </p>
              </div>
            </div>
            <dl className="account-stats">
              <div>
                <dt>Total equity</dt>
                <dd>{simulation.summary.equityValue.toFixed(2)} USD</dd>
              </div>
              <div>
                <dt>Available cash</dt>
                <dd>{simulation.summary.availableCash.toFixed(2)} USD</dd>
              </div>
              <div>
                <dt>Invested capital</dt>
                <dd>{simulation.summary.investedCapital.toFixed(2)} USD</dd>
              </div>
              <div>
                <dt>Active investments</dt>
                <dd>{simulation.summary.activeInvestmentCount}</dd>
              </div>
              <div>
                <dt>Closed investments</dt>
                <dd>{simulation.summary.closedInvestmentCount}</dd>
              </div>
              <div>
                <dt>Recent orders</dt>
                <dd>{simulation.orders.length}</dd>
              </div>
            </dl>
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="account-panel">
          <div className="account-panel__header">
            <div>
              <div className="section__eyebrow">Recent sessions</div>
              <h3 className="account-panel__title">Session history</h3>
            </div>
          </div>

          <div className="account-session-list">
            {overview.recentSessions.map((session) => (
              <article key={session.id} className="account-session-list__item">
                <div>
                  <strong>{session.isCurrent ? 'Current session' : 'Active session'}</strong>
                  <p>Started {session.createdAtLabel}</p>
                </div>
                <div>
                  <span>Last seen</span>
                  <strong>{session.lastSeenLabel}</strong>
                </div>
                <div>
                  <span>Expires</span>
                  <strong>{session.expiresAtLabel}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
