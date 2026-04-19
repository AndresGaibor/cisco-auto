# Omni Capabilities Contract

## Propósito

Este documento formaliza los hacks descubiertos en `docs/PT_EVALUATE_HACKING_GUIDE.md` como capabilities encapsuladas con contrato, riesgo y política de soporte.

---

## Tipos de Capability

| Tipo | Descripción | Riesgo Típico |
|------|------------|----------------|
| `primitive` | Operación atómica PT (sin decisiones) | safe |
| `workflow` | Secuencia de operaciones | elevated |
| `hack` | Acceso a interna de PT no documentado | dangerous |

---

## Campos Mínimos por Capability

```typescript
interface OmniCapability {
  // Identificación
  id: string;
  domain: CapabilityDomain;
  name: string;
  description: string;

  // Clasificación
  kind: "primitive" | "workflow" | "hack";
  risk: "safe" | "elevated" | "dangerous" | "experimental";

  // Contrato
  preconditions: Precondition[];
  setup: SetupStep[];
  execute: ExecuteStep[];
  cleanup: CleanupStep[];

  // Resultado esperado
  expectedEvidence: EvidenceField[];

  // Recuperación
  fallbacks: Fallback[];
  supportPolicy: "official" | "best-effort" | "experimental";
}
```

### Definiciones

```typescript
interface CapabilityDomain {
  device: "siphon" | "serial" | "boot" | "xml";
  link: "physical" | "logical";
  module: "add" | "remove" | "inspect";
  terminal: "raw" | "assessment";
  snapshot: "full" | "delta";
  assessment: "read" | "write";
  evaluate: "raw" | "javascript";
  environment: "inspect" | "manipulate";
  process: "inspect" | "kill";
  "global-scope": "read" | "write";
}

interface Precondition {
  required: boolean;
  description: string;
}

interface SetupStep {
  order: number;
  action: string;
  code?: string;
}

interface ExecuteStep {
  order: number;
  action: string;
  code?: string;
}

interface CleanupStep {
  order: number;
  action: string;
}

interface EvidenceField {
  field: string;
  type: "string" | "number" | "boolean" | "object";
  required: boolean;
}

interface Fallback {
  condition: string;
  action: string;
}
```

---

## Riesgo Obligatorio

Cada capability debe marcar su nivel de riesgo:

| Riesgo | Descripción | Uso |
|-------|------------|-----|
| `safe` | Operación documentada, estable | Producción |
| `elevated` | Requiere cuidado, puede fallar | Producción con monitoreo |
| `dangerous` | Interna no documentada | Debugging solo |
| `experimental` | En prueba, puede cambiar | Testing |

---

## Familias de Capabilities

### Device Capabilities

| Capability | Archivo | Riesgo | Descripción |
|------------|--------|-------|-------------|
| `device.siphon` | omniscience-physical.ts | elevated | Extraer topology física |
| `device.serial` | omniscience-physical.ts | dangerous | Leer puerto serie raw |
| `device.boot` | omniscience-physical.ts | dangerous | Saltar boot |
| `device.xml` | omniscience-physical.ts | elevated | Serializar a XML |

### Link Capabilities

| Capability | Archivo | Riesgo | Descripción |
|------------|--------|-------|-------------|
| `link.physical` | omniscience-physical.ts | elevated | Leer topología física |
| `link.logical` | omniscience-logical.ts | experimental | Leer topología lógica |

### Module Capabilities

| Capability | Archivo | Riesgo | Descripción |
|------------|--------|-------|-------------|
| `module.add` | omniscience-physical.ts | safe | Añadir módulo |
| `module.remove` | omniscience-physical.ts | safe | Eliminar módulo |
| `module.inspect` | omniscience-physical.ts | elevated | Inspeccionar slot |

### Terminal Capabilities

| Capability | Archivo | Riesgo | Descripción |
|------------|--------|-------|-------------|
| `terminal.raw` | omniscience-telepathy.ts | experimental | Ejecutar raw JS |
| `terminal.assessment` | omniscience-telepathy.ts | experimental | Leer assessment |

### Assessment Capabilities

| Capability | Archivo | Riesgo | Descripción |
|------------|--------|-------|-------------|
| `assessment.read` | omniscience-telepathy.ts | dangerous | Leer assessment items |
| `assessment.write` | omniscience-telepathy.ts | dangerous | Escribir assessment |

### Environment Capabilities

