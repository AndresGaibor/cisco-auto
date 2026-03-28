---
name: cisco-networking-assistant
description: |
  Asistente experto para tareas de redes Cisco y Packet Tracer. 
  Usa esta skill cuando el usuario necesite ayuda con:
  - Configuración de laboratorios Cisco (VLANs, routing, seguridad)
  - Parseo o modificación de archivos .pka de Packet Tracer
  - Generación de comandos IOS para copiar y pegar
  - Troubleshooting de problemas de red
  - Guía paso a paso para completar talleres
  - Análisis de topologías de red
  - Validación de configuraciones
  - Control programático de Packet Tracer via CLI profesional
  
  La skill soporta dos modos: GUIA (instrucciones detalladas paso a paso) 
  y AUTOMATICO (modificación directa de archivos PKA/YAML).
  Incluye CLI profesional `pt` basada en oclif (similar a GitHub CLI).
  Adapta el nivel de detalle según la experiencia del usuario.
---

# Cisco Networking Assistant

Asistente integral para redes Cisco, laboratorios de Packet Tracer, y configuración de dispositivos. Diseñado para estudiantes de CCNA/CCNP y profesionales de redes.

## CLI Profesional `pt`

La herramienta principal es el comando `pt` (pt-control-v2), una CLI profesional basada en **oclif** (el mismo framework que usa GitHub CLI `gh`).

### Instalación y Acceso

```bash
# Si está instalado globalmente
pt <command>

# Desde el proyecto
bun run packages/pt-control-v2/bin/run.js <command>

# O compilado
node packages/pt-control-v2/bin/run.js <command>
```

### Comandos Disponibles

```
pt --help                          # Ver ayuda general
pt <topic> --help                  # Ayuda de un topic

# Device management
pt device list                     # Listar dispositivos (--format json|table)
pt device add <name> <model>       # Agregar dispositivo
pt device remove <name>            # Eliminar dispositivo
pt device rename <old> <new>       # Renombrar dispositivo

# Link management  
pt link list                       # Listar conexiones
pt link add <port1> <port2>        # Crear enlace (device:port format)
pt link remove <port>              # Eliminar enlace

# Configuration
pt config ios <device> -c "cmd1"   # Ejecutar comandos IOS
pt config host <device> --ip ...   # Configurar IP en PC/Server

# Operations
pt show <device> "<command>"       # Ejecutar show command
pt inspect <device>                # Ver detalles del dispositivo

# Runtime management
pt runtime build [--deploy]        # Compilar runtime
pt runtime deploy                  # Desplegar en PT
pt runtime status                  # Estado del sistema
pt runtime events                  # Ver eventos

# Snapshots
pt snapshot save <name>            # Guardar topología
pt snapshot load <name>            # Cargar topología

# Recording & Replay
pt record start [--output file]    # Iniciar grabación
pt record stop                     # Detener grabación
pt replay --file <file>            # Reproducir operaciones

# Logs
pt logs [--follow]                 # Ver logs en tiempo real
```

### Flags Globales

```bash
--format json|yaml|table|text   # Formato de salida
--jq ".[].name"                 # Filtrar JSON (jq-like)
--quiet                         # Modo silencioso
--verbose                       # Modo detallado
--dev-dir <path>                # Directorio de desarrollo PT
```

### Ejemplos de Uso

```bash
# Listar dispositivos en tabla
pt device list --format table

# Agregar router con posición
pt device add R1 2911 --x 100 --y 100

# Crear enlace entre dispositivos
pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1 --type straight

# Configurar IOS
pt config ios R1 -c "conf t" -c "hostname Router1" -c "end"

# Ver tabla de rutas en JSON
pt show R1 "show ip route" --format json

# Filtrar nombres de dispositivos
pt device list --format json --jq ".[].name"

# Guardar topología actual
pt snapshot save lab-vlans-base
```

---

## Virtual Topology (VDOM)

El sistema incluye **VirtualTopology**, un componente de gestión de estado que mantiene una copia en memoria de la topología de Packet Tracer, similar a un "Virtual DOM".

### Conceptos Clave

| Concepto | Descripción |
|----------|-------------|
| **VirtualTopology** | Clase que mantiene estado espejo de PT en memoria |
| **TopologySnapshot** | Estado completo: dispositivos + enlaces |
| **TopologyDelta** | Cambios incrementales entre estados |
| **TopologyCache** | Capa de caché que usa VirtualTopology |

