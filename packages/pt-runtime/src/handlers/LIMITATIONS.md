# PT Runtime Handlers — Limitaciones

> Documenta gaps conocidos entre la implementación y la PT API real.

## 1. Handlers que No Ejecutan en el Runtime

Estos handlers existen en el dispatcher (`runtime-handlers.ts`) pero **no ejecutan lógica real** dentro del runtime.js. En cambio, devuelven `{ ok: true, requiresIpc: true, handler: "..." }` y delegan la ejecución a `main.js` (kernel) o a un proceso externo.

### `handleHardwareInfo`
```typescript
// Retorna: { ok: true, requiresIpc: true, handler: "hardwareInfo" }
// Estado: STUB — main.js no lo implementa actualmente
```
**Razón:** La PT API no expone un método `getHardwareInfo()` o similar en ningún objeto del API público.

### `handleHardwareCatalog`
```typescript
// Retorna: { ok: true, requiresIpc: true, handler: "hardwareCatalog", limit: number }
// Estado: STUB — main.js no lo implementa actualmente
```
**Razón:** No existe `Factory.getHardwareCatalog()` ni equivalente en la PT API pública.

### `handleCommandLog`
```typescript
// Retorna: { ok: true, requiresIpc: true, handler: "commandLog", limit: number }
// Estado: STUB — main.js no lo implementa actualmente
```
**Razón:** La PT API no expone historial de comandos ejecutados por terminal.

---

## 2. IOS Parsers — Solo 4 Implementados

Los parsers disponibles en `handlers/parsers/ios-parsers.ts`:

| Comando | Parser | Estado |
|---------|--------|--------|
| `show ip interface brief` | ✅ | Implementado |
| `show vlan brief` | ✅ | Implementado |
| `show ip route` | ✅ | Implementado |
| `show running-config` | ✅ | Implementado (raw + line count) |

**Parsers NO disponibles** (requieren implementación si son necesarios):

| Comando | Notas |
|---------|-------|
| `show interfaces` | Regex para status, protocol, vlan, duplex, speed |
| `show cdp neighbors` | Device ID, local interface, capability, holdtime |
| `show vlan` | VLANs con puertos asignados |
| `show mac address-table` | MAC learning table |
| `show ip nat translations` | NAT entries |
| `show version` | IOS version, uptime, hardware |
| `show ip ospf` | OSPF process info |
| `show ip ospf neighbor` | OSPF adjacency |
| `show spanning-tree` | STP state |
| `show access-lists` | ACL entries |

---

## 3. Limitaciones de la PT API

### 3.1 ES5 Only
- Sin arrow functions, template literals, destructuring
- Sin imports/exports (todo bundler)
- Sin `class` (usar function prototypes)
- Bundle debe stay under 200KB

### 3.2 No Console
```javascript
// WRONG
console.log("debug");

// CORRECT
dprint("[debug] message");
```

### 3.3 No WebSocket/Network
- Solo IPC a través de file-bridge
- No `fetch`, `XMLHttpRequest`, `WebSocket`

### 3.4 No PT File I/O Directo
- Usar `file-bridge` para leer/escribir archivos del host
- `SystemFileManager` solo opera dentro del contexto del Script Module

### 3.5 No process/BigInt/Buffer
- `process` no existe en QtScript
- `Buffer` no disponible
- `BigInt` no disponible

### 3.6 Limitaciones de Puerto
- `setX/setY` no disponible en todas las versiones de PT API
- Nombres de puerto deben ser exactos: `GigabitEthernet0/0` vs `FastEthernet0/0`
- No todos los modelos suportan `getPortAt()` para todos los puertos

### 3.7 HostPort Incompleto
- `isDhcpClientOn()` puede no funcionar en todos los dispositivos
- IPv6 API parcialmente disponible
- MTU configurable pero no en todos los modelos

### 3.8 TerminalLine Comportamiento
- `enterCommand()` retorna `void`, no output
- Output llega via eventos (`outputWritten`, `commandEnded`)
- No hay garantia de orden de respuesta en comandos rapidos
- `--More--` pagination requiere manejo explícito

---

## 4. Clases Deprecated

### `DeviceHandler` y `LinkHandler`
```typescript
/** @deprecated Use functional handlers directly */
export class DeviceHandler { ... }
export class LinkHandler { ... }
```
Estas clases wrappers existen por compatibilidad hacia atrás. Su uso interno ha sido reemplazado por los handlers funcionales puros (`handleAddDevice`, `handleAddLink`, etc.).

---

## 5. IOS Session Engine

### `IosSessionEngine` (deprecated)
```typescript
/**
 * @deprecated NOT included in runtime.js build
 * Duplicates responsibilities covered by:
 *   - pt/terminal/terminal-engine.ts
 *   - pt/kernel/job-executor.ts
 */
export class IosSessionEngine { ... }
```
Este archivo **no está incluido** en `runtime-manifest.ts`. Se mantiene para tests y referencia.

---

## 6. Servicios Server-PT No Automatizados

La PT API expone estas clases pero no están integradas como handlers:

| Servicio | Clase PT | Handler | Estado |
|----------|----------|---------|--------|
| DNS | `DnsServerProcess` | — | No implementado |
| TFTP | `TftpServer` | — | No implementado |
| RADIUS | `RadiusServerProcess` | — | No implementado |
| TACACS | `TacacsServerProcess` | — | No implementado |
| Syslog | `SyslogServer` | — | No implementado |
| NTP | `NtpServerProcess` | — | No implementado |
| SSH | `SshServerProcess` | — | No implementado |

---

## 7. Routers/Switch Processes No Automatizados

| Proceso | Clase PT | Handler | Estado |
|---------|----------|---------|--------|
| Static Routing | `RoutingProcess` | — | No implementado |
| OSPF | `OspfProcess` | — | No implementado |
| ACL IPv4 | `AclProcess` | — | No implementado |
| ACL IPv6 | `Aclv6Process` | — | No implementado |
| STP | `StpMainProcess` | — | No implementado |
| RIP | `RipProcess` | — | No implementado |
| EIGRP | `EigrpProcess` | — | No implementado |

---

## 8. Canvas/Cluster APIs

`LogicalWorkspace` expone APIs que no están expuestas como handlers:

- `addCluster(x, y, label)` — crear clusters en canvas
- `addNote(x, y, scale, text)` — agregar notas
- `addTextPopup(x, y, scale, type, text)` — agregar text popups
- `autoConnectDevices(deviceA, deviceB)` — auto-conectar
- `centerOn(x, y)` — centrar vista

---

## 9. Events API

La PT API permite registrar eventos pero no hay handler para `watch-events`:

```javascript
// Lo que existe:
port.registerEvent("ipChanged", null, handler);
port.registerEvent("powerChanged", null, handler);
lw.registerEvent("linkCreated", null, handler);

// Lo que NO existe como handler:
handleWatchEvents // no implementado
```
