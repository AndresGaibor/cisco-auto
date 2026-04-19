# Lifecycle and Cleanup - Fase 6

> Contrato y comportamiento del cleanUp() en main.js/kernel.

## 1. Contrato de cleanUp()

```typescript
interface CleanupContract {
  // cleanUp() debe ser:
  // - Idempotente: llamar dos veces = mismo efecto
  // - No reentrante: no puede ejecutarse mientras ya se ejecuta
  // - Nunca fatal: nunca lanzar excepción que impida shutdown
  // - Mínimo: solo lifecycle, no lógica de negocio
  // - Sin reparación: no intenta arreglar nada, solo limpiar
}
```

## 2. Estados de cleanup

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLEANUP STATES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   IDLE ──────────────────────────────────────────────────► CLEANING │
│     ▲                                                       │    │
│     │                                                       │    │
│     │   (si se llama durante cleaning,                     │    │
│     │    ignorar - no reentrar)                           │    │
│     │                                                       │    │
│     └───────────────────────────────────────────────── (done)     │
│                                                                  │
│   CLEANING ───► TIMERS_STOPPED ───► LISTENERS_DISCONNECTED     │
│       │                                    │                     │
│       │                                    ▼                     │
│       │                          WATCHERS_CLOSED                │
│       │                                    │                     │
│       │                                    ▼                     │
│       │                          RESOURCES_RELEASED            │
│       │                                    │                     │
│       │                                    ▼                     │
│       │                          IN_FLIGHT_CLEARED             │
│       │                                    │                     │
│       │                                    ▼                     │
│       └────────────────────────────── DONE ◄────────────────────┘
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Secuencia de cleanup

### 3.1 Detener timers

```javascript
// 1. Detener timers de polling/dispatch
if (_pollingTimer !== null) {
  clearInterval(_pollingTimer);
  _pollingTimer = null;
}

// 2. Detener timers de heartbeat
if (_heartbeatTimer !== null) {
  clearInterval(_heartbeatTimer);
  _heartbeatTimer = null;
}

// 3. Detener cualquier timer de snapshot
if (_snapshotTimer !== null) {
  clearInterval(_snapshotTimer);
  _snapshotTimer = null;
}

// 4. Detener timers de deferred jobs
if (_jobTimer !== null) {
  clearTimeout(_jobTimer);
  _jobTimer = null;
}
```

### 3.2 Desconectar listeners

```javascript
// 5. Desconectar listeners de eventos PT
if (_ptEventListener !== null) {
  ipc.removeEventListener('event', _ptEventListener);
  _ptEventListener = null;
}

// 6. Limpiar cualquier callback registrado
_registeredCallbacks.forEach(function(cb) {
  try {
    if (typeof cb === 'function') {
      cb.cancel && cb.cancel();
    }
  } catch (e) { /* ignorar */ }
});
_registeredCallbacks = [];
```

### 3.3 Cerrar watchers

```javascript
// 7. Cerrar file watchers
if (_commandWatcher !== null) {
  _commandWatcher.close();
  _commandWatcher = null;
}

if (_resultWatcher !== null) {
  _resultWatcher.close();
  _resultWatcher = null;
}
```

### 3.4 Soltar recursos terminales

```javascript
// 8. Cerrar sesiones de terminal activas
_activeTerminalSessions.forEach(function(session) {
  try {
    session.close && session.close();
  } catch (e) { /* ignorar */ }
});
_activeTerminalSessions = [];

// 9. Limpiar buffers de terminal
_terminalBuffers = {};
```

### 3.5 Limpiar estado in-flight

```javascript
// 10. Marcar comandos en flight como cancelled
_inFlightCommands.forEach(function(cmd) {
  cmd.status = 'cleaned_up';
  cmd.error = 'CleanUp called';
});

// 11. Limpiar cola de comandos pendientes
_pendingCommands = [];

// 12. Limpiar resultados pendientes
_pendingResults = [];
```

### 3.6 Registrar errores sin reventar shutdown

```javascript
// 13. Registrar errores de cleanup para diagnosis post-mortem
_cleanupErrors = _cleanupErrors || [];
if (cleanupErrors.length > 0) {
  // Escribir a log de errors si existe
  try {
    ipc.writeFile && ipc.writeFile('cleanup-errors.log',
      JSON.stringify(_cleanupErrors));
  } catch (e) { /* ignore */ }
}
```

## 4. cleanUp() completo

