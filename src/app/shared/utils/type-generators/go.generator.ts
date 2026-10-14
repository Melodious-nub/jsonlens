import { JsonValue } from '../../../core/models/json-lens.model';

/**
 * Generates Go struct definitions from any valid JSON object or array.
 */
export function jsonToGo(json: JsonValue, rootName = 'Root'): string {
  if (json === null || typeof json !== 'object') {
    return `type ${toPascalCase(rootName)} ${inferGoPrimitive(json)}\n`;
  }

  const structs: Map<string, string> = new Map();

  function generateStruct(data: Record<string, unknown>, name: string): void {
    const lines: string[] = [`type ${toPascalCase(name)} struct {`];

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
            const childStructName = `${toPascalCase(name)}${toPascalCase(singularize(key))}`;
            generateStruct(first as Record<string, unknown>, childStructName);
            lines.push(`\t${fieldName} []${childStructName} \`json:"${key}"\``);
          } else {
            lines.push(`\t${fieldName} []${inferGoPrimitive(first)} \`json:"${key}"\``);
          }
        }
      } else if (typeof val === 'object') {
        const childStructName = `${toPascalCase(name)}${toPascalCase(key)}`;
        generateStruct(val as Record<string, unknown>, childStructName);
        lines.push(`\t${fieldName} ${childStructName} \`json:"${key}"\``);
      } else {
        lines.push(`\t${fieldName} ${inferGoPrimitive(val)} \`json:"${key}"\``);
      }
    }

    lines.push('}\n');
    structs.set(name, lines.join('\n'));
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

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') || 'Field';
}

function singularize(str: string): string {
  if (str.endsWith('ies')) return str.slice(0, -3) + 'y';
  if (str.endsWith('es')) return str.slice(0, -2);
  if (str.endsWith('s')) return str.slice(0, -1);
  return str;
}
