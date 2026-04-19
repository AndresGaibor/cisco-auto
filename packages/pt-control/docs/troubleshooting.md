# 🔧 PT Control V2 - Troubleshooting Guide

## Problemas Comunes y Soluciones

---

## 1️⃣ Error: "Invalid arguments for IPC call addDevice"

### Síntomas
```
❌ Add Switch 2960 - Failed to add switch 2960
[Runtime] IPC Call ERROR: LogicalWorkspace - Invalid arguments for IPC call "addDevice"
```

### Causas Probables

1. **Modelo incorrecto**: Usar `2960` en lugar de `2960-24TT`
2. **deviceType incorrecto**: PT no acepta el tipo de dispositivo para ese modelo
3. **Modelo no existe en catálogo PT**: El modelo no está disponible en tu versión de PT

### Soluciones

#### ✅ Solución 1: Usar modelo exacto
```typescript
// ❌ INCORRECTO
model: "2960"

// ✅ CORRECTO
model: "2960-24TT"
```

#### ✅ Solución 2: Usar alias (auto-mapeo)
El sistema convierte automáticamente:
```typescript
// Estos alias funcionan y se auto-mapean:
model: "2960"     // → "2960-24TT"
model: "3560"     // → "3560-24PS"
model: "wireless" // → "WRT300N"
```

#### ✅ Solución 3: Verificar modelo en PT
```typescript
// Listar dispositivos disponibles en PT
const result = await bridge.sendCommandAndWait("listDevices", {});
console.log(result.value.devices);
```

---

## 2️⃣ Error: "Property 'writeFile' is not a function"

### Síntomas
```
[Sessions] Failed to save to disk: TypeError: Property 'writeFile' of object [object Object] is not a function
❌ Configure Router hostname - Failed to configure router hostname
```

### Causa
El runtime estaba usando `fm.writeFile()` que no existe en PT Script Engine API.

### Solución ✅
**FIX APLICADO EN v2.0**: El runtime ahora usa `fm.writePlainTextToFile()`.

Si ves este error:
1. Regenerar el runtime:
```bash
cd packages/pt-runtime
bun run generate
cp packages/generated/runtime.js /Users/andresgaibor/pt-dev/runtime.js
```

2. Verificar que el template tiene el fix:
```javascript
// ✅ CORRECTO
fm.writePlainTextToFile(tempFile, JSON.stringify(IOS_SESSIONS, null, 2));

// ❌ INCORRECTO (legacy)
fm.writeFile(tempFile, JSON.stringify(IOS_SESSIONS, null, 2));
```

---

## 3️⃣ Error: "Failed to create link"

### Síntomas
```
❌ Link Router-Switch - Failed to create router-switch link
[handleAddLink] FAILED: createLink returned false
```

### Causas Probables

1. **Dispositivo no existe**: Uno de los dispositivos no fue creado
2. **Puerto no existe**: El puerto especificado no existe en el dispositivo
3. **Tipo de cable incorrecto**: Cable incompatible con los puertos

### Soluciones

#### ✅ Solución 1: Verificar existencia de dispositivos
```typescript
// Listar dispositivos antes de crear enlaces
const devices = await bridge.sendCommandAndWait("listDevices", {});
console.log("Dispositivos disponibles:", devices.value.devices);

// Inspeccionar dispositivo para ver puertos
const inspect = await bridge.sendCommandAndWait("inspect", { device: "R1" });
console.log("Puertos de R1:", inspect.value.ports);
```

#### ✅ Solución 2: Usar puertos válidos
```typescript
// ✅ CORRECTO - Puertos que existen en 2911
bridge.sendCommand("addLink", {
  device1: "R1",
  port1: "GigabitEthernet0/0",  // Puerto válido
  device2: "SW1",
  port2: "GigabitEthernet0/1",
  linkType: "auto"
});

// ❌ INCORRECTO - Puerto que no existe
bridge.sendCommand("addLink", {
  device1: "R1",
  port1: "FastEthernet0/0",  // 2911 no tiene FE, tiene GE
  device2: "SW1",
  port2: "GigabitEthernet0/1"
});
```

