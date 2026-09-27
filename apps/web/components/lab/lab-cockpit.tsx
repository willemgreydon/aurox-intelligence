'use client';

import { useState } from 'react';
import type { AppMessages } from '../../lib/i18n/messages';
import { CandlestickAnnotator } from './candlestick-annotator';
import { PathExplorer } from './path-explorer';
import { SignalXRay } from './signal-x-ray';

type Tool = 'path' | 'xray' | 'candles';

export function LabCockpit({ labels }: { labels: AppMessages['lab'] }) {
  const [tool, setTool] = useState<Tool>('path');
  const meta =
    tool === 'path' ? labels.pathExplorer : tool === 'xray' ? labels.signalXRay : labels.candlestickAnnotator;

  return (
    <section className="section">
      <div className="shell-container lab-cockpit">
        <div className="lab-cockpit__tabs" role="tablist" aria-label="Aurox Lab tools">
          <button
            type="button"
            role="tab"
            aria-selected={tool === 'path'}
            className={`lab-tab${tool === 'path' ? ' lab-tab--active' : ''}`}
            onClick={() => setTool('path')}
          >
            {labels.tabs.pathExplorer}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tool === 'xray'}
            className={`lab-tab${tool === 'xray' ? ' lab-tab--active' : ''}`}
            onClick={() => setTool('xray')}
          >
            {labels.tabs.signalXRay}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tool === 'candles'}
            className={`lab-tab${tool === 'candles' ? ' lab-tab--active' : ''}`}
            onClick={() => setTool('candles')}
          >
            {labels.tabs.candlestickAnnotator}
          </button>
        </div>

        <header className="dashboard-section-heading lab-cockpit__heading">
          <div>
            <div className="section__eyebrow">{meta.eyebrow}</div>
            <h2 className="dashboard-section-heading__title">{meta.title}</h2>
            <p className="dashboard-section-heading__sub">{meta.description}</p>
          </div>
        </header>

        {tool === 'path' ? <PathExplorer /> : tool === 'xray' ? <SignalXRay /> : <CandlestickAnnotator />}
      </div>
    </section>
  );
}
