#!/usr/bin/env bun
# Fase 4: Supervisor Persistente + File-Bridge como Fachada de Estado

**Fecha:** Apr 5, 2026  
**Estado:** Implementación Completada  
**Cambios Mayores:** Supervisor persistente, estado persistido, bootstrap automático

---

## Resumen de Cambios

### 1. Supervisor Persistente (`context-supervisor-process.ts`)

Un **proceso independiente** que:
- Mantiene vivo `PTController` y `TopologyCache` entre comandos
- Recolecta heartbeat, topología y estado del bridge cada 4 segundos
- Escribe `~/.pt-cli/context-status.json` de forma persistente
- Se **auto-apaga** si heartbeat está stale/missing por 3 ciclos consecutivos

**Loop:**
```
Cada 4 segundos:
  1. Recolectar heartbeat health (ok/stale/missing)
  2. Recolectar topología health (warming/healthy/stale/desynced)
  3. Recolectar bridge ready status
  4. Escribir context-status.json
  5. Actualizar lock de supervisor
  6. Decidir si apagar por demasiadas fallas
```

**Auto-stop:**
- 3 ciclos seguidos sin heartbeat → apagar
- 3 ciclos seguidos sin bridge → apagar
- Limpiar PID/lock automáticamente

---

### 2. Lock/PID Manager (`context-supervisor-lock.ts`)

Evita múltiples supervisores ejecutándose:
- Verifica si PID anterior sigue vivo
- Limpia lock si es stale (>30 segundos sin update)
- Proporciona:
  - `acquireLock()` - obtener lock
  - `updateLock()` - actualizar timestamp (heartbeat)
  - `releaseLock()` - limpiar al apagarse
  - `isSupervisorLocked()` - verificar si hay supervisor corriendo
  - `getRunningPid()` - obtener PID del supervisor actual

---

### 3. Bootstrap Helpers (`context-supervisor.ts`)

Helpers para que la CLI arranque el supervisor:
- `ensureSupervisorRunning()` - arranca supervisor si no está corriendo
- `isSupervisorRunning()` - verifica estado
- `readContextStatus()` - carga contexto persistido
- `getSupervisorStatus()` - resumen completo (running, pid, contextStatus)

**Método de lanzamiento:**
```typescript
spawn("bun", ["run", supervisorPath], {
  detached: true,  // Permite que el parent muera sin matar el child
  stdio: "ignore"  // No hereda stdio
});
```

---

### 4. Expansión de FileBridgeV2

**Nuevos métodos públicos:**

#### `getHeartbeat()`
```typescript
async getHeartbeat(): Promise<{ timestamp: number } | null>
```
Retorna info del heartbeat si existe.

#### `getHeartbeatHealth()`
```typescript
async getHeartbeatHealth(): Promise<{
  state: 'ok' | 'stale' | 'missing' | 'unknown';
  ageMs?: number;
  lastSeenTs?: number;
}>
```
Estado de salud del heartbeat. Basado en:
- `ok`: heartbeat reciente (<15s)
- `stale`: heartbeat antiguo (>15s)
- `missing`: archivo no existe
- `unknown`: error al leer

#### `getStateSnapshot()`
```typescript
async getStateSnapshot(): Promise<Snapshot | null>
```
Acceso al snapshot topológico más reciente.

#### `getBridgeStatus()`
```typescript
async getBridgeStatus(): Promise<{
  ready: boolean;
  hasValidLease?: boolean;
  pendingCommands?: number;
}>
```
Resumen de salud del bridge.

---

### 5. Expansión de PTController

**Nuevo método:**

#### `getHealthSummary()`
```typescript
async getHealthSummary(): Promise<{
  bridgeReady: boolean;
  topologyHealth: string;
  heartbeatState: 'ok' | 'stale' | 'missing' | 'unknown';
  warnings: string[];
}>
```

Resumen completo de health que incluye:
- Estado del bridge
- Health de topología (healthy/warming/unknown)
- Estado del heartbeat
- Lista de warnings

---

### 6. Mejoras a `pt status`

El comando `pt status` ahora:

1. **Usa contexto persistido primero**
   ```
   Status persistido → Contexto vivo → unknown
   ```

2. **Muestra estado del supervisor**
   ```
   Supervisor: ✓ Running (PID: 12345)
   ```

3. **Muestra información enriquecida**
   ```
   Supervisor: ✓ Running (PID: 12345)
   Packet Tracer Heartbeat : ok
   Bridge ready           : yes
   Topology materialized  : yes
   Topology health        : healthy
   Devices                : 5
   Links                  : 4
   
   Warnings: none
   ```

---

### 7. Bootstrap Automático en runCommand()

La CLI arranca automáticamente el supervisor cuando:
- `meta.requiresPT === true` 
- OR `meta.requiresContext === true`

```typescript
// En runCommand():
if (options.meta.requiresPT === true || options.meta.requiresContext === true) {
  try {
    await ensureSupervisorRunning();
  } catch (e) {
    console.debug('[runCommand] Error arrancando supervisor:', e);
    // Continuar sin supervisor
  }
}
```

