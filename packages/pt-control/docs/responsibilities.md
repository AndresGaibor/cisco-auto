# pt-control — Análisis de Responsabilidades

**Fecha**: 2026-04-01  
**Propósito**: Identificar responsabilidades actuales y detectar duplicación con otros packages

---

## 📦 Responsabilidades Actuales de pt-control

### 1. **Control en Tiempo Real de Packet Tracer** ✅ (PRINCIPAL)
**Ubicación**: `src/controller/`, `src/application/services/`, `src/infrastructure/`

**Clases principales**:
- `PTController` — API de alto nivel para controlar PT
- `TopologyService` — Gestión de dispositivos y topología
- `DeviceService` — Inspección de dispositivos
- `IosService` — Ejecución de comandos IOS en PT
- `CanvasService` — Gestión de rectángulos/canvas

**Métodos clave**:
```typescript
// Device management
addDevice(name, model, options)
removeDevice(name)
renameDevice(oldName, newName)
moveDevice(name, x, y)
listDevices(filter)
inspect(device)

// Link management
addLink(device1, port1, device2, port2, linkType)
removeLink(device, port)

// Configuration
configHost(device, { ip, mask, gateway, dns, dhcp })
configIos(device, commands, options)

// IOS execution
execIos(device, command)
show(device, command)
showIpInterfaceBrief(device)
showVlan(device)
showIpRoute(device)
showRunningConfig(device)

// Inspection
snapshot()
hardwareInfo(device)
commandLog(device)

// Canvas
listCanvasRects()
getRect(rectId)
devicesInRect(rectId)
```

**Estado**: ✅ **CORRECTO** — Esta es la responsabilidad principal, NO está en otros packages

---

### 2. **FileBridge Adapter** ✅ (INFRAESTRUCTURA)
**Ubicación**: `src/infrastructure/pt/file-bridge-v2-adapter.ts`

**Propósito**: Adaptar FileBridgeV2 al puerto `FileBridgePort`

**Estado**: ✅ **CORRECTO** — Es infraestructura específica de PT Control

---

### 3. **Topology Cache** ✅ (OPTIMIZACIÓN)
**Ubicación**: `src/infrastructure/pt/topology-cache.ts`

**Propósito**: Cachear snapshots para evitar consultas constantes a PT

**Estado**: ✅ **CORRECTO** — Optimización interna de PT Control

---

### 4. **Virtual Topology (VDOM)** ✅ (ESTADO VIRTUAL)
**Ubicación**: `src/vdom/`

**Clases principales**:
- `VirtualTopology` — Estado virtual reactivo de la topología
- `TopologyChangeDetector` — Detecta cambios entre snapshots
- `TopologyCacheManager` — Gestiona caché de topología
- `TopologyEventsHandler` — Maneja eventos de topología

**Estado**: ✅ **CORRECTO** — Proporciona estado virtual para UI/agentes

---

### 5. **Network Twin** ✅ (MODELO VIRTUAL)
**Ubicación**: `src/vdom/twin-adapter.ts`

**Propósito**: Convertir TopologySnapshot a NetworkTwin para agentes IA

**Estado**: ✅ **CORRECTO** — Modelo virtual para IA/validación

---

### 6. **IOS Session Management** ✅ (ESTADO DE SESIÓN)
**Ubicación**: `src/domain/ios/session/`

**Clases principales**:
- `CliSession` — Sesión CLI con estado (modo, historial)
- `CliSessionStateManager` — Gestiona transiciones de modo
- `InteractiveStateHandler` — Maneja diálogos interactivos
- `PromptState` — Detecta modo desde prompt

**Estado**: ✅ **CORRECTO** — Estado de sesión ES DIFERENTE a generación de comandos

**Diferencia con `core`**:
- `pt-control`: Mantiene estado de sesión (modo actual, historial, paging)
- `core`: Genera comandos IOS (strings) sin estado

---

### 7. **IOS Command Execution** ✅ (EJECUCIÓN EN PT)
**Ubicación**: `src/domain/ios/operations/`

