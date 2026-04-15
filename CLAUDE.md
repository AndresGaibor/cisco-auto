Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## Arquitectura TypeScript

**Código fuente es TypeScript puro (.ts)** - Bun ejecuta TypeScript directamente sin compilación.

### Archivos NO trackeados en git
El repositorio excluye del tracking estos archivos compilados:
```
*.js          (compilado de TypeScript)
*.d.ts        (declaraciones TypeScript)
*.js.map      (source maps)
*.d.ts.map    (declaration maps)
```

Estos se generan en tiempo de desarrollo pero no deben commitearse. El código fuente es `.ts`.

### Paquetes npm workspace
```json
"dependencies": {
  "@cisco-auto/types": "workspace:*",
  "@cisco-auto/core": "workspace:*",
  "@cisco-auto/pt-control": "workspace:*",
  "@cisco-auto/pt-runtime": "workspace:*"
}
```

Los paquetes usan exports directos a `.ts`:
```json
"exports": {
  ".": "./src/index.ts",
  "./schemas": "./src/schemas/index.ts"
}
```

### Importante: No ejecutar `tsc` para compilar
- El proyecto usa TypeScript source directo
- Bun ejecuta `.ts` sin compilación
- Si necesitas verificar tipos: `bun run typecheck` (solo lectura, no emite archivos)
- NO usar `tsc` sin `-p` (emitiría archivos en el source)

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## PT Control (Cisco Packet Tracer)

**PT Control** es la CLI profesional para controlar Cisco Packet Tracer en tiempo real. Ubicación: `/packages/pt-control/`

### Setup Inicial
```bash
# 1. Build y deploy de archivos a ~/pt-dev/ (automático)
bun run pt:build

# 2. Dentro de PT: cargar el script desde File > Open > selecciona ~/pt-dev/main.js
```

### Comandos principales
```bash
# Ver ayuda completa
bun run pt --help

# Gestión de dispositivos
bun run pt device list              # Listar dispositivos en PT
bun run pt device add R1 2911      # Agregar dispositivo
bun run pt device remove R1         # Remover dispositivo
bun run pt device move R1 --xpos 300 --ypos 200  # Mover dispositivo

# Comandos show
bun run pt show ip-int-brief R1   # Mostrar interfaces IPs
bun run pt show vlan Switch1       # Mostrar VLANs
bun run pt show ip-route R1        # Mostrar rutas
bun run pt show run-config R1      # Mostrar configuración

# Configuración
bun run pt config-host R1 --ip 192.168.1.1 --mask 255.255.255.0 --gateway 192.168.1.254
bun run pt config-ios R1 interface GigabitEthernet0/0 ip address 192.168.1.1 255.255.255.0

# VLANs
bun run pt vlan apply Switch1 10 20 30
```

### Lab management
```bash
# Listar labs en directorio
bun run pt lab list
# Crear nuevo lab
bun run pt lab create <nombre>
# Levantar lab desde YAML
bun run pt lab lift
# Validar lab
bun run pt lab validate <archivo>
# Modo interactivo
bun run pt lab interactive
# Pipeline de labs
bun run pt lab pipeline
# Parsear lab
bun run pt lab parse <archivo>
```

### Configuración de protocolos
```bash
# OSPF (comando directo)
bun run pt ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0"
# EIGRP (comando directo)
bun run pt eigrp --device R1 --as 100 --network "192.168.1.0,0.0.0.255"
# BGP (comando directo)
bun run pt bgp --device R1 --as 65000 --neighbor "10.0.0.2,65001"
# ACL (comando directo)
bun run pt config-acl --device R1 --name FILTER --type extended --rule "permit,ip,any,any"
# VLAN
bun run pt config-vlan --device S1 --vlan "10,ADMIN" --vlan "20,USERS"
# Interface
bun run pt config-interface --device R1 --name Gig0/0 --ip 192.168.1.1 --mask 255.255.255.0
# Aplicar desde archivo YAML/JSON
bun run pt config-apply configs/lab.yaml --dry-run
```

