# Packet Tracer IPC API - Documentación Completa

> **Fuente de verdad:** `docs/pt-script-result.json` (generado 2026-04-15 con 12 dispositivos seed)
> Este extractor produce JSON y TXT con la API real inspeccionada en PT.

> **Última actualización:** 17 Junio 2026 (Sesión 3 — HTTP/TCP/MD5/Process/Port Discovery)
> **Estado:** ⚠️ **Parcial** — secciones con ⚠️ no verificadas vs dump

---

## 📋 RESUMEN EJECUTIVO (14 Abril 2026)

### ✅ FUNCIONA PERFECTAMENTE

| Categoría | Métodos |
|-----------|---------|
| **Topología** | `addDevice()`, `removeDevice()`, `autoConnectDevices()`, `deleteLink()`, `createLink()` |
| **Inventario** | `net.getDeviceCount()`, `net.getLinkCount()`, `net.getDeviceAt()`, `net.getLinkAt()`, `net.getDevice(name)` |
| **Interfaces (Router/PC/Server)** | `device.getPortCount()`, `device.getPortAt()`, `device.getPort(name)`, `port.getIpAddress()`, `port.getSubnetMask()`, `port.getMacAddress()`, `port.isPortUp()`, `port.isProtocolUp()` |
| **Interfaces (Switch)** | Solo `getMacAddress()`, `isPortUp()`, `isProtocolUp()`. Sin IP ni MTU |
| **Configurar IP** | `port.setIpSubnetMask(ip, mask)` en **PCs y Servidores** ✅ (NO en RouterPort/SwitchPort) |
| **CLI Existencia** | `device.getCommandLine()` → `.getPrompt()` en TODOS los dispositivos |
| **CLI Comandos** | `cli.enterCommand("show version")`, `cli.getOutput()` |
| **CLI Windows** | PC/Server usan `C:\>` (cmd de Windows). Comandos: `ipconfig`, `ping` |
| **Device Mgmt** | `device.setName()`, `device.getName()`, `device.getModel()` ("2911"), `device.getType()` (0=Router), `device.getPower()`, `device.getClassName()`, `device.getObjectUuid()` |
| **Posición** | `device.getXCoordinate()`, `device.getYCoordinate()`, `device.moveToLocation(x, y)` |
| **Procesos** | `device.getProcess("RoutingProcess"|"VlanManager"|"DhcpServerMainProcess"|...)` — SRV1 tiene 7 procesos confirmados |
| **XML Serial** | `device.serializeToXml()` — XML COMPLETO del dispositivo (~19KB Router, ~42KB Switch, ~61KB Server) |
| **Running Config** | `AssessmentModel.getRunningConfig(uuid)`, `AssessmentModel.getStartupConfig(uuid)` (solo en assessment mode) |
| **AssessmentModel** | `AssessmentModel.fromBase64/fromString`, `AssessmentModel.toBase64/toString`, `AssessmentModel.getNetwork` |
| **Eventos** | `ipc.registerEvent(eventName, context, handler)` — 8+ eventos |
| **Globals** | `guid()`, `Base64.encode/decode()`, `$putData/$getData()`, `$createTcpServer()`, `$createHttpServer()`, `scriptEngine`, `MD5` |
| **TCP Server** | `$createTcpServer()` → `listen(port)`, `close()`, `isListening()`, `getServerIP()`, `getServerPort()` |
| **HTTP Server** | `$createHttpServer()` → `start(port, cb)`, `stop()`, `isListening()`, `addWebSocketRouteHandler(path, method, handler)` |
| **Criptografía** | `MD5.hash(str)` — método estático ✅. MD5("test") → "098f6bcd..." |
| **Archivo** | `app.fileSave()`, `app.fileOpen()`, `app.fileSaveAs()`, `app.getVersion()` |
| **scriptEngine** | `scriptEngine.evaluate(code)`, `scriptEngine.evaluateCall(fnName, args)` |

### ⚠️ LIMITACIONES

| Categoría | Problema | Workaround |
|-----------|---------|------------|
| Routers nuevos | No cargan IOS (ROMMON) | Usar routers existentes en .pkt |
| SwitchPorts | NO tienen `getIpAddress()`, `getMtu()`, `isDhcpClientOn()` | Usar RouterPort |
| getDefaultGateway | **TypeError** en todos los tipos de puerto | Leer del XML via serializeToXml |
| getX/getY | **TypeError** en dispositivos | Usar getXCoordinate/getYCoordinate |
| Procesos | Objetos opacos (solo `_parser` con uuid/className) | Usar serializeToXml para datos |
| addModule(slot, model) | "Invalid arguments" | Usar rootModule.addModuleAt(model, slot) |
| Cloud-PT | type=7 retorna null | No usar con addDevice() |
| Laptop-PT | type=12 retorna null | No usar con addDevice() |
| **HTTP addRouteHandler** | **NO funciona** — todas las firmas probadas fallan ("Insufficient arguments") | Usar addWebSocketRouteHandler como alternativa |
| **HTTP/TCP en host** | **NO accesible desde host** — isListening=true pero curl/puerto no responde | Server está en espacio de simulación PT |
| **TCP newConnection** | **read-only** — no se puede asignar callback como propiedad | Es signal de Qt, no propiedad |
| **setIpSubnetMask en Router** | **NO funciona** en RouterPort/SwitchPort | Solo en PC-PT y Server-PT |
| **lw no disponible en raw** | **ReferenceError** cuando se usa `omni raw` | Solo disponible en contexto PT-safe (runtime generado) |
| **scriptEngine.evaluateCall** | Retorna **null** para funciones nativas como Math.max | Usar evaluate con código inline |

## 🔎 DEEP DIVE REAL (47 DISPOSITIVOS)

Se ejecutó un barrido real sobre 47 tipos de dispositivo. Hallazgos clave:

| Familia | Hallazgo |
|---------|----------|
| **Router / MLS** | `Router`, `WirelessRouter` y `ASA` exponen `getProcess()`, `getRootModule()`, CLI y puertos con superficie amplia. |
| **Switches** | `CiscoDevice` y `Router` muestran mezcla de puertos `RouterPort`, `SwitchPort` y `RoutedSwitchPort`. |
| **Hosts** | `Pc` agrupa PC, laptop, tablet, smartphone, end devices y varias variantes IoT con CLI/ports propios. |
| **Servers** | `Server` añade procesos como DHCP, HTTP, DNS, SSH, RADIUS y TACACS. |
| **Industrial / IoT** | `MCU`, `SBC` y `MCUComponent` tienen la mayor superficie de automatización (`analogWrite`, `digitalWrite`, GoosE/SV/IEC61850, slots). |

### Mapa real de `typeId`

| typeId | Modelo | Clase |
|-------:|--------|-------|
| 0 | `2911` | `Router` |
| 1 | `2960-24TT` | `CiscoDevice` |
| 2 | `Cloud-PT` | `Cloud` |
| 3 | `Bridge-PT` | `CiscoDevice` |
| 4 | `Hub-PT` | `Device` |
| 5 | `Repeater-PT` | `Device` |
| 6 | `CoAxialSplitter-PT` | `Device` |
| 7 | `AccessPoint-PT` | `Device` |
| 8 | `PC-PT` | `Pc` |
| 9 | `Server-PT` | `Server` |
| 10 | `Printer-PT` | `Pc` |
| 11 | `Linksys-WRT300N` | `WirelessRouter` |
| 12 | `IPPhone-7960` | `CiscoDevice` |
| 13 | `DSL-Modem-PT` | `Device` |
| 14 | `Cable-Modem-PT` | `Device` |
| 16 | `MLS-3650` | `Router` |
| 18 | `Laptop-PT` | `Pc` |
| 19 | `TabletPC-PT` | `Pc` |
| 20 | `SMARTPHONE-PT` | `Pc` |
| 21 | `WirelessEndDevice-PT` | `Pc` |
| 22 | `WiredEndDevice-PT` | `Pc` |
| 23 | `TV-PT` | `Device` |
| 24 | `Home-VoIP-PT` | `Pc` |
| 25 | `Analog-Phone-PT` | `Device` |
| 27 | `ASA-5505` | `ASA` |
| 29 | `DLC100` | `WirelessRouter` |
| 30 | `HomeRouter-PT-AC` | `WirelessRouter` |
| 32 | `Central-Office-Server` | `WirelessRouter` |
| 35 | `Sniffer` | `Device` |
| 36 | `MCU-PT` | `MCU` |
| 37 | `SBC-PT` | `SBC` |
| 39 | `IoT-*` | `MCUComponent` |
| 41 | `WLC-PT` | `CiscoDevice` |
| 44 | `LAP-PT` | `CiscoDevice` |
| 45 | `Power Distribution Device` | `Device` |
| 46 | `Copper Patch Panel` | `Device` |
| 47 | `Copper Wall Mount` | `Device` |
| 48 | `Meraki-MX65W` | `WirelessRouter` |
| 49 | `Meraki-Server` | `Server` |
| 50 | `NetworkController` | `Pc` |
| 51 | `PLC-PT` | `MCUComponent` |
| 54 | `CyberObserver` | `Pc` |
| 55 | `DataHistorianServer` | `Pc` |

### Procesos encontrados

- `DhcpServerProcess`
- `DhcpServerMainProcess`
- `VlanManager`
- `RoutingProcess`
- `StpMainProcess`
- `AclProcess`
- `Aclv6Process`
- `NtpPTProcess`
- `SshServerProcess`
- `HttpServer`
- `DnsServerProcess`
- `RadiusClientProcess`
- `RadiusServerProcess`
- `TacacsClientProcess`
- `TacacsServerProcess`

### ✅ VlanManager API — Crear/Leer/Eliminar VLANs (17 Junio 2026)

**Acceso:**
```javascript
var net = ipc.network();
var router = net.getDevice("R1");
var vlan = router.getProcess("VlanManager");
```

**Métodos de VlanManager:**

| Método | Descripción | Estado |
|--------|-------------|--------|
| `getVlanCount()` | Número de VLANs | ✅ 5 → 6 tras addVlan |
| `getVlanAt(index)` | VLAN por índice (objeto Vlan) | ✅ |
| `getVlan(vlanId)` | VLAN por número | ✅ |
| `getVlanByName(name)` | VLAN por nombre | ✅ |
| `getMaxVlans()` | Máximo de VLANs soportadas | ✅ |
| `addVlan(vlanId, name)` | **Crear VLAN** | ✅ **Funciona** — retorna true |
| `removeVlan(vlanId)` | Eliminar VLAN | ⚠️ No probado |
| `changeVlanName(vlanId, newName)` | Renombrar VLAN | ⚠️ No probado |
| `getVlanIntCount()` | Interfaces VLAN asignadas | ✅ |
| `getVlanIntAt(index)` | Interfaz VLAN por índice | ✅ |
| `getVlanInt(vlanId)` | Interfaz VLAN por número | ✅ |
| `addVlanInt(vlanId, portName)` | Asignar VLAN a puerto | ⚠️ No probado |
| `removeVlanInt(vlanId, portName)` | Remover VLAN de puerto | ⚠️ No probado |

**Métodos del objeto Vlan:**

| Método | Descripción |
|--------|-------------|
| `getClassName()` | `"Vlan"` |
| `getVlanNumber()` | Número de VLAN |
| `getName()` | Nombre de la VLAN |
| `getMacTable()` | Tabla MAC de la VLAN |
| `isDefault()` | ¿Es VLAN por defecto? |
| `getObjectUuid()` | UUID |

**Ejemplo completo:**
```javascript
var vlan = net.getDevice("R1").getProcess("VlanManager");

// Crear VLAN
vlan.addVlan(100, "VLAN-TEST");  // ✅ true

// Leer VLANs
for (var i = 0; i < vlan.getVlanCount(); i++) {
  var v = vlan.getVlanAt(i);
  v.getVlanNumber() + ": " + v.getName();
  // "1: default", "100: VLAN-TEST", "1002: fddi-default", ...
}

// Buscar por nombre o número
vlan.getVlan(100).getName();      // "VLAN-TEST"
vlan.getVlanByName("default").getVlanNumber();  // 1
```

### Eventos y superficies útiles

- Terminal/CLI: `commandStarted`, `outputWritten`, `commandEnded`, `modeChanged`, `promptChanged`, `moreDisplayed`
- Puerto: `ipChanged`, `powerChanged`, `linkStatusChanged`, `protocolStatusChanged`, `mtuChanged`
- Workspace: `deviceAdded`, `deviceRemoved`, `deviceMoved`, `linkCreated`, `linkDeleted`, `clusterAdded`, `canvasNoteAdded`, `canvasNoteDeleted`
- Proceso: `poolAdded`, `poolRemoved`, `leaseAcquired`, `leaseExpired`, `vlanCreated`, `vlanDeleted`, `stpTopologyChanged`

### Eventos verificados (17 Junio 2026)

| Evento | Funciona | Notas |
|--------|----------|-------|
| `canvasNoteAdded` | ✅ | Se dispara síncronamente al crear nota via addNote |
| `canvasNoteDeleted` | ⚠️ | No se disparó al llamar removeCanvasItem |
| `deviceAdded` | ✅ | Se dispara síncronamente al crear dispositivo via addDevice |
| `deviceRemoved` | ⚠️ | No verificado |
| `linkCreated` | ⚠️ | No verificado |
| `clusterAdded` | ⚠️ | No verificado |

**Patrón de registro de eventos:**
```javascript
lws.registerEvent("canvasNoteAdded", ctxArray, function(src, args) {
  ctxArray.push("RECEIVED");
});
// El handler se ejecuta SINCRONAMENTE durante el mismo script
```

**`registerObjectEvent`** ❌ Falla con "Invalid arguments for IPC call"

### Observaciones importantes

- `registerEvent()` real usa 3 argumentos: `eventName, context, handler`.
- `registerDelegate()` y `registerObjectEvent()` existen, pero en runtime suelen comportarse igual que el registro base o no exponen eventos más ricos.
- `getDeviceType()` no resolvió bien modelos en el barrido; el mapa útil provino de `addDevice()`.
- `Object.getPrototypeOf()` puede disparar errores IPC en ciertos objetos; usar `try/catch`.
- Para PT QTScript, usar ES5 puro: sin `let`, `const`, arrow functions ni template literals.

### Módulos y serialización

- `getRootModule()` aparece en routers modulares, wireless routers, servers, PCs y varias familias IoT.
- `addModule()` / `removeModule()` están presentes en la mayoría de dispositivos con chasis expandible.
- `getSupportedModule()` permite consultar qué módulos acepta un dispositivo.
- `serializeToXml()` existe en la mayoría de familias grandes (`Router`, `WirelessRouter`, `Server`, `ASA`, `Pc`, `MCU`, `SBC`) y sirve para volcar el estado observado del objeto.
- En los módulos `MCU` / `SBC`, la superficie es más rica: `getSlotsCount()`, `getAnalogSlotsCount()`, `getDigitalSlotsCount()`, `getComponentAtSlot()`, `getComponentByName()`, `getSubComponentIndex()` y `setSubComponentIndex()`.
- En la práctica, `getRootModule()` es la mejor entrada para explorar jerarquías de hardware cuando `getProcess()` no expone suficiente detalle.

### Árbol de módulos verificado

- En routers modulares como `2911`, `2811` y `1941`, `getRootModule()` devuelve un árbol con slots y módulos hijo navegables.
- El helper de `pt-boot-and-module.js` usa `getSlotCount()`, `getSlotTypeAt()`, `getModuleCount()` y `getModuleAt()` para recorrer el árbol antes de llamar `addModuleAt()`.
- Los slots para inserción real se detectan de forma recursiva y el flujo espera a que IOS termine de bootear antes de insertar hardware.

