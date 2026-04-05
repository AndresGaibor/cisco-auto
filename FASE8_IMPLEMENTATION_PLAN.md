# FASE 8: Bridge Lease-Aware - Plan de Implementación Completo

**Proyecto:** cisco-auto  
**Objetivo:** Hacer FileBridgeV2 completamente lease-aware con recuperación de crashes, validación en tiempo de ejecución, y documentación completa.  
**Duración estimada:** 2-3 semanas (10 jornadas de trabajo)  
**Estado actual:** Componentes base existentes, requieren integración y endurecimiento

---

## 📊 RESUMEN EJECUTIVO

**12 Pasos organizados en 5 grupos:**

| Grupo | Pasos | Duración | Parallelizable |
|-------|-------|----------|----------------|
| **1. Fundación** | 1-3 | 3-4 días | No (secuencial) |
| **2. Integración** | 4-6 | 2-3 días | Parcial (después de Grupo 1) |
| **3. Validación Runtime** | 7-9 | 3-4 días | **Sí (en paralelo entre sí)** |
| **4. Hardening** | 10-11 | 2-3 días | No (secuencial, dependen de 7-9) |
| **5. Documentación** | 12 | 1-2 días | Independiente |

**Hitos críticos:**
- ✅ Paso 3: CommandProcessor robusto
- ✅ Paso 6: Backpressure stats
- ✅ Paso 9: Auto-snapshot funcional
- ✅ Paso 11: Event log rotation
- ✅ Paso 12: Documentación lista para Fase 9

---

## 🎯 12 PASOS DETALLADOS

### **PASO 1: Validar y Documentar LeaseManager** ✅
**Grupo:** Fundación | **Duración:** 1 día | **Deps:** Ninguna

**Archivos:**
- `packages/file-bridge/src/v2/lease-manager.ts` (revisión)
- `packages/file-bridge/src/__tests__/v2/lease-manager.unit.ts` (crear)

**Tests a Implementar:**
```
✓ acquireLease() devuelve true en primer intento
✓ renewLease() actualiza expiresAt correctamente
✓ hasValidLease() devuelve false si expiró
✓ isProcessAlive() detecta muerte de proceso
✓ releaseLease() elimina archivo de lease
✓ PID reciclado en Linux se detecta como stale
✓ Concurrencia: dos procesos compitiendo por lease
```

**Archivos a Crear:**
- `packages/file-bridge/src/__tests__/v2/lease-manager.unit.ts` (~250 líneas)
- `packages/file-bridge/src/__tests__/fixtures/lease-fixtures.ts` (~100 líneas)

**Criterios de Aceptación:**
- [ ] 95%+ cobertura de LeaseManager
- [ ] Todos los tests pasan
- [ ] JSDoc completo de métodos públicos

---

### **PASO 2: Completar CrashRecovery (Fases 2 y 3)**
**Grupo:** Fundación | **Duración:** 1.5 días | **Deps:** Paso 1

**Estado Actual:**
```
Fase 1: Purga comandos duplicados ✅
Fase 2: Recupera in-flight con reintentos ✅
Fase 3: FALTA - Limpiar procesos zombie sin lease válido
```

**Archivos a Modificar:**
- `packages/file-bridge/src/v2/crash-recovery.ts` (líneas 54-165)

**Implementar Fase 3:**
```typescript
// NUEVA LÓGICA en recover()
// Fase 3: Limpiar orphaned commands con lease expirado
const lease = this.leaseManager.readLease();
if (!lease || isLeaseStale(lease)) {
  // Si no hay lease válido, limpiar todos los in-flight/
  // y pasar a dead-letter
  cleanupOrphanedCommands();
}
```

**Tests a Crear:**
- `packages/file-bridge/src/__tests__/v2/crash-recovery.unit.ts` (~350 líneas)

**Tests Específicos:**
```
✓ Fase 1: Purga duplicados entre commands/ y results/
✓ Fase 2: Re-queue in-flight con retries (max 3)
✓ Fase 3: Limpia in-flight si no hay lease válido
✓ Backoff exponencial en retries
✓ Dead-letter handling para files corruptos
✓ Event logging de cada fase
✓ Integridad: no se pierden comandos durante recovery
```

