import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { JsonEngineService } from '../../../core/services/json-engine.service';
import { ExportService } from '../../../core/services/export.service';
import { UrlShareService } from '../../../core/services/url-share.service';
import { ToastService } from '../../../core/services/toast.service';
import { ExportFormat, IndentOption } from '../../../core/models/json-lens.model';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [ClickOutsideDirective],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolbarComponent {
  readonly engine = inject(JsonEngineService);
  private readonly exportService = inject(ExportService);
  private readonly urlShareService = inject(UrlShareService);
  private readonly toastService = inject(ToastService);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  // Dropdown open states
  readonly isIndentMenuOpen = signal<boolean>(false);
  readonly isExportMenuOpen = signal<boolean>(false);
  readonly isToolsMenuOpen = signal<boolean>(false);

  toggleIndentMenu(): void {
    this.isIndentMenuOpen.update((v) => !v);
  }

  toggleExportMenu(): void {
    this.isExportMenuOpen.update((v) => !v);
  }

  toggleToolsMenu(): void {
    this.isToolsMenuOpen.update((v) => !v);
  }

  closeMenus(): void {
    this.isIndentMenuOpen.set(false);
    this.isExportMenuOpen.set(false);
    this.isToolsMenuOpen.set(false);
  }

  onFormat(): void {
    if (!this.engine.isValid()) {
      this.toastService.show('Cannot format invalid JSON. Try Auto-Fix first.', 'error');
      return;
    }
    this.engine.format();
    this.toastService.show('Formatted successfully', 'success');
  }

  onMinify(): void {
    if (!this.engine.isValid()) {
      this.toastService.show('Cannot minify invalid JSON. Try Auto-Fix first.', 'error');
      return;
    }
    this.engine.minify();
    this.toastService.show('Minified to single-line JSON', 'success');
  }

  onAutoRepair(): void {
    const repaired = this.engine.autoRepair();
    if (repaired) {
      this.toastService.show('JSON syntax automatically repaired!', 'success');
    } else {
      if (this.engine.isValid()) {
        this.toastService.show('JSON is already valid, no repairs needed.', 'info');
      } else {
        this.toastService.show('Could not automatically repair syntax error.', 'error');
      }
    }
  }

  onSortKeys(order: 'asc' | 'desc'): void {
    if (!this.engine.isValid()) {
      this.toastService.show('Cannot sort keys on invalid JSON.', 'error');
      return;
    }
    this.engine.sortKeys(order);
    this.toastService.show(`Keys sorted ${order.toUpperCase()}`, 'success');
  }

  onSetIndent(option: IndentOption): void {
    this.engine.setIndent(option);
    this.closeMenus();
  }

  onFlatten(): void {
    if (!this.engine.isValid()) {
      this.toastService.show('Cannot flatten invalid JSON.', 'error');
      return;
    }
    this.engine.flatten();
    this.toastService.show('Flattened to dot-notation', 'success');
    this.closeMenus();
  }

  onUnflatten(): void {
    if (!this.engine.isValid()) {
      this.toastService.show('Cannot unflatten invalid JSON.', 'error');
      return;
    }
    this.engine.unflatten();
    this.toastService.show('Restored nested hierarchy', 'success');
    this.closeMenus();
  }

  onStripNulls(): void {
    if (!this.engine.isValid()) {
      this.toastService.show('Cannot strip nulls on invalid JSON.', 'error');
      return;
    }
    this.engine.stripNulls();
    this.toastService.show('Stripped null properties', 'success');
    this.closeMenus();
  }

  onShare(): void {
    const json = this.engine.rawInput();
    if (!json || json.trim() === '') {
      this.toastService.show('Enter JSON before generating a share link', 'info');
      return;
    }

    const shareUrl = this.urlShareService.createShareUrl(json);
    this.exportService.copyToClipboard(shareUrl).then((success) => {
      if (success) {
        this.toastService.show('Shareable link copied to clipboard!', 'success');
      } else {
        this.toastService.show('Failed to copy share link', 'error');
      }
    });
  }

  async onExport(format: ExportFormat): Promise<void> {
    const raw = this.engine.rawInput();
    const parsed = this.engine.parsedResult();

    if (!raw.trim()) {
      this.toastService.show('No JSON content to export', 'info');
      return;
    }

    switch (format) {
      case 'json':
        this.exportService.downloadJson('document.json', parsed.formatted || raw);
        this.toastService.show('Downloaded document.json', 'success');
        break;
      case 'pdf':
        this.toastService.show('Generating PDF report...', 'info');
        await this.exportService.downloadPdf(
          'jsonlens-report.pdf',
          parsed.formatted || raw,
          this.engine.jsonStats(),
        );
        this.toastService.show('Downloaded jsonlens-report.pdf', 'success');
        break;
      case 'csv':
        if (!parsed.data) {
          this.toastService.show('Cannot export invalid JSON to CSV', 'error');
          return;
        }
        this.exportService.downloadCsv('data.csv', parsed.data);
        this.toastService.show('Downloaded data.csv', 'success');
        break;
      case 'ts':
        this.toastService.show('Exporting TypeScript definitions...', 'info');
        // Will be wired through TypeGen in view
        break;
    }

    this.closeMenus();
  }

  onTriggerFileInput(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.engine.setInput(reader.result);
        this.toastService.show(`Loaded ${file.name}`, 'success');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  onClear(): void {
    this.engine.clear();
    this.toastService.show('Cleared editor', 'info');
  }

  onLoadSample(): void {
    this.engine.loadSample();
    this.toastService.show('Loaded sample JSON', 'info');
  }
}