---

## 🔧 API DE TOPOLOGÍA (COMPLETA)

### Crear/Eliminar Dispositivos

```javascript
var lws = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();

// Crear
var r1 = lws.addDevice(0, "2911", 100, 200);      // type=0 router
var s1 = lws.addDevice(1, "2960-24TT", 300, 200); // type=1 switch (solo este modelo)
var pc1 = lws.addDevice(4, "PC", 500, 200);       // ⚠️ NO funciona - retorna ""

// Eliminar
lws.removeDevice(r1);
```

### Conectar/Desconectar

```javascript
var net = ipc.network();

// Crear enlace
lws.autoConnectDevices("Router0", "Switch0");

// Eliminar enlace
lws.deleteLink("Router0", "FastEthernet0/0");

// Verificar
net.getLinkCount();     // número de enlaces
net.getLinkAt(i);       // obtener enlace
```

### Enumerar Topología

```javascript
// Dispositivos
for (var i = 0; i < net.getDeviceCount(); i++) {
  var dev = net.getDeviceAt(i);
  dev.getName();        // "Router0"
  dev.getClassName();   // "Router"
  dev.getType();        // 0=router, 1=switch, 8=pc
}

// Enlaces
for (var i = 0; i < net.getLinkCount(); i++) {
  var link = net.getLinkAt(i);
  link.getPort1();      // RouterPort
  link.getPort2();      // SwitchPort
}
```

### Leer Interfaces

```javascript
var router = net.getDevice("Router0");
for (var i = 0; i < router.getPortCount(); i++) {
  var port = router.getPortAt(i);
  port.getName();       // "FastEthernet0/0"
  port.getIpAddress();   // "192.168.1.1"
  port.getSubnetMask(); // "255.255.255.0"
  port.isPortUp();      // false
}
```

---

## 📦 SWITCHPORT API (66 métodos)

### Clase: SwitchPort

```javascript
var switchDev = net.getDevice("Switch0");
var port = switchDev.getPortAt(1); // FastEthernet0/1
```

### Métodos ÚNICOS de SwitchPort

| Método | Tipo | Descripción | Estado |
|--------|------|-------------|--------|
| **VLAN** | | | |
| `getAccessVlan()` | `(): number` | VLAN de acceso | ✅ 1 |
| `setAccessVlan(id)` | `(id: number): void` | Set VLAN acceso | ❌ Invalid |
| `getNativeVlanId()` | `(): number` | VLAN nativa | ✅ 1 |
| `setNativeVlanId(id)` | `(id: number): void` | Set VLAN nativa | ❌ Invalid |
| **Mode** | | | |
| `isAccessPort()` | `(): boolean` | ¿Modo access? | ✅ true |
| `isNonegotiate()` | `(): boolean` | ¿Sin negociación? | ✅ false |
| `setNonegotiateFlag(bool)` | `(flag: boolean): void` | Set negociation | ❌ Invalid |
| `isAdminModeSet()` | `(): boolean` | ¿Admin mode? | ✅ false |
| **Port Security** | | | |
| `getPortSecurity()` | `(): object | null` | Seguridad | ✅ null |
| **Trunk** | | | |
| `addTrunkVlans(vlans)` | `(vlans: Array): void` | Agregar VLANs | ❌ Invalid |
| `removeTrunkVlans(vlans)` | `(vlans: Array): void` | Remover VLANs | ❌ Invalid |
| **VoIP** | | | |
| `getVoipVlanId()` | `(): number` | VLAN VoIP | ✅ 0 |
| `setVoipVlanId(id)` | `(id: number): void` | Set VLAN VoIP | ❌ Invalid |

### Comparación: RouterPort vs SwitchPort

| Categoría | RouterPort | SwitchPort |
|-----------|------------|------------|
| Total métodos | 132 | 66 |
| Routing (OSPF, EIGRP) | ✅ | ❌ |
| NAT | ✅ | ❌ |
| IP Address | ✅ | ❌ |
| VLAN | ❌ | ✅ |
| Port Security | ❌ | ✅ |
| Trunk | ❌ | ✅ |

---

## ⚠️ LIMITACIONES (17 Junio 2026)
| Crear topología | `addDevice()` | ✅ Funciona |
| Conectar | `autoConnectDevices()` | ✅ Funciona |
| Configurar IPs (Router) | API `setIpSubnetMask()` | ❌ Falla en RouterPort |
| Configurar IPs (PC/Server) | API `setIpSubnetMask()` | ✅ **FUNCIONA** |
| Configurar IPs | CLI `ip address` | ⚠️ Buggy |
| Leer config | CLI `show` | ✅ Funciona |
| Leer config completa | `serializeToXml()` | ✅ **XML completo 19-61KB por dispositivo** |
| Leer running-config | `AssessmentModel.getRunningConfig(uuid)` | ⚠️ String vacío (solo en modo assessment) |

---

## 🎉 HALLAZGO CRUCIAL (14 Abril 2026)

### ✅ CLI FUNCIONA - Modo Asíncrono

```javascript
var cli = router.getCommandLine();

// Enviar comandos (asíncrono - retorna inmediatamente)
cli.enterCommand("no");              // Responder dialog inicial
cli.enterCommand("enable");           // Modo enable
cli.enterCommand("configure terminal");
cli.enterCommand("interface FastEthernet0/0");
cli.enterCommand("ip address 192.168.1.1 255.255.255.0");
cli.enterCommand("no shutdown");
cli.enterCommand("end");

// Después de esperar, obtener output acumulado
var output = cli.getOutput();  // Todo el output combinado

// El prompt puede estar vacío pero el output tiene datos
var prompt = cli.getPrompt();   // "R1>" o "R1#" o ""
```

**El output es ACUMULATIVO** - incluye todos los comandos enviados.

### ✅ Verificación de configuración

```javascript
// La API refleja los cambios
var port = router.getPortAt(0);
port.getIpAddress();    // "192.168.1.1"
port.getSubnetMask();  // "255.255.255.0"
```

### ⚠️ Routers recién creados - esperar IOS boot

```javascript
function waitForIOS(cli, timeout) {
  var start = new Date().getTime();
  while (new Date().getTime() - start < timeout) {
    var output = cli.getOutput();
    if (output.indexOf("Router>") >= 0 || 
        output.indexOf("Press RETURN") >= 0 ||
        output.indexOf("Would you like") >= 0) {
      return true;
    }
  }
  return false;
}

// Uso:
var cli = router.getCommandLine();
if (waitForIOS(cli, 15000)) {  // esperar hasta 15s
  cli.enterCommand("no");      // responder dialog
  cli.enterCommand("enable");
  cli.enterCommand("configure terminal");
  // ... más comandos
}
```

### Ejemplo: Función helper para configurar router

```javascript
function configureRouter(router, hostname, interfaces) {
  var cli = router.getCommandLine();
  
  // Esperar boot
  waitForIOS(cli, 15000);
  
  // Responder dialog
  if (cli.getOutput().indexOf("Would you like") >= 0) {
    cli.enterCommand("no");
  }
  
  // Comandos
  cli.enterCommand("enable");
  cli.enterCommand("configure terminal");
  cli.enterCommand("hostname " + hostname);
  
  for (var i = 0; i < interfaces.length; i++) {
    var intf = interfaces[i];
    cli.enterCommand("interface " + intf.name);
    cli.enterCommand("ip address " + intf.ip + " " + intf.mask);
    cli.enterCommand("no shutdown");
    cli.enterCommand("exit");
  }
  
  cli.enterCommand("end");
  return true;
}
```

### ✅ addDevice - MAPA COMPLETO (16 Abril 2026)

```javascript
var lws = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
var deviceName = lws.addDevice(typeId, "Model", x, y);
// Retorna: "Router0", "PC0", etc. o "" si falla
```

**149 combinaciones typeId+modelo verificadas como creatibles:**

| typeId | ClassName | Modelos |
|--------|-----------|---------|
| 0 | Router | 1841, 1941, 2811, 2901, 2911, Router-PT, 2621XM, 2620XM, ISR4321, ISR4331 |
| 1 | CiscoDevice | Switch-PT, 2960-24TT, 2950-24, 2950T-24, Switch-PT-Empty |
| 2 | Cloud | Cloud-PT, Cloud-PT-Empty |
| 3 | CiscoDevice | Bridge-PT |
| 4 | Device | Hub-PT |
| 5 | Device | Repeater-PT |
| 6 | Device | CoAxialSplitter-PT |
| 7 | Device | AccessPoint-PT, AccessPoint-PT-A, AccessPoint-PT-AC, AccessPoint-PT-N |
| 8 | Pc | PC-PT |
| 9 | Server | Server-PT |
| 10 | Pc | Printer-PT |
| 11 | WirelessRouter | Linksys-WRT300N |
| 12 | CiscoDevice | 7960 (IP Phone) |
| 13 | Device | DSL-Modem-PT |
| 14 | Device | Cable-Modem-PT |
| 16 | Router | 3650-24PS, 3560-24PS, IE-2000, IE-3400, IE-9320 |
| 18 | Pc | Laptop-PT |
| 19 | Pc | TabletPC-PT |
| 20 | Pc | SMARTPHONE-PT |
| 21 | Pc | WirelessEndDevice-PT |
| 22 | Pc | WiredEndDevice-PT |
| 23 | Device | TV-PT |
| 24 | Pc | Home-VoIP-PT |
| 25 | Device | Analog-Phone-PT |
| 27 | ASA | 5505, 5506-X, ISA-3000 |
| 29 | WirelessRouter | DLC100 |
| 30 | WirelessRouter | HomeRouter-PT-AC |
| 31 | Device | Cell-Tower |
| 32 | WirelessRouter | Central-Office-Server |
| 35 | Device | Sniffer |
| 36 | MCU | MCU-PT |
| 37 | SBC | SBC-PT |
| 39 | MCUComponent | 78 dispositivos IoT (Air Conditioner, LED, Motion Sensor, etc.) |
| 41 | CiscoDevice | WLC-2504, WLC-3504, WLC-PT |
| 44 | CiscoDevice | 3702i, LAP-PT |
| 45 | Device | Power Distribution Device |
| 46 | Device | Copper Patch Panel, Fiber Patch Panel |
| 47 | Device | Copper Wall Mount, Fiber Wall Mount |
| 48 | WirelessRouter | Meraki-MX65W |
| 49 | Server | Meraki-Server |
| 50 | Pc | NetworkController |
| 51 | MCUComponent | PLC-PT |
| 54 | Pc | CyberObserver |
| 55 | Pc | DataHistorianServer |

**Key findings (16 Abril 2026):**
- `getDeviceType("PC-PT")` retorna 0 (NO funciona como resolver de typeId)
- `getAvailableDeviceCount()` retorna 170 (catalogo interno existe)
- `addDevice(8, "PC-PT", x, y)` ✅ SÍ funciona - el nombre exacto es "PC-PT"
- `addDevice(9, "Server-PT", x, y)` ✅ SÍ funciona - el nombre exacto es "Server-PT"
- `className="CiscoDevice"` puede ser Switch, Bridge, IP Phone, WLC o LAP segun modelo
- `className="Device"` es generico para Hub, Repeater, CoaxialSplitter, DSL, Cable, TV, etc.
- 78 dispositivos IoT con className=MUCComponent (typeId=39)
- ASA tiene className propia (ASA) no Router ni Device
- **149 combinaciones typeId+modelo** confirmadas creatibles

**Parametros addDevice(typeId, model, x, y):**
- `typeId`: entero 0-100 segun DEVICE_TYPE_MAP
- `model`: nombre exacto del catalogo (ej: "PC-PT", "Server-PT", "2960-24TT")
- `x`, `y`: coordenadas en canvas
- Retorna: nombre creado (ej "Router0") o "" si falla

### ✅ autoConnectDevices - CREA ENLACES (14 Abril 2026) 🎉

```javascript
var lws = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
var net = ipc.network();

// ✅ FUNCIONA - Solo con nombres de dispositivo
lws.autoConnectDevices("Router0", "Switch0");
// Retorna: undefined
// Link creado: net.getLinkCount() aumenta de 0 a 1
```

**Parámetros:**
- Solo 2 argumentos: nombre dispositivo 1, nombre dispositivo 2
- Automaticamente selecciona puertos disponibles
- Automaticamente selecciona tipo de cable

**Clase del enlace:** `Cable`
```javascript
var link = net.getLinkAt(0);
link.getClassName();     // "Cable"
link.getObjectUuid();    // "{uuid}"
```

**❌ NO FUNCIONA:**
```javascript
// 4+ argumentos falla
lws.autoConnectDevices("Router0", "FastEthernet0/0", "Switch0", "FastEthernet0/1")
// ERROR: Invalid arguments for IPC call "autoConnectDevices"
```

### ⚠️ createLink - EXISTE pero retorna null

```javascript
// createLink existe pero no funciona en PT 9.0.0.0810
lws.createLink("Router0", "FastEthernet0/0", "Switch0", "FastEthernet0/1", -1);
// Retorna: null ❌
```

**Razón:** Probablemente requiere puertos específicos o power state

### 🔍 MÉTODO NUEVO DESCUBIERTO: autoConnectDevices
```javascript
lws.autoConnectDevices(...)  // POSIBLE forma correcta de crear enlaces
```

### HALLAZGO IMPORTANTE: Puertos tienen power state
```
isPowerOn: false    // Puerto apagado - ¿necesita estar prendido para crear link?
isPortUp: false     // Puerto no está up
```

### ✅ ACTUALIZACIÓN 17 Junio 2026: setIpSubnetMask FUNCIONA en PCs y Servers
```javascript
// ✅ FUNCIONA en PC-PT y Server-PT
var pc = net.getDevice("PC1");
var port = pc.getPortAt(0);
port.setIpSubnetMask("192.168.1.100", "255.255.255.0");
port.getIpAddress();   // "192.168.1.100" ✅
port.getSubnetMask();  // "255.255.255.0" ✅

// ✅ FUNCIONA en Server-PT
var srv = net.getDevice("SRV1");
var p = srv.getPortAt(0);
p.setIpSubnetMask("192.168.50.1", "255.255.255.0");
p.getIpAddress();   // "192.168.50.1" ✅
// Restaurar:
p.setIpSubnetMask("192.168.1.200", "255.255.255.0");

// ❌ NO funciona en RouterPort (SwitchPort ni siquiera tiene getIpAddress)
```

### ❌ Métodos SET que SIGUEN fallando
```
setBandwidth(kbps) => ERROR: Invalid arguments for IPC call
setPower(bool) => ERROR: Invalid arguments for IPC call
setAccessVlan(id) => Invalid arguments
setNativeVlanId(id) => Invalid arguments
```

### ✅ Métodos GET confirmados (por tipo de puerto)
```
RouterPort:
  getIpAddress()    → "192.168.10.1" ✅
  getSubnetMask()   → "255.255.255.0" ✅
  getMacAddress()   → "00D0.BCE3.7901" ✅
  isPortUp()        → true ✅
  isProtocolUp()    → true ✅
  getMtu()          → 1500 ✅
  isDhcpClientOn()  → false ✅

SwitchPort:
  getIpAddress()    → TypeError ❌
  getMacAddress()   → "0060.5C27.E101" ✅
  isPortUp()        → true ✅
  isProtocolUp()    → true ✅
  getMtu()          → TypeError ❌
  isDhcpClientOn()  → TypeError ❌

PC/Server Port:
  getIpAddress()    → "192.168.10.100" ✅
  getSubnetMask()   → "255.255.255.0" ✅
  getMacAddress()   → "0060.3E1B.9759" ✅
  isPortUp()        → true ✅
  isProtocolUp()    → true ✅
  getMtu()          → 1500 ✅
  isDhcpClientOn()  → false ✅
```

