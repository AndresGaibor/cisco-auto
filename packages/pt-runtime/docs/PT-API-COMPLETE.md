# Packet Tracer IPC API - Documentación Completa

> **Última actualización:** 14 Abril 2026
> **Estado:** 🎉 **FUNCIONAL** - API para topología funciona, CLI para lectura funciona

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

---

## 🔧 API DE TOPOLOGÍA (COMPLETA)

### Crear/Eliminar Dispositivos

```javascript
var lws = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();

// Crear
var r1 = lws.addDevice(0, "Router-PT", 100, 200);  // type=0 router
var s1 = lws.addDevice(1, "Switch-PT", 300, 200);  // type=1 switch
var pc1 = lws.addDevice(8, "PC-PT", 500, 200);      // type=8 pc

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

| Método | Descripción | Estado |
|--------|-------------|--------|
| **VLAN** | | |
| `getAccessVlan()` | VLAN de acceso | ✅ 1 |
| `setAccessVlan(id)` | Set VLAN acceso | ❌ Invalid |
| `getNativeVlanId()` | VLAN nativa | ✅ 1 |
| `setNativeVlanId(id)` | Set VLAN nativa | ❌ Invalid |
| **Mode** | | |
| `isAccessPort()` | ¿Modo access? | ✅ true |
| `isNonegotiate()` | ¿Sin negociación? | ✅ false |
| `setNonegotiateFlag(bool)` | Set negociation | ❌ Invalid |
| `isAdminModeSet()` | ¿Admin mode? | ✅ false |
| **Port Security** | | |
| `getPortSecurity()` | Seguridad | ✅ null |
| **Trunk** | | |
| `addTrunkVlans(vlans)` | Agregar VLANs | ❌ Invalid |
| `removeTrunkVlans(vlans)` | Remover VLANs | ❌ Invalid |
| **VoIP** | | |
| `getVoipVlanId()` | VLAN VoIP | ✅ 0 |
| `setVoipVlanId(id)` | Set VLAN VoIP | ❌ Invalid |

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

### ✅ FUNCIONA - addDevice (NUEVO)
```javascript
var lws = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
var deviceName = lws.addDevice(0, "Router-PT", 500, 300);
// Retorna: "Router1" (nombre asignado automáticamente)
```

**Modelos verificados que funcionan (14 Abril 2026):**
| typeId | Modelo | Retorna | ClassName |
|--------|--------|---------|-----------|
| 0 | `Router-PT` | ✅ "Router5" | Router |
| 0 | `2811` | ✅ "Router6" | Router |
| 0 | `2911` | ✅ "Router7" | Router |
| 0 | `1941` | ✅ "Router8" | Router |
| 1 | `Switch-PT` | ✅ "Switch1" | CiscoDevice |
| 1 | `2960-24TT` | ✅ "Switch2" | CiscoDevice |
| 8 | `PC-PT` | ✅ "PC1" | Pc |
| 9 | `Server-PT` | ✅ "Server0" | Server |
| 12 | `Laptop-PT` | ❌ null | - |
| 7 | `Cloud-PT` | ❌ null | - |

**Parámetros:**
- `typeId`: Ver PT_DEVICE_TYPE_CONSTANTS (0=router, 1=switch, 8=pc, 9=server)
- `model`: String del catálogo ("Router-PT", "2811", "2960-24TT", etc.)
- `x`, `y`: Coordenadas en canvas

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

### Device Types (PT_DEVICE_TYPE_CONSTANTS)
```javascript
PT_DEVICE_TYPE_CONSTANTS = {
  router: 0,
  switch: 1,
  hub: 2,
  repeater: 3,
  bridge: 4,
  wireless: 5,
  wanEmulator: 6,
  cloud: 7,
  pc: 8,
  server: 9,
  printer: 10,
  ipPhone: 11,
  laptop: 12,
  tablet: 13,
  smartphone: 14,
  multilayerSwitch: 16,
  wiredEndDevice: 17,
  tv: 18,
  homeVoip: 19,
  analogPhone: 20,
  iot: 21,
  sniffer: 22,
  mcu: 23,
  sbc: 24
}
```

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
device.addModule(slot, module);   // ⚠️ Por probar
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

## HALLAZGOS BOOT TEST (15 Abril 2026)

### ✅ addDevice() funciona - Los 3 modelos arrancan IOS

| Modelo | Nombre | Puerto count | Boot Status |
|--------|--------|-------------|-------------|
| 2911 | Router25 | 4 | Boot en progreso ✅ |
| 2811 | Router26 | 3 | Boot en progreso ✅ |
| 1941 | Router27 | 3 | Boot en progreso ✅ |

**Output capturado (2911 y 1941):**
```
System Bootstrap, Version 15.1(4)M4, RELEASE SOFTWARE
CISCO2911/K9 platform with 524288 Kbytes of main memory
IOS Image Load Test
Digitally Signed Release Software
Self decompressing the image : ##
```

**Output capturado (2811):**
```
System Bootstrap, Version 12.1(3r)T2
cisco 2811 (MPC860) processor
Readonly ROMMON initialized
Self decompressing the image : ##
```

### 🔍 CONCLUSIÓN BOOT
- Los routers SÍ arrancan IOS cuando se crean con `addDevice()` ✅
- El CLI funciona desde el inicio (output capturado)
- El problema del script anterior: solo esperó 1 ciclo de polling
- Los routers necesitan ~30-60 segundos para llegar a `Router>`

### Script nuevo: `pt-boot-and-module.js`
- Limpia lab y crea 2911, 2811, 1941
- Espera hasta 60s a que IOS bootee (polling real)
- Detecta prompt `Router>` o `Router#`
- Si detecta dialog inicial (`Would you like`), responde `no`
- Luego prueba `addModule()` en el primer router estable
- **En PT vacío, cargar `~/pt-dev/pt-boot-and-module.js`**

### Plan de ejecución

**Paso 1:** Abrir PT con lab vacío (sin `.pkt`)
**Paso 2:** Cargar `~/pt-dev/pt-boot-and-module.js`
**Paso 3:** Esperar hasta 60s - el script reporta cuando un router llega a IOS
**Paso 4:** Documentar resultados

### Resultados esperados

| Pregunta | Esperado |
|----------|----------|
| ¿`addDevice(2911)` crea router? | ✅ Sí |
| ¿Router arranca IOS? | ✅ Sí (30-60s) |
| ¿CLI responde desde ROMMON? | ✅ Sí |
| ¿`addModule("WIC-1T")` funciona? | 🔜 Por probar |
| ¿`addModule()` rechaza slot inválido? | 🔜 Por probar |

---

*Documentado: 15 Abril 2026*
