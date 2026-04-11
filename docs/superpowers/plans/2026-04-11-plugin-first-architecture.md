# Plugin-First Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the cisco-auto monorepo from a mixed architecture to a Clean/Hexagonal Architecture with Plugin System.

**Architecture:** 
- Domain layer with Value Objects, Entities, Aggregates, and Repository interfaces
- Application layer with Use Cases and Plugin Registry
- Infrastructure layer with plugins (protocols, devices, backends)
- Presentation layer with thin CLI commands
- Dependency inversion: Infrastructure depends on Domain, never the reverse

**Tech Stack:** TypeScript 5.x, Bun runtime, Zod for validation, Effect/Result patterns

---

##File Structure Overview

```
packages/
├── kernel/                    # NEW: Core system
│   ├── src/
│   │   ├── domain/           # Pure domain (no external deps)
│   │   ├── application/      # Use cases
│   │   └── plugin-api/       # Plugin interfaces
│   └── tests/
├── protocols/                 # NEW: Protocol plugins
│   ├── vlan/
│   ├── routing/
│   ├── security/
│   └── services/
├── backends/                   # NEW: Backend plugins
│   └── packet-tracer/
├── infrastructure/             # NEW: Shared infra
│   ├── persistence/
│   └── parsers/
├── contracts/                  # RENAME: from types/
├── ios-domain/                 # MIGRATE: to kernel/domain/ios/
├── core/                       # DEPRECATE: migrate to plugins + kernel
├── pt-control/                 # MIGRATE: to backends/packet-tracer/
├── file-bridge/                # MIGRATE: to backends/packet-tracer/adapters/
└── pt-runtime/                 # MIGRATE: to backends/packet-tracer/runtime/

apps/
└── cisco-cli/                  # REFACTOR: thin CLI commands
```

---

## Phase1: Kernel Setup - Domain Layer

### Task 1.1: Create Kernel Package Structure

**Files:**
- Create: `packages/kernel/package.json`
- Create: `packages/kernel/tsconfig.json`
- Create: `packages/kernel/src/index.ts`
- Create: `packages/kernel/src/domain/index.ts`

- [ ] **Step 1: Create kernel package.json**

```json
{
  "name": "@cisco-auto/kernel",
  "version": "0.1.0",
  "description": "Core kernel with domain, application, and plugin API",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./domain": "./src/domain/index.ts",
    "./domain/ios": "./src/domain/ios/index.ts",
    "./domain/topology": "./src/domain/topology/index.ts",
    "./domain/lab": "./src/domain/lab/index.ts",
    "./application": "./src/application/index.ts",
    "./plugin-api": "./src/plugin-api/index.ts"
  },
  "scripts": {
    "test": "bun test"
  },
  "dependencies": {
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5"
  },
  "files": ["/src"],
  "license": "MIT"
}
```

- [ ] **Step 2: Create kernel tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@cisco-auto/kernel": ["./src/index.ts"],
      "@cisco-auto/kernel/domain": ["./src/domain/index.ts"],
      "@cisco-auto/kernel/application": ["./src/application/index.ts"],
      "@cisco-auto/kernel/plugin-api": ["./src/plugin-api/index.ts"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "tests"]
}
```

- [ ] **Step 3: Create kernel main index.ts**

```typescript
// packages/kernel/src/index.ts

// Domain exports
export * from './domain/index.js';

// Application exports
export * from './application/index.js';

// Plugin API exports
export * from './plugin-api/index.js';
```

- [ ] **Step 4: Create domain index.ts**

```typescript
// packages/kernel/src/domain/index.ts

// IOS Bounded Context
export * from './ios/index.js';

// Topology Bounded Context
export * from './topology/index.js';

// Lab Bounded Context
export * from './lab/index.js';

// Shared Kernel
export * from './shared/index.js';
```

- [ ] **Step 5: Verify package structure**

Run: `ls -la packages/kernel/src/`
Expected: Directory structure with domain/, application/, plugin-api/

- [ ] **Step 6: Add kernel to root workspace**

Modify: `package.json` (root)

```json
// Add to workspaces array after "packages/*":
// The workspace pattern already includes packages/*, so kernel is auto-included
```

- [ ] **Step 7: Install dependencies**

Run: `bun install`
Expected: Dependencies installed, kernel package linked

- [ ] **Step 8: Commit kernel setup**

Run: `git add packages/kernel/ && git commit -m "feat(kernel): create kernel package structure"`

---

### Task 1.2: Create Domain Base Types

**Files:**
- Create: `packages/kernel/src/domain/shared/base/entity.base.ts`
- Create: `packages/kernel/src/domain/shared/base/value-object.base.ts`
- Create: `packages/kernel/src/domain/shared/base/aggregate.base.ts`
- Create: `packages/kernel/src/domain/shared/base/domain-event.base.ts`
- Create: `packages/kernel/src/domain/shared/base/index.ts`
- Create: `packages/kernel/src/domain/shared/errors/domain-error.ts`
- Create: `packages/kernel/src/domain/shared/errors/validation-error.ts`
- Create: `packages/kernel/src/domain/shared/errors/index.ts`
- Create: `packages/kernel/src/domain/shared/types/result.ts`
- Create: `packages/kernel/src/domain/shared/index.ts`

- [ ] **Step 1: Create base directory structure**

Run: `mkdir -p packages/kernel/src/domain/shared/{base,errors,types}`

- [ ] **Step 2: Create ValueObject base class**

```typescript
// packages/kernel/src/domain/shared/base/value-object.base.ts

/**
 * Base class for Value Objects
 * Value Objects are immutable and compared by value
 */
