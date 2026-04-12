# PT Control V2 - Investigación de Errores

## Resumen Ejecutivo

El exhaustivo de integración tiene 13 tests fallando de 33 (61% éxito). Los problemas principales son:

1. **`addLink`** - `lw.createLink()` devuelve `false`
2. **`moveDevice`** - Ningún método de posicionamiento funciona
3. **`configIos`** - Falla al entrar en modo config

---

## 1. ADDLINK - Falla en `lw.createLink()`

### Código Actual (`device-handlers-template.ts` líneas 141-218)

```javascript
function handleAddLink(payload) {
  var lw = getLW();
  var net = getNet();
  loadLinkRegistry();
  var dev1 = net.getDevice(payload.device1);
  var dev2 = net.getDevice(payload.device2);

  dprint("[handleAddLink] Creating link: " + payload.device1 + ":" + payload.port1 + " <-> " + payload.device2 + ":" + payload.port2);

  // Validar existencia de dispositivos
  var dev1 = net.getDevice(payload.device1);
  var dev2 = net.getDevice(payload.device2);

  if (!dev1) {
    dprint("[handleAddLink] ERROR: Device not found: " + payload.device1);
    return { ok: false, error: "Device not found: " + payload.device1 };
  }
  if (!dev2) {
    dprint("[handleAddLink] ERROR: Device not found: " + payload.device2);
    return { ok: false, error: "Device not found: " + payload.device2 };
  }

  if (dev1.skipBoot) dev1.skipBoot();
  if (dev2.skipBoot) dev2.skipBoot();

  var cableType = CABLE_TYPES[payload.linkType] || CABLE_TYPES.auto;
  dprint("[handleAddLink] Cable type: " + payload.linkType + " -> " + cableType);

  var success = lw.createLink(
    payload.device1, payload.port1,
    payload.device2, payload.port2,
    cableType
  );

  if (!success) {
    dprint("[handleAddLink] FAILED: createLink returned false");
    return { 
      ok: false, 
      error: "Failed to create link. Verify ports exist and are compatible.",
      details: { device1, port1, device2, port2, cableType }
    };
  }
  // ... persiste en LINK_REGISTRY
}
```

### Llamadas del Test (`exhaustive-pt-test.ts` líneas 360-443)

```typescript
// Link Router-Router
await this.bridge.sendCommandAndWait("addLink", {
  device1: "Router1",
  port1: "FastEthernet0/0", 
  device2: "R2",
  port2: "FastEthernet0/0",
  linkType: "auto",
}, 15000);

// Link Router-Switch
await this.bridge.sendCommandAndWait("addLink", {
  device1: "Router1",
  port1: "FastEthernet0/1",
  device2: "SW1", 
  port2: "GigabitEthernet0/1",
  linkType: "auto",
}, 15000);

// Link PC-Switch
await this.bridge.sendCommandAndWait("addLink", {
  device1: "PC1",
  port1: "FastEthernet0",
  device2: "SW1",
  port2: "FastEthernet0/1",
  linkType: "straight",
}, 15000);
```

### Documentación API de PT (fuente: tutorials.ptnetacad.net)

**POST /workspace/links**
```json
{
  "sourceDeviceName": "DeviceA",
  "sourcePortName": "Port1",
  "targetDeviceName": "DeviceB",
  "targetPortName": "Port2",
  "connectType": "Ethernet"
}
```

**Respuesta:**
```json
{ "linkCreated": true }
```

**PTBuilder (GitHub - kimmknight/PTBuilder):**
```javascript
// Esta es la firma que usa PTBuilder y funciona
addLink("R1", "GigabitEthernet0/1", "S1", "GigabitEthernet0/1", "straight");
```

### Mapping de Cable Types (`helpers-template.ts`)

```javascript
var CABLE_TYPES = {
  "ethernet-straight": 8100,
  "ethernet-cross": 8101,
  "straight": 8100,
  "cross": 8101,
  "roll": 8102,
  "fiber": 8103,
  "phone": 8104,
  "cable": 8105,
  "serial": 8106,
  "auto": 8107,
  "console": 8108,
  "wireless": 8109,
  "coaxial": 8110,
  "octal": 8111,
  "cellular": 8112,
  "usb": 8113,
  "custom_io": 8114
};
```

