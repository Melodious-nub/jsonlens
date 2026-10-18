import { JsonValue } from '../../../core/models/json-lens.model';
import { isInteger, resolveTypeName, singularize, toPascalCase } from './helpers';

/**
 * Generates C# models with System.Text.Json attributes.
 */
export function jsonToCSharp(json: JsonValue, rootName = 'Root'): string {
  if (json === null || typeof json !== 'object') {
    return `public class ${toPascalCase(rootName)}\n{\n    public ${inferCSharpPrimitive(json)} Value { get; set; }\n}\n`;
  }

  const classes: Map<string, string> = new Map();
  const usedNames = new Set<string>([toPascalCase(rootName)]);

  function generateClass(data: Record<string, unknown>, name: string): void {
    const className = toPascalCase(name);
    const lines: string[] = [`public class ${className}`, '{'];
    const entries = Object.entries(data);

    for (const [key, val] of entries) {
      const propName = toPascalCase(key, 'Property');

      lines.push(`    [JsonPropertyName("${key}")]`);
      if (val === null) {
        lines.push(`    public object? ${propName} { get; set; }\n`);
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          lines.push(`    public List<object> ${propName} { get; set; } = new();\n`);
        } else {
          const first = val[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const childClassName = resolveTypeName(singularize(key), className, usedNames);
            generateClass(first as Record<string, unknown>, childClassName);
            lines.push(`    public List<${childClassName}> ${propName} { get; set; } = new();\n`);
          } else {
            lines.push(`    public List<${inferCSharpPrimitive(first)}> ${propName} { get; set; } = new();\n`);
          }
        }
      } else if (typeof val === 'object') {
        const childClassName = resolveTypeName(key, className, usedNames);
        generateClass(val as Record<string, unknown>, childClassName);
        lines.push(`    public ${childClassName}? ${propName} { get; set; }\n`);
      } else {
        lines.push(`    public ${inferCSharpPrimitive(val)} ${propName} { get; set; }\n`);
      }
    }

    lines.push('}\n');
    classes.set(className, lines.join('\n'));
  }

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `using System.Collections.Generic;\n\npublic class ${toPascalCase(rootName)} : List<object> { }\n`;
    }
    const first = json[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const itemClassName = `${toPascalCase(rootName)}Item`;
      generateClass(first as Record<string, unknown>, itemClassName);
      const classDefs = Array.from(classes.values()).join('\n');
      return `using System.Text.Json.Serialization;\nusing System.Collections.Generic;\n\n${classDefs}\npublic class ${toPascalCase(rootName)} : List<${itemClassName}> { }\n`;
    }
    return `using System.Collections.Generic;\n\npublic class ${toPascalCase(rootName)} : List<${inferCSharpPrimitive(first)}> { }\n`;
  }

  generateClass(json as Record<string, unknown>, rootName);
  const classDefs = Array.from(classes.values()).join('\n');
  return `using System.Text.Json.Serialization;\nusing System.Collections.Generic;\n\n${classDefs}`;
}

function inferCSharpPrimitive(val: unknown): string {
  if (val === null) return 'object?';
  if (typeof val === 'string') return 'string';
  if (typeof val === 'number') {
    return isInteger(val) ? 'long' : 'double';
  }
  if (typeof val === 'boolean') return 'bool';
  return 'object';
}
