# Support Matrix - Fase 5

> Consolida históricamente qué capacidades funcionan y en qué condiciones.

## Propósito

La support matrix responde preguntas como:

- ¿`device.move` funciona en este entorno?
- ¿`omni.assessment.read` es soportado o experimental?
- ¿`terminal-core` es flaky en cierto router/modelo?
- ¿un workflow funciona solo parcialmente?

## Estructura

La matrix se organiza por:

| Eje | Descripción |
|-----|-------------|
| `capabilityId` | ID único de capability |
| `ptVersion` | Versión de PT |
| `hostPlatform` | Plataforma (darwin, linux, win32) |
| `deviceModel` | Modelo de dispositivo |
| `risk` | Nivel de riesgo |

### Capacidad agregada

```typescript
interface SupportMatrixEntry {
  capabilityId: string;
  status: CapabilitySupportStatus;

  // Aggregate
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  flakyRuns: number;

  // Stats
  averageConfidence: number;
  minConfidence: number;
  maxConfidence: number;

  // Time
  averageDurationMs: number;
  lastRun: number;
  firstRun: number;

  // Entorno
  lastEnvironment: EnvironmentFingerprint;
}
```

## Reglas de clasificación

### supported

- **Varias corridas consistentes** (≥3 por defecto)
- **Evidencia suficiente** (≥0.8 de confianza media)
- **Cleanup correcto** (sin residuos)
- **Sin anomalías graves**

### partial

- **Cumple parcialmente**
- **Evidencia incompleta** o inconsistencias menores
- **Depende de fallback no ideal**

### flaky

- **Resultados inconsistentes** entre corridas comparables
- **Timeouts** o anomalías intermitentes
- **Cleanup no siempre estable**

### unsupported

- **Capability no disponible** o sin prerequisitos
- **No se puede ejecutar razonablemente**

### broken

- **Debería existir** pero falla estructuralmente

### dangerous

- **Funciona** o puede funcionar
- **El riesgo/impacto supera la política** permitida

## Regla

**No mezclar "no soportado" con "bloqueado por riesgo"** — Son cosas distintas.

## Queries comunes

```typescript
import { querySupportMatrix } from "@cisco-auto/pt-control/omni";

// Ver status de una capability
const entry = await querySupportMatrix("device.move");

// Ver todas las flaky
const flaky = await querySupportMatrix({ status: "flaky" });

// Ver por dominio
const terminal = await querySupportMatrix({ domain: "terminal" });

// Ver por nivel de riesgo
const elevated = await querySupportMatrix({ risk: "elevated" });
```

## Actualización

Cada vez que una capability se ejecuta:

1. El runner produce un resultado con `supportStatus` preliminar
2. El ledger persiste la corrida
3. La support matrix se **recalcula** agregando el nuevo resultado

Esto permite que la clasificación evolucione con más evidencia.