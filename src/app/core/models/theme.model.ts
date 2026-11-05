export type AppTheme = 'dark' | 'light' | 'tokyo-night' | 'dracula' | 'nord';

export interface ThemeDefinition {
  id: AppTheme;
  name: string;
  isDark: boolean;
  /** Preview swatch colors: [background, accent, syntaxHighlight] */
  swatch: [string, string, string];
}

export const THEMES: readonly ThemeDefinition[] = [
  {
    id: 'dark',
    name: 'Classic Dark',
    isDark: true,
    swatch: ['#09090b', '#6366f1', '#a5b4fc'],
  },
  {
    id: 'light',
    name: 'Classic Light',
    isDark: false,
    swatch: ['#f8fafc', '#4f46e5', '#1e1b4b'],
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    isDark: true,
    swatch: ['#1a1b26', '#7aa2f7', '#7dcfff'],
  },
  {
    id: 'dracula',
    name: 'Dracula',
    isDark: true,
    swatch: ['#282a36', '#bd93f9', '#8be9fd'],
  },
  {
    id: 'nord',
    name: 'Nord',
    isDark: true,
    swatch: ['#2e3440', '#88c0d0', '#81a1c1'],
  },
] as const;