### Historial y auditoría
```bash
# Historial de comandos
bun run pt history list              # Listar historial
bun run pt history show <id>        # Ver comando específico
bun run pt history last             # Último comando
bun run pt history search "ospf"    # Buscar en historial
bun run pt history failed           # Comandos fallidos

# Audit log
bun run pt audit tail               # Ver últimas operaciones
bun run pt audit tail --lines 50    # Con cantidad de líneas
bun run pt audit export             # Exportar a archivo
bun run pt audit export --format json --output audit.json
bun run pt audit-failed            # Operaciones fallidas
bun run pt audit-failed --since "2026-04-01"
```

### Topología
```bash
# Analizar topología
bun run pt topology analyze
# Limpiar topología
bun run pt topology clean
# Exportar topología
bun run pt topology export
# Visualizar topología
bun run pt topology visualize
# Mostrar topología descubierta
bun run pt topology show
```

### Gestión de enlaces
```bash
bun run pt link add R1 Gi0/0 S1 Fa0/1   # Agregar enlace
bun run pt link list                      # Listar enlaces
bun run pt link remove R1 Gi0/0           # Remover enlace
```

### Servicios de red
```bash
# DHCP server
bun run pt services dhcp <device>
# NTP server
bun run pt services ntp <device>
# Syslog
bun run pt services syslog <device>
```

### STP y EtherChannel
```bash
# Spanning Tree Protocol
bun run pt stp set Switch1 mode rapid-pvst
bun run pt stp set Switch1 priority 4096
# EtherChannel
bun run pt etherchannel create Switch1 1 Gi0/1 Gi0/2
bun run pt etherchannel list
```

### Routing (comandos legacy)
```bash
# Routing
bun run pt routing ospf enable R1
bun run pt routing static add 0.0.0.0 0.0.0.0 192.168.1.1
```

### ACL (comandos legacy)
```bash
# ACL
bun run pt acl create 100 permit tcp any any eq 80
bun run pt acl apply ACL-100 R1
```

### Router
```bash
bun run pt router add R1 2911           # Agregar router
```

### Resultados y logs
```bash
# Resultados de comandos
bun run pt results list                  # Listar resultados
bun run pt results show <id>            # Ver resultado específico
bun run pt results last                  # Último resultado
# Logs
bun run pt logs tail                     # Ver logs
bun run pt logs session <id>            # Logs de sesión
bun run pt logs errors                  # Solo errores
```

### Dispositivos (memoria SQLite)
```bash
bun run pt list                  # Listar dispositivos guardados (bajo 'devices')
bun run pt add R1 --ip 10.0.0.1  # Agregar a memoria (bajo 'devices')
```

### Preferencias
```bash
bun run pt config-prefs set default_router 2911   # Guardar preferencia
bun run pt config-prefs get default_router         # Ver preferencia
```

### Comandos avanzados
```bash
# Lint - Validación de topología
bun run pt lint
# Capability - Consultar capacidades
bun run pt capability list
bun run pt capability model 2911
# Planner - Change planner con checkpoints
bun run pt planner list
bun run pt planner execute <plan-id>
# Ledger - Trazabilidad de operaciones
bun run pt ledger list
bun run pt ledger stats
# Diagnose - Diagnóstico causal
bun run pt diagnose ping-fails R1
bun run pt diagnose no-dhcp R1
```

### Inspección y verificación
```bash
# Inspección canónica
bun run pt inspect topology
bun run pt inspect neighbors R1
bun run pt inspect free-ports R1
bun run pt inspect drift
# Verificación
bun run pt verify ios R1
bun run pt verify link R1 Gi0/0 S1 Fa0/1
# Layout
bun run pt layout place R1 right-of S1
```

### Agent workflow
```bash
# Contexto para agente
bun run pt agent context --task "connect R1 and S1"
# Plan para agente
bun run pt agent plan --goal "normalize access layer"
# Verificación
bun run pt agent verify
```

