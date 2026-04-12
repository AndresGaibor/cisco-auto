import { test, expect, describe } from 'bun:test';
import { ValueObject } from '../../../../src/domain/shared/base/value-object.base.js';

// Clase concreta para pruebas
class TestValueObject extends ValueObject<string> {
  constructor(value: string) {
    super(value);
  }
}

class NumberValueObject extends ValueObject<number> {
  constructor(value: number) {
    super(value);
  }
}

class ObjectValueObject extends ValueObject<{ a: number; b: string }> {
  constructor(value: { a: number; b: string }) {
    super(value);
  }
}

describe('ValueObject', () => {
  describe('constructor', () => {
    test('should store the value', () => {
      const vo = new TestValueObject('test');
      expect(vo.value).toBe('test');
    });

    test('should freeze object values', () => {
      const obj = { a: 1, b: 'test' };
      const vo = new ObjectValueObject(obj);
      expect(vo.value).toEqual(obj);
    });
  });

  describe('equals', () => {
    test('should return true for equal primitive values', () => {
      const vo1 = new TestValueObject('test');
      const vo2 = new TestValueObject('test');
      expect(vo1.equals(vo2)).toBe(true);
    });

    test('should return false for different primitive values', () => {
      const vo1 = new TestValueObject('test1');
      const vo2 = new TestValueObject('test2');
      expect(vo1.equals(vo2)).toBe(false);
    });

    test('should return false for null', () => {
      const vo = new TestValueObject('test');
      expect(vo.equals(null as unknown as TestValueObject)).toBe(false);
    });

    test('should return false for undefined', () => {
      const vo = new TestValueObject('test');
      expect(vo.equals(undefined as unknown as TestValueObject)).toBe(false);
    });

    test('should return false for different types', () => {
      const vo1 = new TestValueObject('test');
      const vo2 = new NumberValueObject(1);
      expect(vo1.equals(vo2 as unknown as TestValueObject)).toBe(false);
    });

    test('should compare object values deeply', () => {
      const vo1 = new ObjectValueObject({ a: 1, b: 'test' });
      const vo2 = new ObjectValueObject({ a: 1, b: 'test' });
      expect(vo1.equals(vo2)).toBe(true);
    });

    test('should return false for different object values', () => {
      const vo1 = new ObjectValueObject({ a: 1, b: 'test' });
      const vo2 = new ObjectValueObject({ a: 2, b: 'test' });
      expect(vo1.equals(vo2)).toBe(false);
    });
  });

  describe('toJSON', () => {
    test('should return primitive value', () => {
      const vo = new TestValueObject('test');
      expect(vo.toJSON()).toBe('test');
    });

    test('should return number value', () => {
      const vo = new NumberValueObject(42);
      expect(vo.toJSON()).toBe(42);
    });
  });

  describe('toString', () => {
    test('should return string representation', () => {
      const vo = new TestValueObject('test');
      expect(vo.toString()).toBe('test');
    });

    test('should convert number to string', () => {
      const vo = new NumberValueObject(42);
      expect(vo.toString()).toBe('42');
    });
  });
});