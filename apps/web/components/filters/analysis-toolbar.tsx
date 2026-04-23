import type { ReactNode } from 'react';
import { TimeframeSwitcher } from './timeframe-switcher';

type AnalysisToolbarProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  controls?: ReactNode;
};

export function AnalysisToolbar({ eyebrow = 'Workstation filters', title, subtitle, controls }: AnalysisToolbarProps) {
  return (
    <header className="analysis-toolbar">
      <div>
        <div className="section__eyebrow">{eyebrow}</div>
        <h2 className="analysis-toolbar__title">{title}</h2>
        <p className="analysis-toolbar__subtitle">{subtitle}</p>
      </div>
      <div className="analysis-toolbar__controls">
        {controls ?? (
          <>
            <TimeframeSwitcher items={['1W', '1M', '3M', 'YTD', '1Y']} active="1M" />
            <div className="control-group">
              <button type="button" className="control-pill control-pill--active">Equities</button>
              <button type="button" className="control-pill">FX</button>
              <button type="button" className="control-pill">Cross-asset</button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
