# Packet Tracer IPC API - Documentación Completa

> **Fuente de verdad:** `docs/pt-script-result.json` (generado 2026-04-15 con 12 dispositivos seed)
> Este extractor produce JSON y TXT con la API real inspeccionada en PT.

> **Última actualización:** 15 Abril 2026
> **Estado:** ⚠️ **Parcial** — secciones con ⚠️ no verificadas vs dump

---

## 📋 RESUMEN EJECUTIVO (14 Abril 2026)

### ✅ FUNCIONA PERFECTAMENTE

| Categoría | Métodos |
|-----------|---------|
| **Topología** | `addDevice()`, `removeDevice()`, `autoConnectDevices()`, `deleteLink()` |
| **Inventario** | `net.getDeviceCount()`, `net.getLinkCount()`, `net.getDeviceAt()`, `net.getLinkAt()` |
| **Interfaces** | `device.getPortCount()`, `device.getPortAt()`, `port.getIpAddress()`, `port.getSubnetMask()` |
| **CLI Read** | `cli.enterCommand("show version")`, `cli.getOutput()` |
| **Device Mgmt** | `device.setName()`, `device.moveToLocation()`, `device.getXCoordinate()`, `device.getYCoordinate()` |
| **Archivo** | `app.fileSave()`, `app.fileOpen()`, `app.fileSaveAs()` |

### ⚠️ LIMITACIONES

| Categoría | Problema | Workaround |
|-----------|---------|------------|
| Routers nuevos | No cargan IOS (ROMMON) | Usar routers existentes en .pkt |
| CLI Config | Buffer mezclado | Usar solo para `show` |
| Configurar IPs | `setIpSubnetMask()` falla | No hay workaround |
| Cloud-PT | type=7 retorna null | No usar con addDevice() |
| Laptop-PT | type=12 retorna null | No usar con addDevice() |

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

### Eventos y superficies útiles

- Terminal/CLI: `commandStarted`, `outputWritten`, `commandEnded`, `modeChanged`, `promptChanged`, `moreDisplayed`
- Puerto: `ipChanged`, `powerChanged`, `linkStatusChanged`, `protocolStatusChanged`, `mtuChanged`
- Workspace: `deviceAdded`, `deviceRemoved`, `deviceMoved`, `linkCreated`, `linkDeleted`, `clusterAdded`, `canvasNoteAdded`, `canvasNoteDeleted`
- Proceso: `poolAdded`, `poolRemoved`, `leaseAcquired`, `leaseExpired`, `vlanCreated`, `vlanDeleted`, `stpTopologyChanged`

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

## ⚠️ LIMITACIONES (14 Abril 2026)
| Crear topología | `addDevice()` | ✅ Funciona |
| Conectar | `autoConnectDevices()` | ✅ Funciona |
| Configurar IPs | API `setIpSubnetMask()` | ❌ Falla |
| Configurar IPs | CLI `ip address` | ⚠️ Buggy |
| Leer config | CLI `show` | ✅ Funciona |

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

### HALLAZGO: Métodos SET fallan con "Invalid arguments"
```
setIpSubnetMask(ip, mask) => ERROR: Invalid arguments for IPC call
setBandwidth(kbps) => ERROR: Invalid arguments for IPC call
setPower(bool) => ERROR: Invalid arguments for IPC call
```

**Solo métodos GET funcionan:**
- `getIpAddress()` → 0.0.0.0
- `getSubnetMask()` → 0.0.0.0
- `getBandwidth()` → 100000
- `getMtu()` → 1500
- `getMacAddress()` → 0001.C767.1448
- etc.

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

### LogicalWorkspace - Métodos Completos Descubiertos (14 Abril 2026)
```
addCluster, addNote, addRemoteNetwork, addTextPopup, autoConnectDevices,
centerOn, changeNoteText, clearLayer, createLink, deleteLink, drawCircle,
drawLine, getCanvasEllipseIds, getCanvasItemIds, getCanvasLineIds,
getCanvasNoteIds, getCanvasPolygonIds, getCanvasRectIds, getCluster,
getRectItemData, getWorkspaceImage, removeCanvasItem, removeCluster,
removeDevice, removeRemoteNetwork, removeTextPopup, setCanvasItemRealPos,
setDeviceCustomImage, showClusterContents, unCluster
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
| `setIpSubnetMask(ip, mask)` | **Configurar IP** | ❌ No probado |
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

*Documentado: 15 Abril 2026 | Actualizado: 16 Abril 2026 (149 addDevice + QtScript fixes)*
*Verificado contra: docs/pt-script-result.json (dump 2026-04-15)*