**Archivos a Crear:**
- `packages/file-bridge/src/__tests__/v2/crash-recovery.unit.ts` (~350 líneas)
- `packages/file-bridge/src/__tests__/fixtures/crash-fixtures.ts` (~150 líneas)

---

### **PASO 3: Reforzar CommandProcessor**
**Grupo:** Fundación | **Duración:** 1.5 días | **Deps:** Pasos 1-2

**Archivos a Modificar:**
- `packages/file-bridge/src/v2/command-processor.ts` (completo)

**Enhancements:**
1. **Deduplicación robusta:** verificar checksum antes de procesar
2. **Expiration handling:** rechazar comandos expirados tempranamente
3. **Dead-letter management:** mejora en manejo de archivos corruptos
4. **Race condition handling:** dos procesos tomando mismo comando

**Tests a Crear:**
- `packages/file-bridge/src/__tests__/v2/command-processor.unit.ts` (~400 líneas)

**Tests Específicos:**
```
✓ pickNextCommand() selecciona comando válido
✓ Deduplicación: comando con resultado existente es purgado
✓ Expiración: comando expirado es rechazado antes de procesar
✓ Checksum mismatch rechaza payload corrupto
✓ Dead-letter: archivo malformado se mueve correctamente
✓ Race condition: ENOENT si otro proceso tomó el archivo
✓ publishResult() escribe con permisos correctos
✓ Result integrity: JSON válido, tiene todos los campos
```

**Archivos a Crear:**
- `packages/file-bridge/src/__tests__/v2/command-processor.unit.ts` (~400 líneas)
- `packages/file-bridge/src/__tests__/fixtures/command-fixtures.ts` (~200 líneas)

---

### **PASO 4: Integrar BridgeDiagnostics en Ciclo**
**Grupo:** Integración | **Duración:** 1 día | **Deps:** Pasos 1-3

**Archivos a Modificar:**
- `packages/file-bridge/src/file-bridge-v2.ts`
  - En `start()`: inicializar diagnostics
  - En `stop()`: recolectar health final
- `packages/pt-control/src/application/ports/file-bridge.port.ts`
  - Agregar método `diagnostics(): BridgeHealth`

**Implementación:**
```typescript
// En FileBridgeV2.start()
this._diagnostics = new BridgeDiagnostics(
  this.paths,
  this.seq,
  this.leaseManager.getOwnerId(),
  this.leaseManager.readLease()
);

// Método público
diagnostics(): BridgeHealth {
  return this._diagnostics.collectHealth();
}
```

**Tests a Crear:**
- `packages/file-bridge/src/__tests__/v2/diagnostics.unit.ts` (~300 líneas)

**Tests Específicos:**
```
✓ collectHealth() cuenta archivos correctamente
✓ Detección de issues: in-flight > 10
✓ Detección de issues: command queue > 100
✓ Consumer lag calculado correctamente
✓ Lease status (active/expired) detectado
✓ Event log size y rotated files contados
✓ Health status (healthy/degraded/unhealthy) correcto
```

---

### **PASO 5: Integrar GarbageCollector en Ciclo Automático**
**Grupo:** Integración | **Duración:** 1 día | **Deps:** Pasos 1-3

**Archivos a Modificar:**
- `packages/file-bridge/src/file-bridge-v2.ts`
  - Agregar timer para GC en `start()`
  - Ejecutar GC en `stop()`

**Implementación:**
```typescript
// En start()
const gcIntervalMs = this.options.gcIntervalMs ?? 10 * 60 * 1000; // 10 min
this.gcTimer = setInterval(() => {
  if (this.leaseManager.hasValidLease()) {
    const report = this.garbageCollector.collect();
    this.appendEvent({
      type: 'garbage-collection',
      deletedResults: report.deletedResults,
      deletedLogs: report.deletedLogs,
      errors: report.errors,
    });
  }
}, gcIntervalMs);

// En stop()
if (this.gcTimer) clearInterval(this.gcTimer);
// Ejecutar GC final
const finalReport = this.garbageCollector.collect();
```

**Tests a Crear:**
- `packages/file-bridge/src/__tests__/v2/garbage-collector.unit.ts` (~300 líneas)

