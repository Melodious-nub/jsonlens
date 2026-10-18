import { JsonValue } from '../../../core/models/json-lens.model';
import { isInteger, resolveTypeName, singularize, toPascalCase, toSnakeCase } from './helpers';

const PYTHON_KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if',
  'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
  'return', 'try', 'while', 'with', 'yield', 'id', 'type', 'list', 'dict', 'set',
]);

/**
 * Generates Pydantic v2 / Python models from any valid JSON object or array.
 */
export function jsonToPython(json: JsonValue, rootName = 'Root'): string {
  if (json === null || typeof json !== 'object') {
    return `from typing import Any, Optional\n\n${toPascalCase(rootName)} = ${inferPythonPrimitive(json)}\n`;
  }

  const models: Map<string, string> = new Map();
  const usedNames = new Set<string>([toPascalCase(rootName)]);

  function generateModel(data: Record<string, unknown>, name: string): void {
    const pascalName = toPascalCase(name);
    const lines: string[] = [`class ${pascalName}(BaseModel):`];
    const entries = Object.entries(data);

    if (entries.length === 0) {
      lines.push('    pass');
      lines.push('');
      models.set(pascalName, lines.join('\n'));
      return;
    }

    for (const [key, val] of entries) {
      const snakeKey = toSnakeCase(key);
      const isReserved = PYTHON_KEYWORDS.has(snakeKey);
      const fieldProp = isReserved ? `${snakeKey}_` : snakeKey;
      const needsAlias = fieldProp !== key;

      if (val === null) {
        if (needsAlias) {
          lines.push(`    ${fieldProp}: Optional[Any] = Field(None, alias='${key}')`);
        } else {
          lines.push(`    ${fieldProp}: Optional[Any] = None`);
        }
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          if (needsAlias) {
            lines.push(`    ${fieldProp}: List[Any] = Field(default_factory=list, alias='${key}')`);
          } else {
            lines.push(`    ${fieldProp}: List[Any] = Field(default_factory=list)`);
          }
        } else {
          const first = val[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const childModelName = resolveTypeName(singularize(key), pascalName, usedNames);
            generateModel(first as Record<string, unknown>, childModelName);
            if (needsAlias) {
              lines.push(`    ${fieldProp}: List[${childModelName}] = Field(alias='${key}')`);
            } else {
              lines.push(`    ${fieldProp}: List[${childModelName}]`);
            }
          } else {
            const primType = inferPythonPrimitive(first);
            if (needsAlias) {
              lines.push(`    ${fieldProp}: List[${primType}] = Field(alias='${key}')`);
            } else {
              lines.push(`    ${fieldProp}: List[${primType}]`);
            }
          }
        }
      } else if (typeof val === 'object') {
        const childModelName = resolveTypeName(key, pascalName, usedNames);
        generateModel(val as Record<string, unknown>, childModelName);
        if (needsAlias) {
          lines.push(`    ${fieldProp}: Optional[${childModelName}] = Field(None, alias='${key}')`);
        } else {
          lines.push(`    ${fieldProp}: Optional[${childModelName}] = None`);
        }
      } else {
        const primType = inferPythonPrimitive(val);
        if (needsAlias) {
          lines.push(`    ${fieldProp}: ${primType} = Field(alias='${key}')`);
        } else {
          lines.push(`    ${fieldProp}: ${primType}`);
        }
      }
    }

    lines.push('');
    models.set(pascalName, lines.join('\n'));
  }

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `from typing import Any, List\n\n${toPascalCase(rootName)} = List[Any]\n`;
    }
    const first = json[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const itemModelName = `${toPascalCase(rootName)}Item`;
      generateModel(first as Record<string, unknown>, itemModelName);
      const modelDefs = Array.from(models.values()).join('\n');
      return `from __future__ import annotations\nfrom typing import Any, List, Optional\nfrom pydantic import BaseModel, Field\n\n\n${modelDefs}\n\n${toPascalCase(rootName)} = List[${itemModelName}]\n`;
    }
    return `from typing import List\n\n${toPascalCase(rootName)} = List[${inferPythonPrimitive(first)}]\n`;
  }

  generateModel(json as Record<string, unknown>, rootName);
  const modelDefs = Array.from(models.values()).join('\n');
  return `from __future__ import annotations\nfrom typing import Any, List, Optional\nfrom pydantic import BaseModel, Field\n\n\n${modelDefs}`;
}

function inferPythonPrimitive(val: unknown): string {
  if (val === null) return 'Optional[Any]';
  if (typeof val === 'string') return 'str';
  if (typeof val === 'number') {
    return isInteger(val) ? 'int' : 'float';
  }
  if (typeof val === 'boolean') return 'bool';
  return 'Any';
}
