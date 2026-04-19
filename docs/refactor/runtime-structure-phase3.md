# Runtime Structure Phase 3 — Estructura Destino de pt-runtime

## Problema Actual

Hoy `pt-runtime` mezcla:

- lifecycle del kernel
- handlers PT operativos
- lógica IOS parcial
- configuración compuesta
- hacks descubiertos
- generación/build
- exports ambiguos

## Estructura Objetivo

```
packages/pt-runtime/src/
├── kernel/          # Bootstrap, dispatch, ciclo de ejecución
├── terminal/       # Sesiones, executor, mode guard, pager, plan engine
├── primitives/     # Acceso PT bajo nivel por dominios
│   ├── device/
│   ├── link/
│   ├── module/
│   ├── host/
│   ├── snapshot/
│   └── index.ts
├── omni/           # Adapters de hacks/capabilities
│   ├── evaluate-adapter.ts
│   ├── assessment-adapter.ts
│   ├── global-scope-adapter.ts
│   ├── process-adapter.ts
│   ├── environment-adapter.ts
│   └── index.ts
├── catalog/        # Metadata estática
├── contracts/       # Tipos públicos
├── compat/         # Validación PT-safe
└── build/          # Generación de assets
```

---

## Responsabilidades por Carpeta

### kernel/

- Bootstrap runtime
- Dispatch base
- Ciclo de ejecución
- Integración con queue PT-side
- Cleanup
- Estado mínimo global del runtime

### terminal/

- Sesiones persistentes
- Executor basado en eventos
- Mode guard
- Pager handler
- Plan engine
- Evidencia terminal

### primitives/

Acceso PT de bajo nivel por dominios concretos:

- **device/** — add, remove, rename, move, inspect, list-ports, open-command-line
- **link/** — add, remove, inspect
- **module/** — add, remove, inspect-slots
- **host/** — set-ip, set-gateway, set-dns, set-dhcp
- **snapshot/** — topology, raw-port, process, hardware-info

### omni/

Adapters de hacks descubiertos:

- **evaluate-adapter** — scriptEngine.evaluate
- **assessment-adapter** — AssessmentModel access
- **global-scope-adapter** — global scope access
- **process-adapter** — Process inspection
- **environment-adapter** — Environment inspection

### catalog/

- Modelos PT conocidos
- Nombres de interfaces normalizadas
- Compatibilidad de módulos
- Compatibilidad de cables
- Tiposconstants
- Tablas de alias de puertos

### contracts/

- Request/result de primitives
- Request/result de omni adapters
- Terminal plan types
- Enums o IDs de primitive

### compat/

- Validación PT-safe
- Compatibilidad ES5
- Restricciones del runtime

### build/

- Generación de main.js, runtime.js, catalog.js
- Validación del asset generado

---

## Anti-Patrons Prohibidos

1. **Business logic en primitives** — Una primitive es operación atómica, no compuesto
2. **Verify/diagnosis semántico en omni** — Omni es capacidad, no decisión de negocio
3. **Parsers altos en catalog** — Catalog es metadata estática
4. **Exports públicos de internals inestables** — API pública debe ser estable

---

## Registry Obligatorio

### primitive-registry.ts

Cada primitive debe registrarse con:

```typescript
interface PrimitiveDescriptor {
  id: string;
  domain: "device" | "link" | "module" | "host" | "snapshot";
  execute: (payload, context) => PrimitiveResult;
  validatePayload: (payload) => boolean;
}
```

### omni-registry.ts

Cada adapter debe registrarse con:

```typescript
interface OmniAdapterDescriptor {
  id: string;
  domain: string;
  risk: "safe" | "elevated" | "dangerous" | "experimental";
  prerequisites: string[];
  supportedPayloads: string[];
  execute: (payload, context) => OmniResult;
  cleanup?: (context) => void;
}
```

---

## Exports Públicos del Root

Lo que DEBE exportar `pt-runtime/src/index.ts`:

```typescript
// Contracts
export * from "./contracts";

// Catalog
export * from "./catalog";

// Compat (validadores públicos)
export * from "./compat";

// Build public API
export * from "./build";

// Primitives (solo las estables)
export * from "./primitives";

// Omni (solo adapters aprobados)
export * from "./omni";
```

Lo que NO DEBE exportar (internals):

- `kernel/*` internos
- `terminal/*` internos
- wrappers legacy no documentados
- handlers de negocio compuestos

---

## Histórico

| Fecha | Versión | Cambios |
|------|--------|---------|
| 2026-04-19 | 1.0 | Initial runtime structure |