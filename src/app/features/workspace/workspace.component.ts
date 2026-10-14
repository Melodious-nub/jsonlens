import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { LensTab } from '../../core/models/json-lens.model';
import { JsonEngineService } from '../../core/services/json-engine.service';
import { ToastService } from '../../core/services/toast.service';
import { StorageService } from '../../core/services/storage.service';
import { ToolbarComponent } from '../../shared/components/toolbar/toolbar.component';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { MonacoEditorComponent } from '../../shared/components/monaco-wrapper/monaco-editor.component';
import { DropZoneDirective } from '../../shared/directives/drop-zone.directive';
import { CodeLensComponent } from './views/code-lens/code-lens.component';
import { TreeLensComponent } from './views/tree-lens/tree-lens.component';
import { TypeLensComponent } from './views/type-lens/type-lens.component';
import { DiffLensComponent } from './views/diff-lens/diff-lens.component';
import {
  LucideAngularModule,
  Code2,
  FolderTree,
  FileCode,
  GitCompare,
  Upload,
  RotateCcw,
} from 'lucide-angular';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [
    ToolbarComponent,
    StatusBarComponent,
    MonacoEditorComponent,
    DropZoneDirective,
    CodeLensComponent,
    TreeLensComponent,
    TypeLensComponent,
    DiffLensComponent,
    LucideAngularModule,
  ],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceComponent {
  readonly engine = inject(JsonEngineService);
  private readonly toast = inject(ToastService);
  private readonly storage = inject(StorageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly destroyRef = inject(DestroyRef);

  // Icons
  readonly codeIcon = FileCode;
  readonly treeIcon = FolderTree;
  readonly typeIcon = Code2;
  readonly diffIcon = GitCompare;
  readonly uploadIcon = Upload;
  readonly resetIcon = RotateCcw;

  // Inputs & State
  readonly defaultLens = input<LensTab>('code');
  readonly activeLens = signal<LensTab>('code');
  readonly splitPercent = signal<number>(50); // percentage 20 to 80
  readonly isDragging = signal<boolean>(false);

  // References
  readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('panelsContainer');

  private moveListener: ((e: PointerEvent) => void) | null = null;
  private upListener: ((e: PointerEvent) => void) | null = null;

  constructor() {
    if (this.isBrowser) {
      const savedSplit = this.storage.getItem<number>('jsonlens_split_percent', 50);
      this.splitPercent.set(savedSplit);
    }

    effect(() => {
      const def = this.defaultLens();
      if (def !== 'code') {
        this.activeLens.set(def);
      } else if (this.isBrowser) {
        const savedLens = this.storage.getItem<LensTab>('jsonlens_lens_tab', 'code');
        this.activeLens.set(savedLens);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.cleanupPointerListeners();
    });
  }

  setLens(lens: LensTab): void {
    this.activeLens.set(lens);
    if (this.isBrowser) {
      this.storage.setItem('jsonlens_lens_tab', lens);
    }
  }

  onFileDropped(content: string): void {
    this.engine.setInput(content);
    this.toast.show('JSON file loaded into editor', 'success');
  }

  resetSplit(): void {
    this.splitPercent.set(50);
    if (this.isBrowser) {
      this.storage.setItem('jsonlens_split_percent', 50);
    }
  }

  onDividerPointerDown(event: PointerEvent): void {
    if (!this.isBrowser) return;

    event.preventDefault();
    this.isDragging.set(true);

    const target = event.currentTarget as HTMLElement | null;
    if (target && target.setPointerCapture) {
      target.setPointerCapture(event.pointerId);
    }

    this.moveListener = (e: PointerEvent) => this.onPointerMove(e);
    this.upListener = (e: PointerEvent) => this.onPointerUp(e, target, event.pointerId);

    window.addEventListener('pointermove', this.moveListener);
    window.addEventListener('pointerup', this.upListener);
  }

  private onPointerMove(event: PointerEvent): void {
    const container = this.containerRef()?.nativeElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return;

    const pointerOffset = event.clientX - rect.left;
    const rawPercent = (pointerOffset / rect.width) * 100;
    const clampedPercent = Math.min(Math.max(rawPercent, 20), 80);

    this.splitPercent.set(Math.round(clampedPercent));
  }

  private onPointerUp(
    _event: PointerEvent,
    target: HTMLElement | null,
    pointerId: number,
  ): void {
    this.isDragging.set(false);
    if (this.isBrowser) {
      this.storage.setItem('jsonlens_split_percent', this.splitPercent());
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
    if (this.moveListener) {
      window.removeEventListener('pointermove', this.moveListener);
      this.moveListener = null;
    }
    if (this.upListener) {
      window.removeEventListener('pointerup', this.upListener);
      this.upListener = null;
    }
  }
}
