type WorkspacePreferencesValidationInput = {
  brokerModeCapitalLimitUsd: number;
  microTradeAllocationPercent: number;
};

export type TrackedSymbolsValidationResult = {
  normalized: string[];
  invalid: string[];
  isValid: boolean;
  message: string;
};

const TRACKED_SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9:._/-]{0,19}$/;
const MAX_TRACKED_SYMBOLS = 12;

export function normalizeTrackedSymbols(input: string): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const candidate of input.replace(/\r?\n/g, ',').split(',')) {
    const symbol = candidate.trim().toUpperCase();
    if (!symbol || seen.has(symbol)) {
      continue;
    }
    seen.add(symbol);
    normalized.push(symbol);
  }

  return normalized;
}

export function validateTrackedSymbols(symbols: string[]): TrackedSymbolsValidationResult {
  const normalized = normalizeTrackedSymbols(symbols.join(','));
  const valid = normalized.filter((symbol) => TRACKED_SYMBOL_PATTERN.test(symbol));
  const invalid = normalized.filter((symbol) => !TRACKED_SYMBOL_PATTERN.test(symbol));
  const limited = valid.slice(0, MAX_TRACKED_SYMBOLS);

  const messageParts: string[] = [];
  messageParts.push(`${limited.length} valid symbol${limited.length === 1 ? '' : 's'}`);
  if (invalid.length > 0) {
    messageParts.push(`${invalid.length} invalid ignored`);
  }
  if (valid.length > MAX_TRACKED_SYMBOLS) {
    messageParts.push(`limited to ${MAX_TRACKED_SYMBOLS}`);
  }

  return {
    normalized: limited,
    invalid,
    isValid: limited.length > 0,
    message: messageParts.join(' · '),
  };
}

export function validateWorkspacePreferences(form: WorkspacePreferencesValidationInput) {
  const fieldErrors: Record<string, string> = {};

  if (!Number.isFinite(form.brokerModeCapitalLimitUsd) || form.brokerModeCapitalLimitUsd <= 0) {
    fieldErrors.brokerModeCapitalLimitUsd = 'Capital limit must be a positive number.';
  }

  if (
    !Number.isFinite(form.microTradeAllocationPercent) ||
    form.microTradeAllocationPercent < 0 ||
    form.microTradeAllocationPercent > 100
  ) {
    fieldErrors.microTradeAllocationPercent = 'Micro-trade allocation must be between 0 and 100.';
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

