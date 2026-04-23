import './index.css';

export type Theme = 'light' | 'dark';

export const themes = {
  light: 'light',
  dark: 'dark',
} as const;

export const themeStorageKey = 'fip-theme';
