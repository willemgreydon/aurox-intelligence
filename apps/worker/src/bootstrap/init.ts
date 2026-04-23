export async function initializeWorker() {
  return {
    ok: true,
    capabilities: ['ingest-market-data', 'recompute-signals', 'recompute-forecasts', 'extract-market-intelligence'],
  };
}
