import {
  JsonObject,
  JsonPrimitive,
  JsonStats,
  JsonValue,
  TreeNode,
  JsonError,
} from '../../core/models/json-lens.model';

/**
 * Recursively creates an immutable TreeNode hierarchy from a parsed JSON value.
 */
export function buildTreeNode(
  data: JsonValue,
  key = 'root',
  path = '$',
  id = 'root',
  depth = 0,
  maxAutoExpandDepth = 3,
): TreeNode {
  if (data === null) {
    return { id, key, path, type: 'null', value: null };
  }

  const isAutoExpanded = depth <= maxAutoExpandDepth;

  if (Array.isArray(data)) {
    const children: TreeNode[] = data.map((item, index) =>
      buildTreeNode(item, `[${index}]`, `${path}[${index}]`, `${id}.${index}`, depth + 1, maxAutoExpandDepth),
    );
    return {
      id,
      key,
      path,
      type: 'array',
      children,
      childCount: data.length,
      isExpanded: isAutoExpanded,
    };
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    const children: TreeNode[] = entries.map(([childKey, childValue], index) => {
      const childPath = path === '$' ? childKey : `${path}.${childKey}`;
      return buildTreeNode(childValue, childKey, childPath, `${id}.${index}`, depth + 1, maxAutoExpandDepth);
    });
    return {
      id,
      key,
      path,
      type: 'object',
      children,
      childCount: entries.length,
      isExpanded: isAutoExpanded,
    };
  }

  if (typeof data === 'string') {
    return { id, key, path, type: 'string', value: data };
  }

  if (typeof data === 'number') {
    return { id, key, path, type: 'number', value: data };
  }

  if (typeof data === 'boolean') {
    return { id, key, path, type: 'boolean', value: data };
  }

  return { id, key, path, type: 'null', value: null };
}

/**
 * Computes deep traversal statistics for a given JSON payload.
 */
export function calculateStats(data: JsonValue | null, byteSize: number): JsonStats {
  if (data === null || data === undefined) {
    return {
      byteSize,
      keyCount: 0,
      maxDepth: 0,
      arrayCount: 0,
      objectCount: 0,
      stringCount: 0,
      numberCount: 0,
      booleanCount: 0,
      nullCount: data === null ? 1 : 0,
    };
  }

  let keyCount = 0;
  let maxDepth = 0;
  let arrayCount = 0;
  let objectCount = 0;
  let stringCount = 0;
  let numberCount = 0;
  let booleanCount = 0;
  let nullCount = 0;

  function traverse(value: JsonValue, currentDepth: number): void {
    if (currentDepth > maxDepth) {
      maxDepth = currentDepth;
    }

    if (value === null) {
      nullCount++;
      return;
    }

    if (Array.isArray(value)) {
      arrayCount++;
      for (const item of value) {
        traverse(item, currentDepth + 1);
      }
      return;
    }

    if (typeof value === 'object') {
      objectCount++;
      const keys = Object.keys(value);
      keyCount += keys.length;
      for (const k of keys) {
        traverse(value[k], currentDepth + 1);
      }
      return;
    }

    if (typeof value === 'string') {
      stringCount++;
    } else if (typeof value === 'number') {
      numberCount++;
    } else if (typeof value === 'boolean') {
      booleanCount++;
    }
  }

  traverse(data, 1);

  return {
    byteSize,
    keyCount,
    maxDepth,
    arrayCount,
    objectCount,
    stringCount,
    numberCount,
    booleanCount,
    nullCount,
  };
}

/**
 * Recursively sorts all object keys in a JSON structure.
 */
export function sortJsonKeys(value: JsonValue, order: 'asc' | 'desc'): JsonValue {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sortJsonKeys(item, order));
  }

  const entries = Object.entries(value);
  entries.sort(([a], [b]) => (order === 'asc' ? a.localeCompare(b) : b.localeCompare(a)));

  const sortedObj: JsonObject = {};
  for (const [k, v] of entries) {
    sortedObj[k] = sortJsonKeys(v, order);
  }

  return sortedObj;
}

/**
 * Flattens a deeply nested JSON object into dot-notation paths.
 */
