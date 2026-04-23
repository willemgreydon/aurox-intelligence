export interface FinnhubQuoteResponse {
  c: number;
  d?: number;
  dp?: number;
  pc?: number;
  t: number;
}

export interface FinnhubCandleResponse {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  s: 'ok' | 'no_data';
  t: number[];
  v?: number[];
}

export interface EodhdRealTimeResponse {
  code?: string;
  close?: number | string;
  change?: number | string;
  change_p?: number | string;
  previousClose?: number | string;
  timestamp?: number | string;
  gmtoffset?: number;
}

export interface EodhdHistoricalPointResponse {
  date?: string;
  open?: number | string;
  high?: number | string;
  low?: number | string;
  close?: number | string;
  adjusted_close?: number | string;
  volume?: number | string;
}
