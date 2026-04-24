import type { IngestionRun } from '@repo/api-contracts';

export type IngestionAssetKind = 'stock' | 'etf' | 'crypto' | 'fx' | 'index';

export type IngestionRecord = {
  readonly sourceSymbol: string;
  readonly canonicalSymbol: string;
  readonly assetKind: IngestionAssetKind;
  readonly provider: string;
  readonly observedAt: string | null;
  readonly price: number | null;
  readonly change: number | null;
  readonly changePercent: number | null;
};

export type IngestionError = {
  readonly sourceSymbol: string;
  readonly reason: string;
};

export type IngestionBatchSummary = {
  readonly totalRecords: number;
  readonly canonicalizedRecords: number;
  readonly droppedRecords: number;
  readonly failedRecords: number;
};

export type IngestionRunState = IngestionRun;
