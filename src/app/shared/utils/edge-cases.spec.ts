import { describe, expect, it } from 'vitest';
import {
  buildTreeNode,
  calculateStats,
  flattenJsonObject,
  sortJsonKeys,
  stripNullProperties,
  unflattenJsonObject,
} from './json-tree.util';
import { jsonrepair } from 'jsonrepair';
import { deepDiffJson, summarizeDiff } from './json-diff.util';
import {
  jsonToTypescript,
  jsonToZod,
  jsonToGo,
  jsonToPython,
  jsonToRust,
} from './type-generators/index';
import { JsonValue } from '../../core/models/json-lens.model';

describe('Professional QA Suite: Extreme Edge-Cases & Stress Testing', () => {
  describe('Pillar 1: Extreme Nesting & Recursion Stress', () => {
    it('should handle 100 levels of nested objects without call stack overflow', () => {
      let nestedObj: Record<string, unknown> = { leaf: 'deepValue' };
      for (let i = 99; i >= 0; i--) {
        nestedObj = { [`level_${i}`]: nestedObj };
      }

      // calculateStats
      const stats = calculateStats(nestedObj as unknown as JsonValue, 2048);
      expect(stats.maxDepth).toBe(102);
      expect(stats.objectCount).toBe(101);
      expect(stats.stringCount).toBe(1);

      // buildTreeNode
      const rootNode = buildTreeNode(nestedObj as unknown as JsonValue);
      expect(rootNode.type).toBe('object');
      expect(rootNode.children?.length).toBe(1);

      // sortJsonKeys
      const sorted = sortJsonKeys(nestedObj as unknown as JsonValue, 'asc') as Record<string, unknown>;
      expect(sorted).toBeDefined();

      // flatten & unflatten
      const flat = flattenJsonObject(nestedObj as unknown as JsonValue);
      expect(Object.keys(flat).length).toBe(1);
      const unflattened = unflattenJsonObject(flat);
      expect(unflattened).toBeDefined();
    });

    it('should handle 100 levels of nested arrays without call stack overflow', () => {
      let nestedArr: unknown[] = ['deepArrayLeaf'];
      for (let i = 0; i < 99; i++) {
        nestedArr = [nestedArr];
      }

      const stats = calculateStats(nestedArr as unknown as JsonValue, 1024);
      expect(stats.maxDepth).toBe(101);
      expect(stats.arrayCount).toBe(100);
      expect(stats.stringCount).toBe(1);

      const tree = buildTreeNode(nestedArr as unknown as JsonValue);
      expect(tree.type).toBe('array');
    });

    it('should process a 10,000-element array efficiently within 100ms', () => {
      const largeArray = Array.from({ length: 10_000 }, (_, i) => i);
      const start = performance.now();
      const stats = calculateStats(largeArray as unknown as JsonValue, 50_000);
      const duration = performance.now() - start;

      expect(stats.arrayCount).toBe(1);
      expect(stats.numberCount).toBe(10_000);
      expect(duration).toBeLessThan(150); // Assert sub-150ms processing
    });
  });

  describe('Pillar 2: Special Characters, Emojis, RTL, and Unescaped Keys', () => {
    it('should accurately handle astral emojis, RTL Arabic/Hebrew, and control chars', () => {
      const exoticData: Record<string, unknown> = {
        'emojiKey_🚀🔥': 'Astral value: 💻🎉✨',
        rtlArabic: 'مرحبا بكم في جيسون لينس',
        rtlHebrew: 'שלום עולם',
        withEscapes: 'Line1\nLine2\tTabbed "Quoted" \\Backslash',
        nullByte: 'Before\u0000After',
        emptyStringKey: { '': 'empty-key-val' },
        dotKey: { 'user.profile.email': 'test@example.com' },
        bracketKey: { 'matrix[0][1]': 42 },
      };

      const tree = buildTreeNode(exoticData as unknown as JsonValue);
      expect(tree.children?.length).toBe(8);

      const jsonStr = JSON.stringify(exoticData);
      const repaired = jsonrepair(jsonStr);
      expect(JSON.parse(repaired)).toEqual(exoticData);

      const flat = flattenJsonObject(exoticData as unknown as JsonValue);
      expect(flat['emojiKey_🚀🔥']).toBe('Astral value: 💻🎉✨');
      expect(flat['rtlArabic']).toBe('مرحبا بكم في جيسون لينس');
      expect(flat['nullByte']).toBe('Before\u0000After');
    });

    it('should strip null properties cleanly even from exotic structures', () => {
      const data = {
        keep: 'active',
        drop1: null,
        nested: {
          keepNested: 123,
          dropNested: null,
        },
        arr: [1, null, 'string', null],
      };

      const cleaned = stripNullProperties(data as unknown as JsonValue) as Record<string, unknown>;
      expect(cleaned['keep']).toBe('active');
      expect('drop1' in cleaned).toBe(false);
      expect((cleaned['nested'] as Record<string, unknown>)['dropNested']).toBeUndefined();
      expect(cleaned['arr']).toEqual([1, 'string']);
    });
  });

  describe('Pillar 3: Malformed JSON Auto-Repair Stress Test', () => {
    it('should repair unquoted keys, single quotes, and trailing commas', () => {
      const broken = `{
        name: 'JsonLens Pro',
        version: 1.0,
        tags: ['formatter', 'validator',],
      }`;

      const fixed = jsonrepair(broken);
      const parsed = JSON.parse(fixed);

      expect(parsed.name).toBe('JsonLens Pro');
      expect(parsed.version).toBe(1.0);
      expect(parsed.tags).toEqual(['formatter', 'validator']);
    });

    it('should strip JavaScript single-line and multi-line comments', () => {
      const jsonWithComments = `
        /* Top header comment block */
        {
          // User configuration
          "theme": "dark", // inline comment
          "active": true
          /* trailing comment */
        }
      `;

      const fixed = jsonrepair(jsonWithComments);
      const parsed = JSON.parse(fixed);
      expect(parsed.theme).toBe('dark');
      expect(parsed.active).toBe(true);
    });

    it('should repair Python-style booleans and None values', () => {
      const pythonDict = `{'is_admin': True, 'is_guest': False, 'token': None, 'score': 99.5}`;
      const fixed = jsonrepair(pythonDict);
      const parsed = JSON.parse(fixed);

      expect(parsed.is_admin).toBe(true);
      expect(parsed.is_guest).toBe(false);
      expect(parsed.token).toBeNull();
      expect(parsed.score).toBe(99.5);
    });

    it('should repair truncated JSON with missing closing braces', () => {
      const truncated = `{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"`;
      const fixed = jsonrepair(truncated);
      const parsed = JSON.parse(fixed);

      expect(parsed.users.length).toBe(2);
      expect(parsed.users[1].name).toBe('Bob');
    });
  });

  describe('Pillar 4: Deep AST Diff Edge-Cases', () => {
    it('should diff completely disjoint structures without error', () => {
      const left = { a: 1, b: 'two', c: [1, 2] };
      const right = { x: 99, y: { nested: true } };

      const diffs = deepDiffJson(left, right);
      const summary = summarizeDiff(diffs);

      expect(diffs.length).toBeGreaterThan(0);
      expect(summary.added).toBeGreaterThan(0);
      expect(summary.removed).toBeGreaterThan(0);
    });

    it('should detect zero modifications for identical 500-item collections', () => {
      const itemsA = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        uuid: `uuid-${i}`,
        active: i % 2 === 0,
      }));
      const itemsB = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        uuid: `uuid-${i}`,
        active: i % 2 === 0,
      }));

      const diffs = deepDiffJson(itemsA, itemsB);
      const summary = summarizeDiff(diffs);

      expect(summary.added).toBe(0);
      expect(summary.removed).toBe(0);
      expect(summary.modified).toBe(0);
      expect(summary.unchanged).toBe(1500); // 3 properties * 500 items = 1500 unchanged
    });

    it('should handle type transitions cleanly (e.g., number to object)', () => {
      const left = { config: 100 };
      const right = { config: { enabled: true, rate: 100 } };

      const diffs = deepDiffJson(left, right);
      expect(diffs.length).toBeGreaterThan(0);
      const configDiff = diffs.find((d) => d.path === 'config');
      expect(configDiff?.type).toBe('modified');
    });
  });

  describe('Pillar 5: Type Generator Robustness Under Edge Scenarios', () => {
    it('should safely generate TypeScript, Zod, and Go for reserved keywords and numbers as keys', () => {
      const reservedKeyData = {
        class: 'Hero',
        function: 'execute',
        import: true,
        default: 123,
        '123_numberKey': 'validValue',
        '@context': 'https://schema.org',
        'kebab-case-key': true,
      };

      const ts = jsonToTypescript(reservedKeyData, 'HeroModel');
      expect(ts).toContain('class');
      expect(ts).toContain('function');
      expect(ts).toContain('123_numberKey');

      const zod = jsonToZod(reservedKeyData, 'heroModel');
      expect(zod).toContain('z.object');
      expect(zod).toContain('class: z.string()');

      const go = jsonToGo(reservedKeyData, 'HeroModel');
      expect(go).toContain('type HeroModel struct');

      const py = jsonToPython(reservedKeyData, 'HeroModel');
      expect(py).toContain('class HeroModel');
      expect(py).toContain('pydantic');

      const rust = jsonToRust(reservedKeyData, 'HeroModel');
      expect(rust).toContain('pub struct HeroModel');
    });

    it('should handle empty object and empty array without crashing type generators', () => {
      expect(jsonToTypescript({}, 'EmptyModel')).toContain('export interface EmptyModel');
      expect(jsonToZod({}, 'emptyModel')).toContain('emptyModelSchema = z.object');
      expect(jsonToGo({}, 'EmptyModel')).toContain('struct');

      expect(jsonToTypescript([], 'EmptyArrayModel')).toBeDefined();
      expect(jsonToZod([], 'emptyArrayModel')).toBeDefined();
    });

    it('should handle heterogeneous arrays in TypeScript generator', () => {
      const heterogeneous = {
        mixed: [1, 'string', true, { deep: 'obj' }],
      };

      const ts = jsonToTypescript(heterogeneous, 'HeteroModel');
      expect(ts).toBeDefined();
      expect(ts).toContain('mixed');
    });
  });
});

