# Fase 6: Plan de Acción Inmediato (Próximos 3 Pasos)

**Semana 1 (Ahora)**:
- ✅ Pasos 1, 2, 6, 8 completados
- ⏳ Pasos 3, 4, 5 (Esta semana)
- ⏳ Paso 7 (Esta semana)

---

## PASO 3: Crear Capa PT-side de Transcript Real

### Ubicación
`packages/pt-runtime/src/templates/ios-transcript-template.ts`

### Qué Hacer

Crear un template para registrar eventos:

```typescript
/**
 * IOS Transcript Recorder Template (Fase 6)
 * Registra todos los eventos de una sesión interactiva
 */

export class IosTranscriptRecorder {
  private entries: TranscriptEntry[] = [];
  private startTime = Date.now();

  record(type: string, payload?: unknown): void {
    this.entries.push({
      timestamp: Date.now() - this.startTime,  // Relativo al inicio
      type: type as any,
      payload: payload || {}
    });
  }

  getTranscript(): TranscriptEntry[] {
    return [...this.entries];
  }

  getCompact(): TranscriptEntry[] {
    // Filtrar eventos redundantes para Fase 6
    return this.entries.filter(e => {
      // Solo queremos: command-sent, prompt-changed, mode-changed, paging, confirm, etc.
      // NO: cada byte de output
      return !['output-chunk', 'buffer-update'].includes(e.type);
    });
  }

  reset(): void {
    this.entries = [];
    this.startTime = Date.now();
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }

  summary(): {
    eventCount: number;
    duration: number;
    lastEvent?: string;
  } {
    return {
      eventCount: this.entries.length,
      duration: this.getDuration(),
      lastEvent: this.entries[this.entries.length - 1]?.type
    };
  }
}

export function generateIosTranscriptTemplate(): string {
  // Generador para PT-side JavaScript
  return `
    // Recorder registra todo lo que pasó
    var recorder = new IosTranscriptRecorder();
    // ... en handlers use recorder.record('event-type', data)
  `;
}
```

### Integración

En `handleExecInteractive`:
```javascript
var recorder = new IosTranscriptRecorder();

// Antes de cada evento importante:
recorder.record('commandStarted', { command: cmd });
// ... ejecución ...
recorder.record('outputWritten', { bytes: newData.length });
if (engine.getState().paging) {
  recorder.record('pagingDetected', {});
  engine.advancePaging();
  recorder.record('pagingAdvanced', {});
}
// ... final ...
recorder.record('commandEnded', { exitCode: 0 });

// En resultado:
return {
  ...result,
  transcriptSummary: recorder.getCompact()  // ← Aquí
};
```

### Testing

```typescript
test('transcript records key events', () => {
  const recorder = new IosTranscriptRecorder();
  
  recorder.record('commandStarted', { command: 'show version' });
  recorder.record('outputWritten', { bytes: 500 });
  recorder.record('commandEnded', { exitCode: 0 });
  
  const transcript = recorder.getTranscript();
  expect(transcript).toHaveLength(3);
  expect(transcript[0].type).toBe('commandStarted');
  expect(recorder.getDuration()).toBeGreaterThan(0);
});
```

---

## PASO 4: Actualizar `handleExecInteractive` PT-side

### Ubicación
`packages/pt-runtime/src/templates/ios-exec-handlers-template.ts`

### Cambio Clave
Reemplazar:
```javascript
function handleExecInteractive(payload) {
  // Stub: execInteractive usa el mismo mecanismo que execIos pero con streaming
  return handleExecIos(payload);
}
```

Con implementación real usando `IosSessionEngine`.

### Pseudocódigo (simplificado)

