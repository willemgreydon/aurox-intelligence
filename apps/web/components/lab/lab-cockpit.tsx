'use client';

import { useState } from 'react';
import type { AppMessages } from '../../lib/i18n/messages';
import { CandlestickAnnotator } from './candlestick-annotator';
import { PathExplorer } from './path-explorer';
import { SignalXRay } from './signal-x-ray';
import { VolatilityCone } from './volatility-cone';

type Tool = 'path' | 'xray' | 'candles' | 'vol';

const META_BY_TOOL: Record<Tool, keyof AppMessages['lab'] & ('pathExplorer' | 'signalXRay' | 'candlestickAnnotator' | 'volatilityCone')> = {
  path: 'pathExplorer',
  xray: 'signalXRay',
  candles: 'candlestickAnnotator',
  vol: 'volatilityCone',
};

export function LabCockpit({ labels }: { labels: AppMessages['lab'] }) {
  const [tool, setTool] = useState<Tool>('path');
  const meta = labels[META_BY_TOOL[tool]];

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
          <button
            type="button"
            role="tab"
            aria-selected={tool === 'vol'}
            className={`lab-tab${tool === 'vol' ? ' lab-tab--active' : ''}`}
            onClick={() => setTool('vol')}
          >
            {labels.tabs.volatilityCone}
          </button>
        </div>

        <header className="dashboard-section-heading lab-cockpit__heading">
          <div>
            <div className="section__eyebrow">{meta.eyebrow}</div>
            <h2 className="dashboard-section-heading__title">{meta.title}</h2>
            <p className="dashboard-section-heading__sub">{meta.description}</p>
          </div>
        </header>

        {tool === 'path' ? (
          <PathExplorer />
        ) : tool === 'xray' ? (
          <SignalXRay />
        ) : tool === 'candles' ? (
          <CandlestickAnnotator />
        ) : (
          <VolatilityCone />
        )}
      </div>
    </section>
  );
}
