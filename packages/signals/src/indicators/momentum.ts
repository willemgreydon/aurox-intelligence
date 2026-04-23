export function momentum(values: number[]): number | null {
  if (values.length < 2) return null;

  const first = values[0];
  const last = values.at(-1);

  if (first === undefined || last === undefined) {
    return null;
  }

  return last - first;
}
