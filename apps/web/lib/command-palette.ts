export type CommandPaletteEntry = {
  id: string;
  title: string;
  description?: string;
  href: string;
  group: 'Routes' | 'Assets' | 'Actions' | 'Observations' | 'Watchlists';
  keywords?: string[];
};

export function searchCommandPalette(entries: CommandPaletteEntry[], query: string): CommandPaletteEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return entries.slice(0, 24);
  }

  const score = (entry: CommandPaletteEntry): number => {
    const title = entry.title.toLowerCase();
    const description = (entry.description ?? '').toLowerCase();
    const href = entry.href.toLowerCase();
    const keywords = (entry.keywords ?? []).join(' ').toLowerCase();
    if (title === q) return 400;
    if (title.startsWith(q)) return 260;
    if (title.includes(q)) return 200;
    if (keywords.includes(q)) return 150;
    if (href.includes(q) || description.includes(q)) return 100;
    return 0;
  };

  return entries
    .map((entry) => ({ entry, score: score(entry) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, 40)
    .map((row) => row.entry);
}
