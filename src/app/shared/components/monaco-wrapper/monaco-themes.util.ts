import type * as MonacoType from 'monaco-editor';
import { AppTheme } from '../../../core/models/theme.model';

export function registerMonacoThemes(monaco: typeof MonacoType): void {
  // 1. Classic Dark
  monaco.editor.defineTheme('jsonlens-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '818cf8', fontStyle: 'bold' },
      { token: 'string.value.json', foreground: '34d399' },
      { token: 'number.json', foreground: '38bdf8' },
      { token: 'keyword.json', foreground: 'fbbf24' },
      { token: 'comment', foreground: '71717a' },
      { token: 'delimiter', foreground: 'a1a1aa' },
    ],
    colors: {
      'editor.background': '#18181b',
      'editor.foreground': '#f4f4f5',
      'editorLineNumber.foreground': '#52525b',
      'editorLineNumber.activeForeground': '#a1a1aa',
      'editor.lineHighlightBackground': '#202024',
      'editor.selectionBackground': '#3730a3',
      'editorCursor.foreground': '#818cf8',
      'editorWidget.background': '#202024',
      'editorWidget.border': '#27272a',
      'editorGutter.background': '#18181b',
      'diffEditor.insertedTextBackground': '#34d39922',
      'diffEditor.removedTextBackground': '#fb718522',
    },
  });

  // 2. Classic Light
  monaco.editor.defineTheme('jsonlens-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '1e1b4b', fontStyle: 'bold' },
      { token: 'string.value.json', foreground: '047857' },
      { token: 'number.json', foreground: '0284c7' },
      { token: 'keyword.json', foreground: 'b45309' },
      { token: 'comment', foreground: '64748b' },
      { token: 'delimiter', foreground: '475569' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#0f172a',
      'editorLineNumber.foreground': '#94a3b8',
      'editorLineNumber.activeForeground': '#334155',
      'editor.lineHighlightBackground': '#f8fafc',
      'editor.selectionBackground': '#e0e7ff',
      'editorCursor.foreground': '#4f46e5',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#e2e8f0',
      'editorGutter.background': '#ffffff',
      'diffEditor.insertedTextBackground': '#0596691a',
      'diffEditor.removedTextBackground': '#e11d481a',
    },
  });

  // 3. Tokyo Night
  monaco.editor.defineTheme('jsonlens-tokyo-night', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '7dcfff', fontStyle: 'bold' },
      { token: 'string.value.json', foreground: '9ece6a' },
      { token: 'number.json', foreground: 'ff9e64' },
      { token: 'keyword.json', foreground: 'bb9af7' },
      { token: 'comment', foreground: '565f89' },
      { token: 'delimiter', foreground: '9aa5ce' },
    ],
    colors: {
      'editor.background': '#1a1b26',
      'editor.foreground': '#c0caf5',
      'editorLineNumber.foreground': '#565f89',
      'editorLineNumber.activeForeground': '#737aa2',
      'editor.lineHighlightBackground': '#1f2335',
      'editor.selectionBackground': '#283457',
      'editorCursor.foreground': '#c0caf5',
      'editorWidget.background': '#1f2335',
      'editorWidget.border': '#292e42',
      'editorGutter.background': '#1a1b26',
      'diffEditor.insertedTextBackground': '#9ece6a22',
      'diffEditor.removedTextBackground': '#f7768e22',
    },
  });

  // 4. Dracula
  monaco.editor.defineTheme('jsonlens-dracula', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '8be9fd', fontStyle: 'bold' },
      { token: 'string.value.json', foreground: '50fa7b' },
      { token: 'number.json', foreground: 'bd93f9' },
      { token: 'keyword.json', foreground: 'ff79c6' },
      { token: 'comment', foreground: '6272a4' },
      { token: 'delimiter', foreground: 'f8f8f2' },
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editorLineNumber.foreground': '#6272a4',
      'editorLineNumber.activeForeground': '#f8f8f2',
      'editor.lineHighlightBackground': '#343746',
      'editor.selectionBackground': '#44475a',
      'editorCursor.foreground': '#f8f8f0',
      'editorWidget.background': '#21222c',
      'editorWidget.border': '#44475a',
      'editorGutter.background': '#282a36',
      'diffEditor.insertedTextBackground': '#50fa7b22',
      'diffEditor.removedTextBackground': '#ff555522',
    },
  });

  // 5. Nord
  monaco.editor.defineTheme('jsonlens-nord', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '88c0d0', fontStyle: 'bold' },
      { token: 'string.value.json', foreground: 'a3be8c' },
      { token: 'number.json', foreground: 'b48ead' },
      { token: 'keyword.json', foreground: '81a1c1' },
      { token: 'comment', foreground: '4c566a' },
      { token: 'delimiter', foreground: 'd8dee9' },
    ],
    colors: {
      'editor.background': '#2e3440',
      'editor.foreground': '#eceff4',
      'editorLineNumber.foreground': '#4c566a',
      'editorLineNumber.activeForeground': '#d8dee9',
      'editor.lineHighlightBackground': '#3b4252',
      'editor.selectionBackground': '#434c5e',
      'editorCursor.foreground': '#d8dee9',
      'editorWidget.background': '#2e3440',
      'editorWidget.border': '#3b4252',
      'editorGutter.background': '#2e3440',
      'diffEditor.insertedTextBackground': '#a3be8c22',
      'diffEditor.removedTextBackground': '#bf616a22',
    },
  });
}

/**
 * Maps the active AppTheme to the corresponding registered Monaco theme identifier.
 */
export function resolveMonacoTheme(theme: AppTheme): string {
  switch (theme) {
    case 'light':
      return 'jsonlens-light';
    case 'tokyo-night':
      return 'jsonlens-tokyo-night';
    case 'dracula':
      return 'jsonlens-dracula';
    case 'nord':
      return 'jsonlens-nord';
    case 'dark':
    default:
      return 'jsonlens-dark';
  }
}

