# Ports y Adapters — Phase 4

> Documentación de los puertos del Orchestrator y cómo los adapters los consumen.

## Propósito

Esta arquitectura sigue el patrón **Ports & Adapters** (Hexagonal Architecture) donde el núcleo de negocio (`pt-control`) define interfaces abstractas (puertos) y las implementaciones concretas (adapters) se inyectan desde fuera. Esto permite reemplazar adapters sin modificar la lógica de negocio.

## Puertos Definidos

### 1. RuntimePrimitivePort

Puerto para primitivas del runtime de Packet Tracer. Abstrae la ejecución de operaciones atómicas sobre dispositivos PT.

#### Interfaz

```typescript
export interface RuntimePrimitivePort {
  runPrimitive(id: string, payload: unknown, options?: PrimitivePortOptions): Promise<PrimitivePortResult>;
  validatePayload(id: string, payload: unknown): boolean;
  getPrimitiveMetadata(id: string): Record<string, unknown> | null;
}
```

#### Métodos

| Método | Responsabilidad |
|--------|---------------|
| `runPrimitive(id, payload, options)` | Ejecuta una primitiva específica. Retorna `PrimitivePortResult` con `ok`, `value`, `error`, `warnings`, `evidence`, `confidence`. |
| `validatePayload(id, payload)` | Valida que el payload sea correcto para la primitiva dada. Retorna `boolean`. |
| `getPrimitiveMetadata(id)` | Retorna metadatos de la primitiva (dominio, riesgo). |

#### Opciones y Resultado

```typescript
export interface PrimitivePortOptions {
  timeoutMs?: number;
  retries?: number;
}

export interface PrimitivePortResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}
```

#### Primitivas Disponibles

| ID | Dominio | Riesgo | Descripción |
|----|--------|--------|------------|
| `device.add` | device | safe | Añadir dispositivo a la topología |
| `device.remove` | device | safe | Eliminar dispositivo |
| `device.list` | device | safe | Listar dispositivos |
| `link.add` | link | safe | Crear enlace entre dispositivos |
| `link.remove` | link | safe | Elimiar enlace |
| `module.add` | module | elevated | Añadir módulo a dispositivo |
| `module.remove` | module | elevated | Remover módulo |
| `host.setIp` | host | safe | Configurar IP en host |
| `snapshot.topology` | snapshot | safe | Capturar estado de topología |
| `snapshot.hardware` | snapshot | safe | Capturar información de hardware |

---

### 2. RuntimeTerminalPort

Puerto para terminal interactiva del runtime. Abstrae la ejecución de planes de terminal (secuencias de comandos IOS).

#### Interfaz

```typescript
export interface RuntimeTerminalPort {
  runTerminalPlan(plan: TerminalPlan, options?: TerminalPortOptions): Promise<TerminalPortResult>;
  openSession(device: string): Promise<SessionResult>;
  closeSession(device: string): Promise<SessionResult>;
  querySessionState(device: string): Promise<SessionStateResult | null>;
}
```

#### Métodos

| Método | Responsabilidad |
|--------|---------------|
| `runTerminalPlan(plan, options)` | Ejecuta una secuencia de comandos IOS. Cada paso tiene comando, prompt esperado, y timeout. Retorna `TerminalPortResult` con output agregado. |
| `openSession(device)` | Abre una sesión interactiva en el dispositivo. Retorna `SessionResult` con `sessionId`. |
| `closeSession(device)` | Cierra la sesión abierta. |
| `querySessionState(device)` | Consulta estado de la sesión (modo actual, último prompt). |

#### Opciones y Resultado

```typescript
export interface TerminalPortOptions {
  timeoutMs?: number;
  stallTimeoutMs?: number;
}

export interface TerminalPortResult {
  ok: boolean;
  output: string;
  status: number;
  promptBefore: string;
  promptAfter: string;
  modeBefore: string;
  modeAfter: string;
  events: any[];
  warnings: string[];
  confidence: number;
}
```

#### Estructura de Plan

```typescript
export interface TerminalPlan {
  id: string;
  device: string;
  steps: TerminalPlanStep[];
}

export interface TerminalPlanStep {
  command: string;
  expectedPrompt?: string;
  timeout?: number;
}
```

---

### 3. RuntimeOmniPort

Puerto para capacidades Omni (acceso de bajo nivel al kernel de PT). Permite operaciones privilegiadas y acceso directo a la memoria del simulador.

#### Interfaz

```typescript
export interface RuntimeOmniPort {
  runOmniCapability(id: string, payload: unknown, options?: OmniPortOptions): Promise<OmniPortResult>;
  getAdapterMetadata(id: string): OmniAdapterMetadata | null;
  getPrerequisites(id: string): string[];
}
```

#### Métodos

| Método | Responsabilidad |
|--------|---------------|
| `runOmniCapability(id, payload, options)` | Ejecuta una capability privilegio. Requiere nivel de riesgo suficiente. Retorna `OmniPortResult`. |
| `getAdapterMetadata(id)` | Retorna metadata del adapter (id, dominio, riesgo, descripción). |
| `getPrerequisites(id)` | Retorna lista de prerequisitos para usar el adapter. |

#### Opciones y Resultado

```typescript
export interface OmniPortOptions {
  risk?: OmniRisk;
  timeoutMs?: number;
}

export interface OmniPortResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence: number;
}

export type OmniRisk = "safe" | "elevated" | "dangerous" | "experimental";
export type OmniDomain = "script" | "assessment" | "scope" | "process" | "app" | "device";
```