### ✅ FUNCIONA - Automatización CLI
```javascript
var cli = device.getCommandLine();
cli.enterCommand("no");           // Responder dialog inicial
cli.enterCommand("enable");        // Entrar a enable
cli.enterCommand("show version");  // Ejecutar comando
var output = cli.getOutput();     // Obtener output
```

### ✅ FUNCIONA - Configuración Directa de Puertos
```javascript
var port = router.getPortAt(0);
port.getIpAddress();    // 0.0.0.0
port.getSubnetMask();    // 0.0.0.0
port.getMacAddress();   // 000A.F322.C8D6
```

---

## LOGICALWORKSPACE API - Accesible vía Workspace

### Acceso
```javascript
var ws = ipc.appWindow().getActiveWorkspace();
var lws = ws.getLogicalWorkspace();
```

### Métodos de Dispositivo

| Método | Descripción | Estado |
|--------|-------------|--------|
| `addDevice(typeId, model, x, y)` | Crear dispositivo | ✅ FUNCIONA |
| `removeDevice(name)` | Remover por nombre | ✅ FUNCIONA (14 Abr 2026) |
| `deleteDevice(name)` | Eliminar por nombre | ❌ **NO EXISTE** (TypeError) |
| `removeObject(name)` | Remover objeto | ⚠️ No probado |
| `deleteObject(name)` | Eliminar objeto | ⚠️ No probado |

### ✅ deleteLink - ELIMINA ENLACES (14 Abril 2026)

```javascript
// ✅ FUNCIONA - Solo con deviceName y portName
var result = lws.deleteLink("Router0", "FastEthernet0/0");
// Retorna: true
// Link eliminado: net.getLinkCount() disminuye
```

**Parámetros:**
- 2 argumentos: nombre del dispositivo, nombre del puerto
- No importa cuál dispositivo del enlace se proporcione
- Usa cualquier puerto del enlace para eliminarlo

**❌ NO FUNCIONA:**
```javascript
lws.deleteLink(uuid);                              // UUID
lws.deleteLink(0);                                // índice
lws.deleteLink(linkObject);                       // objeto Cable
lws.deleteLink(d1, p1, d2, p2);                 // 4 argumentos
```

### 🎯 API DE ENLACES COMPLETA

| Método | Descripción | Estado |
|--------|-------------|--------|
| `autoConnectDevices(d1, d2)` | **CREAR ENLACE** | ✅ Funciona |
| `deleteLink(deviceName, portName)` | **ELIMINAR ENLACE** | ✅ Funciona |
| `createLink(...)` | Crear enlace manual | ❌ No funciona |
| `net.getLinkAt(index)` | Obtener enlace | ✅ Retorna Cable |
| `net.getLinkCount()` | Contar enlaces | ✅ Funciona |

### 📦 Clase Cable - Métodos

```javascript
var link = net.getLinkAt(0);

link.getClassName();      // "Cable"
link.getObjectUuid();     // "{uuid}"
link.getConnectionType(); // 8100 (tipo de cable)
link.getPort1();          // RouterPort
link.getPort2();          // SwitchPort
```

### EJEMPLO COMPLETO - Lab completo
```javascript
var lws = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
var net = ipc.network();

// Crear topología
lws.addDevice(0, "Router-PT", 100, 200);   // Router0
lws.addDevice(1, "Switch-PT", 300, 200);   // Switch0
lws.addDevice(8, "PC-PT", 500, 200);        // PC0
lws.addDevice(8, "PC-PT", 700, 200);        // PC1

// Conectar
lws.autoConnectDevices("Router0", "Switch0");
lws.autoConnectDevices("Switch0", "PC0");
lws.autoConnectDevices("Switch0", "PC1");

net.getDeviceCount();  // 4
net.getLinkCount();    // 3

// Eliminar enlace específico
lws.deleteLink("Router0", "FastEthernet0/0");

net.getLinkCount();    // 2

// Limpiar
lws.removeDevice("Router0");
lws.removeDevice("Switch0");
lws.removeDevice("PC0");
lws.removeDevice("PC1");
```

### LogicalWorkspace - 66 Métodos (17 Junio 2026)

```
addCluster, addDevice, addNote, addRemoteNetwork, addTextPopup,
autoConnectDevices, centerOn, centerOnComponentByName, changeNoteText,
clearLayer, createLink, deleteLink, drawCircle, drawLine,
getCanvasEllipseIds, getCanvasItemIds, getCanvasItemRealX,
getCanvasItemRealY, getCanvasItemX, getCanvasItemY, getCanvasLineIds,
getCanvasNoteIds, getCanvasNoteText, getCanvasPolygonIds, getCanvasRectIds,
getClassName, getCluster, getClusterForItem, getClusterFromItem,
getClusterIdForItem, getClusterItemId, getComponentChildCountFor,
getComponentChildForAt, getComponentChildForByName, getComponentItem,
getComponentItemsCount, getCurrentCluster, getCurrentZoom,
getEllipseItemData, getIncNoteZOrder, getLayerInbetweenComponents,
getLineItemData, getMUItemCount, getObjectUuid, getPolygonItemData,
getRectItemData, getRootCluster, getState, getUnusedLayer,
getWorkspaceImage, isLayerUsed, moveCanvasItemBy, moveItemToCluster,
moveRemoteNetwork, registerDelegate, registerEvent, registerObjectEvent,
removeCanvasItem, removeCluster, removeDevice, removeRemoteNetwork,
removeTextPopup, setCanvasItemRealPos, setCanvasItemX, setCanvasItemY,
setDeviceCustomImage, showClusterContents, unCluster, unregisterDelegate,
unregisterEvent, unregisterObjectEvent
```

### HALLAZGO IMPORTANTE (14 Abril 2026)
**Error observado:** `TypeError: Property 'deleteDevice' of object [object Object] is not a function`

**Conclusión:** En PT 9.0.0.0810, `deleteDevice` NO existe. Solo usar `removeDevice()`.

---

## Nombres de Puertos Descubiertos

### Routers
```
FastEthernet0/0, FastEthernet1/0, Serial2/0, Serial3/0, FastEthernet4/0, FastEthernet5/0
```

### Switches (CiscoDevice)
```
Vlan1, FastEthernet0/1, FastEthernet1/1, FastEthernet2/1, FastEthernet3/1, FastEthernet4/1, FastEthernet5/1
```

### PCs
```
FastEthernet0, Bluetooth
```

---

## CONSTANTES DE TIPOS

### Cable Types (PT_CABLE_TYPE_CONSTANTS)
```javascript
PT_CABLE_TYPE_CONSTANTS = {
  auto: -1,
  straight: 0,    // Cable recto
  cross: 1,        // Cable cruzado
  fiber: 2,        // Fibra
  serial: 3,       // Serial
  console: 4,      // Console
  phone: 5,        // Teléfono
  cable: 6,       // Cable genérico
  roll: 7,        // Rollo
  wireless: 8,    // Inalámbrico
  coaxial: 9,     // Coaxial
  custom: 10,     // Personalizado
  octal: 11,      // Octal
  cellular: 12,   // Celular
  usb: 13         // USB
}
```

### Device Types (typeId -> className REALES)
```javascript
// VERIFICADO 16 Abril 2026 - 149 combinaciones confirmadas con addDevice()
DEVICE_TYPE_ID_MAP = {
  0:  "Router",         // 10 modelos: 1841,1941,2811,2901,2911,Router-PT,2621XM,2620XM,ISR4321,ISR4331
  1:  "CiscoDevice",     // 5 modelos: Switch-PT, 2960-24TT, 2950-24, 2950T-24, Switch-PT-Empty
  2:  "Cloud",           // 2 modelos: Cloud-PT, Cloud-PT-Empty
  3:  "CiscoDevice",     // Bridge-PT
  4:  "Device",          // Hub-PT
  5:  "Device",          // Repeater-PT
  6:  "Device",          // CoAxialSplitter-PT
  7:  "Device",          // 4 APs: AccessPoint-PT, -A, -AC, -N
  8:  "Pc",              // PC-PT
  9:  "Server",          // Server-PT
  10: "Pc",              // Printer-PT
  11: "WirelessRouter",  // Linksys-WRT300N
  12: "CiscoDevice",      // 7960 (IP Phone)
  13: "Device",          // DSL-Modem-PT
  14: "Device",          // Cable-Modem-PT
  16: "Router",          // 5 modelos multilayer: 3650-24PS, 3560-24PS, IE-2000, IE-3400, IE-9320
  18: "Pc",              // Laptop-PT
  19: "Pc",              // TabletPC-PT
  20: "Pc",              // SMARTPHONE-PT
  21: "Pc",              // WirelessEndDevice-PT
  22: "Pc",              // WiredEndDevice-PT
  23: "Device",          // TV-PT
  24: "Pc",              // Home-VoIP-PT
  25: "Device",          // Analog-Phone-PT
  27: "ASA",             // 3 modelos: 5505, 5506-X, ISA-3000
  29: "WirelessRouter",  // DLC100
  30: "WirelessRouter",  // HomeRouter-PT-AC
  31: "Device",          // Cell-Tower
  32: "WirelessRouter",  // Central-Office-Server
  35: "Device",          // Sniffer
  36: "MCU",             // MCU-PT
  37: "SBC",             // SBC-PT
  39: "MCUComponent",    // 78 dispositivos IoT (Light, Sensor, Motor, etc.)
  41: "CiscoDevice",      // WLC-2504, WLC-3504, WLC-PT
  44: "CiscoDevice",      // 3702i, LAP-PT (Light Weight Access Point)
  45: "Device",          // Power Distribution Device
  46: "Device",          // Copper/Fiber Patch Panel
  47: "Device",          // Copper/Fiber Wall Mount
  48: "WirelessRouter",  // Meraki-MX65W
  49: "Server",          // Meraki-Server
  50: "Pc",              // NetworkController
  51: "MCUComponent",    // PLC-PT
  54: "Pc",              // CyberObserver
  55: "Pc"               // DataHistorianServer
}
```

**NOTA:** Las constantes old-style (PT_DEVICE_TYPE_CONSTANTS) de docs anteriores son IMPRECISAS. El typeId NO corresponde directamente al className. Siempre verificar con `device.getClassName()`.

---

## PRÓXIMOS PASOS DE INVESTIGACIÓN

1. **createLink**: Investigar por qué retorna null
   - ¿Nombres de puerto case-sensitive?
   - ¿Puerto específico requerido para ciertos cables?
   - ¿Dispositivos deben tener módulos específicos?

2. **addDevice**: Probar más modelos
   - Switches: "Switch-PT", "2960-24TT"
   - PCs: Probar otros nombres
   - Servers

3. **removeDevice/deleteDevice**: Probar después de crear dispositivos

4. **deleteLink**: Probar después de crear enlace manualmente

---

## CLI API - ConsoleLine

### Clase: `ConsoleLine` - 34 Métodos

### Acceso
```javascript
var cli = device.getCommandLine();
```

### Comandos

| Método | Descripción | Estado |
|--------|-------------|--------|
| `enterCommand(cmd)` | Enviar comando IOS | ✅ FUNCIONA |
| `getPrompt()` | Prompt actual | ✅ FUNCIONA |
| `getOutput()` | Output del último comando | ✅ FUNCIONA |
| `getMode()` | Modo CLI actual | ⚠️ No funciona |
| `println(line)` | Imprimir línea | ✅ FUNCIONA |
| `enterChar(char)` | Enviar caracter | ⚠️ No probado |
| `flush()` | Flush output | ⚠️ No probado |

### Serial Settings

| Método | Descripción |
|--------|-------------|
| `getSpeed()` | Velocidad Baud |
| `getDataBits()` | Data bits |
| `getStopBits()` | Stop bits |
| `getParity()` | Paridad |
| `getFlowControl()` | Control de flujo |
| `setSettings(speed, db, sb, par, fc)` | Configurar |

### Historial

| Método | Descripción |
|--------|-------------|
| `getHistorySize()` | Tamaño historial |
| `getCurrentHistory()` | Historial actual |
| `getConfigHistory()` | Historial config |
| `getUserHistory()` | Historial usuario |

### Ejemplo Completo
```javascript
var cli = router.getCommandLine();

// 1. Responder dialog inicial
cli.enterCommand("no");

// 2. Entrar a enable
cli.enterCommand("enable");
cli.enterCommand("terminal length 0");  // Evitar --More--

// 3. Mostrar info
cli.enterCommand("show version");
var version = cli.getOutput();

cli.enterCommand("show ip interface brief");
var interfaces = cli.getOutput();

// 4. Configurar
cli.enterCommand("configure terminal");
cli.enterCommand("interface FastEthernet0/0");
cli.enterCommand("ip address 192.168.1.1 255.255.255.0");
cli.enterCommand("no shutdown");
cli.enterCommand("end");
```

---

## ROUTERPORT API - 132 Métodos Completos

### Clase: `RouterPort`

### Acceso
```javascript
var router = net.getDeviceAt(0);
var port = router.getPortAt(0);        // Por índice
var port = router.getPort("FastEthernet0/0");  // Por nombre
```

---

### IP METHODS (37) ✅ PRINCIPALES FUNCIONAN

| Método | Descripción | Test |
|--------|-------------|------|
| `getIpAddress()` | IP actual | ✅ 0.0.0.0 |
| `getSubnetMask()` | Máscara actual | ✅ 0.0.0.0 |
| `getMacAddress()` | MAC address | ✅ 000A.F322.C8D6 |
| `getIpMtu()` | MTU IP | - |
| `setIpSubnetMask(ip, mask)` | **Configurar IP** | ❌ Falla en RouterPort (✅ funciona en PC/Server) |
| `setDhcpClientFlag(bool)` | Habilitar DHCP | - |
| `isDhcpClientOn()` | ¿DHCP activo? | - |
| `setDnsServerIp(ip)` | DNS server | - |

### IPv6 (17)

| Método | Descripción |
|--------|-------------|
| `getIpv6Address()` | Dirección IPv6 |
| `getIpv6Addresses()` | Todas las IPv6 |
| `getIpv6LinkLocal()` | Link local |
| `getUnicastIpv6Address()` | Unicast IPv6 |
| `getUnicastIpv6Prefix()` | Prefix |
| `getIpv6Mtu()` | MTU IPv6 |
| `hasIpv6Address()` | ¿Tiene IPv6? |
| `isIpv6Enabled()` | ¿IPv6 habilitado? |
| `isIpv6AddressAutoConfig()` | Autoconfig |
| `isInIpv6Multicast()` | ¿Multicast? |
| `isInboundIpv6FirewallOn()` | Firewall IPv6 |
| `setIpv6Enabled(bool)` | Habilitar IPv6 |
| `setIpv6AddressAutoConfig(bool)` | Autoconfig |
| `setIpv6LinkLocal(ip)` | Set link local |
| `setIpv6Mtu(mtu)` | Set MTU |
| `addIpv6Address(ip, prefix)` | Añadir IPv6 |
| `removeIpv6Address(ip)` | Remover IPv6 |
| `removeAllIpv6Addresses()` | Remover todas |
| `setv6ServerIp(ip)` | Server IPv6 |
| `setv6DefaultGateway(ip)` | Gateway IPv6 |
| `isSetToDhcpv6()` | ¿DHCPv6? |

---

### ROUTING METHODS (21)

