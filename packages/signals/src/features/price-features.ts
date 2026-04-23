export function buildPriceFeatures(values: number[]) {
  return { latest: values.at(-1) ?? null };
}