```javascript
function handleExecInteractive(payload) {
  var deviceName = payload.device;
  var device = getNet().getDevice(deviceName);
  var term = device.getCommandLine();
  var command = payload.command;
  var recorder = new IosTranscriptRecorder();
  var engine = new IosSessionEngine('priv-exec', '#');
  var startTime = Date.now();
  var output = '';

  try {
    recorder.record('commandStarted', { command: command });
    engine.processEvent({ type: 'commandStarted', command: command });

    var preLen = term.getOutput ? term.getOutput().length : 0;
    term.enterCommand(command);

    var maxAttempts = 100;
    var attempt = 0;

    while (attempt < maxAttempts && !engine.isComplete()) {
      var fullOutput = term.getOutput ? term.getOutput() : '';
      var newData = fullOutput.slice(preLen);

      if (newData.length > 0) {
        recorder.record('outputWritten', { bytes: newData.length });
        engine.processEvent({ type: 'outputWritten', data: newData });
        preLen = fullOutput.length;
        output = fullOutput;
      }

      if (engine.getState().paging) {
        recorder.record('pagingAdvanced');
        engine.advancePaging();
        term.enterCommand(' ');
      }

      if (engine.getState().awaitingConfirm) {
        recorder.record('confirmAnswered');
        engine.answerConfirm('y');
        term.enterCommand('y');
      }

      attempt++;
    }

    if (!engine.isComplete()) {
      engine.processEvent({ type: 'commandEnded' });
    }

    recorder.record('commandEnded', {
      exitCode: 0,
      state: engine.getExecutionState()
    });

    var state = engine.getState();
    var executionTime = Date.now() - startTime;

    if (engine.getExecutionState() === 'completed') {
      return {
        ok: true,
        raw: output,
        command: command,
        session: state,
        interaction: engine.getMetrics(),
        diagnostics: {
          source: 'terminal',
          completionReason: 'command-ended'
        },
        executionTimeMs: executionTime,
        transcriptSummary: recorder.getCompact()
      };
    } else {
      return {
        ok: false,
        raw: output,
        command: command,
        session: state,
        diagnostics: {
          source: 'terminal',
          completionReason: engine.isDesynced() ? 'desync' : 'timeout',
          errors: [engine.hasInteractivePending() ? 
            'Unresolved prompt' : 'Command timeout']
        },
        executionTimeMs: executionTime,
        transcriptSummary: recorder.getCompact()
      };
    }

  } catch (error) {
    recorder.record('exception', { message: String(error) });
    return {
      ok: false,
      raw: output,
      diagnostics: {
        source: 'terminal',
        completionReason: 'unknown',
        errors: [String(error)]
      },
      executionTimeMs: Date.now() - startTime
    };
  }
}
```

### Cambios respecto a `handleExecIos`

| Aspecto | ExecIos | ExecInteractive (Nuevo) |
|---------|---------|------------------------|
| Máquina de estado | No | Sí (IosSessionEngine) |
| Manejo de paging | Ciego | Explícito + tracking |
| Manejo de confirms | Ciego | Explícito + tracking |
| Transcript | No | Sí |
| Resultado | `{ok, raw, status}` | `IosInteractiveResult` |

### Testing Plan

```typescript
test('execInteractive handles normal command', () => {
  const result = handleExecInteractive({
    device: 'R1',
    command: 'show version'
  });
  
  expect(result.ok).toBe(true);
  expect(result.diagnostics.source).toBe('terminal');
  expect(result.diagnostics.completionReason).toBe('command-ended');
  expect(result.transcriptSummary).toBeDefined();
});

test('execInteractive handles paging', () => {
  // Mock PT device que devuelve --More--
  const result = handleExecInteractive({
    device: 'R1',
    command: 'show config'
  });
  
  expect(result.ok).toBe(true);
  expect(result.interaction.pagesAdvanced).toBeGreaterThan(0);
});

test('execInteractive handles timeout', () => {
  // Mock que nunca completa
  const result = handleExecInteractive({
    device: 'R1',
    command: 'hang-command'
  });
  
  expect(result.ok).toBe(false);
  expect(result.diagnostics.completionReason).toBe('timeout');
});
```

---

## PASO 5: Actualizar `handleConfigIos` PT-side

### Ubicación
`packages/pt-runtime/src/templates/ios-config-handlers-template.ts`

### Estructura Nueva

En lugar de 200+ líneas de polling procedural, usar helpers + state machine:

