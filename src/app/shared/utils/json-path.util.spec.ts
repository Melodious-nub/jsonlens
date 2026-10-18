import { describe, expect, it } from 'vitest';
import {
  formatPropertyAccessor,
  getValueByJsonPath,
  toJavaScriptAccessor,
  toStandardJsonPath,
} from './json-path.util';

describe('json-path.util', () => {
  describe('toStandardJsonPath', () => {
    it('should format root paths correctly', () => {
      expect(toStandardJsonPath('')).toBe('$');
      expect(toStandardJsonPath('root')).toBe('$');
      expect(toStandardJsonPath('$')).toBe('$');
    });

    it('should format object and array paths to JSONPath notation', () => {
      expect(toStandardJsonPath('root.data.items[0]')).toBe('$.data.items[0]');
      expect(toStandardJsonPath('items[0].id')).toBe('$.items[0].id');
      expect(toStandardJsonPath('[0].name')).toBe('$[0].name');
      expect(toStandardJsonPath('$.users')).toBe('$.users');
    });
  });

  describe('toJavaScriptAccessor', () => {
    it('should convert path to JS accessor', () => {
      expect(toJavaScriptAccessor('$')).toBe('response');
      expect(toJavaScriptAccessor('root')).toBe('response');
      expect(toJavaScriptAccessor('$.users[0].id')).toBe('users[0].id');
      expect(toJavaScriptAccessor('root.data')).toBe('data');
    });
  });

  describe('formatPropertyAccessor', () => {
    it('should format valid and invalid identifiers correctly', () => {
      expect(formatPropertyAccessor('name')).toBe('.name');
      expect(formatPropertyAccessor('invalid-prop')).toBe('["invalid-prop"]');
      expect(formatPropertyAccessor('hello world')).toBe('["hello world"]');
    });
  });

  describe('getValueByJsonPath', () => {
    const testData = {
      user: {
        id: 101,
        name: 'Alice',
        roles: ['admin', 'editor'],
        profile: {
          bio: 'Engineer',
          social: {
            twitter: '@alice',
          },
        },
      },
      items: [
        { code: 'A1', price: 9.99 },
        { code: 'B2', price: 19.99 },
      ],
      active: true,
      nil: null,
    };

    it('should resolve root data', () => {
      expect(getValueByJsonPath(testData, '$')).toEqual(testData);
      expect(getValueByJsonPath(testData, 'root')).toEqual(testData);
    });

    it('should resolve shallow object properties', () => {
      expect(getValueByJsonPath(testData, '$.active')).toBe(true);
      expect(getValueByJsonPath(testData, '$.nil')).toBeNull();
    });

    it('should resolve deeply nested object properties', () => {
      expect(getValueByJsonPath(testData, '$.user.name')).toBe('Alice');
      expect(getValueByJsonPath(testData, '$.user.profile.social.twitter')).toBe('@alice');
      expect(getValueByJsonPath(testData, 'user.profile.bio')).toBe('Engineer');
    });

    it('should resolve array elements by index', () => {
      expect(getValueByJsonPath(testData, '$.user.roles[0]')).toBe('admin');
      expect(getValueByJsonPath(testData, '$.user.roles[1]')).toBe('editor');
      expect(getValueByJsonPath(testData, '$.items[1].code')).toBe('B2');
      expect(getValueByJsonPath(testData, '$.items[0].price')).toBe(9.99);
    });

    it('should return undefined for missing paths or invalid inputs', () => {
      expect(getValueByJsonPath(null, '$.user')).toBeUndefined();
      expect(getValueByJsonPath(testData, '$.user.nonExistent')).toBeUndefined();
      expect(getValueByJsonPath(testData, '$.items[99]')).toBeUndefined();
      expect(getValueByJsonPath(testData, '$.active.unknown')).toBeUndefined();
    });
  });
});
