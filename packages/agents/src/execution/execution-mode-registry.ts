import type { ExecutionModeDefinition } from './execution-mode-types';

export const EXECUTION_MODE_REGISTRY: readonly ExecutionModeDefinition[] = [
  {
    id: 'simulation',
    label: 'Simulation',
    executionTarget: 'simulation',
    aiAssisted: false,
    autonomous: false,
    enabledByDefault: true,
  },
  {
    id: 'paper',
    label: 'Paper',
    executionTarget: 'simulation',
    aiAssisted: true,
    autonomous: false,
    enabledByDefault: false,
  },
  {
    id: 'live-manual',
    label: 'Live Manual',
    executionTarget: 'live',
    aiAssisted: false,
    autonomous: false,
    enabledByDefault: false,
  },
  {
    id: 'live-ai-assisted',
    label: 'Live AI Assisted',
    executionTarget: 'live',
    aiAssisted: true,
    autonomous: false,
    enabledByDefault: false,
  },
  {
    id: 'live-autonomous',
    label: 'Live Autonomous',
    executionTarget: 'live',
    aiAssisted: true,
    autonomous: true,
    enabledByDefault: false,
  },
] as const;

export function getExecutionModeDefinition(mode: ExecutionModeDefinition['id']): ExecutionModeDefinition {
  const defaultMode =
    EXECUTION_MODE_REGISTRY.find((item) => item.enabledByDefault) ?? EXECUTION_MODE_REGISTRY[0];

  if (!defaultMode) {
    throw new Error('Execution mode registry is empty.');
  }

  return EXECUTION_MODE_REGISTRY.find((item) => item.id === mode) ?? defaultMode;
}
