type ProviderErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

export function normalizeProviderErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'selection' in error) {
    const selection = (error as { selection?: { errors?: ProviderErrorLike[] } }).selection;
    const providerErrors = selection?.errors ?? [];
    if (providerErrors.length > 0) {
      return normalizeProviderErrorMessage(providerErrors[0]);
    }
  }

  if (typeof error === 'object' && error !== null) {
    const providerError = error as ProviderErrorLike;
    switch (providerError.code) {
      case 'missing_config':
        return 'Provider API key is missing.';
      case 'rate_limited':
        return 'Provider rate limit reached. Using cached data when available.';
      case 'unsupported_symbol':
        return 'Symbol is not supported by the selected provider.';
      case 'unauthorized':
        return 'Provider authorization failed.';
      case 'unavailable':
        return 'Provider is temporarily unavailable.';
      case 'malformed_response':
        return 'Provider returned malformed data.';
      case 'not_found':
        return 'No provider data found for this request.';
      default:
        break;
    }
    if (typeof providerError.status === 'number' && providerError.status === 429) {
      return 'Provider rate limit reached. Using cached data when available.';
    }
  }

  return 'Market data is currently unavailable from the provider.';
}

