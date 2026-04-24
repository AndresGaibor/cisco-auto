# WLC CLI - Referencia de Comandos

## Descripción

El módulo `wlc` de `pt` proporciona comandos para automatizar la configuración de Wireless LAN Controllers y dispositivos de red asociados en Packet Tracer.

## Comandos

### `pt wlc setup`

Setup completo de la red WLC: enciende dispositivos, habilita PoE, configura IPs y gateway.

```bash
pt wlc setup
```

**Qué hace:**
- Enciende todos los dispositivos (PC0, WLC1, SW1, AAA_Server, AP1, AP2, AP3)
- Agrega power adapters a LAPs (Access Points)
- Habilita PoE en SW1: Fa0/3, Fa0/4, Fa0/5
- Configura WLC1 Management: 192.168.10.2/24
- Configura SW1 Vlan10 SVI: 192.168.10.1/24

---

### `pt wlc status`

Muestra el estado actual de la red incluyendo devices, puertos, IPs y links.

```bash
pt wlc status
```

**Output típico:**
```
=== Estado de Red WLC ===

Dispositivos: 7
Todos encendidos: SI
Todos conectados: SI

--- Detalle por Dispositivo ---

● WLC1 (WLC-3504)
   IP: 192.168.10.2
   Ports UP: management, ..., Dot11Radio0
   Link Status: ✓

● AP1 (AP-LAP)
   Ports UP: GigabitEthernet0, Dot11Radio0
   Link Status: ✓
```

---

### `pt wlc ip <ip> <mask> <gateway>`

Configura la IP de management del WLC y su gateway.

```bash
pt wlc ip 192.168.10.2 255.255.255.0 192.168.10.1
```

**Ejemplo:**
```bash
pt wlc ip 10.0.0.100 255.255.255.0 10.0.0.1
```

---

### `pt wlc gateway <ip>`

Configura solo el default gateway del WLC.

```bash
pt wlc gateway 192.168.10.1
```

---

### `pt wlc poe <switch> <port>`

Habilita PoE en un puerto específico de un switch.

```bash
pt wlc poe SW1 FastEthernet0/3
```

**Ejemplo:**
```bash
pt wlc poe SW1 GigabitEthernet0/1
```

---

### `pt wlc ap power-add <ap-name>`

Agrega un power adapter a un Access Point. Los LAPs requieren este módulo para funcionar.

```bash
pt wlc ap power-add AP1
pt wlc ap power-add AP2
pt wlc ap power-add AP3
```

---

### `pt wlc sw svi <switch> <vlan> <ip> <mask>`

Configura una SVI (Switch Virtual Interface) en un switch.

```bash
pt wlc sw svi SW1 10 192.168.10.1 255.255.255.0
```

---

## Escenario Completo: Setup Lab WLC

```bash
# 1. Verificar estado inicial de la red
pt wlc status

# 2. Ejecutar setup completo (power, PoE, IPs)
pt wlc setup

# 3. Verificar que todo quedó configurado
pt wlc status

# 4. Si un AP no tiene power adapter, agregarlo manualmente
pt wlc ap power-add AP1
pt wlc ap power-add AP2
pt wlc ap power-add AP3
```

---

## API Raw (Debugging)

Cuando los comandos CLI no son suficientes, se puede usar `pt omni raw` para ejecutar JavaScript directamente en el motor de Packet Tracer.

### Scripts útiles de debugging

```bash
# Wake terminal WLC
pt omni raw "(function() { ipc.network().getDevice('WLC1').getCommandLine().enterCommand(''); return 'done'; })()"

# List todos los dispositivos
pt omni raw "(function() { var net = ipc.network(); var devs = []; for(var i=0; i<net.getDeviceCount(); i++) { var d = net.getDeviceAt(i); if(d) devs.push(d.getName()); } return devs.join(', '); })()"

# Check power adapters en AP
pt omni raw "(function() { var net = ipc.network(); var ap = net.getDevice('AP1'); return ap.getRootModule().getModuleCount(); })()"

# Get WLC management port info
pt omni raw "(function() { var net = ipc.network(); var wlc = net.getDevice('WLC1'); var mgmt = wlc.getPort('management'); return 'IP: ' + mgmt.getIpAddress() + ' Mask: ' + mgmt.getSubnetMask(); })()"
```

---

## Configuración Manual Requerida (GUI)

Los siguientes elementos **NO son automatizables** via CLI — requieren configuración manual en Packet Tracer:

### WLC WLANs (4 SSIDs)

Abrir WLC1 → Config → WLANs:

| WLAN | Name | Security | Auth |
|------|------|----------|------|
| 1 | Docentes | WPA2 Enterprise | RADIUS: 192.168.10.10 |
| 2 | Estudiantes | WPA2 Personal | PSK: `Cisco123456` |
| 3 | Eduroam | WPA2 Personal | PSK: `Eduroam2024` |
| 4 | Invitados | Open | None |

### Configuración AAA Server

El servidor AAA debe tener usuarios configurados para la autenticación RADIUS de WLAN Docentes.

---

## Notas Técnicas

### WLC-3504 Limitations

- No tiene API pública para configuración de WLANs
- CLI de WLC no responde a comandos como `show wlan summary`
- La única configuración programable es: Management IP, Gateway, PoE ports

### AP Power Adapter

Los Access Points (LAPs) requieren el módulo `ACCESS_POINT_POWER_ADAPTER` para encenderse. Sin este módulo, el AP no tendrá puertos UP y no podrá registrarse con el WLC.

### PoE en Switches

Solo algunos puertos de switch soportan PoE. En el 2960, los puertos FastEthernet0/1-24 soportan PoE. Los puertos GigabitEthernet son solo uplink.

---

## Archivo de Referencia

Este documento está relacionado con:
- `.skills/pt-cli/SKILL.md` - Skill principal de pt-cli
- `.skills/pt-cli/references/wlc.md` - Este archivo