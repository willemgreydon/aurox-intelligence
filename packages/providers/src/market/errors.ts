import type { MarketDataProvider } from '../config';
import { HttpError } from '../shared/http-client';
import type { ProviderError, ProviderErrorCode } from './types';

export class MarketProviderError extends Error {
  constructor(
    readonly provider: MarketDataProvider,
    readonly code: ProviderErrorCode,
    message: string,
    readonly retryable = false,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'MarketProviderError';
  }
}

export function createMissingConfigError(provider: MarketDataProvider, detail: string) {
  return new MarketProviderError(provider, 'missing_config', detail, false);
}

export function normalizeProviderError(provider: MarketDataProvider, error: unknown): MarketProviderError {
  if (error instanceof MarketProviderError) {
    return error;
  }

  if (error instanceof HttpError) {
    if (error.status === 401 || error.status === 403) {
      return new MarketProviderError(provider, 'unauthorized', `${provider} rejected the request.`, false, error.status);
    }

    if (error.status === 404) {
      return new MarketProviderError(provider, 'not_found', `${provider} did not find data for the requested symbol.`, false, error.status);
    }

    if (error.status === 429) {
      return new MarketProviderError(provider, 'rate_limited', `${provider} rate limit reached.`, true, error.status);
    }

    return new MarketProviderError(provider, 'unavailable', `${provider} request failed with status ${error.status}.`, true, error.status);
  }

  if (error instanceof SyntaxError) {
    return new MarketProviderError(provider, 'malformed_response', `${provider} returned a malformed response.`, false);
  }

  if (error instanceof Error) {
    return new MarketProviderError(provider, 'unknown', error.message, true);
  }

  return new MarketProviderError(provider, 'unknown', `${provider} request failed.`, true);
}

export function toProviderError(error: MarketProviderError): ProviderError {
  return {
    provider: error.provider,
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    status: error.status,
  };
}