| Método | Descripción |
|--------|-------------|
| **OSPF** | |
| `getOspfCost()` | Costo OSPF |
| `setOspfCost(cost)` | Set costo |
| `getOspfAuthKey()` | Auth key |
| `setOspfAuthKey(key)` | Set auth key |
| `getOspfAuthType()` | Tipo auth |
| `getOspfPriority()` | Prioridad |
| `setOspfPriority(prio)` | Set prioridad |
| `getOspfDeadInterval()` | Dead interval |
| `setOspfDeadInterval(ms)` | Set interval |
| `getOspfHelloInterval()` | Hello interval |
| `setOspfHelloInterval(ms)` | Set interval |
| `addOspfMd5Key(keyId, key)` | Añadir MD5 |
| `removeOspfMd5Key(keyId)` | Remover MD5 |
| **RIP** | |
| `isRipPassive()` | ¿RIP pasivo? |
| `setRipPassive(bool)` | Set pasivo |
| `isRipSplitHorizon()` | ¿Split horizon? |
| `setRipSplitHorizon(bool)` | Set split horizon |
| **EIGRP** | |
| `addEntryEigrpPassive(as, network, wildcard)` | Añadir EIGRP pasivo |
| `removeEntryEigrpPassive(as, network, wildcard)` | Remover EIGRP |
| **NAT** | |
| `getNatMode()` | Modo NAT |
| `setNatMode(mode)` | Set modo NAT |

---

### ACL METHODS (4)

| Método | Descripción |
|--------|-------------|
| `getAclInID()` | ACL inbound |
| `setAclInID(aclId)` | Set ACL inbound |
| `getAclOutID()` | ACL outbound |
| `setAclOutID(aclId)` | Set ACL outbound |

---

### BANDWIDTH / DUPLEX (14)

| Método | Descripción |
|--------|-------------|
| `getBandwidth()` | **Bandwidth (kbps)** |
| `setBandwidth(kbps)` | Set bandwidth |
| `resetBandwidth()` | Reset |
| `getDelay()` | Delay (tens of usec) |
| `setDelay(delay)` | Set delay |
| `resetDelay()` | Reset |
| `getBandwidthInfo()` | Info completa |
| `setBandwidthInfo(bw, delay)` | Set ambos |
| `isBandwidthAutoNegotiate()` | ¿Auto? |
| `setBandwidthAutoNegotiate(bool)` | Set auto |
| `isDuplexAutoNegotiate()` | ¿Duplex auto? |
| `setDuplexAutoNegotiate(bool)` | Set duplex |
| `isFullDuplex()` | ¿Full duplex? |
| `setFullDuplex(bool)` | Set duplex |

---

### PORT INFO (30)

| Método | Descripción |
|--------|-------------|
| **Identificación** | |
| `getName()` | **Nombre del puerto** ✅ |
| `getPortNameNumber()` | Número |
| `getInterfaceName()` | Nombre interfaz |
| `getType()` | Tipo |
| `getClassName()` | Clase |
| **Dirección** | |
| `getBia()` | **BIA (MAC)** ✅ |
| `getHardwareQueue()` | Cola HW |
| `getQosQueue()` | Cola QoS |
| **Estado** | |
| `isPortUp()` | ¿Puerto up? |
| `isProtocolUp()` | ¿Protocolo up? |
| `isPowerOn()` | ¿Encendido? |
| `isEthernetPort()` | ¿Ethernet? |
| `isWirelessPort()` | ¿Wireless? |
| `isAutoCross()` | ¿Auto cross? |
| `isStraightPins()` | ¿Pins directos? |
| `getLightStatus()` | Estado luces |
| **Otros** | |
| `getMtu()` | MTU |
| `setMtu(mtu)` | Set MTU |
| `getClockRate()` | Clock rate |
| `setClockRate(rate)` | Set clock |
| `getChannel()` | Canal |
| `setChannel(ch)` | Set canal |
| `getDescription()` | Descripción |
| `setDescription(desc)` | Set descripción |
| `getEncapProcess()` | Encapsulación |
| `getZoneMemberName()` | Zona |
| `setZoneMemberName(name)` | Set zona |

---

### LINK METHODS (5)

| Método | Descripción | Test |
|--------|-------------|------|
| `getLink()` | Obtener enlace | ❌ null (no hay) |
| `deleteLink()` | Eliminar enlace | ❌ No funciona sin link |

---

### CONFIG METHODS (6)

| Método | Descripción |
|--------|-------------|
| `isCdpEnable()` | ¿CDP habilitado? |
| `setCdpEnable(bool)` | Habilitar CDP |
| `isProxyArpEnabled()` | ¿Proxy ARP? |
| `setProxyArpEnabled(bool)` | Set proxy ARP |
| `isIkeEnabled()` | ¿IKE? |
| `setIkeEnabled(bool)` | Set IKE |

---

### GATEWAY METHODS (2)

| Método | Descripción |
|--------|-------------|
| `setDefaultGateway(ip)` | Gateway default |
| `setv6DefaultGateway(ip)` | Gateway IPv6 |

---

### POWER METHODS (2)

| Método | Descripción |
|--------|-------------|
| `getPower()` | ¿Encendido? |
| `setPower(bool)` | Encender/apagar |

---

### OTROS (12)

| Método | Descripción |
|--------|-------------|
| `getOwnerDevice()` | Device dueño |
| `getIntOfAs()` | AS number |
| `setIntForAs(as)` | Set AS |
| `getKeepAliveProcess()` | Keepalive |
| `getHigherProcessCount()` | Procesos |
| `getTerminalTypeShortString()` | Tipo terminal |
| `isInboundFirewallOn()` | Firewall inbound |
| `setInboundFirewallService(bool)` | Firewall |
| `setIntForAs(as)` | Set AS |

---

## DEVICE API - 102 Métodos

### Gestión Básica

```javascript
device.getName()              // Nombre
device.setName("R1")        // Renombrar ✅ FUNCIONA
device.getModel()            // Modelo
device.getType()             // Tipo numérico
device.getObjectUuid()       // UUID
```

### Posición

```javascript
device.getXCoordinate()      // X
device.getYCoordinate()      // Y
device.moveToLocation(x, y)  // Mover ✅ FUNCIONA
```

### CLI

```javascript
device.getCommandLine()      // ConsoleLine
```

### Puerto

```javascript
device.getPortCount()        // Cantidad
device.getPortAt(index)      // Puerto por índice
device.getPort(name)         // Puerto por nombre
```

---

## NETWORK API - 14 Métodos

| Método | Descripción |
|--------|-------------|
| `getDeviceCount()` | Cantidad dispositivos |
| `getDeviceAt(index)` | Dispositivo por índice |
| `getDevice(name)` | Por nombre |
| `getLinkCount()` | Cantidad enlaces |
| `getLinkAt(index)` | Enlace por índice |

**NO HAY método para crear enlaces.**

---

## APPWINDOW API - 112 Métodos

### Archivo

| Método | Descripción |
|--------|-------------|
| `fileNew()` | Nuevo archivo |
| `fileOpen()` | Abrir |
| `fileSave()` | Guardar |
| `fileSaveAs()` | Guardar como |
| `fileSaveAsPkz()` | Guardar como PKZ |

### Ventana

| Método | Descripción |
|--------|-------------|
| `getWidth()` | Ancho |
| `getHeight()` | Alto |
| `getX()` / `getY()` | Posición |
| `setWindowGeometry(x, y, w, h)` | Geometría |
| `showMaximized()` | Maximizar |
| `showMinimized()` | Minimizar |
| `isMaximized()` | ¿Maximizado? |

### Utilidades

| Método | Descripción |
|--------|-------------|
| `getVersion()` | Versión PT |
| `showMessageBox(msg)` | Message box |
| `getClipboardText()` | Clipboard |
| `setClipboardText(t)` | Set clipboard |
| `openURL(url)` | Abrir URL |

---

## OPTIONS API - 77 Métodos

### UI

| Método | Descripción |
|--------|-------------|
| `setAnimation(bool)` | Animación |
| `setSound(bool)` | Sonido |
| `setHideDevLabel(bool)` | Ocultar labels |
| `setDeviceModelShown(bool)` | Mostrar modelo |
| `setMainToolbarShown(bool)` | Toolbar |
| `setCliTabHidden(bool)` | Ocultar tab CLI |

---

## SIMULATION API - 23 Métodos

| Método | Descripción |
|--------|-------------|
| `backward()` | Paso atrás |
| `forward()` | Paso adelante |
| `resetSimulation()` | Reset |
| `setSimulationMode(bool)` | Modo sim |
| `createFrameInstance()` | Crear frame |
| `getCurrentSimTime()` | Tiempo actual |

---

## DISPOSITIVOS CATÁLOGO (170)

### Routers (24)

| Modelo | Módulos |
|--------|---------|
| 1841, 1941 | 2 |
| 2620XM, 2621XM | 2 |
| 2811 | 3 |
| 2901, 2911 | 2 |
| ISR4321, ISR4331 | 2 |
| Router-PT | 1 |

### Switches (7)

| Modelo | Módulos |
|--------|---------|
| 2950-24, 2960-24TT | 0 |
| 3650-24PS | 3 |
| Switch-PT | 2 |

### End Devices (17)

PC-PT, Server-PT, Laptop-PT, TabletPC-PT, Phone, TV, etc.

---

## MÓDULOS CATÁLOGO (199)

| Tipo | Ejemplos |
|------|---------|
| NM | NM-1E, NM-1FE-TX |
| HWIC | HWIC-1GE-SFP, HWIC-2T |
| WIC | WIC-1T, WIC-2T |
| Cellular | P-5GS6-GL, P-LTEA18-GL |
| SFP | GLC-T, GLC-SX-MM |

---

## SCRIPTS DISPONIBLES

| Script | Descripción |
|--------|-------------|
| `pt-mega-explorer.js` | Captura TODA la data |
| `pt-cli-full-automation.js` | Automatiza comandos IOS |
| `pt-router-port-explorer.js` | Explora RouterPort |
| `pt-link-creator.js` | Busca crear enlaces |
| `pt-full-catalog.js` | Catálogos completos |
| `pt-device-boot-test.js` | **addDevice() + IOS boot** - lab nuevo, modelos 2911/2811/1941 |
| `pt-add-module-smoke.js` | **addModule() smoke test** - sobre router IOS estable |
| `pt-boot-and-module.js` | **Boot + addModule()** - espera IOS real (60s), luego prueba addModule |

---

## PRÓXIMOS PASOS

1. ✅ CLI `enterCommand()` funciona (modo asíncrono)
2. ✅ Crear enlaces con `autoConnectDevices()`
3. ✅ Crear dispositivos con `addDevice()`
4. ✅ Eliminar enlaces con `deleteLink()`
5. ✅ Eliminar dispositivos con `removeDevice()`
6. ❌ Configuración directa de puertos (setIpSubnetMask) - falla
7. ❌ `setPower()` - falla
8. ✅ Exploración de SwitchPort (66 métodos - todos SET fallan)
9. ✅ Exploración de Server (103 métodos)
10. ✅ Exploración de PC (102 métodos)
11. ✅ fileSave/fileOpen/fileSaveAs existen
12. ❌ Cloud-PT (type=7) retorna null
13. ❌ Laptop-PT (type=12) retorna null

---

## WORKFLOW COMPLETO - Crear Lab Automatizado

```javascript
(function() {
  var net = ipc.network();
  var lws = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
  
  // 1. Crear dispositivos
  var r1Name = lws.addDevice(0, "Router-PT", 100, 200);
  var s1Name = lws.addDevice(1, "Switch-PT", 300, 200);
  var pc1Name = lws.addDevice(8, "PC-PT", 500, 200);
  
  // 2. Conectar
  lws.autoConnectDevices(r1Name, s1Name);
  lws.autoConnectDevices(s1Name, pc1Name);
  
  // 3. Configurar router por CLI
  var router = net.getDevice(r1Name);
  var cli = router.getCommandLine();
  
  // Esperar IOS boot
  waitForIOS(cli, 15000);
  
  // Configurar
  cli.enterCommand("no");
  cli.enterCommand("enable");
  cli.enterCommand("configure terminal");
  cli.enterCommand("hostname R1");
  cli.enterCommand("interface FastEthernet0/0");
  cli.enterCommand("ip address 192.168.1.1 255.255.255.0");
  cli.enterCommand("no shutdown");
  cli.enterCommand("end");
  
  // 4. Verificar
  var port = router.getPortAt(0);
  port.getIpAddress();  // "192.168.1.1"
  
  // 5. Limpiar (opcional)
  // lws.removeDevice(r1Name);
  // lws.removeDevice(s1Name);
  // lws.removeDevice(pc1Name);
})();
```

---

---

## NUEVOS HALLAZGOS (14 Abril 2026 - Segunda Sesión)

### ✅ FILE API - FUNCIONA

```javascript
var app = ipc.appWindow();

app.fileSave();       // Guardar archivo actual
app.fileOpen();       // Abrir archivo
app.fileSaveAs();     // Guardar como...
app.getVersion();     // "9.0.0.0810"
```

### ✅ DEVICE API - Métodos de Gestión

```javascript
var device = net.getDevice("Router0");

// Renombrar ✅ FUNCIONA
device.setName("NuevoNombre");

// Mover ✅ FUNCIONA
device.moveToLocation(x, y);
device.getXCoordinate();  // X actual
device.getYCoordinate();  // Y actual

// Saltar boot (llamado automaticamente por handleAddDevice)
device.skipBoot();  // ⚠️ Por probar en lab nuevo

// Modulos
device.addModule(slot, module);   // ⚠️Funciona pero requiere slot STRING y power OFF. Devuelve false para TODOS los modulos en PT 8.x (ver seccion HALLAZGOS addModule)
device.removeModule(slot);        // ⚠️ Por probar
```

### 📦 SERVER API (103 métodos)

| Clase | Puertos | Métodos únicos |
|-------|---------|----------------|
| `Server` | 1 (FastEthernet0) | `enableCip()`, `disableCip()`, `enableOpc()`, `disableOpc()`, `enableProfinet()`, `disableProfinet()`, `addUserDesktopApp()`, `addProgrammingSerialOutputs()`, etc. |

### 📦 PC API (102 métodos)

| Clase | Puertos | Métodos únicos |
|-------|---------|----------------|
| `Pc` | 2 (FastEthernet0, Bluetooth) | Similar a Server, `addUserDesktopApp()`, `addProgrammingSerialOutputs()`, etc. |

### ❌ CLOUD-PT y LAPTOP-PT - NO FUNCIONAN

```javascript
// type=7 (cloud) retorna null
lws.addDevice(7, "Cloud-PT", 400, 200);  // null

// type=12 (laptop) retorna null
lws.addDevice(12, "Laptop-PT", 1000, 200);  // null
```

### Dispositivos Verificados con addDevice()

| typeId | Modelo | Status | Clase |
|--------|--------|--------|-------|
| 0 | Router-PT, 2811, 2911, 1941 | ✅ | Router |
| 1 | Switch-PT, 2960-24TT | ✅ | CiscoDevice |
| 8 | PC-PT | ✅ | Pc |
| 9 | Server-PT | ✅ | Server |
| 7 | Cloud-PT | ❌ | - |
| 12 | Laptop-PT | ❌ | - |

---

## MAPA DE FAMILIAS REALES (16 Abril 2026)

### Router
- `className`: `Router`
- `typeId`: `0`, `16`
- Puertos: 4 a 29 según modelo
- CLI: sí
- Procesos típicos: `VlanManager`, `RoutingProcess`, `StpMainProcess`, `AclProcess`, `Aclv6Process`, `NtpServerProcess`, `SshServerProcess`

### CiscoDevice
- `className`: `CiscoDevice`
- `typeId`: `1`, `3`, `12`, `41`, `44`
- Ejemplos reales: switches, bridges, IP phones, WLC, LAP
- Puertos: muy variables
- CLI: sí en switches, IP phone, WLC y LAP

### Cloud
- `className`: `Cloud`
- `typeId`: `2`
- Puertos: serial, modem, ethernet y coaxial
- CLI: no
- Métodos únicos: `addPhoneConnection()`, `addPortConnection()`, `addSubLinkConnection()`, `removePortConnection()`

