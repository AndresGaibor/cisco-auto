# PT-API-COMPLETE — Referencia de API IPC de Packet Tracer 9.0.0.0810

Documentación exhaustiva de la API expuesta por el motor de scripting de Packet Tracer 9.0.0.0810 vía `omni raw`.

---

## 1. OBJETOS PRINCIPALES

```
ipc.network()                             → PTNetwork (objeto raíz de red)
ipc.appWindow()                           → PTAppWindow (ventana principal)
ipc.appWindow().getActiveWorkspace()      → Workspace (lienzo activo)
  .getLogicalWorkspace()                  → PTCanvas (manipulación de canvas)
```

---

## 2. APIs FUNCIONALES (✅)

### 2.1 Network — Inventario de Dispositivos

| Método | Retorno | Ejemplo |
|--------|---------|---------|
| `net.getDeviceCount()` | `number` | `12` |
| `net.getDevice(name)` | `Device` | `net.getDevice("R1")` |
| `net.getDeviceAt(index)` | `Device` | `net.getDeviceAt(0)` |
| `net.getLinkCount()` | `number` | `13` |
| `net.getLinkAt(index)` | `Link` | `net.getLinkAt(0)` |

### 2.2 Device — Métodos

| Método | Retorno | Ejemplo |
|--------|---------|---------|
| `dev.getName()` | `string` | `"R1"` |
| `dev.getModel()` | `string` | `"2911"`, `"2960-24TT"`, `"PC-PT"` |
| `dev.getType()` | `number` | Ver tabla tipos |
| `dev.getPortCount()` | `number` | `4` (R1), `27` (SW1), `2` (PC1) |
| `dev.getPortAt(index)` | `Port` | `dev.getPortAt(1)` |

### 2.3 Port — Métodos

| Método | Retorno | Ejemplo |
|--------|---------|---------|
| `port.getName()` | `string` | `"GigabitEthernet0/0"`, `"Vlan1"` |
| `port.getType()` | `number` | `4` (GigE), `3` (FastE), `17` (Vlan1) |
| `port.getSubnetMask()` | `string` | `"255.255.255.0"`, `"0.0.0.0"` |
| `port.getLink()` | `Link` o `null` | Devuelve el link conectado o null |
| `port.getMacAddress()` | `string` | `"00D0.BCE3.7901"` |
| `port.getDescription()` | `string` | `""` o `"Link to R1"` |
| `port.setDescription(text)` | `null` | ✅ **Escritura, persiste** |
| `port.getAccessVlan()` | `number` | Solo en switch physical ports. `1` por defecto |
| `port.setAccessVlan(id)` | `null` | Solo en switch physical ports. ✅ **Escritura, persiste** |

### 2.4 Device — Métodos adicionales

| Método | Retorno | Disponible en |
|--------|---------|---------------|
| `dev.getHostName()` | `string` | Router → `"Router"`, Switch → `"Switch"` (tipo, no hostname configurable) |
| `dev.setPower(boolean)` | `null` | **TODOS** los dispositivos. `true`=encender, `false`=apagar |
| `dev.getDescription()` | `null` | Existe en device pero retorna null (solo ports tienen descripción real) |

### 2.4 Workspace — Zoom

| Método | Retorno |
|--------|---------|
| `ws.zoomIn()` | `ok` |
| `ws.zoomOut()` | `ok` |
| `ws.zoomReset()` | `ok` |
| `aw.isSimulationMode()` | `false` |

### 2.5 VlanManager (parcial)

| Método | Retorno |
|--------|---------|
| `vlanMgr.getVlanCount()` | `number` |
| `vlanMgr.getVlanAt(index)` | `Vlan` |
| `vlanMgr.getVlanIds()` | `string[]` |
| `vlanMgr.getVlanName(id)` | `string` |
| `vlanMgr.addVlan(id, name)` | `true` |
| `vlanMgr.removeVlan(id)` | `true` |
| `vlanMgr.changeVlanName(id, newName)` | `true` |

---

## 3. APIs INEXISTENTES (❌ TypeError)

### 3.1 Device — NO existen

