import { test, expect, describe } from 'bun:test';
import { DomainError } from '../../../../src/domain/shared/errors/domain.error.js';

describe('DomainError', () => {
  describe('constructor', () => {
    test('should create error with message and code', () => {
      const error = new DomainError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('DomainError');
    });

    test('should include context', () => {
      const error = new DomainError('Test error', 'TEST_CODE', { key: 'value' });
      expect(error.context).toEqual({ key: 'value' });
    });
  });

  describe('invalidValue', () => {
    test('should create invalid value error', () => {
      const error = DomainError.invalidValue('VLAN ID', 5000, 'must be 1-4094');
      expect(error.message).toBe('Invalid VLAN ID: "5000". must be 1-4094');
      expect(error.code).toBe('INVALID_VALUE');
      expect(error.context?.type).toBe('VLAN ID');
      expect(error.context?.value).toBe(5000);
    });

    test('should create invalid value error without reason', () => {
      const error = DomainError.invalidValue('Test', 'bad');
      expect(error.message).toBe('Invalid Test: "bad"');
    });
  });

  describe('invariantViolation', () => {
    test('should create invariant violation error', () => {
      const error = DomainError.invariantViolation('Device must have at least one interface');
      expect(error.message).toBe('Device must have at least one interface');
      expect(error.code).toBe('INVARIANT_VIOLATION');
    });
  });

  describe('notFound', () => {
    test('should create not found error', () => {
      const error = DomainError.notFound('Device', 'R1');
      expect(error.message).toBe('Device with id "R1" not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.context?.type).toBe('Device');
      expect(error.context?.id).toBe('R1');
    });
  });

  describe('notAllowed', () => {
    test('should create not allowed error', () => {
      const error = DomainError.notAllowed('delete', 'VLAN 1 cannot be deleted');
      expect(error.message).toBe('Operation "delete" not allowed: VLAN 1 cannot be deleted');
      expect(error.code).toBe('NOT_ALLOWED');
    });
  });

  describe('conflict', () => {
    test('should create conflict error', () => {
      const error = DomainError.conflict('Device R1 already exists');
      expect(error.message).toBe('Device R1 already exists');
      expect(error.code).toBe('CONFLICT');
    });
  });
});