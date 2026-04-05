# Diagnóstico de Crash - PT Script Module (Fase 5)

**Última actualización**: 2024-04-04
**Estado**: Crash identificado y fix aplicado (commit 8f43208)

---

## Resumen Ejecutivo

El crash al detener el Script Module de Packet Tracer fue causado por **dos factores**:

1. **FileWatcher mal liberado** (commit 807a37f) - corregido desactivando watcher por defecto
2. **Runtime cleanup hook re-ejecutaba runtime.js durante shutdown** (commit 8f43208) - corregido deshabilitando invokeRuntimeCleanupHook()

---

## Archivos Involucrados

### 1. Template Principal (TypeScript)
- **Ubicación**: `packages/pt-runtime/src/templates/main.ts`
- **Descripción**: Template ES6 que se transpila a main.js para PT
- **Líneas**: ~790 líneas (después de fixes)

### 2. Archivo Generado (desplegado a PT)
- **Ubicación**: `~/pt-dev/main.js`
- **Tamaño**: ~780 líneas, ~22KB
- **Ubicación real**: `/Users/andresgaibor/pt-dev/main.js`

### 3. Runtime (desplegado a PT)
- **Ubicación**: `~/pt-dev/runtime.js`
- **Tamaño**: ~3300 líneas, ~100KB
- **Ubicación real**: `/Users/andresgaibor/pt-dev/runtime.js`

### 4. Breadcrumbs de Debugging
- **Ubicación**: `~/pt-dev/journal/cleanup-last-stage.txt`
- **Contenido**: Último stage de cleanup alcanzado antes de crash
- **Formato**: `stage_name @timestamp`

---

## Historial de Diagnóstico

### Causa #1: FileWatcher Mal Liberado ✅ RESUELTO

**Commit**: 807a37f

**Problema**:
- `cleanUp()` solo hacía `fw = null` sin `unregisterEvent()` ni `removePath()`
- Callbacks usaban firma incorrecta `function(src, path)` en lugar de `function(src, args)`
- Listeners quedaban activos después de detener el módulo
- Documentación PT indica que `cleanUp()` debe liberar todos los recursos del Script Engine

**Solución Aplicada**:
```javascript
// Watcher desactivado por defecto
var ENABLE_FILE_WATCHER = false;
var WATCH_RUNTIME_FILE = false;
var WATCH_COMMANDS_DIR = false;

// Callbacks con firma correcta según documentación PT
function onWatchedFileChanged(src, args) {
  if (isShuttingDown || !isRunning) return;
  var path = getWatchedPath(args);
  // ...
}

// Teardown completo del watcher
function teardownFileWatcher() {
  if (!fw) return;
  try {
    if (typeof fw.unregisterEvent === "function") {
      fw.unregisterEvent("fileChanged", null, onWatchedFileChanged);
      fw.unregisterEvent("directoryChanged", null, onWatchedDirChanged);
    }
    if (typeof fw.removePath === "function") {
      fw.removePath(RUNTIME_FILE);
      fw.removePath(COMMANDS_DIR);
    }
  } catch (e) {}
  fw = null;
  watcherArmed = false;
}
```

