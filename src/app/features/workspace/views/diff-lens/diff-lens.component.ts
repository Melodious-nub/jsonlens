import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DiffService } from '../../../../core/services/diff.service';
import { StorageService } from '../../../../core/services/storage.service';
import { MonacoEditorComponent } from '../../../../shared/components/monaco-wrapper/monaco-editor.component';
import {
  LucideAngularModule,
  ArrowLeftRight,
  Trash2,
  GitCompare,
  CheckCircle2,
  FolderOpen,
} from 'lucide-angular';

import { ResizableSplitterDirective } from '../../../../shared/directives/resizable-splitter.directive';

@Component({
  selector: 'app-diff-lens',
  standalone: true,
  imports: [MonacoEditorComponent, LucideAngularModule, ResizableSplitterDirective],
  templateUrl: './diff-lens.component.html',
  styleUrl: './diff-lens.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffLensComponent {
  readonly engine = inject(JsonEngineService);
  readonly diff = inject(DiffService);
  private readonly toast = inject(ToastService);
  private readonly storage = inject(StorageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly swapIcon = ArrowLeftRight;
  readonly folderOpenIcon = FolderOpen;
  readonly clearIcon = Trash2;
  readonly compareIcon = GitCompare;
  readonly matchIcon = CheckCircle2;
  readonly Math = Math;

  readonly diffFileInput = viewChild<ElementRef<HTMLInputElement>>('diffFileInput');
  readonly diffBodyRef = viewChild<ElementRef<HTMLDivElement>>('diffBody');

  readonly secondaryInput = this.diff.secondaryInput;
  readonly parsedSecondary = this.diff.parsedSecondary;
  readonly diffItems = this.diff.diffItems;
  readonly meaningfulDiffs = this.diff.meaningfulDiffs;
  readonly diffSummary = this.diff.diffSummary;

  // Split state between comparison editor and differences list (percentage for top editor)
  readonly splitPercent = signal<number>(50);
  readonly isDragging = signal<boolean>(false);

  constructor() {
    if (this.isBrowser) {
      const saved = this.storage.getItem<number>('jsonlens_diff_split_percent', 50);
      this.splitPercent.set(saved);
    }
  }

  onSecondaryInput(val: string): void {
    this.diff.setSecondaryInput(val);
  }

  clearSecondary(): void {
    this.diff.clearSecondary();
    this.toast.show('Cleared comparison JSON', 'info');
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
        this.diff.setSecondaryInput(reader.result);
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

  onResetSplit(): void {
    this.splitPercent.set(50);
    if (this.isBrowser) {
      this.storage.setItem('jsonlens_diff_split_percent', 50);
    }
    this.toast.show('Diff panels reset to center (50/50)', 'info');
  }

  onGripDblClick(_event?: MouseEvent): void {
    this.onResetSplit();
  }

  onHeaderDblClick(event: MouseEvent): void {
    this.onGripDblClick(event);
  }

  onGripKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.onSplitChange(Math.max(15, this.splitPercent() - 5));
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.onSplitChange(Math.min(85, this.splitPercent() + 5));
    }
  }

  onHeaderKeyDown(event: KeyboardEvent): void {
    this.onGripKeyDown(event);
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

