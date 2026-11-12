import { describe, expect, it } from 'vitest';
import { buildJsonLineMap, resolveLineForDiffPath } from './json-line-map.util';

describe('json-line-map.util', () => {
  it('should map nested keys, special keys, and array indices to exact 1-based line numbers', () => {
    const sample = [
      '{',
      '  "name": "JsonLens",',
      '  "first.name": "Ada",',
      '  "features": [',
      '    "Fast",',
      '    {',
      '      "id": 2',
      '    }',
      '  ],',
      '  "meta": {',
      '    "version": 2',
      '  }',
      '}',
    ].join('\n');

    const map = buildJsonLineMap(sample);
    expect(map.get('$')).toBe(1);
    expect(map.get('name')).toBe(2);
    expect(map.get('$["first.name"]')).toBe(3);
    expect(map.get('features')).toBe(4);
    expect(map.get('features[0]')).toBe(5);
    expect(map.get('features[1]')).toBe(6);
    expect(map.get('features[1].id')).toBe(7);
    expect(map.get('meta')).toBe(10);
    expect(map.get('meta.version')).toBe(11);
  });

  it('should fall back to nearest parent line when resolving missing added/removed leaf paths', () => {
    const sample = [
      '{',
      '  "meta": {',
      '    "version": 1',
      '  }',
      '}',
    ].join('\n');

    const map = buildJsonLineMap(sample);
    expect(resolveLineForDiffPath(map, 'meta.addedNestedKey')).toBe(2);
    expect(resolveLineForDiffPath(map, 'topLevelMissing')).toBe(1);
  });
});

