import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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

@Component({
  selector: 'app-diff-lens',
  standalone: true,
  imports: [MonacoEditorComponent, LucideAngularModule],
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
  private readonly destroyRef = inject(DestroyRef);

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

  private cachedRect: DOMRect | null = null;
  private rafId: number | null = null;
  private moveListener: ((e: PointerEvent) => void) | null = null;
  private upListener: ((e: PointerEvent) => void) | null = null;
  private lastClientY = 0;

  constructor() {
    if (this.isBrowser) {
      const saved = this.storage.getItem<number>('jsonlens_diff_split_percent', 50);
      this.splitPercent.set(saved);
    }

    this.destroyRef.onDestroy(() => {
      this.cleanupPointerListeners();
    });
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

  onGripPointerDown(event: PointerEvent): void {
    if (!this.isBrowser) return;

    event.preventDefault();
    this.isDragging.set(true);

    const container = this.diffBodyRef()?.nativeElement;
    if (container) {
      this.cachedRect = container.getBoundingClientRect();
    }

    const target = event.currentTarget as HTMLElement | null;
    if (target && target.setPointerCapture) {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // Safe fallback
      }
    }

    this.lastClientY = event.clientY;
    this.moveListener = (e: PointerEvent) => this.onPointerMove(e);
    this.upListener = (e: PointerEvent) => this.onPointerUp(e, target, event.pointerId);

    window.addEventListener('pointermove', this.moveListener, { passive: true });
    window.addEventListener('pointerup', this.upListener);
  }

  onHeaderPointerDown(event: PointerEvent): void {
    this.onGripPointerDown(event);
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.cachedRect || this.cachedRect.height <= 0) return;

    this.lastClientY = event.clientY;
    if (this.rafId !== null) return;

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.cachedRect || this.cachedRect.height <= 0) return;

      const offset = this.lastClientY - this.cachedRect.top;
      const rawPercent = (offset / this.cachedRect.height) * 100;
      // Clamped between 15% and 85% so neither section is crushed
      const clampedPercent = Math.min(Math.max(rawPercent, 15), 85);

      this.splitPercent.set(Math.round(clampedPercent * 10) / 10);
    });
  }

  private onPointerUp(
    _event: PointerEvent,
    target: HTMLElement | null,
    pointerId: number,
  ): void {
    this.isDragging.set(false);
    this.cachedRect = null;
    if (this.isBrowser) {
      this.storage.setItem('jsonlens_diff_split_percent', this.splitPercent());
    }
    if (target && target.releasePointerCapture) {
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        // Safe fallback
      }
    }
    this.cleanupPointerListeners();
  }

  private cleanupPointerListeners(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.moveListener) {
      window.removeEventListener('pointermove', this.moveListener);
      this.moveListener = null;
    }
    if (this.upListener) {
      window.removeEventListener('pointerup', this.upListener);
      this.upListener = null;
    }
    this.cachedRect = null;
  }

  onGripDblClick(_event: MouseEvent): void {
    this.splitPercent.set(50);
    if (this.isBrowser) {
      this.storage.setItem('jsonlens_diff_split_percent', 50);
    }
    this.toast.show('Diff panels reset to center (50/50)', 'info');
  }

  onHeaderDblClick(event: MouseEvent): void {
    this.onGripDblClick(event);
  }

  onGripKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.splitPercent.update((p) => Math.max(15, p - 5));
      if (this.isBrowser) {
        this.storage.setItem('jsonlens_diff_split_percent', this.splitPercent());
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.splitPercent.update((p) => Math.min(85, p + 5));
      if (this.isBrowser) {
        this.storage.setItem('jsonlens_diff_split_percent', this.splitPercent());
      }
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

