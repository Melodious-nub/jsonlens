import { JsonValue } from '../../../core/models/json-lens.model';
import { isInteger, resolveTypeName, singularize, toCamelCase, toPascalCase } from './helpers';

/**
 * Generates Java POJO classes with Jackson annotations and getters/setters.
 */
export function jsonToJava(json: JsonValue, rootName = 'Root'): string {
  if (json === null || typeof json !== 'object') {
    return `public class ${toPascalCase(rootName)} {\n    private ${inferJavaPrimitive(json)} value;\n    public ${inferJavaPrimitive(json)} getValue() { return value; }\n    public void setValue(${inferJavaPrimitive(json)} value) { this.value = value; }\n}\n`;
  }

  const classes: Map<string, string> = new Map();
  const usedNames = new Set<string>([toPascalCase(rootName)]);

  function generateClass(data: Record<string, unknown>, name: string): void {
    const className = toPascalCase(name);
    const fields: { name: string; type: string; jsonKey: string }[] = [];

    for (const [key, val] of Object.entries(data)) {
      const fieldName = toCamelCase(key);

      if (val === null) {
        fields.push({ name: fieldName, type: 'Object', jsonKey: key });
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          fields.push({ name: fieldName, type: 'List<Object>', jsonKey: key });
        } else {
          const first = val[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const childClassName = resolveTypeName(singularize(key), className, usedNames);
            generateClass(first as Record<string, unknown>, childClassName);
            fields.push({ name: fieldName, type: `List<${childClassName}>`, jsonKey: key });
          } else {
            fields.push({ name: fieldName, type: `List<${inferJavaPrimitive(first)}>`, jsonKey: key });
          }
        }
      } else if (typeof val === 'object') {
        const childClassName = resolveTypeName(key, className, usedNames);
        generateClass(val as Record<string, unknown>, childClassName);
        fields.push({ name: fieldName, type: childClassName, jsonKey: key });
      } else {
        fields.push({ name: fieldName, type: inferJavaPrimitive(val), jsonKey: key });
      }
    }

    const lines: string[] = [`public class ${className} {`];

    // Field declarations
    for (const field of fields) {
      lines.push(`    @JsonProperty("${field.jsonKey}")`);
      lines.push(`    private ${field.type} ${field.name};`);
    }

    if (fields.length > 0) {
      lines.push('');
      // Getters & Setters
      for (const field of fields) {
        const cap = field.name.charAt(0).toUpperCase() + field.name.slice(1);
        lines.push(`    public ${field.type} get${cap}() {`);
        lines.push(`        return this.${field.name};`);
        lines.push('    }');
        lines.push('');
        lines.push(`    public void set${cap}(${field.type} ${field.name}) {`);
        lines.push(`        this.${field.name} = ${field.name};`);
        lines.push('    }');
        lines.push('');
      }
    }

    lines.push('}\n');
    classes.set(className, lines.join('\n'));
  }

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `import java.util.List;\n\npublic class ${toPascalCase(rootName)} {\n    private List<Object> items;\n}\n`;
    }
    const first = json[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const itemClassName = `${toPascalCase(rootName)}Item`;
      generateClass(first as Record<string, unknown>, itemClassName);
      const classDefs = Array.from(classes.values()).join('\n');
      return `import com.fasterxml.jackson.annotation.JsonProperty;\nimport java.util.List;\n\n${classDefs}\npublic class ${toPascalCase(rootName)} {\n    private List<${itemClassName}> items;\n    public List<${itemClassName}> getItems() { return items; }\n    public void setItems(List<${itemClassName}> items) { this.items = items; }\n}\n`;
    }
    return `import java.util.List;\n\npublic class ${toPascalCase(rootName)} {\n    private List<${inferJavaPrimitive(first)}> items;\n}\n`;
  }

  generateClass(json as Record<string, unknown>, rootName);
  const classDefs = Array.from(classes.values()).join('\n');
  return `import com.fasterxml.jackson.annotation.JsonProperty;\nimport java.util.List;\n\n${classDefs}`;
}

function inferJavaPrimitive(val: unknown): string {
  if (val === null) return 'Object';
  if (typeof val === 'string') return 'String';
  if (typeof val === 'number') {
    return isInteger(val) ? 'Long' : 'Double';
  }
  if (typeof val === 'boolean') return 'Boolean';
  return 'Object';
}