### Device
- `className`: `Device`
- `typeId`: `4`, `5`, `6`, `13`, `14`, `23`, `25`, `31`, `35`, `45`, `46`, `47`
- Ejemplos reales: hub, repeater, splitter coaxial, modem, TV, sniffer, patch panels
- CLI: no

### Pc
- `className`: `Pc`
- `typeId`: `8`, `10`, `18`, `19`, `20`, `21`, `22`, `24`, `50`, `54`, `55`
- Ejemplos reales: PC, printer, laptop, tablet, smartphone, controllers
- CLI: sí
- Procesos frecuentes: `NtpServerProcess`, `AclProcess`, `Aclv6Process`

### Server
- `className`: `Server`
- `typeId`: `9`, `49`
- Ejemplos reales: server genérico, Meraki-Server
- CLI: sí
- Procesos comunes: `DhcpServerMainProcess`, `DnsServerProcess`, `HttpServerProcess`

### WirelessRouter
- `className`: `WirelessRouter`
- `typeId`: `11`, `29`, `30`, `32`, `48`
- Ejemplos reales: WRT300N, Home Gateway, Home Router, Central Office Server, Meraki MX
- CLI: sí
- Métodos únicos: `addNatEntry()`, `removeNatEntry()`, `setDMZEntry()`, `setDefaultGateway()`, `isRemoteManagementEnable()`

### ASA
- `className`: `ASA`
- `typeId`: `27`
- Puertos: VLAN + ethernet
- CLI: no
- Métodos únicos: `addBookmark()`, `removeBookmark()`, `getBookmarkCount()`, `getWebvpnUserManager()`

### MCU / SBC / MCUComponent
- `className`: `MCU`, `SBC`, `MCUComponent`
- `typeId`: `36`, `37`, `39`, `51`
- MCU/SBC: programación y componentes IoT
- `MCUComponent` es la clase real de los dispositivos IoT y PLC
- Métodos únicos: `analogWrite()`, `digitalWrite()`, `enableGoosePublisherOnPort()`, `getComponentAtSlot()`, `setSubComponentIndex()`

### Regla crítica
- `typeId` **no** define la clase por sí solo.
- El modelo exacto determina la clase real, los puertos y los procesos disponibles.
- Siempre validar con `device.getClassName()`, `device.getPortCount()` y `device.getProcess()`.

---

## addModule() - IMPLEMENTADO (15 Abril 2026)

### Arquitectura descubierta

PT usa un **árbol de módulos** jerárquico. No se inserta directamente en `root`.

```
2911 tree:
  root (type=18)
    child[0] (type=18) ← HWIC/WIC van aqui
      slot[0-3] type=2 (eInterfaceCard) ← estos son los slots WIC/HWIC

2811 tree:
  root (type=18)
    child[0] (type=18)
      slot[0-3] type=2 (eInterfaceCard)
    child[1] (type=1) ← aparece DESPUES de insertar NM-2W
      slot[0-1] type=2

1941 tree:
  root (type=18)
    child[0] (type=18) ← HWIC/WIC van aqui
      slot[0-1] type=2 (eInterfaceCard)
```

### Slot types

| Valor | Constante | Descripcion |
|-------|-----------|-------------|
| 0 | eLineCard | - |
| 1 | eNetworkModule | Slots NM (2811 root slot 1) |
| 2 | eInterfaceCard | Slots WIC/HWIC |
| 18 | eNonRemovableModule | Slot raiz - no insertar |
| 32 | eNonRemovableInterfaceCard | - |

### Estrategia por modelo

**2911 y 1941:**
1. Insertar HWIC/WIC en `root/child[0]` slot type 2
2. Puerto count aumenta (ej: 4→6 con HWIC-2T)

**2811 (two-step):**
1. Primero: insertar `NM-2W` en `root` slot 1 (type=1)
2. Esto crea `child[1]` con slots tipo 2
3. Segundo: insertar HWIC/WIC en `child[1]` slot type 2

### API del módulo árbol

```javascript
var root = dev.getRootModule();
root.addModuleAt("HWIC-2T", slotIndex);  // Retorna boolean
root.getSlotCount();   // Numero de slots
root.getSlotTypeAt(i); // Tipo de slot
root.getModuleCount();  // Numero de child modules
root.getModuleAt(i);    // Child module
```

### Evento post-insercion

Cuando un modulo se inserta exitosamente, PT emite:
```javascript
dev.registerEvent("moduleAdded", callback);
// args = { model: "HWIC-2T", slotPath: "0/0", type: 2 }

dev.registerEvent("portAdded", callback);
// args = { portName: "Serial0/0/0" }
```

### Implementacion en runtime.js

`handleAddModule` ahora:
1. Obtiene `root` via `device.getRootModule()`
2. Recolecta todos los candidatos (modules con slots) recursivamente
3. Encuentra el mejor slot segun tipo de modulo (HWIC→type 2, NM→type 1)
4. Para 2811+HWIC: inserta NM-2W primero si no existe container
5. Inserta modulo con `parent.addModuleAt(moduleId, slotIndex)`
6. Restore power con `device.setPower(true)` + `device.skipBoot()`

---

## HALLAZGOS BOOT TEST (15 Abril 2026)

### ✅ addDevice() + Boot Detection Funciona (event-based)

| Modelo | Nombre | Puerto count | Boot Status |
|--------|--------|-------------|-------------|
| 2911 | Router40 | 4 | Boot completo + IOS listo ✅ |
| 2811 | Router41 | 3 | Boot completo + IOS listo ✅ |
| 1941 | Router42 | 3 | Boot completo + IOS listo ✅ |

### Modelo de deteccion correcto (NO polling de cli.getOutput)

El scraping de `cli.getOutput()` para detectar "Self decompressing the image" NO funciona porque PT caches el output buffer. El metodo correcto es:

**1. Event-based boot detection:**
```javascript
dev.registerEvent("doneBooting", state, function(src, args) {
  state.bootDone = true;
});
```

**2. Polling de respaldo con isBooting():**
```javascript
if (!dev.isBooting()) { /* boot completo */ }
```

**3. Validacion IOS con dev.enterCommand():**
```javascript
var res = dev.enterCommand("show version", "user");
// res = { first: 0, second: "Cisco IOS Software..." }
// first=0 significa exito
```

### Dialog inicial (Would you like...)

```javascript
cli.enterChar(13, 0);  // Enter para despertar
cli.enterCommand("no");  // Responder dialog inicial
```

### Script: pt-boot-and-module.js

- Limpia lab y crea 2911, 2811, 1941
- Usa state machine con setInterval (no while bloqueante)
- Boot detection: doneBooting event + isBooting() polling
- IOS ready: dev.enterCommand("show version", "user")
- Dialog dismiss: enterChar(13) + enterCommand("no")
- Power cycle para module changes

**En PT vacío, cargar `~/pt-dev/pt-boot-and-module.js`**

---

## QT SCRIPT COMPATIBILITY (16 Abril 2026)

PT usa QtScript (pre-ES6). Reglas estrictas:

### NO usar
```javascript
// ❌ Arrow functions
var fn = () => {}

// ❌ Template literals
var s = `hello ${name}`

// ❌ forEach/map/filter en arrays
arr.forEach(function(x) {})

// ❌ let, const
let x = 1; const y = 2;

// ❌ Spread operator
var x = [...arr]

// ❌ Destructuring
var {a, b} = obj;
```

### SÍ usar
```javascript
// ✅ Function declaration
function foo() {}

// ✅ Funciones anonimas
var fn = function() {}

// ✅ Concatenacion
var s = "hello " + name

// ✅ for loop
for (var i = 0; i < arr.length; i++) {}

// ✅ for...in para enumerar
for (var k in obj) { if (obj.hasOwnProperty(k)) {} }

// ✅ var
var x = 1;
```

### Object.getPrototypeOf() - PUEDE FALLAR
En dispositivos como Router, `Object.getPrototypeOf(dev)` internamente hace llamadas IPC que pueden lanzar excepciones.

**SIEMPRE envolver en try/catch:**
```javascript
function safeProto(obj) {
  try { return Object.getPrototypeOf(obj); }
  catch(e) { return null; }
}
```

### sp() vs si() - INVOCAR METODOS
```javascript
var fn = obj["methodName"];  // Obtiene la referencia de la funcion
fn();                          // La invoca

// ⚠️ sp() solo obtiene la referencia, no invoca:
var x = sp(obj, "getName");    // x es la funcion, NO el nombre

// ✅ si() invoca con try/catch:
function si(obj, name, args) {
  var fn = obj[name];
  if (typeof fn !== "function") return null;
  try { return fn.apply(obj, args || []); }
  catch(e) { return null; }
}
var name = si(obj, "getName");  // name es el string "Router0"
```

### Helpers ES5 para scripts PT
```javascript
function safe(fn, def) {
  try { return fn(); } catch(e) { return def !== undefined ? def : null; }
}
function si(obj, name, args) {
  var fn = safe(function() { return obj[name]; }, null);
  if (typeof fn !== "function") return null;
  return safe(function() { return fn.apply(obj, args || []); }, null);
}
function sp(obj, name) {
  return safe(function() { return obj[name]; }, null);
}
function sProto(obj) {
  return safe(function() { return Object.getPrototypeOf(obj); }, null);
}
function forIn(obj, fn) {
  try { for (var k in obj) { fn(k); } } catch(e) {}
}
```

---

## 🔍 API NO DOCUMENTADA EN PT-API.md (del dump)

Métodos encontrados en `docs/pt-script-result.json` que NO aparecen en `PT-API.md`:

### PTLogicalWorkspace (adicional)
- `addCluster(x, y, label: string)` - Crear cluster visual
- `addNote(x, y, scale: number, text: string)` - Agregar nota al canvas
- `addTextPopup(x, y, scale: number, type: number, text: string)` - Text popup
- `centerOn(x, y)` - Centrar vista
- `centerOnComponentByName(name: string)` - Centrar en dispositivo
- `changeNoteText(noteId, text)` - Cambiar texto de nota
- `clearLayer(layerId)` - Limpiar capa
- `getCanvasEllipseIds()` - Obtener IDs de elipses
- `getCanvasRectIds()` - Obtener IDs de rectángulos
- `deleteObject(obj)` - Eliminar objeto

### PTAppWindow (adicional verificada)
- `getVersion()` ✅ - Retorna versión PT (ej: "9.0.0.0810")
- `getUserFolder()` - Ruta del usuario
- `getDefaultFileSaveLocation()` - Directorio de guardado por defecto

### PTDevice (adicional)
- `getRootModule()` - Entry point para dispositivos modulares
- `getProcess(processName: string)` - Obtener proceso (DHCP, VLAN, routing, etc.)
- `serializeToXml()` - Serializar estado a XML
- `skipBoot()` - Saltar boot
- `getXCoordinate()`, `getYCoordinate()` - Coordenadas canvas
- `addModule(slot, module)` - Agregar módulo
- `removeModule(slot)` - Remover módulo

### PTPort/HostPort (adicional no documentado en PT-API.md)
- `setZoneMemberName(name)` - Configurar zona de seguridad
- `getZoneMemberName()` - Obtener zona
- `setNatMode(mode: number)` - Configurar NAT (0-5)
- `getNatMode()` - Obtener modo NAT

### Globals NO verificados (existen como keys en ipc pero sin clase dedicada)
- `ipc.hardwareFactory` - Existe key, sin métodos verificados
- `ipc.ipcManager` - Existe key, sin métodos verificados
- `ipc.multiUserManager` - Existe key, sin métodos verificados
- `ipc.userAppManager` - Existe key, sin métodos verificados
- `ipc.commandLog` - Existe key, sin métodos verificados
- `ipc.options` - Existe key, sin métodos verificados
- `ipc.simulation` - Existe key, superficie no verificada

---

## 🎨 CANVAS UI MANIPULATION API (Junio 2026)

> **Descubrimiento:** API de canvas elements (notas, líneas, elipses, rectángulos, clusters) vía métodos directos de PTLogicalWorkspace.
> 
> **Estado:** ⚠️ **Experimental** — Creación de rectángulos NO disponible. Varios bugs/crashes en PT 9.0.0.0810.
> 
> **Entornos probados:** macOS ARM64, PT 9.0.0.0810, modo Realtime.

### ⚠️ PRERREQUISITO: PTLogicalWorkspace activo

`w` (shortcut) y `lws` (path completo) solo son objetos funcionales si hay una red (`.pkt`) cargada en PT con dispositivos.

| Estado PT | `w`/`lws` (PTLogicalWorkspace) | `n` (PTNetwork) | Canvas items |
|-----------|--------------------------------|-----------------|--------------|
| Abierto sin .pkt | `{}` solo `_parser` | `{}` solo `_parser` | No hay |
| Con .pkt cargado | 69+ métodos nativos | 14+ métodos | Items visibles |

En PT recién abierto sin red:
```javascript
Object.keys(w); // ["_parser"]  ← vacío, sin métodos de canvas
```

**⚠️ `w` vs `lws`:** En este test session, `w` era un objeto vacío `{_parser}` incluso con .pkt cargado. 
Siempre usar `var lws = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();` para obtener el workspace real.

### Acceso
```javascript
// Path completo (SIEMPRE usar este, no confiar en w)
var lws = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();

// O usando el shortcut (si está disponible)
w === lws;  // true si getLW() funciona
```

### Canvas API — Leer items

| Método | Descripción | Estado |
|--------|-------------|--------|
| **IDs** | | |
| `lws.getCanvasItemIds()` | IDs de drawing items SOLO (líneas, elipses, rects, polígonos). **NO incluye notas** | ✅ |
| `lws.getCanvasNoteIds()` | IDs de notas de texto (incluye labels de interfaces) | ✅ |
| `lws.getCanvasLineIds()` | IDs de líneas | ✅ |
| `lws.getCanvasEllipseIds()` | IDs de elipses | ✅ |
| `lws.getCanvasRectIds()` | IDs de rectángulos | ✅ |
| `lws.getCanvasPolygonIds()` | IDs de polígonos/formas libres | ⚠️ No probado |
| **Leer datos** | | |
| `lws.getCanvasNoteText(id)` | Texto de una nota | ✅ Retorna string |
| `lws.getLineItemData(id)` | Array `[x1, y1, x2, y2, "color"]` | ✅ |
| `lws.getCanvasItemX(id)` / `lws.getCanvasItemY(id)` | Posición X/Y del item | ✅ Funciona con UUIDs |
| `lws.getCanvasItemRealX(id)` / `lws.getCanvasItemRealY(id)` | Posición real (escala 1:1) | ✅ |
| `lws.getRectItemData(id)` | Datos de rectángulo | ⚠️ No probado — puede crash |
| `lws.getPolygonItemData(id)` | Datos de polígono | ⚠️ No probado |
| **Cluster** | | |
| `lws.getCurrentCluster()` | Cluster actual donde está la vista | ✅ |
| `lws.getRootCluster()` | Cluster raíz | ✅ |
| `lws.getCluster(id)` / `lws.getClusterForItem(id)` | Obtener cluster | ✅ |
| `lws.getClusterIdForItem(id)` / `lws.getClusterItemId(id)` | IDs de cluster/items | ✅ |

### Canvas API — Modificar items (✅ FUNCIONAN)

