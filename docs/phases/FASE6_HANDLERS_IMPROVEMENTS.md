# Fase 6: Mejoras en Handlers IOS - Guidance

## Paso 4: `execInteractive` PT-side (Nueva Implementación)

### Ubicación de actualización
`packages/pt-runtime/src/templates/ios-exec-handlers-template.ts`

### Mejora clave
Reemplazar el stub actual:
```javascript
function handleExecInteractive(payload) {
  // Stub: execInteractive usa el mismo mecanismo que execIos pero con streaming
  // Por ahora, delegamos a handleExecIos
  return handleExecIos(payload);
}
```

### Con nueva implementación (pseudocódigo)
```javascript
function handleExecInteractive(payload) {
  var deviceName = payload.device;
  var device = getNet().getDevice(deviceName);
  
  if (!device) {
    return createFailedResult({
      raw: '',
      session: { mode: 'unknown' },
      completionReason: 'terminal-unavailable',
      errors: ['Device not found: ' + deviceName],
      executionTimeMs: 0
    });
  }

  var term = device.getCommandLine();
  if (!term) {
    return createFailedResult({
      raw: '',
      session: { mode: 'unknown' },
      completionReason: 'terminal-unavailable',
      errors: ['CLI not available'],
      executionTimeMs: 0
    });
  }

  // Crear session engine
  var engine = new IosSessionEngine('priv-exec', '#');
  var command = payload.command;
  var startTime = Date.now();
  var output = '';

  try {
    // Señalar inicio
    engine.processEvent({ type: 'commandStarted', command: command });
    
    // Ejecutar comando
    var preLength = term.getOutput ? term.getOutput().length : 0;
    term.enterCommand(command);
    
    // Polling con state machine
    var maxAttempts = 100;
    var attempt = 0;
    
    while (attempt < maxAttempts && !engine.isComplete()) {
      try {
        var fullOutput = term.getOutput ? term.getOutput() : '';
        var newData = fullOutput.slice(preLength);
        
        if (newData.length > 0) {
          // Procesar nuevo output en la state machine
          engine.processEvent({ type: 'outputWritten', data: newData });
          preLength = fullOutput.length;
          output = fullOutput;
        }
        
        // Manejar paging
        if (engine.getState().paging) {
          engine.advancePaging();
          term.enterCommand(' ');
        }
        
        // Manejar confirm
        if (engine.getState().awaitingConfirm) {
          engine.answerConfirm('y');
          term.enterCommand('y');
        }
        
        // Detectar fin del comando (heurístico: prompt estable)
        var prompt = term.getPrompt ? term.getPrompt() : '';
        if (prompt.length > 0 && newData.length === 0) {
          engine.processEvent({ type: 'commandEnded' });
        }
        
      } catch(e) {
        engine.processEvent({ type: 'desync' });
        break;
      }
      
      attempt++;
    }
    
    // Forzar fin si no completó naturalmente
    if (!engine.isComplete()) {
      if (engine.hasInteractivePending()) {
        engine.processEvent({ type: 'timeout' });
      } else {
        engine.processEvent({ type: 'commandEnded' });
      }
    }
    
    // Construir resultado
    var state = engine.getState();
    var metrics = engine.getMetrics();
    var executionTime = Date.now() - startTime;
    
    if (engine.getExecutionState() === 'completed') {
      return createSuccessResult({
        raw: output,
        command: command,
        session: state,
        interaction: metrics,
        executionTimeMs: executionTime,
        transcriptSummary: engine.getEventLog().map(function(e) {
          return {
            timestamp: e.timestamp,
            type: e.type,
            payload: e.data || {}
          };
        })
      });
    } else {
      return createFailedResult({
        raw: output,
        command: command,
        session: state,
        completionReason: engine.isDesynced() ? 'desync' : 'timeout',
        errors: engine.hasInteractivePending() ? 
          ['Unresolved interactive prompt'] : 
          ['Command did not complete'],
        executionTimeMs: executionTime,
        transcriptSummary: engine.getEventLog().map(function(e) {
          return {
            timestamp: e.timestamp,
            type: e.type,
            payload: e.data || {}
          };
        })
      });
    }
    
  } catch (error) {
    var executionTime = Date.now() - startTime;
    return createFailedResult({
      raw: output,
      command: command,
      session: engine.getState(),
      completionReason: 'unknown',
      errors: [String(error)],
      executionTimeMs: executionTime
    });
  }
}
```

