import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  input,
  model,
  output,
  PLATFORM_ID,
} from '@angular/core';

export type SplitDirection = 'horizontal' | 'vertical';

@Directive({
  selector: '[appResizableSplitter]',
  standalone: true,
})
export class ResizableSplitterDirective {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Inputs
  readonly container = input.required<HTMLElement>();
  readonly direction = input<SplitDirection>('horizontal');
  readonly minPrimaryPx = input<number>(0);
  readonly minSecondaryPx = input<number>(0);
  readonly minPercent = input<number>(15);
  readonly maxPercent = input<number>(85);
  readonly step = input<number>(5);

  // Two-way models
  readonly splitPercent = model<number>(50);
  readonly isDragging = model<boolean>(false);

  // Outputs
  readonly splitChange = output<number>();
  readonly resetRequested = output<void>();

  // Host ARIA bindings
  @HostBinding('attr.role') readonly role = 'separator';
  @HostBinding('attr.tabindex') readonly tabIndex = 0;

  @HostBinding('attr.aria-orientation') get ariaOrientation(): string {
    return this.direction();
  }

  @HostBinding('attr.aria-valuenow') get ariaValueNow(): number {
    return this.splitPercent();
  }

  @HostBinding('attr.aria-valuemin') get ariaValueMin(): number {
    return this.minPercent();
  }

  @HostBinding('attr.aria-valuemax') get ariaValueMax(): number {
    return this.maxPercent();
  }

  private moveListener: ((e: PointerEvent) => void) | null = null;
  private upListener: ((e: PointerEvent) => void) | null = null;
  private cachedRect: DOMRect | null = null;
  private cachedLowerBound = 20;
  private cachedUpperBound = 80;
  private lastClientCoordinate = 0;
  private rafId: number | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cleanupPointerListeners();
    });
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    if (!this.isBrowser) return;

    event.preventDefault();
    this.isDragging.set(true);

    const containerEl = this.container();
    if (containerEl) {
      this.cachedRect = containerEl.getBoundingClientRect();
      const isHorizontal = this.direction() === 'horizontal';
      const containerSize = isHorizontal ? this.cachedRect.width : this.cachedRect.height;

      if (containerSize > 0) {
        const minPrimary = this.minPrimaryPx();
        const minSecondary = this.minSecondaryPx();

        let lower = this.minPercent();
        let upper = this.maxPercent();

        if (minPrimary > 0) {
          lower = Math.max(lower, (minPrimary / containerSize) * 100);
        }
        if (minSecondary > 0) {
          upper = Math.min(upper, ((containerSize - minSecondary) / containerSize) * 100);
        }

        this.cachedLowerBound = Math.min(lower, upper);
        this.cachedUpperBound = Math.max(lower, upper);
      }
    }

    const host = this.elementRef.nativeElement;
    if (host && host.setPointerCapture) {
      try {
        host.setPointerCapture(event.pointerId);
      } catch {
        // Safe fallback for browsers/tests without pointer capture support
      }
    }

    this.lastClientCoordinate = this.direction() === 'horizontal' ? event.clientX : event.clientY;
    this.moveListener = (e: PointerEvent) => this.onPointerMove(e);
    this.upListener = (e: PointerEvent) => this.onPointerUp(e, host, event.pointerId);

    window.addEventListener('pointermove', this.moveListener, { passive: true });
    window.addEventListener('pointerup', this.upListener);
  }

  @HostListener('dblclick')
  onDblClick(): void {
    this.resetRequested.emit();
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const isHorizontal = this.direction() === 'horizontal';
    const stepVal = this.step();

    if (isHorizontal) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.updateClampedPercent(this.splitPercent() - stepVal);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.updateClampedPercent(this.splitPercent() + stepVal);
      }
    } else {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.updateClampedPercent(this.splitPercent() - stepVal);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.updateClampedPercent(this.splitPercent() + stepVal);
      }
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.cachedRect) return;

    this.lastClientCoordinate = this.direction() === 'horizontal' ? event.clientX : event.clientY;
    if (this.rafId !== null) return;

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.cachedRect) return;

      const isHorizontal = this.direction() === 'horizontal';
      const containerSize = isHorizontal ? this.cachedRect.width : this.cachedRect.height;
      if (containerSize <= 0) return;

      const offset = isHorizontal
        ? this.lastClientCoordinate - this.cachedRect.left
        : this.lastClientCoordinate - this.cachedRect.top;

      const rawPercent = (offset / containerSize) * 100;
      this.updateClampedPercent(rawPercent);
    });
  }

  private updateClampedPercent(percent: number): void {
    const clamped = Math.min(
      Math.max(percent, this.cachedLowerBound),
      this.cachedUpperBound,
    );
    const rounded = Math.round(clamped * 10) / 10;
    this.splitPercent.set(rounded);
    this.splitChange.emit(rounded);
  }

  private onPointerUp(_event: PointerEvent, host: HTMLElement | null, pointerId: number): void {
    this.isDragging.set(false);
    this.cachedRect = null;

    if (host && host.releasePointerCapture) {
      try {
        host.releasePointerCapture(pointerId);
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
}