| Método | Descripción | Estado |
|--------|-------------|--------|
| `lws.setCanvasItemX(id, val)` | Mover item a X (coord simple) | ❌ No persiste en notas |
| `lws.setCanvasItemY(id, val)` | Mover item a Y (coord simple) | ❌ No persiste en notas |
| `lws.setCanvasItemRealPos(id, x, y)` | Posición absoluta REAL (escala 1:1) | ✅ **Funciona — mueve visualmente** |
| `lws.moveCanvasItemBy(id, dx, dy)` | Mover relativo en coords reales | ✅ **Funciona — cambia getCanvasItemRealX/Y** |
| `lws.removeCanvasItem(id)` | Eliminar item (notas incluidas) | ✅ Reduce getCanvasNoteIds() |
| `lws.changeNoteText(id, text)` | Cambiar texto de nota | ✅ Persiste y visible |
| `lws.clearLayer(layerId)` | Limpiar capa | ⚠️ No probado |
| `lws.centerOn(x, y)` | Centrar vista del LogicalWorkspace | ✅ |
| `lws.showClusterContents(cluster)` | Mostrar contenido de un cluster | ✅ |

### Canvas API — Crear items

#### ✅ NOTAS — `lws.addNote(x, y, scale, text)`

```javascript
var lws = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();

// ✅ FUNCIONA — Crear nota visible en canvas
var noteId = lws.addNote(x, y, scale, text);
// Retorna: UUID string, ej: "{64015593-5494-4365-b00d-871133a95d5d}"
// La nota aparece en getCanvasNoteIds()
```

**Parámetros:**

| Parámetro | Tipo | Descripción | Notas |
|-----------|------|-------------|-------|
| `x` | number | Posición X | ⚠️ **IGNORADO** por el API — todas las notas se crean en ~(25,9) |
| `y` | number | Posición Y | ⚠️ **IGNORADO** — mismo comportamiento |
| `scale` | number | Escala/tamaño | **≥ 10 para ser visible.** Scale=1 es microscópico |
| `text` | string | Contenido de la nota | Visible inmediatamente |

**Ejemplo:**
```javascript
var id = lws.addNote(400, 200, 10, "mi nota");    // ✅ Visible (scale≥10)
var id = lws.addNote(400, 200, 1, "invisible");    // ❌ Escala 1 = no se ve
```

**Workaround para posicionar notas:**
```javascript
// 1. Crear nota en posicion default (x,y ignorados)
var id = lws.addNote(0, 0, 10, "mi nota");

// 2. Mover a posicion exacta usando coordenadas REALES
lws.setCanvasItemRealPos(id, 400, 250);
// ✅ Ahora la nota esta en (400, 250) — FUNCIONA visualmente
```

**⚠️ Dos sistemas de coordenadas:**
- `getCanvasItemX/Y` — coordenadas "simples" (grid/scaled). NO cambian con move.
- `getCanvasItemRealX/Y` — coordenadas reales 1:1 del canvas. **Cambian con move/setRealPos.**

**Limitaciones:**
- `x`, `y` en `addNote` son **ignorados** — la nota siempre aparece en posición por defecto (~25,9)
- Para posicionar correctamente: crear nota, luego `setCanvasItemRealPos(id, x, y)`

#### ❌ RECTÁNGULOS — NO hay API directa

```javascript
// ❌ NINGUNA de estas funciona:
lws.addCluster("nombre", 400, 300);              // "Invalid arguments"
lws.addCluster(400, 300, "nombre");              // "Invalid arguments"  
lws.addCluster(400, 300, "nombre", 100, 80);     // "Invalid arguments"
lws.addCluster(400, 300, 100, 80);               // "Invalid arguments"
_ScriptModule.ipcObjectCall("LogicalWorkspace", "addCluster", [...]); // "object does not exist"
```

**Métodos relacionados con rect existentes pero SIN crear:**
- `lws.getCanvasRectIds()` — ✅ leer IDs de rects existentes
- `lws.getRectItemData(id)` — ⚠️ leer datos de rect (puede crash)
- `lws.removeCanvasItem(id)` — ✅ eliminar rect existente

**No hay:** `addRect`, `createRect`, `drawRect`, `insertRect`, ni ningún método equivalente.

#### ✅ TEXTPOPUP — `lws.addTextPopup(x, y, scale, type, text)`

```javascript
// ✅ FUNCIONA — Crea un elemento tipo "text popup" en el canvas
var popupId = lws.addTextPopup(200, 100, 10, 0, "popup");
// Retorna: UUID string, ej: "{71223f08-5b33-43ae-96c2-f051d21efd87}"
// El popup NO aparece en getCanvasNoteIds() ni en getCanvasItemIds()
```

**Parámetros:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `x` | number | Posición X |
| `y` | number | Posición Y |
| `scale` | number | Escala/tamaño |
| `type` | number | Tipo de popup (0 = texto plano?) |
| `text` | string | Contenido del popup |

**⚠️ Naturaleza del elemento:** `addTextPopup` crea un elemento que NO es nota, NO es rectángulo, NO es línea, NO es elipse, NO es polígono. No aparece en ninguna de las categorías query-ables. Podría ser un elemento de cluster o un componente interno de QT no expuesto al API de script.

**Firma alternativa fallida:**
```javascript
lws.addTextPopup("texto", x, y);  // ❌ "Invalid arguments for IPC call addTextPopup"
```

#### ❌ LÍNEAS Y ELIPSES — No hay API directa en lws

```javascript
// ❌ FALLAN:
lws.drawLine(100, 100, 200, 200);   // "Invalid arguments for IPC call"
lws.drawCircle(300, 200, 50);       // "Invalid arguments for IPC call"

// ❌ _ScriptModule.ipcObjectCall también falla (object does not exist)
_ScriptModule.ipcObjectCall("LogicalWorkspace", "drawLine", [100, 100, 200, 200]);
// {"$_error":"IPC Call ERROR: object does not exist or already deleted"}
```

**Nota:** En la sesión previa, `_ScriptModule.ipcObjectCall` SÍ funcionó para `drawLine`, `drawCircle` y `addCluster` con un workspace que tenía dispositivos creados via `addDevice()`. Parece requerir un estado específico del workspace.

### Estados de ID según tipo de item

| Tipo de item | Formato de ID | Ejemplo |
|-------------|---------------|---------|
| Notas de interfaz (labels) | UUID | `{37551abd-4e34-4f00-b5d4-a6fd7df69919}` |
| Notas creadas por API | UUID | `{64015593-5494-4365-b00d-871133a95d5d}` |
| Drawing items (con .pkt cargado) | Número | `0`, `1`, `2`, ... |
| Drawing items (sin .pkt) | UUID | `{05472552-...}` |

### ID spaces separados

Los IDs de notas (`getCanvasNoteIds()`) NO están incluidos en `getCanvasItemIds()`. Son espacios separados:

```javascript
var allItems = lws.getCanvasItemIds();    // Solo drawing items (lineas, rects, elipses, poligonos)
var allNotes = lws.getCanvasNoteIds();    // Solo notas (incluye labels de interfaces)

allItems.indexOf(allNotes[0]);  // -1 — las notas NO están en canvasItemIds
```

Esto implica que `removeCanvasItem(noteId)` funciona para notas, pero las notas se manejan en un layer/almacenamiento separado.

### ❌ NO USAR: Métodos que CRASHEAN o fallan

#### 🔴 `getEllipseItemData(id)` — CRASHEA PACKET TRACER (SIGSEGV)

```javascript
lws.getEllipseItemData(id);  // 💥 CRASH — EXC_BAD_ACCESS (SIGSEGV)
```

**Stack trace del crash:**
```
0  CCanvasNote::getOriginalText()        ← null pointer dereference
1  CCanvasEllipse::getShapeData()        ← intenta leer nota de la ellipse
2  CLogicalWorkspace::getShapeItemData() ← método público
3  CScriptModule::callFunction           ← IPC call desde script
4  CScriptModule::timerEvent             ← runtime polling (timer)
5  [Qt QML recursion]                    ← RECURSION LEVEL markers
```

**Causa raíz:** `drawCircle()` crea un `CCanvasEllipse` que tiene una referencia interna a `CCanvasNote` para la label. Esa nota es `nullptr`. Cuando `getEllipseItemData()` intenta leer el texto de la nota vía `getOriginalText()`, el objeto no existe y PT crashea con SIGSEGV.

**Consecuencia:** Una vez creada una ellipse corrupta, el runtime timer del kernel (timer 49) intenta periódicamente leer shape data, lo que dispara el crash en cada tick. El crash loop continúa incluso después de cerrar el CLI. **Solución: Cerrar PT completamente y reabrir.**

#### ❌ `w.drawLine(x1, y1, x2, y2)` — Invalid arguments

```javascript
w.drawLine(100, 100, 200, 200);
// ERROR: "Invalid arguments for IPC call 'drawLine'"
```

Los wrappers directos en `w.xxx()` hacen type-checking estricto de argumentos antes de llamar al IPC nativo.

#### ❌ `_ScriptModule.ipcCall(className, method, ...)` — Invalid syntax

```javascript
_ScriptModule.ipcCall("LogicalWorkspace", "drawLine", [100, 100, 200, 200]);
// ERROR: "invalid call syntax"
```

Solo `_ScriptModule.ipcObjectCall` funciona, y solo en ciertos estados del workspace.

#### ❌ `_Parser.createObject()` — No existe

```javascript
_Parser.createObject();  // TypeError
```

`_Parser` es un constructor nativo, no un objeto con métodos estáticos.

#### ❌ `$ipc()` sin argumentos

```javascript
$ipc();  // ERROR: "Insufficient arguments"
```

### ✅ RESUMEN — Lo que funciona para NOTAS

```javascript
var lws = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();

// CREAR nota (scale ≥ 10 para visibilidad)
var id = lws.addNote(0, 0, 12, "Nota visible");
// x, y son ignorados — la nota se crea en posición default

// LEER notas existentes
var ids = lws.getCanvasNoteIds();           // todas las notas
var texto = lws.getCanvasNoteText(ids[0]);  // "Gig0/0"
var x = lws.getCanvasItemX(ids[0]);         // posición X
var y = lws.getCanvasItemY(ids[0]);         // posición Y

// MODIFICAR texto
lws.changeNoteText(id, "nuevo texto");

// MOVER (usar coordenadas REALES)
lws.moveCanvasItemBy(id, 50, 30);           // relativo — cambia getCanvasItemRealX/Y
lws.setCanvasItemRealPos(id, 400, 250);     // absoluto — FUNCIONA visualmente
lws.setCanvasItemX(id, 200);                // ❌ coord simple — no persiste
lws.setCanvasItemY(id, 100);                // ❌ coord simple — no persiste

// ELIMINAR
lws.removeCanvasItem(id);

// CENTRAR vista
lws.centerOn(400, 300);
lws.showClusterContents(lws.getRootCluster());
```

### ✅ RESUMEN — Lo que funciona para DISPOSITIVOS

```javascript
var lws = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
var net = ipc.network();

// CREAR dispositivo
var nombre = lws.addDevice(0, "Router-PT", 200, 300); // "Router0"

// CONECTAR
lws.autoConnectDevices("Router0", "Switch0");

// ELIMINAR
lws.removeDevice("Router0");
lws.deleteLink("Router0", "FastEthernet0/0");
```

### ❌ RESUMEN — Lo que NO funciona

| Operación | Intento | Resultado |
|-----------|---------|-----------|
| Crear rectángulo | `addCluster`, `_ScriptModule.ipcObjectCall` | "Invalid arguments" |
| Crear línea | `drawLine` en lws o ipcObjectCall | Invalid / object does not exist |
| Crear elipse | `drawCircle` en lws o ipcObjectCall | Invalid / object does not exist |
| Especificar posición en addNote | `lws.addNote(x, y, ...)` | x,y ignorados |
| Mover nota con setCanvasItemX/Y | `lws.setCanvasItemX(id, val)` | No persiste en notas |
| **Mover nota con setCanvasItemRealPos** | `lws.setCanvasItemRealPos(id, x, y)` | ✅ **FUNCIONA visualmente** |
| Leer datos de elipse | `getEllipseItemData(id)` | 💥 CRASH PT |

### 🔬 Notas técnicas

| Aspecto | Detalle |
|---------|---------|
| Límite de script | Scripts > ~500 bytes pueden causar crashes intermitentes |
| Runtime timer crash loop | Una vez creado item corrupto, el kernel polling (timerEvent) crashea al leer shape data |
| Recuperación post-crash | Cerrar PT completamente y reabrir |
| Notas de interfaz existentes | Labels tipo "Gig0/0", "Fa0/1" son creadas por PT al añadir dispositivos |
| Espacio de IDs separado | Notas ≠ drawing items. getCanvasItemIds() NO incluye notas |
| addNote(x,y) ignorado | Las coordenadas pasadas a addNote no se respetan — nota siempre en posición default |
| setCanvasItemRealPos funciona | ✅ Mueve notas visualmente. Usar `setCanvasItemRealPos(id, x, y)` post-creación |
| Dos sistemas de coordenadas | `getCanvasItemX/Y` = simple (grid), `getCanvasItemRealX/Y` = real (1:1 canvas). Solo las reales cambian con move/setRealPos |
| addTextPopup | Crea elemento no-categorizable (no nota, no rect, no línea, no elipse, no polígono) |
| 66 métodos en lws | Ver lista completa arriba. Incluye `getObjectUuid()`, `getState()`, `getCurrentZoom()` |
| `_ScriptModule.ipcObjectCall` | Solo funciona con workspace en estado específico (dispositivos creados vía addDevice) |
| `w` shortcut | No siempre es confiable. Usar path completo `ipc.appWindow().getActiveWorkspace().getLogicalWorkspace()` |
| AddCluster | No se encontró ninguna firma que funcione para crear rectángulos |

---

*Documentado: 16-17 Junio 2026 | Canvas API, addTextPopup, setCanvasItemRealPos, registerEvent, VlanManager API, RoutingProcess | macOS ARM64, PT 9.0.0.0810*
*Verificado contra: docs/pt-script-result.json (dump 2026-04-15)*

---

## 🔬 NUEVOS DESCUBRIMIENTOS (17 Junio 2026 — Sesión 2)

> Experimentos #31-#37 confirmaron APIs críticas NO documentadas o previamente marcadas como fallidas.
> **Fuente:** AGENTS.md de pt-runtime reveló APIs que no se habían probado.

### 📌 serializeToXml() — XML COMPLETO del dispositivo

**TODOS los dispositivos tienen este método.** Devuelve el estado serializado completo en XML.

```javascript
var xml = device.serializeToXml();
// R1:  ~19,274 chars — configuración completa del router
// SW1: ~42,100 chars — VLANs, STP, puertos, etc.
// SRV1: ~61,283 chars — servicios: DHCP, HTTP, FTP, DNS, syslog, archivos
```

**Tags XML encontrados en SRV1 (servidor):**
```
DEVICE, ENGINE, TYPE, NAME, POWER, MODULE, SLOT, PORT,
IP, SUBNET, GATEWAY, MACADDRESS, BIA, DHCP_SERVER_IP,
HTTP_SERVER (ENABLED=1), HTTPS_SERVER (HTTPSENABLED=1),
FTP_SERVER (ENABLED=1, usuario cisco/cisco),
DNS_SERVER, SYSLOG_SERVER (ENABLED=1),
NTP_SERVER (ENABLED=1), EMAIL_SERVER,
DHCP_SERVER → POOLS → POOL (NETWORK, MASK, START_IP, END_IP, DEFAULT_ROUTER),
DHCP_POOL_LEASES, DNS_CLIENT, TFTP_SERVER,
FILE (91 archivos con FILE_NUMBER, FILE_CONTENT, PERMISSION),
SNMP_MANAGER (AGENT_IP, READ_COMMUNITY, WRITE_COMMUNITY),
RADIUS_SETTINGS (AUTH_PORT=1645),
HTML_CODE, GUI_CODE, PYTHON, USER_APPS, RUNNING_APPS
```