### Cambios clave respecto a `handleExecIos`
1. ✅ Usa `IosSessionEngine` explícitamente
2. ✅ Devuelve `IosInteractiveResult` en lugar de output plano
3. ✅ Maneja paging, confirms, passwords automáticamente
4. ✅ Tracking completo de métricas de interacción
5. ✅ `completionReason` explícito (no heurístico)
6. ✅ Transcript de eventos incluido

---

## Paso 5: `configIos` PT-side (Nueva Implementación)

### Ubicación de actualización
`packages/pt-runtime/src/templates/ios-config-handlers-template.ts`

### Mejora clave
Reemplazar lógica procedural con helpers de sesión

### Pseudocódigo de nueva implementación
```javascript
function handleConfigIos(payload) {
  var deviceName = payload.device;
  var device = getNet().getDevice(deviceName);
  
  if (!device) {
    return {
      ok: false,
      device: deviceName,
      error: 'Device not found',
      results: [],
      diagnostics: {
        source: 'synthetic',
        completionReason: 'terminal-unavailable',
        errors: ['Device not found']
      }
    };
  }

  var term = device.getCommandLine();
  if (!term) {
    return {
      ok: false,
      device: deviceName,
      error: 'CLI unavailable',
      results: [],
      diagnostics: {
        source: 'synthetic',
        completionReason: 'terminal-unavailable',
        errors: ['CLI not available']
      }
    };
  }

  var engine = new IosSessionEngine('user-exec', '>');
  var startTime = Date.now();
  var results = [];
  var failedIndex = -1;

  try {
    // 1. Asegurar modo privilegiado
    dprint('[handleConfigIos] Ensuring privileged mode');
    if (!ensurePrivilegedExec(engine, term)) {
      return {
        ok: false,
        device: deviceName,
        error: 'Failed to enter privileged exec mode',
        results: [],
        diagnostics: {
          source: 'terminal',
          completionReason: 'privilege-error',
          errors: ['Cannot enter enable mode']
        }
      };
    }

    // 2. Asegurar modo config
    dprint('[handleConfigIos] Ensuring config mode');
    if (!ensureConfigMode(engine, term)) {
      return {
        ok: false,
        device: deviceName,
        error: 'Failed to enter configuration mode',
        results: [],
        diagnostics: {
          source: 'terminal',
          completionReason: 'mode-transition-error',
          errors: ['Cannot enter config mode']
        }
      };
    }

    // 3. Ejecutar comandos
    var commands = payload.commands || [];
    dprint('[handleConfigIos] Executing ' + commands.length + ' commands');

    for (var i = 0; i < commands.length; i++) {
      var cmd = commands[i];
      dprint('[handleConfigIos] Command ' + i + ': ' + cmd);

      // Ejecutar con state machine
      var result = runInteractiveCommand(engine, term, cmd, {
        handlePagingAuto: true,
        confirmAnswer: 'y'
      });

      results.push({
        index: i,
        command: cmd,
        ok: result.ok,
        output: result.raw.slice(0, 500),
        sessionBefore: /* estado antes */,
        sessionAfter: result.session,
        interaction: result.interaction,
        diagnostics: result.diagnostics
      });

      // Si hay error crítico, parar
      if (!result.ok && !isRecoverableError(result)) {
        failedIndex = i;
        break;
      }
    }

    // 4. Guardar si se requiere
    if (payload.save !== false && failedIndex === -1) {
      dprint('[handleConfigIos] Saving configuration');
      
      // Exit config mode
      exitConfigMode(engine, term);
      
      // write memory
      var saveResult = runInteractiveCommand(engine, term, 'write memory', {
        handlePagingAuto: true
      });

      if (!saveResult.ok) {
        results.push({
          command: 'write memory',
          ok: false,
          output: saveResult.raw,
          diagnostics: saveResult.diagnostics
        });
        failedIndex = results.length - 1;
      }
    }

    var executionTime = Date.now() - startTime;

    return {
      ok: failedIndex === -1,
      device: deviceName,
      executedCount: results.filter(function(r) { return r.ok; }).length,
      failedCount: results.filter(function(r) { return !r.ok; }).length,
      failedIndex: failedIndex,
      results: results,
      session: engine.getState(),
      diagnostics: {
        source: 'terminal',
        completionReason: failedIndex === -1 ? 'command-ended' : 'config-error',
        errors: failedIndex !== -1 ? ['Configuration failed at command ' + failedIndex] : []
      },
      executionTimeMs: executionTime
    };

  } catch (error) {
    return {
      ok: false,
      device: deviceName,
      error: String(error),
      results: results,
      diagnostics: {
        source: 'terminal',
        completionReason: 'unknown',
        errors: [String(error)]
      }
    };
  }
}

// Helpers PT-side (generados en mismo template o importados)
function ensurePrivilegedExec(engine, term) {
  var state = engine.getState();
  if (state.mode === 'priv-exec') return true;
  
  var preLen = term.getOutput ? term.getOutput().length : 0;
  term.enterCommand('enable');
  
  // Polling simple
  var maxAttempts = 20;
  for (var i = 0; i < maxAttempts; i++) {
    var output = term.getOutput ? term.getOutput() : '';
    var newData = output.slice(preLen);
    if (newData.length > 0) {
      engine.processEvent({ type: 'outputWritten', data: newData });
      preLen = output.length;
    }
    
    var newState = engine.getState();
    if (newState.mode === 'priv-exec' && newData.indexOf('#') >= 0) {
      return true;
    }
  }
  
  return false;
}

function ensureConfigMode(engine, term) {
  var state = engine.getState();
  if (state.mode.indexOf('config') === 0) return true;
  
  var preLen = term.getOutput ? term.getOutput().length : 0;
  term.enterCommand('configure terminal');
  
  var maxAttempts = 20;
  for (var i = 0; i < maxAttempts; i++) {
    var output = term.getOutput ? term.getOutput() : '';
    var newData = output.slice(preLen);
    if (newData.length > 0) {
      engine.processEvent({ type: 'outputWritten', data: newData });
      preLen = output.length;
    }
    
    var newState = engine.getState();
    if (newState.mode.indexOf('config') === 0) {
      return true;
    }
  }
  
  return false;
}

function exitConfigMode(engine, term) {
  var preLen = term.getOutput ? term.getOutput().length : 0;
  term.enterCommand('end');
  
  var maxAttempts = 20;
  for (var i = 0; i < maxAttempts; i++) {
    var output = term.getOutput ? term.getOutput() : '';
    var newData = output.slice(preLen);
    if (newData.length > 0) {
      engine.processEvent({ type: 'outputWritten', data: newData });
      preLen = output.length;
    }
    
    var newState = engine.getState();
    if (newState.mode === 'priv-exec') {
      return true;
    }
  }
  
  return false;
}

function runInteractiveCommand(engine, term, command, options) {
  // Similar a handleExecInteractive pero para un comando individual
  // Retorna IosInteractiveResult
  // ...implementación omitida por brevedad
}

function isRecoverableError(result) {
  // Usar el clasificador de errores
  // return !isHardFailure(result);
  return result.diagnostics.completionReason !== 'desync' &&
         result.diagnostics.completionReason !== 'terminal-unavailable';
}
```