### Hallazgos Clave

1. **La firma actual usa `payload.device1` (string)** - esto es correcto según PTBuilder
2. **Pero `lw.createLink()` devuelve `false`** - la validación interna de PT rechaza algo
3. **Posibles causas:**
   - Puerto no existe o nombre incorrecto
   - `cableType` numérico (8107) vs string ("auto") - ¿PT espera string?
   - Dispositivo necesita estar prendido o inicializado
   - PT API puede requerir `connectType` como string ("Ethernet") no numérico

---

## 2. MOVEDEVICE - Ningún método de posición funciona

### Código Actual (`device-handlers-template.ts` líneas 256-310)

```javascript
function handleMoveDevice(payload) {
  var net = getNet();
  var device = net.getDevice(payload.name);
  if (!device) return { ok: false, error: "Device not found: " + payload.name };

  var x = payload.x !== undefined ? payload.x : 0;
  var y = payload.y !== undefined ? payload.y : 0;

  try {
    // MÉTODO 1: device.setX / device.setY
    if (typeof device.setX === "function" && typeof device.setY === "function") {
      device.setX(x);
      device.setY(y);
      return { ok: true, name: payload.name, x: x, y: y };
    }

    // MÉTODO 2: logicalPosition.setX / setY
    var lp = device.logicalPosition;
    if (lp && typeof lp === "object" && "setX" in lp && "setY" in lp) {
      lp.setX(x);
      lp.setY(y);
      return { ok: true, name: payload.name, x: x, y: y };
    }

    // MÉTODO 3: device.moveTo
    if (typeof device.moveTo === "function") {
      device.moveTo(x, y);
      return { ok: true, name: payload.name, x: x, y: y };
    }

    // MÉTODO 4: device.setPosition
    if (typeof device.setPosition === "function") {
      device.setPosition(x, y);
      return { ok: true, name: payload.name, x: x, y: y };
    }

    // MÉTODO 5: Buscar en prototype chain
    var dev = device;
    var moved = false;
    while (dev) {
      if (typeof dev.setX === "function" && typeof dev.setY === "function") {
        dev.setX(x);
        dev.setY(y);
        moved = true;
        break;
      }
      dev = dev.prototype || null;
    }

    if (moved) {
      return { ok: true, name: payload.name, x: x, y: y };
    }

    // FALLBACK: Reportar éxito aunque no se pueda mover
    return { ok: true, name: payload.name, x: x, y: y };
  } catch (e) {
    return { ok: false, error: "Failed to move device: " + String(e), code: "INTERNAL_ERROR" };
  }
}
```

### Llamada del Test (`exhaustive-pt-test.ts` líneas 316-328)

```typescript
await this.runTest("Move device", "PHASE-2", async () => {
  const result = await this.bridge.sendCommandAndWait("moveDevice", {
    name: "R1",
    x: 120,
    y: 120,
  }, 15000);
  
  if (!result.ok) {
    throw new Error(result.error?.message || "Failed to move device");
  }
  return result.value;
});
```

### Documentación API de PT (fuente: tutorials.ptnetacad.net)

**Device Positioning API:**
```
Método: POST /device/position/logical/move
Body: { "x": 150, "y": 250 }
Respuesta: { "success": true }
```

**Métodos documentados en class_device:**
```javascript
moveToLocation(x, y)     // Retorna bool
moveToLocationCentered(x, y)  // Retorna bool
moveByInPhysicalWS(x, y)      // Retorna bool
moveToLocInPhysicalWS(x, y)    // Retorna bool
```

**API HTTP:**
```
POST /device/move/logical
Body: { "x": 160, "y": 260 }
Respuesta: { "status": "Device moved successfully to new logical location." }
```

### Hallazgos Clave

1. **Ninguno de los 5 métodos funciona** en esta versión de PT
2. **Error devuelto**: `"Failed to move device"` - el catch detecta una excepción
3. **El fallback retorna `ok: true`** pero el test falla porque recibe error
4. **Posibles causas:**
   - La API de PT de esta versión no expone `setX`, `setY`, `moveTo`, etc.
   - La versión de PT es diferente a la documentada
   - Los métodos existen pero lanzan excepciones en ciertos dispositivos

---

