# Pruebas de pt-control

Este documento lista las pruebas disponibles y cómo ejecutarlas.

## Pruebas Unitarias (automáticas)

### FileBridge (742 tests)

```bash
cd packages/file-bridge && bun test
```

| Módulo | Tests | Funcionalidades |
|--------|-------|------------------|
| `file-bridge-v2.test.ts` | ~20 | start/stop, sendCommand, sendCommandAndWait, diagnostics |
| `crash-recovery.test.ts` | ~10 | recovery de in-flight, requeue, max attempts, dead-letter |
| `backpressure.test.ts` | ~15 | checkCapacity, waitForCapacity, cola llena |
| `lease-management.test.ts` | ~10 | acquire/release lease, lease válido |
| `garbage-collection.test.ts` | ~10 | GC de resultados/logs viejos |
| `fs-atomic.test.ts` | ~15 | atomicWriteFile, ensureDir |
| `durable-ndjson-consumer.test.ts` | ~30 | consumo de eventos, gaps, recovery |
| `log-rotation.test.ts` | ~10 | rotación de logs |
| **Total** | **742** | |

### pt-control (686 tests)

```bash
cd packages/pt-control && bun test
```

| Módulo | Tests | Funcionalidades |
|--------|-------|------------------|
| `vlan-id.test.ts` | ~15 | Validación de VLAN ID |
| `subnet-mask.test.ts` | ~10 | Parsing de máscaras |
| `ios-commands.test.ts` | ~20 | Generación de comandos IOS |
| `capability-resolver.test.ts` | ~15 | Resolución de capacidades |
| `topology/*.test.ts` | ~50 | Dispositivos, puertos, links |
| `domain/ios/*.test.ts` | ~100 | Lógica de dominio IOS |
| **Total** | **686** | |

> **Nota:** 1 test falla en `vlan-id.test.ts` (bug preexistente en test, no en código)

---

## Pruebas de Integración (requieren Packet Tracer)

### Requisitos

1. Packet Tracer instalado y corriendo
2. Script Module cargado (File > Open > pt-dev/main.js)
3. Bridge ejecutándose

### Comandos para probar

#### 1. Crear dispositivo

```bash
cd apps/pt-cli && bun start add-device Router1 2911
```

**Verificación:** En PT, verificar que aparece Router1 en el canvas

#### 2. Listar dispositivos

```bash
cd apps/pt-cli && bun start list-devices
```

**Verificación:** Verificar que aparecen los dispositivos en el resultado

#### 3. Mover dispositivo

```bash
cd apps/pt-cli && bun start move-device Router1 200 150
```

**Verificación:** Verificar coordenadas en PT

#### 4. Conectar dispositivos

```bash
cd apps/pt-cli && bun start add-link Router1 GigabitEthernet0/0 Switch1 GigabitEthernet0/1
```

**Verificación:** Verificar que el link aparece en PT

#### 5. Configurar IOS

```bash
cd apps/pt-cli && bun start config-ios Router1 "hostname R1" "interface GigabitEthernet0/0" "ip address 192.168.1.1 255.255.255.0"
```

**Verificación:** Hacer `show running-config` en el dispositivo

#### 6. Ejecutar comando IOS

```bash
cd apps/pt-cli && bun start exec-ios Router1 "show ip interface brief"
```

**Verificación:** Verificar output del comando

#### 7. Snapshot

```bash
cd apps/pt-cli && bun start snapshot
```

**Verificación:** Verificar que se crea `~/pt-dev/state.json`

---

## Build y Deploy

### Build completo

```bash
bun run pt:build
```

Este comando:
1. Rebuild `@cisco-auto/file-bridge` (actualiza templates)
2. Build `@cisco-auto/pt-control`
3. Deploy a `~/pt-dev/main.js` y `~/pt-dev/runtime.js`

### Regenerar solo runtime

```bash
bun run pt:generate
```

### Deploy manual

```bash
cp packages/pt-control/generated/main.js ~/pt-dev/main.js
cp packages/pt-control/generated/runtime.js ~/pt-dev/runtime.js
```

---

## Arquitectura de Cola

### Directorios

| Directorio | Propósito |
|------------|-----------|
| `commands/` | Comandos pendientes (formato: `<seq>-<type>.json`) |
| `in-flight/` | Comandos siendo procesados por PT |
| `results/` | Resultados autoritativos (`<cmdId>.json`) |
| `logs/` | Journal de eventos NDJSON |
| `dead-letter/` | Comandos corruptos o irrecuperables |

### Flujo de un comando

```
CLI (sendCommand) --> commands/<seq>-<type>.json
                           |
                           v
                    PT (poll cada 100ms)
                           |
                           v
                    rename a in-flight/<file>.json
                           |
                           v
                    Ejecutar runtime.js
                           |
                           v
                    Escribir results/<cmdId>.json
                           |
                           v
                    Borrar in-flight/
```

### Backpressure

- Máximo de comandos pendientes: 500 (configurable)
- Cuando se reacha el límite, `sendCommand` lanza `BackpressureError`

### Crash Recovery

Al iniciar el bridge:
1. Si hay archivos huérfanos en `in-flight/` con resultado existente → limpiar
2. Si hay archivos en `in-flight/` sin resultado y `attempt < maxAttempts` → reencolar
3. Si hay archivos en `in-flight/` con `attempt >= maxAttempts` → marcar como fallido
4. Si hay archivos corruptos → mover a `dead-letter/`

---

## Verificación post-build

Después de `bun run pt:build`, verificar en Packet Tracer:

```
[INFO] Commands dir: /Users/andresgaibor/pt-dev/commands
```

(No debe mostrar `Command file: .../command.json`)