### Tipos de Datos

```typescript
// Snapshot completo
interface TopologySnapshot {
  version: string;
  timestamp: number;
  devices: Record<string, DeviceState>;
  links: Record<string, LinkState>;
}

// Estado de dispositivo
interface DeviceState {
  name: string;
  type: 'router' | 'switch' | 'pc' | 'server' | ...;
  model: string;
  x: number;
  y: number;
  power: boolean;
  ports: string[];
}

// Estado de enlace
interface LinkState {
  id: string;
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  cableType: 'straight' | 'cross' | 'fiber' | ...;
}

// Delta de cambios
interface TopologyDelta {
  devices: DeviceDelta[];
  links: LinkDelta[];
}
```

### Flujo de Eventos

```
PT Event ──► FileBridge ──► TopologyCache ──► VirtualTopology
                                                         │
                    Delta calculado ◄─────────────────────┘
                              │
                              ▼
                    Handlers notificados
```

### Ventajas

- **Acceso rápido**: Consultas sin hitting PT
- **Deltas**: Calcula cambios incrementales
- **Reactive**: Suscripciones a cambios de topología
- **Undo/Redo**: Base para implementar deshacer

### Uso Programático

```typescript
import { PTController } from '@cisco-auto/pt-control-v2';

const controller = new PTController({ devDir: '~/pt-dev' });
await controller.start();

// Obtener snapshot (usando VirtualTopology internamente)
const snapshot = await controller.snapshot();

// Acceder a caché de topología
const devices = controller.topologyCache.getDevices();
const links = controller.topologyCache.getLinks();

// Suscribirse a cambios
controller.on('device-added', (event) => {
  console.log('Nuevo dispositivo:', event.name);
});
```

---

## Bridge Automation - AUTOMATIZADO

La skill puede interactuar directamente con Cisco Packet Tracer a través del Bridge Server.

### Flujo Automatizado (Recomendado)

El agente ejecuta automáticamente:

```bash
bun run .iflow/skills/cisco-networking-assistant/scripts/bridge-automation.ts ensure-all
```

Este comando hace TODO automáticamente:
1. Detecta si el bridge server está corriendo → lo inicia si no
2. Detecta si Packet Tracer está instalado → informa si falta
3. Detecta si Packet Tracer está ejecutándose → lo abre si no
4. Instala el bridge en Packet Tracer → configura la conexión
5. Verifica que todo esté listo para trabajar

### Comandos de Bridge Automation

| Comando | Cuándo usarlo | Qué hace |
|---------|---------------|----------|
| `ensure-all` | Flujo completo | Prepara todo el sistema |
| `status` | Verificar estado | Muestra estado completo |
| `ensure-running` | Solo iniciar bridge | Inicia el bridge si no está |
| `install` | Solo instalar en PT | Instala el bridge en PT abierto |
| `start` | Solo iniciar server | Inicia el bridge server |
| `stop` | Detener todo | Detiene el bridge server |
| `health` | Health check | Verifica que el bridge responda |

### Ejemplo de Salida

```
🎯 Verificando sistema completo...
   Bridge: ✅
   Packet Tracer: ✅
   Conexión: ✅
🎉 Sistema completamente configurado y listo para trabajar
```

---

## Flujo de Trabajo General

### Paso 1: Entender el Contexto

Identificar:
1. **Tipo de ayuda**: ¿Guía paso a paso o automático?
2. **Nivel de experiencia**: Principiante, intermedio o avanzado
3. **Archivos involucrados**: PKA, YAML, o crear desde cero

### Paso 2: Usar CLI para Análisis

```bash
# Ver estado del sistema
pt runtime status

# Listar dispositivos actuales
pt device list --format table

# Ver eventos recientes
pt runtime events --tail 20

# Analizar archivo PKA (via apps/cli)
cisco-auto parse-pka <archivo.pka> --yaml --output analysis.yaml
```

### Paso 3: Ejecutar Operaciones

