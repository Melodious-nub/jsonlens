/**
 * Common string casing and identifier transformation utilities
 * for code and type generators.
 */

export function toPascalCase(str: string, fallback = 'Type'): string {
  if (!str) return fallback;
  const cleaned = str
    .replace(/[^a-zA-Z0-9_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  if (!cleaned) return fallback;
  // If starts with number, prefix with Type
  if (/^[0-9]/.test(cleaned)) {
    return `Item${cleaned}`;
  }
  return cleaned;
}

export function toCamelCase(str: string, fallback = 'field'): string {
  const pascal = toPascalCase(str, fallback);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toSnakeCase(str: string, fallback = 'field'): string {
  if (!str) return fallback;
  const cleaned = str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toLowerCase()
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (!cleaned) return fallback;
  if (/^[0-9]/.test(cleaned)) {
    return `field_${cleaned}`;
  }
  return cleaned;
}

export function singularize(str: string): string {
  if (!str) return str;
  if (str.endsWith('ies') && str.length > 3) return str.slice(0, -3) + 'y';
  if (str.endsWith('es') && str.length > 2 && /(?:ch|sh|ss|x|z)es$/.test(str)) {
    return str.slice(0, -2);
  }
  if (str.endsWith('s') && !str.endsWith('ss') && str.length > 1) {
    return str.slice(0, -1);
  }
  return str;
}

export function isInteger(val: number): boolean {
  return Number.isInteger(val);
}

/**
 * Resolves a clean, natural type name (e.g. 'Permission', 'Profile')
 * while gracefully avoiding collisions with already-used type names.
 */
export function resolveTypeName(
  candidate: string,
  parentName: string,
  usedNames: Set<string>
): string {
  const cleanCandidate = toPascalCase(candidate, 'Item');
  if (!usedNames.has(cleanCandidate)) {
    usedNames.add(cleanCandidate);
    return cleanCandidate;
  }

  // If candidate is already taken (e.g. matches Root or another property), prepend parent
  const withParent = `${toPascalCase(parentName, '')}${cleanCandidate}`;
  if (!usedNames.has(withParent)) {
    usedNames.add(withParent);
    return withParent;
  }

  // If still taken, append numerical suffix
  let counter = 2;
  while (usedNames.has(`${cleanCandidate}${counter}`)) {
    counter++;
  }
  const resolved = `${cleanCandidate}${counter}`;
  usedNames.add(resolved);
  return resolved;
}
