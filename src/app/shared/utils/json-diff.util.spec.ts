import { describe, expect, it } from 'vitest';
import {
  deepDiffJson,
  diffPathToJsonPointer,
  diffToJsonPatch,
  diffToMarkdown,
  diffToPlainText,
  summarizeDiff,
} from './json-diff.util';

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

  it('should bracket-quote keys with dots, spaces, or special characters in diff paths', () => {
    const left = {
      'first.name': 'Ada',
      user: { 'full name': 'Ada Lovelace', validKey: 1 },
    };
    const right = {
      'first.name': 'Grace',
      user: { 'full name': 'Grace Hopper', validKey: 1, 'extra-field': true },
    };

    const diffs = deepDiffJson(left, right);
    const modifiedPaths = diffs.filter((d) => d.type === 'modified').map((d) => d.path);
    const addedItem = diffs.find((d) => d.type === 'added');

    expect(modifiedPaths).toContain('$["first.name"]');
    expect(modifiedPaths).toContain('user["full name"]');
    expect(addedItem?.path).toBe('user["extra-field"]');
  });

  it('should convert diff paths into RFC 6901 JSON Pointers and RFC 6902 patches', () => {
    expect(diffPathToJsonPointer('$')).toBe('');
    expect(diffPathToJsonPointer('name')).toBe('/name');
    expect(diffPathToJsonPointer('user.items[2].id')).toBe('/user/items/2/id');
    expect(diffPathToJsonPointer('$["first.name"]')).toBe('/first.name');
    expect(diffPathToJsonPointer('meta["a/b~c"]')).toBe('/meta/a~1b~0c');

    const diffs = deepDiffJson(
      { keep: 1, title: 'Old', removeMe: true },
      { keep: 1, title: 'New', addMe: [10] },
    );
    const patch = diffToJsonPatch(diffs);

    expect(patch).toEqual([
      { op: 'replace', path: '/title', value: 'New' },
      { op: 'remove', path: '/removeMe' },
      { op: 'add', path: '/addMe', value: [10] },
    ]);

    const markdown = diffToMarkdown(diffs, summarizeDiff(diffs));
    expect(markdown).toContain('# JsonLens Diff Report');
    expect(markdown).toContain('| `+ ADD` | `addMe` | `[10]` |');
    expect(markdown).toContain('| `- DEL` | `removeMe` | `true` |');
    expect(markdown).toContain('| `~ MOD` | `title` | `"Old"` -> `"New"` |');

    const textReport = diffToPlainText(diffs, summarizeDiff(diffs));
    expect(textReport).toContain('JsonLens Diff Report');
    expect(textReport).toContain('[+ ADD] addMe : [10]');
    expect(textReport).toContain('[- DEL] removeMe : true');
    expect(textReport).toContain('[~ MOD] title : "Old" -> "New"');
  });

  it('should align inserted items and object IDs cleanly in smart-array diff mode', () => {
    const insertedDiffs = deepDiffJson([1, 2, 3], [0, 1, 2, 3], '$', 'smart-array');
    const insertedSummary = summarizeDiff(insertedDiffs);
    expect(insertedSummary.added).toBe(1);
    expect(insertedSummary.modified).toBe(0);
    expect(insertedSummary.removed).toBe(0);
    expect(insertedSummary.unchanged).toBe(3);

    const objectsLeft = [
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ];
    const objectsRight = [
      { id: 9, name: 'Zero' },
      { id: 1, name: 'Alpha Updated' },
      { id: 2, name: 'Beta' },
    ];
    const objDiffs = deepDiffJson(objectsLeft, objectsRight, '$', 'smart-array');
    const meaningful = objDiffs.filter((d) => d.type !== 'unchanged');

    expect(meaningful).toEqual([
      { path: '$[0]', type: 'added', newValue: { id: 9, name: 'Zero' } },
      { path: '$[1].name', type: 'modified', oldValue: 'Alpha', newValue: 'Alpha Updated' },
    ]);
  });
});