**Referencias**:
- [PT Script Modules - Lifecycle](https://tutorials.ptnetacad.net/help/default/scriptModules_scriptEngine.htm)
- [SystemFileWatcher API](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_system_file_watcher.html)

---

### Causa #2: Runtime Cleanup Hook Re-ejecutaba Runtime.js ✅ RESUELTO

**Commit**: 8f43208

**Problema**:
- `invokeRuntimeCleanupHook()` llamaba `runtimeFn({ type: "__cleanup__" }, ipc, dprint)`
- `runtimeFn` fue creado con `new Function("payload", "ipc", "dprint", code)`
- Cada llamada a `runtimeFn` **re-evalúa** el código completo de runtime.js (~100KB)
- `runtime.js` es un IIFE que declara estado local (`IOS_JOBS`, `TERMINAL_LISTENERS_ATTACHED`)
- Al llamar `runtimeFn(__cleanup__)` durante shutdown, se crea **nueva ejecución** en vez de limpiar estado existente
- Packet Tracer usa un **único Qt Script Engine** por Script Module
- `cleanUp()` debe liberar recursos del engine existente, no montar otra ejecución durante shutdown

**Evidencia**:
```javascript
// main.js - cómo se crea runtimeFn
function loadRuntime() {
  var code = fm.getFileContents(RUNTIME_FILE);
  var testFn = new Function("payload", "ipc", "dprint", code);
  runtimeFn = testFn;
}

// runtime.js - estructura IIFE
var IOS_JOBS = {};
var TERMINAL_LISTENERS_ATTACHED = {};

return (function(payload, ipc, dprint) {
  // dispatcher que maneja __cleanup__
})(payload, ipc, dprint);
```

**Solución Aplicada**:
```javascript
// invokeRuntimeCleanupHook DESACTIVADO
function invokeRuntimeCleanupHook() {
  // DESACTIVADO:
  // runtimeFn fue creado con new Function(...), así que invocarlo aquí
  // re-ejecuta runtime.js completo durante el Stop.
  // Eso NO limpia estado previo del runtime; crea una nueva ejecución.
  return;
}

// cleanUp() mínimo con breadcrumbs
function cleanUp() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  isRunning = false;
  
  try {
    markCleanup("clear-command-poll");
    if (commandPollInterval) { clearInterval(commandPollInterval); commandPollInterval = null; }
    
    markCleanup("clear-deferred-poll");
    if (deferredPollInterval) { clearInterval(deferredPollInterval); deferredPollInterval = null; }
    
    markCleanup("clear-heartbeat");
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
    
    markCleanup("teardown-watcher");
    teardownFileWatcher();
    
    markCleanup("save-pending");
    savePendingCommands();
    
    // CRÍTICO: NO re-ejecutar runtime.js en cleanUp()
    
    markCleanup("null-runtime");
    runtimeFn = null;
    activeCommand = null;
    pendingCommands = {};
    
    markCleanup("done");
  } catch (e) {
    dprint("[cleanUp:" + cleanupStage + "] " + String(e));
  }
  
  dprint("[PT] Stopped");
}

// Breadcrumbs persistentes a disco
function markCleanup(stage) {
  cleanupStage = stage;
  try {
    if (fm) {
      fm.writePlainTextToFile(CLEANUP_TRACE_FILE, stage + " @" + Date.now());
    }
  } catch (e) {}
}
```

**Referencias**:
- [MDN: Function() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function)
- [PT Script Engine - Single Engine per Module](https://tutorials.ptnetacad.net/help/default/scriptModules_scriptEngine.htm)

---

## Causa #3 Potencial: Handlers IOS Síncronos ⚠️ PENDIENTE

**Estado**: No confirmado como causa de crash actual

**Problema Potencial**:
- `handleConfigIos()` y `handleExecIos()` son síncronos y bloqueantes
- Usan bucles `while (attempt < maxAttempts)` alrededor de `term.getOutput()` y `term.enterCommand(...)`
- Si se detiene PT mientras un handler IOS está corriendo, se detiene el engine en medio de un loop activo
- Esto puede causar crash si el handler está en medio de operaciones de terminal

**Evidencia**:
```javascript
// runtime.js - handleConfigIos (síncrono y bloqueante)
function handleConfigIos(payload) {
  var term = getCommandLine(payload.device);
  // ...
  while (attempt < maxAttempts) {
    term.enterCommand(cmd);
    var startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      var output = term.getOutput();
      // ... polling síncrono
    }
  }
}
```

**Diagnóstico Pendiente**:
- Test 1: Start → Stop sin comandos → ¿crash?
- Test 2: Start → addDevice → Stop → ¿crash?
- Test 3: Start → configIos → Stop → ¿crash?

Si solo falla en Test 3, el problema es la ruta IOS síncrona.

**Solución Temporal Propuesta** (si se confirma):
```javascript
function handleConfigIos(payload) {
  return {
    ok: false,
    error: "configIos temporalmente deshabilitado - en migración a ruta diferida",
    code: "TEMP_DISABLED"
  };
}
```

---

## Breadcrumbs de Debugging

### Archivo de Trace
```
~/pt-dev/journal/cleanup-last-stage.txt
```

### Contenido Esperado
```
done @1712345678901
```

### Interpretación de Stages

| Stage | Descripción | Si crash aquí |
|-------|-------------|---------------|
| `clear-command-poll` | Limpia intervalo de polling de comandos | Problema con clearInterval |
| `clear-deferred-poll` | Limpia intervalo de polling diferido | Problema con deferred commands |
| `clear-heartbeat` | Limpia intervalo de heartbeat | Problema con heartbeat writer |
| `teardown-watcher` | Desregistra file watcher | Problema con watcher cleanup |
| `save-pending` | Guarda comandos pendientes | Problema con filesystem I/O |
| `null-runtime` | Limpia referencias a runtime | Problema con garbage collection |
| `done` | Cleanup completado | Crash ocurre DESPUÉS de cleanUp |

### Cómo Usar

1. Iniciar PT con script module
2. Ejecutar comandos de prueba
3. Detener módulo (botón Stop)
4. Si PT crashea, revisar:
   ```bash
   cat ~/pt-dev/journal/cleanup-last-stage.txt
   ```
5. El último stage indica dónde ocurrió el crash

---

## Arquitectura Actual del Runtime

### Problema Estructural Identificado

El `runtime.js` desplegado **mezcla dos arquitecturas**:

1. **Infraestructura de Jobs Diferidos** (Fase 5):
   - `IOS_JOBS` - sistema de jobs con tickets
   - `attachTerminalListeners()` / `detachAllTerminalListeners()` - listeners de terminal
   - `pollIosJob()` - polling de jobs en progreso
   - `createIosJob()` - creación de jobs diferidos

2. **Handlers IOS Síncronos** (Fase 1/2):
   - `handleConfigIos()` - ejecución síncrona con while loops
   - `handleExecIos()` - ejecución síncrona con while loops
   - `handleExecInteractive()` - no implementada pero referenciada en dispatcher

### Contradicción

- `main.js` trata al runtime como si soportara jobs diferidos persistentes
- `runtime.js` fue creado con `new Function(...)` + IIFE, así que:
  - No mantiene estado entre invocaciones
  - Cada llamada re-evalúa todo el código
  - `IOS_JOBS` y listeners se recrean en cada llamada
  - No hay persistencia real de jobs

### Solución Estructural Requerida (Futuro)

Para que la Fase 5 funcione correctamente se necesita:

1. **Runtime como módulo con estado persistente**:
   ```javascript
   // runtime.js debe tener esta estructura:
   var STATE = {
     iosJobs: {},
     terminalListeners: {},
     sessions: {}
   };
   
   // Exportar funciones accesibles desde main.js
   this.cleanupRuntime = function() {
     detachAllTerminalListeners();
     STATE.iosJobs = {};
   };
   
   // Dispatcher retorna resultado
   return function(payload, ipc, dprint) {
     // ... dispatch logic
   };
   ```

2. **Main.js llama cleanup directo**:
   ```javascript
   // En lugar de runtimeFn({ type: "__cleanup__" })
   if (typeof cleanupRuntime === "function") {
     cleanupRuntime();
   }
   ```

3. **Migrar handlers IOS a ruta diferida**:
   - `handleConfigIos()` debe devolver `{ deferred: true, ticket: "..." }`
   - `pollDeferredCommands()` debe usar `pollIosJob(ticket)`
   - Eliminar while loops síncronos de handlers IOS

---

## Comandos para Regenerar

```bash
# Build y deploy
bun run pt:build

# Verificar cambios desplegados
grep -n "ENABLE_FILE_WATCHER" ~/pt-dev/main.js
grep -n "markCleanup" ~/pt-dev/main.js
grep -n "invokeRuntimeCleanupHook" ~/pt-dev/main.js
grep -n "detachAllTerminalListeners" ~/pt-dev/runtime.js

# Verificar breadcrumbs después de Stop
cat ~/pt-dev/journal/cleanup-last-stage.txt
```

---

## Smoke Tests

### Test 1: Stop sin comandos
```
1. Abrir PT
2. Cargar script module: ~/pt-dev/main.js
3. Click Start
4. Esperar "[PT] Ready"
5. Click Stop
6. Verificar: NO crash, output muestra "[PT] Stopped"
7. Verificar: ~/pt-dev/journal/cleanup-last-stage.txt contiene "done"
```

### Test 2: Stop con comando simple
```
1. Start module
2. Ejecutar: bun run pt device list
3. Click Stop
4. Verificar: NO crash
```

### Test 3: Stop/Start múltiple
```
1. Start → Stop → Start → Stop → Start → Stop
2. (5 ciclos rápidos)
3. Verificar: Ningún crash
```

### Test 4: Stop después de IOS (si aplica)
```
1. Start module
2. Ejecutar: bun run pt config-host R1 --ip 192.168.1.1 --mask 255.255.255.0
3. Click Stop
4. Verificar: NO crash
5. Si crash: revisar cleanup-last-stage.txt para identificar etapa
```

---

## Historial de Commits

| Commit | Descripción | Fecha |
|--------|-------------|-------|
| 8f43208 | EMERGENCIA: deshabilitar runtime cleanup hook | 2024-04-04 |
| 807a37f | crash fix: watcher + listeners lifecycle | 2024-04-04 |
| 63121ec | Phase 5 crash hotfix - watcher guards | 2024-04-04 |
| 37e526f | Fase 5 - Pipeline Durable Real | 2024-04-04 |
| 55e4100 | Fase 1 IOS - acceso real a terminal | 2024-04-03 |

---

## Referencias

- [PT Script Modules - Documentación Oficial](https://tutorials.ptnetacad.net/help/default/scriptModules_scriptEngine.htm)
- [SystemFileManager API](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_system_file_manager.html)
- [SystemFileWatcher API](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_system_file_watcher.html)
- [TerminalLine API](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_terminal_line.html)
- [MDN: Function() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function)
- [Qt Script Engine Documentation](https://doc.qt.io/qt-5/qtscript-index.html)
