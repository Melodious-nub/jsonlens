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