**Tests Específicos:**
```
✓ collect() borra results con TTL expirado (24h default)
✓ collect() borra logs con TTL expirado (7d default)
✓ GC respeta consumer state: no borra logs aún necesarios
✓ GC timer se ejecuta cada intervalo
✓ GC se ejecuta en stop() aunque timer no dispare
✓ Report contiene conteos correctos
✓ Errores en cleanup se reportan sin lanzar excepción
```

---

### **PASO 6: Estadísticas de Backpressure en FileBridgePort**
**Grupo:** Integración | **Duración:** 0.5 día | **Deps:** Pasos 1-3

**Archivos a Modificar:**
- `packages/pt-control/src/application/ports/file-bridge.port.ts`
  - Agregar método `getBackpressureStats()`

**Implementación:**
```typescript
// En FileBridgePort interface
getBackpressureStats(): {
  maxPending: number;
  currentPending: number;
  availableCapacity: number;
  utilizationPercent: number;
};
```

**Tests:**
```
✓ getBackpressureStats() retorna stats correctas
✓ utilizationPercent = 0% si no hay pending
✓ utilizationPercent = 100% si currentPending = maxPending
✓ availableCapacity > 0 si no saturado
```

---

### **PASO 7: Validación de Lease en Runtime PT** ⚙️ PT-Side
**Grupo:** Validación Runtime | **Duración:** 1 día | **Deps:** Pasos 1-4 | **PARALLELIZABLE**

**Archivos a Modificar:**
- `packages/pt-runtime/src/templates/main.ts`
  - En `main()`: verificar heartbeat.leaseValid antes de procesar
  - En `loadRuntime()`: inicializar estructura de lease

**Implementación:**
```javascript
// En main() PT-side
function main() {
  var heartbeat = readHeartbeat();
  
  // Verificar que lease es válido
  if (!heartbeat.leaseValid) {
    writeHeartbeat({ leaseValid: false, reason: "lease-expired" });
    return; // No procesar más comandos
  }
  
  // Procesar comandos normalmente
  pollCommandQueue();
}
```

**Tests a Crear:**
- `packages/pt-runtime/src/__tests__/lease-validation.unit.ts` (~250 líneas)

**Tests Específicos:**
```
✓ Runtime rechaza comandos si lease expiró
✓ Heartbeat contiene leaseValid: true/false
✓ leaseValid se actualiza cada ciclo
✓ Runtime se detiene si lease es revocado
✓ Event log tiene lease-validation-failed
```

---

### **PASO 8: Validación de Resultados (Checksum + Integrity)**
**Grupo:** Validación Runtime | **Duración:** 1 día | **Deps:** Pasos 1-4 | **PARALLELIZABLE**

**Archivos a Modificar:**
- `packages/file-bridge/src/file-bridge-v2.ts`
  - En `sendCommandAndWait()`: validar checksum de resultado antes de resolver

**Implementación:**
```typescript
// En checkResult callback de sendCommandAndWait()
const result = JSON.parse(content) as BridgeResultEnvelope<TResult>;

// Validar integridad
if (result.checksum) {
  const computed = checksumOf({ status: result.status, value: result.value });
  if (computed !== result.checksum) {
    throw new Error(`Result checksum mismatch for ${envelope.id}`);
  }
}

// Validar que result no es corrupto
if (!result.status || !result.completedAt) {
  throw new Error(`Result missing required fields for ${envelope.id}`);
}
```

**Tests a Crear:**
- `packages/file-bridge/src/__tests__/v2/result-validation.unit.ts` (~250 líneas)

**Tests Específicos:**
```
✓ Result checksum mismatch rechazado
✓ Result con status válido aceptado
✓ Result missing fields rechazado
✓ sendCommandAndWait() lanza error si result inválido
✓ Resultado válido pasa todas las validaciones
```

---

### **PASO 9: Auto-Snapshot + Heartbeat Monitoring**
**Grupo:** Validación Runtime | **Duración:** 1.5 días | **Deps:** Pasos 1-4 | **PARALLELIZABLE**

**Archivos a Modificar:**
- `packages/file-bridge/src/file-bridge-v2.ts` (líneas 353-420)
  - Completar `startAutoSnapshot()`
  - Completar `startHeartbeatMonitoring()`
  - Integrar en `start()` / `stop()`

