import { JsonValue } from '../../../core/models/json-lens.model';

/**
 * Generates TypeScript interfaces from any valid JSON object or array.
 */
export function jsonToTypescript(json: JsonValue, rootName = 'Root'): string {
  if (json === null || typeof json !== 'object') {
    return `export type ${toPascalCase(rootName)} = ${inferPrimitiveType(json)};\n`;
  }

  const interfaces: Map<string, string> = new Map();

  function generateInterface(data: Record<string, unknown>, name: string): string {
    const lines: string[] = [`export interface ${toPascalCase(name)} {`];

    for (const [key, val] of Object.entries(data)) {
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
      const isNullable = val === null;

      if (val === null) {
        lines.push(`  ${safeKey}: null;`);
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          lines.push(`  ${safeKey}: unknown[];`);
        } else {
          const first = val[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const childInterfaceName = `${toPascalCase(name)}${toPascalCase(singularize(key))}`;
            generateInterface(first as Record<string, unknown>, childInterfaceName);
            lines.push(`  ${safeKey}: ${childInterfaceName}[];`);
          } else {
            lines.push(`  ${safeKey}: ${inferPrimitiveType(first)}[];`);
          }
        }
      } else if (typeof val === 'object') {
        const childInterfaceName = `${toPascalCase(name)}${toPascalCase(key)}`;
        generateInterface(val as Record<string, unknown>, childInterfaceName);
        lines.push(`  ${safeKey}: ${childInterfaceName};`);
      } else {
        const typeStr = inferPrimitiveType(val);
        lines.push(`  ${safeKey}: ${typeStr}${isNullable ? ' | null' : ''};`);
      }
    }

    lines.push('}\n');
    const fullCode = lines.join('\n');
    interfaces.set(name, fullCode);
    return fullCode;
  }

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `export type ${toPascalCase(rootName)} = unknown[];\n`;
    }
    const first = json[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const itemInterfaceName = `${toPascalCase(rootName)}Item`;
      generateInterface(first as Record<string, unknown>, itemInterfaceName);
      const output = Array.from(interfaces.values()).join('\n');
      return `${output}\nexport type ${toPascalCase(rootName)} = ${itemInterfaceName}[];\n`;
    }
    return `export type ${toPascalCase(rootName)} = ${inferPrimitiveType(first)}[];\n`;
  }

  generateInterface(json as Record<string, unknown>, rootName);
  return Array.from(interfaces.values()).join('\n');
}

function inferPrimitiveType(val: unknown): string {
  if (val === null) return 'null';
  if (typeof val === 'string') return 'string';
  if (typeof val === 'number') return 'number';
  if (typeof val === 'boolean') return 'boolean';
  return 'unknown';
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') || 'Type';
}

function singularize(str: string): string {
  if (str.endsWith('ies')) return str.slice(0, -3) + 'y';
  if (str.endsWith('es')) return str.slice(0, -2);
  if (str.endsWith('s')) return str.slice(0, -1);
  return str;
}
