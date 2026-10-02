import { unstable_cache } from 'next/cache';
import { getNewsReadModel } from '../queries/news-query';

// The news stream is public and non-user-specific, and the ingestion worker
// refreshes it on a slow cadence (~12 min). Without a cross-request cache,
// getNewsReadModel re-read Neon (universe symbols) + external providers on every
// homepage/dashboard/news render — a standing source of Neon data-transfer
// egress under uptime pings and bot traffic. A 5-minute Data Cache window serves
// repeat visitors from cache with no meaningful freshness cost. No user scope,
// so a single shared entry is correct and safe (user-specific-cache-rule N/A).
const loadNewsStream = unstable_cache(
  async () => getNewsReadModel(),
  ['home-news-stream-v1'],
  { revalidate: 300 },
);

export async function getNewsStreamData() {
  return loadNewsStream();
}
