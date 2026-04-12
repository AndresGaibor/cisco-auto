import { test, expect, describe } from 'bun:test';
import { ValueObject } from '../../../../src/domain/shared/base/value-object.base.js';
import { Entity } from '../../../../src/domain/shared/base/entity.base.js';
import { Aggregate } from '../../../../src/domain/shared/base/aggregate.base.js';
import type { DomainEvent } from '../../../../src/domain/shared/events/domain-event.interface.js';
import { createDomainEvent } from '../../../../src/domain/shared/events/domain-event.interface.js';
import { DomainError } from '../../../../src/domain/shared/errors/domain.error.js';

// Helpers de prueba
class TestId extends ValueObject<string> {
  static from(value: string): TestId {
    return new TestId(value);
  }
}

class TestEntity extends Entity<TestId> {
  public name: string;

  constructor(id: TestId, name: string) {
    super(id);
    this.name = name;
  }

  rename(newName: string): void {
    this.name = newName;
  }
}

class TestAggregate extends Aggregate<TestId> {
  public items: string[] = [];

  constructor(id: TestId) {
    super(id);
  }

  addItem(item: string): void {
    this.items.push(item);
    this.recordEvent(
      createDomainEvent<TestDomainEvent>('ItemAdded', this._id.value, { itemName: item })
    );
  }

  validate(): void {
    if (this.items.length === 0) {
      throw DomainError.invariantViolation('Aggregate must have at least one item');
    }
  }
}

interface TestDomainEvent extends DomainEvent {
  itemName: string;
}

describe('Entity', () => {
  describe('constructor', () => {
    test('should store identity', () => {
      const id = TestId.from('test-1');
      const entity = new TestEntity(id, 'Test');
      expect(entity.id.value).toBe('test-1');
    });
  });

  describe('equals', () => {
    test('should return true for same identity', () => {
      const id = TestId.from('same-id');
      const e1 = new TestEntity(id, 'Name1');
      const e2 = new TestEntity(id, 'Name2');
      expect(e1.equals(e2)).toBe(true);
    });

    test('should return false for different identity', () => {
      const e1 = new TestEntity(TestId.from('id-1'), 'Test');
      const e2 = new TestEntity(TestId.from('id-2'), 'Test');
      expect(e1.equals(e2)).toBe(false);
    });

    test('should return false for null', () => {
      const e = new TestEntity(TestId.from('id'), 'Test');
      expect(e.equals(null as unknown as TestEntity)).toBe(false);
    });

    test('should return false for undefined', () => {
      const e = new TestEntity(TestId.from('id'), 'Test');
      expect(e.equals(undefined as unknown as TestEntity)).toBe(false);
    });

    test('should return false for different entity types', () => {
      class OtherEntity extends Entity<TestId> {
        constructor(id: TestId) {
          super(id);
        }
      }
      const e1 = new TestEntity(TestId.from('id'), 'Test');
      const e2 = new OtherEntity(TestId.from('id'));
      expect(e1.equals(e2 as unknown as TestEntity)).toBe(false);
    });
  });

  describe('methods', () => {
    test('should modify entity state', () => {
      const entity = new TestEntity(TestId.from('id'), 'Original');
      entity.rename('New');
      expect(entity.name).toBe('New');
    });
  });
});

describe('Aggregate', () => {
  describe('constructor', () => {
    test('should store identity', () => {
      const id = TestId.from('agg-1');
      const agg = new TestAggregate(id);
      expect(agg.id.value).toBe('agg-1');
    });

    test('should start with empty events', () => {
      const agg = new TestAggregate(TestId.from('agg-1'));
      expect(agg.events).toEqual([]);
    });
  });

  describe('events', () => {
    test('should collect events when recording them', () => {
      const agg = new TestAggregate(TestId.from('agg-1'));
      agg.addItem('item-1');
      expect(agg.events.length).toBe(1);
      expect(agg.events[0].type).toBe('ItemAdded');
      expect(agg.events[0].aggregateId).toBe('agg-1');
    });

    test('should collect multiple events', () => {
      const agg = new TestAggregate(TestId.from('agg-1'));
      agg.addItem('item-1');
      agg.addItem('item-2');
      expect(agg.events.length).toBe(2);
    });

    test('should clear events after clearing', () => {
      const agg = new TestAggregate(TestId.from('agg-1'));
      agg.addItem('item-1');
      expect(agg.events.length).toBe(1);
      agg.clearEvents();
      expect(agg.events).toEqual([]);
    });

    test('should return copy of events array', () => {
      const agg = new TestAggregate(TestId.from('agg-1'));
      agg.addItem('item-1');
      const events = agg.events;
      (events as DomainEvent[]).length = 0;
      expect(agg.events.length).toBe(1);
    });
  });

  describe('validate', () => {
    test('should throw when invariant violated', () => {
      const agg = new TestAggregate(TestId.from('agg-1'));
      expect(() => agg.validate()).toThrow(DomainError);
    });

    test('should pass when invariants satisfied', () => {
      const agg = new TestAggregate(TestId.from('agg-1'));
      agg.addItem('item-1');
      expect(() => agg.validate()).not.toThrow();
    });
  });
});

describe('createDomainEvent', () => {
  test('should create event with base fields', () => {
    const event = createDomainEvent<TestDomainEvent>('TestEvent', 'agg-1', { itemName: 'test' });
    expect(event.type).toBe('TestEvent');
    expect(event.aggregateId).toBe('agg-1');
    expect(event.occurredOn).toBeDefined();
    expect(event.itemName).toBe('test');
  });

  test('should set ISO timestamp', () => {
    const event = createDomainEvent<TestDomainEvent>('TestEvent', 'agg-1', { itemName: 'test' });
    expect(new Date(event.occurredOn).toISOString()).toBe(event.occurredOn);
  });
});