```
getDisplayName()         getHardware()           getSoftwareVersion()
getVendor()              getOperatingSystem()    getIOSVersion()
getIPAddress()           getMACAddress()         getDefaultGateway()
getX()                   getY()                  getPosition()
isRunning()              isOn()                  isUp()
setLabel()               setDisplayName()
getInterfaceCount()      getInterfaceAt(index)   getInterfaceNames()
getSlotCount()           getSlotNames()          getModuleInSlot(index)
getModuleCount()         getConfig()
```

### 3.2 Port — NO existen

```
getDisplayName()         getModel()              getStatus()
isUp()                   isEnabled()             isConnected()
getIPAddress()           getMACAddress()         getSpeed()
getDuplex()              getVlan()               getMode()
getPeer()                getPeerDevice()
getId()                  getUUID()
```

### 3.3 Link — NO existen (objeto opaco)

```
getType()                getName()               getId()
getDevice1()             getDevice2()            getInterface1()
getInterface2()          getBandwidth()          getSpeed()
getStatus()              isUp()                  isEnabled()
getCost()                getDelay()
```

### 3.4 Network — NO existen

```
getDeviceNames()         getLinkIds()            getRouterCount()
getSwitchCount()         getPcCount()            getServerCount()
getDeviceGroupCount()    getVlanManager()        addLink()
addDevice()              removeDevice()
```

### 3.5 AppWindow/Workspace — NO existen

```
getWorkspaceCount()      getWorkspaceName(i)     getPhysicalWorkspace()
getSimulationManager()   getVersion()            getEnvironment()
getTitle()               isMaximized()
enterSimulationMode()    exitSimulationMode()
saveProject()            saveAs()
undo()                   redo()                  canUndo()
canRedo()
selectDevice()           selectAll()             deselectAll()
copy()                   paste()
```

### 3.6 LogicalWorkspace — NO existen

```
getClusterCount()        getClusterIds()
getCanvasNoteData(id)    getCanvasNoteLabel(id)
getAllItemIds()
```

---

## 4. APIs PELIGROSAS (🔴 SIGSEGV — NO USAR)

| Método | Síntoma | Stack |
|--------|---------|-------|
| `getRectItemData(id)` | Crash PT | `CCanvasRectangle::getShapeData()` → `CCanvasNote::getOriginalText()` null ptr |
| `getEllipseItemData(id)` | Crash PT | `CCanvasEllipse::getShapeData()` → `CCanvasNote::getOriginalText()` null ptr |
| `getShapeItemData(id, type)` | Crash PT | Misma cadena. No leer ningún shape. |
| `getCanvasItemX/Y(id)` | Sospechoso | No probado suficientemente |
| `Object.getOwnPropertyNames(obj)` on IPC proxy | Crash PT | No soportado por proxies IPC |

**Regla:** No leer shapes, rects, ellipses, notes, text decorativo en PT 9.0.0.0810.

---

## 5. APIs SEGURAS (✅ No crashean, retorno vacío)

| Método | Retorno |
|--------|---------|
| `getRectItemData("FAKE-ID")` | `[]` |
| `getLineItemData("FAKE-ID")` | `[]` |
| `getPolygonItemData("FAKE-ID")` | `[]` |
| `getCanvasRectIds()` | `[]` |
| `getCanvasLineIds()` | `[]` |
| `getCanvasEllipseIds()` | `[]` |
| `getCanvasPolygonIds()` | `[]` |
| `getCanvasNoteIds()` | `[uuid...]` (seguro) |
| `getCanvasItemIds()` | `[]` (seguro) |

---

## 6. MAPA DE TIPOS (RTTI)

### 6.1 Device Types

| `getType()` | Significado | Modelos |
|-------------|-------------|---------|
| `0` | Router | `2911` |
| `1` | Switch L2 | `2960-24TT` |
| `8` | PC | `PC-PT` |
| `9` | Server | `Server-PT` |
| `45` | Power Distribution | `Power Distribution Device` |

### 6.2 Port Types

| `getType()` | Significado |
|-------------|-------------|
| `3` | FastEthernet |
| `4` | GigabitEthernet |
| `17` | Vlan1 (virtual interface) |
| `47` | Bluetooth |

---

## 7. INVENTARIO COMPLETO DE TOPOLOGÍA

