import {
  afterNextRender,
  DestroyRef,
  Directive,
  inject,
  input,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appHotkey]',
  standalone: true,
})
export class HotkeyDirective {
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly appHotkey = input.required<string>();
  readonly hotkeyTriggered = output<KeyboardEvent>();

  constructor() {
    afterNextRender(() => {
      if (!this.isBrowser) {
        return;
      }

      const handler = (event: KeyboardEvent) => {
        const expected = this.appHotkey().toLowerCase();
        const isCtrlOrMeta = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();

        let matches = false;

        if (expected === 'ctrl+k' || expected === 'meta+k') {
          matches = isCtrlOrMeta && key === 'k';
        } else if (expected === 'escape') {
          matches = key === 'escape';
        } else if (expected === 'ctrl+s') {
          matches = isCtrlOrMeta && key === 's';
        } else {
          matches = key === expected;
        }

        if (matches) {
          event.preventDefault();
          this.hotkeyTriggered.emit(event);
        }
      };

      window.addEventListener('keydown', handler);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('keydown', handler);
      });
    });
  }
}
