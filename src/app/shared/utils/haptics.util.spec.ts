import { describe, expect, it, vi } from 'vitest';
import { triggerHaptic } from './haptics.util';

describe('triggerHaptic', () => {
  it('should call navigator.vibrate when available', () => {
    const vibrateSpy = vi.fn();
    const originalNavigator = globalThis.navigator;

    Object.defineProperty(globalThis, 'navigator', {
      value: { vibrate: vibrateSpy },
      configurable: true,
      writable: true,
    });

    triggerHaptic(15);
    expect(vibrateSpy).toHaveBeenCalledWith(15);

    triggerHaptic([8, 20, 10]);
    expect(vibrateSpy).toHaveBeenCalledWith([8, 20, 10]);

    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('should gracefully handle environments where navigator.vibrate throws or is undefined', () => {
    const originalNavigator = globalThis.navigator;

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        vibrate: () => {
          throw new Error('Vibration permission denied');
        },
      },
      configurable: true,
      writable: true,
    });

    expect(() => triggerHaptic(10)).not.toThrow();

    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });

    expect(() => triggerHaptic(10)).not.toThrow();

    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });
});
