import { test, expect, describe } from 'bun:test';
import { ok, err, isOk, isErr, tryCatch, type Result } from '../../../../src/domain/shared/types/result.type.js';
import { DomainError } from '../../../../src/domain/shared/errors/domain.error.js';

describe('Result type', () => {
  describe('ok', () => {
    test('should create successful result', () => {
      const result = ok('success');
      expect(result.ok).toBe(true);
      expect(result.value).toBe('success');
      expect(result.error).toBeUndefined();
    });

    test('should work with numbers', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    test('should work with objects', () => {
      const data = { name: 'test' };
      const result = ok(data);
      expect(result.value).toBe(data);
    });
  });

  describe('err', () => {
    test('should create error result with string', () => {
      const result = err('something failed');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('something failed');
      expect(result.value).toBeUndefined();
    });

    test('should create error result with DomainError', () => {
      const domainErr = DomainError.invalidValue('test', 'bad', 'invalid');
      const result = err(domainErr);
      expect(result.ok).toBe(false);
      expect(result.error).toBe(domainErr);
    });

    test('should create error result with Error', () => {
      const error = new Error('test error');
      const result = err(error);
      expect(result.error).toBe(error);
    });
  });

  describe('isOk / isErr', () => {
    test('isOk should return true for ok results', () => {
      const result = ok('success');
      expect(isOk(result)).toBe(true);
    });

    test('isOk should return false for error results', () => {
      const result = err('fail');
      expect(isOk(result)).toBe(false);
    });

    test('isErr should return true for error results', () => {
      const result = err('fail');
      expect(isErr(result)).toBe(true);
    });

    test('isErr should return false for ok results', () => {
      const result = ok('success');
      expect(isErr(result)).toBe(false);
    });

    test('isOk should narrow type correctly', () => {
      const result: Result<string, Error> = ok('test');
      if (isOk(result)) {
        expect(result.value).toBe('test');
      }
    });
  });

  describe('tryCatch', () => {
    test('should return ok for successful function', () => {
      const result = tryCatch(() => 42);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    test('should return err for throwing function', () => {
      const result = tryCatch(() => {
        throw new Error('boom');
      });
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    test('should use custom error factory', () => {
      const result = tryCatch(
        () => {
          throw new Error('raw error');
        },
        (e) => DomainError.conflict('wrapped', { original: (e as Error).message })
      );
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(DomainError);
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    test('should work with non-Error throws', () => {
      const result = tryCatch(() => {
        throw 'string error';
      });
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('string error');
      }
    });
  });
});