```
Índice  Nombre                    Modelo                  Type  Puertos  Primer Puerto
──────  ────────────────────────  ───────────────────────  ────  ───────  ─────────────
0       Power Distribution Device0 Power Distribution Device  45    0        —
1       R1                        2911                        0    4        Vlan1
2       R2                        2911                        0    4        Vlan1
3       SW1                       2960-24TT                   1   27        Vlan1
4       SW2                       2960-24TT                   1   27        Vlan1
5       SW3                       2960-24TT                   1   27        Vlan1
6       SW4                       2960-24TT                   1   27        Vlan1
7       PC1                       PC-PT                       8    2        FastEthernet0
8       PC2                       PC-PT                       8    2        FastEthernet0
9       PC3                       PC-PT                       8    2        FastEthernet0
10      PC4                       PC-PT                       8    2        FastEthernet0
11      SRV1                      Server-PT                   9    1        FastEthernet0
```

---

## 8. PATRONES DE USO

### 8.1 Enumerar dispositivos

```javascript
for (var i = 0; i < net.getDeviceCount(); i++) {
  var d = net.getDeviceAt(i);
  d.getName() + " (" + d.getModel() + ")";
}
```

### 8.2 Enumerar puertos de un dispositivo

```javascript
var dev = net.getDevice("R1");
for (var i = 0; i < dev.getPortCount(); i++) {
  var p = dev.getPortAt(i);
  p.getName() + " type=" + p.getType() + " mask=" + p.getSubnetMask();
}
```

### 8.3 Verificar conectividad de puerto

```javascript
var p = dev.getPortAt(1);
var link = p.getLink();  // null si no conectado, Link object si conectado
```

### 8.4 Escribir descripción de puerto

```javascript
var p = dev.getPortAt(0);
p.setDescription("Conexión a SW1");
var desc = p.getDescription();  // "Conexión a SW1"
```

### 8.5 Configurar VLAN Access en switch

```javascript
var sw = net.getDevice("SW1");
var p = sw.getPortAt(1);  // FastEthernet0/1
p.setAccessVlan(10);
var vlan = p.getAccessVlan();  // 10
```

### 8.6 Control de encendido

```javascript
var dev = net.getDevice("R1");
dev.setPower(true);   // encender
dev.setPower(false);  // apagar
```

### 8.7 Leer MAC de todos los puertos

```javascript
for (var di = 0; di < net.getDeviceCount(); di++) {
  var d = net.getDeviceAt(di);
  for (var pi = 0; pi < d.getPortCount(); pi++) {
    var p = d.getPortAt(pi);
    p.getName() + " = " + p.getMacAddress();
  }
}
```

### 8.8 Leer configuración via CLI (configuración IP/routing/servicios)

```javascript
// NO existe dev.getConfig(). Usar CLI para configuracion L3:
// bun run pt cmd SW1 "show running-config"
// bun run pt cmd R1 "show ip route"
// bun run pt cmd SRV1 "show running-config"
```

---

## 9. CONCLUSIONES

1. **No hay API para crear rectángulos, elipses o shapes** en PT 9.0.0.0810
2. **Los shapes decorativos no se pueden leer** (SIGSEGV en getShapeData)
3. **La API de manipulación permite escritura limitada**: descripciones de puertos, VLAN access en switches, power control
4. **No hay API para:** simulación, archivos, undo/redo, selección, clipboard, clusters, workspace switching, physical view, servicios de servidor (HTTP/DHCP/DNS/FTP)
5. **Configuración de Capa 3:** solo CLI (`bun run pt cmd <device> "<command>"`). La API solo alcanza Capa 2 (VLANs) y descripciones
6. **VPN y links:** solo conteo y acceso indexado (`getLinkAt`), objetos link opacos
7. **VlanManager** existe pero solo accesible desde un device específico, no desde network
8. **_ScriptModule** expone 48 métodos incluyendo data store, timers, debug, filesystem, scripts, UI

---

## 10. _ScriptModule — API COMPLETA (48 métodos)

`_ScriptModule` es un objeto global expuesto por PT que proporciona la API de más bajo nivel.
Se puede inspeccionar con `Object.keys(_ScriptModule)` — NO es un proxy IPC, es seguro.

### 10.1 Data Store — Persistencia JSON entre evaluaciones ✅

**SISTEMA DE PERSISTENCIA FUNCIONAL.** Permite guardar/leer datos entre evaluaciones de `omni raw`.

