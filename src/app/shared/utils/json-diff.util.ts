import { DiffItem } from '../../core/models/json-lens.model';

/**
 * Computes deep differences between two JSON structures.
 */
export function deepDiffJson(
  left: unknown,
  right: unknown,
  path = '$',
): DiffItem[] {
  const diffs: DiffItem[] = [];

  // Left exists, Right does not
  if (left !== undefined && right === undefined) {
    diffs.push({ path, type: 'removed', oldValue: left });
    return diffs;
  }

  // Right exists, Left does not
  if (left === undefined && right !== undefined) {
    diffs.push({ path, type: 'added', newValue: right });
    return diffs;
  }

  // Both are null or identical primitives
  if (left === right) {
    diffs.push({ path, type: 'unchanged', oldValue: left, newValue: right });
    return diffs;
  }

  // Type mismatch
  if (
    typeof left !== typeof right ||
    left === null ||
    right === null ||
    Array.isArray(left) !== Array.isArray(right)
  ) {
    diffs.push({ path, type: 'modified', oldValue: left, newValue: right });
    return diffs;
  }

  // Both are Arrays
  if (Array.isArray(left) && Array.isArray(right)) {
    const maxLen = Math.max(left.length, right.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`;
      if (i >= left.length) {
        diffs.push({ path: itemPath, type: 'added', newValue: right[i] });
      } else if (i >= right.length) {
        diffs.push({ path: itemPath, type: 'removed', oldValue: left[i] });
      } else {
        diffs.push(...deepDiffJson(left[i], right[i], itemPath));
      }
    }
    return diffs;
  }

  // Both are Objects
  if (typeof left === 'object' && typeof right === 'object') {
    const leftObj = left as Record<string, unknown>;
    const rightObj = right as Record<string, unknown>;
    const allKeys = Array.from(new Set([...Object.keys(leftObj), ...Object.keys(rightObj)]));

    for (const key of allKeys) {
      const keyPath = path === '$' ? key : `${path}.${key}`;
      if (!(key in leftObj)) {
        diffs.push({ path: keyPath, type: 'added', newValue: rightObj[key] });
      } else if (!(key in rightObj)) {
        diffs.push({ path: keyPath, type: 'removed', oldValue: leftObj[key] });
      } else {
        diffs.push(...deepDiffJson(leftObj[key], rightObj[key], keyPath));
      }
    }
    return diffs;
  }

  // Primitive value changed
  diffs.push({ path, type: 'modified', oldValue: left, newValue: right });
  return diffs;
}

/**
 * Summarizes the diff counts.
 */
export function summarizeDiff(diffs: readonly DiffItem[]): {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
} {
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;

  for (const item of diffs) {
    switch (item.type) {
      case 'added':
        added++;
        break;
      case 'removed':
        removed++;
        break;
      case 'modified':
        modified++;
        break;
      case 'unchanged':
        unchanged++;
        break;
    }
  }

  return { added, removed, modified, unchanged };
}
