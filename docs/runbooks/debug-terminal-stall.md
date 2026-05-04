# Runbook: Debug Terminal Stall

## PT_RUNTIME_UNAVAILABLE

### Signos

```
result.error.code === "PT_RUNTIME_UNAVAILABLE"
result.error.phase === "detection"
result.status === 1
```

### Causas comunes

1. **PT no está ejecutando main.js** — Packet Tracer no tiene el script cargado
2. **Bridge no puede escribir en PT_DEV_DIR** — permisos o directorio no existe
3. **Runtime crashed** — el proceso de PT Script Module murió
4. **Heartbeat ausente** — `heartbeat.json` no se actualiza por > 10s

### Diagnóstico

```bash
# 1. Verificar que PT esté corriendo con el script
cat ~/pt-dev/heartbeat.json | jq '.'
# Expected: timestamp actualizado < 10s

# 2. Ver estado del bridge
bun run pt runtime status --json

# 3. Ver logs de runtime
cat ~/pt-dev/logs/pt-debug.current.ndjson | tail -30

# 4. Ver cola de comandos pendientes
ls -la ~/pt-dev/commands/
ls -la ~/pt-dev/in-flight/
```

### Resolución

```bash
# Opción 1: Recargar runtime en PT
# En Packet Tracer: File > Open > ~/pt-dev/main.js

# Opción 2: Re-deploy si hay cambios
cd packages/pt-runtime && bun run deploy

# Opción 3: Verificar lease
cat ~/pt-dev/lease.lock  # No debería existir si el proceso murió
```

---

## TERMINAL_DEFERRED_STALLED

### Signos

```
result.error.code === "TERMINAL_DEFERRED_STALLED"
result.error.phase === "terminal-plan-poll"
```

### Causas comunes

1. **Comando IOS colgado** — el comando no terminó y no hubo `--More--`
2. **Prompt inesperado** — el output no se parseó correctamente
3. **Sesión en mal estado** — el terminal quedó en modo `waiting-command`
4. **Job en queue pero sin execution** — el kernel no procesó el deferred job

### Diagnóstico

```bash
# 1. Ver logs de terminal en PT
# En consola PT: self.PT_DEBUG = 1
dprint("debug terminal stall")

# 2. Ver estado del deferred job
cat ~/pt-dev/results/*.json | jq -s '.[-1]'

# 3. Verificar si hay --More-- activo
# Buscar en output: "--More--", "---More---", pagination

# 4. Ver events del bridge
cat ~/pt-dev/events.ndjson | grep "deferred" | tail -20
```

### Resolución

```bash
# Opción 1: Enviar continuePager desde CLI
bun run pt cmd <device> "" --continue-pager

# Opción 2: Limpiar session colgada
# En PT, cerrar y reabrir terminal del dispositivo

# Opción 3: Aumentar stallTimeoutMs en el plan
# En terminal-command-service.ts:
# stallTimeoutMs: 15000 → 30000

# Opción 4: Resetear el runtime
# File > Open > ~/pt-dev/main.js (recargar)
```

### Código de ejemplo para detectar

```typescript
// En deferred-poller.ts línea 125-137
if (isStillPending(pollValue)) {
  const elapsedMs = nowMs() - startedAt;
  return buildTerminalDeferredFailure(
    "TERMINAL_DEFERRED_STALLED",
    `Job pendiente después de ${pollTimeoutMs}ms`,
    { phase: "terminal-plan-poll", ticket, pollTimeoutMs, elapsedMs }
  );
}
```

### Checklist de debugging

- [ ] `heartbeat.json` existe y se actualiza
- [ ] `bun run pt runtime status --json` muestra `ready: true`
- [ ] No hay archivos en `in-flight/` por > 30s
- [ ] El dispositivo existe en PT y está encendido
- [ ] El comando IOS funciona manualmente en PT