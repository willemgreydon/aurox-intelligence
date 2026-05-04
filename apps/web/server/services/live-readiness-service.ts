import { checkLiveReadiness, type LiveReadinessContext } from '@repo/agents';
import { requireCurrentSession } from '../auth/session';
import { getSimulationWorkstationStateForCurrentUser } from './simulation-workstation-service';
import { BROKER_MODE_REGISTRY } from '../config/broker-mode-registry';
import { getBrokerConnectionSummary } from '../env/broker-env';

export type ReadinessGateView = {
  id: string;
  label: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  blocking: boolean;
  explanation: string;
};

export type LiveReadinessView = {
  status: 'PASSED' | 'FAILED' | 'WARNING';
  whyLocked: string;
  executionMessage: string;
  groupedGates: Array<{
    key: string;
    label: string;
    gates: ReadinessGateView[];
  }>;
};

function buildReadinessContext(input: {
  workstationStatus: string;
  orderCount: number;
  isReadOnly: boolean;
  hasBrokerConnection: boolean;
}): LiveReadinessContext {
  return {
    isUserVerified: false,
    hasBrokerConnection: input.hasBrokerConnection,
    isMarketDataHealthy: input.workstationStatus !== 'error' && input.workstationStatus !== 'failed',
    hasSimulationHistory: input.orderCount > 0,
    isReadOnlyMode: input.isReadOnly,
  };
}

function mapStatus(passed: boolean, blocking: boolean): ReadinessGateView['status'] {
  if (passed) return 'PASSED';
  if (blocking) return 'FAILED';
  return 'WARNING';
}

export async function getLiveReadinessView(): Promise<LiveReadinessView> {
  await requireCurrentSession('/login');
  const workstation = await getSimulationWorkstationStateForCurrentUser({ sessionId: null });
  const brokerSummary = getBrokerConnectionSummary();

  const readinessContext = buildReadinessContext({
    workstationStatus: workstation.workstationStatus,
    orderCount: workstation.workspace?.orders.length ?? 0,
    isReadOnly: workstation.isReadOnly,
    hasBrokerConnection: brokerSummary.hasConfiguredBroker,
  });

  const grouped = BROKER_MODE_REGISTRY.map(({ config }) => {
    const result = checkLiveReadiness(config, readinessContext);
    return {
      key: config.id,
      label: `${config.label} (${config.executionTarget})`,
      gates: result.checks.map((check) => {
        const blocking = !check.passed && (check.severity === 'critical' || result.executionTarget === 'live');
        return {
          id: check.id,
          label: check.label,
          status: mapStatus(check.passed, blocking),
          blocking,
          explanation: check.reason,
        };
      }),
    };
  });

  const allGates = grouped.flatMap((group) => group.gates);
  const blockingFails = allGates.filter((gate) => gate.status === 'FAILED').length;
  const warningCount = allGates.filter((gate) => gate.status === 'WARNING').length;

  const status: LiveReadinessView['status'] = blockingFails > 0 ? 'FAILED' : warningCount > 0 ? 'WARNING' : 'PASSED';

  return {
    status,
    whyLocked:
      blockingFails > 0
        ? `${blockingFails} blocking gate(s) are currently failing. Live trading remains locked.`
        : 'Live trading remains locked by policy. Simulation mode stays active until explicitly approved.',
    executionMessage: 'Simulation mode active. No real orders are executed.',
    groupedGates: grouped,
  };
}
