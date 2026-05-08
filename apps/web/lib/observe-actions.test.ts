import { describe, expect, it } from 'vitest';
import { buildSimulationTicketHref } from './observe-actions';

describe('observe simulation action', () => {
  it('builds navigation-only prepare link', () => {
    const href = buildSimulationTicketHref('AAPL');
    expect(href.startsWith('/invest/simulation')).toBe(true);
    expect(href.includes('intent=prepare')).toBe(true);
    expect(href.includes('execute')).toBe(false);
  });
});