#### ✅ Solución 3: Ver puertos disponibles por dispositivo

**Routers (2811, 2911):**
```
GigabitEthernet0/0, GigabitEthernet0/1
Serial0/0/0, Serial0/0/1
```

**Switches (2960, 3560):**
```
FastEthernet0/1 - FastEthernet0/24
GigabitEthernet0/1, GigabitEthernet0/2 (uplinks)
```

**PCs/Servers:**
```
FastEthernet0
```

---

## 4️⃣ Error: "Device not found"

### Síntomas
```
❌ Configure Router hostname - Device not found: Router1
```

### Causas Probables

1. **Dispositivo no se creó**: El addDevice falló silenciosamente
2. **Nombre incorrecto**: El nombre no coincide (case-sensitive)
3. **Dispositivo fue removido**: Alguien eliminó el dispositivo

### Soluciones

#### ✅ Solución 1: Verificar creación de dispositivo
```typescript
// Después de addDevice, verificar que se creó
const addResult = await bridge.sendCommandAndWait("addDevice", {
  model: "2911",
  name: "R1"
});

if (!addResult.ok) {
  console.error("Failed to add device:", addResult.error);
  // No continuar hasta que el dispositivo exista
}

// Listar para confirmar
const listResult = await bridge.sendCommandAndWait("listDevices", {});
const exists = listResult.value.devices.some(d => d.name === "R1");
console.log("R1 exists:", exists);
```

#### ✅ Solución 2: Usar nombres únicos y consistentes
```typescript
// ✅ CORRECTO
model: "2911", name: "R1"
model: "2911", name: "Router1"

// ❌ CUIDADO: Nombres que pueden confundir
model: "2911", name: "2911"  // Se confunde con el modelo
model: "2911", name: "router"  // Muy genérico
```

---

## 5️⃣ Error: Comandos IOS fallan silenciosamente

### Síntomas
```
❌ Create VLANs on SW1 - Failed to create VLANs
[handleConfigIos] Failed to enter config mode
```

### Causas Probables

1. **Sesión IOS no inicializada**: El dispositivo no ha bootado completamente
2. **Dispositivo no soporta CLI**: Algunos dispositivos no tienen IOS
3. **Comando IOS inválido**: Sintaxis incorrecta

### Soluciones

#### ✅ Solución 1: Esperar boot completo
```typescript
// Después de addDevice, esperar 2-3 segundos
await bridge.sendCommandAndWait("addDevice", { model: "2911", name: "R1" });
await new Promise(resolve => setTimeout(resolve, 3000));  // Esperar boot

// Ahora sí configurar
await bridge.sendCommandAndWait("configIos", {
  device: "R1",
  commands: ["hostname MainRouter"]
});
```

#### ✅ Solución 2: Verificar que el dispositivo soporta CLI
```typescript
// Inspeccionar dispositivo
const inspect = await bridge.sendCommandAndWait("inspect", { device: "R1" });

// Dispositivos con CLI: routers, switches L3
// Dispositivos sin CLI: PCs, servers, printers (usan configHost)
```

#### ✅ Solución 3: Usar configHost para end devices
```typescript
// ❌ INCORRECTO - PC no tiene IOS
bridge.sendCommand("configIos", {
  device: "PC1",
  commands: ["hostname PC1"]  // Esto falla
});

// ✅ CORRECTO - Usar configHost para PCs/servers
bridge.sendCommand("configHost", {
  device: "PC1",
  ip: "192.168.10.100",
  mask: "255.255.255.0",
  gateway: "192.168.10.1",
  dns: "8.8.8.8"
});
```

---

## 6️⃣ Error: "setX/setY not available"

### Síntomas
```
❌ Move device - Failed to move device: setX/setY not available in this PT API version
```

### Causa
Algunas versiones de PT no exponen `setX/setY` directamente en el dispositivo.

