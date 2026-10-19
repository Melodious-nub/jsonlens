/**
 * Safe utility to trigger subtle tactile micro-haptic pulses on supported mobile devices.
 * Completely safe for SSR and environments without vibration hardware or permissions.
 *
 * @param pattern Duration in ms (e.g. 10) or an array of vibration/pause durations (e.g. [8, 30, 12]).
 */
export function triggerHaptic(pattern: number | number[] = 10): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Gracefully ignore environments that restrict or reject haptics
    }
  }
}
