import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly clickOutside = output<MouseEvent>();

  constructor() {
    afterNextRender(() => {
      if (!this.isBrowser) {
        return;
      }

      const listener = (event: MouseEvent) => {
        const target = event.target as Node | null;
        if (!target) {
          return;
        }

        const clickedInside = this.elementRef.nativeElement.contains(target);
        if (!clickedInside) {
          this.clickOutside.emit(event);
        }
      };

      document.addEventListener('pointerdown', listener, true);

      this.destroyRef.onDestroy(() => {
        document.removeEventListener('pointerdown', listener, true);
      });
    });
  }
}
