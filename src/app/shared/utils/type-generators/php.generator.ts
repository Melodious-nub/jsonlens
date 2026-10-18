import { JsonValue } from '../../../core/models/json-lens.model';
import { isInteger, resolveTypeName, singularize, toCamelCase, toPascalCase } from './helpers';

/**
 * Generates modern PHP 8.2+ typed classes with constructor promotion & JsonSerializable.
 */
export function jsonToPhp(json: JsonValue, rootName = 'Root'): string {
  if (json === null || typeof json !== 'object') {
    return `<?php\n\ndeclare(strict_types=1);\n\n// Primitive value: ${inferPhpPrimitive(json)}\n`;
  }

  const classes: Map<string, string> = new Map();
  const usedNames = new Set<string>([toPascalCase(rootName)]);

  function generateClass(data: Record<string, unknown>, name: string): void {
    const className = toPascalCase(name);
    const fields: {
      key: string;
      propName: string;
      phpType: string;
      isObject: boolean;
      isArray: boolean;
      childType?: string;
      isNullable: boolean;
    }[] = [];

    for (const [key, val] of Object.entries(data)) {
      const propName = toCamelCase(key);

      if (val === null) {
        fields.push({
          key,
          propName,
          phpType: 'mixed',
          isObject: false,
          isArray: false,
          isNullable: true,
        });
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          fields.push({
            key,
            propName,
            phpType: 'array',
            isObject: false,
            isArray: true,
            childType: 'mixed',
            isNullable: false,
          });
        } else {
          const first = val[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const childClassName = resolveTypeName(singularize(key), className, usedNames);
            generateClass(first as Record<string, unknown>, childClassName);
            fields.push({
              key,
              propName,
              phpType: 'array',
              isObject: false,
              isArray: true,
              childType: childClassName,
              isNullable: false,
            });
          } else {
            fields.push({
              key,
              propName,
              phpType: 'array',
              isObject: false,
              isArray: true,
              childType: inferPhpPrimitive(first),
              isNullable: false,
            });
          }
        }
      } else if (typeof val === 'object') {
        const childClassName = resolveTypeName(key, className, usedNames);
        generateClass(val as Record<string, unknown>, childClassName);
        fields.push({
          key,
          propName,
          phpType: `?${childClassName}`,
          isObject: true,
          isArray: false,
          childType: childClassName,
          isNullable: true,
        });
      } else {
        fields.push({
          key,
          propName,
          phpType: inferPhpPrimitive(val),
          isObject: false,
          isArray: false,
          isNullable: false,
        });
      }
    }

    const lines: string[] = [
      `class ${className} implements \\JsonSerializable`,
      '{',
      '    public function __construct(',
    ];

    for (const f of fields) {
      const defaultVal = f.isNullable || f.phpType.startsWith('?') ? ' = null' : '';
      lines.push(`        public ${f.phpType} $${f.propName}${defaultVal},`);
    }

    lines.push('    ) {}');
    lines.push('');

    // fromArray
    lines.push('    public static function fromArray(array $data): self');
    lines.push('    {');
    lines.push('        return new self(');
    for (const f of fields) {
      if (f.isObject && f.childType) {
        lines.push(`            ${f.propName}: isset($data['${f.key}']) && is_array($data['${f.key}']) ? ${f.childType}::fromArray($data['${f.key}']) : null,`);
      } else if (f.isArray && f.childType && f.childType !== 'mixed' && !['int', 'float', 'string', 'bool'].includes(f.childType)) {
        lines.push(`            ${f.propName}: array_map(fn($item) => ${f.childType}::fromArray((array)$item), (array)($data['${f.key}'] ?? [])),`);
      } else if (f.phpType === 'int') {
        lines.push(`            ${f.propName}: (int) ($data['${f.key}'] ?? 0),`);
      } else if (f.phpType === 'float') {
        lines.push(`            ${f.propName}: (float) ($data['${f.key}'] ?? 0.0),`);
      } else if (f.phpType === 'string') {
        lines.push(`            ${f.propName}: (string) ($data['${f.key}'] ?? ''),`);
      } else if (f.phpType === 'bool') {
        lines.push(`            ${f.propName}: (bool) ($data['${f.key}'] ?? false),`);
      } else if (f.phpType === 'array') {
        lines.push(`            ${f.propName}: (array) ($data['${f.key}'] ?? []),`);
      } else {
        lines.push(`            ${f.propName}: $data['${f.key}'] ?? null,`);
      }
    }
    lines.push('        );');
    lines.push('    }');
    lines.push('');

    // jsonSerialize
    lines.push('    public function jsonSerialize(): array');
    lines.push('    {');
    lines.push('        return [');
    for (const f of fields) {
      if (f.isObject) {
        lines.push(`            '${f.key}' => $this->${f.propName}?->jsonSerialize(),`);
      } else {
        lines.push(`            '${f.key}' => $this->${f.propName},`);
      }
    }
    lines.push('        ];');
    lines.push('    }');
    lines.push('}\n');

    classes.set(className, lines.join('\n'));
  }

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `<?php\n\ndeclare(strict_types=1);\n\n// Array of items: mixed[]\n`;
    }
    const first = json[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const itemClassName = `${toPascalCase(rootName)}Item`;
      generateClass(first as Record<string, unknown>, itemClassName);
      const classDefs = Array.from(classes.values()).join('\n');
      return `<?php\n\ndeclare(strict_types=1);\n\n${classDefs}\n// Root: ${itemClassName}[]\n`;
    }
    return `<?php\n\ndeclare(strict_types=1);\n\n// Root: ${inferPhpPrimitive(first)}[]\n`;
  }

  generateClass(json as Record<string, unknown>, rootName);
  const classDefs = Array.from(classes.values()).join('\n');
  return `<?php\n\ndeclare(strict_types=1);\n\n${classDefs}`;
}

function inferPhpPrimitive(val: unknown): string {
  if (val === null) return 'mixed';
  if (typeof val === 'string') return 'string';
  if (typeof val === 'number') {
    return isInteger(val) ? 'int' : 'float';
  }
  if (typeof val === 'boolean') return 'bool';
  return 'mixed';
}