```javascript
function handleConfigIos(payload) {
  var deviceName = payload.device;
  var device = getNet().getDevice(deviceName);
  var term = device.getCommandLine();
  var engine = new IosSessionEngine('user-exec', '>');
  var startTime = Date.now();
  var results = [];

  try {
    // 1. Asegurar priv-exec
    if (!ensurePrivilegedExec(engine, term)) {
      return {
        ok: false,
        device: deviceName,
        error: 'Cannot enter privileged mode',
        results: [],
        diagnostics: {
          source: 'terminal',
          completionReason: 'privilege-error',
          errors: ['enable failed']
        }
      };
    }

    // 2. Asegurar config
    if (!ensureConfigMode(engine, term)) {
      return {
        ok: false,
        device: deviceName,
        error: 'Cannot enter config mode',
        results: [],
        diagnostics: {
          source: 'terminal',
          completionReason: 'mode-transition-error',
          errors: ['configure terminal failed']
        }
      };
    }

    // 3. Ejecutar comandos
    var commands = payload.commands || [];
    for (var i = 0; i < commands.length; i++) {
      var cmd = commands[i];
      
      var result = runSingleCommand(engine, term, cmd);
      results.push({
        index: i,
        command: cmd,
        ok: result.ok,
        output: result.raw.slice(0, 500),
        sessionAfter: engine.getState(),
        diagnostics: result.diagnostics
      });

      if (!result.ok && !isRecoverable(result)) {
        break;  // Error crítico, parar
      }
    }

    // 4. Guardar si se requiere
    if (payload.save !== false && results.every(r => r.ok)) {
      exitConfigMode(engine, term);
      var saveResult = runSingleCommand(engine, term, 'write memory');
      results.push({
        command: 'write memory',
        ok: saveResult.ok,
        output: saveResult.raw,
        diagnostics: saveResult.diagnostics
      });
    }

    var executionTime = Date.now() - startTime;
    var failed = results.findIndex(r => !r.ok);

    return {
      ok: failed === -1,
      device: deviceName,
      executedCount: results.filter(r => r.ok).length,
      failedCount: results.filter(r => !r.ok).length,
      failedIndex: failed,
      results: results,
      session: engine.getState(),
      diagnostics: {
        source: 'terminal',
        completionReason: failed === -1 ? 'command-ended' : 'config-failed',
        errors: failed !== -1 ? 
          ['Config failed at index ' + failed] : []
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

// Helpers (generados en el mismo template)
function ensurePrivilegedExec(engine, term) {
  var state = engine.getState();
  if (state.mode === 'priv-exec') return true;

  var preLen = term.getOutput ? term.getOutput().length : 0;
  term.enterCommand('enable');

  for (var i = 0; i < 20; i++) {
    var output = term.getOutput ? term.getOutput() : '';
    var newData = output.slice(preLen);
    if (newData.length > 0) {
      engine.processEvent({ type: 'outputWritten', data: newData });
      preLen = output.length;
    }
    
    if (engine.getState().mode === 'priv-exec') {
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

  for (var i = 0; i < 20; i++) {
    var output = term.getOutput ? term.getOutput() : '';
    var newData = output.slice(preLen);
    if (newData.length > 0) {
      engine.processEvent({ type: 'outputWritten', data: newData });
      preLen = output.length;
    }
    
    if (engine.getState().mode.indexOf('config') === 0) {
      return true;
    }
  }

  return false;
}

function exitConfigMode(engine, term) {
  var preLen = term.getOutput ? term.getOutput().length : 0;
  term.enterCommand('end');

  for (var i = 0; i < 20; i++) {
    var output = term.getOutput ? term.getOutput() : '';
    var newData = output.slice(preLen);
    if (newData.length > 0) {
      engine.processEvent({ type: 'outputWritten', data: newData });
      preLen = output.length;
    }
    
    if (engine.getState().mode === 'priv-exec') {
      return true;
    }
  }

  return false;
}

function runSingleCommand(engine, term, cmd) {
  var startTime = Date.now();
  var output = '';

  engine.reset();
  engine.processEvent({ type: 'commandStarted', command: cmd });

  var preLen = term.getOutput ? term.getOutput().length : 0;
  term.enterCommand(cmd);

  for (var i = 0; i < 30; i++) {
    var fullOutput = term.getOutput ? term.getOutput() : '';
    var newData = fullOutput.slice(preLen);

    if (newData.length > 0) {
      engine.processEvent({ type: 'outputWritten', data: newData });
      preLen = fullOutput.length;
      output = fullOutput;
    }

    if (engine.getState().paging) {
      engine.advancePaging();
      term.enterCommand(' ');
    }

    if (engine.getState().awaitingConfirm) {
      engine.answerConfirm('y');
      term.enterCommand('y');
    }

    if (engine.isComplete()) break;
  }

  engine.processEvent({ type: 'commandEnded' });

  return {
    ok: engine.getExecutionState() === 'completed',
    raw: output,
    diagnostics: {
      source: 'terminal',
      completionReason: engine.getExecutionState() === 'completed' ? 
        'command-ended' : 'timeout',
      errors: []
    },
    executionTimeMs: Date.now() - startTime
  };
}

function isRecoverable(result) {
  return result.diagnostics.completionReason !== 'privilege-error' &&
         result.diagnostics.completionReason !== 'desync';
}
```