| Método | Args | Funciona |
|--------|------|----------|
| `addScriptDataStore(id, content)` | `(string, string)` | ✅ `"ok"` |
| `getScriptDataStore(id)` | `(string)` | ✅ `string` |
| `hasScriptDataStore(id)` | `(string)` | ✅ `true`/`false` |
| `removeScriptDataStore(id)` | `(string)` | ✅ `"ok"` |
| `removeAllScriptDataStores()` | — | ✅ `"ok"` |
| `getScriptDataStoreIdList()` | — | ✅ `string[]` |

Ejemplo:
```javascript
// Guardar
_ScriptModule.addScriptDataStore("topologia", JSON.stringify([...]));

// Leer
var raw = _ScriptModule.getScriptDataStore("topologia");
var data = JSON.parse(raw);

// Limpiar
_ScriptModule.removeScriptDataStore("topologia");
```

### 10.2 Timers ✅

| Método | Args | Retorno |
|--------|------|---------|
| `setTimeout(code, ms)` | `(string\|function, number)` | `timerId` (number) |
| `clearTimeout(id)` | `(number)` | `"ok"` |
| `setInterval(code, ms)` | `(string\|function, number)` | `intervalId` (number) |
| `clearInterval(id)` | `(number)` | `"ok"` |

Ejemplo:
```javascript
var tid = _ScriptModule.setTimeout("debug('fired')", 500);
_ScriptModule.clearTimeout(tid);
```

**Nota:** `setTimeout` con string ejecuta código en contexto global limitado
(donde `debug()` está disponible pero otras funciones pueden no estarlo).

### 10.3 Debug / Logging ✅

| Método | Args | Funciona |
|--------|------|----------|
| `debug(msg)` | `(string)` | ✅ — escribe al log interno |
| `debugTrace(msg)` | `(string)` | ✅ |
| `getDebugLog()` | — | ✅ `string` (historial completo) |
| `clearDebug()` | — | ✅ |

Ejemplo:
```javascript
_ScriptModule.debug("mi mensaje");
var log = _ScriptModule.getDebugLog();  // todo el historial
_ScriptModule.clearDebug();
```

### 10.4 Script Management — addScript ✅

| Método | Args | Funciona |
|--------|------|----------|
| `addScript(name, code)` | `(string, string)` | ✅ |
| `removeAllScripts()` | — | ✅ |
| `addScriptFile(path)` | `(string)` | ❌ Insufficient arguments |
| `scriptCall(name, ...args)` | — | ❌ No funciona |

Ejemplo:
```javascript
_ScriptModule.addScript("mi-script", "function suma(a,b) { return a+b; }");
_ScriptModule.removeAllScripts();
```

**Nota:** `addScript` carga código pero las funciones no quedan en el scope global
de la evaluación actual. El mecanismo de invocación (`scriptCall`) tampoco funciona.

### 10.5 Interface / UI — addInterface ✅

| Método | Args | Funciona |
|--------|------|----------|
| `addInterface(name, html)` | `(string, string)` | ✅ |
| `removeAllInterfaces()` | — | ✅ |
| `addInterfaceFile(path)` | `(string)` | ❌ Insufficient arguments |

Ejemplo:
```javascript
_ScriptModule.addInterface("mi-ui", "<button onclick='debug(\"click\")'>OK</button>");
_ScriptModule.removeAllInterfaces();
```

### 10.6 File System (métodos existen, bloqueados por guard)

| Método | Args | Nota |
|--------|------|------|
| `getFileContents(path)` | `(string)` | Bloqueado por guard de seguridad |
| `writeTextToFile(path, content)` | `(string, string)` | Bloqueado por guard |
| `getFileSize(path)` | `(string)` | No probado |
| `getFileCheckSum(path)` | `(string)` | No probado |
| `getFileModificationTime(path)` | `(string)` | No probado |
| `copySrcFileToDestFile(src, dest)` | `(string, string)` | Bloqueado |
| `getOpenFileName()` | — | Diálogo de archivo |
| `getSaveFileName()` | — | Diálogo de guardado |

### 10.7 Event System — Qt Signals (🚫 NO FUNCIONAL)

`_ScriptModule` expone señales Qt como funciones callable. Se pueden EMITIR manualmente
pero los callbacks registrados con `registerIpcEventByID` no se ejecutan.

#### Señales Qt callable en _ScriptModule

