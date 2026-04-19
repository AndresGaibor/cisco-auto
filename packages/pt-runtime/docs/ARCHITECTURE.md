# PT Runtime Architecture

## Overview

`@cisco-auto/pt-runtime` is a TypeScript library that generates PT-safe JavaScript for execution inside Cisco Packet Tracer's QtScript engine.

## Architecture Diagram

```
Lab YAML → @cisco-auto/core → Command Files → @cisco-auto/file-bridge
    ↓
@cisco-auto/pt-runtime:
  TypeScript Handlers + Kernel + Terminal Engine
    ↓ transformToPtSafeAst()
  ES5-compatible JavaScript (runtime.js + main.js)
    ↓ deploy()
  PT Script Module → QtScript Engine → Packet Tracer
```

## Command Flow

1. **Lab YAML** → `@cisco-auto/core` parses configuration
2. **Command Files** → Written to filesystem via `@cisco-auto/file-bridge`
3. **PT Script Module** → Heartbeat detects new command files
4. **main.js** → Reads command file, calls runtime
5. **runtime.js** → Dispatcher routes to appropriate handler
6. **Handler** → Executes PT API calls via IPC
7. **Result** → Written back via file-bridge
8. **Return** → Result object returned to PT Script Module

## Directory Structure

```
packages/pt-runtime/src/
├── build/              # Build pipeline
│   ├── ast-transform.ts      # TypeScript → ES5 transpiler
│   ├── validate-pt-safe.ts    # PT safety validation
│   ├── render-runtime-v2.ts   # Bundle generator
│   └── runtime-manifest.ts   # File manifest
├── core/               # Core runtime
│   ├── dispatcher.ts         # Command dispatcher
│   ├── middleware.ts         # Middleware pipeline
│   ├── built-in-middleware.ts # Logging, metrics, validation
│   └── plugin-api.ts         # Plugin system
├── handlers/           # Command handlers
│   ├── device.handler.ts    # addDevice, removeDevice, etc.
│   ├── link.handler.ts      # addLink, removeLink
│   ├── config.handler.ts     # configIos, execIos
│   └── runtime-handlers.ts   # Core handlers (dispatcher entry)
├── runtime/            # Runtime utilities
│   ├── logger.ts            # Structured logging
│   ├── metrics.ts           # Metrics collection
│   ├── payload-validator.ts # Security validation
│   ├── pt-version.ts        # PT version detection
│   └── feature-flags.ts     # Feature flags
├── pt/                 # PT-specific code
│   ├── kernel/          # PT kernel
│   └── terminal/        # Terminal emulation
└── pt-api/             # PT API types
```

## Key Components

### Dispatcher

The dispatcher (`runtimeDispatcher`) is the entry point for all commands:

```typescript
function runtimeDispatcher(payload, api) {
  const handler = HANDLER_MAP.get(payload.type);
  if (!handler) {
    return { ok: false, error: "Unknown command type" };
  }
  return handler(payload, api);
}
```

### Middleware Pipeline

Middleware provides cross-cutting concerns:

1. **errorRecoveryMiddleware** - Catches exceptions
2. **rateLimitMiddleware** - Prevents command flooding
3. **loggingMiddleware** - Structured logging
4. **metricsMiddleware** - Metrics collection
5. **validationMiddleware** - Payload validation

### PtLogger

Structured JSON logging compatible with QtScript:

```typescript
const log = getLogger("device").withDevice("Router1");
log.info("Operation completed", { duration: 123 });
// Outputs: {"ts":"...","level":"info","logger":"device","msg":"Operation completed","device":"Router1","data":{"duration":123}}
```

### Payload Validator

Runtime validation prevents injection attacks:

- Size limits (64KB max)
- Prototype pollution check
- IOS command sanitization
- Path traversal prevention

## PT Safety

The generated JavaScript must be PT-safe:

- **No ES6+ syntax** (arrow functions, template literals, etc.)
- **No imports/exports** (all code is bundled)
- **No console** (use dprint instead)
- **No process/BigInt/Buffer** (not available in QtScript)
- **ES5 compatible** (var, function expressions, etc.)

## Build Pipeline

```
TypeScript Source Files
    ↓
Runtime Manifest (files list)
    ↓
AST Transform (strip imports, transpile to ES5)
    ↓
Post-Processing (const→var, ??→||, ?.→&&)
    ↓
Validation (PT safety check)
    ↓
Bundle (runtime.js)
```

## Version Compatibility

The runtime supports PT 7.x through 8.x via:

1. **Capability probing** - Detects available methods at runtime
2. **Feature flags** - Enables/disables features based on PT version
3. **Graceful degradation** - Falls back when methods unavailable

## Security

- All payloads validated before dispatch
- IOS commands sanitized against injection patterns
- Prototype pollution blocked via safe JSON parsing
- Rate limiting prevents DoS
