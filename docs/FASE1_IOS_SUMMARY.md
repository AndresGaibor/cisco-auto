# Fase 1 IOS - Resumen de Problemas y Soluciones

## Objetivo

Implementar acceso real a IOS en Packet Tracer sin fallback sintético (`simulated: true`), usando la API de TerminalLine.

---

## Problemas Encontrados y Soluciones

### 1. SyntaxError: Caracteres inválidos en runtime.js

**Problema:**
```bash
node --check ~/pt-dev/runtime.js
# SyntaxError: Invalid or unexpected token
# Línea 2285: output.split("
```

**Causa:** Los templates usaban `\n` (newline literal) en lugar de `\\n` (string escapado).

**Solución:** Cambiar en ios-config-handlers-template.ts y ios-exec-handlers-template.ts:
```javascript
// Antes (incorrecto):
var outputLines = output.split("\n");

// Después (correcto):
var outputLines = output.split("\\n");
```

---

### 2. getCommandLine is not defined

**Problema:**
```javascript
ReferenceError: getCommandLine is not defined
```

**Causa:** La función `getCommandLine(deviceName)` no existía en helpers-template.ts.

**Solución:** Agregar la función en helpers-template.ts:
```javascript
function getCommandLine(deviceName) {
  var device = getNet().getDevice(deviceName);
  if (!device) return null;
  try {
    return device.getCommandLine();
  } catch (e) {
    return null;
  }
}
```

---

### 3. Buffer containía output histórico acumulado

**Problema:**
El output mostraba comandos anteriores mezclados con el nuevo:
```
Switch(config)#spanning-tree mode pvst
Switch(config)#hostname Core3650
```

**Causa:** `term.getOutput()` returns ALL accumulated output desde el inicio de sesión.

**Solución:** Usar slicing de buffer - obtener longitud ANTES de enviar comando y tomar solo lo nuevo:
```javascript
var preCommandLength = term.getOutput ? term.getOutput().length : 0;
term.enterCommand(cmd);
// ...
output = checkOutput.slice(preCommandLength);
```

---

### 4. Estado de modo inicial incorrecto

**Problema:**
El código asumía que siempre empezaba en `user-exec`, pero podía estar en cualquier modo (`priv-exec`, `config`, etc.).

**Solución:** Detectar modo actual antes de cualquier transición:
```javascript
var prompt = term.getPrompt ? term.getPrompt() : "";
if (prompt.indexOf("(config") >= 0) currentMode = "config";
else if (prompt.indexOf("#") >= 0) currentMode = "priv-exec";
else if (prompt.indexOf(">") >= 0) currentMode = "user-exec";
```

---

### 5. Transiciones de modo incorrectas

**Problema:**
El código intentaba entrar en `configure terminal` aunque ya estuviera en modo config.

**Solución:** Siempre salir de config primero, luego entrar en enable si es necesario, y finalmente configure terminal:
```javascript
// 1. Si ya está en config, salir primero
if (currentMode === "config") {
  executeCommandSync("end");
}

// 2. Si no está en priv-exec, entrar en enable
if (currentMode !== "priv-exec") {
  executeCommandSync("enable");
}

// 3. Si no está en config, entrar
if (currentMode.indexOf("config") !== 0) {
  executeCommandSync("configure terminal");
}
```

---

### 6. Detección de errores incorrecta

**Problema:**
Cualquier `% Invalid` en el output histórico marcaba el comando como fallido.

**Solución:** Solo verificar errores en las últimas líneas del output nuevo:
```javascript
var outputLines = output.split("\\n");
var lastLines = outputLines.slice(-5).join("\\n");
if (lastLines.indexOf("% Invalid") >= 0) status = 1;
```

---

### 7. Fallback sintético contaminando resultados

**Problema:**
El código viejo tenía `generateSimulatedConfig` y `generateSimulatedVersion` como fallback.

**Solución:**
1. Reescribir completamente ios-config-handlers y ios-exec-handlers
2. No usar fallback sintético por defecto
3. Si CLI no está disponible, devolver error explícito:
```javascript
{ ok: false, code: "CLI_UNAVAILABLE", error: "..." }
```

---

## Arquitectura Implementada

### Flujo de configIos:
```
1. Detectar modo actual (getPrompt)
2. Si está en config → "end"
3. Si no está en priv-exec → "enable"
4. Si no está en config → "configure terminal"
5. Ejecutar comandos del payload
6. Si save !== false → "end" + "write memory"
7. Retornar resultados con source: "terminal"
```

### Flujo de execIos:
```
1. Detectar modo actual
2. Si está en config y es show → "end"
3. Si es show y no está en priv-exec → "enable"
4. Obtener preCommandLength
5. enterCommand(comando)
6. Poll until prompt appears
7. Slice output desde preCommandLength
8. Verificar errores en últimas líneas
9. Retornar resultado
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `main.ts` | pendingCommands, pollDeferredCommands() |
| `session-template.ts` | IOS_JOBS, createIosJob, etc. |
| `ios-config-handlers-template.ts` | Reescrito con transiciones correctas |
| `ios-exec-handlers-template.ts` | Reescrito con buffer slicing |
| `dispatcher-template.ts` | agregado __pollDeferred |
| `helpers-template.ts` | agregado getCommandLine() |
| `ios-service.ts` | Validación de source: "synthetic" |
| `runtime-validator.ts` | Validación de componentes IOS |

---

## Resultados Finales

### Antes:
```json
{ "ok": true, "simulated": true, "source": "synthetic" }
```

### Después:
```json
{ "ok": true, "source": "terminal", "raw": "hostname Core3650\n..." }
```

### Tests exitosos:
```bash
bun run pt config-ios Core3650 "hostname Core3650"
# ✓ Comando ejecutado exitosamente

bun run pt show run-config Core3650
# hostname Core3650
```

---

## Próximos Pasos (Fase 2)

- [ ] Jobs asíncronos con event listeners (commandEnded, outputWritten)
- [ ] Manejo de paging (--More--)
- [ ] Manejo de confirm prompts
- [ ] Soporte para más modelos de dispositivos
- [ ] Tests unitarios para IOS handlers
