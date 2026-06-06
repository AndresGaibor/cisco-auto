# AGENTS.md — @cisco-auto/network-intent

> Guía de desarrollo para agentes de IA que trabajan en network-intent.

## Propósito

Declarar, validar y compilar intenciones de red (labs) en planes de configuración IOS.

## Arquitectura

```
src/
├── index.ts                # Barrel
├── schema.ts               # Schemas Zod: NetworkLabIntentSchema
├── compiler.ts             # compileLabIntent() → CompiledLabPlan
├── validator.ts            # validateLabIntent(yamlContent) → ValidationResult
├── model/
│   ├── lab-spec.ts         # Modelo de especificación (513 lines)
├── validators/
│   ├── lab-validator.ts    # Validaciones semánticas de red
├── scenarios/
│   ├── lab-plan-types.ts   # Tipos de planes por escenario
└── examples/
```

## Exports principales

```typescript
export { NetworkLabIntentSchema, type NetworkLabIntent } from "./schema.js";
export { compileLabIntent, type CompiledLabPlan, type LabStep } from "./compiler.js";
export { validateLabIntent } from "./validator.js";
```

## Reglas

- Schema-driven: el contrato está en `schema.ts`.
- Compiler produce `CompiledLabPlan` con steps para prechecks, build, config, verification, rollback.
- No depende de Packet Tracer ni del bridge.
- Dependencias: `zod` solamente.