**Implementación:**
```typescript
startAutoSnapshot(): void {
  const intervalMs = this.options.autoSnapshotIntervalMs ?? 5_000;
  this.autoSnapshotTimer = setInterval(async () => {
    if (!this.leaseManager.hasValidLease()) return;
    
    try {
      const result = await this.sendCommandAndWait<{}, Snapshot>('snapshot', {}, 10_000);
      if (result.ok && result.value) {
        const newSnapshot = result.value;
        
        if (this.lastSnapshot) {
          const diff = this.calculateSnapshotDiff(this.lastSnapshot, newSnapshot);
          if (diff.hasChanges) {
            this.appendEvent({
              type: 'topology-changed',
              diff,
              snapshot: newSnapshot,
            });
          }
        } else {
          this.appendEvent({
            type: 'topology-initial',
            snapshot: newSnapshot,
          });
        }
        
        this.lastSnapshot = newSnapshot;
      }
    } catch (error) {
      this.appendEvent({
        type: 'auto-snapshot-error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, intervalMs);
}

startHeartbeatMonitoring(): void {
  const intervalMs = this.options.heartbeatIntervalMs ?? 2_000;
  this.heartbeatTimer = setInterval(() => {
    const heartbeat = this.readState();
    const now = Date.now();
    
    if (heartbeat && heartbeat.ts) {
      const ageMs = now - heartbeat.ts;
      if (ageMs > 30_000) {
        this.appendEvent({
          type: 'heartbeat-stale',
          ageMs,
        });
        this.emit('heartbeat-stale', { ageMs });
      }
    }
  }, intervalMs);
}
```

**Tests a Crear:**
- `packages/file-bridge/src/__tests__/v2/auto-snapshot.integration.ts` (~400 líneas)

**Tests Específicos:**
```
✓ startAutoSnapshot() genera eventos cada intervalo
✓ calculateSnapshotDiff() detecta cambios en devices
✓ calculateSnapshotDiff() detecta cambios en links
✓ topology-changed event contiene diff correcto
✓ auto-snapshot respeta lease válido (no dispara si inválido)
✓ Error en snapshot se loguea como evento
✓ startHeartbeatMonitoring() detecta heartbeat stale
✓ heartbeat-stale event emitido si ageMs > threshold
✓ Cleanup: timers se limpian en stopMonitoring()
```

---

### **PASO 10: Error Recovery + Retry Logic Inteligente**
**Grupo:** Hardening | **Duración:** 1.5 días | **Deps:** Pasos 1-9

**Archivos a Modificar:**
- `packages/file-bridge/src/file-bridge-v2.ts`
  - En `sendCommandAndWait()`: agregar retry con backoff

**Implementación:**
```typescript
async sendCommandAndWait<TPayload = unknown, TResult = unknown>(
  type: string,
  payload: TPayload,
  timeoutMs?: number,
  maxRetries = 3,
): Promise<BridgeResultEnvelope<TResult>> {
  let lastError: Error | null = null;
  let backoffMs = 100;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Intentar enviar y esperar
      const result = await this.sendCommandAndWaitInternal<TPayload, TResult>(
        type,
        payload,
        timeoutMs,
      );
      
      if (result.ok || !isRetryableError(result.error?.code)) {
        return result; // Éxito o error permanente
      }
      
      lastError = new Error(result.error?.message ?? 'Unknown error');
    } catch (error) {
      lastError = error as Error;
      
      // No reintentar si es error de validación
      if (error instanceof ValidationError) {
        throw error;
      }
    }
    
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      backoffMs = Math.min(backoffMs * 2, 5000); // Exponential backoff
      
      this.appendEvent({
        type: 'command-retry',
        attempt,
        nextBackoffMs: backoffMs,
      });
    }
  }
  
  throw lastError ?? new Error('Max retries exceeded');
}

function isRetryableError(code?: string): boolean {
  return ['TIMEOUT', 'ENOENT', 'ENOTREADY'].includes(code ?? '');
}
```

**Tests a Crear:**
- `packages/file-bridge/src/__tests__/v2/retry-logic.unit.ts` (~300 líneas)

**Tests Específicos:**
```
✓ Retry con backoff exponencial (100ms, 200ms, 400ms...)
✓ Max 3 reintentos por defecto
✓ No reintenta errores permanentes (VALIDATION_ERROR)
✓ Éxito en primer intento retorna inmediatamente
✓ Éxito en segundo intento después de timeout
✓ Max retries excedido lanza error
✓ Event log contiene command-retry con attempt count
✓ Backoff no excede máximo (5000ms)
```

