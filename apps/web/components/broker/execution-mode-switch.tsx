'use client';

import { useMemo } from 'react';
import type { ExecutionMode } from '@repo/agents';

type ExecutionModeSwitchProps = {
  currentMode: ExecutionMode;
  options: Array<{ id: ExecutionMode; label: string; enabled: boolean }>;
  basePath: string;
};

export function ExecutionModeSwitch({ currentMode, options, basePath }: ExecutionModeSwitchProps) {
  const hrefByMode = useMemo(() => {
    const map = new Map<ExecutionMode, string>();
    for (const option of options) {
      const params = new URLSearchParams({ executionMode: option.id });
      map.set(option.id, `${basePath}?${params.toString()}`);
    }
    return map;
  }, [basePath, options]);

  return (
    <div className="market-row__action-grid" aria-label="Execution mode switch">
      {options.map((option) => (
        <a
          key={option.id}
          href={hrefByMode.get(option.id)}
          className={`button ${option.id === currentMode ? 'button--primary' : 'button--secondary'}`}
          aria-disabled={!option.enabled}
        >
          {option.label}
          {!option.enabled ? ' (gated)' : ''}
        </a>
      ))}
    </div>
  );
}