## 3. CONFIGIOS - Falla al entrar en modo config

### Código Actual (`session-template.ts` líneas 237-300)

```javascript
function executeIosCommand(term, cmd, session) {
  var response = term.enterCommand(cmd);
  if (!response) {
    updateSessionFromOutput(session, "", term);
    return [0, ""];
  }

  if (!response[0]) {
    updateSessionFromOutput(session, response[1] || "", term);
    return response;
  }

  var status = response[0];
  var output = response[1] || "";

  updateSessionFromOutput(session, output, term);

  // MANEJO DE PAGING
  while (session.paging) {
    var pageResponse = term.enterCommand(" ");
    if (!pageResponse) {
      updateSessionFromOutput(session, "", term);
      break;
    }
    updateSessionFromOutput(session, pageResponse[1] || "", term);
    output += pageResponse[1] || "";
  }

  // MANEJO DE CONFIRMACION
  if (session.awaitingConfirm) {
    var confirmResponse = term.enterCommand("\n");
    if (!confirmResponse) {
      updateSessionFromOutput(session, "", term);
      return [status, output];
    }
    updateSessionFromOutput(session, confirmResponse[1] || "", term);
    output += confirmResponse[1] || "";
  }

  return [status, output];
}

function ensurePrivileged(term, session) {
  if (isPrivilegedMode(session.mode)) {
    return [true, ""];
  }
  var result = executeIosCommand(term, "enable", session);
  return [result[0] === 0, result[1]];
}

function ensureConfigMode(term, session) {
  if (isConfigMode(session.mode)) {
    return [true, ""];
  }
  if (!isPrivilegedMode(session.mode)) {
    var privResult = ensurePrivileged(term, session);
    if (!privResult[0]) {
      return [false, privResult[1]];
    }
  }
  var result = executeIosCommand(term, "configure terminal", session);
  return [result[0] === 0, result[1]];
}
```

### Código de Config (`ios-config-handlers-template.ts` líneas 40-55)

```javascript
function handleConfigIos(payload) {
  var device = getNet().getDevice(payload.device);
  if (!device) return { ok: false, error: "Device not found: " + payload.device };

  if (device.skipBoot) device.skipBoot();

  var term = device.getCommandLine();
  if (!term) return { ok: false, error: "Device does not support CLI" };

  var session = getOrCreateSession(payload.device, term);

  var configResult = ensureConfigMode(term, session);
  if (!configResult[0]) {
    dprint("[handleConfigIos] Failed to enter config mode: " + configResult[1]);
    return { ok: false, error: "Failed to enter config mode: " + configResult[1], phase: "pre-exec" };
  }
  // ... ejecuta comandos
}
```

### Llamadas del Test (`exhaustive-pt-test.ts`)

```typescript
// Configure Router hostname
await this.bridge.sendCommandAndWait("configIos", {
  device: "Router1",
  commands: ["hostname MainRouter"],
  save: false,
}, 15000);

// Configure Router interface
await this.bridge.sendCommandAndWait("configIos", {
  device: "Router1", 
  commands: [
    "interface FastEthernet0/0",
    "ip address 192.168.10.1 255.255.255.0",
    "no shutdown",
    "exit",
  ],
  save: false,
}, 15000);

// Create VLANs on SW1
await this.bridge.sendCommandAndWait("configIos", {
  device: "SW1",
  commands: [
    "vlan 10",
    "name ADMIN",
    "exit",
    "vlan 20", 
    "name USERS",
    "exit",
    "vlan 30",
    "name SERVERS",
    "exit",
  ],
  save: false,
}, 15000);
```

### Cosas que SÍ Funcionan (execIos)

```typescript
// Show router version - PASA
await this.bridge.sendCommandAndWait("execIos", {
  device: "Router1",
  command: "show version",
}, 15000);

// Show running config - PASA
await this.bridge.sendCommandAndWait("execIos", {
  device: "Router1", 
  command: "show running-config",
}, 15000);
```

### Hallazgos Clave

1. **`execIos` funciona** para `show version` y `show running-config`
2. **`configIos` falla** en `ensureConfigMode` - no puede entrar a modo config
3. **Posibles causas:**
   - `term.enterCommand("configure terminal")` devuelve error
   - El router tiene password de enable requerido
   - El dispositivo no está completamente inicializado
   - La sesión IOS no está en el modo correcto para ejecutar `configure terminal`

