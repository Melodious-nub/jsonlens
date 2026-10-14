import { describe, expect, it } from 'vitest';
import { JsonPathPipe } from './json-path.pipe';

describe('JsonPathPipe', () => {
  const pipe = new JsonPathPipe();

  it('should format JSONPath strings', () => {
    expect(pipe.transform('')).toBe('$');
    expect(pipe.transform('items[0].id')).toBe('$.items[0].id');
    expect(pipe.transform('$.data.user')).toBe('$.data.user');
    expect(pipe.transform('root.data')).toBe('$.data');
  });
});
