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
    // Titles are internationalised (AUR-049), so assert the five group message
    // keys are wired rather than literal English text. The English values live
    // in the message catalog and are guarded separately.
    for (const groupTitleKey of [
      'messages.dashboard.groupPortfolioTitle',
      'messages.dashboard.groupRiskTitle',
      'messages.dashboard.groupMarketTitle',
      'messages.dashboard.groupAiTitle',
      'messages.dashboard.groupResearchTitle',
    ]) {
      expect(page).toContain(groupTitleKey);
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

  it('identity card is an accessible two-sided flip control with a back face', () => {
    const card = read('../components/account/aurox-identity-card.tsx');
    expect(card).toContain('aria-pressed');
    expect(card).toContain("data-flipped");
    expect(card).toContain('aurox-identity-card__face--front');
    expect(card).toContain('aurox-identity-card__face--back');
    // Real, display-safe account metadata on the back (no fabricated card data).
    expect(card).toContain('aurox-identity-card__details');
  });

  it('account nav is a collapsible control with an aria-expanded trigger', () => {
    const nav = read('../components/account/account-nav.tsx');
    expect(nav).toContain('account-nav__trigger');
    expect(nav).toContain('aria-expanded');
    expect(nav).toContain('aria-controls');
    expect(nav).toContain('aria-current');
  });

  it('keeps the account cockpit on the canonical bounded content shell', () => {
    expect(css).not.toContain('.account-cockpit .shell-container');
    expect(css).toContain('--content-standard');
  });

  it('defines a proportionate, reduced-motion-safe Aurox identity card', () => {
    expect(css).toContain('.aurox-identity-card');
    expect(css).toContain('aspect-ratio: 85.6 / 53.98');
    expect(css).toContain('transform-style: preserve-3d');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('defines the identity card as a two-sided flippable object', () => {
    expect(css).toContain('.aurox-identity-card__inner');
    expect(css).toContain('.aurox-identity-card__face--front');
    expect(css).toContain('.aurox-identity-card__face--back');
    expect(css).toContain('backface-visibility: hidden');
    // Flip is driven by the data-flipped state attribute set on the button.
    expect(css).toContain(".aurox-identity-card[data-flipped='true']");
    // The back face is pre-rotated so it lands upright after the 180deg turn.
    expect(css).toMatch(/\.aurox-identity-card__face--back\s*\{[^}]*rotateY\(180deg\)/s);
  });

  it('defines the collapsible mobile account navigation', () => {
    expect(css).toContain('.account-nav__trigger');
    expect(css).toContain('.account-nav__list');
    expect(css).toContain('.account-nav--open .account-nav__list');
    // Trigger is hidden on desktop (base rule) and the list is a visible grid.
    expect(css).toMatch(/\.account-nav__trigger\s*\{\s*display:\s*none/s);
  });

  it('defines the scoped two-column account/activity grids', () => {
    expect(css).toMatch(/\.account-stats--duo\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/s);
    expect(css).toMatch(/\.analytics-strip--duo\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/s);
  });

  it('market-graph timeframe count renders as a labelled numeric bubble', () => {
    const tf = read('../components/charts/timeframe-select.tsx');
    expect(tf).toContain('num-bubble');
    expect(tf).toContain('visible candles');
  });
});