**Funciones principales**:
```typescript
planConfigureAccessPort()
planConfigureTrunkPort()
planConfigureSvi()
planConfigureSubinterface()
planConfigureStaticRoute()
planConfigureDhcpRelay()
planConfigureVlan()
planConfigureDhcpPool()
```

**Estado**: ⚠️ **DUPLICACIÓN PARCIAL** con `core`

**Diferencia clave**:
- `pt-control`: Genera **CommandPlan** con modos (user→enable→config→interface)
- `core`: Genera **lista de comandos** strings para SSH

**Ejemplo**:
```typescript
// pt-control (CommandPlan con modos)
{
  mode: 'config',
  commands: [
    { cmd: 'interface Gig0/0', expectedMode: 'config', newMode: 'config-interface' },
    { cmd: 'ip address 1.1.1.1 255.255.255.0', expectedMode: 'config-interface' }
  ]
}

// core (lista de strings para SSH)
[
  'interface GigabitEthernet0/0',
  'ip address 1.1.1.1 255.255.255.0',
  'no shutdown'
]
```

**Recomendación**: ✅ **MANTENER** — Son propósitos diferentes:
- `pt-control`: Planifica ejecución con gestión de modos para PT
- `core`: Genera comandos para dispositivos reales vía SSH

---

### 8. **IOS Parsers** ✅ (PARSEO DE SHOW COMMANDS)
**Ubicación**: `src/domain/ios/parsers/`

**Parsers implementados**:
- `parseShowIpInterfaceBrief()`
- `parseShowVlan()`
- `parseShowIpRoute()`
- `parseShowRunningConfig()`
- `parseShowInterfaces()`
- `parseShowIpArp()`
- `parseShowMacAddressTable()`
- `parseShowSpanningTree()`
- `parseShowVersion()`
- `parseShowCdpNeighbors()`

**Estado**: ⚠️ **DUPLICACIÓN** con `core`

**Ubicación en core**: `packages/core/src/parser/ios/` (probablemente)

**Recomendación**: 🔴 **MOVER A `@cisco-auto/types`** o `core`
- Los parsers son funciones puras (input: string, output: objeto)
- Deberían estar en un package compartido
- `pt-control` puede importar desde `@cisco-auto/core/parsers`

---

### 9. **Device Capabilities** ✅ (CAPABILIDADES DE DISPOSITIVO)
**Ubicación**: `src/domain/ios/capabilities/`

**Clases principales**:
- `resolveCapabilities()` — Resuelve capacidades de un dispositivo
- `resolveCapabilitySet()` — Resuelve set completo de capacidades
- `DeviceCapabilities` — Interfaz de capacidades

**Estado**: ⚠️ **DUPLICACIÓN PARCIAL** con `core`

**Diferencia**:
- `pt-control`: Capabilidades basadas en PT API (lo que PT soporta)
- `core`: Capabilidades basadas en IOS real (lo que el hardware soporta)

**Recomendación**: ✅ **MANTENER** — Son contextos diferentes (PT vs real)

---

### 10. **CLI Commands (OCLIF)** ✅ (INTERFAZ DE USUARIO)
**Ubicación**: `src/cli/commands/`

**Comandos**:
```
device/
  add.ts, remove.ts, list.ts, rename.ts, move.ts
link/
  add.ts, remove.ts
vlan/
  apply.ts
trunk/
  apply.ts
ssh/
  setup.ts
config/
  host.ts, ios.ts
snapshot/
  index.ts
canvas/
  list.ts, get.ts, devices-in-rect.ts
runtime/
  load.ts, reload.ts, hot.ts
record/
  start.ts, stop.ts, status.ts
```

**Estado**: ✅ **CORRECTO** — CLI es responsabilidad de pt-control

---

### 11. **Logging (NDJSON)** ✅ (OBSERVABILIDAD)
**Ubicación**: `src/logging/`

**Componentes**:
- Session tracking
- Command trace
- Event journal
- 7-day rotation

**Estado**: ✅ **CORRECTO** — Logging específico de PT Control

---

