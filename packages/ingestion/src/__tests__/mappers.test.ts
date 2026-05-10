import { describe, expect, it } from 'vitest';
import {
  mapBinanceOrderBook,
  mapBinanceTicker,
  mapBinanceTrade,
  mapBybitOrderBook,
  mapBybitTicker,
  mapBybitTrade,
  mapCoinbaseOrderBook,
  mapCoinbaseTicker,
  mapCoinbaseTrade,
  mapOkxOrderBook,
  mapOkxTicker,
  mapOkxTrade,
} from '../market-stream/mappers';

describe('market stream payload mappers', () => {
  it('maps binance payloads', () => {
    const tick = mapBinanceTicker({ e: '24hrTicker', s: 'BTCUSDT', c: '64000', b: '63999', a: '64001', B: '1', A: '1', v: '1234', P: '2.1', E: 1700000000000 });
    const trade = mapBinanceTrade({ e: 'trade', s: 'BTCUSDT', t: 42, p: '64000', q: '0.1', m: false, T: 1700000000000 });
    const book = mapBinanceOrderBook({ e: 'depthUpdate', s: 'BTCUSDT', b: [['63999', '2']], a: [['64001', '3']], u: 7, E: 1700000000000 });
    expect(tick?.normalizedSymbol).toBe('BTC/USDT');
    expect(trade?.side).toBe('buy');
    expect(book?.bids[0]?.price).toBe(63999);
  });

  it('maps bybit payloads', () => {
    const tick = mapBybitTicker({ topic: 'tickers.BTCUSDT', ts: 1700000000000, data: [{ symbol: 'BTCUSDT', lastPrice: '64000', bid1Price: '63999', ask1Price: '64001', bid1Size: '1', ask1Size: '1', volume24h: '1000', price24hPcnt: '0.01' }] });
    const trade = mapBybitTrade({ topic: 'publicTrade.BTCUSDT', ts: 1700000000000, data: [{ s: 'BTCUSDT', i: 'abc', p: '64000', v: '0.5', S: 'Sell', T: 1700000000000 }] });
    const book = mapBybitOrderBook({ topic: 'orderbook.1.BTCUSDT', data: { s: 'BTCUSDT', b: [['63999', '2']], a: [['64001', '3']], u: 8, ts: 1700000000000 } });
    expect(tick?.normalizedSymbol).toBe('BTC/USDT');
    expect(trade?.side).toBe('sell');
    expect(book?.asks[0]?.size).toBe(3);
  });

  it('maps okx payloads', () => {
    const tick = mapOkxTicker({ arg: { channel: 'tickers' }, data: [{ instId: 'BTC-USDT', last: '64000', bidPx: '63999', askPx: '64001', bidSz: '1', askSz: '1', vol24h: '1000', sodUtc0: '63000', ts: '1700000000000' }] });
    const trade = mapOkxTrade({ arg: { channel: 'trades' }, data: [{ instId: 'BTC-USDT', tradeId: '1', px: '64000', sz: '0.2', side: 'buy', ts: '1700000000000' }] });
    const book = mapOkxOrderBook({ arg: { channel: 'books', instId: 'BTC-USDT' }, data: [{ instId: 'BTC-USDT', bids: [['63999', '2']], asks: [['64001', '3']], seqId: 99, ts: '1700000000000' }] });
    expect(tick?.normalizedSymbol).toBe('BTC/USDT');
    expect(trade?.size).toBe(0.2);
    expect(book?.sequence).toBe(99);
  });

  it('maps coinbase payloads', () => {
    const tick = mapCoinbaseTicker({ type: 'ticker', product_id: 'BTC-USD', price: '64000', best_bid: '63999', best_ask: '64001', volume_24h: '1000', time: '2026-05-09T00:00:00.000Z' });
    const trade = mapCoinbaseTrade({ type: 'match', product_id: 'BTC-USD', trade_id: 2, price: '64000', size: '0.2', side: 'sell', time: '2026-05-09T00:00:00.000Z' });
    const book = mapCoinbaseOrderBook({ type: 'l2update', product_id: 'BTC-USD', sequence: 5, time: '2026-05-09T00:00:00.000Z', changes: [['buy', '63999', '2'], ['sell', '64001', '3']] });
    expect(tick?.normalizedSymbol).toBe('BTC/USD');
    expect(trade?.tradeId).toBe('2');
    expect(book?.bids[0]?.price).toBe(63999);
  });
});
