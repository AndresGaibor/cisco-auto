# Contexto de depuración: PT runtime / main.js / hot reload

## Objetivo
Entender por qué `main.js` en Packet Tracer solo muestra:

```text
[main] PT-SCRIPT v2 active (build: 2026-04-15T12:46:43.812Z)
[main] Loaded: catalog
[main] kernel booted — runtime hot-reload active
```

y no aparecen mensajes del runtime real (`[runtime] Loaded OK`, `[runtime-loader] Loading runtime.js...`, `[RUNTIME] Dispatching: ...`).

## Síntoma actual
- `main.js` sí carga y ejecuta `main()`.
- `catalog.js` sí carga (`[main] Loaded: catalog`).
- `kernel.boot()` no muestra logs visibles del runtime real.
- El runtime demo temporal sí confirmó que el kernel base funciona.
- El `device list` del CLI sigue timeouteando cuando intenta hablar con el bridge/runtime real.

## Mensajes observados
### Arranque de PT
```text
[main] PT-SCRIPT v2 active (build: 2026-04-15T12:46:43.812Z)
[main] Loaded: catalog
[main] kernel booted — runtime hot-reload active
```

### Con demo temporal
```text
[main] PT-SCRIPT v2 active (build: 2026-04-15T12:43:59.192Z)
[main] Loaded: catalog
[main] DEMO runtime loaded
[main] kernel booted — runtime hot-reload active
```

### Error previo en dead-letter
```text
ReferenceError: __values is not defined
shutdown@file:main.js:1577
@file:main.js:1623
cleanUp@file:main.js:1721
%entry@:1
```

### Error previo del bridge
```text
error: Timeout waiting for result for cmd_000000004159 after 10000ms
```

## Hipótesis de trabajo
1. El kernel base sí arranca.
2. El lease probablemente estaba bloqueando el runtime real, por eso no se veían logs.
3. El demo runtime confirmó que el kernel puede bootear y activar una ruta mínima.
4. El runtime real sigue siendo el punto a aislar: carga, scope de `dprint`, lease, `runtimeLoader`, o el dispatch.

## Flujo real actual
### `main.js`
Archivo generado: `packages/pt-control/generated/main.js`

Secuencia relevante:
1. imprime `PT-SCRIPT v2 active`
2. carga `catalog.js`
3. crea el kernel
4. llama `kernel.boot()`
5. imprime `kernel booted — runtime hot-reload active`

### `kernel.boot()`
Archivo fuente: `packages/pt-runtime/src/pt/kernel/main.ts`

Punto clave:
```ts
if (lease.validate()) {
  activateRuntime();
} else {
  lease.waitForLease(() => activateRuntime());
}
```

`activateRuntime()` llama a `runtimeLoader.load()`.

### `runtimeLoader.load()`
Archivo fuente: `packages/pt-runtime/src/pt/kernel/runtime-loader.ts`

Hace:
1. verifica existencia de `runtime.js`
2. lee el archivo
3. lo ejecuta con `new Function("ipc", "fm", "dprint", "DEV_DIR", code)`
4. espera que el runtime registre `_ptDispatch`
5. deja logs:
   - `[runtime-loader] Loading runtime.js...`
   - `[runtime] Loaded OK (mtime=...)`
   - `[runtime-loader] runtime.js ready for dispatch`

## Archivos involucrados
### 1) `packages/pt-runtime/src/build/render-main-v2.ts`
Genera `main.js`.

Puntos relevantes:
- Carga `catalog.js`.
- Crea el kernel con `createKernel(...)`.
- Antes se probó un demo temporal.
- Actualmente contiene logs de boot, pero no se ven los logs del runtime real.

### 2) `packages/pt-runtime/src/pt/kernel/main.ts`
Kernel principal.

Puntos relevantes:
- `boot()` llama a `lease.validate()` / `lease.waitForLease()`.
- `activateRuntime()` llama a `runtimeLoader.load()`.
- Imprime:
  - `[kernel] Starting...`
  - `[kernel] Activating...`
  - `[kernel] Runtime ready at mtime=...`
  - `[kernel] Ready`

### 3) `packages/pt-runtime/src/pt/kernel/runtime-loader.ts`
Carga `runtime.js`.

Puntos relevantes:
- Lee `runtime.js` desde disco.
- Inyecta `ipc/fm/dprint/DEV_DIR` como parámetros de `new Function(...)`.
- Espera `_ptDispatch` en el scope global.
- Logs esperados:
  - `[runtime-loader] Loading runtime.js...`
  - `[runtime] Loaded OK (mtime=...)`
  - `[runtime-loader] runtime.js ready for dispatch`
  - `[runtime] Load error (keeping previous): ...`

### 4) `packages/pt-runtime/src/build/render-runtime-v2.ts`
Genera `runtime.js`.

