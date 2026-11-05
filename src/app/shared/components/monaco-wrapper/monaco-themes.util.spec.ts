import { describe, expect, it, vi } from 'vitest';
import type * as MonacoType from 'monaco-editor';
import { registerMonacoThemes, resolveMonacoTheme } from './monaco-themes.util';

describe('MonacoThemesUtil', () => {
  it('should register all 5 themes with monaco.editor.defineTheme', () => {
    const definedThemes: string[] = [];

    const mockMonaco = {
      editor: {
        defineTheme: vi.fn((name: string) => {
          definedThemes.push(name);
        }),
      },
    } as unknown as typeof MonacoType;

    registerMonacoThemes(mockMonaco);

    expect(definedThemes).toContain('jsonlens-dark');
    expect(definedThemes).toContain('jsonlens-light');
    expect(definedThemes).toContain('jsonlens-tokyo-night');
    expect(definedThemes).toContain('jsonlens-dracula');
    expect(definedThemes).toContain('jsonlens-nord');
    expect(definedThemes.length).toBe(5);
  });

  it('should resolve theme identifiers accurately to Monaco theme names', () => {
    expect(resolveMonacoTheme('dark')).toBe('jsonlens-dark');
    expect(resolveMonacoTheme('light')).toBe('jsonlens-light');
    expect(resolveMonacoTheme('tokyo-night')).toBe('jsonlens-tokyo-night');
    expect(resolveMonacoTheme('dracula')).toBe('jsonlens-dracula');
    expect(resolveMonacoTheme('nord')).toBe('jsonlens-nord');
  });
});

