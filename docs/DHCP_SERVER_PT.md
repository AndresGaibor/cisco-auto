# DHCP en Server-PT - Guía de Implementación

## Problema Original

El comando `bun run pt dhcp-server apply DHCP_SERVER` no funcionaba para configurar pools DHCP en un servidor Server-PT. El handler `handleConfigDhcpServer` usaba APIs incorrectas de Packet Tracer.

## Hallazgos Clave

### 1. API de DhcpServerProcess en Server-PT

**Descubrimiento**: `Server-PT` SÍ tiene el proceso `DhcpServerMainProcess` accesible via `device.getProcess()`.

**Proceso correcto**:
```javascript
var mainProc = device.getProcess("DhcpServerMainProcess");
var dhcpProc = mainProc.getDhcpServerProcessByPortName("FastEthernet0");
dhcpProc.setEnable(true);
```

### 2. Helper de Descubrimiento de Procesos

Packet Tracer puede usar diferentes nombres de proceso según la versión. Usar fallback:

```javascript
function tryGetProcess(dev, names) {
  for (var i = 0; i < names.length; i++) {
    try {
      var p = dev.getProcess(names[i]);
      if (p) return { name: names[i], process: p };
    } catch (e) {}
  }
  return null;
}

// Uso:
var result = tryGetProcess(device, [
  "DhcpServerMainProcess",
  "DHCPServerMainProcess",
  "DhcpServerMain"
]);
```

### 3. Creación de Pools - API Correcta

**ERROR común**: `addNewPool(name)` retorna `void`, no el pool creado.

**Solución correcta**: Usar `addPool()` + `getPool()` + setters:

```javascript
dhcpServerProcess.addPool(poolConfig.name);
var pool = dhcpServerProcess.getPool(poolConfig.name);
if (pool) {
  pool.setNetworkAddress(poolConfig.network);
  pool.setNetworkMask(poolConfig.network, poolConfig.mask); // 2 ARGUMENTOS
  pool.setDefaultRouter(poolConfig.defaultRouter);
  pool.setDnsServerIp(poolConfig.dns);
  pool.setStartIp(poolConfig.startIp);
  pool.setEndIp(poolConfig.endIp);
  pool.setMaxUsers(poolConfig.maxUsers);
}
```

### 4. Firmas de Métodos Correctas

| Método | Firma Correcta | Error Común |
|--------|----------------|-------------|
| `setNetworkMask` | `(network, mask)` | `setNetworkMask(mask)` (1 arg) |
| `getPoolName` | `getDhcpPoolName()` | `getPoolName()` |
| `getNetworkMask` | `getSubnetMask()` | `getNetworkMask()` |

### 5. Conflictos con Variables Prohibidas

El nombre `process` está prohibido como variable global en el runtime (conflicta con el global `process`). Renombrar a `proc`:

```javascript
// MAL:
var process = device.getProcess("DhcpServerMainProcess");

// BIEN:
var proc = device.getProcess("DhcpServerMainProcess");
```

## Estructura del Payload para configDhcpServer

```json
{
  "device": "DHCP_SERVER",
  "port": "FastEthernet0",
  "enabled": true,
  "excluded": [
    { "start": "192.168.10.1", "end": "192.168.10.10" },
    { "start": "192.168.20.1", "end": "192.168.20.10" }
  ],
  "pools": [
    {
      "name": "ADMIN",
      "network": "192.168.10.0",
      "mask": "255.255.255.0",
      "defaultRouter": "192.168.10.1",
      "dns": "192.168.40.10",
      "startIp": "192.168.10.11",
      "endIp": "192.168.10.254",
      "maxUsers": 244
    },
    {
      "name": "USERS",
      "network": "192.168.20.0",
      "mask": "255.255.255.0",
      "defaultRouter": "192.168.20.1",
      "dns": "192.168.40.10",
      "startIp": "192.168.20.11",
      "endIp": "192.168.20.254",
      "maxUsers": 244
    }
  ]
}
```

## Comando CLI

```bash
bun run pt dhcp-server apply DHCP_SERVER \
  --enabled true \
  --pool "ADMIN,192.168.10.0,255.255.255.0,192.168.10.1" \
  --pool "USERS,192.168.20.0,255.255.255.0,192.168.20.1"
```

## Verificación

```bash
# Inspeccionar pools configurados
bun run pt dhcp-server inspect DHCP_SERVER

# Verificar que PCs reciben IPs
bun run pt device get PC1  # Debe mostrar IP del pool ADMIN
bun run pt device get PC4  # Debe mostrar IP del pool USERS
```

## Topología Típica

```
                    ┌─────────────────┐
                    │   DHCP_SERVER   │
                    │   (Server-PT)   │
                    │  192.168.40.10  │
                    └────────┬────────┘
                             │ VLAN 40 (trunk)
                    ┌────────┴────────┐
                    │       R1        │
                    │   (2911 Router) │
                    │  Gi0/0.10 (SVI) │──► 192.168.10.1 (VLAN 10)
                    │  Gi0/0.20 (SVI) │──► 192.168.20.1 (VLAN 20)
                    └────────┬────────┘
                             │ trunk
                    ┌────────┴────────┐
                    │       SW1        │
                    │   (2960-24TT)    │
              ┌─────┴─────┬───────────┴─────┐
              │ Fa0/1-3   │ Fa0/4-6        │
           VLAN 10       VLAN 20           │
         ┌───┬───┐    ┌───┬───┬───┐        │
         │PC1│PC2│    │PC4│PC5│PC6│        │
         └───┴───┘    └───┴───┴───┘        │
```

## Issues Pendientes

1. **`inspectDhcpServer` muestra "Habilitado: No"** pero los PCs reciben IPs correctamente. El getter `isEnabled()` puede no existir o retornar incorrecto.

2. **Pool aparece como "serverPool"** en lugar del nombre configurado ("ADMIN"). Puede ser un problema de cómo se lee el nombre del pool.

## Referencias

- [Packet Tracer Extensions API - DhcpServerProcess](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_dhcp_server_process.html)
- [Packet Tracer Extensions API - DhcpPool](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_dhcp_pool.html)
- [Packet Tracer Extensions API - DhcpServerMainProcess](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_dhcp_server_main_process.html)