Puntos relevantes:
- El runtime real define `runtimeDispatcher(payload, api)`.
- Registra handlers en `HANDLER_MAP`.
- Al final expone `_ptDispatch`.
- Usa `dprint` para logs:
  - `[runtime] dispatch ready`
  - `[RUNTIME] Dispatching: <type>`
  - `[runtime] INIT ERROR: ...`

### 5) `packages/pt-runtime/src/handlers/runtime-handlers.ts`
Contiene el dispatcher real y el mapa de handlers.

Puntos relevantes:
- `runtimeDispatcher(payload, api)` imprime:
  - `[RUNTIME] Dispatching: ${type}`
- Registra handlers como:
  - `listDevices`
  - `snapshot`
  - `inspect`
  - `configHost`
  - `execIos`
  - etc.

### 6) `packages/pt-runtime/src/core/dispatcher.ts`
Referencia legacy.

Punto relevante:
- Comentario en el archivo aclara que **no** es el dispatcher activo del build actual.
- El build activo usa `handlers/runtime-handlers.ts`.

### 7) `packages/file-bridge/src/file-bridge-v2.ts`
Bridge durable CLI ↔ PT.

Puntos relevantes:
- `start()` adquiere lease.
- `loadRuntimeFromFile()` escribe `runtime.js` en `pt-dev`.
- `sendCommandAndWait()` espera resultados con timeout.
- El timeout observado fue:
  - `Timeout waiting for result for cmd_000000004159 after 10000ms`

### 8) `packages/pt-control/src/controller/index.ts`
Controller que arranca el bridge.

Punto relevante:
- `PTController.start()` es el flujo que debe preparar el bridge antes de consultar PT.

### 9) `apps/pt-cli/src/application/device-list.ts`
Implementación del listado de dispositivos.

Puntos relevantes:
- Se cambió varias veces.
- Ahora consulta directamente a PT via `PTController`.
- Ruta actual:
  - `controller.start()`
  - `controller.loadRuntimeFromFile(.../runtime.js)`
  - `controller.snapshot()`
- Esto evita cache/histórico.

### 10) `apps/pt-cli/src/commands/device/list.ts`
Comando CLI `pt device list`.

Punto relevante:
- Debe mostrar dispositivos del canvas actual sin usar cache/histórico.

## Estado de lease / bridge
- `~/pt-dev/bridge-lease.json` no existía cuando se inspeccionó.
- El kernel fuente usa `bridge-lease.json` para decidir si activa runtime o espera.
- El CLI tiene comando `pt bridge` que inspecciona ese lease.

## Nota sobre logs y visibilidad
Se buscó que el runtime escriba logs visibles en PT:
- `main.js` usa `dprint` para sus mensajes de boot.
- `runtime-loader` usa `dprint` para carga/recarga.
- `runtimeDispatcher` usa `api.dprint`.

El problema actual es que esos logs del runtime real **no aparecen** en la consola de PT, aunque el kernel base sí lo hace.

## Cambios temporales hechos y revertidos
### Demo runtime temporal
- Se añadió un modo demo temporal para confirmar que el kernel podía bootear.
- Resultado: funcionó y mostró:
  - `[main] DEMO runtime loaded`
- Luego se eliminó porque solo servía para aislar el problema.

### Bypass temporal de lease
- Se probó un bypass temporal del lease para forzar la carga del runtime.
- Esto ayudó a separar kernel base vs runtime real.

## Verificaciones ya hechas
- `bun run pt:build` pasó varias veces.
- Se desplegaron:
  - `~/pt-dev/main.js`
  - `~/pt-dev/runtime.js`
- El demo runtime confirmó que `main()` y `kernel.boot()` funcionan.

## Puntos a investigar ahora
1. Por qué el runtime real no deja logs visibles aunque el loader dice que carga.
2. Si PT está ejecutando una copia vieja de `runtime.js` o si el scope de `dprint` se pierde.
3. Si `lease.validate()` / `waitForLease()` está evitando la activación real.
4. Si `runtimeLoader.load()` realmente llega a ejecutarse cuando el demo se quita.
5. Si `snapshot()` en `pt-cli` es suficiente para el listado, o si conviene re-enganchar un handler runtime estable.

## Comandos útiles
```bash
bun run pt:build
bun run pt device list
bun run pt bridge
```

## Archivos clave a abrir primero
- `packages/pt-runtime/src/pt/kernel/main.ts`
- `packages/pt-runtime/src/pt/kernel/runtime-loader.ts`
- `packages/pt-runtime/src/build/render-main-v2.ts`
- `packages/pt-runtime/src/build/render-runtime-v2.ts`
- `packages/pt-runtime/src/handlers/runtime-handlers.ts`
- `apps/pt-cli/src/application/device-list.ts`
- `apps/pt-cli/src/commands/device/list.ts`
- `packages/file-bridge/src/file-bridge-v2.ts`
- `packages/pt-control/src/controller/index.ts`
