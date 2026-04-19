# Evidence Ledger - Fase 5

> Sistema de persistencia de corridas de capabilities para auditoría y comparación.

## Propósito

El evidence ledger guarda todas las corridas de omni con trazabilidad completa:

- **Auditoría**: Cada corrida puede reconstruirse
- **Comparación**: Histórico disponible para regression testing
- **Análisis**: Patrones de flakiness detectables

## Contenido de cada registro

```typescript
interface LedgerEntry {
  // Identificación
  runId: string;                    // ID único de corrida
  capabilityId: string;            // ID de capability ejecutada
  suiteId?: string;                 // Suite a la que pertenecía (si aplica)

  // Timestamps
  timestamp: number;               // Momento de ejecución (epoch ms)
  startedAt: number;               // Inicio de ejecución
  endedAt: number;                 // Fin de ejecución
  durationMs: number;              // Duración total

  // Entorno
  environment: EnvironmentFingerprint;  // Fingerprint del entorno
  ptVersion?: string;              // Versión de PT si se pudo inferir
  hostPlatform: string;            // Plataforma (darwin, linux, win32)
  deviceModel?: string;             // Modelo de dispositivo usado

  // Input/Output
  inputPayload: Record<string, unknown>;  // Payload de entrada
  rawResults: Record<string, unknown>;    // Resultados raw del handler
  normalizedEvidence: Record<string, unknown>;  // Evidencia normalizada

  // Resultado
  ok: boolean;                     // Éxito o fracaso
  supportStatus: CapabilitySupportStatus;  // Estado de soporte
  confidence: number;              // Nivel de confianza (0-1)
  warnings: string[];               // Advertencias detectadas

  // Cleanup
  cleanupStatus: "success" | "partial" | "failed" | "skipped";
  cleanupError?: string;           // Error de cleanup si ocurrió
}
```

## Persistencia

### Formato

El ledger se almacena en formato **NDJSON** (Newline Delimited JSON):

- Un registro por línea
- Fácil de procesar con herramientas Unix
- Append-only (no hay sobreescritura)
- Versionable con git

### Ubicación

```
{devDir}/omni/ledger/
├── runs/
│   ├── {runId}.ndjson    // Un archivo por corrida
│   └── ...
├── index.ndjson          // Índice de todas las corridas
└── by-capability/        // Links simbólicos por capability
    ├── device.add/       → runs/ con device.add
    ├── link.add/
    └── ...
```

### Índice

El índice permite búsquedas rápidas:

```typescript
interface LedgerIndex {
  version: 1;
  lastUpdated: number;
  entries: Record<string, {
    runId: string;
    timestamp: number;
    capabilityId: string;
    ok: boolean;
    supportStatus: CapabilitySupportStatus;
  }>;
}
```

## Reglas

1. **No almacenar solo resúmenes** — Debe conservarse evidencia raw suficiente para auditoría
2. **Raw + Normalized** — Guardar ambos para flexibilidad
3. **Versionable** — Formato que permita comparación en git
4. **Append-only** — No modificar entradas existentes (para auditoría)

## Lectura

Para releer el ledger:

```typescript
import { readLedger, queryRuns } from "@cisco-auto/pt-control/omni";

// Leer una corrida específica
const run = await readLedger("run-123");

// Query por capability
const runs = await queryRuns({ capabilityId: "device.add" });

// Query por rango de fechas
const runs = await queryRuns({
  from: Date.now() - 86400000,  // últimas 24 horas
  to: Date.now()
});

// Query por status
const flaky = await queryRuns({ supportStatus: "flaky" });
```

## Comparación con baseline

El ledger es la base para regression compare:

1. **Baseline**: Corrida anterior marcada como "baseline"
2. **Current**: Corrida actual
3. **Compare**: Comparación de cambios en status, confidence, y evidencia