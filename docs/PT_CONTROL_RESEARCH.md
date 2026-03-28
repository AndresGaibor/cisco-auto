# Packet Tracer Control - Investigación y Estrategia

**Fecha**: 2026-03-26  
**Objetivo**: Controlar Packet Tracer en tiempo real desde CLI TypeScript/Bun

---

## 1. Resumen Ejecutivo

Packet Tracer **sí es automatizable desde dentro** mediante:
- **PT Script Modules** (`.pts`): Extensiones que corren mientras PT está abierto
- **File Script Modules**: Scripts embebidos en archivos `.pkt/.pka`
- **API oficial IPC**: Acceso completo al core de PT desde JavaScript
- **WebViews**: Interfaces HTML/CSS/JS con comunicación bidireccional

**Arquitectura MVC oficial**:
- **Modelo**: PT engine + GUI vía IPC, data store, save data
- **Vista**: WebViews HTML/CSS/JS (QWebEngine)
- **Controlador**: Script Engine en JavaScript/ECMAScript

### Antecedentes Verificados

#### PTBuilder
- Extensión oficial que expone helpers JavaScript para crear redes
- Funciones: `addDevice()`, `addLink()`, `configureIosDevice()`, etc.
- Tiene webview "Builder Code Editor" que ejecuta código con `runCode()`
- Internamente usa la API IPC oficial

#### MCP-Packet-Tracer (Mats2208)
- Servidor MCP + Bridge HTTP + PTBuilder runtime
- **No controla PT "desde afuera"**: usa PTBuilder como runtime interno
- Bridge HTTP (`localhost:54321`) + polling desde webview
- Flujo: `LLM → MCP Server → HTTP Bridge → PTBuilder WebView → $se('runCode') → Script Engine → IPC`

---

## 2. API Oficial IPC de Packet Tracer

### 2.1 Puntos de Entrada Globales

```javascript
// Entradas principales
ipc.network()              // Network: dispositivos, enlaces
ipc.appWindow()            // AppWindow: GUI, menús, webviews, workspace
ipc.commandLog()           // CommandLog: auditoría de comandos IOS
ipc.systemFileManager()    // SystemFileManager: I/O archivos local
ipc.ipcManager()           // IpcManager: messaging, save/open data
ipc.simulation()           // Simulation: control de simulación
ipc.hardwareFactory()      // HardwareFactory: tipos de hardware
ipc.options()              // Options: preferencias PT
```