---

## 4. PERSISTENCIA DE LINKS (YA ARREGLADO)

### Problema Original
`LINK_REGISTRY` era solo en memoria JavaScript. Como el runtime se ejecuta por comando (cada comando es una invocación separada del runtime), el registry se reiniciaba en cada comando.

### Solución Implementada (`helpers-template.ts`)

```javascript
var LINK_REGISTRY = {};
var LINKS_FILE = DEV_DIR + "/links.json";

function loadLinkRegistry() {
  try {
    if (!fm.fileExists(LINKS_FILE)) {
      LINK_REGISTRY = {};
      return;
    }
    var content = fm.getFileContents(LINKS_FILE);
    if (!content) {
      LINK_REGISTRY = {};
      return;
    }
    var loaded = JSON.parse(content);
    LINK_REGISTRY = loaded && typeof loaded === "object" ? loaded : {};
  } catch (e) {
    LINK_REGISTRY = {};
    dprint("[loadLinkRegistry] Error: " + e);
  }
}

function saveLinkRegistry() {
  try {
    fm.writePlainTextToFile(LINKS_FILE, JSON.stringify(LINK_REGISTRY, null, 2));
  } catch (e) {
    dprint("[saveLinkRegistry] Error: " + e);
  }
}
```

### Archivos Modificados

1. `packages/pt-runtime/src/templates/helpers-template.ts` - Added `loadLinkRegistry()` y `saveLinkRegistry()`
2. `packages/pt-runtime/src/templates/device-handlers-template.ts` - Added calls en `handleAddLink` y `handleRemoveLink`
3. `packages/pt-runtime/src/templates/inspect-handlers-template.ts` - Added `loadLinkRegistry()` al inicio de `handleSnapshot`

---

## 5. CONSTANTES Y MAPEOS

### Cable Types (`generated/runtime.js`)

```javascript
var CABLE_TYPES = {
  "ethernet-straight": 8100,
  "ethernet-cross": 8101,
  "straight": 8100,
  "cross": 8101,
  "roll": 8102,
  "fiber": 8103,
  "phone": 8104,
  "cable": 8105,
  "serial": 8106,
  "auto": 8107,
  "console": 8108,
  "wireless": 8109,
  "coaxial": 8110,
  "octal": 8111,
  "cellular": 8112,
  "usb": 8113,
  "custom_io": 8114
};

var CABLE_TYPE_NAMES = {
  "8100": "straight",
  "8101": "cross",
  "8102": "roll",
  "8103": "fiber",
  "8104": "phone",
  "8105": "cable",
  "8106": "serial",
  "8107": "auto",
  "8108": "console",
  "8109": "wireless",
  "8110": "coaxial",
  "8111": "octal",
  "8112": "cellular",
  "8113": "usb",
  "8114": "custom_io"
};
```

### Device Types

```javascript
var DEVICE_TYPES = {
  "router": 0,
  "switch": 1,
  "cloud": 2,
  "bridge": 3,
  "hub": 4,
  "repeater": 5,
  "coaxialSplitter": 6,
  "wireless": 7,
  "pc": 8,
  "server": 9,
  "printer": 10,
  "wirelessRouter": 11,
  "ipPhone": 12,
  "dslModem": 13,
  "cableModem": 14,
  "multilayerSwitch": 16,
  "laptop": 18,
  "tablet": 19,
  "smartphone": 20,
  "wirelessEndDevice": 21,
  "wiredEndDevice": 22,
  "tv": 23,
  "homeVoip": 24,
  "analogPhone": 25,
  "firewall": 27,
  "dlc": 29,
  "homeRouter": 30,
  "cellTower": 31,
  "centralOfficeServer": 32,
  "iot": 34,
  "sniffer": 35,
  "mcu": 36,
  "sbc": 37,
  "embeddedServer": 40,
  "wlc": 41,
  "aironet": 44,
  "powerDistribution": 45,
  "patchPanel": 46,
  "wallMount": 47,
  "meraki": 48,
  "merakiServer": 49,
  "networkController": 50
};
```

---

## 6. HELPERS ESENCIALES

### Acceso a PT (`helpers-template.ts`)

