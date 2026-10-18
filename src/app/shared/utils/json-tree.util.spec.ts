import { describe, expect, it } from 'vitest';
import {
  buildTreeNode,
  calculateStats,
  extractJsonError,
  flattenJsonObject,
  hasMatchingDescendant,
  isNodeMatch,
  sortJsonKeys,
  stripNullProperties,
  unflattenJsonObject,
  countTreeMatches,
} from './json-tree.util';

describe('json-tree.util', () => {
  it('should build hierarchical TreeNode structure', () => {
    const data = {
      name: 'JsonLens',
      tags: ['json', 'tools'],
      active: true,
      count: 42,
      meta: null,
    };
    const root = buildTreeNode(data);
    expect(root.type).toBe('object');
    expect(root.children?.length).toBe(5);

    const tagsNode = root.children?.find((c) => c.key === 'tags');
    expect(tagsNode?.type).toBe('array');
    expect(tagsNode?.children?.length).toBe(2);
  });

  it('should calculate deep JSON statistics accurately', () => {
    const data = {
      a: 1,
      b: 'test',
      c: [true, false],
      d: { nested: null },
    };
    const stats = calculateStats(data, 100);
    expect(stats.byteSize).toBe(100);
    expect(stats.keyCount).toBe(5);
    expect(stats.maxDepth).toBe(3);
    expect(stats.numberCount).toBe(1);
    expect(stats.stringCount).toBe(1);
    expect(stats.booleanCount).toBe(2);
    expect(stats.nullCount).toBe(1);
    expect(stats.arrayCount).toBe(1);
    expect(stats.objectCount).toBe(2);
  });

  it('should sort keys recursively ascending and descending', () => {
    const data = { z: 1, a: 2, m: { y: 10, b: 20 } };
    const asc = sortJsonKeys(data, 'asc') as Record<string, unknown>;
    expect(Object.keys(asc)).toEqual(['a', 'm', 'z']);
    expect(Object.keys(asc['m'] as Record<string, unknown>)).toEqual(['b', 'y']);

    const desc = sortJsonKeys(data, 'desc') as Record<string, unknown>;
    expect(Object.keys(desc)).toEqual(['z', 'm', 'a']);
    expect(Object.keys(desc['m'] as Record<string, unknown>)).toEqual(['y', 'b']);
  });

  it('should flatten and unflatten objects', () => {
    const original = { user: { name: 'Alice', settings: { theme: 'dark' } } };
    const flattened = flattenJsonObject(original);
    expect(flattened['user.name']).toBe('Alice');
    expect(flattened['user.settings.theme']).toBe('dark');

    const unflattened = unflattenJsonObject(flattened);
    expect(unflattened).toEqual(original);
  });

  it('should strip null properties recursively', () => {
    const withNulls = { a: 1, b: null, c: [1, null, 2], d: { e: null, f: 'keep' } };
    const stripped = stripNullProperties(withNulls) as Record<string, unknown>;
    expect(stripped['b']).toBeUndefined();
    expect((stripped['c'] as number[])).toEqual([1, 2]);
    expect((stripped['d'] as Record<string, unknown>)['e']).toBeUndefined();
    expect((stripped['d'] as Record<string, unknown>)['f']).toBe('keep');
  });

  it('should extract line and column from JSON.parse error', () => {
    const invalidJson = '{\n  "title": "JsonLens",\n  "count": \n}';
    let error: unknown;
    try {
      JSON.parse(invalidJson);
    } catch (e) {
      error = e;
    }
    const coords = extractJsonError(error, invalidJson);
    expect(coords.line).toBe(3);
    expect(coords.column).toBe(4);
    expect(coords.position).toBe(28);
  });

  it('should evaluate isNodeMatch, hasMatchingDescendant, and countTreeMatches correctly', () => {
    const data = {
      app: 'JsonLens',
      settings: {
        theme: 'dark',
        features: ['tree', 'types', 'code'],
      },
    };
    const tree = buildTreeNode(data);

    // Root node
    expect(isNodeMatch(tree, 'lens')).toBe(false);
    expect(hasMatchingDescendant(tree, 'lens')).toBe(true);
    expect(hasMatchingDescendant(tree, 'nonexistent')).toBe(false);

    // Matching key or value
    const appChild = tree.children?.find((c) => c.key === 'app')!;
    expect(isNodeMatch(appChild, 'app')).toBe(true);
    expect(isNodeMatch(appChild, 'jsonlens')).toBe(true);
    expect(isNodeMatch(appChild, 'random')).toBe(false);

    // Count matches
    expect(countTreeMatches(tree, 'dark')).toBe(1);
    expect(countTreeMatches(tree, 'tree')).toBe(1);
    expect(countTreeMatches(tree, 'nonexistent')).toBe(0);
    expect(countTreeMatches(null, 'test')).toBe(0);
  });
});
