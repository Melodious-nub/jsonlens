import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  PLATFORM_ID,
} from '@angular/core';

@Directive({
  selector: '[appSwipeGesture]',
  standalone: true,
})
export class SwipeGestureDirective implements OnInit {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly destroyRef = inject(DestroyRef);

  // Inputs
  readonly enabled = input<boolean>(true);
  readonly swipeThreshold = input<number>(45);
  readonly velocityThreshold = input<number>(0.25);

  // Outputs
  readonly swipeLeft = output<void>();
  readonly swipeRight = output<void>();

  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private isTracking = false;

  ngOnInit(): void {
    if (!this.isBrowser) return;

    const el = this.elementRef.nativeElement;

    const onTouchStart = (e: TouchEvent) => {
      if (!this.enabled() || e.touches.length !== 1) {
        this.isTracking = false;
        return;
      }
      const touch = e.touches[0];
      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.startTime = Date.now();
      this.isTracking = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!this.isTracking || !this.enabled() || e.changedTouches.length !== 1) {
        this.isTracking = false;
        return;
      }

      this.isTracking = false;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - this.startX;
      const deltaY = touch.clientY - this.startY;
      const deltaTime = Math.max(1, Date.now() - this.startTime);

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Verify horizontal gesture dominance (horizontal must be at least 1.3x vertical movement)
      if (absDeltaX > absDeltaY * 1.3) {
        const velocity = absDeltaX / deltaTime;
        const threshold = this.swipeThreshold();
        const minVelocity = this.velocityThreshold();

        if (absDeltaX >= threshold || (velocity >= minVelocity && absDeltaX >= 25)) {
          if (deltaX < 0) {
            this.swipeLeft.emit();
          } else {
            this.swipeRight.emit();
          }
        }
      }
    };

    const onTouchCancel = () => {
      this.isTracking = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });

    this.destroyRef.onDestroy(() => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    });
  }
}
