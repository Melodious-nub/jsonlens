import { JsonValue } from '../../../core/models/json-lens.model';
import { isInteger, resolveTypeName, singularize, toCamelCase, toPascalCase } from './helpers';

/**
 * Generates Kotlin @Serializable data classes from any valid JSON object or array.
 */
export function jsonToKotlin(json: JsonValue, rootName = 'Root'): string {
  if (json === null || typeof json !== 'object') {
    return `typealias ${toPascalCase(rootName)} = ${inferKotlinPrimitive(json)}\n`;
  }

  const dataClasses: Map<string, string> = new Map();
  const usedNames = new Set<string>([toPascalCase(rootName)]);

  function generateDataClass(data: Record<string, unknown>, name: string): void {
    const className = toPascalCase(name);
    const lines: string[] = ['@Serializable', `data class ${className}(`];
    const entries = Object.entries(data);

    if (entries.length === 0) {
      lines.push(')');
      dataClasses.set(className, lines.join('\n'));
      return;
    }

    entries.forEach(([key, val], index) => {
      const fieldName = toCamelCase(key);
      const isLast = index === entries.length - 1;
      const comma = isLast ? '' : ',';

      if (val === null) {
        lines.push(`    @SerialName("${key}")`);
        lines.push(`    val ${fieldName}: Any? = null${comma}`);
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          lines.push(`    @SerialName("${key}")`);
          lines.push(`    val ${fieldName}: List<Any> = emptyList()${comma}`);
        } else {
          const first = val[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const childClassName = resolveTypeName(singularize(key), className, usedNames);
            generateDataClass(first as Record<string, unknown>, childClassName);
            lines.push(`    @SerialName("${key}")`);
            lines.push(`    val ${fieldName}: List<${childClassName}>${comma}`);
          } else {
            lines.push(`    @SerialName("${key}")`);
            lines.push(`    val ${fieldName}: List<${inferKotlinPrimitive(first)}>${comma}`);
          }
        }
      } else if (typeof val === 'object') {
        const childClassName = resolveTypeName(key, className, usedNames);
        generateDataClass(val as Record<string, unknown>, childClassName);
        lines.push(`    @SerialName("${key}")`);
        lines.push(`    val ${fieldName}: ${childClassName}? = null${comma}`);
      } else {
        lines.push(`    @SerialName("${key}")`);
        lines.push(`    val ${fieldName}: ${inferKotlinPrimitive(val)}${comma}`);
      }
    });

    lines.push(')\n');
    dataClasses.set(className, lines.join('\n'));
  }

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `typealias ${toPascalCase(rootName)} = List<Any>\n`;
    }
    const first = json[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const itemClassName = `${toPascalCase(rootName)}Item`;
      generateDataClass(first as Record<string, unknown>, itemClassName);
      const classDefs = Array.from(dataClasses.values()).join('\n');
      return `import kotlinx.serialization.Serializable\nimport kotlinx.serialization.SerialName\n\n${classDefs}\ntypealias ${toPascalCase(rootName)} = List<${itemClassName}>\n`;
    }
    return `typealias ${toPascalCase(rootName)} = List<${inferKotlinPrimitive(first)}>\n`;
  }

  generateDataClass(json as Record<string, unknown>, rootName);
  const classDefs = Array.from(dataClasses.values()).join('\n');
  return `import kotlinx.serialization.Serializable\nimport kotlinx.serialization.SerialName\n\n${classDefs}`;
}

function inferKotlinPrimitive(val: unknown): string {
  if (val === null) return 'Any?';
  if (typeof val === 'string') return 'String';
  if (typeof val === 'number') {
    return isInteger(val) ? 'Long' : 'Double';
  }
  if (typeof val === 'boolean') return 'Boolean';
  return 'Any';
}