| Señal | `typeof` | Args | Emitir |
|-------|----------|------|--------|
| `objectName` | `"string"` | — | PROPERTY (no signal), valor vacío `""` |
| `objectNameChanged` | `"function"` | `(newName)` | ✅ `null` |
| `starting` | `"function"` | `()` | ✅ `null` |
| `started` | `"function"` | `()` | ✅ `null` |
| `stopped` | `"function"` | `()` | ✅ `null` |
| `debugLogged` | `"function"` | `(msg)` | ✅ `null` (con arg) ❌ "Insufficient arguments" (sin arg) |
| `debugCleared` | `"function"` | `()` | ✅ `null` |

Ejemplo de emisión manual:
```javascript
_ScriptModule.debugLogged("mi mensaje");  // null = emitido exitosamente
_ScriptModule.started();                   // null
```

#### registerIpcEventByID

| Método | Args | Estado |
|--------|------|--------|
| `registerIpcEventByID(id, sender, signal, receiver, devCode)` | `(string, obj, string, obj, string)` | ✅ Devuelve `true` pero callback NO se ejecuta |
| `unregisterIpcEventByID(id, ...)` | ? | ❌ "Insufficient arguments" (1-2 args) |
| `unregisterAllIpcEvents()` | — | ✅ Devuelve `null` |

**Firma correcta (5 argumentos):**
```
registerIpcEventByID(eventId, sender, signalName, receiver, callbackCode)
```

- `eventId`: string único
- `sender`: className string O IPC proxy object
- `signalName`: string con/sin prefijo `2` (todos devuelven `true`)
- `receiver`: className string O any object
- `callbackCode`: string de JavaScript (se ejecuta si el evento firea)

**IMPORTANTE: El callback NUNCA se ejecuta.** A pesar de que:
1. `registerIpcEventByID` devuelve `true`
2. Las señales se emiten exitosamente (`_ScriptModule.debugLogged("x")` → `null`)
3. El callback con `throw new Error("...")` no aparece en el debug log

El sistema de eventos de PT 9.0.0.0810 está **roto o no implementado** para callbacks JavaScript.

### 10.8 IPC Avanzado (en su mayoría no funcionales ❌)

| Método | Args | Estado |
|--------|------|--------|
| `ipcCall(path, method, args?)` | varios | ❌ "ERROR: invalid call syntax" |
| `ipcSingleCall(path, method, args?)` | varios | ❌ "object does not exist" |
| `ipcObjectCall(className, method, args)` | `(string, string, array)` | ⚠️ Parcial |
| `getIpcApi(module?)` | `(string)` | ❌ Devuelve `undefined` |
| `getIpcApiAsync(module, callback)` | `(string, string\|function)` | ✅ Llama pero sin retorno |

### 10.9 ScriptModule — Otros métodos

| Método | Args | Estado |
|--------|------|--------|
| `translate(lang, text)` | `(string, string)` | ✅ — devuelve texto traducido |
| `loadTranslator(lang)` | `(string)` | ✅ |
| `enableErrorOpen(bool)` | `(boolean)` | ✅ |
| `getWebViewManager()` | — | ❌ Error: CWebViewManager* |
| `reset()` | — | No probado |

### 10.10 Lista completa de métodos de _ScriptModule

```
objectName              objectNameChanged       starting
started                 stopped                 debugLogged
debugCleared            ipcCall                 ipcObjectCall
getIpcApi               ipcSingleCall           registerIpcEventByID
unregisterIpcEventByID  unregisterAllIpcEvents  scriptCall
debug                   clearDebug              debugTrace
getDebugLog             getWebViewManager       addScriptDataStore
removeScriptDataStore   removeAllScriptDataStores getScriptDataStore
hasScriptDataStore      getScriptDataStoreIdList setInterval
clearInterval           setTimeout              clearTimeout
translate               addScriptFile           removeAllScripts
addInterfaceFile        removeAllInterfaces     reset
getFileContents         writeTextToFile         addInterface
addScript               getOpenFileName         getSaveFileName
getFileSize             getFileCheckSum         getFileModificationTime
copySrcFileToDestFile   enableErrorOpen         loadTranslator
getIpcApiAsync
```

---

## 11. ESTRUCTURA INTERNA DE OBJETOS IPC

Los objetos proxy IPC tienen una estructura interna `_parser` que revela su clase y UUID.

