# Fase 2: Contexto automático y uso correcto de bridge + virtual topology en la CLI

## Contexto

Hoy `runCommand()` (`apps/pt-cli/src/application/run-command.ts`) crea `createDefaultPTController()` pero **nunca llama a `controller.start()`**.

**Consecuencias:**
- bridge no iniciado → `isReady()` sería `false`
- topology cache no hace refresh inicial ni suscripción a eventos
- virtual topology no materializada
- comandos operan "a ciegas" sin contexto del sistema

**Además:**
- `device list` hace start/stop manualmente (inconsistente con `runCommand()`)
- no existe helper de inspección de contexto
- no hay warnings contextuales en resultados

## Approach

### Paso 1: Añadir `getContextSummary()` al PTController

**Archivo:** `packages/pt-control/src/controller/index.ts`
**Después de línea:** `324#QY` (`readState()`) y **antes de:** `326#MV`

**Método nuevo:**
```ts
getContextSummary(): {
  bridgeReady: boolean;
  topologyMaterialized: boolean;
  deviceCount: number;
  linkCount: number;
} {
  const bridgeReady = this.bridge.isReady();
  const snapshot = this.topologyCache.getSnapshot();
  const deviceCount = snapshot.devices ? Object.keys(snapshot.devices).length : 0;
  const linkCount = snapshot.links ? Object.keys(snapshot.links).length : 0;
  const topologyMaterialized = this.topologyCache.isMaterialized();
  return { bridgeReady, topologyMaterialized, deviceCount, linkCount };
}
```

**Por qué funciona:**
- `this.bridge.isReady()` → ya existe en `FileBridgePort` port
- `this.topologyCache.getSnapshot()` → ya existe, retorna `TopologySnapshot`
- `this.topologyCache.isMaterialized()` → ya existe, delega a `VirtualTopology.isMaterialized()`

### Paso 2: Crear `CommandRuntimeContext` y `context-inspector.ts`

**Archivo nuevo:** `apps/pt-cli/src/application/context-inspector.ts`

**Interfaces:**
```ts
export interface CommandRuntimeContext {
  bridgeReady: boolean;
  topologyMaterialized: boolean;
  deviceCount: number;
  linkCount: number;
  warnings: string[];
}

export async function inspectCommandContext(controller: PTController): Promise<CommandRuntimeContext>
```

**Implementación:**
- Llama a `controller.getContextSummary()`
- Genera warnings basados en el resumen
- Si `bridgeReady === false` → "Bridge no está listo"
- Si `topologyMaterialized === false` → "Topología virtual aún no materializada"

### Paso 3: Crear `context-advice.ts`

**Archivo nuevo:** `apps/pt-cli/src/application/context-advice.ts`

**Función:**
```ts
export function buildContextWarnings(ctx: CommandRuntimeContext): string[]
```

- Traduce `CommandRuntimeContext` a avisos entendibles
- Reglas claras y simples, sin lógica heartbeat aún

### Paso 4: Corregir `runCommand()` lifecycle + contexto

**Archivo:** `apps/pt-cli/src/application/run-command.ts`

**Cambios exactos:**
1. Extender `CommandContext` con campo `runtimeContext: CommandRuntimeContext`
2. Envolver ejecución en `try/finally`:
   ```ts
   const controller = createDefaultPTController();
   try {
     await controller.start();
     const runtimeContext = await inspectCommandContext(controller);
     const ctx: CommandContext = { ... , runtimeContext };
     result = await options.execute(ctx);
   } finally {
     await controller.stop();
   }
   ```
3. Incluir `runtimeContext` en `logPhase('start', ...)` metadata
4. Incluir warnings en `result.warnings` (merge si ya tiene)
5. Registrar `contextSummary` en `historyEntry` (nuevo campo `contextSummary` como objeto)

### Paso 5: Extender `HistoryEntry` con contexto opcional

**Archivo:** `apps/pt-cli/src/contracts/history-entry.ts`
**Agregar campo opcional:** `contextSummary?: Record<string, unknown>;`

### Paso 6: Añadir `requiresContext` al command-catalog

**Archivo:** `apps/pt-cli/src/commands/command-catalog.ts`
**Agregar:** `requiresContext: boolean;` a `CommandCatalogEntry`

**Valores:**
- `true` para: device, link, show, config-ios, config-host, routing, acl, stp, services, topology, vlan, etherchannel
- `false` para: build, results, logs, help, history, doctor, completion

### Paso 7: Actualizar CLI Agent Skill

**Archivo:** `docs/CLI_AGENT_SKILL.md` (si no existe, crear en `skills/CLI_AGENT_SKILL.md`)
**Sección nueva:** "Contexto operativo en Fase 2"

### Paso 8: `device list` — dejar anotado para migración Fase 3

**Archivo:** `apps/pt-cli/src/commands/device/list.ts`
**Acción:** Agregar comentario técnico indicando que debe migrarse a `runCommand()` en Fase 3

## Files to modify

1. `packages/pt-control/src/controller/index.ts` — añadir `getContextSummary()`
2. `apps/pt-cli/src/application/context-inspector.ts` — nuevo
3. `apps/pt-cli/src/application/context-advice.ts` — nuevo
4. `apps/pt-cli/src/application/run-command.ts` — lifecycle + contexto
5. `apps/pt-cli/src/contracts/history-entry.ts` — campo `contextSummary`
6. `apps/pt-cli/src/commands/command-catalog.ts` — campo `requiresContext`
7. `apps/pt-cli/src/commands/device/list.ts` — comentario de migración
8. `docs/CLI_AGENT_SKILL.md` o `skills/CLI_AGENT_SKILL.md` — actualizar

## Reuse

- `PTController.start()` / `.stop()` — ya existen
- `PTController.getCachedSnapshot()` — ya existe (pero `topologyCache.getSnapshot()` es más directo)
- `TopologyCache.isMaterialized()` → `VirtualTopology.isMaterialized()` → `TopologyCacheManager.isMaterialized()`
- `FileBridgePort.isReady()` — ya existe en el port
- `CliResult.warnings` — ya existe (`string[]`)
- `COMMAND_CATALOG` ya tiene `requiresPT` — reutilizar patrón

## Criterios de aceptación

- [ ] `runCommand()` hace `await controller.start()` antes de ejecutar
- [ ] `runCommand()` hace `await controller.stop()` en `finally`
- [ ] existe `context-inspector.ts` con `inspectCommandContext()`
- [ ] `PTController.getContextSummary()` funciona con bridge/cache/topology
- [ ] `CommandContext` incluye `runtimeContext` con info operativa
- [ ] resultados CLI pueden incluir warnings de contexto
- [ ] logs e historial guardan contexto básico
- [ ] `requiresContext` añadido al catalog
- [ ] skill actualizado

## Qué NO hacer en esta fase

- No TopologySupervisor en background
- No `pt status` completo
- No auto-start de daemon persistente
- No migrar todos los comandos a `runCommand()`
- No reescritura IOS interactiva
- No convertir warnings en errores duros
- No rehacer `doctor`
