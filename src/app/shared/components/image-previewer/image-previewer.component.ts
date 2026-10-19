import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  LucideAngularModule,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  X,
  Scan,
} from 'lucide-angular';

@Component({
  selector: 'app-image-previewer',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './image-previewer.component.html',
  styleUrl: './image-previewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImagePreviewerComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Inputs
  readonly isOpen = input<boolean>(false);
  readonly src = input.required<string | null>();
  readonly alt = input<string>('Image Preview');
  readonly title = input<string>('Image Preview');
  readonly subtitle = input<string | null>(null);
  readonly filename = input<string>('preview.png');
  readonly allowDownload = input<boolean>(true);

  // Outputs
  readonly closed = output<void>();
  readonly download = output<void>();

  // State Signals
  readonly zoom = signal<number>(1);
  readonly panX = signal<number>(0);
  readonly panY = signal<number>(0);
  readonly isDragging = signal<boolean>(false);

  // Computed state
  readonly zoomPercentage = computed(() => Math.round(this.zoom() * 100));
  readonly isMinZoom = computed(() => this.zoom() <= 0.4);
  readonly isMaxZoom = computed(() => this.zoom() >= 3.5);

  // Drag tracking state (plain numbers to avoid signal write overhead during rapid pointer events)
  private startX = 0;
  private startY = 0;
  private initialPanX = 0;
  private initialPanY = 0;

  // Icons
  readonly zoomInIcon = ZoomIn;
  readonly zoomOutIcon = ZoomOut;
  readonly resetIcon = RotateCcw;
  readonly downloadIcon = Download;
  readonly closeIcon = X;
  readonly scanIcon = Scan;

  constructor() {
    // Body scroll lock effect
    effect(() => {
      if (!this.isBrowser) return;
      if (this.isOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      if (this.isBrowser) {
        document.body.style.overflow = '';
      }
    });

    // Global keyboard shortcuts (Esc, +, -, 0)
    if (this.isBrowser) {
      const onKeyDown = (event: KeyboardEvent) => {
        if (!this.isOpen()) return;

        if (event.key === 'Escape') {
          event.preventDefault();
          this.onClose();
        } else if (event.key === '+' || event.key === '=') {
          event.preventDefault();
          this.zoomIn();
        } else if (event.key === '-' || event.key === '_') {
          event.preventDefault();
          this.zoomOut();
        } else if (event.key === '0') {
          event.preventDefault();
          this.resetZoom();
        }
      };

      window.addEventListener('keydown', onKeyDown);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('keydown', onKeyDown);
      });
    }
  }

  zoomIn(): void {
    this.zoom.update((z) => Math.min(3.5, +(z + 0.25).toFixed(2)));
  }

  zoomOut(): void {
    this.zoom.update((z) => Math.max(0.4, +(z - 0.25).toFixed(2)));
  }

  resetZoom(): void {
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.15 : -0.15;
    this.zoom.update((z) => {
      const next = +(z + delta).toFixed(2);
      return Math.min(3.5, Math.max(0.4, next));
    });
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return; // Only primary button
    this.isDragging.set(true);
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.initialPanX = this.panX();
    this.initialPanY = this.panY();

    const target = event.currentTarget as HTMLElement | null;
    target?.setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging()) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    this.panX.set(this.initialPanX + dx);
    this.panY.set(this.initialPanY + dy);
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    const target = event.currentTarget as HTMLElement | null;
    try {
      target?.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore if pointer capture was already released
    }
  }

  onDoubleClick(): void {
    if (this.zoom() !== 1 || this.panX() !== 0 || this.panY() !== 0) {
      this.resetZoom();
    } else {
      this.zoom.set(1.75);
    }
  }

  onClose(): void {
    this.resetZoom();
    this.closed.emit();
  }

  onDownloadClick(): void {
    this.download.emit();
  }
}
