import { JsonValue } from '../../../core/models/json-lens.model';
import { isInteger, toPascalCase } from './helpers';

interface JsonSchemaNode {
  type?: string | string[];
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  items?: JsonSchemaNode;
  anyOf?: JsonSchemaNode[];
  additionalProperties?: boolean;
}

function buildSchemaNode(value: JsonValue): JsonSchemaNode {
  if (value === null) {
    return { type: 'null' };
  }

  if (typeof value === 'string') {
    return { type: 'string' };
  }

  if (typeof value === 'boolean') {
    return { type: 'boolean' };
  }

  if (typeof value === 'number') {
    return { type: isInteger(value) ? 'integer' : 'number' };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: 'array', items: {} };
    }

    const itemSchemas = new Map<string, JsonSchemaNode>();
    for (const item of value) {
      const nodeSchema = buildSchemaNode(item);
      itemSchemas.set(JSON.stringify(nodeSchema), nodeSchema);
    }

    const uniqueSchemas = Array.from(itemSchemas.values());
    if (uniqueSchemas.length === 1) {
      return {
        type: 'array',
        items: uniqueSchemas[0],
      };
    }

    return {
      type: 'array',
      items: {
        anyOf: uniqueSchemas,
      },
    };
  }

  const entries = Object.entries(value);
  const properties: Record<string, JsonSchemaNode> = {};
  const required: string[] = [];

  for (const [key, propVal] of entries) {
    properties[key] = buildSchemaNode(propVal);
    required.push(key);
  }

  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };
}

/**
 * Generates a formatted JSON Schema (Draft 2020-12) document from any valid JSON value.
 */
export function jsonToJsonSchema(json: JsonValue, rootName = 'Root'): string {
  const rootSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: toPascalCase(rootName, 'Root'),
    ...buildSchemaNode(json),
  };

  return `${JSON.stringify(rootSchema, null, 2)}\n`;
}

