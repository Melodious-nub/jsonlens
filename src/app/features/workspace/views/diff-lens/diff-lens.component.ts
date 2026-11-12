import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DiffService } from '../../../../core/services/diff.service';
import { StorageService } from '../../../../core/services/storage.service';
import { ExportService } from '../../../../core/services/export.service';
import { DiffItem, DiffNavigationTarget } from '../../../../core/models/json-lens.model';
import { MonacoEditorComponent } from '../../../../shared/components/monaco-wrapper/monaco-editor.component';
import {
  LucideAngularModule,
  ArrowLeftRight,
  Trash2,
  GitCompare,
  CheckCircle2,
  FolderOpen,
  AlignLeft,
  ChevronUp,
  ChevronDown,
  Wand2,
  Search,
  X,
  Copy,
  Check,
  Download,
  Layers,
} from 'lucide-angular';

import { ResizableSplitterDirective } from '../../../../shared/directives/resizable-splitter.directive';
import { ClickOutsideDirective } from '../../../../shared/directives/click-outside.directive';
import { triggerHaptic } from '../../../../shared/utils/haptics.util';
import {
  diffToJsonPatch,
  diffToMarkdown,
  diffToPlainText,
} from '../../../../shared/utils/json-diff.util';
import { toStandardJsonPath } from '../../../../shared/utils/json-path.util';

export type DiffFilterType = 'all' | 'added' | 'removed' | 'modified';
export type DiffReportFormat = 'md' | 'txt';

export interface DiffFilterChip {
  readonly id: DiffFilterType;
  readonly label: string;
  readonly count: number;
  readonly variantClass: string;
}

