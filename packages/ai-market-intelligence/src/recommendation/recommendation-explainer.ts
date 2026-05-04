import type { Recommendation } from './recommendation-engine';

export function buildRecommendationExplanation(input: Recommendation): string {
  const positive = input.reasoning.signalDrivers.slice(0, 2).join('; ');
  const negative = input.reasoning.riskDrivers.slice(0, 2).join('; ');
  const news = input.reasoning.newsDrivers.slice(0, 2).join('; ');
  const uncertainty = input.reasoning.uncertaintyNotes.slice(0, 1).join(' ');

  const parts: string[] = [];
  if (positive) parts.push(`Signal context: ${positive}.`);
  if (news) parts.push(`News context: ${news}.`);
  if (negative) parts.push(`Risk context: ${negative}.`);
  if (uncertainty) parts.push(`Uncertainty: ${uncertainty}`);

  if (parts.length === 0) {
    return 'Recommendation is based on balanced signal, news, and risk inputs with no dominant driver.';
  }

  return parts.join(' ');
}
