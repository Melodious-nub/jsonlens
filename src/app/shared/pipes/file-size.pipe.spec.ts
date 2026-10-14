import { describe, expect, it } from 'vitest';
import { FileSizePipe } from './file-size.pipe';

describe('FileSizePipe', () => {
  const pipe = new FileSizePipe();

  it('should format bytes properly', () => {
    expect(pipe.transform(0)).toBe('0 B');
    expect(pipe.transform(512)).toBe('512 B');
    expect(pipe.transform(1024)).toBe('1.00 KB');
    expect(pipe.transform(2048)).toBe('2.00 KB');
    expect(pipe.transform(1024 * 1024 * 1.5)).toBe('1.50 MB');
  });

  it('should handle edge cases', () => {
    expect(pipe.transform(null)).toBe('0 B');
    expect(pipe.transform(undefined)).toBe('0 B');
    expect(pipe.transform(-10)).toBe('0 B');
  });
});
