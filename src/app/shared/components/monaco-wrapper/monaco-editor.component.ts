import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import type * as MonacoType from 'monaco-editor';
import { JsonError } from '../../../core/models/json-lens.model';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-monaco-editor',
  standalone: true,
  templateUrl: './monaco-editor.component.html',
  styleUrl: './monaco-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonacoEditorComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly destroyRef = inject(DestroyRef);
  private readonly themeService = inject(ThemeService);
  private readonly appRef = inject(ApplicationRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly editorContainer = viewChild.required<ElementRef<HTMLDivElement>>('editorContainer');

  // Two-way content model
  readonly content = model<string>('');

  // Signal inputs
  readonly readOnly = input<boolean>(false);
  readonly language = input<string>('json');
  readonly errorMarkers = input<JsonError[] | null>(null);
  readonly minimap = input<boolean>(false);
  readonly wordWrap = input<'on' | 'off'>('on');
  readonly lineNumbers = input<'on' | 'off'>('on');

  // Outputs for shortcut actions
  readonly formatRequested = output<void>();
  readonly minifyRequested = output<void>();
  readonly autoRepairRequested = output<void>();

  private editor: MonacoType.editor.IStandaloneCodeEditor | null = null;
  private readonly editorInstance = signal<MonacoType.editor.IStandaloneCodeEditor | null>(null);
  private monacoModule: typeof MonacoType | null = null;
  private isInternalUpdate = false;
  private tickScheduled = false;

  constructor() {
    // 1. Initialize Monaco in browser after rendering
    afterNextRender(async () => {
      if (!this.isBrowser) {
        return;
      }
      await this.initMonaco();
    });

    // 2. Sync content signal to editor when changed externally
    effect(() => {
      const editor = this.editorInstance();
      const newContent = this.content();
      if (editor && !this.isInternalUpdate) {
        const currentVal = editor.getValue();
        if (currentVal !== newContent) {
          if (this.readOnly()) {
            const model = editor.getModel();
            if (model) {
              model.setValue(newContent);
            } else {
              editor.setValue(newContent);
            }
          } else {
            const model = editor.getModel();
            if (model) {
              editor.pushUndoStop();
              editor.executeEdits('external-update', [
                {
                  range: model.getFullModelRange(),
                  text: newContent,
                  forceMoveMarkers: true,
                },
              ]);
              editor.pushUndoStop();
            } else {
              editor.setValue(newContent);
            }
          }
        }
      }
    });

    // 3. Sync readOnly
    effect(() => {
      const isReadOnly = this.readOnly();
      const editor = this.editorInstance();
      if (editor) {
        editor.updateOptions({ readOnly: isReadOnly });
      }
    });

    // 4. Sync language
    effect(() => {
      const lang = this.language();
      const editor = this.editorInstance();
      if (editor && this.monacoModule) {
        const model = editor.getModel();
        if (model) {
          this.monacoModule.editor.setModelLanguage(model, lang);
        }
      }
    });

    // 5. Sync theme (dark / light)
    effect(() => {
      const currentTheme = this.themeService.theme();
      if (this.monacoModule) {
        this.monacoModule.editor.setTheme(
          currentTheme === 'dark' ? 'jsonlens-dark' : 'jsonlens-light',
        );
      }
    });

    // 6. Sync error markers
    effect(() => {
      const errors = this.errorMarkers();
      const editor = this.editorInstance();
      if (editor && this.monacoModule) {
        const model = editor.getModel();
        if (model) {
          if (!errors || errors.length === 0) {
            this.monacoModule.editor.setModelMarkers(model, 'jsonlens', []);
          } else {
            const markers: MonacoType.editor.IMarkerData[] = errors.map((err) => ({
              severity: this.monacoModule!.MarkerSeverity.Error,
              message: err.message,
              startLineNumber: err.line,
              startColumn: err.column,
              endLineNumber: err.line,
              endColumn: err.column + 1,
            }));
            this.monacoModule.editor.setModelMarkers(model, 'jsonlens', markers);
          }
        }
      }
    });
  }

  private async initMonaco(): Promise<void> {
    try {
      this.monacoModule = await import('monaco-editor');
      const monaco = this.monacoModule;

      this.registerThemes(monaco);

      const initialTheme =
        this.themeService.theme() === 'dark' ? 'jsonlens-dark' : 'jsonlens-light';

      const container = this.editorContainer().nativeElement;

      this.editor = monaco.editor.create(container, {
        value: this.content(),
        language: this.language(),
        theme: initialTheme,
        readOnly: this.readOnly(),
        automaticLayout: true,
        minimap: { enabled: this.minimap() },
        wordWrap: this.wordWrap(),
        lineNumbers: this.lineNumbers(),
        fontSize: 13,
        fontFamily: "var(--font-mono), 'JetBrains Mono', Consolas, monospace",
        fontLigatures: true,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        renderLineHighlight: 'all',
        tabSize: 2,
        padding: { top: 12, bottom: 12 },
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
          useShadows: false,
        },
        find: {
          addExtraSpaceOnTop: false,
        },
      });

      this.editorInstance.set(this.editor);

      // Register keyboard shortcut actions within Monaco editor
      this.editor.addAction({
        id: 'jsonlens.format',
        label: 'Format JSON',
        keybindings: [
          monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
          monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
        ],
        run: () => {
          this.formatRequested.emit();
        },
      });

      this.editor.addAction({
        id: 'jsonlens.minify',
        label: 'Minify JSON',
        keybindings: [
          monaco.KeyMod.Alt | monaco.KeyCode.KeyM,
        ],
        run: () => {
          this.minifyRequested.emit();
        },
      });

      this.editor.addAction({
        id: 'jsonlens.autoRepair',
        label: 'Auto-Fix JSON Syntax',
        keybindings: [
          monaco.KeyMod.Alt | monaco.KeyCode.KeyR,
        ],
        run: () => {
          this.autoRepairRequested.emit();
        },
      });

      // Intercept hover on close button to prevent Monaco's hoverService popup & strip title
      const onContainerMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        const closeBtn = target?.closest<HTMLElement>(
          '.button.codicon-widget-close, .close-button'
        );
        if (closeBtn) {
          if (closeBtn.hasAttribute('title')) {
            closeBtn.removeAttribute('title');
          }
          // Prevent Monaco's hoverService from scheduling a tooltip popup
          e.stopImmediatePropagation();
        }
      };
      container.addEventListener('mouseover', onContainerMouseOver, true);
      container.addEventListener('mouseenter', onContainerMouseOver, true);

      // Listen to editor changes and update model signal
      const changeDisposable = this.editor.onDidChangeModelContent(() => {
        if (!this.editor) return;
        const val = this.editor.getValue();
        this.isInternalUpdate = true;
        this.content.set(val);
        this.isInternalUpdate = false;
        this.cdr.markForCheck();
        this.scheduleAppTick();
      });

      // Cleanup
      this.destroyRef.onDestroy(() => {
        container.removeEventListener('mouseenter', onContainerMouseOver, true);
        container.removeEventListener('mouseover', onContainerMouseOver, true);
        this.editorInstance.set(null);
        changeDisposable.dispose();
        this.editor?.dispose();
        this.editor = null;
      });
    } catch (err) {
      console.error('Failed to initialize Monaco Editor:', err);
    }
  }

  triggerFind(): void {
    if (!this.editor) return;
    this.editor.focus();
    const action = this.editor.getAction('actions.find');
    if (action) {
      action.run();
    }
    const container = this.editorContainer()?.nativeElement;
    if (container) {
      const findWidget = container.querySelector('.find-widget');
      if (findWidget) {
        findWidget.classList.add('visible');
      }
    }
    this.stripCloseButtonTooltip();
  }

  private stripCloseButtonTooltip(): void {
    const container = this.editorContainer()?.nativeElement;
    if (!container) return;
    const closeBtn = container.querySelector<HTMLElement>(
      '.find-widget .button.codicon-widget-close, .find-widget .close-button'
    );
    if (closeBtn && closeBtn.hasAttribute('title')) {
      closeBtn.removeAttribute('title');
    }
  }

  closeFindWidget(): void {
    if (!this.editor) return;
    try {
      const controller = (this.editor as any).getContribution('editor.contrib.findController');
      if (controller?.closeFindWidget) {
        controller.closeFindWidget();
      }
    } catch {
      // Fallback
    }
    const container = this.editorContainer()?.nativeElement;
    const findWidget = container?.querySelector('.find-widget');
    if (findWidget) {
      findWidget.classList.remove('visible');
    }
    const closeBtn = container?.querySelector<HTMLElement>(
      '.find-widget .button.codicon-widget-close, .find-widget .close-button'
    );
    if (closeBtn) {
      closeBtn.click();
    }
  }

  isFindWidgetVisible(): boolean {
    if (!this.editor) return false;
    try {
      const controller = (this.editor as any).getContribution('editor.contrib.findController');
      if (controller?.getState) {
        return !!controller.getState()?.isRevealed;
      }
    } catch {
      // Fallback
    }
    const container = this.editorContainer()?.nativeElement;
    const findWidget = container?.querySelector('.find-widget');
    return !!(findWidget && findWidget.classList.contains('visible'));
  }

  private scheduleAppTick(): void {
    if (this.tickScheduled) return;
    this.tickScheduled = true;
    queueMicrotask(() => {
      this.tickScheduled = false;
      if (!this.appRef.destroyed) {
        try {
          this.appRef.tick();
        } catch {
          // Safeguard against tick re-entrancy
        }
      }
    });
  }

  private registerThemes(monaco: typeof MonacoType): void {
    monaco.editor.defineTheme('jsonlens-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'string.value.json', foreground: '34d399' },
        { token: 'number.json', foreground: '38bdf8' },
        { token: 'keyword.json', foreground: 'fbbf24' },
      ],
      colors: {
        'editor.background': '#18181b', // zinc-900
        'editor.foreground': '#f4f4f5',
        'editorLineNumber.foreground': '#52525b',
        'editorLineNumber.activeForeground': '#a1a1aa',
        'editor.lineHighlightBackground': '#202024',
        'editor.selectionBackground': '#3730a3',
        'editorCursor.foreground': '#818cf8',
        'editorWidget.background': '#202024',
        'editorWidget.border': '#27272a',
      },
    });

    monaco.editor.defineTheme('jsonlens-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '4f46e5', fontStyle: 'bold' },
        { token: 'string.value.json', foreground: '059669' },
        { token: 'number.json', foreground: '0284c7' },
        { token: 'keyword.json', foreground: 'd97706' },
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
      },
    });
  }
}
