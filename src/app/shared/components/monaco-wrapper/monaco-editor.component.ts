import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
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
import { EditorSettingsService } from '../../../core/services/editor-settings.service';
import { registerMonacoThemes, resolveMonacoTheme } from './monaco-themes.util';

interface MonacoFindControllerContribution extends MonacoType.editor.IEditorContribution {
  closeFindWidget?: () => void;
  getState?: () => { isRevealed?: boolean };
}

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
  private readonly editorSettings = inject(EditorSettingsService);
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
  readonly fontSize = input<number | undefined>(undefined);

  readonly effectiveFontSize = computed<number>(() => {
    const custom = this.fontSize();
    return custom !== undefined ? custom : this.editorSettings.fontSize();
  });

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

    // 5. Sync theme (5 discrete themes supported)
    effect(() => {
      const currentTheme = this.themeService.theme();
      if (this.monacoModule) {
        this.monacoModule.editor.setTheme(resolveMonacoTheme(currentTheme));
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

    // 7. Sync font size
    effect(() => {
      const size = this.effectiveFontSize();
      const editor = this.editorInstance();
      if (editor) {
        editor.updateOptions({ fontSize: size });
      }
    });
  }

  private async initMonaco(): Promise<void> {
    try {
      // Ensure MonacoEnvironment is safely defined to eliminate non-existent 404 remote worker fetches
      if (typeof window !== 'undefined' && !(window as any).MonacoEnvironment) {
        (window as any).MonacoEnvironment = {
          getWorker: () => {
            const blob = new Blob(['self.onmessage = function() {};'], {
              type: 'application/javascript',
            });
            return new Worker(URL.createObjectURL(blob));
          },
        };
      }

      this.monacoModule = await import('monaco-editor');
      const monaco = this.monacoModule;

      this.registerThemes(monaco);

      // Optimize JSON language configuration: JsonLens handles validation & formatting client-side.
      // Disabling unused worker-side features prevents non-existent worker network requests & worker RPC hangs.
      const jsonLang = (monaco.languages as Record<string, any>)?.['json'];
      if (jsonLang?.jsonDefaults) {
        jsonLang.jsonDefaults.setDiagnosticsOptions({
          validate: false,
          enableSchemaRequest: false,
        });
        jsonLang.jsonDefaults.setModeConfiguration({
          documentFormattingEdits: false,
          documentRangeFormattingEdits: false,
          completionItems: true,
          hovers: true,
          documentSymbols: false,
          tokens: true,
          colors: true,
          foldingRanges: false, // Handled synchronously by IndentRangeProvider
          diagnostics: false,   // Handled by JsonEngineService
          selectionRanges: true,
        });
      }

      const initialTheme = resolveMonacoTheme(this.themeService.theme());

      const container = this.editorContainer().nativeElement;

      this.editor = monaco.editor.create(container, {
        value: this.content(),
        language: this.language(),
        theme: initialTheme,
        readOnly: this.readOnly(),
        automaticLayout: false,
        minimap: { enabled: this.minimap() },
        wordWrap: this.wordWrap(),
        lineNumbers: this.lineNumbers(),
        folding: true,
        foldingStrategy: 'indentation',
        showFoldingControls: 'mouseover',
        fontSize: this.effectiveFontSize(),
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
      monaco.editor.setTheme(initialTheme);

      // Dedicated ResizeObserver replacing automaticLayout polling
      let layoutRafId: number | null = null;
      let resizeObserver: ResizeObserver | null = null;

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
              if (layoutRafId !== null) {
                cancelAnimationFrame(layoutRafId);
              }
              layoutRafId = requestAnimationFrame(() => {
                layoutRafId = null;
                if (this.editor) {
                  this.editor.layout();
                }
              });
            }
          }
        });
        resizeObserver.observe(container);
      }

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
        if (layoutRafId !== null) {
          cancelAnimationFrame(layoutRafId);
          layoutRafId = null;
        }
        if (resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver = null;
        }
        container.removeEventListener('mouseenter', onContainerMouseOver, true);
        container.removeEventListener('mouseover', onContainerMouseOver, true);
        this.editorInstance.set(null);
        changeDisposable.dispose();

        // Memory audit: dispose model and editor instances cleanly
        const model = this.editor?.getModel();
        this.editor?.dispose();
        if (model && !model.isDisposed()) {
          model.dispose();
        }
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
      const controller = this.editor.getContribution<MonacoFindControllerContribution>(
        'editor.contrib.findController',
      );
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
      const controller = this.editor.getContribution<MonacoFindControllerContribution>(
        'editor.contrib.findController',
      );
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

  layout(): void {
    if (this.editor) {
      this.editor.layout();
    }
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
    registerMonacoThemes(monaco);
  }
}
