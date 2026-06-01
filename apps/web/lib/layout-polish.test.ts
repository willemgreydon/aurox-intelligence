import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Static guards for the account/dashboard layout-polish work. These assert that
// the reusable CSS primitives exist and that the components are wired to them,
// so a future refactor cannot silently drop the page container, the wider KPI
// grid, or the numeric-bubble system without a failing test.

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(here, rel), 'utf8');

const css = read('../app/globals.css');

describe('globals.css layout-polish primitives', () => {
  it('defines the responsive dashboard page container', () => {
    expect(css).toContain('.dashboard-page-container');
    expect(css).toContain('.aurox-page-container');
    expect(css).toMatch(/\.dashboard-page-container\s*\{[^}]*margin-inline:\s*auto/s);
  });

  it('defines the wider account KPI grid (3 / 2 / 1 responsive, never 4-up)', () => {
    expect(css).toContain('.account-metric-grid');
    expect(css).toContain('.simulation-summary-grid');
    // Desktop default is 3 columns.
    expect(css).toMatch(/\.account-metric-grid[^{]*\{[^}]*repeat\(3, minmax\(240px/s);
  });

  it('defines the numeric-bubble system with all documented variants', () => {
    for (const variant of [
      '.num-bubble',
      '.num-bubble--neutral',
      '.num-bubble--info',
      '.num-bubble--success',
      '.num-bubble--warning',
      '.num-bubble--danger',
      '.num-bubble--muted',
      '.num-bubble--small',
      '.num-bubble--inline',
    ]) {
      expect(css).toContain(variant);
    }
    // Theme-aware via custom properties, not hardcoded colours.
    expect(css).toMatch(/\.num-bubble\s*\{[^}]*--bubble-bg/s);
  });

  it('defines the provider/data-state status pills', () => {
    for (const variant of [
      '.status-pill--live',
      '.status-pill--delayed',
      '.status-pill--degraded',
      '.status-pill--offline',
      '.status-pill--simulation',
      '.status-pill--neutral',
    ]) {
      expect(css).toContain(variant);
    }
  });

  it('defines the executive KPI card slots and dashboard overview groups', () => {
    expect(css).toContain('.analytics-kpi__topline');
    expect(css).toContain('.analytics-kpi__icon');
    expect(css).toContain('.analytics-kpi__spark');
    expect(css).toContain('.dashboard-group');
    expect(css).toContain('.dashboard-group__title');
    expect(css).toContain('.dashboard-group__grid--lead');
  });

  it('uses the dashboard width token and dynamic viewport units for mobile', () => {
    expect(css).toContain('--layout-dashboard-width');
    expect(css).toMatch(/\.dashboard-page-container\s*\{[^}]*--layout-dashboard-width/s);
    expect(css).toContain('100dvh');
    expect(css).toContain('env(safe-area-inset-bottom)');
  });
});

describe('components are wired to the layout-polish primitives', () => {
  it('DashboardShell wraps every band in the page container and groups the body', () => {
    const shell = read('../components/dashboard/dashboard-shell.tsx');
    expect(shell).toContain('dashboard-page-container');
    expect(shell).toContain('dashboard-groups');
  });

  it('dashboard page composes the five named overview groups', () => {
    const page = read('../app/dashboard/page.tsx');
    for (const group of [
      'Portfolio Overview',
      'Risk Overview',
      'Market Overview',
      'AI Overview',
      'Research Overview',
    ]) {
      expect(page).toContain(group);
    }
  });

  it('CompactStatCard exposes icon + status + spark slots', () => {
    const card = read('../components/stats/compact-stat-card.tsx');
    expect(card).toContain('icon?');
    expect(card).toContain('status?');
    expect(card).toContain('spark?');
    expect(card).toContain('analytics-kpi__topline');
  });

  it('account cockpit hero uses the wider metric grid, not raw 4-up', () => {
    const cockpit = read('../components/account/account-intelligence-cockpit.tsx');
    expect(cockpit).toContain('account-metric-grid');
  });

  it('market-graph timeframe count renders as a labelled numeric bubble', () => {
    const tf = read('../components/charts/timeframe-select.tsx');
    expect(tf).toContain('num-bubble');
    expect(tf).toContain('visible candles');
  });
});
