import { formatPropertyAccessor } from './json-path.util';

interface ScannerFrame {
  readonly type: 'object' | 'array';
  readonly basePath: string;
  expectingKey: boolean;
  arrayIndex: number;
  pendingKey: string | null;
}

function appendLineMapKey(basePath: string, key: string): string {
  const accessor = formatPropertyAccessor(key);
  if (basePath === '$') {
    return accessor.startsWith('.') ? accessor.slice(1) : `$${accessor}`;
  }
  return `${basePath}${accessor}`;
}

function readJsonStringEnd(raw: string, startQuoteIndex: number): { value: string; nextIndex: number } {
  let i = startQuoteIndex + 1;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '"') {
      const slice = raw.slice(startQuoteIndex, i + 1);
      try {
        return { value: JSON.parse(slice) as string, nextIndex: i + 1 };
      } catch {
        return { value: raw.slice(startQuoteIndex + 1, i), nextIndex: i + 1 };
      }
    }
    i++;
  }
  return { value: raw.slice(startQuoteIndex + 1), nextIndex: raw.length };
}

/**
 * Iterative O(N) JSON scanner mapping diff paths to 1-based line numbers.
 */
export function buildJsonLineMap(raw: string): Map<string, number> {
  const map = new Map<string, number>();
  if (!raw || !raw.trim()) {
    return map;
  }

  const stack: ScannerFrame[] = [];
  let line = 1;
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];

    if (ch === '\n') {
      line++;
      i++;
      continue;
    }

    if (ch === ' ' || ch === '\r' || ch === '\t') {
      i++;
      continue;
    }

    const top = stack[stack.length - 1];

    if (ch === '"') {
      const strStartLine = line;
      const { value, nextIndex } = readJsonStringEnd(raw, i);
      // Count any rare escaped/raw newlines inside scanned slice
      for (let k = i; k < nextIndex; k++) {
        if (raw[k] === '\n') line++;
      }

      if (top && top.type === 'object' && top.expectingKey) {
        top.pendingKey = value;
        top.expectingKey = false;
        const keyPath = appendLineMapKey(top.basePath, value);
        if (!map.has(keyPath)) {
          map.set(keyPath, strStartLine);
        }
      } else if (top && top.type === 'array') {
        const itemPath = `${top.basePath}[${top.arrayIndex}]`;
        if (!map.has(itemPath)) {
          map.set(itemPath, strStartLine);
        }
      }

      i = nextIndex;
      continue;
    }

    if (ch === '{' || ch === '[') {
      const containerType = ch === '{' ? 'object' : 'array';
      let nextBasePath = '$';

      if (top) {
        if (top.type === 'object' && top.pendingKey !== null) {
          nextBasePath = appendLineMapKey(top.basePath, top.pendingKey);
          top.pendingKey = null;
        } else if (top.type === 'array') {
          nextBasePath = `${top.basePath}[${top.arrayIndex}]`;
          if (!map.has(nextBasePath)) {
            map.set(nextBasePath, line);
          }
        }
      } else {
        map.set('$', line);
      }

      stack.push({
        type: containerType,
        basePath: nextBasePath,
        expectingKey: containerType === 'object',
        arrayIndex: 0,
        pendingKey: null,
      });
      i++;
      continue;
    }

    if (ch === '}' || ch === ']') {
      stack.pop();
      i++;
      continue;
    }

    if (ch === ',') {
      if (top) {
        if (top.type === 'object') {
          top.expectingKey = true;
          top.pendingKey = null;
        } else {
          top.arrayIndex++;
        }
      }
      i++;
      continue;
    }

    if (ch === ':') {
      i++;
      continue;
    }

    // Primitive literal (number, true, false, null)
    if (top && top.type === 'array') {
      const itemPath = `${top.basePath}[${top.arrayIndex}]`;
      if (!map.has(itemPath)) {
        map.set(itemPath, line);
      }
    } else if (!top && !map.has('$')) {
      map.set('$', line);
    }

    while (i < raw.length && !/[\s,}\]:]/.test(raw[i])) {
      i++;
    }
  }

  return map;
}

/**
 * Resolves the closest matching 1-based line number for a diff path,
 * walking up parent segments if an added/removed leaf does not exist in this document.
 */
export function resolveLineForDiffPath(
  lineMap: ReadonlyMap<string, number>,
  path: string,
): number | undefined {
  if (lineMap.size === 0 || !path) {
    return undefined;
  }

  const exact = lineMap.get(path);
  if (exact !== undefined) {
    return exact;
  }

  let candidate = path;
  while (candidate.length > 0 && candidate !== '$') {
    const lastBracket = candidate.lastIndexOf('[');
    const lastDot = candidate.lastIndexOf('.');
    const cut = Math.max(lastBracket, lastDot);
    if (cut <= 0) {
      return lineMap.get('$');
    }
    candidate = candidate.slice(0, cut);
    const hit = lineMap.get(candidate);
    if (hit !== undefined) {
      return hit;
    }
  }

  return lineMap.get('$');
}