export abstract class ValueObject<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this._value = Object.freeze(value);
  }

  get value(): T {
    return this._value;
  }

  abstract equals(other: this): boolean;

  abstract toString(): string;

  abstract toJSON(): unknown;

  /**
   * Check structural equality
   */
  protected structuralEquals(other: this): boolean {
    return JSON.stringify(this._value) === JSON.stringify(other._value);
  }
}
```

- [ ] **Step 3: Create Entity base class**

```typescript
// packages/kernel/src/domain/shared/base/entity.base.ts

import type { DomainEvent } from './domain-event.base';

/**
 * Base class for Entities
 * Entities have identity and can change over time
 */
export abstract class Entity<TId> {
  protected readonly _id: TId;
  protected readonly _events: DomainEvent[] = [];

  constructor(id: TId) {
    this._id = id;
  }

  get id(): TId {
    return this._id;
  }

  /**
   * Get uncommitted domain events
   */
  get events(): readonly DomainEvent[] {
    return Object.freeze([...this._events]);
  }

  /**
   * Add a domain event
   */
  protected addEvent(event: DomainEvent): void {
    this._events.push(event);
  }

  /**
   * Clear uncommitted events
   */
  clearEvents(): void {
    this._events.length = 0;
  }

  /**
   * Check equality by identity
   */
  equals(other: this): boolean {
    return this._id === other._id;
  }
}
```

- [ ] **Step 4: Create Aggregate base class**

```typescript
// packages/kernel/src/domain/shared/base/aggregate.base.ts

import type { Entity } from './entity.base';

/**
 * Base class for Aggregates
 * Aggregates are clusters of entities and value objects
 * with a root entity that owns all invariants
 */
export abstract class Aggregate<TId> extends Entity<TId> {
  /**
   * Validate aggregate invariants
   * Throws DomainError if invariants are violated
   */
  abstract validate(): void;

