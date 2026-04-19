# Runtime Public API Phase 3 — API Pública de pt-runtime

## Propósito

Este documento declara qué exporta públicamente `pt-runtime` y qué NO debe exportarse.

## Família 8.1 — Contracts

### Request/Result de Primitives

```typescript
interface DevicePrimitiveResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}

interface LinkPrimitiveResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}

interface ModulePrimitiveResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}

interface HostPrimitiveResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}

interface SnapshotPrimitiveResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}
```

### Request/Result de Omni Adapters

```typescript
interface OmniResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}
```

### Tipos de Terminal Plan

```typescript
interface TerminalPlan {
  id: string;
  device: string;
  steps: TerminalPlanStep[];
  policies?: TerminalPlanPolicies;
}

interface TerminalPlanStep {
  type: "command" | "expect" | "confirm" | "wait";
  value: string;
  options?: Record<string, unknown>;
}

interface TerminalPlanPolicies {
  timeout?: number;
  stopOnError?: boolean;
  maxRetries?: number;
}
```

### Command Execution

```typescript
interface CommandExecutionResult {
  ok: boolean;
  command: string;
  status: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  promptBefore: string;
  promptAfter: string;
  modeBefore: TerminalMode;
  modeAfter: TerminalMode;
  output: string;
  events: TerminalEventRecord[];
  warnings: string[];
  error?: string;
  code?: string;
  confidence: number;
}
```

### Terminal Modes

```typescript
type TerminalMode = 
  | "unknown" 
  | "user-exec" 
  | "privileged-exec" 
  | "global-config" 
  | "config-if" 
  | "config-line" 
  | "config-router" 
  | "config-vlan" 
  | "config-subif" 
  | "wizard" 
  | "confirm" 
  | "pager" 
  | "boot";
```

### Execution Options

```typescript
interface ExecutionOptions {
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
  expectedMode?: TerminalMode;
  autoAdvancePager?: boolean;
  autoDismissWizard?: boolean;
  maxPagerAdvances?: number;
}
```

## Família 8.2 — Catalog

### PT Device Types

```typescript
const PT_DEVICE_TYPE = {
  router: 0,
  switch: 1,
  hub: 2,
  pc: 8,
  server: 9,
  multilayerSwitch: 16,
  firewall: 27,
  iot: 34,
};
```

### PT Cable Types

```typescript
const PT_CABLE_TYPE = {
  auto: -1,
  straight: 0,
  cross: 1,
  fiber: 2,
  serial: 3,
  console: 4,
  phone: 5,
  wireless: 8,
};
```

### Terminal Event Names

```typescript
type PTTerminalEventName = 
  | "commandStarted" 
  | "outputWritten" 
  | "commandEnded" 
  | "modeChanged" 
  | "promptChanged" 
  | "moreDisplayed";
```

## Família 8.3 — Build Public API

### Generator

```typescript
class RuntimeGenerator {
  config: RuntimeGeneratorConfig;

  generateMain(): string;
  generateCatalog(): string;
  generateRuntime(): string;
  generate(): Promise<{ main: string; catalog: string; runtime: string }>;
  validateGenerated(): Promise<void>;
  deploy(): Promise<void>;
  build(): Promise<RuntimeBuildReport>;
}
```

### Validator

```typescript
function validatePtSafe(code: string): ValidationResult;

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: ValidationSummary;
}
```

### Render Functions

```typescript
function renderRuntimeV2(options: RenderRuntimeV2Options): Promise<string>;
function renderRuntimeV2Sync(options: RenderRuntimeV2Options): string;
function renderMainV2(options: RenderMainV2Options): string;
function renderCatalog(options: RenderCatalogOptions): string;
```

## Família 8.4 — Compat

### PT-Safe Validators

```typescript
function isValidDeviceName(name: string): boolean;
function isValidInterfaceName(name: string): boolean;
function isValidIpAddress(ip: string): boolean;
function normalizePortName(name: string): string;
```

---

## Exports NO Públicos

Estos NO deben exportarse desde `src/index.ts`:

### Kernel Internals

- Estados internos del kernel
- Lease manager
- Command queue internals

### Terminal Internals

- Sessión registry interno
- Mode guard state
- Pager state

### Legacy Wrappers

- Handlers legacy transitorios
- Wrappers de compatibilidad

### Experimental

- Adapters no aprobados

---

## Histórico

| Fecha | Versión | Cambios |
|--------|---------|----------|
| 2026-04-19 | 1.0 | Initial public API contract |