#### Adapters Disponibles

| ID | Dominio | Riesgo | Descripción | Prerrequisitos |
|----|--------|--------|-----------|---------------|
| `omni.evaluate` | script | dangerous | Evaluar código arbitrario | ninguno |
| `omni.siphon` | assessment | elevated | Leer assessment items | assessment |
| `omni.global` | scope | safe | Acceder a globals de PT | ninguno |
| `omni.process` | process | elevated | Obtener procesos | device |
| `omni.environment` | app | safe | Info del environment | ninguno |
| `omni.serialize` | device | safe | Serializar dispositivo | device |

#### Gate de Riesgo

El puerto implementa un gate que bloquea capacidades de riesgo superior al especificado:

```typescript
const riskGates: Record<OmniRisk, boolean> = {
  safe: true,
  elevated: risk === "elevated" || risk === "safe",
  dangerous: risk === "dangerous",
  experimental: false,
};
```

---

## Cómo los Adapters Usan los Puertos

### OrchestratorContext

El `Orchestrator` recibe los tres puertos en su contexto:

```typescript
export interface OrchestratorContext {
  primitivePort: RuntimePrimitivePort;
  terminalPort: RuntimeTerminalPort;
  omniPort: RuntimeOmniPort;
  planner: Planner;
  verifier: Verifier;
  diagnoser: Diagnoser;
  fallbackPolicy: FallbackPolicy;
}
```

Los puertos se crean fábrica y seinjectan:

```typescript
export function createOrchestrator(config: OrchestratorConfig): OrchestratorContext {
  return {
    primitivePort: createPrimitivePort({ defaultTimeout: config.defaultTimeout }),
    terminalPort: createTerminalPort({ defaultTimeout: config.defaultTimeout }),
    omniPort: createOmniPort({ defaultTimeout: config.defaultTimeout }),
    planner: createDefaultPlanner(),
    verifier: createDefaultVerifier(),
    diagnoser: createDefaultDiagnoser(),
    fallbackPolicy: createDefaultFallbackPolicy(),
  };
}
```

### Ejecución de Pasos

El flujo de ejecución consume los puertos según el tipo de paso:

```typescript
for (const step of plan.steps) {
  switch (step.kind) {
    case "primitive": {
      const result = await orchestrator.primitivePort.runPrimitive(
        step.runtimePrimitiveId!,
        step.payload
      );
      break;
    }
    case "terminal-plan": {
      const result = await orchestrator.terminalPort.runTerminalPlan(step.terminalPlan!);
      break;
    }
    case "omni-capability": {
      const result = await orchestrator.omniPort.runOmniCapability(
        step.omniCapabilityId!,
        step.payload
      );
      break;
    }
  }
}
```

### Validation de Payload

Antes de ejecutar, adapters pueden validar el payload:

```typescript
const isValid = orchestrator.primitivePort.validatePayload("device.add", payload);
if (!isValid) {
  throw new Error("Payload inválido para device.add");
}
```

### Consulta de Metadata

Para auditing o decisiones:

```typescript
const metadata = orchestrator.primitivePort.getPrimitiveMetadata("module.add");
// { domain: "module", risk: "elevated" }

const omniMeta = orchestrator.omniPort.getAdapterMetadata("omni.evaluate");
// { id: "omni.evaluate", domain: "script", risk: "dangerous", description: "Evaluar código arbitrario" }
```

---

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────┐
│              Orchestrator (Negocio)                  │
│  ┌─────────────────────────────────────────────┐   │
│  │  Intent → Plan → Execution → Verdict          │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ PrimitivePort │ │ TerminalPort │ │  OmniPort    │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │              │              │
        ▼              ▼              ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   Adapter    │ │   Adapter    │ │   Adapter    │
│  (runtime)  │ │ (terminal)  │ │   (omni)    │
└───────────────┘ └───────────────┘ └───────────────┘
        │              │              │
        ▼              ▼              ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  PT Kernel  │ │  IOS CLI    │ │  PT Global  │
│  (main.js) │ │  Console   │ │   Scope    │
└───────────────┘ └───────────────┘ └───────────────┘
```

## Casos de Uso

| Caso | Puerto Usado | Método |
|------|------------|--------|
| Añadir dispositivo | PrimitivePort | `runPrimitive("device.add", { name: "R1", model: "2911" })` |
| Configurar VLAN en switch | TerminalPort | `runTerminalPlan(vlanPlan)` |
| Obtener tabla MAC | OmniPort | `runOmniCapability("omni.siphon", { type: "mac-table" })` |
| Listar dispositivos | PrimitivePort | `runPrimitive("device.list", {})` |
| Serializar dispositivo | OmniPort | `runOmniCapability("omni.serialize", { device: "R1" })` |

## Notas de Implementación

- **Puerto no es implementación**: Cada puerto define una interfaz abstracta. Las implementaciones concretas (`createPrimitivePort`, `createTerminalPort`, `createOmniPort`) son los adapters.
- **Timeout configurable**: Todos los puertos aceptan `defaultTimeout` en su fábrica.
- **Risk gates en OmniPort**: El puerto valida que el riesgo solicitado sea menor o igual al permitido.
- **Validation integrada**: El `PrimitivePort` incluye validadores para cada primitiva conocida.
- **Metadata para auditing**: Los puertos exponen metadatos para logging, debugging, y políticas.