### 12. **Contracts/Types** ✅ (TIPOS ESPECÍFICOS)
**Ubicación**: `src/contracts/`

**Tipos principales**:
- `PTControlCommandPayloadTypeMap`
- `PTEvent`
- `TopologySnapshot`
- `DeviceState`
- `LinkState`
- `NetworkTwin`

**Estado**: ⚠️ **DUPLICACIÓN PARCIAL** con `@cisco-auto/types`

**Recomendación**: 🔴 **MOVER A `@cisco-auto/types`**:
- `TopologySnapshot`, `DeviceState`, `LinkState` → ya están en `@cisco-auto/types`
- Mantener solo tipos específicos de PT Control en `src/contracts/`

---

### 13. **Value Objects** ✅ (DOMINIO)
**Ubicación**: `src/domain/ios/value-objects/`

**Value Objects**:
- `VlanId`
- `Ipv4Address`
- `SubnetMask`
- `InterfaceName`

**Estado**: ⚠️ **DUPLICACIÓN** con `core`

**Ubicación en core**: `packages/core/src/value-objects/`

**Recomendación**: 🔴 **MOVER A `@cisco-auto/types`** o `core`:
- Value Objects son dominio puro, deberían ser compartidos
- `pt-control` puede importar desde `@cisco-auto/core/value-objects`

---

### 14. **Error Classes** ✅ (MANEJO DE ERRORES)
**Ubicación**: `src/cli/errors/`, `src/domain/ios/errors.ts`

**Errores**:
- `CLIError`, `DeviceNotFoundError`, `LinkNotFoundError`
- `ConnectionError`, `TimeoutError`, `ValidationError`
- `IOSCommandError`, `IOSModeError`

**Estado**: ✅ **CORRECTO** — Errores específicos de PT Control

---

### 15. **Utils** ⚠️ (UTILIDADES)
**Ubicación**: `src/utils/`

**Utilidades encontradas**:
- `ios-commands.ts` — Genera comandos VLAN
- `topology-utils.ts` — Utilidades de topología
- `logger.ts` — Logger configurado

**Estado**: ⚠️ **DUPLICACIÓN PARCIAL** con `core`

**Ejemplo de duplicación**:
```typescript
// pt-control: src/utils/ios-commands.ts
export function buildVlanCommands(vlanIds: number[], prefix?: string): string[] {
  // Genera comandos VLAN
}

// core: src/config-generators/vlan-generator.ts
export class VlanGenerator {
  public static generateVLANs(vlans: VLANSpec[]): string[] {
    // Genera comandos VLAN
  }
}
```

**Recomendación**: 🔴 **ELIMINAR DE `pt-control`**:
- Mover `buildVlanCommands` a `core` o eliminar (usar `VlanGenerator`)
- Mantener solo utils específicas de PT (ej: `ptDeviceTypeToString`)

---

## 📊 Resumen de Duplicaciones

| Responsabilidad | Estado | Ubicación en core | Acción Recomendada |
|----------------|--------|-------------------|-------------------|
| **IOS Parsers** | 🔴 DUPLICACIÓN | `core/src/parser/ios/` | Mover a `@cisco-auto/types` o `core` |
| **Value Objects** | 🔴 DUPLICACIÓN | `core/src/value-objects/` | Mover a `@cisco-auto/types` o `core` |
| **Utils (ios-commands)** | 🔴 DUPLICACIÓN | `core/src/config-generators/` | Eliminar de pt-control, usar core |
| **Contracts/Types** | 🟡 PARCIAL | `@cisco-auto/types` | Mover tipos compartidos a `types` |
| **Device Capabilities** | 🟡 PARCIAL | `core/src/catalog/` | Mantener (PT vs real) |
| **IOS Operations** | 🟡 PARCIAL | `core/src/config-generators/` | Mantener (CommandPlan vs strings) |

---

## ✅ Responsabilidades ÚNICAS de pt-control (NO mover)

