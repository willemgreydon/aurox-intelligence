import { unstable_cache } from 'next/cache';
import { fetchMacroSnapshot } from '@repo/providers';
import { computeMacroRegimeModel } from '../lib/macro-regime-engine';

export type MacroIntelligenceViewModel = {
  regime: ReturnType<typeof computeMacroRegimeModel>;
  providerStatus: Awaited<ReturnType<typeof fetchMacroSnapshot>>['providerStatus'];
  topSeries: Awaited<ReturnType<typeof fetchMacroSnapshot>>['series'];
  generatedAt: string;
  simulationOnlyLabel: string;
};

const getCachedMacroSnapshot = unstable_cache(
  async () => fetchMacroSnapshot(),
  ['macro-snapshot-v1'],
  { revalidate: Math.max(300, Number(process.env.MACRO_CACHE_TTL_SECONDS ?? 21_600)) },
);

export async function getMacroIntelligenceViewModel(): Promise<MacroIntelligenceViewModel> {
  try {
    const snapshot = await getCachedMacroSnapshot();
    return {
      regime: computeMacroRegimeModel(snapshot.series),
      providerStatus: snapshot.providerStatus,
      topSeries: snapshot.series.slice(0, 8),
      generatedAt: snapshot.generatedAt,
      simulationOnlyLabel: 'Simulation context only. No real order will be placed.',
    };
  } catch {
    const now = new Date().toISOString();
    return {
      regime: computeMacroRegimeModel([]),
      providerStatus: [],
      topSeries: [],
      generatedAt: now,
      simulationOnlyLabel: 'Simulation context only. No real order will be placed.',
    };
  }
}
