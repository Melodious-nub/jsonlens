import { JsonValue } from '../../core/models/json-lens.model';

/**
 * Converts a raw node path into a standardized JSONPath notation.
 * e.g. "root.data.items[0].id" -> "$.data.items[0].id"
 */
export function toStandardJsonPath(path: string): string {
  if (!path || path === '$' || path === 'root') {
    return '$';
  }

  let formatted = path.startsWith('root.') ? path.slice(5) : path;
  if (formatted.startsWith('root')) {
    formatted = formatted.slice(4);
  }

  if (formatted.startsWith('$')) {
    return formatted;
  }

  if (formatted.startsWith('[')) {
    return `$${formatted}`;
  }

  return `$.${formatted}`;
}

/**
 * Converts a raw node path into a standard JavaScript accessor expression.
 * e.g. "$.users[0].id" -> "users[0].id"
 */
export function toJavaScriptAccessor(path: string): string {
  if (!path || path === '$' || path === 'root') {
    return 'response';
  }

  let clean = path;
  if (clean.startsWith('$.')) {
    clean = clean.slice(2);
  } else if (clean.startsWith('$')) {
    clean = clean.slice(1);
  } else if (clean.startsWith('root.')) {
    clean = clean.slice(5);
  } else if (clean === 'root') {
    return 'response';
  }

  return clean || 'response';
}

/**
 * Validates whether an object key needs bracket notation vs dot notation.
 */
export function formatPropertyAccessor(key: string): string {
  const isValidIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
  if (isValidIdentifier) {
    return `.${key}`;
  }
  return `[${JSON.stringify(key)}]`;
}

/**
 * Resolves the value at a given JSONPath or dot notation within a JSON structure.
 * e.g. getValueByJsonPath({ user: { name: 'Alice' } }, '$.user.name') -> 'Alice'
 * e.g. getValueByJsonPath([10, 20, 30], '$[1]') -> 20
 */
export function getValueByJsonPath(data: JsonValue | null | undefined, path: string): unknown {
  if (data === null || data === undefined) {
    return undefined;
  }

  const standardPath = toStandardJsonPath(path);
  if (standardPath === '$') {
    return data;
  }

  const pathWithoutRoot = standardPath.slice(1);
  const segmentRegex = /(?:\.([^.\[\]]+))|\[(?:(\d+)|"([^"]+)"|'([^']+)'|([^.\[\]]+))\]/g;
  let current: unknown = data;
  let match: RegExpExecArray | null;

  while ((match = segmentRegex.exec(pathWithoutRoot)) !== null) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }

    const key = match[1] ?? match[3] ?? match[4] ?? match[5];
    const indexStr = match[2];

    if (key !== undefined) {
      current = (current as Record<string, unknown>)[key];
    } else if (indexStr !== undefined) {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[parseInt(indexStr, 10)];
    }
  }

  return current;
}

export interface JsonPathMatch {
  readonly path: string;
  readonly value: unknown;
}

export interface JsonPathEvaluation {
  readonly isValidQuery: boolean;
  readonly matches: readonly JsonPathMatch[];
}

/**
 * Evaluates a JSONPath query (supporting dot notation, bracket keys, array indices, and wildcards `[*]` / `.*`).
 */
export function evaluateJsonPath(
  data: JsonValue | null | undefined,
  query: string,
): JsonPathEvaluation {
  const trimmed = query.trim();
  if (data === null || data === undefined || !trimmed.startsWith('$')) {
    return { isValidQuery: false, matches: [] };
  }

  if (trimmed === '$') {
    return { isValidQuery: true, matches: [{ path: '$', value: data }] };
  }

  const rest = trimmed.slice(1);
  const tokenRegex = /(?:\.(\*|[a-zA-Z0-9_$-]+))|\[(?:\*|(\d+)|"([^"]+)"|'([^']+)')\]/g;
  const tokens: Array<
    | { kind: 'wildcard' }
    | { kind: 'key'; key: string }
    | { kind: 'index'; index: number }
  > = [];

  let consumed = 0;
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(rest)) !== null) {
    if (m.index !== consumed) {
      return { isValidQuery: false, matches: [] };
    }
    consumed = m.index + m[0].length;

    if (m[0] === '[*]' || m[1] === '*') {
      tokens.push({ kind: 'wildcard' });
    } else if (m[2] !== undefined) {
      tokens.push({ kind: 'index', index: parseInt(m[2], 10) });
    } else {
      const key = m[1] ?? m[3] ?? m[4] ?? '';
      tokens.push({ kind: 'key', key });
    }
  }

  if (consumed !== rest.length || tokens.length === 0) {
    return { isValidQuery: false, matches: [] };
  }

  let currentNodes: JsonPathMatch[] = [{ path: '$', value: data }];

  for (const token of tokens) {
    const nextNodes: JsonPathMatch[] = [];

    for (const node of currentNodes) {
      const val = node.value;
      if (val === null || val === undefined || typeof val !== 'object') {
        continue;
      }

      if (token.kind === 'wildcard') {
        if (Array.isArray(val)) {
          for (let i = 0; i < val.length; i++) {
            nextNodes.push({ path: `${node.path}[${i}]`, value: val[i] });
          }
        } else {
          for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
            const nextPath = node.path === '$' ? `$.${k}` : `${node.path}.${k}`;
            nextNodes.push({ path: nextPath, value: v });
          }
        }
      } else if (token.kind === 'index') {
        if (Array.isArray(val) && token.index >= 0 && token.index < val.length) {
          nextNodes.push({ path: `${node.path}[${token.index}]`, value: val[token.index] });
        }
      } else {
        if (!Array.isArray(val) && Object.prototype.hasOwnProperty.call(val, token.key)) {
          const obj = val as Record<string, unknown>;
          const accessor = formatPropertyAccessor(token.key);
          const nextPath = accessor.startsWith('.')
            ? `${node.path}.${token.key}`
            : `${node.path}${accessor}`;
          nextNodes.push({ path: nextPath, value: obj[token.key] });
        }
      }
    }

    currentNodes = nextNodes;
    if (currentNodes.length === 0) break;
  }

  return { isValidQuery: true, matches: currentNodes };
}
