import { DiffComparisonMode, DiffItem, DiffSummary } from '../../core/models/json-lens.model';
import { formatPropertyAccessor } from './json-path.util';

export interface JsonPatchOperation {
  readonly op: 'add' | 'remove' | 'replace';
  readonly path: string;
  readonly value?: unknown;
}

/**
 * Builds a clean, escaped property path segment compatible with JSONPath.
 */
function appendDiffKeyPath(basePath: string, key: string): string {
  const accessor = formatPropertyAccessor(key);
  if (basePath === '$') {
    return accessor.startsWith('.') ? accessor.slice(1) : `$${accessor}`;
  }
  return `${basePath}${accessor}`;
}

const IDENTITY_FIELDS = ['id', '_id', 'key', 'uuid', 'name'] as const;
const SMART_ARRAY_CELL_LIMIT = 40_000;

function getArrayElementSignature(item: unknown): { sig: string; idKey?: string; idVal?: string } {
  if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
    const obj = item as Record<string, unknown>;
    for (const field of IDENTITY_FIELDS) {
      if (field in obj) {
        const val = obj[field];
        if (typeof val === 'string' || typeof val === 'number') {
          return {
            sig: `id:${field}:${String(val)}`,
            idKey: field,
            idVal: String(val),
          };
        }
      }
    }
  }
  try {
    return { sig: `val:${JSON.stringify(item)}` };
  } catch {
    return { sig: `str:${String(item)}` };
  }
}

function diffArraysSmart(
  left: readonly unknown[],
  right: readonly unknown[],
  path: string,
  mode: DiffComparisonMode,
): DiffItem[] {
  const m = left.length;
  const n = right.length;
  const leftMeta = left.map(getArrayElementSignature);
  const rightMeta = right.map(getArrayElementSignature);

  const stride = n + 1;
  const dp = new Int32Array((m + 1) * stride);

  for (let i = m - 1; i >= 0; i--) {
    const rowOffset = i * stride;
    const nextRowOffset = (i + 1) * stride;
    for (let j = n - 1; j >= 0; j--) {
      if (leftMeta[i].sig === rightMeta[j].sig) {
        dp[rowOffset + j] = 1 + dp[nextRowOffset + j + 1];
      } else {
        const down = dp[nextRowOffset + j];
        const rightCell = dp[rowOffset + j + 1];
        dp[rowOffset + j] = down >= rightCell ? down : rightCell;
      }
    }
  }

  const diffs: DiffItem[] = [];
  let i = 0;
  let j = 0;

  while (i < m && j < n) {
    if (leftMeta[i].sig === rightMeta[j].sig) {
      diffs.push(...deepDiffJson(left[i], right[j], `${path}[${j}]`, mode));
      i++;
      j++;
    } else if (
      i + 1 < m &&
      j + 1 < n &&
      dp[(i + 1) * stride + j] === dp[i * stride + j + 1] &&
      leftMeta[i + 1].sig === rightMeta[j + 1].sig &&
      !(leftMeta[i].idKey && rightMeta[j].idKey && leftMeta[i].idKey === rightMeta[j].idKey)
    ) {
      diffs.push(...deepDiffJson(left[i], right[j], `${path}[${j}]`, mode));
      i++;
      j++;
    } else if (dp[(i + 1) * stride + j] >= dp[i * stride + j + 1]) {
      diffs.push({ path: `${path}[${i}]`, type: 'removed', oldValue: left[i] });
      i++;
    } else {
      diffs.push({ path: `${path}[${j}]`, type: 'added', newValue: right[j] });
      j++;
    }
  }

  while (i < m) {
    diffs.push({ path: `${path}[${i}]`, type: 'removed', oldValue: left[i] });
    i++;
  }

  while (j < n) {
    diffs.push({ path: `${path}[${j}]`, type: 'added', newValue: right[j] });
    j++;
  }

  return diffs;
}

/**
 * Computes deep differences between two JSON structures.
 */
