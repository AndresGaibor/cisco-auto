# Capability Model - Fase 5

> Definición formal del modelo de capabilities para omni.

## CapabilityKind

Tipo de capability según su naturaleza:

| Valor | Descripción |
|-------|------------|
| `primitive` | Operación básica del kernel/runtime (device.add, link.add, etc.) |
| `workflow` | Secuencia de operaciones compuestas (VLAN, trunk, DHCP) |
| `hack` | Capacidad descubierta vía evaluación directa (evaluate raw, assessment, etc.) |

## CapabilityDomain

Dominio funcional de la capability:

| Valor | Descripción |
|-------|------------|
| `device` | Gestión de dispositivos (add, move, remove, rename) |
| `link` | Gestión de enlaces (create, delete) |
| `module` | Gestión de módulos (add, remove) |
| `host` | Configuración de hosts (DHCP, IP, gateway) |
| `terminal` | Sesiones IOS y terminal engine |
| `snapshot` | Captura de estado de topología |
| `assessment` | Reading de assessment items |
| `evaluate` | Evaluación de código JS |
| `environment` | Sondeo de entorno (versión PT, workspace) |
| `process` | Inspección de procesos |
| `global-scope` | Acceso a globals de PT |
| `verification` | Validación de estado |
| `diagnosis` | Diagnóstico de problemas |
| `orchestration` | Orquestación de workflows |

## CapabilityRisk

Nivel de riesgo de la capability:

| Valor | Descripción |
|-------|------------|
| `safe` | Sin efectos secundarios, repetible sin riesgo |
| `elevated` | Puede alterar estado, requiere cleanup |
| `dangerous` | Puede corromper estado o dejar residuos |
| `experimental` | Sin garantía de comportamiento |

## CapabilitySupportStatus

Estado de soporte según política:

| Valor | Descripción |
|-------|------------|
| `supported` | Múltiples corridas consistentes, evidencia suficiente, cleanup correcto |
| `partial` | Cumple parcialmente, evidencia incompleta |
| `flaky` | Resultados inconsistentes entre corridas |
| `unsupported` | No disponible o sin prerequisitos |
| `broken` | Existe pero falla estructuralmente |
| `dangerous` | Funciona pero el riesgo supera la política |

## CapabilitySpec

Especificación completa de una capability:

```typescript
interface CapabilitySpec {
  // Identificación
  id: string;                    // ID único (e.g., "device.add", "omni.evaluate.raw")
  title: string;                 // Título legible (e.g., "Add Device")

  // Clasificación
  domain: CapabilityDomain;     // Dominio funcional
  kind: CapabilityKind;         // Tipo de capability
  risk: CapabilityRisk;         // Nivel de riesgo

  // Documentación
  description: string;           // Descripción detallada
  tags: string[];               // Tags para búsqueda

  // Ciclo de vida
  prerequisites: Prerequisite[];   // Prerequisitos necesarios
  setup: CapabilityAction;          // Acción de setup (puede ser no-op)
  execute: CapabilityAction;       // Acción principal
  cleanup: CapabilityAction;       // Acción de cleanup (puede ser no-op)

  // Evidencia
  expectedEvidence: ExpectedEvidence;   // Evidencia esperada
  minEvidenceRequired: number;           // Confianza mínima para soportado

  // Política
  supportPolicy: SupportPolicy;         // Política de soporte
}
```

### Prerequisite

```typescript
interface Prerequisite {
  type: "device" | "link" | "module" | "file" | "port" | "capability";
  constraint: string;  // e.g., "R1 must exist", "port GigabitEthernet0/0 must be free"
}

interface CapabilityAction {
  type: "primitive" | "terminal" | "hack" | "workflow";
  // Definición de la acción...
}

interface ExpectedEvidence {
  fields: Record<string, { required: boolean; type: string }>;
}

interface SupportPolicy {
  minRunsForSupported: number;      // Corridas mínimas para soportado
  flakinessThreshold: number;       // Umbral de flakiness (0-1)
  timeoutMs: number;                 // Timeout máximo
}
```

## Reglas

1. **ID estable** — Toda capability debe tener un ID único y estable
2. **Cleanup obligatorio** — Toda capability debe declarar cleanup, aunque sea no-op
3. **Evidencia mínima** — Toda capability debe declarar evidencia mínima esperada
4. **Política explícita** — Toda capability debe declarar política de soporte

## Ejemplos

### device.add (primitive)

```typescript
{
  id: "device.add",
  title: "Add Device",
  domain: "device",
  kind: "primitive",
  risk: "safe",
  description: "Agregar un dispositivo a la topología",
  prerequisites: [],
  setup: { type: "noop" },
  execute: { type: "primitive", handler: "handleAddDevice" },
  cleanup: { type: "primitive", handler: "handleRemoveDevice" },
  expectedEvidence: { fields: { name: { required: true, type: "string" } } },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.1, timeoutMs: 10000 }
}
```

### omni.evaluate.raw (hack)

```typescript
{
  id: "omni.evaluate.raw",
  title: "Evaluate Raw JS",
  domain: "evaluate",
  kind: "hack",
  risk: "dangerous",
  description: "Evaluar código JS directamente en el motor C++ de PT",
  prerequisites: [{ type: "capability", constraint: "scriptEngine must be available" }],
  setup: { type: "noop" },
  execute: { type: "hack", adapter: "evaluateExpression" },
  cleanup: { type: "noop" },
  expectedEvidence: { fields: { result: { required: true, type: "any" } } },
  supportPolicy: { minRunsForSupported: 2, flakinessThreshold: 0.2, timeoutMs: 5000 }
}
```

### vlan.simple (workflow)

```typescript
{
  id: "vlan.simple",
  title: "VLAN Simple",
  domain: "orchestration",
  kind: "workflow",
  risk: "elevated",
  description: "Crear VLAN y asignar puertos",
  prerequisites: [
    { type: "device", constraint: "Switch must exist" }
  ],
  setup: { type: "noop" },
  execute: { type: "workflow", plan: "vlanSimplePlan" },
  cleanup: { type: "workflow", plan: "vlanSimpleCleanup" },
  expectedEvidence: {
    fields: {
      vlanCreated: { required: true, type: "boolean" },
      portsAssigned: { required: true, type: "number" }
    }
  },
  supportPolicy: { minRunsForSupported: 3, flakinessThreshold: 0.15, timeoutMs: 30000 }
}
```