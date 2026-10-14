import { describe, expect, it } from 'vitest';
import { deepDiffJson, summarizeDiff } from './json-diff.util';

describe('json-diff.util', () => {
  it('should detect added, removed, and modified values', () => {
    const left = {
      name: 'OldName',
      unchanged: true,
      removedField: 'bye',
    };
    const right = {
      name: 'NewName',
      unchanged: true,
      addedField: 'hello',
    };

    const diffs = deepDiffJson(left, right);
    const summary = summarizeDiff(diffs);

    expect(summary.added).toBe(1);
    expect(summary.removed).toBe(1);
    expect(summary.modified).toBe(1);
    expect(summary.unchanged).toBe(1);

    const addedItem = diffs.find((d) => d.type === 'added');
    expect(addedItem?.path).toBe('addedField');
    expect(addedItem?.newValue).toBe('hello');

    const removedItem = diffs.find((d) => d.type === 'removed');
    expect(removedItem?.path).toBe('removedField');
    expect(removedItem?.oldValue).toBe('bye');

    const modifiedItem = diffs.find((d) => d.type === 'modified');
    expect(modifiedItem?.path).toBe('name');
    expect(modifiedItem?.oldValue).toBe('OldName');
    expect(modifiedItem?.newValue).toBe('NewName');
  });

  it('should detect array item differences', () => {
    const left = [1, 2, 3];
    const right = [1, 99, 3, 4];
    const diffs = deepDiffJson(left, right);
    const summary = summarizeDiff(diffs);

    expect(summary.modified).toBe(1); // 2 -> 99
    expect(summary.added).toBe(1); // 4 added
    expect(summary.unchanged).toBe(2); // 1 and 3 unchanged
  });
});
