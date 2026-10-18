import { JsonValue } from '../../../core/models/json-lens.model';
import { isInteger, resolveTypeName, singularize, toCamelCase, toPascalCase } from './helpers';

const SWIFT_KEYWORDS = new Set([
  'associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate', 'func',
  'import', 'init', 'inout', 'internal', 'let', 'open', 'operator', 'private',
  'precedencegroup', 'protocol', 'public', 'rethrows', 'static', 'struct', 'subscript',
  'typealias', 'var', 'break', 'case', 'catch', 'continue', 'default', 'defer',
  'do', 'else', 'fallthrough', 'for', 'guard', 'if', 'in', 'repeat', 'return',
  'throw', 'switch', 'where', 'while', 'as', 'Any', 'false', 'is', 'nil', 'self',
  'Self', 'super', 'true', 'try',
]);

/**
 * Generates Swift Codable structs from any valid JSON object or array.
 */
export function jsonToSwift(json: JsonValue, rootName = 'Root'): string {
  if (json === null || typeof json !== 'object') {
    return `public typealias ${toPascalCase(rootName)} = ${inferSwiftPrimitive(json)}\n`;
  }

  const structs: Map<string, string> = new Map();
  const usedNames = new Set<string>([toPascalCase(rootName)]);

  function generateStruct(data: Record<string, unknown>, name: string): void {
    const structName = toPascalCase(name);
    const fields: { key: string; propName: string; swiftType: string; isReserved: boolean }[] = [];

    for (const [key, val] of Object.entries(data)) {
      const camel = toCamelCase(key);
      const isReserved = SWIFT_KEYWORDS.has(camel);
      const propName = isReserved ? `\`${camel}\`` : camel;

      if (val === null) {
        fields.push({ key, propName, swiftType: 'String?', isReserved });
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          fields.push({ key, propName, swiftType: '[String]', isReserved });
        } else {
          const first = val[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const childStructName = resolveTypeName(singularize(key), structName, usedNames);
            generateStruct(first as Record<string, unknown>, childStructName);
            fields.push({ key, propName, swiftType: `[${childStructName}]`, isReserved });
          } else {
            fields.push({ key, propName, swiftType: `[${inferSwiftPrimitive(first)}]`, isReserved });
          }
        }
      } else if (typeof val === 'object') {
        const childStructName = resolveTypeName(key, structName, usedNames);
        generateStruct(val as Record<string, unknown>, childStructName);
        fields.push({ key, propName, swiftType: `${childStructName}?`, isReserved });
      } else {
        fields.push({ key, propName, swiftType: inferSwiftPrimitive(val), isReserved });
      }
    }

    const lines: string[] = [`public struct ${structName}: Codable {`];

    // Properties
    for (const f of fields) {
      lines.push(`    public let ${f.propName}: ${f.swiftType}`);
    }

    // CodingKeys
    if (fields.length > 0) {
      lines.push('');
      lines.push('    enum CodingKeys: String, CodingKey {');
      for (const f of fields) {
        lines.push(`        case ${f.propName} = "${f.key}"`);
      }
      lines.push('    }');
    }

    lines.push('}\n');
    structs.set(structName, lines.join('\n'));
  }

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `public typealias ${toPascalCase(rootName)} = [String]\n`;
    }
    const first = json[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const itemStructName = `${toPascalCase(rootName)}Item`;
      generateStruct(first as Record<string, unknown>, itemStructName);
      const structDefs = Array.from(structs.values()).join('\n');
      return `import Foundation\n\n${structDefs}\npublic typealias ${toPascalCase(rootName)} = [${itemStructName}]\n`;
    }
    return `import Foundation\n\npublic typealias ${toPascalCase(rootName)} = [${inferSwiftPrimitive(first)}]\n`;
  }

  generateStruct(json as Record<string, unknown>, rootName);
  const structDefs = Array.from(structs.values()).join('\n');
  return `import Foundation\n\n${structDefs}`;
}

function inferSwiftPrimitive(val: unknown): string {
  if (val === null) return 'String?';
  if (typeof val === 'string') return 'String';
  if (typeof val === 'number') {
    return isInteger(val) ? 'Int' : 'Double';
  }
  if (typeof val === 'boolean') return 'Bool';
  return 'String';
}