```javascript
function cleanUp() {
  // No reentrant
  if (_isCleaningUp) {
    return;
  }
  _isCleaningUp = true;

  var cleanupErrors = [];

  // 1. Detener timers
  if (_pollingTimer !== null) {
    clearInterval(_pollingTimer);
    _pollingTimer = null;
  }

  // 2. Desconectar listeners
  _cleanupHandlers.forEach(function(handler) {
    try {
      handler();
    } catch (e) {
      cleanupErrors.push({ phase: 'handler', error: e.message });
    }
  });

  // 3. Cerrar watchers
  // ... watchers close logic

  // 4. Soltar recursos
  // ... terminal resources

  // 5. Limpiar estado
  // ... in-flight state

  // 6. Registrar errores (sin throw)
  if (cleanupErrors.length > 0) {
    _cleanupErrors = cleanupErrors;
  }

  _isCleaningUp = false;
}
```

## 5. Hot reload como conveniencia

**La documentación oficial de PT** ([Script Modules](https://tutorials.ptnetacad.net/help/default/scriptModules_scriptEngine.htm)) indica:

> The Script Engine has a lifecycle tied to the module's start/stop.

**Implicaciones:**

| Aspecto | Hot Reload | Stop/Start |
|---------|------------|-------------|
| Consistency | Puede tener edge cases | Garantizada |
| Estado en memoria | Puede acumular residuos | Limpio |
| Debugging | Menos predecible | Predecible |
| Uso en producción | No recomendado | Recomendado |
| Uso en dev | Conveniencia | Full restart |

**Conclusión:** Hot reload es una convenience para desarrollo, no la base de consistencia.

## 6. Doble cleanup - comportamiento

**Qué pasa si cleanUp() se llama dos veces:**

```
Primera llamada:     Cleanup completo exitoso
Segunda llamada:    - No vuelve a intentar limpiar recursos ya limpiados
                    - No duplica desconexiones
                    - No deja timers vivos
                    - Retorna sin error
```

```javascript
// Implementación idempotente
function cleanUp() {
  // Check de estado - si ya limpió, no hacer nada
  if (_isCleanedUp) {
    return;
  }

  // ... cleanup logic ...

  _isCleanedUp = true;
}

// Variable de estado
var _isCleanedUp = false;
```

**Verificación de idempotencia:**

```javascript
// Test: doble cleanup no rompe
cleanUp();
cleanUp(); // No debe lanzar, no debe dejar residuos

// Verificar:
// - No timers vivos
// - No listeners activos
// - No sesiones abiertas
assert(_pollingTimer === null);
assert(_ptEventListener === null);
assert(_activeTerminalSessions.length === 0);
```

## 7. Qué NO hacer en cleanUp()

| Prohibido | Razón |
|-----------|-------|
| Lógica de negocio | No pertenece al kernel |
| Intentos de reparación | Solo limpiar, no reparar |
| Throw de excepciones | Shutdown debe completar |
| Acceso a archivos del host | Recursos externos ya no seguros |
| Waiting por respuestas | Puede bloquear shutdown |
| Reintentos | Si falla, marcar y continuar |
| Logging pesado | Shutdown no es momento para logs |

## 8. Shutdown sequence completo

```
┌──────────────────────────────────────────────────────────────────┐
│                    SHUTDOWN SEQUENCE                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   1. IPC收到stop信号                                             │
│      │                                                            │
│      ▼                                                            │
│   2. cleanUp() llamado                                            │
│      │                                                            │
│      ├── Detener timers ────────────────────────────────────┐   │
│      │                                                            │
│      ├── Desconectar listeners ───────────────────────────┐ │   │
│      │                                                        │   │
│      ├── Cerrar watchers ────────────────────────────────┐ │ │   │
│      │                                                        │ │   │
│      ├── Soltar recursos terminales ───────────────────┐ │ │ │   │
│      │                                                        │ │ │   │
│      ├── Limpiar estado in-flight ───────────────────┐ │ │ │ │   │
│      │                                                        │ │ │ │   │
│      └── Registrar errores sin throw ──────────────┐ │ │ │ │ │   │
│                                                    │ │ │ │ │ │   │
│   3. Módulo puede descargarse                      │ │ │ │ │ │   │
│      │                                              │ │ │ │ │ │   │
│      ▼                                              ▼ │ │ │ │ │   │
│   4. Script Engine cleanup implícito               <──┴─┴─┴─┴─┴─    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```