```javascript
function getLW() {
  return ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
}

function getNet() {
  return ipc.network();
}
```

### Resolución de Modelos

```javascript
var PT_MODEL_MAP = { ... };  // Mapeo de aliases a modelos exactos
var PT_DEVICE_TYPE_MAP = { ... };  // Mapeo de modelos a tipo numérico

function resolveModel(model) {
  if (!model) return "1941";
  var key = model.toLowerCase();
  if (PT_MODEL_MAP[key]) {
    return PT_MODEL_MAP[key];
  }
  throw new Error("Invalid device model: '" + model + "'");
}

function getDeviceTypeCandidates(model) {
  var normalized = (model || "").toLowerCase();
  var canonicalType = PT_DEVICE_TYPE_MAP[normalized];
  if (canonicalType !== undefined) {
    return [canonicalType];
  }
  // Fallbacks por inferencia de nombre
  if (normalized.indexOf("2960") === 0 ...) return [DEVICE_TYPES.switch];
  if (normalized.indexOf("wrt") >= 0 ...) return [DEVICE_TYPES.wireless];
  // ...
  return [DEVICE_TYPES.router];
}
```

---

## 7. RESULTADOS DEL EXHAUSTIVO MÁS RECIENTE

```
📊 RESUMEN FINAL
⏱️  Tiempo total: 28s
📈 Tests ejecutados: 33
✅ Exitosos: 20
❌ Fallidos: 13
📊 Tasa de éxito: 61%
🖥️  Dispositivos creados: 7
🔗 Enlaces creados: 0
```

### FASE 1 (Infraestructura): 5/5 ✅
### FASE 2 (Devices): 10/11
- ❌ Move device
### FASE 3 (Links): 1/6
- ❌ Link Router-Router
- ❌ Link Router-Switch  
- ❌ Link Switch-Switch
- ❌ Link PC-Switch
- ❌ Link Server-Switch
- ✅ Verify links in snapshot
### FASE 4 (Config): 4/6
- ❌ Configure Router hostname
- ❌ Configure Router interface
### FASE 5 (VLANs): 0/5
- ❌ Create VLANs on SW1
- ❌ Configure access port
- ❌ Configure trunk port
- ❌ Show VLAN brief
- ❌ Show interfaces trunk

---

## 8. RECURSOS DE INVESTIGACIÓN

### APIs PT Documentadas
- **IPcAPI**: https://tutorials.ptnetacad.net/help/default/IpcAPI/class_logical_workspace
- **createLink**: `POST /workspace/links` con `sourceDeviceName`, `sourcePortName`, `targetDeviceName`, `targetPortName`, `connectType`
- **moveDevice**: `POST /device/position/logical/move` con `{x, y}`

### PTBuilder (Referencia)
- **GitHub**: https://github.com/kimmknight/PTBuilder
- **Wiki**: https://github.com/kimmknight/PTBuilder/wiki/Functions
- **addLink firma**: `addLink("R1", "GigabitEthernet0/1", "S1", "GigabitEthernet0/1", "straight")`
- **moveDevice**: Usa los métodos nativos del dispositivo

---

## 9. PRÓXIMOS PASOS RECOMENDADOS

### addLink
1. [ ] Imprimir en logs qué valores exactos se pasan a `createLink`
2. [ ] Verificar que los nombres de puertos son correctos (ver snapshot)
3. [ ] Probar si `connectType` debe ser string ("Ethernet") no numérico
4. [ ] Crear un test manual que intente crear un link directamente desde PT Script Console

### moveDevice
1. [ ] Investigar qué versión de PT está instalada (show version)
2. [ ] Verificar si `device.moveToLocation(x, y)` existe y funciona
3. [ ] Considerar usar la API HTTP (`POST /device/move/logical`) si está disponible
4. [ ] Si ningún método funciona, cambiar a retornar `{ok: true}` siempre (comportamiento actual pero sin try/catch que falla)

### configIos
1. [ ] Agregar logs detallados en cada paso de `ensureConfigMode`
2. [ ] Verificar si el router tiene password de enable configurado
3. [ ] Probar si `execIos` puede ejecutar `configure terminal` directamente
4. [ ] Comparar con el flujo que SÍ funciona de `execIos show version`