### 📌 getCommandLine() — CLI en TODOS los dispositivos

| Dispositivo | Prompt |
|-------------|--------|
| Router (R1) | `Router#` (modo privilegiado ya!) |
| Switch (SW1) | `Switch>` |
| PC (PC1) | `C:\>` (Windows cmd.exe) |
| Server (SRV1) | `C:\>` (Windows cmd.exe) |

```javascript
var cli = device.getCommandLine();
cli.getPrompt();   // "Router#", "Switch>", "C:\>"
// Nota: El objeto CLI solo expone "_parser" vía Object.keys()
// Los métodos enterCommand/getOutput/getPrompt funcionan internamente
```

### 📌 getPort(name) — por nombre exacto

**Requiere el nombre COMPLETO del puerto**, no abreviaturas:

| Dispositivo | getPortAt(i) | getPort(name) |
|-------------|-------------|---------------|
| Router (R1) | `getPortAt(1)` → GigabitEthernet0/0 | `getPort("GigabitEthernet0/0")` ✅ |
| Router (R1) | ❌ `getPort("Gig0/0")` → null | Usar nombre exacto |
| Switch (SW1) | `getPortAt(1)` → FastEthernet0/1 | `getPort("FastEthernet0/1")` ✅ |
| PC (PC1) | `getPortAt(0)` → FastEthernet0 | `getPort("FastEthernet0")` ✅ |
| Server (SRV1) | `getPortAt(0)` → FastEthernet0 | `getPort("FastEthernet0")` ✅ |

```javascript
var r1 = net.getDevice("R1");
r1.getPort("GigabitEthernet0/0").getIpAddress();  // "192.168.10.1"
// NOTE: getPort(name) y getPortAt(index) NO son el mismo objeto (!==)
```

### 📌 Procesos por dispositivo

**Router (R1):**
```javascript
r1.getProcess("RoutingProcess")       // ✅ Objeto con _parser
r1.getProcess("RipProcess")           // ✅ Objeto con _parser
r1.getProcess("VlanManager")          // ✅ Objeto con _parser
r1.getProcess("StpMainProcess")       // ✅ Objeto con _parser
r1.getProcess("DhcpServerProcess")    // ✅ Objeto con _parser
r1.getProcess("OspfProcess")          // ❌ null
r1.getProcess("EigrpProcess")         // ❌ null
```

**Switch (SW1):**
```javascript
sw1.getProcess("VlanManager")         // ✅ Objeto con _parser
sw1.getProcess("StpMainProcess")      // ✅ Objeto con _parser
sw1.getProcess("DhcpServerProcess")   // ✅ Objeto con _parser
sw1.getProcess("RoutingProcess")      // ❌ null
```

**Server (SRV1):**
```javascript
srv1.getProcess("DhcpServerMainProcess")  // ✅
srv1.getProcess("DnsServerProcess")       // ✅
srv1.getProcess("HttpServerProcess")      // ✅
srv1.getProcess("FtpServerProcess")       // ✅
srv1.getProcess("EmailServerProcess")     // ✅
srv1.getProcess("SyslogServerProcess")    // ✅
srv1.getProcess("NtpServerProcess")       // ✅
srv1.getProcess("DhcpServerProcess")      // ❌ null (usar DhcpServerMainProcess)
srv1.getProcess("SnmpServerProcess")      // ❌ null
```

> **⚠️ Todos los procesos son opacos:** solo exponen `_parser` con `uuid` y `className`. No hay métodos públicos como `getVlans()`, `getRoutes()`, etc. en el proxy IPC. Usar `serializeToXml()` para leer datos, y CLI para modificarlos.

### 📌 setIpSubnetMask() — CONFIRMADO FUNCIONA en PCs y Servers

```javascript
// PC1: Cambiar IP
var pc1 = net.getDevice("PC1");
var p = pc1.getPortAt(0);
p.getIpAddress();                // "192.168.10.100"
p.setIpSubnetMask("192.168.1.100", "255.255.255.0");  // ✅ retorna null (éxito)
p.getIpAddress();                // "192.168.1.100" ✅
p.getSubnetMask();               // "255.255.255.0" ✅

// SRV1: Cambiar IP del servidor
var srv = net.getDevice("SRV1");
var sp = srv.getPortAt(0);
sp.setIpSubnetMask("192.168.50.1", "255.255.255.0");  // ✅
sp.getIpAddress();               // "192.168.50.1" ✅
// Restaurar:
sp.setIpSubnetMask("192.168.1.200", "255.255.255.0");
```

### 📌 getPower() — Getter de estado

```javascript
device.getPower();  // true — funciona en TODOS los dispositivos
```

### 📌 lw.addDevice() / lw.removeDevice() — Crear y eliminar

```javascript
var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();

// Crear dispositivo — RETORNA STRING (nombre), NO objeto
var name = lw.addDevice(8, "PC-PT", 100, 100);
// name = "PC0" (string, no objeto)
var pc = net.getDevice(name);
pc.getName();              // "PC0"
pc.getPortAt(0).getName(); // "FastEthernet0"

// Configurar IP inmediatamente después de crear
var p = pc.getPortAt(0);
p.setIpSubnetMask("10.0.0.1", "255.0.0.0");  // ✅

// Eliminar
lw.removeDevice("PC0");  // ✅ retorna true
```

### 📌 ipc.registerEvent() — 8 eventos confirmados

```javascript
// ✅ Todos funcionan:
ipc.registerEvent("deviceAdded", null, handler);      // boolean
ipc.registerEvent("deviceRemoved", null, handler);    // boolean
ipc.registerEvent("deviceModified", null, handler);   // boolean
ipc.registerEvent("canvasNoteAdded", null, handler);  // boolean
ipc.registerEvent("linkAdded", null, handler);        // boolean
ipc.registerEvent("linkRemoved", null, handler);      // boolean
ipc.registerEvent("portModified", null, handler);     // boolean
ipc.registerEvent("powerChanged", null, handler);     // boolean

// Desregistrar:
var id = ipc.registerEvent("deviceAdded", null, handler);
ipc.unregisterEvent(id);  // ✅
```

> NOTA: `registerEvent` de `ipc` es distinto de `lws.registerEvent`. Ambos existen.

### 📌 ipc.getObjectByUuid()

```javascript
// Recuperar cualquier objeto por UUID
var uuid = "{5b07090e-e993-03fc-7514-a3be3b5ce1b0}";  // RoutingProcess UUID
var obj = ipc.getObjectByUuid(uuid);   // ✅ Retorna objeto
Object.keys(obj);                      // ["_parser"]
```

### 📌 Globals y utilidades

```javascript
guid();                    // "fb437434-5260-40f9-3634-17acae95a70f" ✅ UUID v4
Base64.encode("test123");  // "dGVzdDEyMw==" ✅
Base64.decode("dGVzdDEyMw=="); // "test123" ✅
$putData("key", "value");  // ✅ Almacenar dato global
$getData("key");           // "value" ✅ Recuperar dato global
AssessmentModel.fromBase64("dGVzdA==");  // "test" ✅
AssessmentModel.toBase64("test");        // "dGVzdA==" ✅
```

### 📌 ipc.appWindow() — Nuevos métodos confirmados

```javascript
var aw = ipc.appWindow();
aw.getVersion();            // "9.0.0.0810" ✅
aw.isRealtimeMode();        // true ✅
```

### 📌 Topología programática completa

```javascript
// 1. Crear red completa desde cero
var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
var net = ipc.network();

// 2. Crear dispositivos (addDevice retorna nombre string)
var r1Name = lw.addDevice(0, "2911", 100, 200);
var sw1Name = lw.addDevice(1, "2960-24TT", 300, 200);
var pc1Name = lw.addDevice(8, "PC-PT", 500, 200);

// 3. Obtener objetos
var r1 = net.getDevice(r1Name);
var sw1 = net.getDevice(sw1Name);
var pc1 = net.getDevice(pc1Name);

// 4. Cablear
lw.autoConnectDevices(r1Name, sw1Name);  // ✅ auto-selecciona puertos
lw.autoConnectDevices(sw1Name, pc1Name);

// 5. Configurar IP del PC
var p = pc1.getPortAt(0);
p.setIpSubnetMask("192.168.1.10", "255.255.255.0");  // ✅

// 6. Leer configuración completa via XML
var xml = r1.serializeToXml();  // 19KB+ de configuración

// 7. Leer procesos disponibles
var rp = r1.getProcess("RoutingProcess");

// 8. CLI
var cli = r1.getCommandLine();
cli.getPrompt();  // "Router>"
// NOTA: para enviar comandos, ver sección CLI arriba
```

### 📌 Servidor SRV1 — Configuración completa via XML

```xml
<DEVICE>
  <ENGINE>
    <TYPE model="Server-PT">Server</TYPE>
    <NAME>SRV1</NAME>
    <POWER>true</POWER>
    <MODULE>
      <SLOT>
        <MODULE>
          <PORT>
            <IP>192.168.1.200</IP>
            <SUBNET>255.255.255.0</SUBNET>
            <MACADDRESS>00D0.58B0.BC26</MACADDRESS>
          </PORT>
        </MODULE>
      </SLOT>
    </MODULE>
  </ENGINE>
  <!-- Servicios: -->
  <DHCP_SERVER>
    <POOLS>
      <POOL>
        <NETWORK>192.168.1.0</NETWORK>
        <MASK>255.255.255.0</MASK>
        <START_IP>192.168.1.0</START_IP>
        <END_IP>192.168.2.0</END_IP>
        <MAX_USERS>256</MAX_USERS>
      </POOL>
    </POOLS>
  </DHCP_SERVER>
  <HTTP_SERVER><ENABLED>1</ENABLED></HTTP_SERVER>
  <HTTPS_SERVER><HTTPSENABLED>1</HTTPSENABLED></HTTPS_SERVER>
  <FTP_SERVER>
    <ENABLED>1</ENABLED>
    <USER_ACCOUNT_MNGR>
      <ACCOUNT>
        <USERNAME>cisco</USERNAME>
        <PASSWORD>cisco</PASSWORD>
        <PERMISSIONS>RWDNL</PERMISSIONS>
      </ACCOUNT>
    </USER_ACCOUNT_MNGR>
  </FTP_SERVER>
  <SYSLOG_SERVER><ENABLED>1</ENABLED></SYSLOG_SERVER>
  <NTP_SERVER><ENABLED>1</ENABLED></NTP_SERVER>
  <!-- 91 archivos en filesystem -->
</DEVICE>
```

### ❌ APIs que NO funcionan (TypeError / Invalid arguments)

| Método | Error |
|--------|-------|
| `port.getDefaultGateway()` | TypeError en todos los tipos de puerto |
| `port.getIpv6Address()` | "IPC Call ERROR: Invalid arguments" |
| `port.getInboundFirewallService()` | TypeError |
| `dev.getX()` / `dev.getY()` | TypeError (usar getXCoordinate/getYCoordinate) |
| `dev.addModule(slot, model)` | "Invalid arguments" en Device (usar rootModule.addModuleAt) |
| `ipc.simulation().xxx` | Solo opaco (`_parser` con uuid/className) |
| `ipc.hardwareFactory().xxx` | Solo opaco (`_parser` con uuid/className) |
| SwitchPort.getIpAddress() | TypeError — SwitchPort no tiene IP |
| `lws.registerObjectEvent()` | "Invalid arguments for IPC call" |
| `Object.getPrototypeOf(device)` | Puede crashear PT — siempre usar try/catch |

### 📌 Resumen: Lo nuevo que cambia

| Antes (14 Abril) | Ahora (17 Junio) | Cambio |
|------------------|------------------|--------|
| `setIpSubnetMask()` ❌ Falla | ✅ Funciona en PCs y Servers | **CORREGIDO** |
| `serializeToXml()` ⚠️ No probado | ✅ Confirmado, XML completo | **NUEVO** |
| `getCommandLine()` solo en routers | ✅ Todos los dispositivos tienen CLI | **NUEVO** |
| `getPort(name)` ⚠️ No probado | ✅ Funciona con nombre exacto | **NUEVO** |
| `getProcess(name)` solo VlanManager | ✅ Mapeado completo por dispositivo | **NUEVO** |
| `getPower()` solo setter | ✅ Getter funciona en todos | **NUEVO** |
| `lw.addDevice()` retorna "Router0" | ✅ Retorna string (nombre), no objeto | **CONFIRMADO** |
| `lw.removeDevice()` ⚠️ No probado | ✅ Funciona | **CONFIRMADO** |
| `ipc.registerEvent()` ⚠️ No probado | ✅ 8 eventos funcionan | **NUEVO** |
| `ipc.getObjectByUuid()` ⚠️ | ✅ Funciona | **NUEVO** |
| `aw.getVersion()` ⚠️ | ✅ "9.0.0.0810" | **CONFIRMADO** |
| `guid()`, `Base64`, `$putData/$getData` ⚠️ | ✅ Todos funcionan | **NUEVO** |
| `AssessmentModel.getRunningConfig()` ⚠️ | ✅ Existe, string vacío (modo no-assessment) | **NUEVO** |

---

## 🖥️ TOPOLOGÍA REAL DEL .PKT (17 Junio 2026)

### 14 dispositivos

| Nombre | Clase | Modelo | Puertos | Posición |
|--------|-------|--------|---------|----------|
| Power Distribution Device0 | Device | Power Distribution Device | 0 | (3896, 3885) |
| R1 | Router | 2911 | 4 | (532, 215) |
| R2 | Router | 2911 | 4 | (363, 201) |
| SW1 | CiscoDevice | 2960-24TT | 27 | (378, 338) |
| SW2 | CiscoDevice | 2960-24TT | 27 | (591, 90) |
| SW3 | CiscoDevice | 2960-24TT | 27 | (701, 269) |
| SW4 | CiscoDevice | 2960-24TT | 27 | (124, 148) |
| PC1 | Pc | PC-PT | 2 | (742, 433) |
| PC2 | Pc | PC-PT | 2 | (841, 352) |
| PC3 | Pc | PC-PT | 2 | (192, 450) |
| PC4 | Pc | PC-PT | 2 | (89, 442) |
| SRV1 | Server | Server-PT | 1 | (606, 439) |
| Router0 | Router | Router-PT | 6 | (171, 285) |
| PC0 | Pc | PC-PT | 2 | (477, 282) |

### R1 — Puertos configurados

| Puerto | IP | MAC | Status |
|--------|----|-----|--------|
| Vlan1 | 0.0.0.0 | 0001.97A0.D335 | down |
| Gig0/0 | 192.168.10.1/24 | 00D0.BCE3.7901 | **up** |
| Gig0/1 | 192.168.20.1/24 | 00D0.BCE3.7902 | **up** |
| Gig0/2 | 0.0.0.0 | 00D0.BCE3.7903 | down |

### Procesos verificados en R1

| Proceso | Métodos | Funcionalidades clave |
|---------|---------|----------------------|
| VlanManager | 22 | `addVlan`, `removeVlan`, `changeVlanName`, `addVlanInt`, `getMacTable`... |
| RoutingProcess | 16 | `addStaticRoute` (❌ firma incorrecta), `getRoutingTable`, `getStaticRouteAt`... |

### Procesos verificados en SRV1 (Server-PT)

| Proceso | UUID | Estado |
|---------|------|--------|
| DhcpServerMainProcess | `{04619523-f040-bf58-ff1e-a378304b7213}` | ✅ Detectado |
| HttpServerProcess | `{71bd27c0-dd9c-3884-eb1e-a3225a58548f}` | ✅ Detectado |
| FtpServerProcess | `{ba41254b-be5b-8561-e81e-a341769a006c}` | ✅ Detectado |
| DnsServerProcess | `{5c5a9daf-56a3-b1bc-fe1e-a3eacd6beb42}` | ✅ Detectado |
| EmailServerProcess | `{71cca28f-933b-807f-fd1e-a38bc6ec0210}` | ✅ Detectado |
| SyslogServerProcess | `{5aa4125e-a454-60d3-051f-a31641e2a385}` | ✅ Detectado |
| NtpServerProcess | `{ec739c47-7c3a-ac95-9c1e-a3edcb1400c2}` | ✅ Detectado |

