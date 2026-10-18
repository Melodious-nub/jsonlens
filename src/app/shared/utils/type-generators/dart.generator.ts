import { JsonValue } from '../../../core/models/json-lens.model';
import { isInteger, resolveTypeName, singularize, toCamelCase, toPascalCase } from './helpers';

/**
 * Generates Dart / Flutter model classes with fromJson and toJson methods.
 */
export function jsonToDart(json: JsonValue, rootName = 'Root'): string {
  if (json === null || typeof json !== 'object') {
    return `typedef ${toPascalCase(rootName)} = ${inferDartPrimitive(json)};\n`;
  }

  const classes: Map<string, string> = new Map();
  const usedNames = new Set<string>([toPascalCase(rootName)]);

  function generateClass(data: Record<string, unknown>, name: string): void {
    const className = toPascalCase(name);
    const fields: {
      key: string;
      fieldName: string;
      type: string;
      isObject: boolean;
      isArray: boolean;
      childType?: string;
      isNullable: boolean;
    }[] = [];

    for (const [key, val] of Object.entries(data)) {
      const fieldName = toCamelCase(key);

      if (val === null) {
        fields.push({
          key,
          fieldName,
          type: 'dynamic',
          isObject: false,
          isArray: false,
          isNullable: true,
        });
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          fields.push({
            key,
            fieldName,
            type: 'List<dynamic>',
            isObject: false,
            isArray: true,
            childType: 'dynamic',
            isNullable: false,
          });
        } else {
          const first = val[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const childClassName = resolveTypeName(singularize(key), className, usedNames);
            generateClass(first as Record<string, unknown>, childClassName);
            fields.push({
              key,
              fieldName,
              type: `List<${childClassName}>`,
              isObject: false,
              isArray: true,
              childType: childClassName,
              isNullable: false,
            });
          } else {
            const primType = inferDartPrimitive(first);
            fields.push({
              key,
              fieldName,
              type: `List<${primType}>`,
              isObject: false,
              isArray: true,
              childType: primType,
              isNullable: false,
            });
          }
        }
      } else if (typeof val === 'object') {
        const childClassName = resolveTypeName(key, className, usedNames);
        generateClass(val as Record<string, unknown>, childClassName);
        fields.push({
          key,
          fieldName,
          type: `${childClassName}?`,
          isObject: true,
          isArray: false,
          childType: childClassName,
          isNullable: true,
        });
      } else {
        fields.push({
          key,
          fieldName,
          type: inferDartPrimitive(val),
          isObject: false,
          isArray: false,
          isNullable: false,
        });
      }
    }

    const lines: string[] = [`class ${className} {`];

    // Properties
    for (const f of fields) {
      lines.push(`  final ${f.type} ${f.fieldName};`);
    }

    // Constructor
    if (fields.length > 0) {
      lines.push('');
      lines.push(`  ${className}({`);
      for (const f of fields) {
        const requiredPrefix = f.isNullable || f.type.endsWith('?') ? '' : 'required ';
        lines.push(`    ${requiredPrefix}this.${f.fieldName},`);
      }
      lines.push('  });');
    } else {
      lines.push(`  ${className}();`);
    }

    // fromJson
    lines.push('');
    lines.push(`  factory ${className}.fromJson(Map<String, dynamic> json) {`);
    lines.push(`    return ${className}(`);
    for (const f of fields) {
      if (f.isObject && f.childType) {
        lines.push(
          `      ${f.fieldName}: json['${f.key}'] != null ? ${f.childType}.fromJson(json['${f.key}'] as Map<String, dynamic>) : null,`
        );
      } else if (f.isArray && f.childType) {
        if (f.childType === 'dynamic') {
          lines.push(
            `      ${f.fieldName}: json['${f.key}'] != null ? List<dynamic>.from(json['${f.key}'] as List) : [],`
          );
        } else if (['int', 'double', 'String', 'bool'].includes(f.childType)) {
          lines.push(
            `      ${f.fieldName}: (json['${f.key}'] as List<dynamic>?)?.map((e) => e as ${f.childType}).toList() ?? [],`
          );
        } else {
          lines.push(
            `      ${f.fieldName}: (json['${f.key}'] as List<dynamic>?)?.map((e) => ${f.childType}.fromJson(e as Map<String, dynamic>)).toList() ?? [],`
          );
        }
      } else if (f.type === 'dynamic') {
        lines.push(`      ${f.fieldName}: json['${f.key}'],`);
      } else {
        lines.push(`      ${f.fieldName}: json['${f.key}'] as ${f.type},`);
      }
    }
    lines.push('    );');
    lines.push('  }');

    // toJson
    lines.push('');
    lines.push('  Map<String, dynamic> toJson() {');
    lines.push('    return {');
    for (const f of fields) {
      if (f.isObject) {
        lines.push(`      '${f.key}': ${f.fieldName}?.toJson(),`);
      } else if (f.isArray && f.childType && !['int', 'double', 'String', 'bool', 'dynamic'].includes(f.childType)) {
        lines.push(`      '${f.key}': ${f.fieldName}.map((e) => e.toJson()).toList(),`);
      } else {
        lines.push(`      '${f.key}': ${f.fieldName},`);
      }
    }
    lines.push('    };');
    lines.push('  }');

    lines.push('}\n');
    classes.set(className, lines.join('\n'));
  }

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `typedef ${toPascalCase(rootName)} = List<dynamic>;\n`;
    }
    const first = json[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const itemClassName = `${toPascalCase(rootName)}Item`;
      generateClass(first as Record<string, unknown>, itemClassName);
      const classDefs = Array.from(classes.values()).join('\n');
      return `${classDefs}\ntypedef ${toPascalCase(rootName)} = List<${itemClassName}>;\n`;
    }
    return `typedef ${toPascalCase(rootName)} = List<${inferDartPrimitive(first)}>;\n`;
  }

  generateClass(json as Record<string, unknown>, rootName);
  return Array.from(classes.values()).join('\n');
}

function inferDartPrimitive(val: unknown): string {
  if (val === null) return 'dynamic';
  if (typeof val === 'string') return 'String';
  if (typeof val === 'number') {
    return isInteger(val) ? 'int' : 'double';
  }
  if (typeof val === 'boolean') return 'bool';
  return 'dynamic';
}