```bash
# Crear topología desde cero
pt device add R1 2911 --x 100 --y 100
pt device add S1 2960 --x 300 --y 100
pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1

# Configurar dispositivos
pt config ios R1 -c "conf t" -c "interface Gi0/0" -c "ip address 192.168.1.1 255.255.255.0" -c "no shut"

# Verificar
pt show R1 "show ip interface brief"

# Guardar snapshot
pt snapshot save my-lab-base
```

---

## Modo Guía (Guide Mode)

Proporciona instrucciones detalladas paso a paso:

```
📋 PASO X: [Título del paso]
   Tiempo estimado: X minutos

   1. [Acción física en Packet Tracer]
   2. [Navegación CLI]

💻 COMANDOS (copia y pega):
   ```
   [comando 1]
   [comando 2]
   ```

❓ EXPLICACIÓN:
   - [Qué hace cada comando]
   - [Por qué es necesario]

✅ VERIFICACIÓN:
   pt show <device> "<command>"
   Deberías ver: [resultado esperado]

💡 TIP: [Consejo útil]
```

### Adaptación por Nivel

- **Principiante**: Explicar cada modo CLI, describir comandos, incluir salidas completas
- **Intermedio**: Comandos con comentarios, tips de optimización
- **Avanzado**: Configuraciones condensadas, mejores prácticas

---

## Modo Automático (Auto Mode)

Modifica archivos y configuraciones automáticamente:

1. **Analizar requisitos**: Entender qué se necesita
2. **Ejecutar comandos**: Usar `pt` CLI para operaciones
3. **Verificar cambios**: Validar con `pt show` o `pt inspect`
4. **Guardar snapshot**: `pt snapshot save`

### Ejemplo Completo

```bash
# Usuario: "Configura VLAN 10 y 20 en el switch S1"

# Análisis automático
pt device list --format json --jq '.[] | select(.name=="S1")'

# Configuración automática
pt config ios S1 \
  -c "conf t" \
  -c "vlan 10" \
  -c "name Ventas" \
  -c "vlan 20" \
  -c "name IT" \
  -c "interface range Fa0/1-12" \
  -c "switchport mode access" \
  -c "switchport access vlan 10" \
  -c "interface range Fa0/13-24" \
  -c "switchport mode access" \
  -c "switchport access vlan 20" \
  -c "end"

# Verificación
pt show S1 "show vlan brief"

# Guardar progreso
pt snapshot save vlan-config-done
```

---

## Troubleshooting

### Diagnóstico con CLI

```bash
# Estado del sistema
pt runtime status

# Ver eventos recientes
pt runtime events --tail 50 --type error

# Logs en tiempo real
pt logs --follow

# Inspeccionar dispositivo específico
pt inspect R1 --include-xml
```

### Comandos de Diagnóstico IOS

```bash
pt show <device> "show ip interface brief"
pt show <device> "show vlan brief"
pt show <device> "show ip route"
pt show <device> "show cdp neighbors"
pt show <device> "show running-config"
```

### Problemas Comunes

| Problema | Diagnóstico | Solución |
|----------|-------------|----------|
| Bridge no responde | `pt runtime status` | `bun run bridge-automation.ts ensure-running` |
| PT no conecta | `bridge-automation.ts status` | `bun run bridge-automation.ts install` |
| Comando falla | `pt logs --follow` | Ver eventos para detalles |
| Snapshot vacío | `pt device list` | Verificar que PT tenga topología |

---

## Logging Estructurado y Contexto Histórico

La skill debe **documentar** el logging, no duplicar `LogManager` ni crear una segunda infraestructura.

### Qué registrar

Registra cada acción proactiva en tres momentos:

| Momento | Convención sugerida | Contenido mínimo |
|---------|---------------------|------------------|
| Diagnóstico | `diagnostic:<tema>` | Problema, dispositivo, evidencia, sesión |
| Sugerencia | `suggestion:<tema>` | Recomendación breve, sin secretos ni payloads completos |
| Ejecución | `execution:<comando>` | Acción aplicada, resultado, duración, error si falló |

### Reglas de logging

- Usa `BaseCommand.runLoggedCommand()` para capturar ejecución, duración y outcome. Si actúas programáticamente, utiliza el helper `runPtCommand()` o `createDefaultPTController()`; no clones la lógica ni generes nuevas APIs.
- No añadas logging manual por comando si ya pasa por el flujo central.
- Usa `outcome: "error"` para fallos y `outcome: "cancelled"` para cancelaciones.
- Configura `PT_DEV_DIR` antes de ejecutar la CLI desde scripts o skills para apuntar al dev dir correcto.
- Sanitiza el contexto antes de guardarlo.
- No expongas secretos, tokens, contraseñas ni configs completas.

