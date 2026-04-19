# Regression Policy - Fase 5

> Política para clasificación de soporte y detección de regresiones.

## Clasificación de soporte

### supported

```typescript
// Condiciones:
{
  minRunsForSupported: 3,           // al menos 3 corridas
  minAverageConfidence: 0.8,         // confianza ≥ 0.8
  maxFlakinessRatio: 0.1,           // ≤10% de corridas fallidas
  cleanupRequired: true,           // cleanup debe ser exitoso
  timeoutRateThreshold: 0.05,      // ≤5% de timeouts
}
```

### partial

```typescript
{
  // Cumpleal menos una:
  minRunsForSupported: 1,

  // PERO alguna de:
  averageConfidence: 0.5-0.8,       // confianza media
  partialCleanup: true,               // cleanup parcial
  hasWarnings: true,               // con warnings recurrentes
}
```

### flaky

```typescript
{
  // Al menos 3 corridas Y:
  {
    flakinessRatio: > 0.2,          // >20%不一致entes
    // O
    confidenceVariance: > 0.3,      // alta varianza en confianza
    // O
    timeoutRate: > 0.1,              // >10% timeouts
  }
}
```

### unsupported

```typescript
{
  // Una de:
  {
    prerequisitesMissing: true,      // prerequisite no disponible
    prerequisiteFailed: true,       // prerequisite falló
    cannotExecute: true,             // no se puede ejecutar
  }
}
```

### broken

```typescript
{
  // Siempre falla:
  failureRate: 1.0,

  // O falla estructuralmente:
  structuralFailure: true,
}
```

### dangerous

```typescript
{
  // Funciona PERO:
  riskLevel: "dangerous",           // clasificado como dangerous
  // O
  stateCorruption: true,           // puede corromper estado
  // O
  cannotCleanup: true,             // no se puede limpiar
}
```

## Detección de regresión

### Tipos de resultado de comparación

| Resultado | Descripción |
|----------|-------------|
| `unchanged` | Sin cambios |
| `improved` | Mejoró (más soportado, mayor confianza) |
| `regressed` | Empeoró (menos soportado, menor confianza) |
| `newly-supported` | Ahora es soportado (antes no era) |
| `newly-broken` | Ahora está roto (antes funcionaba) |
| `insufficient-data` | No hay datos suficientes para comparar |

### Métricas de comparación

```typescript
interface RegressionComparison {
  baselineRunId: string;
  currentRunId: string;

  // Status
  baselineStatus: CapabilitySupportStatus;
  currentStatus: CapabilitySupportStatus;
  statusChanged: boolean;

  // Confidence
  baselineConfidence: number;
  currentConfidence: number;
  confidenceDelta: number;

  // Runs
  baselineRuns: number;
  currentRuns: number;

  // Resultado
  result: "unchanged" | "improved" | "regressed" |
         "newly-supported" | "newly-broken" |
         "insufficient-data";
}
```

## Política de regresión

### Baseline

Una corrida puede marcarse como **baseline**:

```typescript
// Al ejecutar suite regression-smoke:
await runRegressionSuite({
  labelBaseline: "v1.0.0",  // etiqueta de version
});
```

### Compare

Comparar contra baseline:

```typescript
const compare = await compareToBaseline({
  currentLabel: "v1.0.1",
  baselineLabel: "v1.0.0",
});

// Output:
// device.add: unchanged
// link.add: regressed (flaky → unsupported)
// terminal.session: improved
```

### Alertas

```typescript
// Automatic alerts:
if (result === "regressed" || result === "newly-broken") {
  console.warn("⚠️ REGRESSION DETECTED:", compare);
}

// Para CI:
process.exit(result === "regression" ? 1 : 0);
```

## Flakiness detection

### Algoritmo

```typescript
function detectFlakiness(runs: LedgerEntry[]): boolean {
  if (runs.length < 3) return false;

  const results = runs.map(r => r.ok);
  const failureCount = results.filter(x => !x).length;
  const flakinessRatio = failureCount / results.length;

  return flakinessRatio > 0.2;  // >20% failure rate
}
```

### Acción según flakiness

| Flakiness | Acción |
|-----------|--------|
| 0-10% | OK — mantener `supported` |
| 10-20% | Warning — considerar `partial` |
| 20-50% | Alert — clasificar `flaky` |
| >50% | Block — clasificar `broken` |

## Reglas de oro

1. **No clasificar supported con evidencia insuficiente** — Mínimo 3 corridas
2. **Laflakiness es dinámica** — Re-clasificar con más corridas
3. **El cleanup es obligatorio** — Sin cleanup, no hay soporte
4. **La evidencia es sagrada** — Sin evidencia, no hay clasificación