| Capability | Archivo | Riesgo | Descripción |
|------------|--------|-------|-------------|
| `environment.inspect` | omniscience-environment.ts | safe | Inspeccionar entorno |
| `environment.manipulate` | omniscience-environment.ts | experimental | Manipular entorno |

### Process Capabilities

| Capability | Archivo | Riesgo | Descripción |
|------------|--------|-------|-------------|
| `process.inspect` | omniscience-environment.ts | elevated | Inspeccionar proceso |
| `process.kill` | omniscience-environment.ts | dangerous | Terminar proceso |

### Global Scope Capabilities

| Capability | Archivo | Riesgo | Descripción |
|------------|--------|-------|-------------|
| `global-scope.read` | omniscience-telepathy.ts | dangerous | Leer scope global |
| `global-scope.write` | omniscience-telepathy.ts | dangerous | Escribir scope global |

---

## Capability Detalladas

### device.siphon

```typescript
{
  id: "device.siphon",
  domain: "device",
  name: "Physical Topology Siphon",
  description: "Extrae topología física accediendo directamente a la red",
  kind: "hack",
  risk: "elevated",
  preconditions: [
    { required: true, description: "PT arrancado" },
    { required: true, description: "Dispositivos en workspace" }
  ],
  setup: [
    { order: 1, action: "Obtener referencia ipc.network()" }
  ],
  execute: [
    { order: 1, action: "Iterar dispositivos con getDeviceAt()" },
    { order: 2, action: "Para cada puerto, llamar getLink()" },
    { order: 3, action: "Mapear a formato { device:port }" }
  ],
  cleanup: [
    { order: 1, action: "Liberar referencias" }
  ],
  expectedEvidence: [
    { field: "topology", type: "array", required: true },
    { field: "deviceCount", type: "number", required: true },
    { field: "linkCount", type: "number", required: true }
  ],
  fallbacks: [
    { condition: "ipc no disponible", action: "Usar PTDevice.getX/getY" }
  ],
  supportPolicy: "best-effort"
}
```

### device.boot.skip

```typescript
{
  id: "device.boot.skip",
  domain: "device",
  name: "Skip Boot",
  description: "Salta el proceso de booteo de un dispositivo",
  kind: "hack",
  risk: "dangerous",
  preconditions: [
    { required: true, description: "Dispositivo existe" }
  ],
  setup: [
    { order: 1, action: "Obtener PTDevice con getDeviceByName()" }
  ],
  execute: [
    { order: 1, action: "Llamar device.skipBoot()" }
  ],
  cleanup: [],
  expectedEvidence: [
    { field: "booting", type: "boolean", required: true }
  ],
  fallbacks: [],
  supportPolicy: "experimental"
}
```

### terminal.assessment.read

```typescript
{
  id: "terminal.assessment.read",
  domain: "terminal",
  name: "Assessment Value Reader",
  description: "Lee valores de assessment directamente",
  kind: "hack",
  risk: "dangerous",
  preconditions: [
    { required: true, description: "Assessment inicializado" }
  ],
  setup: [],
  execute: [
    { order: 1, action: "Acceder a global.AssessmentModel" },
    { order: 2, action: "Llamar getAssessmentItemValue(itemId)" }
  ],
  cleanup: [],
  expectedEvidence: [
    { field: "value", type: "any", required: true },
    { field: "correct", type: "boolean", required: true }
  ],
  fallbacks: [
    { condition: "Assessment no disponible", action: "Parsear output CLI" }
  ],
  supportPolicy: "experimental"
}
```

---

## Política de Uso

### Runtime

- Implementa adapters para cada capability
- Expone funciones de bajo nivel
- No toma decisiones

### Control

- Decide cuándo usar capabilities
- Maneja fallbacks
- Registra evidencia

### Omni Runner

```typescript
// Ejemplo de uso en control
const capability = getCapability("device.siphon");
const result = capability.execute();

// Verificar evidencia
if (result.evidence.deviceCount !== result.evidence.linkCount + 1) {
  throw new Error("Topología inconsistente");
}
```

---

## Registro de Capabilities

Todas las capabilities registradas deben estar en:

```
packages/pt-runtime/src/handlers/omniscience-*.ts
```

Para añadir una nueva capability:

1. Definir en el documento de контракт
2. Implementar en archivo omiscience apropiado
3. Añadir a la tabla de capabilities
4. Documentar con preconditions, setup, cleanup

---

## Histórico

| Fecha | Versión | Cambios |
|------|--------|---------|
| 2026-04-19 | 1.0 | Initial omni capabilities contract |