### Ruta de archivos
- **macOS/Linux**: `~/pt-dev/`
- **Windows**: `%USERPROFILE%\pt-dev\`
- Override: `PT_DEV_DIR` environment variable

### PT API Reference

**Fuente única:** `packages/pt-runtime/src/pt-api/pt-api-registry.ts`

#### Global Classes (instantiate with `new`)

| Class | Uso | Métodos clave |
|-------|-----|---------------|
| `_Network` | `new _Network()` | `getDevice(name)`, `getDeviceAt(idx)`, `getDeviceCount()`, `getLinkAt(idx)`, `getLinkCount()` |
| `_SystemFileManager` | `new _SystemFileManager()` | `getFileContents(path)`, `writePlainTextToFile(path, content)`, `fileExists(path)`, `directoryExists(path)`, `makeDirectory(path)`, `getFilesInDirectory(path)`, `removeFile(path)`, `moveSrcFileToDestFile(src, dest)` |
| `_AppWindow` | `new _AppWindow()` | `getVersion()`, `getActiveWorkspace()`, `fileOpen(path)`, `fileSave()`, `exit()`, `showMessageBox(msg)`, `listDirectory(path)`, `writeToPT(data)` |
| `_Workspace` | desde `AppWindow` | `getLogicalWorkspace()` |
| `_Parser` | static methods | `ipcCall(class, method, args)`, `createObject(class, ...args)` |
| `_ScriptModule` | fallback fm | `getFileContents(path)`, `writeTextToFile(path, content)`, `getFileSize(path)`, `ipcCall()`, `getIpcApi()`, `setTimeout(fn, ms)` |

#### Interfaces PT

| Interface | Desde `ipc.network()` | Métodos clave |
|-----------|----------------------|---------------|
| `PTNetwork` | `ipc.network()` | `getDevice(name)`, `getDeviceAt(idx)`, `getDeviceCount()` |
| `PTDevice` | `net.getDevice(name)` | `getName()`, `setName(n)`, `getModel()`, `getPower()`, `setPower(bool)`, `getCommandLine()`, `getPortCount()`, `getPortAt(idx)`, `getPort(name)`, `addModule(slot, mod)` |
| `PTCommandLine` | `device.getCommandLine()` | `enterCommand(cmd)`, `getPrompt()`, `getMode()`, `registerEvent(event, null, handler)` |
| `PTPort` | `device.getPort(name)` | `getName()`, `getIpAddress()`, `getSubnetMask()`, `setIpSubnetMask(ip, mask)`, `isPortUp()`, `isProtocolUp()`, `getMacAddress()` |
| `PTLink` | `net.getLinkAt(idx)` | `getConnectionType()`, `getPort1()`, `getPort2()` |
| `PTLogicalWorkspace` | `appWindow.getActiveWorkspace().getLogicalWorkspace()` | `addDevice(typeId, model, x, y)`, `removeDevice(name)`, `createLink(d1, p1, d2, p2, cableType)`, `deleteLink(d, port)` |
| `PTFileManager` | `ipc.systemFileManager()` | `getFileContents`, `writePlainTextToFile`, `fileExists`, `directoryExists`, `makeDirectory`, `getFilesInDirectory`, `removeFile`, `moveSrcFileToDestFile`, `getFileSize`, `encrypt/decrypt`, `zip/unzip` |

#### Terminal Events (registerEvent on PTCommandLine)

```
commandStarted, outputWritten, commandEnded, modeChanged,
promptChanged, moreDisplayed, directiveSent,
commandSelectedFromHistory, commandAutoCompleted, cursorPositionChanged
```

#### Device Type Constants (`PT_DEVICE_TYPE_CONSTANTS`)

```
router=0, switch=1, hub=2, pc=8, server=9,
multilayerSwitch=16, firewall=27, iot=34
```

#### Cable Type Constants (`PT_CABLE_TYPE_CONSTANTS`)

```
auto=-1, straight=0, cross=1, fiber=2, serial=3,
console=4, phone=5, wireless=8, coaxial=9
```

#### Acceso IPC

```javascript
// Kernel (main.js) — ipc es global
var net = ipc.network();
var fm = ipc.systemFileManager();
var app = ipc.appWindow();

// Runtime (runtime.js) — ipc viene como parámetro
var net = ipc.network();
var fm = ipc.systemFileManager();

// Terminal
var dev = net.getDevice("R1");
var term = dev.getCommandLine();
term.enterCommand("show ip int brief");
term.registerEvent("commandEnded", null, function(s, args) {
  // args.status === 0 means success
});
```

### Requisitos
- Packet Tracer debe estar corriendo
- Módulo de scripting cargado en PT
- Timeout default: 120s para descubrimiento de dispositivos
