import { JsonValue } from '../../../core/models/json-lens.model';

/**
 * Generates Zod schema validation code from any valid JSON object or array.
 */
export function jsonToZod(json: JsonValue, rootName = 'root'): string {
  if (json === null || typeof json !== 'object') {
    return `import { z } from 'zod';\n\nexport const ${toCamelCase(rootName)}Schema = ${inferPrimitiveZod(json)};\nexport type ${toPascalCase(rootName)} = z.infer<typeof ${toCamelCase(rootName)}Schema>;\n`;
  }

  const schemas: Map<string, string> = new Map();

  function generateSchema(data: Record<string, unknown>, name: string): void {
    const lines: string[] = [`export const ${toCamelCase(name)}Schema = z.object({`];

    for (const [key, val] of Object.entries(data)) {
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);

      if (val === null) {
        lines.push(`  ${safeKey}: z.null(),`);
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          lines.push(`  ${safeKey}: z.array(z.unknown()),`);
        } else {
          const first = val[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const childSchemaName = `${toCamelCase(name)}${toPascalCase(singularize(key))}`;
            generateSchema(first as Record<string, unknown>, childSchemaName);
            lines.push(`  ${safeKey}: z.array(${childSchemaName}Schema),`);
          } else {
            lines.push(`  ${safeKey}: z.array(${inferPrimitiveZod(first)}),`);
          }
        }
      } else if (typeof val === 'object') {
        const childSchemaName = `${toCamelCase(name)}${toPascalCase(key)}`;
        generateSchema(val as Record<string, unknown>, childSchemaName);
        lines.push(`  ${safeKey}: ${childSchemaName}Schema,`);
      } else {
        lines.push(`  ${safeKey}: ${inferPrimitiveZod(val)},`);
      }
    }

    lines.push('});');
    lines.push(`export type ${toPascalCase(name)} = z.infer<typeof ${toCamelCase(name)}Schema>;\n`);
    schemas.set(name, lines.join('\n'));
  }

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `import { z } from 'zod';\n\nexport const ${toCamelCase(rootName)}Schema = z.array(z.unknown());\nexport type ${toPascalCase(rootName)} = z.infer<typeof ${toCamelCase(rootName)}Schema>;\n`;
    }
    const first = json[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const itemSchemaName = `${toCamelCase(rootName)}Item`;
      generateSchema(first as Record<string, unknown>, itemSchemaName);
      const schemaDefinitions = Array.from(schemas.values()).join('\n');
      return `import { z } from 'zod';\n\n${schemaDefinitions}\nexport const ${toCamelCase(rootName)}Schema = z.array(${itemSchemaName}Schema);\nexport type ${toPascalCase(rootName)} = z.infer<typeof ${toCamelCase(rootName)}Schema>;\n`;
    }
    return `import { z } from 'zod';\n\nexport const ${toCamelCase(rootName)}Schema = z.array(${inferPrimitiveZod(first)});\nexport type ${toPascalCase(rootName)} = z.infer<typeof ${toCamelCase(rootName)}Schema>;\n`;
  }

  generateSchema(json as Record<string, unknown>, rootName);
  const schemaDefinitions = Array.from(schemas.values()).join('\n');
  return `import { z } from 'zod';\n\n${schemaDefinitions}`;
}

function inferPrimitiveZod(val: unknown): string {
  if (val === null) return 'z.null()';
  if (typeof val === 'string') return 'z.string()';
  if (typeof val === 'number') return 'z.number()';
  if (typeof val === 'boolean') return 'z.boolean()';
  return 'z.unknown()';
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') || 'Schema';
}

function singularize(str: string): string {
  if (str.endsWith('ies')) return str.slice(0, -3) + 'y';
  if (str.endsWith('es')) return str.slice(0, -2);
  if (str.endsWith('s')) return str.slice(0, -1);
  return str;
}