**Nota:** Todos los procesos de SRV1 existen pero son objetos opacos (solo `_parser` con uuid/className). Para leer/escribir config de servicios, usar `serializeToXml()` o CLI.

---

## 🧪 SESIÓN 3 — Descubrimiento HTTP/TCP/MD5/Process/Port (17 Junio 2026, Experimentos 37-44)

### Resumen de hallazgos experimentales

| # | Experimento | Resultado | Impacto |
|---|-------------|-----------|---------|
| 37 | `getPort(name)` con nombres parciales | ❌ Solo funciona con nombre exacto (e.g., "GigabitEthernet0/0", no "Gig0/0") | Usar nombres exactos siempre |
| 38 | `setIpSubnetMask` en Router/Switch | ❌ Falla en RouterPort y SwitchPort | Solo funciona en PC-PT y Server-PT |
| 39 | `$createHttpServer().addRouteHandler()` | ❌ "Insufficient arguments" en todas las firmas | Bug de PT o tipos Qt no expuestos |
| 39 | `$createHttpServer().start(80)` | ⚠️ OK pero isListening=false | `start(port, callback)` funciona mejor |
| 39 | `$createHttpServer().addWebSocketRouteHandler()` | ✅ Funciona con 3 args (path, method, handler) | Alternativa viable |
| 39 | `$createTcpServer().listen()` | ✅ OK, isListening=true | TCP server funcional |
| 40 | `serializeToXml()` en R1/SW1/SRV1 | ✅ XML COMPLETO (~19K/42K/61K) | Contiene TODA la config (servicios, VLANs, routing) |
| 40 | `getCommandLine()` en Router/Switch/PC | ✅ Router#, Switch>, C:\> | Windows CLI en PCs |
| 40 | `getProcess()` en R1/SRV1 | ✅ RoutingProcess, VlanManager, 7 procesos SRV1 | Procesos mapeados |
| 40 | `getPower()` en todos | ✅ Funciona como getter | Confirmado |
| 40 | `lw.addDevice()` / `lw.removeDevice()` | ✅ add retorna string, remove funciona | Gestión topología |
| 40 | `ipc.registerEvent()` | ✅ 8 eventos: deviceAdded/Removed/Modified, linkAdded/Removed, etc. | Eventos funcionales |
| 40 | `ipc.getObjectByUuid()` | ✅ Funciona | Búsqueda por UUID |
| 40 | `AssessmentModel.*` | ✅ fromBase64/toBase64, getRunningConfig (string vacío) | Solo en assessment mode |
| 40 | `$putData/$getData()`, `Base64`, `guid()` | ✅ Todos funcionan | Globals confirmados |
| 40 | `MD5.hash("test")` | ✅ "098f6bcd..." | Método estático |
| 40 | `scriptEngine.evaluate()` | ✅ Evalúa JS inline | Motor de scripts |
| 41 | `$createTcpServer()` clean | ✅ isListening=true, getServerPort=9090 | TCP server funcional |
| 41 | `$createHttpServer()` start(8080,cb) | ✅ isListening=true | HTTP server "corriendo" |
| 41 | `$createHttpServer()` addRouteHandler | ❌ "Insufficient arguments" | Confirmado bug |
| 41 | `new MD5().hash()` | ❌ TypeError: no es función | Usar MD5.hash() estático |
| 42 | `addWebSocketRouteHandler(path, method, fn)` | ✅ "OK" | ✅ Funciona con 3 args |
| 42 | `addWebSocketRouteHandler(path, fn)` | ❌ "Insufficient arguments" | Necesita 3 args |
| 42 | `http.__S0setDevice(device)` | ✅ ok | Asocia server a dispositivo |
| 42 | TCP from PC1 (telnet 127.0.0.1 7070) | ⚠️ Comando enviado pero sin conexión | Server no está en red simulada |
| 42 | `MD5.hash()` varios strings | ✅ test, cisco, admin, 123456 | Confirmado MD5 funcional |
| 43 | R1.getModel() | ✅ "2911" | Modelo accesible |
| 43 | R1.getType() | ✅ 0 (Router) | Type ID accesible |
| 43 | R1.getConfig/getRunningConfig/setConfig | ❌ No existen en proxy | Solo CLI o XML |
| 43 | R1.removeModule() | ❌ Invalid arguments | Módulos no modificables vía IPC directa |
| 43 | `lw` en contexto omni raw | ❌ ReferenceError | lw solo en contexto PT-safe |
| 43 | `scriptEngine.evaluateCall(Math.max)` | ❌ Retorna null | No funciona con funciones nativas |
| 44 | PC1/Server-PT ports | ✅ FastEthernet0 con IP/MAC, Bluetooth sin IP | Puertos mapeados |
| 44 | SRV1 ports | ✅ FastEthernet0: 192.168.1.200/24, MAC: 00D0.58B0.BC26 | Puerto principal |

### Estado de conectividad HTTP/TCP

```
Host (macOS) ──curl localhost:8080──❌ Connection refused
PT Simulation Network (PC1) ──telnet──❌ No reachable
$createHttpServer() ──isListening()──✅ true
```

### Recomendaciones

- Para configurar servicios de servidor (DHCP, HTTP, FTP, DNS): usar **`serializeToXml()`** para leer y luego **CLI** para modificar
- Para comunicación entre dispositivos PT: usar **servicios nativos** (HTTP server de SRV1, telnet entre routers)
- Para crear servidores embebidos: `$createTcpServer()` es más confiable que `$createHttpServer()` (que tiene addRouteHandler roto)
- Para hashing: usar **`MD5.hash(str)`** (estático)
- Para scripting dinámico: **`scriptEngine.evaluate(code)`** funciona para JS arbitrario
- **NUNCA** usar `for...in`, `Object.getOwnPropertyNames()` ni `Object.getPrototypeOf()` sobre proxies IPC (riesgo de SIGSEGV)

---

## 🧪 SESIÓN 4 — XML/Events/CLI/FileManager Deep Dive (17 Junio 2026, Experimento 45)

### Resumen de hallazgos

| # | Categoría | Resultado | Detalle |
|---|-----------|-----------|---------|
| 1 | **Setters Port** | ⚠️ Mixto | `setDefaultGateway` ✅, `setMtu(1500)` ✅ (getMtu retorna 1500), `setDhcpClientFlag` ✅, `setInboundFirewallService` ❌ (firma incorrecta), `setDhcpEnabled` ❌ (no existe en HostPort) |
| 2 | **Setters Device** | ✅ | `setPower(bool)` ✅, `setDhcpFlag(bool)` ✅ (getDhcpFlag confirma), `restoreToDefault` ❌ (firma incorrecta), `skipBoot` ❌ (no existe en Pc) |
| 3 | **Device Info** | ✅ | `getUpTime()` ✅ (R1=44673s, PC1=30s), `getSerialNumber()` ✅ (FTX1524FNY6-, CAT10100QP3-, PTT0810A3C7), `isBooting()` ✅ (Router) |
| 4 | **IPC Events** | ⚠️ Async | 7 eventos registrados exitosamente pero **NO se disparan durante ejecución síncrona** — son asíncronos, requieren runtime persistente |
| 5 | **Terminal Events** | ✅ Funcionan | `commandStarted`, `outputWritten`, `commandEnded`, `modeChanged`, `promptChanged` — todos se disparan. `outputWritten` se dispara múltiples veces por comando |
| 6 | **CLI Router** | ⚠️ Bug | `show running-config` y `show ip interface brief` devuelven **boot loader output** en vez del comando. R1 está en `Router>` (modo usuario). Probablemente `getOutput()` captura buffer incorrecto |
| 7 | **CLI Router mode** | ✅ | Prompt actual: `Router>` (user exec mode). Anteriormente estaba en `Router#` (cambió entre sesiones) |
| 8 | **CLI Switch** | ⚠️ Bug | `show vlan brief` devuelve **boot loader output**. `enable` sí funciona → `Switch#` |
| 9 | **CLI PC (Windows)** | ✅ | `ipconfig` funciona: muestra FastEthernet0, IPv4=0.0.0.0, Link-local IPv6. `ping` necesita salida de comando previo |
| 10 | **systemFileManager** | ✅ **Disponible!** | `getFilesInDirectory("/tmp")` = 179 archivos, `writePlainTextToFile` escribe archivos, `getFileContents` lee archivos |
| 11 | **SRV1 HTTP** | ✅ Confirmado | XML contiene `HTTP_SERVER` con `ENABLED=0` (HTTP apagado). También `HTTPS_SERVER` con `HTTPSENABLED=1` |

### Detalles por bloque

#### BLOQUE 1: XML → No hay deserialización
**No existe `deserializeFromXml()` ni `setConfig()` en ningún dispositivo.** No se puede importar XML directamente a PT. Los cambios deben aplicarse vía:
1. **Setters IPC** (setIpSubnetMask, setPower, setName, setMtu, etc.) — cambios atómicos
2. **CLI enterCommand** — cambios de configuración IOS
3. **FileManager** — escribir archivos de configuración en el host

#### BLOQUE 2: Setters — Mapa de lo que funciona

| Setter | PC-PT | Server-PT | Router | Switch |
|--------|-------|-----------|--------|--------|
| `setName(name)` | ✅ | ✅ | ✅ | ✅ |
| `setIpSubnetMask(ip,mask)` | ✅ | ✅ | ❌ | ❌ |
| `setDefaultGateway(gw)` | ✅ | ✅ | ❌ | ❌ |
| `setMtu(mtu)` | ✅ | ✅ | ❌ | ❌ |
| `setDhcpClientFlag(bool)` | ✅ | ✅ | ❌ | ❌ |
| `setDhcpEnabled(bool)` | ❌ | ❌ | ❌ | ❌ |
| `setPower(bool)` | ✅ | ✅ | ✅ | ✅ |
| `setDhcpFlag(bool)` | ✅ | ✅ | ✅ | ✅ |
| `setInboundFirewallService(s)` | ❌ | ❌ | ❌ | ❌ |

#### BLOQUE 3: Device Info API

```javascript
// Todos los dispositivos tienen:
device.getModel();       // "2911", "2960-24TT", "Server-PT", "PC-PT"
device.getType();        // 0=Router, 1=Switch, 8=PC, 9=Server
device.getUpTime();      // segundos desde boot (R1=44673, PC1=30)
device.getSerialNumber();// "FTX1524FNY6-" (R1), "PTT0810A3C7" (SRV1)

// Solo Router y Switch:
device.isBooting();      // false (ya booteado)

// SRV1 y PC1 NO tienen isBooting():
device.isBooting();      // ❌ TypeError
```

#### BLOQUE 4: IPC Events — Son ASÍNCRONOS

```javascript
// Registrar eventos (funciona)
var id = ipc.registerEvent("deviceAdded", null, handler);

// PERO: los handlers NO se ejecutan durante la ejecución síncrona del script.
// Ocurren en el event loop de PT después de que el script termina.
// Para capturarlos: necesitas runtime persistente (como main.js).

// Eventos disponibles (8 confirmados):
"deviceAdded"      // Cuando se agrega un dispositivo
"deviceRemoved"    // Cuando se elimina un dispositivo
"deviceModified"   // Cuando se modifica un dispositivo
"linkAdded"        // Cuando se agrega un enlace
"linkRemoved"      // Cuando se elimina un enlace
"canvasNoteAdded"  // Cuando se agrega una nota
"portModified"     // Cuando se modifica un puerto
"powerChanged"     // Cuando cambia el power state
```

#### BLOQUE 5: Terminal Events — SÍ funcionan en tiempo real

```javascript
var cli = device.getCommandLine();

// Eventos del terminal (confirmados):
cli.registerEvent("commandStarted", null, function(src, args) {
  // args.command = comando (pero puede ser undefined)
});
cli.registerEvent("outputWritten", null, function(src, args) {
  // args.output = fragmento de output
  // args.session = snapshot de sesión
});
cli.registerEvent("commandEnded", null, function(src, args) {
  // args.status = 0 (success) u otro
  // args.output = output completo
});
cli.registerEvent("modeChanged", null, function(src, args) {
  // args.oldMode, args.newMode
});
cli.registerEvent("promptChanged", null, function(src, args) {
  // args.oldPrompt, args.newPrompt
});
cli.registerEvent("moreDisplayed", null, handler);   // --More--
cli.registerEvent("directiveSent", null, handler);    // directiva enviada
```

**Problema con getOutput():** `cli.getOutput()` captura el buffer actual pero NO espera a que el comando termine. Como `enterCommand()` es asíncrono, `getOutput()` puede devolver datos de comandos anteriores o output parcial.

**Solución:** Usar `registerEvent("commandEnded")` para saber cuándo un comando terminó, o usar el runtime de cisco-auto que maneja la sincronización.

#### BLOQUE 6: CLI — Problema de boot loader

Los comandos `show running-config` y `show ip interface brief` en R1 devuelven **boot loader output**:
```
System Bootstrap, Version 15.1(4)M4, RELEASE SOFTWARE (fc1)
...
Readonly ROMMON initialized
program load complete, entry point: 0x80803000...
```

Causa probable: `getOutput()` está capturando OUTPUT ACUMULADO del boot. Los comandos se ejecutan asíncronamente y el buffer aún contiene datos de arranque. Se necesita limpiar el buffer o esperar a que el comando termine via eventos.

#### BLOQUE 7: FileManager — Acceso completo al filesystem

```javascript
var fm = ipc.systemFileManager();

// Leer archivos
fm.getFileContents("/tmp/pt-test-write.txt");  // "hello from PT" ✅
fm.getFilesInDirectory("/tmp");                // ["file1", "file2", ...] ✅ (179 archivos en /tmp)

// Escribir archivos
fm.writePlainTextToFile("/tmp/salida.txt", "contenido");  // ✅

// Verificar existencia
fm.fileExists("/tmp/salida.txt");              // true o path string
fm.directoryExists("/tmp");                    // true

// Directorios
fm.makeDirectory("/tmp/nuevo-dir");            // ✅
fm.removeFile("/tmp/salida.txt");              // ✅

// NO funciona en AppWindow:
aw.listDirectory("/tmp");                      // ❌ "Invalid arguments"
```

**Implicaciones:** FileManager permite leer/escribir archivos en el sistema host. Esto podría usarse para:
- Escribir configuraciones generadas desde scripts
- Leer archivos de configuración externos
- Backup de configuraciones vía serializeToXml() + writePlainTextToFile
- Implementar un sistema de "config push" donde se escribe un archivo y PT lo procesa

### Estrategia XML → PT (automatización)

1. **Leer estado**: `device.serializeToXml()` → XML completo
2. **Parsear**: `parseDeviceXml(xml)` → `ParsedDeviceXml` (puertos, VLANs, rutas, DHCP...)
3. **Modificar**: Cambiar propiedades en el objeto parseado
4. **Aplicar**: 
   - Para IPs: `port.setIpSubnetMask(newIp, mask)`
   - Para configs complejas: `cli.enterCommand("configure terminal")` + comandos IOS
   - Para servicios server: escribir archivos via FileManager + CLI
5. **Verificar**: `device.serializeToXml()` de nuevo → confirmar cambios

**No hay atajo** de importar XML directamente. PT no expone `deserializeFromXml()`. Cada cambio debe aplicarse vía setter IPC o CLI.
