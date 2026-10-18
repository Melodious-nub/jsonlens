export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export interface ParseResult {
  readonly success: boolean;
  readonly data: JsonValue | null;
  readonly formatted: string;
  readonly minified: string;
}

export interface JsonError {
  readonly message: string;
  readonly line: number;
  readonly column: number;
  readonly position: number;
}

export interface JsonStats {
  readonly byteSize: number;
  readonly keyCount: number;
  readonly maxDepth: number;
  readonly arrayCount: number;
  readonly objectCount: number;
  readonly stringCount: number;
  readonly numberCount: number;
  readonly booleanCount: number;
  readonly nullCount: number;
}

export type IndentOption = '2-spaces' | '4-spaces' | 'tabs' | 'minified';
export type LensTab = 'code' | 'tree' | 'type' | 'diff';
export type ExportFormat = 'json' | 'pdf' | 'csv' | 'ts';
export type SortOrder = 'asc' | 'desc' | 'none';
export type TypeGenTarget = 'typescript' | 'zod' | 'go';

export type JsonNodeType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

export interface TreeNode {
  readonly id: string;
  readonly key: string;
  readonly path: string;
  readonly type: JsonNodeType;
  readonly value?: JsonPrimitive;
  readonly children?: TreeNode[];
  readonly childCount?: number;
  isExpanded?: boolean;
}

export type DiffChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DiffItem {
  readonly path: string;
  readonly type: DiffChangeType;
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
  readonly line?: number;
}
export interface DiffSummary {
  readonly added: number;
  readonly removed: number;
  readonly modified: number;
  readonly unchanged: number;
}
export interface RouteMetadata {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string;
  readonly ogImage?: string;
  readonly keywords?: string[];
  readonly softwareType?: string;
}
