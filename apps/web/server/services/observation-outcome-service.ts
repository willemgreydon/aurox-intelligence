import { listSimulatedOrdersForUser } from '@repo/db';

export type ObservationOutcome = {
  outcomeStatus: 'PENDING' | 'WIN' | 'LOSS' | 'NEUTRAL' | 'UNAVAILABLE';
  roiPercent: number | null;
  pnlAmount: number | null;
  timeHorizon: string | null;
  predictionAccuracy: number | null;
  explanation: string[];
};

export async function getObservationOutcome(input: {
  userId: string;
  relatedOrderId?: string | null;
  signalDirection?: 'BUY' | 'SELL' | 'HOLD' | null;
}): Promise<ObservationOutcome> {
  if (!input.relatedOrderId) {
    return {
      outcomeStatus: 'PENDING',
      roiPercent: null,
      pnlAmount: null,
      timeHorizon: null,
      predictionAccuracy: null,
      explanation: ['Outcome pending: no linked simulated order yet.'],
    };
  }

  try {
    const orders = await listSimulatedOrdersForUser(input.userId);
    const order = orders.find((row) => row.id === input.relatedOrderId);
    if (!order) {
      return {
        outcomeStatus: 'UNAVAILABLE',
        roiPercent: null,
        pnlAmount: null,
        timeHorizon: null,
        predictionAccuracy: null,
        explanation: ['No outcome data yet for linked order.'],
      };
    }

    const basis = order.grossAmount === 0 ? null : order.grossAmount;
    const pnl = order.realizedPnl;
    const roiPercent = basis === null ? null : (pnl / basis) * 100;
    const status: ObservationOutcome['outcomeStatus'] = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'NEUTRAL';

    return {
      outcomeStatus: status,
      roiPercent,
      pnlAmount: pnl,
      timeHorizon: 'executed_order',
      predictionAccuracy:
        input.signalDirection === null || input.signalDirection === 'HOLD'
          ? null
          : ((input.signalDirection === 'BUY' && pnl > 0) || (input.signalDirection === 'SELL' && pnl < 0) ? 1 : 0),
      explanation: [`Outcome computed from simulated order ${order.id}.`],
    };
  } catch {
    return {
      outcomeStatus: 'UNAVAILABLE',
      roiPercent: null,
      pnlAmount: null,
      timeHorizon: null,
      predictionAccuracy: null,
      explanation: ['Outcome unavailable because simulation data could not be loaded.'],
    };
  }
}
