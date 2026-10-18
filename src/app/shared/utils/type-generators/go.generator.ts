import { JsonValue } from '../../../core/models/json-lens.model';
import { resolveTypeName, singularize, toPascalCase } from './helpers';

/**
 * Generates Go struct definitions from any valid JSON object or array.
 */
export function jsonToGo(json: JsonValue, rootName = 'Root'): string {
  if (json === null || typeof json !== 'object') {
    return `type ${toPascalCase(rootName)} ${inferGoPrimitive(json)}\n`;
  }

  const structs: Map<string, string> = new Map();
  const usedNames = new Set<string>([toPascalCase(rootName)]);

  function generateStruct(data: Record<string, unknown>, name: string): void {
    const pascalName = toPascalCase(name);
    const lines: string[] = [`type ${pascalName} struct {`];

    for (const [key, val] of Object.entries(data)) {
      const fieldName = toPascalCase(key);

      if (val === null) {
        lines.push(`\t${fieldName} interface{} \`json:"${key}"\``);
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          lines.push(`\t${fieldName} []interface{} \`json:"${key}"\``);
        } else {
          const first = val[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const childStructName = resolveTypeName(singularize(key), pascalName, usedNames);
            generateStruct(first as Record<string, unknown>, childStructName);
            lines.push(`\t${fieldName} []${childStructName} \`json:"${key}"\``);
          } else {
            lines.push(`\t${fieldName} []${inferGoPrimitive(first)} \`json:"${key}"\``);
          }
        }
      } else if (typeof val === 'object') {
        const childStructName = resolveTypeName(key, pascalName, usedNames);
        generateStruct(val as Record<string, unknown>, childStructName);
        lines.push(`\t${fieldName} ${childStructName} \`json:"${key}"\``);
      } else {
        lines.push(`\t${fieldName} ${inferGoPrimitive(val)} \`json:"${key}"\``);
      }
    }

    lines.push('}\n');
    structs.set(pascalName, lines.join('\n'));
  }

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `type ${toPascalCase(rootName)} []interface{}\n`;
    }
    const first = json[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const itemStructName = `${toPascalCase(rootName)}Item`;
      generateStruct(first as Record<string, unknown>, itemStructName);
      const output = Array.from(structs.values()).join('\n');
      return `${output}\ntype ${toPascalCase(rootName)} []${itemStructName}\n`;
    }
    return `type ${toPascalCase(rootName)} []${inferGoPrimitive(first)}\n`;
  }

  generateStruct(json as Record<string, unknown>, rootName);
  return Array.from(structs.values()).join('\n');
}

function inferGoPrimitive(val: unknown): string {
  if (val === null) return 'interface{}';
  if (typeof val === 'string') return 'string';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? 'int' : 'float64';
  }
  if (typeof val === 'boolean') return 'bool';
  return 'interface{}';
}
