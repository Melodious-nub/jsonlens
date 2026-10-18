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
