import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { JsonEngineService } from '../../../core/services/json-engine.service';
import { ExportService } from '../../../core/services/export.service';
import { UrlShareService } from '../../../core/services/url-share.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

export interface CommandItem {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly category: 'Formatting' | 'Transform' | 'Export' | 'Navigation' | 'Settings';
  readonly shortcut?: string;
  readonly action: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [ClickOutsideDirective],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPaletteComponent {
  private readonly router = inject(Router);
  private readonly engine = inject(JsonEngineService);
  private readonly exportService = inject(ExportService);
  private readonly urlShareService = inject(UrlShareService);
  private readonly themeService = inject(ThemeService);
  private readonly toastService = inject(ToastService);

  readonly isOpen = model<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly selectedIndex = signal<number>(0);

  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private readonly allCommands: CommandItem[] = [
    {
      id: 'format',
      title: 'Format JSON',
      subtitle: 'Beautify and indent active JSON payload',
      category: 'Formatting',
      shortcut: 'Format',
      action: () => {
        if (this.engine.isValid()) {
          this.engine.format();
          this.toastService.show('Formatted JSON', 'success');
        } else {
          this.toastService.show('Cannot format invalid JSON', 'error');
        }
      },
    },
    {
      id: 'minify',
      title: 'Minify JSON',
      subtitle: 'Compact into single line without whitespace',
      category: 'Formatting',
      shortcut: 'Minify',
      action: () => {
        if (this.engine.isValid()) {
          this.engine.minify();
          this.toastService.show('Minified JSON', 'success');
        } else {
          this.toastService.show('Cannot minify invalid JSON', 'error');
        }
      },
    },
    {
      id: 'auto-repair',
      title: 'Auto-Repair Syntax Errors',
      subtitle: 'Automatically fix trailing commas, unquoted keys, single quotes',
      category: 'Formatting',
      action: () => {
        const repaired = this.engine.autoRepair();
        if (repaired) {
          this.toastService.show('JSON repaired successfully', 'success');
        } else {
          this.toastService.show('No repairs needed or could not repair', 'info');
        }
      },
    },
    {
      id: 'sort-asc',
      title: 'Sort Keys (A → Z)',
      subtitle: 'Recursively sort object keys alphabetically',
      category: 'Transform',
      action: () => {
        this.engine.sortKeys('asc');
        this.toastService.show('Keys sorted A to Z', 'success');
      },
    },
    {
      id: 'sort-desc',
      title: 'Sort Keys (Z → A)',
      subtitle: 'Recursively sort object keys reverse-alphabetically',
      category: 'Transform',
      action: () => {
        this.engine.sortKeys('desc');
        this.toastService.show('Keys sorted Z to A', 'success');
      },
    },
    {
      id: 'flatten',
      title: 'Flatten Object',
      subtitle: 'Convert nested object into dot-notation paths',
      category: 'Transform',
      action: () => {
        this.engine.flatten();
        this.toastService.show('Flattened object', 'success');
      },
    },
    {
      id: 'unflatten',
      title: 'Unflatten Object',
      subtitle: 'Restore nested structure from dot-notation',
      category: 'Transform',
      action: () => {
        this.engine.unflatten();
        this.toastService.show('Unflattened object', 'success');
      },
    },
    {
      id: 'strip-nulls',
      title: 'Strip Null Properties',
      subtitle: 'Recursively remove keys with null or empty values',
      category: 'Transform',
      action: () => {
        this.engine.stripNulls();
        this.toastService.show('Stripped nulls', 'success');
      },
    },
    {
      id: 'export-json',
      title: 'Download .json',
      subtitle: 'Save active payload as a JSON file',
      category: 'Export',
      action: () => {
        const raw = this.engine.rawInput();
        this.exportService.downloadJson('document.json', raw);
        this.toastService.show('Downloaded document.json', 'success');
      },
    },
    {
      id: 'export-pdf',
      title: 'Download .pdf Report',
      subtitle: 'Generate printable document with metadata metrics',
      category: 'Export',
      action: async () => {
        const raw = this.engine.rawInput();
        await this.exportService.downloadPdf('jsonlens-report.pdf', raw, this.engine.jsonStats());
        this.toastService.show('Downloaded jsonlens-report.pdf', 'success');
      },
    },
    {
      id: 'export-csv',
      title: 'Download .csv',
      subtitle: 'Convert JSON array of objects to CSV spreadsheet',
      category: 'Export',
      action: () => {
        const data = this.engine.parsedResult().data;
        if (data) {
          this.exportService.downloadCsv('data.csv', data);
          this.toastService.show('Downloaded data.csv', 'success');
        }
      },
    },
    {
      id: 'share-link',
      title: 'Copy Shareable Link',
      subtitle: 'Compress JSON into URL hash for serverless sharing',
      category: 'Export',
      action: () => {
        const raw = this.engine.rawInput();
        const url = this.urlShareService.createShareUrl(raw);
        this.exportService.copyToClipboard(url).then(() => {
          this.toastService.show('Share link copied to clipboard', 'success');
        });
      },
    },
    {
      id: 'nav-formatter',
      title: 'Go to JSON Formatter',
      subtitle: 'Open the default beautifier workspace',
      category: 'Navigation',
      action: () => {
        this.router.navigate(['/']);
      },
    },
    {
      id: 'nav-validator',
      title: 'Go to JSON Validator',
      subtitle: 'Real-time validation and diagnostics view',
      category: 'Navigation',
      action: () => {
        this.router.navigate(['/json-validator']);
      },
    },
    {
      id: 'nav-minifier',
      title: 'Go to JSON Minifier',
      subtitle: 'Payload compressor and minifier view',
      category: 'Navigation',
      action: () => {
        this.router.navigate(['/json-minifier']);
      },
    },
    {
      id: 'nav-ts',
      title: 'Go to JSON → TypeScript',
      subtitle: 'Instant TypeScript interface generation view',
      category: 'Navigation',
      action: () => {
        this.router.navigate(['/json-to-typescript']);
      },
    },
    {
      id: 'nav-diff',
      title: 'Go to JSON Diff',
      subtitle: 'Compare two payloads side-by-side',
      category: 'Navigation',
      action: () => {
        this.router.navigate(['/json-diff']);
      },
    },
    {
      id: 'toggle-theme',
      title: 'Toggle Theme',
      subtitle: 'Switch between Dark and Light mode',
      category: 'Settings',
      action: () => {
        this.themeService.toggleTheme();
      },
    },
    {
      id: 'load-sample',
      title: 'Load Sample JSON',
      subtitle: 'Fill editor with rich demonstration data',
      category: 'Formatting',
      action: () => {
        this.engine.loadSample();
        this.toastService.show('Loaded sample JSON', 'info');
      },
    },
    {
      id: 'clear-editor',
      title: 'Clear All',
      subtitle: 'Empty the editor input',
      category: 'Formatting',
      action: () => {
        this.engine.clear();
        this.toastService.show('Cleared editor', 'info');
      },
    },
  ];

  readonly filteredCommands = computed<CommandItem[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) {
      return this.allCommands;
    }
    return this.allCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.subtitle?.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q),
    );
  });

  constructor() {
    afterNextRender(() => {
      // Auto-focus search input when palette opens
      if (this.isOpen()) {
        this.searchInput()?.nativeElement.focus();
      }
    });
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.selectedIndex.set(0);
  }

  onKeyDown(event: KeyboardEvent): void {
    const count = this.filteredCommands().length;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i + 1) % Math.max(1, count));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i - 1 + count) % Math.max(1, count));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = this.filteredCommands()[this.selectedIndex()];
      if (selected) {
        this.executeCommand(selected);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  executeCommand(command: CommandItem): void {
    this.close();
    command.action();
  }

  close(): void {
    this.isOpen.set(false);
    this.searchQuery.set('');
    this.selectedIndex.set(0);
  }
}
