type SectionNavItem = {
  href: string;
  label: string;
};

/**
 * Sticky in-page navigator for the long simulation cockpit (AUR-015).
 *
 * Server component, no client JS — native anchor links give keyboard support and
 * screen-reader semantics for free. On narrow viewports the strip scrolls
 * horizontally rather than wrapping. Smooth scrolling + scroll-margin are handled
 * in CSS and respect prefers-reduced-motion via the global reset.
 */
export function SimulationSectionNav({ items, label }: { items: SectionNavItem[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <nav className="sim-section-nav" aria-label={label}>
      <ul className="sim-section-nav__list">
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href} className="sim-section-nav__link">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