---

### **PASO 11: Event Log Durability + Rotation**
**Grupo:** Hardening | **Duración:** 1.5 días | **Deps:** Pasos 1-10

**Archivos a Modificar:**
- `packages/file-bridge/src/event-log-writer.ts`
  - Agregar método `rotateIfNeeded()`
  - Llamar en `append()` antes de escribir

**Implementación:**
```typescript
export class EventLogWriter {
  private readonly maxFileSizeBytes = 10 * 1024 * 1024; // 10MB
  
  append(event: BridgeEvent): void {
    this.rotateIfNeeded();
    
    const line = JSON.stringify(event) + '\n';
    atomicAppendFile(this.currentFile, line);
  }
  
  private rotateIfNeeded(): void {
    try {
      const stats = statSync(this.currentFile);
      
      if (stats.size > this.maxFileSizeBytes) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = join(
          this.paths.logsDir(),
          `events.${timestamp}.ndjson`
        );
        
        renameSync(this.currentFile, rotatedFile);
        
        // Crear nuevo archivo vacío
        atomicWriteFile(this.currentFile, '');
        
        // Loguear rotación
        const rotationEvent: BridgeEvent = {
          seq: this.seq.next(),
          ts: Date.now(),
          type: 'event-log-rotated',
          rotatedFile,
        };
        
        atomicAppendFile(this.currentFile, JSON.stringify(rotationEvent) + '\n');
      }
    } catch (error) {
      // Ignorar errores de rotación
    }
  }
}
```

**Tests a Crear:**
- `packages/file-bridge/src/__tests__/v2/event-log-rotation.unit.ts` (~300 líneas)

**Tests Específicos:**
```
✓ rotateIfNeeded() renombra archivo cuando excede 10MB
✓ Nuevo evento se escribe en nuevo archivo
✓ Event log rotation event se loguea
✓ Archivos rotados no se pierden
✓ Consumer state respetado (GC no borra logs que se usan)
✓ Rotation no pierde eventos durante proceso
✓ Manejo de error si rotación falla
```

---

### **PASO 12: Documentación Completa + Migration Guide**
**Grupo:** Documentación | **Duración:** 1 día | **Deps:** Pasos 1-11

**Archivos a Crear:**
- `FASE8_IMPLEMENTATION.md` (este plan ejecutado)
- `FASE8_MIGRATION_GUIDE.md` (v2→v3, breaking changes)
- `FASE8_TESTING_CHECKLIST.md` (verificación de tests)
- `packages/file-bridge/README_V2.md` (API reference)
- Actualizar `PRD.md` Fase 8 section

**Contenido de cada archivo:**

**FASE8_MIGRATION_GUIDE.md:**
```markdown
# Migration Guide: FileBridgeV1 → FileBridgeV2

## Breaking Changes
- FileBridgeV1 no es lease-aware
- FileBridgeV2 requiere lease adquirido para procesar
- API de `sendCommand()` incluye checksum
- Heartbeat format cambió

## Migration Checklist
- [ ] Actualizar imports: `FileBridge` → `FileBridgeV2`
- [ ] Passar `leaseTtlMs` en opciones
- [ ] Implementar heartbeat en runtime PT
- [ ] Verificar lease en main() before processing
- [ ] Testear retry logic con timeout artificial
```

**FASE8_TESTING_CHECKLIST.md:**
```markdown
# Fase 8 Testing Checklist

## Unit Tests
- [ ] LeaseManager: 7 tests
- [ ] CrashRecovery: 7 tests
- [ ] CommandProcessor: 8 tests
- [ ] BridgeDiagnostics: 7 tests
- [ ] GarbageCollector: 7 tests
- [ ] LeaseValidation (PT-side): 5 tests
- [ ] ResultValidation: 5 tests
- [ ] RetryLogic: 8 tests
- [ ] EventLogRotation: 8 tests

Total: 62 unit tests

## Integration Tests
- [ ] FileBridgeV2 start/stop cycle
- [ ] Auto-snapshot + topology diff
- [ ] Heartbeat monitoring detection
- [ ] End-to-end command processing with retries
- [ ] Crash recovery after simulated crash

Total: 5 integration tests

## Coverage
- [ ] file-bridge/src/v2/*.ts ≥ 95%
- [ ] file-bridge/src/event-log-writer.ts ≥ 90%
- [ ] pt-runtime/src/templates/main.ts ≥ 85%

Total target: ≥ 92% overall
```