**Referencias**:
- [IPC Class Reference](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_i_p_c.html)
- [Class Index completo](https://tutorials.ptnetacad.net/help/default/IpcAPI/classes.html)

---

### 2.2 Topología y Dispositivos

#### LogicalWorkspace

```javascript
var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();

// Crear dispositivos
var nombre = lw.addDevice(DeviceType.Router, "2911", 100, 100);
// Retorna: string con nombre asignado (ej: "Router0")

// Eliminar dispositivos
lw.removeDevice("R1");

// Crear enlaces
var ok = lw.createLink(
  "R1",                    // device1Name
  "GigabitEthernet0/0",   // port1Name
  "S1",                    // device2Name
  "GigabitEthernet0/1",   // port2Name
  8100                     // connType (enum CONNECT_TYPES)
);
// Retorna: bool

// Eliminar enlaces
lw.deleteLink("R1", "GigabitEthernet0/0");

// Auto-conectar
var ok = lw.autoConnectDevices("R1", "S1");
```

**Tipos de Cable (CONNECT_TYPES)**:
```javascript
var CT = {
  straight:   8100,  // ETHERNET_STRAIGHT
  cross:      8101,  // ETHERNET_CROSS
  roll:       8102,  // ROLL
  fiber:      8103,  // FIBER
  phone:      8104,  // PHONE
  cable:      8105,  // CABLE
  serial:     8106,  // SERIAL
  auto:       8107,  // AUTO
  console:    8108,  // CONSOLE
  wireless:   8109,  // WIRELESS
  coaxial:    8110,  // COAXIAL
  octal:      8111,  // OCTAL
  cellular:   8112,  // CELLULAR
  usb:        8113,  // USB
  custom_io:  8114   // CUSTOM_IO
};
```

**Eventos de LogicalWorkspace**:
```javascript
lw.registerEvent("deviceAdded", null, function(src, args) {
  // args: { name, model, uuid }
});

lw.registerEvent("deviceRemoved", null, function(src, args) {
  // args: { name, uuid }
});

lw.registerEvent("linkCreated", null, function(src, args) {
  // args: { device1, port1, device2, port2, connType }
});

lw.registerEvent("linkDeleted", null, function(src, args) {
  // args: { device1, port1, device2, port2, connType }
});
```

**Referencias**:
- [LogicalWorkspace Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_logical_workspace.html)

---

#### Network y Device

```javascript
var net = ipc.network();

// Consultar dispositivos
var count = net.getDeviceCount();
var device = net.getDevice("R1");
var device = net.getDeviceAt(0);

// Propiedades de Device
device.getName();          // string
device.setName("R1");
device.getModel();         // string: "2911"
device.getType();          // number: DeviceType enum
device.getPower();         // bool
device.setPower(false);

// Puertos
var portCount = device.getPortCount();
var port = device.getPort("GigabitEthernet0/0");
var port = device.getPortAt(0);

// Módulos
device.addModule(slot, moduleType, model);    // bool
device.removeModule(slot);                     // bool

// CLI
var term = device.getCommandLine();  // TerminalLine
```

**Serialización oficial de Device**:
```javascript
// XML completo del dispositivo
var xml = device.serializeToXml();

// Activity tree en XML
var activityXml = device.activityTreeToXml();

// Atributos externos en JSON
var attrsJson = device.getDeviceExternalAttributes();
```

**Referencias**:
- [Network Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_network.html)
- [Device Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_device.html)

---

### 2.3 Configuración de Hosts (PCs)

```javascript
var port = device.getPort("FastEthernet0");

// Configurar IP estática
port.setIpSubnetMask("192.168.1.10", "255.255.255.0");
port.setDefaultGateway("192.168.1.1");
port.setDnsServerIp("8.8.8.8");

// Consultar
var ip = port.getIpAddress();      // string
var mask = port.getSubnetMask();   // string
var gw = port.getDefaultGateway(); // string
var mac = port.getMacAddress();    // string
var link = port.getLink();         // Link | null
```

**Referencias**:
- [HostPort Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_host_port.html)

---

### 2.4 Configuración CLI (Routers/Switches)

#### TerminalLine (Detallado)

```javascript
var term = device.getCommandLine();

// Ejecutar comando
term.enterCommand("conf t", "");

// Obtener estado
var prompt = term.getPrompt();           // "R1(config)#"
var mode = term.getMode();               // string
var input = term.getCommandInput();      // string

// Eventos
term.registerEvent("commandStarted", null, function(src, args) {
  // args: { commandString }
});

term.registerEvent("commandEnded", null, function(src, args) {
  // args: { commandString, commandStatus }
  // commandStatus: 0=Ok, 1=Ambiguous, 2=Invalid, 3=Incomplete, 4=NotImplemented
});

term.registerEvent("outputWritten", null, function(src, args) {
  // args: { outputString, isDebug, cursorPositionFromEnd }
});

term.registerEvent("promptChanged", null, function(src, args) {
  // args: { promptString }
});

term.registerEvent("modeChanged", null, function(src, args) {
  // args: { newMode, newModeArg, newPrompt }
});

term.registerEvent("moreDisplayed", null, function(src, args) {
  // Paginación "--More--"
  // Puedes responder con term.enterChar(" ")
});
```

**Referencias**:
- [TerminalLine Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_terminal_line.html)

---

#### CommandLog (Auditoría)

```javascript
var cl = ipc.commandLog();

// Activar
cl.setEnabled(true);

// Consultar
var count = cl.getEntryCount();
var entry = cl.getEntryAt(0);

// Propiedades de CommandLogEntry
entry.getTimeToString();      // "12:30:11"
entry.getDeviceName();        // "R1"
entry.getPrompt();            // "R1(config)#"
entry.getCommand();           // "hostname R1"
entry.getResolvedCommand();   // "hostname R1"

// Evento
cl.registerEvent("entryAdded", null, function(src, args) {
  // args: { index }
});
```

**Referencias**:
- [CommandLog Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_command_log.html)
- [CommandLogEntry Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_command_log_entry.html)

---

#### CiscoDevice (Rápido)

```javascript
// Para routers/switches Cisco
device.skipBoot();  // Saltar boot process

// Ejecutar comando directo
var result = device.enterCommand("show ip int brief", "");
// result: [status, output]
// status: 0=Ok, 1=Ambiguous, 2=Invalid, 3=Incomplete, 4=NotImplemented

// Eventos de arranque
device.registerEvent("doneBooting", null, callback);
device.registerEvent("lineConnected", null, callback);
device.registerEvent("lineDisconnected", null, callback);
```

**Referencias**:
- [CiscoDevice Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_cisco_device.html)

---

### 2.5 File I/O y FileWatcher

#### SystemFileManager

```javascript
var fm = ipc.systemFileManager();

// Consultar
fm.fileExists(path);          // bool
fm.directoryExists(path);     // bool

// Leer
var content = fm.getFileContents(path);  // string

// Escribir
fm.writePlainTextToFile(path, content);  // UTF-8 plano
fm.writeTextToFile(path, contents64);    // Base64 (según docs)

// Eliminar
fm.removeFile(path);

// Directorios
fm.makeDirectory(path);
```

**Referencias**:
- [SystemFileManager Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_system_file_manager.html)

---

#### SystemFileWatcher (Hot Reload)

```javascript
var fm = ipc.systemFileManager();
var fw = fm.getFileWatcher();

// Vigilar archivo/directorio
fw.addPath("~/pt-dev/runtime.js");

// Eventos
fw.registerEvent("fileChanged", null, function(src, args) {
  // args: { path }
  var content = fm.getFileContents(args.path);
  // Recargar runtime
});

fw.registerEvent("directoryChanged", null, function(src, args) {
  // args: { path }
});
```

**IMPORTANTE**: Los eventos pueden dispararse múltiples veces por un solo save. Implementar debounce (80-150ms).

**Referencias**:
- [SystemFileWatcher Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_system_file_watcher.html)

---

### 2.6 GUI, Menús y WebViews

#### AppWindow y MenuBar

```javascript
var app = ipc.appWindow();

// Menú Extensions
var menuBar = app.getMenuBar();
var extMenu = menuBar.getExtensionsPopupMenu();

// Agregar ítem
var item = extMenu.insertItemAfter(null, "Mi CLI");

// Click
item.registerEvent("onClicked", null, function() {
  // Abrir webview o ejecutar acción
});

// Diálogos
app.showMessageBox(
  "Error",              // title
  "Algo falló",         // message
  "Revisa el script",   // informativeText
  2,                    // icon: 0=NoIcon, 1=Info, 2=Warning, 3=Critical, 4=Question
  1024,                 // buttons (StandardButton flags)
  1024,                 // defaultButton
  1024                  // escapeButton
);
```

**Referencias**:
- [AppWindow Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_app_window.html)
- [MenuBar Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_menu_bar.html)

---

#### WebViewManager y WebView

```javascript
var wvm = app.getWebViewManager();

// Crear webview
var webview = wvm.createWebView(
  "Mi CLI",               // title
  "this-sm:index.html",   // URL (this-sm: = archivos del módulo)
  900,                    // width
  600                     // height
);

// Ejecutar JS en webview (asíncrono, recomendado)
webview.evaluateJavaScriptAsync("console.log('hola')");

// Cambiar URL
webview.setUrl("this-sm:other.html");

// Cerrar
wvm.closeWebView(webview.uuid);
```

**Referencias**:
- [WebViewManager Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_web_view_manager.html)
- [WebView Class](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_web_view.html)

---

#### Comunicación WebView ↔ Script Engine

**Desde Script Engine a WebView**:
```javascript
// Ejecutar JS en la webview
webview.evaluateJavaScriptAsync("miFunc('arg')");
```

**Desde WebView a Script Engine**:
```javascript
// Llamar función del Script Engine (síncrono)
$se("nombreFuncion", arg1, arg2);

// Evaluar programa en Script Engine
$seev("dprint('hola desde webview')");

// Data store (asíncrono)
await $putData("key", { a: 1 });
var value = await $getData("key");
await $removeData("key");

// Debug console
dprint("mensaje");
```

**LIMITACIÓN CRÍTICA**: 
- En WebViews **NO** están soportados `registerEvent` ni `registerDelegate`
- Esas APIs solo funcionan en Script Engine
- Usar `ipcCallAsync()`, `ipcCallArgsAsync()` o `await obj.method()` para IPC desde webview

**Referencias**:
- [Script Modules - WebViews](https://tutorials.ptnetacad.net/help/default/scriptModules_webViews.htm)

---

## 3. PTBuilder: Helpers de Conveniencia

PTBuilder es una capa sobre la API oficial que facilita automatización.

### 3.1 Funciones Principales

```javascript
// Crear dispositivo
addDevice(deviceName, deviceModel, x, y);
// Retorna: bool
// Internamente: lw.addDevice() + device.setName() + skipBoot()

// Agregar módulo
addModule(deviceName, slot, model);
// Retorna: bool
// Internamente: apaga equipo, addModule(), restaura power, skipBoot()

// Crear enlace
addLink(device1Name, device1Interface, device2Name, device2Interface, linkType);
// linkType: "straight", "cross", "fiber", "serial", "auto", "console", etc.
// Retorna: bool

// Configurar PC
configurePcIp(deviceName, dhcpEnabled, ipaddress, subnetMask, defaultGateway, dnsServer);
// Todos los parámetros excepto deviceName son opcionales
// dhcpEnabled: true/false/undefined
// Si dhcpEnabled=true, habilita DHCP
// Si dhcpEnabled no está, configura estático

// Configurar IOS
configureIosDevice(deviceName, commands);
// commands: string separado por \n
// Internamente: skipBoot() + enterCommand() línea por línea + write memory

// Listar dispositivos
getDevices(filter, startsWith);
// filter: undefined | string | number | array
// startsWith: string (prefix del nombre)
// Retorna: string[] (nombres de dispositivos)
```

### 3.2 runCode()

PTBuilder expone `runCode(scriptText)` que ejecuta código arbitrario:
```javascript
runCode("addDevice('R1','2911',100,100); addLink('R1','GigabitEthernet0/0','S1','GigabitEthernet0/1','straight');");
// Retorna: true (éxito) | false (error runtime)
```

**Limitación**: Si hay error de sintaxis/parsing, muestra `showMessageBox` y no retorna valor útil.

**Referencias**:
- [PTBuilder GitHub - userfunctions.js](https://github.com/kimmknight/PTBuilder/blob/main/source/userfunctions.js)
- [PTBuilder GitHub - runcode.js](https://github.com/kimmknight/PTBuilder/blob/main/source/runcode.js)

---

## 4. Estrategias de Control Remoto

### 4.1 Bridge HTTP (Estilo Mats/PTBuilder)

**Arquitectura**:
```
CLI TypeScript (Bun)
  ↓ HTTP commands
Bridge HTTP Server (:54321)
  ↓ polling GET /next
PTBuilder WebView (XMLHttpRequest)
  ↓ $se('runCode', js)
PT Script Engine
  ↓ IPC
Packet Tracer Core
```

**Por qué funciona**:
- Script Engine **NO** tiene `XMLHttpRequest` ni `fetch`
- WebView **SÍ** tiene `XMLHttpRequest` (QWebEngine)
- `$se()` permite llamar funciones del Script Engine desde webview
- Polling cada 400-500ms es suficiente

**Endpoints básicos**:
- `GET /next`: Obtener próximo comando en cola
- `POST /event`: Recibir eventos de PT (logs, resultados, errores)
- `GET /status`: Estado de conexión
- `GET /events?limit=N`: Stream de eventos recientes

**Referencias**:
- [MCP-Packet-Tracer - README](https://github.com/Mats2208/MCP-Packet-Tracer/blob/main/README.md)
- [MCP-Packet-Tracer - WIKI](https://github.com/Mats2208/MCP-Packet-Tracer/blob/main/WIKI.md)

---

### 4.2 FileWatcher (Recomendado para CLI)

**Arquitectura**:
```
CLI TypeScript (Bun)
  ↓ escribe archivos
~/pt-dev/
  runtime.js      ← código a ejecutar
  command.json    ← payload de comando
  state.json      ← estado actual
  events.ndjson   ← logs de PT
  ↑ lee archivos
PT Script Engine (FileWatcher)
```

**Ventajas**:
- No requiere webview ni HTTP
- No requiere permisos de red
- Loop más simple
- Ideal para desarrollo iterativo
- Funciona sin PTBuilder (solo API oficial)

**Desventajas**:
- No es multi-cliente como HTTP
- Latencia ligeramente mayor (~100-200ms)
- Coordinación de atomicidad en writes

**Implementación en PT**:
```javascript
var fm = ipc.systemFileManager();
var fw = fm.getFileWatcher();

var DEV_DIR = "~/pt-dev";
var RUNTIME = DEV_DIR + "/runtime.js";
var COMMAND = DEV_DIR + "/command.json";
var EVENTS  = DEV_DIR + "/events.ndjson";

var runtimeFn = null;
var reloadTimer = null;

function appendEvent(evt) {
  var prev = fm.fileExists(EVENTS) ? fm.getFileContents(EVENTS) : "";
  fm.writePlainTextToFile(EVENTS, prev + JSON.stringify(evt) + "\n");
}

function loadRuntime() {
  try {
    var code = fm.getFileContents(RUNTIME);
    runtimeFn = new Function("payload", "ipc", code);
    appendEvent({ type: "runtime-loaded", ts: Date.now() });
  } catch (e) {
    appendEvent({ type: "error", ts: Date.now(), message: String(e) });
  }
}

function runCommand() {
  try {
    var payload = JSON.parse(fm.getFileContents(COMMAND));
    var result = runtimeFn ? runtimeFn(payload, ipc) : null;
    appendEvent({ type: "result", ts: Date.now(), result: result });
  } catch (e) {
    appendEvent({ type: "error", ts: Date.now(), message: String(e) });
  }
}

function onFileChanged(src, args) {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(function() {
    if (args.path === RUNTIME) loadRuntime();
    if (args.path === COMMAND) runCommand();
  }, 80);
}

function main() {
  if (!fm.directoryExists(DEV_DIR)) fm.makeDirectory(DEV_DIR);
  fw.addPath(RUNTIME);
  fw.addPath(COMMAND);
  fw.registerEvent("fileChanged", null, onFileChanged);
  appendEvent({ type: "init", ts: Date.now() });
}
```

---

## 5. Arquitectura Recomendada para CLI

### 5.1 Estructura del Proyecto

```
cisco-auto/
├── src/
│   ├── cli/
│   │   ├── index.ts              # Entry point CLI
│   │   ├── commands/
│   │   │   ├── device.ts         # pt device add|remove|list
│   │   │   ├── link.ts           # pt link add|remove|list
│   │   │   ├── config.ts         # pt config ios|host
│   │   │   └── watch.ts          # pt watch (live mode)
│   │   └── pt-bridge.ts          # Bridge abstraction
│   │
│   ├── pt-runtime/
│   │   ├── runtime.js            # Código que corre en PT
│   │   ├── helpers.js            # Wrappers sobre API IPC
│   │   └── events.js             # Event handlers
│   │
│   ├── bridge/
│   │   ├── file-bridge.ts        # FileWatcher strategy
│   │   └── http-bridge.ts        # HTTP strategy (opcional)
│   │
│   ├── core/
│   │   ├── types.ts              # TypeScript types para IPC
│   │   ├── schemas.ts            # Zod schemas
│   │   └── constants.ts          # Enums (CONNECT_TYPES, etc)
│   │
│   └── utils/
│       ├── logger.ts
│       └── validator.ts
│
├── pt-extension/                 # PT Script Module
│   ├── main.js                   # Ciclo de vida del módulo
│   ├── watcher.js                # FileWatcher setup
│   └── manifest.xml              # Metadata del módulo
│
└── docs/
    ├── PT_CONTROL_RESEARCH.md    # Este archivo
    └── API_REFERENCE.md          # API detallada generada
```

---

### 5.2 CLI Interface (Propuesta)

```bash
# Dispositivos
pt device add --name R1 --model 2911 --x 100 --y 100
pt device remove --name R1
pt device list [--type router|switch|pc]

# Enlaces
pt link add --from R1:GigabitEthernet0/0 --to S1:GigabitEthernet0/1 --type straight
pt link remove --device R1 --port GigabitEthernet0/0
pt link list

# Configuración
pt config host --name PC1 --ip 192.168.1.10 --mask 255.255.255.0 --gateway 192.168.1.1
pt config ios --name R1 --commands "conf t" "hostname R1" "int g0/0" "ip address 1.1.1.1 255.0.0.0" "no shut"
pt config ios --name R1 --file config.txt

# Inspección
pt inspect device --name R1 [--xml|--json]
pt inspect topology [--snapshot]
pt logs [--device R1] [--follow]

# Modo watch
pt watch --dir ~/pt-dev
pt watch --http --port 54321

# Snapshots y replay
pt snapshot save --name base-topology
pt snapshot load --name base-topology
pt snapshot diff --from base-topology --to current

# Recorder
pt record start [--output ops.ndjson]
pt record stop
pt replay --file ops.ndjson [--speed 1.0]
```

---

### 5.3 Formato de Operaciones (OpLog)

Todas las operaciones deben normalizarse a un formato reproducible:

```typescript
type Op =
  | { kind: "addDevice"; name: string; model: string; x: number; y: number }
  | { kind: "addModule"; device: string; slot: number; module: string }
  | { kind: "createLink"; dev1: string; port1: string; dev2: string; port2: string; type: number }
  | { kind: "configIos"; device: string; commands: string[] }
  | { kind: "configHost"; device: string; ip?: string; mask?: string; gw?: string; dns?: string; dhcp?: boolean }
  | { kind: "removeDevice"; device: string }
  | { kind: "deleteLink"; device: string; port: string }
  | { kind: "moveDevice"; device: string; x: number; y: number }
  | { kind: "renameDevice"; oldName: string; newName: string };

type OpLog = {
  version: "1.0";
  timestamp: number;
  operations: Array<Op & { ts: number; id: string }>;
};
```

**Ventajas**:
- Reproducible
- Versionable
- Diff-able
- Convertible a script PTBuilder o API directa

---

## 6. Telemetría y Observabilidad

### 6.1 Event Stream

Todos los eventos de PT se envían a `events.ndjson`:

```typescript
type PTEvent =
  | { type: "init"; ts: number }
  | { type: "runtime-loaded"; ts: number }
  | { type: "log"; ts: number; level: "info"|"warn"|"error"; message: string }
  | { type: "result"; ts: number; id: string; ok: boolean; value: unknown; snapshot?: Snapshot }
  | { type: "error"; ts: number; id?: string; message: string; stack?: string }
  | { type: "cmdlog"; ts: number; index: number; device: string; prompt: string; command: string }
  | { type: "device-added"; ts: number; name: string; model: string; uuid: string }
  | { type: "device-removed"; ts: number; name: string; uuid: string }
  | { type: "link-created"; ts: number; dev1: string; port1: string; dev2: string; port2: string; type: number }
  | { type: "link-deleted"; ts: number; dev1: string; port1: string; dev2: string; port2: string };
```

### 6.2 CLI Tracking

```typescript
type CliSpan = {
  id: string;
  device: string;
  startedAt: number;
  endedAt?: number;
  inputCommand: string;
  completeCommand?: string;
  mode?: string;
  prompt?: string;
  status?: 0 | 1 | 2 | 3 | 4;  // 0=Ok, 1=Ambiguous, 2=Invalid, 3=Incomplete, 4=NotImplemented
  stdout: string[];
  errors: string[];
};
```

Captura mediante `TerminalLine` events:
- `commandStarted` → abre span
- `outputWritten` → append stdout
- `commandEnded` → cierra span con status

---

## 7. TypeScript Typings Generation

### 7.1 Fuente de Metadata

La API oficial está documentada en archivos `.pki` (archivos de parser Doxygen).
Ejemplos visibles en URLs:
- `CMainParser.pki`
- `Device.pki`
- `CCommandLogEntry.pki`
- `SystemFileWatcher.pki`

### 7.2 Pipeline Propuesto

1. **Scrape docs oficiales**: Extraer Class Index completo
2. **Parse HTML**: Extraer métodos, parámetros, retornos, eventos
3. **Generate types**: 
   - Interfaces TS para objetos IPC
   - Enums para constantes (CONNECT_TYPES, CommandStatus, etc)
   - Schemas Zod para validación RPC
4. **Overlay community**: Añadir hallazgos verificados (métodos no enumerables, quirks)

### 7.3 Estructura de Metadata

```typescript
type MethodMeta = {
  name: string;
  params: Array<{ name: string; type: string; required: boolean }>;
  returns: string;
  origin: "official" | "community-verified";
};

type EventMeta = {
  name: string;
  params: Array<{ name: string; type: string }>;
};

type ClassMeta = {
  className: string;
  inherits?: string;
  methods: MethodMeta[];
  events: EventMeta[];
  docs: string;
};

type PTApiMetadata = {
  version: string;
  classes: Record<string, ClassMeta>;
  enums: Record<string, Record<string, number>>;
};
```

---

## 8. Inspector Remoto (Avanzado)

Para casos donde necesites inspeccionar estado en tiempo real sin snapshots.

### 8.1 Arquitectura Handle-Based

```typescript
type Handle = {
  id: string;                // Generado: "h_<timestamp>_<random>"
  className: string;         // "Device", "Port", "TerminalLine", etc
  source: "root" | "traversal" | "event";
  uuid?: string;             // PT objectUuid si aplica
  parentId?: string;
  via?: { method: string; args: unknown[] };
};

type Snapshot = {
  className: string;
  scalar: Record<string, unknown>;  // Valores primitivos
  children?: Array<{ rel: string; handleId: string }>;
  xml?: string;              // Device.serializeToXml()
  rawJson?: string;          // Device.getDeviceExternalAttributes()
};
```

### 8.2 Inspector API

```typescript
// En PT
var HANDLE_DB: Record<string, { obj: any; className: string; meta: any }> = {};

function putHandle(obj: any, className: string, meta?: any): string {
  const id = `h_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  HANDLE_DB[id] = { obj, className, meta: meta || {} };
  return id;
}

function invoke(handleId: string, method: string, args: any[]): any {
  const handle = HANDLE_DB[handleId];
  if (!handle) throw new Error(`Handle not found: ${handleId}`);
  return handle.obj[method](...args);
}

function snapshot(handleId: string): Snapshot {
  const handle = HANDLE_DB[handleId];
  // ... build snapshot
}
```

**CLI endpoints**:
- `pt inspect --handle <id> --method getName`
- `pt inspect --handle <id> --snapshot`
- `pt inspect --root network`

---

## 9. Recorder y Replay

### 9.1 Recorder Implementation

```javascript
// En PT: main.js
function setupRecorder() {
  var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
  
  lw.registerEvent("deviceAdded", null, function(src, args) {
    appendOp({
      kind: "addDevice",
      name: args.name,
      model: args.model,
      // Necesitamos capturar x,y también (no viene en evento)
    });
  });
  
  lw.registerEvent("linkCreated", null, function(src, args) {
    appendOp({
      kind: "createLink",
      dev1: args.device1,
      port1: args.port1,
      dev2: args.device2,
      port2: args.port2,
      type: args.connType
    });
  });
  
  // ... más eventos
}
```

### 9.2 Replay Implementation

```javascript
function replayOp(op) {
  switch (op.kind) {
    case "addDevice":
      var name = lw.addDevice(getDeviceType(op.model), op.model, op.x, op.y);
      var dev = ipc.network().getDevice(name);
      if (dev && name !== op.name) dev.setName(op.name);
      break;
    
    case "createLink":
      lw.createLink(op.dev1, op.port1, op.dev2, op.port2, op.type);
      break;
    
    // ... más casos
  }
}
```

---

## 10. Limitaciones y Quirks Documentados

### 10.1 Port No Enumerable
Los objetos `Port` **no son enumerables** con `for..in`, aunque sus métodos existen y funcionan. Esto es por bindings nativos C++. Usar lista explícita de métodos para probing.

**Referencia**: [MCP-Packet-Tracer WIKI](https://github.com/Mats2208/MCP-Packet-Tracer/blob/main/WIKI.md)

### 10.2 Script Engine No Tiene HTTP
El Script Engine **NO** tiene `XMLHttpRequest`, `fetch`, ni `WebSocket`.
Solo la WebView tiene acceso a esos APIs.

### 10.3 WebViews No Soportan Events/Delegates
En WebViews **NO** funcionan `registerEvent()` ni `registerDelegate()`.
Esas APIs solo funcionan en Script Engine.
Usar `ipcCallAsync()` o `await obj.method()` para IPC desde webview.

### 10.4 FileWatcher Event Bursts
`fileChanged` puede dispararse múltiples veces por un solo save.
**Siempre implementar debounce** (80-150ms recomendado).

### 10.5 addDevice() Retorna Nombre Autoasignado
`LogicalWorkspace.addDevice()` retorna un nombre como `"Router0"`, no el que tú quieres.
**Siempre llamar `device.setName()`** después de crear.

PTBuilder hace exactamente esto.

### 10.6 Módulos Requieren Power Off
Para agregar módulos con `device.addModule()`, el dispositivo debe estar apagado.
PTBuilder:
1. `device.setPower(false)`
2. `device.addModule(...)`
3. `device.setPower(true)`
4. `device.skipBoot()`

### 10.7 evaluateJavaScript vs evaluateJavaScriptAsync
**Usar siempre `evaluateJavaScriptAsync()`**.
La versión síncrona puede causar deadlocks y crashes en PT.

Documentado oficialmente en Script Modules.

### 10.8 Security Privileges
Algunos métodos IPC requieren **security privileges** explícitos en el manifest del módulo.
Si no pides el privilegio, la llamada IPC se rechaza.

### 10.9 Versión API vs Versión PT
La documentación oficial está rotulada como **"Cisco Packet Tracer Extensions API 8.1.0"**, aunque PT sea 9.0+.
Tratar helpers no documentados con cautela.

### 10.10 One-Liners en runCode()
PTBuilder tiene problemas con saltos de línea en algunos flujos.
**Preferir one-liners** con `;` al generar código para `runCode()`.

**Referencia**: [MCP-Packet-Tracer README](https://github.com/Mats2208/MCP-Packet-Tracer/blob/main/README.md)

---

## 11. Referencias Oficiales

### Documentación Cisco/NetAcad
- [Script Modules Overview](https://tutorials.ptnetacad.net/help/default/scriptModules.htm)
- [Script Modules - Script Engine](https://tutorials.ptnetacad.net/help/default/scriptModules_scriptEngine.htm)
- [Script Modules - WebViews](https://tutorials.ptnetacad.net/help/default/scriptModules_webViews.htm)
- [Script Modules - Scripting Interface](https://tutorials.ptnetacad.net/help/default/scriptModules_scriptingInterface.htm)
- [IPC API Reference](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_i_p_c.html)
- [Class Index completo](https://tutorials.ptnetacad.net/help/default/IpcAPI/classes.html)

### GitHub Repos
- [PTBuilder](https://github.com/kimmknight/PTBuilder)
- [MCP-Packet-Tracer](https://github.com/Mats2208/MCP-Packet-Tracer)

---

## 12. Próximos Pasos

1. **Implementar FileWatcher Bridge** (modo básico)
2. **Crear PT Script Module** básico con watcher
3. **CLI core commands**: device, link, config
4. **Event streaming** a NDJSON
5. **Tipado TypeScript** para IPC
6. **Recorder/Replay** básico
7. **Inspector remoto** (opcional)
8. **HTTP Bridge** (opcional, para multi-cliente)

---

## 13. Decisiones de Arquitectura

### ¿FileWatcher o HTTP Bridge?

**FileWatcher (Recomendado para inicio)**:
- ✅ Más simple
- ✅ No requiere webview
- ✅ No requiere permisos de red
- ✅ Ideal para desarrollo iterativo
- ✅ Funciona sin PTBuilder
- ❌ No es multi-cliente
- ❌ Latencia ~100-200ms

**HTTP Bridge**:
- ✅ Multi-cliente (varios CLIs)
- ✅ Latencia ~50-100ms
- ✅ Compatible con arquitectura MCP
- ❌ Requiere webview
- ❌ Puede requerir permisos externos
- ❌ Más complejo de debuggear

**Veredicto**: Empezar con **FileWatcher**. Agregar HTTP Bridge como feature avanzada.

### ¿PTBuilder o API Directa?

**PTBuilder**:
- ✅ Helpers convenientes ya probados
- ✅ Menos código en PT
- ❌ Dependencia externa
- ❌ Menos control fino

**API Directa**:
- ✅ Control total
- ✅ No dependencias
- ✅ Telemetría más rica
- ❌ Más código en PT
- ❌ Más tiempo de desarrollo

**Veredicto**: Empezar con **API directa** + wrappers inspirados en PTBuilder. Mantener compatibilidad con PTBuilder como target de export.

---

## 14. Notas Finales

Este documento recopila toda la investigación sobre control de Packet Tracer.

**Hallazgos clave**:
1. PT **SÍ es automatizable** mediante Script Modules oficiales
2. La API IPC es **muy completa** (mucho más que PTBuilder)
3. FileWatcher es **viable y elegante** para CLI
4. Telemetría CLI rica está **totalmente soportada**
5. Tipado TypeScript es **generatable** desde docs oficiales

**No es necesario**:
- ❌ Hacks o reverse engineering
- ❌ MCP server (queremos CLI, no LLM integration)
- ❌ PTBuilder como dependencia crítica
- ❌ Control "desde fuera" por otro proceso

**Sí es necesario**:
- ✅ PT Script Module custom
- ✅ Bridge (FileWatcher o HTTP)
- ✅ Runtime JavaScript en PT
- ✅ CLI TypeScript/Bun
- ✅ Event streaming y OpLog

---

**Fecha actualización**: 2026-03-26  
**Estado**: Research completo, listo para implementación  
**Próximo**: Implementar FileWatcher Bridge + PT Script Module básico
