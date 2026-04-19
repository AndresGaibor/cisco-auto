# Runtime Omni Adapters Phase 3 — Contrato de Omni Adapters

## Propósito

Este documento define el contrato oficial para omni adapters en `pt-runtime`. Todo hack, bypass o capacidad descubierta por reverse engineering debe formalizarse como omni adapter seguindo este contrato.

## Definición de Omni Adapter

Un omni adapter es una abstracción que encapsula:

- Evaluación de código arbitrario (`evaluate`)
- Lectura de assessment items (`siphon`)
- Acceso a global scope de PT
- Control de procesos
- Inspección de environment
- Serialización de dispositivos
- Otras capacidades descubiertas por reverse engineering

## Contrato de Omni Adapter

### Interfaz pública

```typescript
interface OmniAdapter {
  readonly id: string;
  readonly domain: string;
  readonly risk: OmniRisk;
  readonly prerequisites?: string[];

  execute(payload: unknown, context: OmniContext): Promise<OmniResult>;
  cleanup?(context: OmniContext): void;
}

type OmniRisk = "safe" | "elevated" | "dangerous" | "experimental";
```

### OmniResult

```typescript
interface OmniResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence: number;
}
```

### OmniContext

```typescript
interface OmniContext {
  ipc: PTIpc;
  global: GlobalScope;
  assessment?: AssessmentModel;
  app?: PTAppWindow;
  device?: PTDevice;
}
```

## Omni Adapters Existentes

### Evaluate Adapter

- **ID**: `omni.evaluate`
- **Domain**: `script`
- **Risk**: `dangerous`
- **Prerequisites**: Ninguno

```typescript
function evaluateExpression(code: string, global: any): OmniResult
```

### Assessment Adapter

- **ID**: `omni.siphon`
- **Domain**: `assessment`
- **Risk**: `elevated`
- **Prerequisites**: AssessmentModel disponible

```typescript
function getAssessmentItem(itemId: string, assessment: any): OmniResult
```

### Global Scope Adapter

- **ID**: `omni.global`
- **Domain**: `scope`
- **Risk**: `safe`
- **Prerequisites**: Ninguno

```typescript
function accessGlobal(key: string, global: any): OmniResult
```

### Process Adapter

- **ID**: `omni.process`
- **Domain**: `process`
- **Risk**: `elevated`
- **Prerequisites**: Device con capacidad de procesos

```typescript
function getProcess(name: string, device: any): OmniResult
```

### Environment Adapter

- **ID**: `omni.environment`
- **Domain**: `app`
- **Risk**: `safe`
- **Prerequisites**: Ninguno

```typescript
function getEnvironmentInfo(app: any): OmniResult
```

### Serialize Adapter

- **ID**: `omni.serialize`
- **Domain**: `device`
- **Risk**: `safe`
- **Prerequisites**: Ninguno

```typescript
function serializeDevice(device: any): OmniResult
```

## Anti-Patrones

### Nunca hace un adapter

- Decidir estratégica u orquestación
- Tomar decisiones de qué primitive usar vs cuál no
- Realizar verificación semántica
- Mezclar múltiples capacidades en un solo adapter

### El adapter solo ofrece

- Capacidad cruda
- Descripción de riesgo
- Resultado con evidencia
- Errores estructurados

---

## Histórico

| Fecha | Versión | Cambios |
|--------|---------|----------|
| 2026-04-19 | 1.0 | Initial omni adapters contract |