### Cómo leer contexto previo

Para obtener contexto histórico antes de sugerir o ejecutar algo nuevo:

1. Revisa el flujo actual con `pt logs --follow`.
2. Consulta eventos recientes con `pt runtime events`.
3. Si necesitas historial de una sesión anterior, busca la entrada NDJSON por `session_id` y `correlation_id` en el directorio de logs.
4. Para análisis programático, usa `LogManager.query()` o `LogManager.getSession()`; no inventes otro lector.

### Uso recomendado

- Primero registra el diagnóstico.
- Luego registra la sugerencia que vas a dar al usuario.
- Finalmente registra la ejecución cuando haya una acción real.
- Si ya existe evidencia en logs previos, reutilízala antes de repetir diagnóstico.

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Profesional `pt`                    │
│                    (packages/pt-control-v2)                 │
├─────────────────────────────────────────────────────────────┤
│  Commands (oclif) + proactividad                            │
│  ├── device (list, add, remove, rename)                     │
│  ├── link (list, add, remove)                               │
│  ├── config (ios, host)                                     │
│  ├── show, inspect                                          │
│  ├── runtime (build, deploy, status, events)                │
│  ├── snapshot (save, load)                                  │
│  └── record, replay, logs                                   │
├─────────────────────────────────────────────────────────────┤
│  PTController + runPtCommand (invocación programática)      │
│  ├── FileBridge (IPC con PT)                                │
│  └── TopologyCache                                          │
│       └── VirtualTopology (VDOM)                            │
├─────────────────────────────────────────────────────────────┤
│  Packet Tracer Bridge                                       │
│  ├── main.js (extension entry point)                        │
│  ├── runtime.js (runtime code)                              │
│  ├── state.json / command.json (IPC files)                  │
│  └── response/ (response directory)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Referencias y Recursos

### Documentación Interna
- `docs/bridge-api-contract.md` - Contrato del Bridge API
- `packages/pt-control-v2/src/vdom/` - Implementación VirtualTopology
- `packages/pt-control-v2/src/types/` - Tipos TypeScript

### Recursos Externos
- Cisco Networking Academy: netacad.com
- Documentación Cisco: cisco.com/c/en/us/support
- Comunidad: learningnetwork.cisco.com

---

## Mejores Prácticas

### Uso de CLI

1. **Siempre verificar estado antes de operar**:
   ```bash
   pt runtime status
   ```

2. **Usar formato apropiado para el contexto**:
   ```bash
   pt device list --format table    # Lectura humana
   pt device list --format json     # Scripting/procesamiento
   pt device list --jq ".[].name"   # Extracción específica
   ```

3. **Guardar snapshots con frecuencia**:
   ```bash
   pt snapshot save before-changes
   # ... hacer cambios ...
   pt snapshot save after-changes
   ```

4. **Usar verbose para debugging**:
   ```bash
   pt device add R1 2911 --verbose
   ```

### Configuración

1. **Verificar antes de aplicar**:
   ```bash
   pt show <device> "show running-config"
   ```

2. **Documentar cambios**:
   ```bash
   pt config ios <device> -c "description Link to Core"
   ```

3. **Validar conectividad**:
   ```bash
   pt show <device> "show ip interface brief"
   ```

---

## Limitaciones Conocidas

- Archivos PKA versión 8.x pueden no ser completamente parseables
- Algunas funcionalidades avanzadas requieren IOS específico
- El modo automático modifica archivos, mantener backups
- VirtualTopology requiere bridge activo para sincronización

---

## Changelog

### v2.0.0 (Actual)
- Migración a oclif v4 (CLI profesional estilo gh)
- Flags globales: `--format`, `--jq`, `--quiet`, `--verbose`
- Comandos interactivos con @inquirer/prompts
- Sistema de errores estructurado con sugerencias
- Shell completion automático (bash, zsh, fish)
- Integración completa con VirtualTopology
- Formateadores: JSON, YAML, table, text
