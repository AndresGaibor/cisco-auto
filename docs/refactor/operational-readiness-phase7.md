# Fase 7: Operational Readiness

## Cómo Validar Entorno

### Validación de Build

```bash
# Build y deploy
bun run pt:build && bun run pt status

# Verificar main.js existe y es el correcto
ls -la ~/pt-dev/main.js
ls -la ~/pt-dev/runtime.js

# Verificar contenido
head -20 ~/pt-dev/main.js
```

**Output esperado:**
```
✓ Build completado
✓ main.js deployado a ~/pt-dev/
✓ runtime.js deployado a ~/pt-dev/
```

### Verificar Packet Tracer Corriendo

```bash
# Verificar proceso PT
pgrep -fl "Packet Tracer"

# O verificar via Omni
bun run pt omni env
```

---

## Smoke Checks Oficiales

### Regression Smoke

```bash
bun run pt omni regression-smoke
```

**Output esperado:**
```
=== Regression Smoke ===
✓ device:add - <1s>
✓ device:list - <1s>
✓ link:add - <2s>
✓ exec:ios - <3s>
✓ config:ip - <1s>

=================================
5 capabilities probadas
5 passed, 0 failed
```

### Terminal Core

```bash
bun run pt omni terminal-core
```

**Output esperado:**
```
=== Terminal Core ===
✓ terminal:connect - <1s>
✓ terminal:exec basic - <2s>
✓ terminal:exec pager - <3s>
✓ terminal:mode switch - <2s>

=================================
4 capabilities probadas
4 passed, 0 failed
```

### Device Basic

```bash
bun run pt omni device-basic
```

**Output esperado:**
```
=== Device Basic ===
✓ device:add - <1s>
✓ device:remove - <1s>
✓ device:move - <2s>
✓ device:list - <1s>

=================================
4 capabilities probadas
4 passed, 0 failed
```

### Link Basic

```bash
bun run pt omni link-basic
```

**Output esperado:**
```
=== Link Basic ===
✓ link:add - <1s>
✓ link:remove - <1s>
✓ link:force - <2s>
✓ link:list - <1s>

=================================
4 capabilities probadas
4 passed, 0 failed
```

---

## Cómo Investigar Fallos

### 1. Revisar Omni Evidence Ledger

```bash
# Ver últimos executions
ls -la ~/.omni/evidence-*.json

# Leer evidence específico
cat ~/.omni/evidence-<timestamp>.json | jq
```

**Estructura de evidence:**
```json
{
  "capability": "device:add",
  "timestamp": "2026-04-19T10:00:00Z",
  "input": { "model": "1841", "name": "R1" },
  "output": { "success": true },
  "status": "passed",
  "duration": 1234,
  "artifacts": ["logs/...", "screenshots/..."]
}
```

### 2. Revisar Support Matrix

```bash
# Ver matrix de soporte
cat docs/refactor/support-matrix.md

# O via CLI
bun run pt omni support-matrix
```

**Estructura:**
```markdown
| Capability | Status | PT Version | Confidence |
|-----------|--------|-----------|------------|
| device:add | stable | 8.0+ | 95% |
| link:add | stable | 8.0+ | 90% |
| device:skipBoot | experimental | 8.1+ | 70% |
```

### 3. Revisar Raw Evidence

```bash
# Evidence detallado
cat ~/.omni/evidence-<id>.json | jq '.output.raw'
cat ~/.omni/evidence-<id>.json | jq '.output.error'
```

### 4. Usar Diagnosis

```bash
# Diagnosis de failures
bun run pt omni diagnose <capability>
```

**Output:**
```
=== Diagnosis ===
Capability: device:add
Failures: 2
Root Cause: Device name collision

Details:
- Failure 1: "Device R1 already exists"
- Failure 2: "Name must be unique"
Recommendation: Use force flag or cleanup first
```

---

## Comandos Oficiales

### Device Operations

```bash
# Agregar dispositivo
bun run pt device add <model> <name>
# Alias: pt d add <model> <name>
# Workflow: workflow:device-add

# Listar dispositivos
bun run pt device list
# Alias: pt d list

# Eliminar dispositivo
bun run pt device remove <name>
# Alias: pt d remove <name>
# Workflow: workflow:device-remove

# Mover dispositivo
bun run pt device move <name> <x> <y>
# Alias: pt d move <name> <x> <y>
```

### Link Operations

```bash
# Conectar dispositivos
bun run pt link add <d1> <p1> <d2> <p2>
# Alias: pt l add <d1> <p1> <d2> <p2>
# Workflow: workflow:link-add

# Desconectar
bun run pt link remove <device> <port>
# Alias: pt l remove <device> <port>
# Workflow: workflow:link-remove

# Forzar conexión (override)
bun run pt link force <d1> <p1> <d2> <p2>
# Alias: pt l force <d1> <p1> <d2> <p2>
```

### Config Operations

```bash
# Configurar IP
bun run pt config ip <dev> <port> <ip> <mask>
# Alias: pt c ip <dev> <port> <ip> <mask>
# Workflow: workflow:config-ip

# Configurar hostname
bun run pt config hostname <dev> <hostname>
# Alias: pt c hostname <dev> <hostname>
# Workflow: workflow:config-hostname

# Configuración IOS directa
bun run pt config-ios <dev> "<cmd>"
# Alias: pt ci <dev> "<cmd>"
```

### Exec Operations

```bash
# Ejecutar comando IOS
bun run pt exec <dev> <cmd>
# Alias: pt e <dev> <cmd>

# Show commands
bun run pt exec <dev> "show ip int brief"
bun run pt exec <dev> "show version"
bun run pt exec <dev> "show vlan"
```

### Canvas Operations

```bash
# Limpiar canvas
bun run pt canvas clear
# Alias: pt clear

# Guardar topología
bun run pt canvas save <name>
# Alias: pt save <name>

# Cargar topología
bun run pt canvas load <name>
# Alias: pt load <name>
```

### Omni Operations

```bash
# Ver status
bun run pt omni status

# Regression smoke
bun run pt omni regression-smoke

# Support matrix
bun run pt omni support-matrix

# Diagnosis
bun run pt omni diagnose <capability>

# Raw execution
bun run pt omni raw "<code>"

# Genome
bun run pt omni genome <device>
```

---

## Health Check Automatizado

### Script de Health Check

```bash
#!/bin/bash
# health-check.sh

echo "=== Health Check ==="

# 1. Verificar PT corriendo
echo -n "PT running: "
pgrep -fl "Packet Tracer" > /dev/null && echo "✓" || echo "✗"

# 2. Verificar main.js
echo -n "main.js: "
[ -f ~/pt-dev/main.js ] && echo "✓" || echo "✗"

# 3. Smoke test
echo -n "Smoke: "
bun run pt omni regression-smoke > /dev/null 2>&1 && echo "✓" || echo "✗"

# 4. Device add
echo -n "Device add: "
bun run pt device add 1841 TestR > /dev/null 2>&1 && echo "✓" || echo "✗"

echo "=== Done ==="
```

---

## Quick Reference

| Comando | Descripción | Timeout |
|---------|-----------|---------|
| `bun run pt status` | Ver status general | 5s |
| `bun run pt omni regression-smoke` | Smoke test | 30s |
| `bun run pt device add 1841 R1` | Agregar router | 10s |
| `bun run pt link add R1 Fa0/0 R2 Fa0/0` | Conectar | 10s |
| `bun run pt exec R1 "show version"` | Ejecutar | 15s |
| `bun run pt canvas clear` | Limpiar | 5s |
| `bun run pt omni raw "<code>"` | Raw execution | 30s |