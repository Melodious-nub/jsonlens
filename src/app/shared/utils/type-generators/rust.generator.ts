import { JsonValue } from '../../../core/models/json-lens.model';
import { isInteger, resolveTypeName, singularize, toPascalCase, toSnakeCase } from './helpers';

const RUST_KEYWORDS = new Set([
  'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern', 'false',
  'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut',
  'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct', 'super', 'trait',
  'true', 'type', 'unsafe', 'use', 'where', 'while', 'async', 'await', 'dyn',
]);

/**
 * Generates Rust Serde struct definitions from any valid JSON object or array.
 */
export function jsonToRust(json: JsonValue, rootName = 'Root'): string {
  if (json === null || typeof json !== 'object') {
    return `pub type ${toPascalCase(rootName)} = ${inferRustPrimitive(json)};\n`;
  }

  const structs: Map<string, string> = new Map();
  const usedNames = new Set<string>([toPascalCase(rootName)]);

  function generateStruct(data: Record<string, unknown>, name: string): void {
    const structName = toPascalCase(name);
    const lines: string[] = [
      '#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]',
      `pub struct ${structName} {`,
    ];

    for (const [key, val] of Object.entries(data)) {
      const rawSnake = toSnakeCase(key);
      const fieldName = RUST_KEYWORDS.has(rawSnake) ? `r#${rawSnake}` : rawSnake;

      lines.push(`    #[serde(rename = "${key}")]`);

      if (val === null) {
        lines.push(`    pub ${fieldName}: Option<serde_json::Value>,`);
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          lines.push(`    pub ${fieldName}: Vec<serde_json::Value>,`);
        } else {
          const first = val[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const childStructName = resolveTypeName(singularize(key), structName, usedNames);
            generateStruct(first as Record<string, unknown>, childStructName);
            lines.push(`    pub ${fieldName}: Vec<${childStructName}>,`);
          } else {
            lines.push(`    pub ${fieldName}: Vec<${inferRustPrimitive(first)}>,`);
          }
        }
      } else if (typeof val === 'object') {
        const childStructName = resolveTypeName(key, structName, usedNames);
        generateStruct(val as Record<string, unknown>, childStructName);
        lines.push(`    pub ${fieldName}: Option<${childStructName}>,`);
      } else {
        lines.push(`    pub ${fieldName}: ${inferRustPrimitive(val)},`);
      }
    }

    lines.push('}\n');
    structs.set(structName, lines.join('\n'));
  }

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `pub type ${toPascalCase(rootName)} = Vec<serde_json::Value>;\n`;
    }
    const first = json[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const itemStructName = `${toPascalCase(rootName)}Item`;
      generateStruct(first as Record<string, unknown>, itemStructName);
      const structDefs = Array.from(structs.values()).join('\n');
      return `use serde::{Deserialize, Serialize};\n\n${structDefs}\npub type ${toPascalCase(rootName)} = Vec<${itemStructName}>;\n`;
    }
    return `pub type ${toPascalCase(rootName)} = Vec<${inferRustPrimitive(first)}>;\n`;
  }

  generateStruct(json as Record<string, unknown>, rootName);
  const structDefs = Array.from(structs.values()).join('\n');
  return `use serde::{Deserialize, Serialize};\n\n${structDefs}`;
}

function inferRustPrimitive(val: unknown): string {
  if (val === null) return 'Option<serde_json::Value>';
  if (typeof val === 'string') return 'String';
  if (typeof val === 'number') {
    return isInteger(val) ? 'i64' : 'f64';
  }
  if (typeof val === 'boolean') return 'bool';
  return 'serde_json::Value';
}
