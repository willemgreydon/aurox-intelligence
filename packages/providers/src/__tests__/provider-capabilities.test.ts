import { describe, expect, it } from 'vitest';
import { getProviderCapabilities, listProviderCapabilities } from '../market/provider-capabilities';

describe('provider capabilities registry', () => {
  it('includes required public stream providers', () => {
    const ids = listProviderCapabilities().map((item) => item.providerId);
    expect(ids).toContain('binance');
    expect(ids).toContain('bybit');
    expect(ids).toContain('okx');
    expect(ids).toContain('coinbase');
    expect(ids).toContain('world-bank');
    expect(ids).toContain('ecb');
    expect(ids).toContain('fred');
  });

  it('marks bybit/okx as public-only auth mode', () => {
    expect(getProviderCapabilities('bybit').authMode).toBe('none');
    expect(getProviderCapabilities('okx').authMode).toBe('none');
    expect(getProviderCapabilities('bybit').supportsAuthenticatedAccount).toBe(false);
  });

  it('keeps binance as hmac-capable provider', () => {
    const caps = getProviderCapabilities('binance');
    expect(caps.authMode).toBe('hmac');
    expect(caps.supportsWebSocket).toBe(true);
    expect(caps.supportsPerpetuals).toBe(true);
  });

  it('models macro providers with correct auth modes', () => {
    expect(getProviderCapabilities('world-bank').authMode).toBe('none');
    expect(getProviderCapabilities('ecb').authMode).toBe('none');
    expect(getProviderCapabilities('fred').authMode).toBe('api-key');
  });
});
