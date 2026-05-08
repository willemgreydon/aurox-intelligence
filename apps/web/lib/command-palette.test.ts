import { describe, expect, it } from 'vitest';
import { searchCommandPalette, type CommandPaletteEntry } from './command-palette';

const entries: CommandPaletteEntry[] = [
  { id: '0', title: 'Alert Center', href: '/alerts', group: 'Routes', keywords: ['alerts', 'critical'] },
  { id: '1', title: 'Observe', href: '/observe', group: 'Routes', keywords: ['observer', 'timeline'] },
  { id: '2', title: 'Signals', href: '/signals', group: 'Routes', keywords: ['confidence'] },
  { id: '3', title: 'BTC · Bitcoin', href: '/stocks/BTC', group: 'Assets', keywords: ['crypto', 'btc'] },
];

describe('command-palette search', () => {
  it('returns default results when query is empty', () => {
    const rows = searchCommandPalette(entries, '');
    expect(rows.length).toBe(4);
  });

  it('prioritizes exact/prefix matches', () => {
    const rows = searchCommandPalette(entries, 'obs');
    expect(rows[0]?.title).toBe('Observe');
  });

  it('finds keyword matches', () => {
    const rows = searchCommandPalette(entries, 'crypto');
    expect(rows.some((row) => row.id === '3')).toBe(true);
  });

  it('includes alert center route in results', () => {
    const rows = searchCommandPalette(entries, 'alerts');
    expect(rows.some((row) => row.href === '/alerts')).toBe(true);
  });
});