---

## Cambios Clave en ambos Handlers

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Base** | Polling simple en loop | `IosSessionEngine` con state machine |
| **Resultado** | `{ ok, raw, status }` | `IosInteractiveResult` enriquecido |
| **Éxito** | Heurística: `% Invalid` o `#` presentes | Basado en `diagnostics.completionReason` |
| **Paging** | Detecta `--More--`, responde ciegamente | Tracks en `metrics.pagesAdvanced` |
| **Confirms** | Responde con `\n` | Responde con respuesta específica |
| **Trazabilidad** | Ninguna | Transcript de eventos + metrics |
| **Errores** | String difuso | `ClassifiedError` estructurado |

---

## Integración en pt-control

El `IosService` alto debe cambiar de:
```typescript
// ANTES
execInteractive(device: string, command: string) {
  const result = await this.bridge.execInteractive({ device, command });
  return result.ok && !result.raw.includes('% Invalid');
}
```

A:
```typescript
// DESPUÉS
execInteractive(device: string, command: string) {
  const result = await this.bridge.execInteractive({ device, command });
  
  // Usar diagnostics en lugar de heurísticas
  const error = classifyIosError(result);
  
  return {
    ok: result.ok && result.diagnostics.source === 'terminal',
    result,
    error,
    reliability: result.diagnostics.reliabilityScore
  };
}
```

---

## Testing Strategy

### Tests unitarios (sin PT)
- `IosSessionEngine` transitions
- `classifyIosError` patterns
- Helpers de sesión en isolación

### Tests de integración (con PT mock)
- `execInteractive` con paging
- `execInteractive` con confirms
- `configIos` mode transitions
- `configIos` error recovery

### Tests E2E (en PT real)
- Toda la cadena: CLI → bridge → runtime → device
- Validar configuraciones reales
- Verificar transcript accuracy

