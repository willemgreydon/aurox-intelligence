'use client';

import { useId, useState, type ReactNode } from 'react';

export type IntelligenceTab = {
  id: string;
  label: string;
  hint?: string;
  panel: ReactNode;
};

type Props = {
  tabs: IntelligenceTab[];
  defaultTabId?: string;
};

/**
 * RSC-safe analytical tab shell.
 *
 * Panels are pre-rendered server JSX passed in as ReactNode — no render-props,
 * no function children — so all data fetching stays in the server page and the
 * client boundary only receives serializable elements + string ids/labels.
 * All panels stay mounted and are toggled via the `hidden` attribute so tab
 * switching is instant and screen-reader state stays consistent.
 *
 * Accessibility: each tab button carries a stable id; each tabpanel references
 * its controlling tab via aria-labelledby (correctly wired, unlike the older
 * signals tab markup). Arrow/Home/End move focus across the tablist.
 */
export function IntelligenceAnalysisTabs({ tabs, defaultTabId }: Props) {
  const baseId = useId();
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id);

  if (tabs.length === 0) return null;

  const tabButtonId = (id: string) => `${baseId}-tab-${id}`;
  const tabPanelId = (id: string) => `${baseId}-panel-${id}`;

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    const next = tabs[nextIndex];
    if (!next) return;
    setActiveId(next.id);
    document.getElementById(tabButtonId(next.id))?.focus();
  }

  return (
    <div className="intel-analysis-tabs">
      <div className="signals-tab-bar" role="tablist" aria-label="Portfolio analysis views">
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              id={tabButtonId(tab.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={tabPanelId(tab.id)}
              tabIndex={selected ? 0 : -1}
              className={`signals-tab-btn${selected ? ' signals-tab-btn--active' : ''}`}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {tab.label}
              {tab.hint ? <span className="intel-analysis-tabs__hint">{tab.hint}</span> : null}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={tabPanelId(tab.id)}
          role="tabpanel"
          aria-labelledby={tabButtonId(tab.id)}
          hidden={tab.id !== activeId}
          className="intel-analysis-tabs__panel"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
