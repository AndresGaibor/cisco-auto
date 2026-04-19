# Runtime-Control Boundary

## Propósito

Este documento establece la frontera arquitectónica oficial entre `pt-runtime` y `pt-control`. El objetivo es separar claramente:

- **Ejecución PT embebida** (`pt-runtime`): lifecycle, dispatch, terminal engine, primitives PT-safe
- **Semántica/Orquestación** (`pt-control`): planners, workflows, diagnosis, verification, policies
- **Validación/Capabilities** (`pt-control`): evidence evaluation, fallback strategies

## Motivación

### Estado Actual Problemas Identificados

1. **Mezcla de arquitecturas**: El asset desplegado actualmente sigue corriendo con `command.json`, polling simple y hot-reload de `runtime.js`. Esto prueba que el sistema todavía mezcla arquitectura legacy y arquitectura objetivo.

2. **Falsos positivos en IOS**: La capa IOS actual produce éxitos sintéticos porque trata `enterCommand()` como si devolviera resultado síncrono, cuando la ejecución depende de eventos y evidencia posterior.

3. **Diseño interno ya empuja separación**: Ya existe una línea interna de diseño donde `main.js` es kernel y `runtime.js` debe mantener contrato puro, sin tocar scheduler ni detalles de cola.

## Responsabilidades de `pt-runtime`

### Lista Cerrada

`pt-runtime` solo puede contener:

| Responsable | Descripción |
|-------------|-------------|
| `main.js` / lifecycle kernel | Boot, shutdown, lease, heartbeat |
| dispatch primitivo | receive → dispatch → response |
| cola/ejecución PT-side | Command queue polling, claim, execute |
| terminal engine | Apertura de sesión, ejecución de comandos, parsing de prompts |
| acceso a objetos PT | `ipc.network()`, `ipc.appWindow()`, device APIs |
| primitives de device/link/module/host/snapshot | CRUD atómico bajo nivel |
| adapters `omni` de bajo nivel | Evaluación raw, assessment reading, environment inspection |
| catálogo de modelos/capacidades | Validación de modelos soportados |
| build/compat PT-safe | Generación ES5-compatible, validación de sintaxis |

### Exports Públicos Permitidos

```typescript
// pt-runtime/src/index.ts — exports válidos
export * from "./contracts/pt-compatibility.js";
export * from "./domain";           // RuntimeResult, DeferredJobPlan
export * from "./runtime";        // Runtime types, contracts
export * from "./core";           // Middleware, registry
export * from "./handlers";        // Primitive handlers (device, link, vlan, dhcp)
export * from "./pt/kernel";      // Kernel, queue, lease, heartbeat
export * from "./pt/terminal";   // Terminal engine, session state
export { validatePtSafe } from "./build/validate-pt-safe";
export { renderRuntimeV2, renderMainV2, renderCatalog };
export { RuntimeGenerator, ModularRuntimeGenerator };
```

## Responsabilidades de `pt-control`

### Lista Abierta ( Alto Nivel)

`pt-control` contiene:

| Responsable | Descripción |
|-------------|-------------|
| intent resolution | Parseo de intents de usuario a operaciones |
| planners | Construcción de planes de cambio de topología |
| orchestration | Coordinación multi-dispositivo |
| diagnosis | Análisis de problemas, drift detection |
| verification | Validación semántica de configuraciones |
| policy | Terminal policies, session arbiter |
| fallback | Estrategias de recovery |
| omni capability runner | Harness de capacidades omni/hacks |
| evidence evaluation | Análisis de resultados IOS |

## Ejemplos Concretos

| Función/Idea | Vive en runtime | Vive en control |
|--------------|---------------:|----------------:|
| abrir terminal | sí | no |
| ejecutar comando terminal | sí | no |
| decidir comandos IOS para trunk | no | sí |
| configurar VLAN end-to-end | no | sí |
| leer assessment raw | sí | no |
| decidir usar assessment vs CLI | no | sí |
| listar puertos PT | sí | no |
| verificar que topología cumple escenario | no | sí |
| ejecutar plan deferred | sí | no |
| construir plan deferred | no | sí |
| detectar drift de topología | no | sí |
| resolver capacidades de dispositivo | no | sí |

## Anti-Patrones Prohibidos

### Queda explícitamente prohibido en runtime:

1. **Verificación semántica**: No se permite validar que una configuración cumple un escenario de negocio.
2. **Acceso directo a hacks sin contrato**: Cualquier uso de `omni` debe pasar por adapters con contrato.
3. **Mezcla de parsing semántico con ejecución**: El parsing de outputs complejos va en control.
4. **Éxito sin evidencia**: Todo resultado debe incluir evidencia verificable.
5. **Hot reload como lifecycle**: No usar hot-reload de `runtime.js` como reemplazo del lifecycle real.
6. **Scheduler de cola en runtime**: No gestionar colas de jobs complejos en runtime.

### Queda explícitamente prohibido en control:

1. **Acceso directo a internals PT sin contrato runtime**: Siempre pasar por primitives runtime.
2. **Hacks fuera de capability/adapters**: Usar el harness `omni` oficiales.

## Reglas de Migration

### Regla 1: Principio de Responsabilidad Única

Cada handler, servicio o módulo debe tener una responsabilidad clara y vivir en el paquete correcto.

### Regla 2: Contrato de Primitive

Toda primitive en runtime debe devolver:

```typescript
interface PrimitiveResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}
```

### Regla 3: Capability Encapsulation

Todo hack/capability `omni` debe documentarse con:

- `id`: identificador único
- `domain`: familia (device, link, terminal, etc.)
- `risk`: safe | elevated | dangerous | experimental
- `preconditions`: qué debe estar dado de alta antes
- `setup`: cómo inicializar
- `execute`: cómo ejecutar
- `cleanup`: qué dejar al terminar
- `expectedEvidence`: qué evidencia se espera
- `fallbacks`: estrategias alternativas

---

## Histórico

| Fecha | Versión | Cambios |
|------|---------|---------|
| 2026-04-19 | 1.0 | Initial boundary definition |