@Component({
  selector: 'app-diff-lens',
  standalone: true,
  imports: [MonacoEditorComponent, LucideAngularModule, ResizableSplitterDirective, ClickOutsideDirective],
  templateUrl: './diff-lens.component.html',
  styleUrl: './diff-lens.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffLensComponent {
  readonly engine = inject(JsonEngineService);
  readonly diff = inject(DiffService);
  private readonly toast = inject(ToastService);
  private readonly storage = inject(StorageService);
  private readonly exporter = inject(ExportService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly swapIcon = ArrowLeftRight;
  readonly folderOpenIcon = FolderOpen;
  readonly clearIcon = Trash2;
  readonly compareIcon = GitCompare;
  readonly matchIcon = CheckCircle2;
  readonly formatIcon = AlignLeft;
  readonly chevronUpIcon = ChevronUp;
  readonly chevronDownIcon = ChevronDown;
  readonly fixIcon = Wand2;
  readonly searchIcon = Search;
  readonly closeIcon = X;
  readonly copyIcon = Copy;
  readonly checkIcon = Check;
  readonly downloadIcon = Download;
  readonly smartArrayIcon = Layers;
  readonly Math = Math;

  readonly navigateDiff = output<DiffNavigationTarget>();
  readonly selectedDiffKey = signal<string | null>(null);

  readonly diffFileInput = viewChild<ElementRef<HTMLInputElement>>('diffFileInput');
  readonly diffBodyRef = viewChild<ElementRef<HTMLDivElement>>('diffBody');
  readonly editorComponent = viewChild<MonacoEditorComponent>('editorComponent');

  triggerFind(): void {
    this.editorComponent()?.triggerFind();
  }

  closeFindWidget(): void {
    this.editorComponent()?.closeFindWidget();
  }

  isFindWidgetVisible(): boolean {
    return this.editorComponent()?.isFindWidgetVisible() ?? false;
  }

  layout(): void {
    this.editorComponent()?.layout();
  }

  readonly secondaryInput = this.diff.secondaryInput;
  readonly parsedSecondary = this.diff.parsedSecondary;
  readonly secondaryError = this.diff.secondaryError;
  readonly diffItems = this.diff.diffItems;
  readonly meaningfulDiffs = this.diff.meaningfulDiffs;
  readonly diffSummary = this.diff.diffSummary;

  // Drawer filter & export state
  readonly activeFilter = signal<DiffFilterType>('all');
  readonly pathQuery = signal<string>('');
  readonly isPatchCopied = signal<boolean>(false);
  readonly copiedRowPath = signal<string | null>(null);
  readonly isExportMenuOpen = signal<boolean>(false);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;
  private rowCopyResetTimer: ReturnType<typeof setTimeout> | null = null;

  readonly filterChips = computed<DiffFilterChip[]>(() => {
    const summary = this.diffSummary();
    return [
      { id: 'all', label: 'All', count: this.meaningfulDiffs().length, variantClass: 'diff-chip--all' },
      { id: 'added', label: '+', count: summary.added, variantClass: 'diff-chip--added' },
      { id: 'removed', label: '-', count: summary.removed, variantClass: 'diff-chip--removed' },
      { id: 'modified', label: '~', count: summary.modified, variantClass: 'diff-chip--modified' },
    ];
  });

  readonly filteredDiffs = computed<DiffItem[]>(() => {
    const diffs = this.meaningfulDiffs();
    const filter = this.activeFilter();
    const query = this.pathQuery().trim().toLowerCase();

    return diffs.filter((item) => {
      if (filter !== 'all' && item.type !== filter) {
        return false;
      }
      if (!query) {
        return true;
      }
      if (item.path.toLowerCase().includes(query)) {
        return true;
      }
      const oldText = item.oldValue !== undefined ? this.formatVal(item.oldValue).toLowerCase() : '';
      const newText = item.newValue !== undefined ? this.formatVal(item.newValue).toLowerCase() : '';
      return oldText.includes(query) || newText.includes(query);
    });
  });

  // Split state between comparison editor and differences list (percentage for top editor)
  readonly splitPercent = signal<number>(50);
  readonly isDragging = signal<boolean>(false);
  private lastToggleTime = 0;
  private lastHeaderTapTime = 0;

  // Collapsed state: true when bottom differences list is collapsed to 0% (drawer closed)
  readonly isCollapsed = computed(() => this.splitPercent() >= 99);

  constructor() {
    if (this.isBrowser) {
      const saved = this.storage.getItem<number>('jsonlens_diff_split_percent', 50);
      this.splitPercent.set(saved);
    }

    this.destroyRef.onDestroy(() => {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = null;
      }
      if (this.copyResetTimer) {
        clearTimeout(this.copyResetTimer);
        this.copyResetTimer = null;
      }
      if (this.rowCopyResetTimer) {
        clearTimeout(this.rowCopyResetTimer);
        this.rowCopyResetTimer = null;
      }
    });
  }

  onSecondaryInput(val: string): void {
    this.diff.setSecondaryInput(val);
  }

  clearSecondary(): void {
    this.diff.clearSecondary();
    this.toast.show('Cleared comparison JSON', 'info');
  }

  formatSecondary(): void {
    const success = this.diff.formatSecondary();
    if (success) {
      this.toast.show('Comparison JSON formatted', 'success');
    } else {
      this.toast.show('Cannot format invalid JSON syntax', 'error');
    }
  }

  autoRepairSecondary(): void {
    if (this.secondaryInput().length >= 250 * 1024 && this.engine.isWorkerAvailable()) {
      this.toast.show('Repairing large comparison JSON in background...', 'info');
      this.diff.autoRepairSecondaryAsync().then((repaired) => this.handleRepairOutcome(repaired));
      return;
    }

    this.handleRepairOutcome(this.diff.autoRepairSecondary());
  }

  private handleRepairOutcome(repaired: boolean): void {
    if (repaired) {
      triggerHaptic([8, 30, 12]);
      this.toast.show('Comparison JSON syntax automatically repaired!', 'success');
    } else if (this.parsedSecondary().isValid) {
      this.toast.show('Comparison JSON is already valid, no repairs needed.', 'info');
    } else {
      this.toast.show('Could not automatically repair comparison JSON syntax error.', 'error');
    }
  }

  swapInputs(): void {
    this.diff.swapInputs();
    this.toast.show('Swapped Left and Right JSON', 'success');
  }

  onTriggerDiffFileInput(): void {
    this.diffFileInput()?.nativeElement.click();
  }

  onDiffFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.diff.setSecondaryInput(reader.result, true);
        this.toast.show(`Loaded comparison file: ${file.name}`, 'success');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  onSplitChange(val: number): void {
    this.splitPercent.set(val);
    if (this.isBrowser) {
      this.storage.setItem('jsonlens_diff_split_percent', val);
    }
  }

  onToggleCollapse(): void {
    const now = Date.now();
    if (now - this.lastToggleTime < 350) {
      return;
    }
    this.lastToggleTime = now;

    if (this.isCollapsed()) {
      // 50% open shortcut
      this.onSplitChange(50);
    } else {
      // Close drawer completely (editor takes 100%)
      this.isExportMenuOpen.set(false);
      this.onSplitChange(100);
    }
  }

  onResetSplit(): void {
    this.onToggleCollapse();
  }

  onGripDblClick(_event?: MouseEvent): void {
    this.onToggleCollapse();
  }

  onHeaderDblClick(event: MouseEvent): void {
    // Only toggle if not clicking inside an interactive action button or the resize grip
    const target = event.target as HTMLElement | null;
    if (target?.closest('button') || target?.closest('input') || target?.closest('.changes-header__grip')) {
      return;
    }
    this.onToggleCollapse();
  }

  onHeaderPointerUp(event: PointerEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button') || target?.closest('input') || target?.closest('.changes-header__grip')) {
      return;
    }
    const now = Date.now();
    if (now - this.lastHeaderTapTime < 350 && now - this.lastHeaderTapTime > 40) {
      this.lastHeaderTapTime = 0;
      this.onToggleCollapse();
    } else {
      this.lastHeaderTapTime = now;
    }
  }

  onGripKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onToggleCollapse();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const current = this.splitPercent();
      const next = current >= 99 ? 50 : Math.max(0, current - 5);
      this.onSplitChange(next);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.onSplitChange(Math.min(100, this.splitPercent() + 5));
    }
  }

  onHeaderKeyDown(event: KeyboardEvent): void {
    this.onGripKeyDown(event);
  }

  setFilter(type: DiffFilterType): void {
    const next = this.activeFilter() === type && type !== 'all' ? 'all' : type;
    this.activeFilter.set(next);
  }

  onPathSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    if (!value.trim()) {
      this.pathQuery.set('');
      return;
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.pathQuery.set(value);
      this.searchDebounceTimer = null;
    }, 100);
  }

  clearPathSearch(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.pathQuery.set('');
  }

  resetFilters(): void {
    this.activeFilter.set('all');
    this.clearPathSearch();
  }

  async copyDiffPath(path: string): Promise<void> {
    const standardPath = toStandardJsonPath(path);
    const copied = await this.exporter.copyToClipboard(standardPath);
    if (copied) {
      this.copiedRowPath.set(path);
      if (this.rowCopyResetTimer) {
        clearTimeout(this.rowCopyResetTimer);
      }
      this.rowCopyResetTimer = setTimeout(() => {
        this.copiedRowPath.set(null);
        this.rowCopyResetTimer = null;
      }, 1500);
      this.toast.show('Copied JSONPath', 'success');
    } else {
      this.toast.show('Failed to copy JSONPath', 'error');
    }
  }

  async copyJsonPatch(): Promise<void> {
    const diffs = this.meaningfulDiffs();
    if (diffs.length === 0) {
      this.toast.show('No differences to copy as JSON Patch', 'info');
      return;
    }

    const patchJson = JSON.stringify(diffToJsonPatch(diffs), null, 2);
    const copied = await this.exporter.copyToClipboard(patchJson);
    if (copied) {
      this.isPatchCopied.set(true);
      if (this.copyResetTimer) {
        clearTimeout(this.copyResetTimer);
      }
      this.copyResetTimer = setTimeout(() => {
        this.isPatchCopied.set(false);
        this.copyResetTimer = null;
      }, 1800);
      this.toast.show('Copied RFC 6902 JSON Patch to clipboard', 'success');
    } else {
      this.toast.show('Failed to copy JSON Patch', 'error');
    }
  }

  toggleExportMenu(): void {
    this.isExportMenuOpen.update((v) => !v);
  }

  closeExportMenu(): void {
    this.isExportMenuOpen.set(false);
  }

  downloadReport(format: DiffReportFormat): void {
    const diffs = this.meaningfulDiffs();
    if (diffs.length === 0) {
      this.toast.show('No differences to export', 'info');
      this.isExportMenuOpen.set(false);
      return;
    }

    const summary = this.diffSummary();
    const isMarkdown = format === 'md';
    const content = isMarkdown
      ? diffToMarkdown(diffs, summary)
      : diffToPlainText(diffs, summary);
    const filename = isMarkdown ? 'jsonlens-diff-report.md' : 'jsonlens-diff-report.txt';
    const mimeType = isMarkdown ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';

    const downloaded = this.exporter.downloadFile(filename, content, mimeType);
    this.isExportMenuOpen.set(false);
    if (downloaded) {
      this.toast.show(`Downloaded ${filename}`, 'success');
    } else {
      this.toast.show(`Failed to export ${filename}`, 'error');
    }
  }

  onJumpToDiff(item: DiffItem): void {
    this.selectedDiffKey.set(`${item.path}:${item.type}`);
    const target = this.diff.resolveLinesForDiff(item);
    if (target.rightLine) {
      this.editorComponent()?.revealLine(target.rightLine);
    }
    this.navigateDiff.emit(target);
  }

  toggleSmartArrays(): void {
    this.diff.toggleDiffMode();
  }

  formatVal(val: unknown): string {
    if (val === undefined) return 'undefined';
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'object' && val !== null) {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }
}

