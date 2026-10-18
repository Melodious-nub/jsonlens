import { JsonValue } from '../../../core/models/json-lens.model';
import { resolveTypeName, singularize, toPascalCase } from './helpers';

/**
 * Generates JSDoc @typedef definitions for JavaScript environments.
 */
export function jsonToJavascript(json: JsonValue, rootName = 'Root'): string {
  if (json === null || typeof json !== 'object') {
    return `/**\n * @typedef {${inferJsDocPrimitive(json)}} ${toPascalCase(rootName)}\n */\n`;
  }

  const typedefs: Map<string, string> = new Map();
  const usedNames = new Set<string>([toPascalCase(rootName)]);

  function generateTypedef(data: Record<string, unknown>, name: string): void {
    const typeName = toPascalCase(name);
    const lines: string[] = ['/**', ` * @typedef {Object} ${typeName}`];

    for (const [key, val] of Object.entries(data)) {
      const isNullable = val === null;

      if (val === null) {
        lines.push(` * @property {*} [${key}]`);
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          lines.push(` * @property {Array<*>} ${key}`);
        } else {
          const first = val[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const childTypeName = resolveTypeName(singularize(key), typeName, usedNames);
            generateTypedef(first as Record<string, unknown>, childTypeName);
            lines.push(` * @property {Array<${childTypeName}>} ${key}`);
          } else {
            lines.push(` * @property {Array<${inferJsDocPrimitive(first)}>} ${key}`);
          }
        }
      } else if (typeof val === 'object') {
        const childTypeName = resolveTypeName(key, typeName, usedNames);
        generateTypedef(val as Record<string, unknown>, childTypeName);
        lines.push(` * @property {${childTypeName}} [${key}]`);
      } else {
        const primType = inferJsDocPrimitive(val);
        const propStr = isNullable ? `[${key}]` : key;
        lines.push(` * @property {${primType}} ${propStr}`);
      }
    }

    lines.push(' */\n');
    typedefs.set(typeName, lines.join('\n'));
  }

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `/**\n * @typedef {Array<*>} ${toPascalCase(rootName)}\n */\n`;
    }
    const first = json[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const itemTypeName = `${toPascalCase(rootName)}Item`;
      generateTypedef(first as Record<string, unknown>, itemTypeName);
      const output = Array.from(typedefs.values()).join('\n');
      return `${output}/**\n * @typedef {Array<${itemTypeName}>} ${toPascalCase(rootName)}\n */\n`;
    }
    return `/**\n * @typedef {Array<${inferJsDocPrimitive(first)}>} ${toPascalCase(rootName)}\n */\n`;
  }

  generateTypedef(json as Record<string, unknown>, rootName);
  return Array.from(typedefs.values()).join('\n');
}

function inferJsDocPrimitive(val: unknown): string {
  if (val === null) return '*';
  if (typeof val === 'string') return 'string';
  if (typeof val === 'number') return 'number';
  if (typeof val === 'boolean') return 'boolean';
  return '*';
}