export function flattenJsonObject(obj: JsonValue, prefix = ''): Record<string, JsonPrimitive> {
  const result: Record<string, JsonPrimitive> = {};

  function recurse(current: JsonValue, propName: string): void {
    if (current === null || typeof current !== 'object') {
      result[propName] = current as JsonPrimitive;
      return;
    }

    if (Array.isArray(current)) {
      if (current.length === 0) {
        result[propName] = '[]';
        return;
      }
      current.forEach((item, index) => {
        recurse(item, `${propName}[${index}]`);
      });
      return;
    }

    const keys = Object.keys(current);
    if (keys.length === 0) {
      result[propName] = '{}';
      return;
    }

    for (const key of keys) {
      const nextProp = propName ? `${propName}.${key}` : key;
      recurse(current[key], nextProp);
    }
  }

  recurse(obj, prefix);
  return result;
}

/**
 * Unflattens a dot-notation dictionary back into a nested JSON structure.
 */
export function unflattenJsonObject(data: Record<string, unknown>): JsonValue {
  const result: JsonObject = {};

  for (const key of Object.keys(data)) {
    const parts = key.split('.');
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = data[key];
      } else {
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
    }
  }

  return result;
}

/**
 * Recursively strips null and undefined values from a JSON structure.
 */
export function stripNullProperties(value: JsonValue): JsonValue {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => stripNullProperties(item));
  }

  const result: JsonObject = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== null && val !== undefined) {
      result[key] = stripNullProperties(val);
    }
  }

  return result;
}

/**
 * Parses a JSON.parse syntax error to determine exact line and column numbers.
 */
export function extractJsonError(error: unknown, input: string): JsonError {
  const message = error instanceof Error ? error.message : String(error);
  const normalizedInput = input.replace(/\r\n/g, '\n');

  let position = -1;
  let line = 1;
  let column = 1;

  // Pattern 1: V8 / Node format with position: "... at position 42" or "in JSON at position 42"
  const posMatch = message.match(/at position (\d+)/i);
  if (posMatch) {
    position = parseInt(posMatch[1], 10);
  } else {
    // Pattern 2: Firefox / Safari format: "... line 5 column 12"
    const lineColMatch = message.match(/line (\d+) column (\d+)/i);
    if (lineColMatch) {
      line = parseInt(lineColMatch[1], 10);
      column = parseInt(lineColMatch[2], 10);
      return { message, line, column, position: calculatePosition(normalizedInput, line, column) };
    }

    // Pattern 3: Modern V8 format: "Unexpected token 'X', ...<snippet>... is not valid JSON"
    const v8SnippetMatch = message.match(/,\s*(?:\.\.\.)?(.*)\s+is not valid JSON/s);
    if (v8SnippetMatch && v8SnippetMatch[1]) {
      const cleanSnippet = v8SnippetMatch[1].replace(/^["']+|["']+$/g, '').replace(/\r\n/g, '\n');
      const foundIdx = normalizedInput.lastIndexOf(cleanSnippet);
      if (foundIdx >= 0) {
        position = foundIdx;
      }
    }
  }

  if (position >= 0) {
    const textBeforeError = normalizedInput.slice(0, position);
    const lines = textBeforeError.split('\n');
    line = lines.length;
    column = (lines[lines.length - 1]?.length ?? 0) + 1;
  }

  return { message, line, column, position: Math.max(0, position) };
}

function calculatePosition(input: string, line: number, column: number): number {
  const lines = input.split(/\r?\n/);
  let pos = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    pos += lines[i].length + 1; // +1 for \n
  }
  return pos + Math.max(0, column - 1);
}

/**
 * Checks if a TreeNode matches a search query string against its key, path, or stringified value.
 */
export function isNodeMatch(node: TreeNode, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  const keyMatch = node.key.toLowerCase().includes(q);
  const valMatch = node.value !== undefined && String(node.value).toLowerCase().includes(q);
  const pathMatch = node.path.toLowerCase().includes(q);
  return keyMatch || valMatch || pathMatch;
}

/**
 * Checks whether any descendant of the given TreeNode matches the search query.
 */
export function hasMatchingDescendant(node: TreeNode, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q || !node.children || node.children.length === 0) return false;

  for (const child of node.children) {
    if (isNodeMatch(child, q) || hasMatchingDescendant(child, q)) {
      return true;
    }
  }
  return false;
}

/**
 * Computes the total number of matching nodes in a tree hierarchy for a search query.
 */
export function countTreeMatches(root: TreeNode | null, query: string): number {
  const q = query.toLowerCase().trim();
  if (!root || !q) return 0;

  let count = isNodeMatch(root, q) ? 1 : 0;
  if (root.children) {
    for (const child of root.children) {
      count += countTreeMatches(child, q);
    }
  }
  return count;
}