**Criterios de Aceptación Globales:**
```markdown
# Fase 8 Acceptance Criteria

## Functionality
- [ ] Todos los 12 pasos implementados completamente
- [ ] LeaseManager: adquisición, renovación, liberación funcionan
- [ ] CrashRecovery: Fases 1, 2, 3 ejecutan correctamente
- [ ] CommandProcessor: deduplicación y checksum validados
- [ ] BridgeDiagnostics: collectHealth() provee estado correcto
- [ ] GarbageCollector: auto-cleanup cada 10 min
- [ ] BackpressureStats: expuesto en port
- [ ] LeaseValidation: runtime PT rechaza sin lease
- [ ] ResultValidation: checksum validado
- [ ] AutoSnapshot: event topology-changed emitido cada 5s
- [ ] RetryLogic: backoff exponencial funciona
- [ ] EventLogRotation: rotación automática cada 10MB

## Testing
- [ ] 62 unit tests creados y pasando
- [ ] 5 integration tests creados y pasando
- [ ] Cobertura total ≥ 92%
- [ ] No hay TODOs sin resolver en código

## Documentation
- [ ] FASE8_IMPLEMENTATION.md completo
- [ ] FASE8_MIGRATION_GUIDE.md completo
- [ ] FASE8_TESTING_CHECKLIST.md completo
- [ ] README_V2.md creado con API reference
- [ ] PRD.md Fase 8 actualizado

## Quality
- [ ] `npm test` pasa sin errores
- [ ] `tsc --noEmit` pasa sin errores
- [ ] No memory leaks (verificado con --expose-gc)
- [ ] Commits organizados por paso (12 commits mínimo)
```

---

## 📈 MATRIZ DE EJECUCIÓN ÓPTIMA

```
SEMANA 1:
┌─ Lunes-Martes (Día 1-2): PASOS 1, 2, 3
│  └─ Fundación: Lease, Crash Recovery, Command Processor
│     Est. 3-4 días de trabajo
│
├─ Miércoles-Jueves (Día 3-4): PASOS 4, 5, 6
│  └─ Integración: Diagnostics, GC, Backpressure
│     Est. 2-3 días de trabajo
│     INICIO: Pasos 7, 8, 9 en paralelo si equipo ≥ 2 personas
│
└─ Viernes (Día 5): PASOS 7, 8, 9 (si en serie)
   └─ Validación Runtime: Lease, Results, Snapshot
      Est. 3-4 días de trabajo

SEMANA 2:
┌─ Lunes (Día 6): PASOS 7, 8, 9 finalización
│
├─ Martes-Miércoles (Día 7): PASO 10
│  └─ Retry logic + backoff exponencial
│     Est. 1.5 días
│
├─ Jueves (Día 8): PASO 11
│  └─ Event log rotation
│     Est. 1.5 días
│
└─ Viernes (Día 9-10): PASO 12 + Verificación Final
   └─ Documentación completa + smoke tests
      Est. 1-2 días
```

**Timeline Parallelizable (con 2 developers):**
```
Dev 1: Pasos 1-6 (Fundación + Integración)
Dev 2: Pasos 7-9 (Validación Runtime) EN PARALELO
Sync:  Pasos 10-12 juntos
```

---

## 🔗 DEPENDENCIAS GRÁFICAS

```
       ┌─── Paso 1: Lease ────┐
       │                       ├─→ Paso 4: Diags
       ├─── Paso 2: Crash ─────┤
       │                       ├─→ Paso 5: GC
       └─── Paso 3: Cmd Proc ──┤
                                └─→ Paso 6: BP

                                   ↓
            ┌────────────────────────────────────┐
            │ Pasos 7, 8, 9 PUEDEN CORRER        │
            │        EN PARALELO                  │
            └────────────────────────────────────┘
             │           │            │
             ↓           ↓            ↓
        Paso 7:     Paso 8:      Paso 9:
        Lease Val  Result Val   AutoSnap
             │           │            │
             └───────────┴────────────┘
                        ↓
                   Paso 10: Retry
                        ↓
                   Paso 11: Log Rot
                        ↓
                   Paso 12: Docs
```