### Solución ✅
El sistema intenta múltiples métodos:
1. `device.setX/setY` directo
2. `device.logicalPosition.setX/setY`
3. Búsqueda en prototype chain

Si todos fallan, el movimiento no es posible en tu versión de PT.

**Workaround:** Mover dispositivo manualmente en PT o recrear en nueva posición:
```typescript
// Remover y recrear en nueva posición
await bridge.sendCommandAndWait("removeDevice", { name: "R1" });
await bridge.sendCommandAndWait("addDevice", {
  model: "2911",
  name: "R1",
  x: 200,  // Nueva posición
  y: 200
});
```

---

## 7️⃣ Error: PT no responde / Timeout

### Síntomas
```
❌ Basic snapshot - Timeout after 15000ms
[PT] No heartbeat detected for >15s
```

### Causas Probables

1. **PT no está corriendo**: Packet Tracer cerrado o crash
2. **Script no cargado**: El módulo de scripting no está activo en PT
3. **Directorio incorrecto**: pt-dev no existe o permisos incorrectos

### Soluciones

#### ✅ Solución 1: Verificar PT corriendo
```bash
# macOS
ps aux | grep -i "packet tracer"

# Deberías ver procesos de Packet Tracer
```

#### ✅ Solución 2: Cargar script en PT
1. Abrir Packet Tracer
2. Ir a `File` > `Open` o `Advanced` > `Scripting`
3. Seleccionar `/Users/andresgaibor/pt-dev/main.js`
4. El script debería iniciar automáticamente

#### ✅ Solución 3: Verificar logs de PT
```bash
# Ver logs en tiempo real
tail -f /Users/andresgaibor/pt-dev/logs/*.log

# Deberías ver:
# [PT] Starting...
# [PT] Runtime loaded OK
# [PT] Ready - polling for commands
```

---

## 📋 Checklist de Debugging

Cuando algo no funciona, seguir esta checklist:

### 1. Verificar Infraestructura
- [ ] PT está corriendo
- [ ] main.js cargado en PT
- [ ] Directorio pt-dev existe
- [ ] Archivos main.js y runtime.js existen

### 2. Verificar Dispositivos
- [ ] Listar dispositivos: `listDevices`
- [ ] Inspeccionar dispositivo: `inspect {device}`
- [ ] Verificar puertos disponibles

### 3. Verificar Enlaces
- [ ] Ambos dispositivos existen
- [ ] Puertos existen y son compatibles
- [ ] Tipo de cable es correcto

### 4. Verificar Configuración
- [ ] Dispositivo soporta CLI (router/switch)
- [ ] Esperar boot completo (2-3s después de addDevice)
- [ ] Comandos IOS son válidos

### 5. Verificar Logs
- [ ] Logs de PT: `/Users/andresgaibor/pt-dev/logs/`
- [ ] Output de consola del test
- [ ] Mensajes de error específicos

---

## 🆘 Obtener Ayuda

Si ningún troubleshooting funciona:

1. **Habilitar logging detallado:**
```typescript
const bridge = new FileBridgeV2({
  root: PT_DEV_DIR,
  consumerId: "debug-tester",
  autoSnapshotIntervalMs: 3000,
  heartbeatIntervalMs: 1500,
});

// Suscribirse a todos los eventos
bridge.on("*", (event) => {
  console.log("[EVENT]", event.type, JSON.stringify(event, null, 2));
});
```

2. **Ejecutar en modo dry-run:**
```bash
bun run exhaustive-pt-test.ts --dry-run
```

3. **Revisar logs completos:**
```bash
cat /Users/andresgaibor/pt-dev/logs/*.log | tail -100
```

---

## 🔗 Documentos Relacionados

- [PT_CONTROL_ARCHITECTURE.md](./PT_CONTROL_ARCHITECTURE.md) - Arquitectura
- [PT_CONTROL_MODELS.md](./PT_CONTROL_MODELS.md) - Modelos soportados
- [PT_CONTROL_HANDLERS.md](./PT_CONTROL_HANDLERS.md) - Referencia de handlers