---

## Flujo Operacional

### Inicio de Comando

```
Usuario ejecuta: pt device list
         ↓
runCommand() inicia
         ↓
¿requiresPT o requiresContext? → SÍ
         ↓
ensureSupervisorRunning()
         ↓
¿Supervisor corriendo? → NO
         ↓
spawn("bun", "context-supervisor-process.ts", { detached: true })
         ↓
Supervisor comienza loop:
  - Crea PTController
  - Inicia TopologyCache
  - Cada 4s: recolecta estado, escribe context-status.json
         ↓
Comando ejecuta
         ↓
Si heartbeat stale/missing por 3 ciclos → supervisor se apaga
```

### Consulta de Estado

```
Usuario ejecuta: pt status
         ↓
getSupervisorStatus()
         ↓
readContextStatus() de ~/.pt-cli/context-status.json
         ↓
Si existe → mostrar estado persistido
Si no → hacer inspección rápida en vivo
```

---

## Archivos Creados/Modificados

### Nuevos
- `/apps/pt-cli/src/system/context-supervisor-lock.ts`
- `/apps/pt-cli/src/system/context-supervisor-process.ts`
- `/apps/pt-cli/src/system/context-supervisor.ts`

### Modificados
- `/packages/file-bridge/src/file-bridge-v2.ts` (+64 líneas)
- `/packages/pt-control/src/controller/index.ts` (+39 líneas)
- `/apps/pt-cli/src/application/run-command.ts` (+10 líneas)
- `/apps/pt-cli/src/commands/status.ts` (+6 líneas)

---

## Reglas Importantes para Agentes

### 1. El supervisor es automático
- No necesitas levantarlo manualmente
- Se arranca automáticamente con comandos que requieren contexto

### 2. Preferir `pt status` 
```bash
pt status           # Recomendado - usa contexto persistido
pt status --json    # Para parsear estructuradamente
```

### 3. Interpretar health status correctamente
| Estado | Significado | Acción |
|--------|-------------|--------|
| `ok` | Todo bien | Proceder con normalidad |
| `stale` | Datos viejos/PT no responde | Reintentar o advertir |
| `missing` | PT probablemente apagado | Esperar o avisar usuario |
| `unknown` | No hay contexto | Ejecutar comando para inicializar |

### 4. Si topology.health = `desynced`
- La topología no refleja cambios recientes
- El cambio fue aceptado pero **aún no validado persistentemente**
- Esperar 2-3 ciclos o reintentar comando

### 5. Si supervisor está offline
- Contexto no será persistido
- Cada comando crea su propio controller temporal
- Menos eficiente pero funcional

---

## Transición desde Fase 3

### Fase 3
```
context-supervisor.ts → solo recolecta estado live
                     → `loadContextStatus()` / `writeContextStatus()`
                     → Sin persistencia de background
```

### Fase 4
```
context-supervisor-process.ts → proceso independiente
                              → Loop persistente cada 4s
                              → Auto-stop por heartbeat
                              
context-supervisor.ts (system) → bootstrap y helpers
                               → ensureSupervisorRunning()
                               → readContextStatus()
                               
file-bridge → expone estado canónico
           → getHeartbeatHealth()
           → getBridgeStatus()
           
pt status → consume contexto persistido primero
         → muestra info del supervisor
```

---

## Qué Viene en Fase 5

1. **file-bridge como única fachada de pt-dev**
   - Migrar más lecturas directas de pt-dev hacia bridge APIs
   - Mejorar observabilidad en bridge

2. **Reescritura fuerte de IOS interactivo**
   - execInteractive() completo
   - Validación post-comando mejorada
   - Reconciliación topológica

3. **Separación clara de responsabilidades**
   - CLI es cliente del supervisor
   - Bridge es fachada de pt-dev
   - Supervisor es autoridad de contexto
   - Controller es orquestador de servicios

---

## Checklist de Verificación

- [x] Supervisor persistente crea `context-status.json`
- [x] Auto-stop funciona por heartbeat stale/missing
- [x] `pt status` muestra info del supervisor
- [x] `ensureSupervisorRunning()` arranca en background
- [x] FileBridgeV2 expone heartbeat + bridge status
- [x] PTController expone getHealthSummary()
- [x] runCommand() bootstrap automático
- [x] Compilación sin errores

---

## Debugging

### Ver si supervisor está corriendo
```bash
pt status
# Mostrará: Supervisor: ✓ Running (PID: xxxxx)
```

### Leer contexto persistido
```bash
cat ~/.pt-cli/context-status.json
```

### Localizar PID del supervisor
```bash
cat ~/.pt-cli/context-supervisor.pid
```

### Cambios recientes en topología
```bash
# Ver contexto vivo
pt status

# Esperar 4 segundos para que supervisor actualice
# y verificar de nuevo
sleep 4
pt status
```

---

**Fin de Fase 4 Documentation**