1. **PTController** — API de alto nivel para PT
2. **TopologyService, DeviceService, IosService** — Servicios de aplicación
3. **FileBridge Adapter** — Adaptador específico
4. **Topology Cache** — Caché de topología
5. **Virtual Topology (VDOM)** — Estado virtual reactivo
6. **Network Twin** — Modelo virtual para IA
7. **IOS Session Management** — Estado de sesión CLI
8. **CLI Commands (OCLIF)** — Interfaz de usuario
9. **Logging (NDJSON)** — Observabilidad específica
10. **Error Classes** — Errores específicos

---

## 🔴 Acciones de Refactorización Recomendadas

### 1. Mover Parsers a `@cisco-auto/types` o `core`
```bash
# Mover
packages/pt-control/src/domain/ios/parsers/
  → packages/core/src/parser/ios/  # o packages/types/src/parsers/

# Actualizar imports en pt-control
import { parseShowIpInterfaceBrief } from '@cisco-auto/core/parser/ios';
```

### 2. Mover Value Objects a `core`
```bash
# Mover
packages/pt-control/src/domain/ios/value-objects/
  → packages/core/src/value-objects/

# Actualizar imports
import { VlanId, Ipv4Address } from '@cisco-auto/core/value-objects';
```

### 3. Eliminar utils duplicadas
```bash
# Eliminar
packages/pt-control/src/utils/ios-commands.ts

# Usar en su lugar
import { VlanGenerator } from '@cisco-auto/core/config-generators';
```

### 4. Limpiar contracts/types
```bash
# Mover a @cisco-auto/types
- TopologySnapshot
- DeviceState
- LinkState
- PTEvent (si es genérico)

# Mantener en pt-control/contracts
- PTControlCommandPayloadTypeMap
- Tipos específicos de comandos PT
```

---

## 📦 Dependencias Actuales de pt-control

```json
{
  "dependencies": {
    "@cisco-auto/file-bridge": "workspace:*",      # ✅ CORRECTO
    "@cisco-auto/types": "workspace:*",            # ✅ CORRECTO
    "@inquirer/prompts": "^8.3.2",                 # ✅ CORRECTO (CLI)
    "@oclif/core": "^3.26.4",                      # ✅ CORRECTO (CLI)
    "cli-table3": "^0.6.5",                        # ✅ CORRECTO (CLI)
    "ora": "^9.3.0",                               # ✅ CORRECTO (CLI)
    "picocolors": "^1.1.1",                        # ✅ CORRECTO (CLI)
    "zod": "^4.3.6"                                # ✅ CORRECTO
  }
}
```

**Dependencias que DEBERÍA agregar después de refactorizar**:
```json
{
  "dependencies": {
    "@cisco-auto/core": "workspace:*"  # Para parsers, value objects, generators
  }
}
```

---

## 🎯 Conclusión

**pt-control** tiene **15 responsabilidades principales**, de las cuales:

- ✅ **10 son ÚNICAS y correctas** (control PT, VDOM, session management, CLI, logging)
- 🟡 **3 tienen duplicación parcial justificada** (capabilities, operations, contracts)
- 🔴 **4 están DUPLICADAS innecesariamente** (parsers, value objects, utils, algunos types)

**Trabajo de refactorización**:
1. Mover parsers → 2 horas
2. Mover value objects → 1 hora
3. Eliminar utils duplicadas → 1 hora
4. Limpiar contracts → 2 horas
5. Actualizar tests → 4 horas

**Total estimado**: 10 horas

---

## 📝 Notas Adicionales

### Diferencia Fundamental entre `pt-control` y `core`

| Aspecto | pt-control | core |
|---------|------------|------|
| **Propósito** | Control en tiempo real de PT | Generación de configs para dispositivos reales |
| **Ejecución** | FileBridge → PT Script Engine | SSH/Telnet → Dispositivos físicos |
| **Estado** | Mantiene estado de sesión | Stateless (genera strings) |
| **Latencia** | ~100-200ms por comando | ~1-5s por dispositivo |
| **IOS** | Limitado a PT API | IOS real completo |
| **Validación** | En tiempo real (PT responde) | Post-deployment (verificación) |

**Conclusión**: Son **complementarios**, NO intercambiables.

---

**Fin del análisis**
