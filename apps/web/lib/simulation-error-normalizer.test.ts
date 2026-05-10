import { describe, expect, it } from 'vitest';
import { normalizeSimulationError } from './simulation-error-normalizer';

describe('normalizeSimulationError', () => {
  describe('provider quota / rate limit errors', () => {
    it('normalizes OpenAI quota error', () => {
      const result = normalizeSimulationError(
        new Error('You exceeded your current quota, please check your plan and billing details.'),
      );
      expect(result.userMessage).toBe('AI provider temporarily unavailable. No order was submitted.');
      expect(result.isRecoverable).toBe(true);
      expect(result.technicalDetail).toBeDefined();
    });

    it('normalizes 429 rate limit', () => {
      const result = normalizeSimulationError(new Error('429 Too Many Requests from OpenAI API'));
      expect(result.userMessage).toBe('AI provider temporarily unavailable. No order was submitted.');
      expect(result.isRecoverable).toBe(true);
    });

    it('normalizes insufficient_quota string', () => {
      const result = normalizeSimulationError(new Error('insufficient_quota: API key exhausted'));
      expect(result.userMessage).toBe('AI provider temporarily unavailable. No order was submitted.');
    });
  });

  describe('missing quote errors', () => {
    it('normalizes fresh ETF quote required error', () => {
      const result = normalizeSimulationError(new Error('Fresh ETF quote required before simulation execution. (SPY)'));
      expect(result.userMessage).toBe('Quote unavailable. The simulated order was not submitted.');
      expect(result.isRecoverable).toBe(true);
    });

    it('normalizes fresh crypto quote required error', () => {
      const result = normalizeSimulationError(new Error('Fresh crypto quote required before simulation execution. (BTC-USD)'));
      expect(result.userMessage).toBe('Quote unavailable. The simulated order was not submitted.');
    });

    it('normalizes market data unavailable', () => {
      const result = normalizeSimulationError(new Error('market data unavailable for AAPL'));
      expect(result.userMessage).toBe('Quote unavailable. The simulated order was not submitted.');
    });
  });

  describe('stale quote errors', () => {
    it('normalizes stale quote error', () => {
      const result = normalizeSimulationError(new Error('stale quote detected, cannot proceed'));
      expect(result.userMessage).toContain('stale');
      expect(result.userMessage).toContain('Refresh');
      expect(result.isRecoverable).toBe(true);
    });
  });

  describe('insufficient cash errors', () => {
    it('normalizes insufficient fictive cash', () => {
      const result = normalizeSimulationError(
        new Error('Insufficient fictive cash balance for this order.'),
      );
      expect(result.userMessage).toBe('Insufficient simulated cash for this order.');
      expect(result.isRecoverable).toBe(false);
    });

    it('normalizes available cash message', () => {
      const result = normalizeSimulationError(
        new Error('Insufficient available simulation cash. Required: $500.00. Available: $100.00.'),
      );
      expect(result.userMessage).toBe('Insufficient simulated cash for this order.');
      expect(result.isRecoverable).toBe(false);
    });
  });

  describe('no position to sell', () => {
    it('normalizes no open position with symbol', () => {
      const result = normalizeSimulationError(new Error('No open AAPL position is available to sell.'));
      expect(result.userMessage).toContain('AAPL');
      expect(result.isRecoverable).toBe(false);
    });

    it('normalizes insufficient position quantity', () => {
      const result = normalizeSimulationError(new Error('Insufficient position quantity for this sell order.'));
      expect(result.userMessage).toContain('position');
      expect(result.isRecoverable).toBe(false);
    });
  });

  describe('invalid quantity', () => {
    it('normalizes zero quantity error', () => {
      const result = normalizeSimulationError(new Error('Order quantity must be greater than zero.'));
      expect(result.userMessage).toBe('Invalid quantity for this order.');
      expect(result.isRecoverable).toBe(true);
    });
  });

  describe('database timeout / connectivity', () => {
    it('normalizes simulation database unavailable', () => {
      const result = normalizeSimulationError(new Error('Simulation database is currently unavailable.'));
      expect(result.userMessage).toBe('Database temporarily unavailable. Please try again.');
      expect(result.isRecoverable).toBe(true);
    });

    it('normalizes ECONNREFUSED', () => {
      const result = normalizeSimulationError(new Error('connect ECONNREFUSED 127.0.0.1:5432'));
      expect(result.userMessage).toBe('Database temporarily unavailable. Please try again.');
      // Raw error must not appear in userMessage
      expect(result.userMessage).not.toContain('127.0.0.1');
      expect(result.technicalDetail).toContain('127.0.0.1');
    });
  });

  describe('internal DB errors', () => {
    it('normalizes postgres syntax error', () => {
      const result = normalizeSimulationError(
        new Error('ERROR: syntax error at or near "WHERE" (SQLSTATE 42601)'),
      );
      expect(result.userMessage).toBe('An internal error occurred. The order was not submitted.');
      expect(result.userMessage).not.toContain('SQLSTATE');
      expect(result.userMessage).not.toContain('syntax error');
      expect(result.technicalDetail).toContain('SQLSTATE');
      expect(result.isRecoverable).toBe(true);
    });

    it('normalizes duplicate key violation', () => {
      const result = normalizeSimulationError(
        new Error('duplicate key value violates unique constraint "simulation_orders_pkey"'),
      );
      expect(result.userMessage).toBe('An internal error occurred. The order was not submitted.');
    });
  });

  describe('unknown errors', () => {
    it('normalizes completely unknown error', () => {
      const result = normalizeSimulationError(new Error('Something totally unexpected went wrong.'));
      expect(result.userMessage).toBe('An unexpected error occurred. The order was not submitted.');
      expect(result.isRecoverable).toBe(true);
    });

    it('handles non-Error thrown values', () => {
      const result = normalizeSimulationError('plain string error');
      expect(result.userMessage).toBe('An unexpected error occurred. The order was not submitted.');
      expect(result.technicalDetail).toBe('plain string error');
    });

    it('handles null/undefined', () => {
      const result = normalizeSimulationError(null);
      expect(result.userMessage).toBe('An unexpected error occurred. The order was not submitted.');
    });
  });

  describe('raw URL / credential safety', () => {
    it('never exposes raw URLs in userMessage', () => {
      const result = normalizeSimulationError(
        new Error('https://api.openai.com/v1/chat/completions 429 rate limit'),
      );
      expect(result.userMessage).not.toContain('https://');
      expect(result.userMessage).not.toContain('openai.com');
    });

    it('never exposes API keys in userMessage', () => {
      const result = normalizeSimulationError(
        new Error('API key sk-abc123xyz is invalid or expired'),
      );
      expect(result.userMessage).not.toContain('sk-');
    });
  });
});