  /**
   * Check if the aggregate is in a valid state
   */
  isValid(): boolean {
    try {
      this.validate();
      return true;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 5: Create DomainEvent base class**

```typescript
// packages/kernel/src/domain/shared/base/domain-event.base.ts

/**
 * Base class for Domain Events
 * Events represent something that happened in the domain
 */
export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly payload: unknown;
}

/**
 * Factory for creating domain events
 */
export function createDomainEvent(
  aggregateId: string,
  eventType: string,
  payload: unknown
): DomainEvent {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    occurredAt: new Date(),
    aggregateId,
    payload,
  };
}
```

- [ ] **Step 6: Create base index**

```typescript
// packages/kernel/src/domain/shared/base/index.ts

export { ValueObject } from './value-object.base';
export { Entity } from './entity.base';
export { Aggregate } from './aggregate.base';
export type { DomainEvent } from './domain-event.base';
export { createDomainEvent } from './domain-event.base';
```

- [ ] **Step 7: Create DomainError class**

```typescript
// packages/kernel/src/domain/shared/errors/domain-error.ts

/**
 * Domain Error
 * Represents a business rule violation
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DomainError';
  }

  static invalidValue(
    field: string,
    value: unknown,
    reason: string
  ): DomainError {
    return new DomainError(
      `Invalid value for ${field}: ${reason}`,
      'INVALID_VALUE',
      { field, value, reason }
    );
  }

  static invariantViolation(
    invariant: string,
    reason: string
  ): DomainError {
    return new DomainError(
      `Invariant violated: ${invariant}. ${reason}`,
      'INVARIANT_VIOLATION',
      { invariant, reason }
    );
  }

  static notFound(resource: string, identifier: string): DomainError {
    return new DomainError(
      `${resource} not found: ${identifier}`,
      'NOT_FOUND',
      { resource, identifier }
    );
  }

  static alreadyExists(resource: string, identifier: string): DomainError {
    return new DomainError(
      `${resource} already exists: ${identifier}`,
      'ALREADY_EXISTS',
      { resource, identifier }
    );
  }
}
```

- [ ] **Step 8: Create ValidationError class**

```typescript
// packages/kernel/src/domain/shared/errors/validation-error.ts

import { z } from 'zod';

/**
 * Validation Error
 * Represents input validation failure
 */
export interface ValidationErrorDetail {
  path: string;
  message: string;
  code: string;
}

export class ValidationError extends Error {
  constructor(
    public readonly errors: ValidationErrorDetail[]
  ) {
    super(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    this.name = 'ValidationError';
  }

  static fromZodError(error: z.ZodError): ValidationError {
    const details: ValidationErrorDetail[] = error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
    return new ValidationError(details);
  }

  static single(
    path: string,
    message: string,
    code: string = 'INVALID'
  ): ValidationError {
    return new ValidationError([{ path, message, code }]);
  }
}
```

- [ ] **Step 9: Create errors index**

```typescript
// packages/kernel/src/domain/shared/errors/index.ts

export { DomainError } from './domain-error';
export { ValidationError, type ValidationErrorDetail } from './validation-error';
```

- [ ] **Step 10: Create Result type**

```typescript
// packages/kernel/src/domain/shared/types/result.ts

/**
 * Result type for functional error handling
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  ok: true;
  value: T;
}

export interface Failure<E> {
  ok: false;
  error: E;
}

export function success<T>(value: T): Success<T> {
  return { ok: true, value };
}

export function failure<E>(error: E): Failure<E> {
  return { ok: false, error };
}

/**
 * Helper to unwrap a result or throw
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error instanceof Error ? result.error : new Error(String(result.error));
}

/**
 * Helper to unwrap or return default
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}
```

- [ ] **Step 11: Create shared index**

```typescript
// packages/kernel/src/domain/shared/index.ts

// Base classes
export * from './base/index';

// Errors
export * from './errors/index';

// Types
export * from './types/result';
```

- [ ] **Step 12: Write tests for base classes**

Create: `packages/kernel/tests/domain/shared/base/value-object.base.test.ts`

```typescript
import { describe, test, expect } from 'bun:test';
import { ValueObject } from '@cisco-auto/kernel/domain/shared/base';

class TestVO extends ValueObject<number> {
  constructor(value: number) {
    super(value);
  }

  equals(other: this): boolean {
    return this.structuralEquals(other);
  }

  toString(): string {
    return String(this.value);
  }

  toJSON(): number {
    return this.value;
  }
}

describe('ValueObject', () => {
  test('creates immutable value', () => {
    const vo = new TestVO(42);
    expect(vo.value).toBe(42);
  });

  test('compares by value', () => {
    const vo1 = new TestVO(42);
    const vo2 = new TestVO(42);
    const vo3 = new TestVO(43);

    expect(vo1.equals(vo2)).toBe(true);
    expect(vo1.equals(vo3)).toBe(false);
  });

  test('is immutable', () => {
    const vo = new TestVO(42);
    // @ts-expect-error - trying to mutate frozen object
    expect(() => { (vo as any)._value = 100 }).toThrow();
  });
});
```

- [ ] **Step 13: Run tests to verify**

Run: `bun test packages/kernel/tests/domain/shared/`
Expected: All tests pass

- [ ] **Step 14: Commit base types**

Run: `git add packages/kernel/ && git commit -m "feat(kernel): add domain base types (ValueObject, Entity, Aggregate)"`

---

### Task 1.3: Migrate Value Objects from ios-domain

**Files:**
- Create: `packages/kernel/src/domain/ios/value-objects/vlan-id.vo.ts`
- Create: `packages/kernel/src/domain/ios/value-objects/interface-name.vo.ts`
- Create: `packages/kernel/src/domain/ios/value-objects/ipv4-address.vo.ts`
- Create: `packages/kernel/src/domain/ios/value-objects/subnet-mask.vo.ts`
- Create: `packages/kernel/src/domain/ios/value-objects/mac-address.vo.ts`
- Create: `packages/kernel/src/domain/ios/value-objects/index.ts`
- Create: `packages/kernel/src/domain/ios/index.ts`
- Copy tests from ios-domain

- [ ] **Step 1: Create ios domain structure**

Run: `mkdir -p packages/kernel/src/domain/ios/value-objects`

- [ ] **Step 2: Create VlanId Value Object**

```typescript
// packages/kernel/src/domain/ios/value-objects/vlan-id.vo.ts

import { ValueObject } from '../../shared/base/value-object.base';
import { DomainError } from '../../shared/errors';

export const MIN_VLAN_ID = 1;
export const MAX_VLAN_ID = 4094;

export enum VlanType {
  DEFAULT = 'default',     // VLAN 1
  NORMAL = 'normal',       // VLANs 2-1001
  RESERVED = 'reserved',   // VLANs 1002-1005
  EXTENDED = 'extended',   // VLANs 1006-4094
}

/**
 * VLAN ID Value Object
 * Represents a validated VLAN ID (1-4094)
 */
export class VlanId extends ValueObject<number> {
  public readonly type: VlanType;

  constructor(value: number) {
    super(value);

    if (!Number.isInteger(value)) {
      throw DomainError.invalidValue('vlanId', value, 'VLAN ID must be an integer');
    }

    if (value < MIN_VLAN_ID || value > MAX_VLAN_ID) {
      throw DomainError.invalidValue(
        'vlanId',
        value,
        `VLAN ID must be between ${MIN_VLAN_ID} and ${MAX_VLAN_ID}`
      );
    }

    this.type = this.classifyVlan(value);
  }

  private classifyVlan(value: number): VlanType {
    if (value === 1) return VlanType.DEFAULT;
    if (value >= 2 && value <= 1001) return VlanType.NORMAL;
    if (value >= 1002 && value <= 1005) return VlanType.RESERVED;
    return VlanType.EXTENDED;
  }

  static from(value: number): VlanId {
    return new VlanId(value);
  }

  static fromString(value: string): VlanId {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw DomainError.invalidValue('vlanId', value, 'VLAN ID must be a number');
    }
    return new VlanId(num);
  }

  static tryFrom(value: number | string): VlanId | null {
    try {
      return typeof value === 'string' ? VlanId.fromString(value) : VlanId.from(value);
    } catch {
      return null;
    }
  }

  static isValid(value: number | string): boolean {
    return VlanId.tryFrom(value) !== null;
  }

  get isDefault(): boolean {
    return this.type === VlanType.DEFAULT;
  }

  get isNormal(): boolean {
    return this.type === VlanType.NORMAL;
  }

  get isReserved(): boolean {
    return this.type === VlanType.RESERVED;
  }

  get isExtended(): boolean {
    return this.type === VlanType.EXTENDED;
  }

  get isConfigurable(): boolean {
    return this.isNormal || this.isExtended;
  }

  equals(other: this): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }

  toJSON(): number {
    return this.value;
  }

  toNumber(): number {
    return this.value;
  }

  compareTo(other: this): number {
    return this.value - other.value;
  }
}

/**
 * Parse VLAN ID from number or string
 */
export function parseVlanId(value: number | string): VlanId {
  return typeof value === 'string' ? VlanId.fromString(value) : VlanId.from(value);
}

/**
 * Parse optional VLAN ID
 */
export function parseOptionalVlanId(
  value: number | string | null | undefined
): VlanId | undefined {
  if (value === null || value === undefined) return undefined;
  return parseVlanId(value);
}
```

- [ ] **Step 3: Create Ipv4Address Value Object**

```typescript
// packages/kernel/src/domain/ios/value-objects/ipv4-address.vo.ts

import { ValueObject } from '../../shared/base/value-object.base';
import { DomainError } from '../../shared/errors';

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * IPv4 Address Value Object
 * Represents a validated IPv4 address
 */
export class Ipv4Address extends ValueObject<string> {
  private readonly octets: [number, number, number, number];

  constructor(value: string) {
    super(value);

    const match = value.match(IPV4_REGEX);
    if (!match) {
      throw DomainError.invalidValue('ipv4Address', value, 'Invalid IPv4 address format');
    }

    const octets = match.slice(1).map(Number) as [number, number, number, number];

    for (const octet of octets) {
      if (octet < 0 || octet > 255) {
        throw DomainError.invalidValue(
          'ipv4Address',
          value,
          'Each octet must be between 0 and 255'
        );
      }
    }

    this.octets = octets;
  }

  static from(value: string): Ipv4Address {
    return new Ipv4Address(value);
  }

  static tryFrom(value: string): Ipv4Address | null {
    try {
      return new Ipv4Address(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return Ipv4Address.tryFrom(value) !== null;
  }

  get firstOctet(): number {
    return this.octets[0];
  }

  get secondOctet(): number {
    return this.octets[1];
  }

  get thirdOctet(): number {
    return this.octets[2];
  }

  get fourthOctet(): number {
    return this.octets[3];
  }

  /**
   * Check if this is a private IP address (RFC 1918)
   */
  get isPrivate(): boolean {
    return (
      (this.firstOctet === 10) ||
      (this.firstOctet === 172 && this.secondOctet >= 16 && this.secondOctet <= 31) ||
      (this.firstOctet === 192 && this.secondOctet === 168)
    );
  }

  /**
   * Check if this is a loopback address
   */
  get isLoopback(): boolean {
    return this.firstOctet === 127;
  }

  /**
   * Check if this is a multicast address
   */
  get isMulticast(): boolean {
    return this.firstOctet >= 224 && this.firstOctet <= 239;
  }

  /**
   * Check if this is a broadcast address (all 255s)
   */
  get isBroadcast(): boolean {
    return this.octets.every(o => o === 255);
  }

  /**
   * Check if this is the zero address (0.0.0.0)
   */
  get isZero(): boolean {
    return this.octets.every(o => o === 0);
  }

  equals(other: this): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }

  /**
   * Get the network address for a given subnet mask
   */
  getNetworkAddress(mask: SubnetMask): Ipv4Address {
    const maskOctets = mask.octets;
    const networkOctets = this.octets.map((o, i) => o & maskOctets[i]) as [number, number, number, number];
    return new Ipv4Address(networkOctets.join('.'));
  }

  /**
   * Get the broadcast address for a given subnet mask
   */
  getBroadcastAddress(mask: SubnetMask): Ipv4Address {
    const maskOctets = mask.octets;
    const invertedMask = maskOctets.map(o => 255 - o) as [number, number, number, number];
    const broadcastOctets = this.octets.map((o, i) => o | invertedMask[i]) as [number, number, number, number];
    return new Ipv4Address(broadcastOctets.join('.'));
  }
}

/**
 * Subnet Mask Value Object
 */
export class SubnetMask extends ValueObject<string> {
  private readonly octets: [number, number, number, number];
  private readonly prefixLength: number;

  constructor(value: string) {
    super(value);

    const match = value.match(IPV4_REGEX);
    if (!match) {
      throw DomainError.invalidValue('subnetMask', value, 'Invalid subnet mask format');
    }

    const octets = match.slice(1).map(Number) as [number, number, number, number];

    // Validate that this is a valid subnet mask (contiguous 1s followed by 0s)
    const binary = octets.map(o => o.toString(2).padStart(8, '0')).join('');
    if (!/^1*0*$/.test(binary)) {
      throw DomainError.invalidValue(
        'subnetMask',
        value,
        'Invalid subnet mask: must have contiguous 1s followed by 0s'
      );
    }

    this.octets = octets;
    this.prefixLength = (binary.match(/1/g) || []).length;
  }

  static from(value: string): SubnetMask {
    return new SubnetMask(value);
  }

  static fromPrefixLength(prefix: number): SubnetMask {
    if (prefix < 0 || prefix > 32) {
      throw DomainError.invalidValue('prefixLength', prefix, 'Prefix length must be between 0 and 32');
    }

    const binary = '1'.repeat(prefix) + '0'.repeat(32 - prefix);
    const octets = [
      parseInt(binary.slice(0, 8), 2),
      parseInt(binary.slice(8, 16), 2),
      parseInt(binary.slice(16, 24), 2),
      parseInt(binary.slice(24, 32), 2),
    ];

    return new SubnetMask(octets.join('.'));
  }

  static tryFrom(value: string): SubnetMask | null {
    try {
      return new SubnetMask(value);
    } catch {
      return null;
    }
  }

  get prefix(): number {
    return this.prefixLength;
  }

  getOctets(): [number, number, number, number] {
    return [...this.octets] as [number, number, number, number];
  }

  /**
   * Get wildcard mask (inverse of subnet mask)
   */
  getWildcardMask(): [number, number, number, number] {
    return this.octets.map(o => 255 - o) as [number, number, number, number];
  }

  /**
   * Convert to CIDR notation
   */
  toCidr(): string {
    return `/${this.prefixLength}`;
  }

  equals(other: this): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}

/**
 * Parse IPv4 address from string
 */
export function parseIpv4Address(value: string): Ipv4Address {
  return Ipv4Address.from(value);
}

/**
 * Parse subnet mask from string or prefix length
 */
export function parseSubnetMask(value: string | number): SubnetMask {
  if (typeof value === 'number') {
    return SubnetMask.fromPrefixLength(value);
  }
  return SubnetMask.from(value);
}
```

- [ ] **Step 4: Create InterfaceName Value Object**

```typescript
// packages/kernel/src/domain/ios/value-objects/interface-name.vo.ts

import { ValueObject } from '../../shared/base/value-object.base';
import { DomainError } from '../../shared/errors';

/**
 * Interface types in Cisco IOS
 */
export enum InterfaceType {
  ETHERNET = 'Ethernet',
  FASTETHERNET = 'FastEthernet',
  GIGABITETHERNET = 'GigabitEthernet',
  SERIAL = 'Serial',
  LOOPBACK = 'Loopback',
  VLAN = 'Vlan',
  PORTCHANNEL = 'Port-channel',
  TUNNEL = 'Tunnel',
  NULL = 'Null',
}

/**
 * Interface shorthand mappings
 */
const INTERFACE_SHORTHANDS: Record<string, string> = {
  'Eth': 'Ethernet',
  'Fa': 'FastEthernet',
  'Gi': 'GigabitEthernet',
  'Se': 'Serial',
  'Lo': 'Loopback',
  'Vl': 'Vlan',
  'Po': 'Port-channel',
  'Tu': 'Tunnel',
  'Nu': 'Null',
};

const INTERFACE_REGEX = /^(Ethernet|FastEthernet|GigabitEthernet|Serial|Loopback|Vlan|Port-channel|Tunnel|Null|Eth|Fa|Gi|Se|Lo|Vl|Po|Tu|Nu)(\d+)(?:\/(\d+))?(?:\/(\d+))?$/i;

/**
 * Interface Name Value Object
 * Represents a Cisco IOS interface name like GigabitEthernet0/0, FastEthernet0/1, etc.
 */
export class InterfaceName extends ValueObject<string> {
  public readonly type: InterfaceType;
  public readonly slot: number;
  public readonly subslot?: number;
  public readonly port?: number;

  constructor(value: string) {
    const normalized = InterfaceName.normalize(value);
    super(normalized);

    const match = value.match(INTERFACE_REGEX);
    if (!match) {
      throw DomainError.invalidValue(
        'interfaceName',
        value,
        'Invalid interface name format. Expected: GigabitEthernet0/0, Fa0/1, etc.'
      );
    }

    const [, typeRaw, first, second, third] = match;

    // Convert shorthand to full name
    this.type = InterfaceName.parseType(typeRaw!);
    this.slot = parseInt(first!, 10);
    this.subslot = second ? parseInt(second, 10) : undefined;
    this.port = third ? parseInt(third, 10) : undefined;
  }

  private static parseType(typeRaw: string): InterfaceType {
    const capitalized = typeRaw.charAt(0).toUpperCase() + typeRaw.slice(1).toLowerCase();

    // Check if it's already full name
    if (Object.values(InterfaceType).includes(capitalized as InterfaceType)) {
      return capitalized as InterfaceType;
    }

    // Convert shorthand to full name
    const fullName = INTERFACE_SHORTHANDS[capitalized];
    if (fullName) {
      return fullName as InterfaceType;
    }

    throw DomainError.invalidValue('interfaceType', typeRaw, 'Unknown interface type');
  }

  private static normalize(value: string): string {
    const match = value.match(INTERFACE_REGEX);
    if (!match) {
      return value;
    }

    const [, typeRaw, first, second, third] = match;
    const type = InterfaceName.parseType(typeRaw!);

    let normalized = `${type}${first}`;
    if (second) normalized += `/${second}`;
    if (third) normalized += `/${third}`;

    return normalized;
  }

  static from(value: string): InterfaceName {
    return new InterfaceName(value);
  }

  static tryFrom(value: string): InterfaceName | null {
    try {
      return new InterfaceName(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return InterfaceName.tryFrom(value) !== null;
  }

  /**
   * Get shorthand notation (e.g., Gi0/0 for GigabitEthernet0/0)
   */
  get shorthand(): string {
    const typeMap: Record<InterfaceType, string> = {
      [InterfaceType.ETHERNET]: 'Eth',
      [InterfaceType.FASTETHERNET]: 'Fa',
      [InterfaceType.GIGABITETHERNET]: 'Gi',
      [InterfaceType.SERIAL]: 'Se',
      [InterfaceType.LOOPBACK]: 'Lo',
      [InterfaceType.VLAN]: 'Vl',
      [InterfaceType.PORTCHANNEL]: 'Po',
      [InterfaceType.TUNNEL]: 'Tu',
      [InterfaceType.NULL]: 'Nu',
    };

    const shorthand = typeMap[this.type];
    let result = `${shorthand}${this.slot}`;
    if (this.subslot !== undefined) result += `/${this.subslot}`;
    if (this.port !== undefined) result += `/${this.port}`;
    return result;
  }

  /**
   * Check if this is a physical interface (not logical)
   */
  get isPhysical(): boolean {
    return this.type !== InterfaceType.LOOPBACK &&
           this.type !== InterfaceType.VLAN &&
           this.type !== InterfaceType.PORTCHANNEL &&
           this.type !== InterfaceType.TUNNEL &&
           this.type !== InterfaceType.NULL;
  }

  /**
   * Check if this is a VLAN interface
   */
  get isVlan(): boolean {
    return this.type === InterfaceType.VLAN;
  }

  /**
   * Check if this is a loopback interface
   */
  get isLoopback(): boolean {
    return this.type === InterfaceType.LOOPBACK;
  }

  /**
   * Get VLAN ID if this is a VLAN interface
   */
  get vlanId(): number | null {
    if (!this.isVlan) return null;
    return this.slot;
  }

  equals(other: this): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}

/**
 * Parse interface name from string
 */
export function parseInterfaceName(value: string): InterfaceName {
  return InterfaceName.from(value);
}

/**
 * Parse optional interface name
 */
export function parseOptionalInterfaceName(
  value: string | null | undefined
): InterfaceName | undefined {
  if (value === null || value === undefined) return undefined;
  return parseInterfaceName(value);
}
```

- [ ] **Step 5: Create MacAddress Value Object**

```typescript
// packages/kernel/src/domain/ios/value-objects/mac-address.vo.ts

import { ValueObject } from '../../shared/base/value-object.base';
import { DomainError } from '../../shared/errors';

const MAC_REGEX_COLON = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
const MAC_REGEX_DASH = /^([0-9A-Fa-f]{2}-){5}[0-9A-Fa-f]{2}$/;
const MAC_REGEX_DOT = /^([0-9A-Fa-f]{4}\.){2}[0-9A-Fa-f]{4}$/;

/**
 * MAC Address Value Object
 * Represents a validated MAC address (48-bit)
 */
export class MacAddress extends ValueObject<string> {
  private readonly octets: [number, number, number, number, number, number];

  constructor(value: string) {
    const normalized = MacAddress.normalize(value);
    super(normalized);

    this.octets = this.parseOctets(normalized);
  }

  private static normalize(value: string): string {
    // Already normalized (colon format)
    if (MAC_REGEX_COLON.test(value)) {
      return value.toUpperCase();
    }

    // Dash format (00-11-22-33-44-55)
    if (MAC_REGEX_DASH.test(value)) {
      return value.replace(/-/g, ':').toUpperCase();
    }

    // Dot format (0011.2233.4455)
    if (MAC_REGEX_DOT.test(value)) {
      const parts = value.split('.');
      return `${parts[0]!.slice(0, 2)}:${parts[0]!.slice(2)}:${parts[1]!.slice(0, 2)}:${parts[1]!.slice(2)}:${parts[2]!.slice(0, 2)}:${parts[2]!.slice(2)}`.toUpperCase();
    }

    throw DomainError.invalidValue(
      'macAddress',
      value,
      'Invalid MAC address format. Expected: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF'
    );
  }

  private parseOctets(normalized: string): [number, number, number, number, number, number] {
    return normalized.split(':').map(h => parseInt(h, 16)) as [number, number, number, number, number, number];
  }

  static from(value: string): MacAddress {
    return new MacAddress(value);
  }

  static tryFrom(value: string): MacAddress | null {
    try {
      return new MacAddress(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return MacAddress.tryFrom(value) !== null;
  }

  /**
   * Generate a random MAC address
   */
  static random(): MacAddress {
    const octets = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
    return new MacAddress(octets.map(o => o.toString(16).padStart(2, '0')).join(':'));
  }

  /**
   * Get the first octet (OUI part 1)
   */
  get firstOctet(): number {
    return this.octets[0];
  }

  /**
   * Check if this is a unicast address
   */
  get isUnicast(): boolean {
    return (this.firstOctet & 0x01) === 0;
  }

  /**
   * Check if this is a multicast address
   */
  get isMulticast(): boolean {
    return (this.firstOctet & 0x01) === 1;
  }

  /**
   * Check if this is a broadcast address
   */
  get isBroadcast(): boolean {
    return this.octets.every(o => o === 255);
  }

  /**
   * Check if this is a locally administered address
   */
  get isLocallyAdministered(): boolean {
    return (this.firstOctet & 0x02) === 2;
  }

  /**
   * Get OUI (first 3 octets)
   */
  getOui(): string {
    return `${this.octets[0]!.toString(16).padStart(2, '0')}:${this.octets[1]!.toString(16).padStart(2, '0')}:${this.octets[2]!.toString(16).padStart(2, '0')}`.toUpperCase();
  }

  /**
   * Get NIC portion (last 3 octets)
   */
  getNic(): string {
    return `${this.octets[3]!.toString(16).padStart(2, '0')}:${this.octets[4]!.toString(16).padStart(2, '0')}:${this.octets[5]!.toString(16).padStart(2, '0')}`.toUpperCase();
  }

  /**
   * Convert to dash format (AA-BB-CC-DD-EE-FF)
   */
  toDashFormat(): string {
    return this.value.replace(/:/g, '-');
  }

  /**
   * Convert to dot format (AABB.CCDD.EEFF)
   */
  toDotFormat(): string {
    return `${this.octets[0]!.toString(16).padStart(2, '0')}${this.octets[1]!.toString(16).padStart(2, '0')}.${this.octets[2]!.toString(16).padStart(2, '0')}${this.octets[3]!.toString(16).padStart(2, '0')}.${this.octets[4]!.toString(16).padStart(2, '0')}${this.octets[5]!.toString(16).padStart(2, '0')}`.toUpperCase();
  }

  equals(other: this): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}

/**
 * Parse MAC address from string
 */
export function parseMacAddress(value: string): MacAddress {
  return MacAddress.from(value);
}
```

- [ ] **Step 6: Create value objects index**

```typescript
// packages/kernel/src/domain/ios/value-objects/index.ts

// VLAN
export {
  VlanId,
  VlanType,
  MIN_VLAN_ID,
  MAX_VLAN_ID,
  parseVlanId,
  parseOptionalVlanId,
} from './vlan-id.vo.js';

// IPv4
export {
  Ipv4Address,
  SubnetMask,
  parseIpv4Address,
  parseSubnetMask,
} from './ipv4-address.vo.js';

// Interface
export {
  InterfaceName,
  InterfaceType,
  parseInterfaceName,
  parseOptionalInterfaceName,
} from './interface-name.vo.js';

// MAC Address
export {
  MacAddress,
  parseMacAddress,
} from './mac-address.vo.js';
```

- [ ] **Step 7: Create IOS domain index**

```typescript
// packages/kernel/src/domain/ios/index.ts

// Value Objects
export * from './value-objects/index.js';

// Entities (to be added)
// export * from './entities/index.js';

// Aggregates (to be added)
// export * from './aggregates/index.js';

// Repositories (to be added)
// export * from './repositories/index.js';
```

- [ ] **Step 8: Write tests for VlanId**

Create: `packages/kernel/tests/domain/ios/value-objects/vlan-id.vo.test.ts`

```typescript
import { describe, test, expect } from 'bun:test';
import { VlanId, VlanType, parseVlanId } from '@cisco-auto/kernel/domain/ios/value-objects';

describe('VlanId', () => {
  describe('constructor', () => {
    test('creates valid VLAN ID', () => {
      const vlan = new VlanId(100);
      expect(vlan.value).toBe(100);
      expect(vlan.type).toBe(VlanType.NORMAL);
    });

    test('rejects VLAN ID 0', () => {
      expect(() => new VlanId(0)).toThrow();
    });

    test('rejects VLAN ID > 4094', () => {
      expect(() => new VlanId(4095)).toThrow();
    });

    test('rejects non-integer VLAN ID', () => {
      expect(() => new VlanId(100.5)).toThrow();
    });
  });

  describe('classification', () => {
    test('classifies default VLAN (1)', () => {
      const vlan = new VlanId(1);
      expect(vlan.type).toBe(VlanType.DEFAULT);
      expect(vlan.isDefault).toBe(true);
      expect(vlan.isConfigurable).toBe(false);
    });

    test('classifies normal VLAN (2-1001)', () => {
      const vlan = new VlanId(100);
      expect(vlan.type).toBe(VlanType.NORMAL);
      expect(vlan.isNormal).toBe(true);
      expect(vlan.isConfigurable).toBe(true);
    });

    test('classifies reserved VLAN (1002-1005)', () => {
      const vlan = new VlanId(1002);
      expect(vlan.type).toBe(VlanType.RESERVED);
      expect(vlan.isReserved).toBe(true);
    });

    test('classifies extended VLAN (1006-4094)', () => {
      const vlan = new VlanId(2000);
      expect(vlan.type).toBe(VlanType.EXTENDED);
      expect(vlan.isExtended).toBe(true);
      expect(vlan.isConfigurable).toBe(true);
    });
  });

  describe('factory methods', () => {
    test('from() creates VLAN ID', () => {
      const vlan = VlanId.from(100);
      expect(vlan.value).toBe(100);
    });

    test('fromString() parses string', () => {
      const vlan = VlanId.fromString('100');
      expect(vlan.value).toBe(100);
    });

    test('fromString() rejects invalid string', () => {
      expect(() => VlanId.fromString('abc')).toThrow();
    });

    test('tryFrom() returns null for invalid', () => {
      expect(VlanId.tryFrom(5000)).toBeNull();
      expect(VlanId.tryFrom('abc')).toBeNull();
    });

    test('tryFrom() returns VLAN ID for valid', () => {
      expect(VlanId.tryFrom(100)?.value).toBe(100);
      expect(VlanId.tryFrom('100')?.value).toBe(100);
    });

    test('isValid() checks validity', () => {
      expect(VlanId.isValid(100)).toBe(true);
      expect(VlanId.isValid(5000)).toBe(false);
      expect(VlanId.isValid('100')).toBe(true);
      expect(VlanId.isValid('abc')).toBe(false);
    });
  });

  describe('equality', () => {
    test('equals() compares by value', () => {
      const vlan1 = new VlanId(100);
      const vlan2 = new VlanId(100);
      const vlan3 = new VlanId(200);

      expect(vlan1.equals(vlan2)).toBe(true);
      expect(vlan1.equals(vlan3)).toBe(false);
    });

    test('compareTo() compares values', () => {
      const vlan1 = new VlanId(100);
      const vlan2 = new VlanId(200);

      expect(vlan1.compareTo(vlan2)).toBeLessThan(0);
      expect(vlan2.compareTo(vlan1)).toBeGreaterThan(0);
      expect(vlan1.compareTo(vlan1)).toBe(0);
    });
  });

  describe('serialization', () => {
    test('toString() returns string', () => {
      const vlan = new VlanId(100);
      expect(vlan.toString()).toBe('100');
    });

    test('toJSON() returns number', () => {
      const vlan = new VlanId(100);
      expect(vlan.toJSON()).toBe(100);
    });

    test('toNumber() returns number', () => {
      const vlan = new VlanId(100);
      expect(vlan.toNumber()).toBe(100);
    });
  });
});

describe('parseVlanId', () => {
  test('parses number', () => {
    const vlan = parseVlanId(100);
    expect(vlan.value).toBe(100);
  });

  test('parses string', () => {
    const vlan = parseVlanId('100');
    expect(vlan.value).toBe(100);
  });
});
```

- [ ] **Step 9: Run VLAN tests**

Run: `bun test packages/kernel/tests/domain/ios/value-objects/vlan-id.vo.test.ts`
Expected: All tests pass

- [ ] **Step 10: Write tests for Ipv4Address**

Create: `packages/kernel/tests/domain/ios/value-objects/ipv4-address.vo.test.ts`

```typescript
import { describe, test, expect } from 'bun:test';
import { Ipv4Address, SubnetMask, parseIpv4Address, parseSubnetMask } from '@cisco-auto/kernel/domain/ios/value-objects';

describe('Ipv4Address', () => {
  describe('constructor', () => {
    test('creates valid IPv4 address', () => {
      const ip = new Ipv4Address('192.168.1.1');
      expect(ip.value).toBe('192.168.1.1');
    });

    test('rejects invalid format', () => {
      expect(() => new Ipv4Address('256.1.1.1')).toThrow();
      expect(() => new Ipv4Address('1.1.1')).toThrow();
      expect(() => new Ipv4Address('abc.def.ghi.jkl')).toThrow();
    });
  });

  describe('address classification', () => {
    test('identifies private address', () => {
      expect(new Ipv4Address('10.0.0.1').isPrivate).toBe(true);
      expect(new Ipv4Address('172.16.0.1').isPrivate).toBe(true);
      expect(new Ipv4Address('192.168.1.1').isPrivate).toBe(true);
      expect(new Ipv4Address('8.8.8.8').isPrivate).toBe(false);
    });

    test('identifies loopback address', () => {
      expect(new Ipv4Address('127.0.0.1').isLoopback).toBe(true);
      expect(new Ipv4Address('192.168.1.1').isLoopback).toBe(false);
    });

    test('identifies multicast address', () => {
      expect(new Ipv4Address('224.0.0.1').isMulticast).toBe(true);
      expect(new Ipv4Address('192.168.1.1').isMulticast).toBe(false);
    });

    test('identifies broadcast address', () => {
      expect(new Ipv4Address('255.255.255.255').isBroadcast).toBe(true);
      expect(new Ipv4Address('192.168.1.1').isBroadcast).toBe(false);
    });

    test('identifies zero address', () => {
      expect(new Ipv4Address('0.0.0.0').isZero).toBe(true);
      expect(new Ipv4Address('192.168.1.1').isZero).toBe(false);
    });
  });

  describe('network calculations', () => {
    test('calculates network address', () => {
      const ip = new Ipv4Address('192.168.1.100');
      const mask = new SubnetMask('255.255.255.0');
      const network = ip.getNetworkAddress(mask);
      expect(network.value).toBe('192.168.1.0');
    });

    test('calculates broadcast address', () => {
      const ip = new Ipv4Address('192.168.1.100');
      const mask = new SubnetMask('255.255.255.0');
      const broadcast = ip.getBroadcastAddress(mask);
      expect(broadcast.value).toBe('192.168.1.255');
    });
  });
});

describe('SubnetMask', () => {
  describe('constructor', () => {
    test('creates valid subnet mask', () => {
      const mask = new SubnetMask('255.255.255.0');
      expect(mask.value).toBe('255.255.255.0');
      expect(mask.prefix).toBe(24);
    });

    test('rejects invalid subnet mask', () => {
      expect(() => new SubnetMask('255.0.255.0')).toThrow();
      expect(() => new SubnetMask('192.168.1.1')).toThrow();
    });
  });

  describe('from prefix length', () => {
    test('creates mask from /24', () => {
      const mask = SubnetMask.fromPrefixLength(24);
      expect(mask.value).toBe('255.255.255.0');
    });

    test('creates mask from /16', () => {
      const mask = SubnetMask.fromPrefixLength(16);
      expect(mask.value).toBe('255.255.0.0');
    });

    test('creates mask from /32', () => {
      const mask = SubnetMask.fromPrefixLength(32);
      expect(mask.value).toBe('255.255.255.255');
    });

    test('rejects invalid prefix length', () => {
      expect(() => SubnetMask.fromPrefixLength(33)).toThrow();
      expect(() => SubnetMask.fromPrefixLength(-1)).toThrow();
    });
  });

  describe('wildcard mask', () => {
    test('calculates wildcard mask', () => {
      const mask = new SubnetMask('255.255.255.0');
      expect(mask.getWildcardMask()).toEqual([0, 0, 0, 255]);
    });
  });

  describe('CIDR notation', () => {
    test('converts to CIDR', () => {
      const mask = new SubnetMask('255.255.255.0');
      expect(mask.toCidr()).toBe('/24');
    });
  });
});
```

- [ ] **Step 11: Run IPv4 tests**

Run: `bun test packages/kernel/tests/domain/ios/value-objects/ipv4-address.vo.test.ts`
Expected: All tests pass

- [ ] **Step 12: Commit value objects**

Run: `git add packages/kernel/ && git commit -m "feat(kernel): add IOS domain value objects (VlanId, Ipv4Address, InterfaceName, MacAddress)"`

---

## Phase 1 Summary

After completing Phase 1:
- Kensington package structure created
- Domain base types (ValueObject, Entity, Aggregate, DomainEvent)
- Domain errors (DomainError, ValidationError)
- Result type for functional error handling
- IOS Value Objects migrated (VlanId, Ipv4Address, SubnetMask, InterfaceName, MacAddress)
- All tests passing

## Next Steps

Phase2 will add:
- Plugin API interfaces (ProtocolPlugin, DevicePlugin, BackendPlugin)
- Plugin Registry
- Application layer (Use Cases)

Phase3 will add:
- VLAN Plugin implementation
- Backend Plugin interface

Phase4 will add:
- Packet Tracer backend plugin
- CLI refactoring

---

This is a partial plan. The complete plan would continue with Tasks for:
- Task 1.4: Create IOS Entities
- Task 1.5: Create Repository Interfaces
- Task 1.6: Create Domain Services
- Phase 2: Application Layer
- Phase 3: Plugin System
- Phase 4: Infrastructure
- Phase 5: Protocol Plugins
- Phase 6: Backend Plugins
- Phase 7: CLI Refactoring
- Phase 8: Migration
- Phase 9: Documentation
- Phase 10: Testing

Each phase would have similar detail level as Phase1 shown above.