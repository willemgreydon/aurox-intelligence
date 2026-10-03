import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Static guards for the responsive product-experience pass: homepage gutters,
// market roster grid, account section rhythm, the mobile account relocation,
// the mobile app-bar icons, and the light-theme identity card. These assert the
// root-cause fixes stay in place and that the Firefox preserve-3d safety of the
// identity card is never re-broken.

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(here, rel), 'utf8');
const css = read('../app/globals.css');

/** Extract the body of the first CSS rule matching `selector` (flat rules only). */
function ruleBody(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 's'));
  return match?.[1] ?? '';
}

describe('homepage gutter root-cause fix', () => {
  it('no longer forces the Live Market Intelligence band to full viewport width', () => {
    // The width:100% override made the band full-bleed below 1280px, touching the
    // viewport edges. It must inherit the .shell-container gutter instead.
    expect(css).not.toMatch(/\.home-market-intel__inner\s*\{[^}]*width:\s*100%/s);
    expect(css).not.toMatch(/\.home-news-section__inner\s*\{[^}]*width:\s*100%/s);
  });

  it('keeps the ≥1280 wide-dashboard promotion for the home bands', () => {
    expect(css).toContain('.home-market-intel > .shell-container');
    expect(css).toMatch(/\.home-market-intel > \.shell-container[\s\S]*?var\(--content-dashboard\)/);
  });
});

describe('market roster grid root-cause fix', () => {
  it('uses a fluid auto-fit grid so cards flow 1 → 2 → 3 → 4 columns', () => {
    const body = ruleBody(css, '#market-roster .analytics-two-grid');
    expect(body).toMatch(/repeat\(auto-fit, minmax\(min\(100%, 21\.5rem\), 1fr\)\)/);
  });

  it('drops the brittle fixed 1600/2100 column overrides (auto-fit replaces them)', () => {
    expect(css).not.toMatch(/#market-roster \.analytics-two-grid\s*\{\s*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s);
    expect(css).not.toMatch(/#market-roster \.analytics-two-grid\s*\{\s*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/s);
  });
});

describe('account section spacing is a single owner', () => {
  it('the cockpit owns the inter-section gap and neutralizes per-section padding', () => {
    const cockpit = ruleBody(css, '.account-cockpit');
    expect(cockpit).toMatch(/gap:\s*clamp\(/);
    expect(css).toMatch(/\.account-cockpit > \.section\s*\{[^}]*padding-block:\s*0/s);
  });
});

describe('account mobile reconstruction', () => {
  it('relocated identity summary is hidden on desktop by default', () => {
    expect(css).toMatch(/\.account-details-mobile\s*\{[^}]*display:\s*none/s);
  });

  it('at ≤960 the sidebar shows nav only and the summary relocates below', () => {
    // Everything inside the shared mobile breakpoint block.
    const mobileBlock = css.slice(css.indexOf('@media (max-width: 960px)'));
    expect(mobileBlock).toMatch(/\.account-sidebar__intro\s*\{[^}]*display:\s*none/s);
    expect(mobileBlock).toMatch(/\.account-details-mobile\s*\{[^}]*display:\s*block/s);
  });

  it('uses one shared AccountIdentityPanel in both the sidebar and the mobile slot', () => {
    const panel = read('../components/account/account-identity-panel.tsx');
    expect(panel).toContain('account-sidebar__header');
    expect(panel).toContain('account-sidebar__summary');

    const layout = read('../app/account/layout.tsx');
    expect(layout).toContain('AccountIdentityPanel');
    expect(layout).toContain('account-sidebar__intro');
    // The identity markup is no longer inlined (and thus not duplicated) in layout.
    expect(layout).not.toContain('<h1 className="account-sidebar__title">');

    const page = read('../app/account/page.tsx');
    expect(page).toContain('AccountIdentityPanel');
    expect(page).toContain('accountDetails');
  });

  it('cockpit renders the relocated summary after Recent simulated actions', () => {
    const cockpit = read('../components/account/account-intelligence-cockpit.tsx');
    const recentIdx = cockpit.indexOf('Recent simulated actions');
    const relocatedIdx = cockpit.indexOf('account-details-mobile');
    expect(recentIdx).toBeGreaterThan(-1);
    expect(relocatedIdx).toBeGreaterThan(recentIdx);
  });
});

describe('mobile app bar uses semantic icons', () => {
  const nav = read('../components/layout/mobile-nav.tsx');

  it('replaced the text initials with one inline-SVG icon family', () => {
    expect(nav).toContain('viewBox="0 0 24 24"');
    for (const icon of ['HomeIcon', 'MarketIcon', 'SimulationIcon', 'MenuIcon']) {
      expect(nav).toContain(icon);
    }
    // The old 2-letter shorthand is gone.
    expect(nav).not.toContain("icon: 'HM'");
    expect(nav).not.toContain("'MN'");
  });

  it('keeps an accessible text label per destination', () => {
    expect(nav).toContain('{item.label}');
    expect(nav).toContain('{labels.menu}');
    expect(nav).toContain('aria-label={menuOpen ? labels.closeMenu : labels.openMenu}');
  });

  it('sizes the icon svg in CSS', () => {
    expect(css).toMatch(/\.mobile-quick-nav__icon svg\s*\{[^}]*width/s);
  });
});

describe('light-theme identity card', () => {
  it('themes the light card material without inverting the dark card', () => {
    const face = ruleBody(css, "[data-theme='light'] .aurox-identity-card__face");
    expect(face).toMatch(/background:\s*#e9eef5/);
    expect(css).toContain("[data-theme='light'] .aurox-identity-card__material");
    expect(css).toContain("[data-theme='light'] .aurox-identity-card__material--back");
  });

  it('does not reintroduce Firefox-breaking stacking contexts on the face', () => {
    // The light overrides must not add overflow/isolation/mix-blend/filter/
    // clip-path/contain to any .aurox-identity-card__face rule.
    const faceRules = css.match(/\.aurox-identity-card__face\s*\{[^}]*\}/gs) ?? [];
    expect(faceRules.length).toBeGreaterThan(0);
    for (const rule of faceRules) {
      expect(rule).not.toMatch(/overflow\s*:/);
      expect(rule).not.toMatch(/isolation\s*:/);
      expect(rule).not.toMatch(/mix-blend-mode\s*:/);
      expect(rule).not.toMatch(/filter\s*:/);
      expect(rule).not.toMatch(/clip-path\s*:/);
      expect(rule).not.toMatch(/contain\s*:/);
    }
  });

  it('preserves the preserve-3d flip structure and reduced-motion handling', () => {
    expect(css).toContain('transform-style: preserve-3d');
    expect(css).toContain('backface-visibility: hidden');
    expect(css).toMatch(/\.aurox-identity-card__face--back\s*\{[^}]*rotateY\(180deg\)/s);
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