export function deepDiffJson(
  left: unknown,
  right: unknown,
  path = '$',
  mode: DiffComparisonMode = 'strict',
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
    if (
      mode === 'smart-array' &&
      left.length > 0 &&
      right.length > 0 &&
      left.length * right.length <= SMART_ARRAY_CELL_LIMIT
    ) {
      return diffArraysSmart(left, right, path, mode);
    }

    const maxLen = Math.max(left.length, right.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`;
      if (i >= left.length) {
        diffs.push({ path: itemPath, type: 'added', newValue: right[i] });
      } else if (i >= right.length) {
        diffs.push({ path: itemPath, type: 'removed', oldValue: left[i] });
      } else {
        diffs.push(...deepDiffJson(left[i], right[i], itemPath, mode));
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
      const keyPath = appendDiffKeyPath(path, key);
      if (!(key in leftObj)) {
        diffs.push({ path: keyPath, type: 'added', newValue: rightObj[key] });
      } else if (!(key in rightObj)) {
        diffs.push({ path: keyPath, type: 'removed', oldValue: leftObj[key] });
      } else {
        diffs.push(...deepDiffJson(leftObj[key], rightObj[key], keyPath, mode));
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

/**
 * Escapes a single key token according to RFC 6901 JSON Pointer rules.
 */
function escapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Converts a diff path (e.g. 'user["first.name"][0]') into an RFC 6901 JSON Pointer ('/user/first.name/0').
 */
export function diffPathToJsonPointer(path: string): string {
  if (!path || path === '$') {
    return '';
  }

  const segments: string[] = [];
  let i = path.startsWith('$') ? 1 : 0;

  while (i < path.length) {
    const ch = path[i];
    if (ch === '.') {
      i++;
      const start = i;
      while (i < path.length && path[i] !== '.' && path[i] !== '[') {
        i++;
      }
      if (i > start) {
        segments.push(path.slice(start, i));
      }
    } else if (ch === '[') {
      i++;
      if (i < path.length && (path[i] === '"' || path[i] === "'")) {
        const quote = path[i];
        i++;
        let key = '';
        while (i < path.length && path[i] !== quote) {
          if (path[i] === '\\' && i + 1 < path.length) {
            i++;
          }
          key += path[i];
          i++;
        }
        if (i < path.length && path[i] === quote) {
          i++;
        }
        if (i < path.length && path[i] === ']') {
          i++;
        }
        segments.push(key);
      } else {
        const start = i;
        while (i < path.length && path[i] !== ']') {
          i++;
        }
        segments.push(path.slice(start, i));
        if (i < path.length && path[i] === ']') {
          i++;
        }
      }
    } else {
      const start = i;
      while (i < path.length && path[i] !== '.' && path[i] !== '[') {
        i++;
      }
      if (i > start) {
        segments.push(path.slice(start, i));
      }
    }
  }

  if (segments.length === 0) {
    return '';
  }
  return `/${segments.map(escapeJsonPointerSegment).join('/')}`;
}

/**
 * Converts meaningful diff entries into RFC 6902 JSON Patch operations.
 */
export function diffToJsonPatch(diffs: readonly DiffItem[]): JsonPatchOperation[] {
  const ops: JsonPatchOperation[] = [];
  for (const item of diffs) {
    if (item.type === 'unchanged') continue;
    const pointer = diffPathToJsonPointer(item.path);
    if (item.type === 'added') {
      ops.push({ op: 'add', path: pointer, value: item.newValue });
    } else if (item.type === 'removed') {
      ops.push({ op: 'remove', path: pointer });
    } else if (item.type === 'modified') {
      ops.push({ op: 'replace', path: pointer, value: item.newValue });
    }
  }
  return ops;
}

function stringifyReportValue(val: unknown): string {
  if (val === undefined) return 'undefined';
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function formatReportDetails(item: DiffItem): string {
  if (item.type === 'added') {
    return stringifyReportValue(item.newValue);
  }
  if (item.type === 'removed') {
    return stringifyReportValue(item.oldValue);
  }
  return `${stringifyReportValue(item.oldValue)} -> ${stringifyReportValue(item.newValue)}`;
}

const REPORT_BADGE_MAP: Record<Exclude<DiffItem['type'], 'unchanged'>, string> = {
  added: '+ ADD',
  removed: '- DEL',
  modified: '~ MOD',
};

/**
 * Formats meaningful diffs into a clean Markdown report for sharing in issues or PRs.
 */
export function diffToMarkdown(diffs: readonly DiffItem[], summary: DiffSummary): string {
  const meaningful = diffs.filter((d) => d.type !== 'unchanged');
  const lines: string[] = [
    '# JsonLens Diff Report',
    '',
    `- **Added:** ${summary.added}`,
    `- **Removed:** ${summary.removed}`,
    `- **Modified:** ${summary.modified}`,
    `- **Unchanged:** ${summary.unchanged}`,
    '',
  ];

  if (meaningful.length === 0) {
    lines.push('_No differences detected._');
    return lines.join('\n');
  }

  lines.push('| Type | Path | Details |');
  lines.push('| :--- | :--- | :--- |');

  for (const item of meaningful) {
    if (item.type === 'unchanged') continue;
    const badge = REPORT_BADGE_MAP[item.type];
    const safePath = `\`${item.path.replace(/\|/g, '\\|')}\``;
    const details = formatReportDetails(item).replace(/\|/g, '\\|');
    const formattedDetails = item.type === 'modified'
      ? `\`${stringifyReportValue(item.oldValue).replace(/\|/g, '\\|')}\` -> \`${stringifyReportValue(item.newValue).replace(/\|/g, '\\|')}\``
      : `\`${details}\``;
    lines.push(`| \`${badge}\` | ${safePath} | ${formattedDetails} |`);
  }

  return lines.join('\n');
}

/**
 * Formats meaningful diffs into a clean plain-text (.txt) report.
 */
export function diffToPlainText(diffs: readonly DiffItem[], summary: DiffSummary): string {
  const meaningful = diffs.filter((d) => d.type !== 'unchanged');
  const lines: string[] = [
    'JsonLens Diff Report',
    '====================',
    `Added: ${summary.added} | Removed: ${summary.removed} | Modified: ${summary.modified} | Unchanged: ${summary.unchanged}`,
    '',
  ];

  if (meaningful.length === 0) {
    lines.push('No differences detected.');
    return lines.join('\n');
  }

  for (const item of meaningful) {
    if (item.type === 'unchanged') continue;
    const badge = REPORT_BADGE_MAP[item.type];
    lines.push(`[${badge}] ${item.path} : ${formatReportDetails(item)}`);
  }

  return lines.join('\n');
}