---

## 📦 ARCHIVOS NUEVOS A CREAR

### Unit Tests (9 archivos, ~2500 líneas total):
```
packages/file-bridge/src/__tests__/v2/
├── lease-manager.unit.ts (250 líneas)
├── crash-recovery.unit.ts (350 líneas)
├── command-processor.unit.ts (400 líneas)
├── diagnostics.unit.ts (300 líneas)
├── garbage-collector.unit.ts (300 líneas)
├── result-validation.unit.ts (250 líneas)
├── retry-logic.unit.ts (300 líneas)
└── event-log-rotation.unit.ts (300 líneas)

packages/pt-runtime/src/__tests__/
└── lease-validation.unit.ts (250 líneas)
```

### Test Fixtures (3 archivos, ~450 líneas total):
```
packages/file-bridge/src/__tests__/fixtures/
├── lease-fixtures.ts (100 líneas)
├── crash-fixtures.ts (150 líneas)
└── command-fixtures.ts (200 líneas)
```

### Integration Tests (1 archivo, ~400 líneas):
```
packages/file-bridge/src/__tests__/v2/
└── auto-snapshot.integration.ts (400 líneas)
```

### Documentation (4 archivos, ~2500 líneas total):
```
root/
├── FASE8_IMPLEMENTATION.md (1200 líneas) ← ESTE DOCUMENTO
├── FASE8_MIGRATION_GUIDE.md (600 líneas)
├── FASE8_TESTING_CHECKLIST.md (400 líneas)
└── packages/file-bridge/README_V2.md (300 líneas)
```

---

## ✅ SMOKE TEST FINAL

```bash
#!/bin/bash

# Verificar que bridge puede:

# 1. Adquirir lease
pt bridge start --check-lease

# 2. Procesar un comando
pt bridge send device list

# 3. Recolectar diagnósticos
pt bridge diagnostics

# 4. Recuperarse de un crash simulado
# (matar proceso PT, verificar que recovery funciona)

# 5. Ejecutar todos los tests
npm test
```

---

## 📋 CRITERIOS DE ACEPTACIÓN POR PASO

| Paso | Métrica de Éxito | Cómo Verificar |
|------|-----------------|----------------|
| 1 | Cobertura LeaseManager ≥ 95% | `npm test -- lease-manager` |
| 2 | Crash recovery Fases 1-3 OK | `npm test -- crash-recovery` |
| 3 | CommandProcessor deduplicación OK | `npm test -- command-processor` |
| 4 | Diagnostics.collectHealth() OK | `npm test -- diagnostics` |
| 5 | GC timer ejecuta cada 10min | `npm test -- garbage-collector` |
| 6 | Port.getBackpressureStats() OK | Code review + unit test |
| 7 | Runtime rechaza sin lease | `npm test -- lease-validation` |
| 8 | Result checksum validado | `npm test -- result-validation` |
| 9 | Snapshot diff detectado | `npm test -- auto-snapshot` |
| 10 | Retry con backoff exponencial | `npm test -- retry-logic` |
| 11 | Log rotation automática | `npm test -- event-log-rotation` |
| 12 | Docs completas + smoke test | Manual review + smoke test |

---

## 🎓 NOTAS IMPORTANTES

### Orden de Ejecución NO ES Flexible:
- **Pasos 1-3:** DEBEN ser secuenciales (cada uno necesita el anterior)
- **Pasos 4-6:** Pueden iniciar después de 1-3, pero mejor ser secuencial también
- **Pasos 7-9:** PUEDEN ser paralelos (independientes entre sí)
- **Pasos 10-11:** DEBEN ser secuencial (10 → 11)
- **Paso 12:** Final, después de todo

### Testing Strategy:
- Cada paso debe tener ≥ 80% cobertura
- Integration test es solo para Paso 9 (auto-snapshot)
- Los demás son unit tests
- Total esperado: ≥ 92% cobertura global

### Commits:
- Mínimo 12 commits (uno por paso)
- Formato: `feat(bridge): paso-X-description`
- Ejemplo: `feat(bridge): paso-7-lease-validation-runtime`

---

**Estado:** Listo para implementación  
**Última actualización:** 2026-04-05  
**Autor:** Scout Agent  