### Cambios Principales

| Antes | Después |
|-------|---------|
| 250 líneas de polling | 100 líneas con helpers |
| Modo inferido por heurística | Detectado por state machine |
| Sin retry de modo | Retry automático en helpers |
| Sin trazabilidad | Resultado enriquecido |
| Éxito = `failedCount === 0` | Éxito = `completionReason === 'command-ended'` |

### Testing Plan

```typescript
test('configIos enters config mode correctly', () => {
  const result = handleConfigIos({
    device: 'R1',
    commands: ['interface Gi0/0']
  });
  
  expect(result.ok).toBe(true);
  expect(result.session.mode).toMatch(/config/);
  expect(result.results[0].sessionAfter.mode).toMatch(/config/);
});

test('configIos handles failed commands', () => {
  const result = handleConfigIos({
    device: 'R1',
    commands: [
      'interface Gi999/0',  // ← Invalida
      'ip address 10.0.0.1 255.255.255.0'
    ]
  });
  
  expect(result.ok).toBe(false);
  expect(result.failedIndex).toBe(0);
  expect(result.results[0].diagnostics.completionReason).toBeDefined();
});

test('configIos saves config', () => {
  const result = handleConfigIos({
    device: 'R1',
    commands: ['interface Gi0/0'],
    save: true
  });
  
  expect(result.ok).toBe(true);
  // write memory debe estar en results
  expect(result.results.some(r => r.command === 'write memory')).toBe(true);
});
```

---

## Próximo: Validación

Después de completar Pasos 3-5:

1. **Typecheck**: `bun run typecheck` (debe pasar sin nuevos errores)
2. **Tests unitarios**: `bun test -- ios-session` (state machine)
3. **Tests de handlers**: `bun test -- ios-exec ios-config` (nuevos handlers)
4. **Validación PT**: Cargar runtime en PT, ejecutar `show version` y `config`

---

## Checklist de Implementación

### Paso 3 ✓
- [ ] Archivo `ios-transcript-template.ts` creado
- [ ] Clase `IosTranscriptRecorder` implementada
- [ ] Tests de transcript pass
- [ ] Integrado en `handleExecInteractive`

### Paso 4 ✓
- [ ] `handleExecInteractive` reescrito
- [ ] Usa `IosSessionEngine`
- [ ] Usa `IosTranscriptRecorder`
- [ ] Devuelve `IosInteractiveResult`
- [ ] Tests de exec interactive pass
- [ ] Sin regresiones en `handleExecIos`

### Paso 5 ✓
- [ ] `handleConfigIos` reescrito
- [ ] Usa helpers (`ensureXXX`)
- [ ] Devuelve resultado enriquecido
- [ ] Maneja errores explícitamente
- [ ] Tests de config pass
- [ ] Validación PT pass

---

## Quick Reference

| Template | Ubicación | Estado |
|----------|-----------|--------|
| `ios-session-engine-template.ts` | pt-runtime/src/templates | ✅ Listo |
| `ios-session-primitives-template.ts` | pt-runtime/src/templates | ✅ Listo |
| `ios-transcript-template.ts` | pt-runtime/src/templates | ⏳ Paso 3 |
| `ios-exec-handlers-template.ts` | pt-runtime/src/templates | ⏳ Paso 4 |
| `ios-config-handlers-template.ts` | pt-runtime/src/templates | ⏳ Paso 5 |
| `ios-error-classifier.ts` | pt-control/src/domain/ios | ✅ Listo |

---

**Próxima revisión**: Cuando Pasos 3-5 estén complete.