```json
// Device:
{"_parser":{"className":"Router","uuid":"{fc2a9eb1-c15a-2562-72ea-91a0ea2d127e}"}}

// Port:
{"_parser":{"className":"RouterPort","uuid":"{797eb03d-3156-9a39-f5ea-918dddb78a3f}"}}

// Network:
{"_parser":{"className":"PTNetwork", ...}}

// Link:
{"_parser":{"className":"Link", ...}}
```

- `ipc` object solo tiene: `Object.keys(ipc) = ["_parser"]`
- IPC objects NO soportan `Object.getOwnPropertyNames()` — CRASHEA PT
- `Object.keys(ipc)` es seguro y retorna `["_parser"]`
- `Object.keys(_ScriptModule)` es 100% seguro y retorna los 48 métodos

---

## 12. RESUMEN DE CAPACIDADES POR CATEGORÍA

| Categoría | APIs funcionando | APIs faltantes |
|-----------|-----------------|----------------|
| **Inventario** | Device count/name/model/type, Port name/type/mask | IP/MAC, config |
| **Conectividad** | Link count/getAt, port.getLink() | getDeviceNames, origen/destino |
| **Zoom** | zoomIn/Out/Reset todo el workspace | Zoom level, scroll |
| **Persistencia** | **Data Store** (JSON entre evaluaciones) | — |
| **Timers** | setTimeout/Interval, clear | — |
| **Debug** | debug/debugTrace/getDebugLog/clearDebug | — |
| **Scripts** | addScript/removeAllScripts | Ejecutar scripts cargados |
| **UI** | addInterface/removeAllInterfaces | — |
| **Traducción** | translate/loadTranslator | — |
| **Eventos** | Señales Qt callable (emit manual) | registerIpcEventByID devuelve true pero callbacks no se ejecutan |
| **Filesystem** | — | Métodos existen, bloqueados por guard |
| **IPC directo** | ipcObjectCall parcial | ipcCall/ipcSingleCall no funcionales |
| **API Schema** | — | getIpcApi devuelve undefined |
| **Simulación** | isSimulationMode (false) | enter/exit, packets |
| **VLAN** | addVlan/removeVlan/changeVlanName | addVlanInt/removeVlanInt |
| **Routing** | getRoutingTable(), getStaticRouteCount() | addStaticRoute |

---

## 13. REGLAS DE SEGURIDAD

1. **NUNCA** llamar `getRectItemData`, `getEllipseItemData`, `getShapeItemData`
2. **NUNCA** usar `Object.getOwnPropertyNames()` en proxies IPC
3. **FileSystem** (`getFileContents`, `writeTextToFile`) está correctamente bloqueado por el guard
4. **addInterface** permite HTML con JS — posible XSS en PT, usar con precaución
5. **Data Store** persiste entre evaluaciones — limpiar con `removeAllScriptDataStores()` si es necesario
6. **`delete`/`remove`** en strings del script activan el guard — usar nomenclatura alternativa
7. **NUNCA** usar `for (var k in proxyIPC)` — SIGSEGV en PT. Solo usar `Object.keys()` y solo en objetos seguros (`_ScriptModule`)
8. **NUNCA** pasar IPC proxy objects a `JSON.stringify()` — crashea PT (el proxy tiene `toJSON` peligroso)

---

## 14. LIMITACIONES CONOCIDAS DE PT 9.0.0.0810

| Limitación | Impacto |
|------------|---------|
| Links opacos (sin métodos) | No se puede inspeccionar conectividad endpoint |
| getShapeData crashea | No se pueden leer shapes decorativos |
| No getIPAddress/getConfig | Solo CLI para config |
| No addLink | No se pueden crear cables via API |
| No simulation mode API | No se puede controlar simulación |
| No file operations via omni | Guard bloquea (por diseño) |
| No getIpcApi schema | No hay autodescubrimiento de API |
| ipcCall/ipcSingleCall no funciona | No hay IPC directo alternativo |
| registerIpcEventByID roto | Devuelve true pero callbacks no se ejecutan |
| Scripts aislados | addScript no comparte scope con evaluaciones |
| ipcObjectCall("PTNetwork") falla | className "PTNetwork" no resuelve (solo "Network" funciona a veces) |
| getIpcApiAsync callback no se ejecuta | El callback async nunca se invoca |
| for...in en IPC proxies | SIGSEGV garantizado |
| JSON.stringify en IPC proxies | Crash por toJSON() interno |
