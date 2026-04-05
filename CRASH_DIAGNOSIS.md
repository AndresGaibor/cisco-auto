# Documentación para Diagnóstico de Crash - PT Script Module (Fase 5)

## Archivos Involucrados

### 1. Template Principal (TypeScript)
- **Ubicación**: `packages/pt-runtime/src/templates/main.ts`
- **Descripción**: Template ES6 que se transpila a main.js para PT
- **Líneas**: 663 líneas

### 2. Archivo Generado (desplegado a PT)
- **Ubicación**: `~/pt-dev/main.js`
- **Tamaño**: 656 líneas, ~18KB
- **Ubicación real**: `/Users/andresgaibor/pt-dev/main.js`

### 3. Runtime (desplegado a PT)
- **Ubicación**: `~/pt-dev/runtime.js`
- **Tamaño**: 3274 líneas, ~100KB
- **Ubicación real**: `/Users/andresgaibor/pt-dev/runtime.js`

### 4. Generador
- **Ubicación**: `packages/pt-runtime/src/index.ts`
- **Función**: Genera y despliega main.js y runtime.js a ~/pt-dev/

### 5. Validador
- **Ubicación**: `packages/pt-runtime/src/runtime-validator.ts`
- **Función**: Valida que el código generado sea PT-safe (compatible con Qt Script Engine)

---

## Estructura del main.js Generado

```
// Líneas 1-30: Comentarios y paths de directorios
// Líneas 31-60: Variables globales (fm, runtimeFn, intervals, etc.)
// Líneas 64-101: function main() - punto de entrada
// Líneas 107-137: migrateLegacyCommand() - migración de command.json legacy
// Líneas 143-151: ensureDir() - crear directorios
// Líneas 157-191: File watcher y helpers
// Líneas 197-219: Heartbeat y countQueueFiles()
// Líneas 225-249: loadRuntime() - cargar runtime.js
// Líneas 258-275: listQueuedCommandFiles() - lista archivos en cola
// Líneas 281-318: claimNextCommand() - reclamar comando por move
// Líneas 323-339: moveToDeadLetter() - mover archivo a dead-letter/
// Líneas 345-419: recoverInFlightOnStartup() - recovery al iniciar
// Líneas 425-445: savePendingCommands() / loadPendingCommands()
// Líneas 451-463: pollCommandQueue() - polling de comandos
// Líneas 465-533: executeActiveCommand() - ejecutar comando
// Líneas 539-550: writeResultEnvelope() - escribir resultado
// Líneas 556-618: pollDeferredCommands() - polling de jobs diferidos
// Líneas 624-662: cleanUp() - cleanup al cerrar
```

---

## Posibles Causas de Crash

### Causa 1: FileWatcher con directorios
El código usa:
```javascript
fw.addPath(COMMANDS_DIR);  // Agregar directorio al watcher
fw.registerEvent("directoryChanged", null, onWatchedDirChanged);
```

**Problema conocido**: El `SystemFileWatcher` de PT puede no soportar vigilar directorios directamente, solo archivos. Esto puede causar crash.

### Causa 2: getFilesInDirectory
El código usa:
```javascript
var files = fm.getFilesInDirectory(COMMANDS_DIR);
```

**Verificar**: ¿El API `getFilesInDirectory` funciona correctamente en PT 8.1+? Según la documentación oficial, debería funcionar.

### Causa 3: moveSrcFileToDestFile
El código usa:
```javascript
fm.moveSrcFileToDestFile(srcPath, dstPath, false);
```

**Verificar**: ¿El tercer parámetro (bReplace) está causando problemas?

### Causa 4: memory/stack overflow
El runtime.js tiene 3274 líneas. Si hay recursion o loops infinitos, PT puede colapsar.

---

## Código Relevante del main.ts (Template)

### FileWatcher (líneas 157-170):
```javascript
function setupFileWatcher() {
  try {
    fw = fm.getFileWatcher();
    if (fw) {
      fw.addPath(RUNTIME_FILE);
      // También vigilar commands/ para nudge
      fw.addPath(COMMANDS_DIR);
      fw.registerEvent("fileChanged", null, onWatchedFileChanged);
      fw.registerEvent("directoryChanged", null, onWatchedDirChanged);
    }
  } catch (e) {
    dprint("[watcher] " + String(e));
  }
}
```

### listQueuedCommandFiles (líneas 258-275):
```javascript
function listQueuedCommandFiles() {
  try {
    var files = fm.getFilesInDirectory(COMMANDS_DIR);
    if (!files) return [];
    // Filtrar solo .json y ordenar
    var jsonFiles = [];
    for (var i = 0; i < files.length; i++) {
      if (files[i].indexOf(".json") !== -1) {
        jsonFiles.push(files[i]);
      }
    }
    jsonFiles.sort();
    return jsonFiles;
  } catch (e) {
    dprint("[queue] list error: " + String(e));
    return [];
  }
}
```

### claimNextCommand (líneas 281-318):
```javascript
function claimNextCommand() {
  var files = listQueuedCommandFiles();
  
  for (var i = 0; i < files.length; i++) {
    var filename = files[i];
    var srcPath = COMMANDS_DIR + "/" + filename;
    var dstPath = IN_FLIGHT_DIR + "/" + filename;
    
    // Intentar claim por move
    var moved = false;
    try {
      // Verificar que existe
      if (!fm.fileExists(srcPath)) continue;
      
      // Mover a in-flight/
      fm.moveSrcFileToDestFile(srcPath, dstPath, false);
      moved = true;
      dprint("[PT] Claimed: " + filename);
    } catch (e) {
      // Otro proceso ya lo tomó o error
      continue;
    }
    
    if (moved) {
      try {
        var content = fm.getFileContents(dstPath);
        var cmd = JSON.parse(content);
        return { filename: filename, command: cmd };
      } catch (e) {
        dprint("[PT] Claimed file invalid: " + filename);
        // Mover a dead-letter
        moveToDeadLetter(dstPath, e);
      }
    }
  }
  
  return null;
}
```

---

## Recomendaciones para Diagnóstico

### 1. Comentariar el FileWatcher de directorio
Cambiar `main.ts` línea 163:
```javascript
// fw.addPath(COMMANDS_DIR);  // Comentar esto - puede causar crash
```

### 2. Agregar más logging
Antes de cada operación de filesystem, agregar dprint para ver dónde falla.

### 3. Reducir operaciones
En lugar de `getFilesInDirectory` en cada poll, usar un archivo manifest.

### 4. Versión anterior
Si el problema comenzó en Fase 5,恢复到 la versión anterior (Fase 2/3/4) que usaba `command.json`.

---

## Comando para Regenerar

```bash
bun run pt:build
```

Esto regenera main.js y runtime.js desde los templates y los despliega a ~/pt-dev/