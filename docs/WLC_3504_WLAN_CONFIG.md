# Configuración WLC Cisco 3504 — Referencia para cisco-auto

> **Estado:** Investigación completada — 2026-04-22
> **Relevancia:** Automatización de WLANs en Packet Tracer

---

## Resumen Ejecutivo

Packet Tracer incluye **WLC-3504** como dispositivo, pero la API IPC no expone métodos específicos para `WirelessController`. La configuración de WLANs se realiza vía **CLI IOS-like** (terminal), igual que routers/switches.

**Estrategia para cisco-auto:** Usar `getCommandLine()` para enviar comandos IOS al WLC.

---

## Comandos IOS para WLC AireOS

### 1. Crear WLAN (template básico)

```
config wlan create <wlan-id> <profile-name> <ssid-name>
```

| Parámetro | Descripción |
|-----------|-------------|
| wlan-id | ID único (1-512) |
| profile-name | Nombre del perfil interno |
| ssid-name | Nombre broadcast del SSID |

### 2. Configuración de Seguridad

#### WLAN 1 — Docentes (RADIUS / WPA2-Enterprise)

```
config wlan create 1 Docentes Docentes
config wlan security wpa akm 802.1x enable 1
config wlan security wpa wpa2 enable 1
config wlan security wpa wpa2 ciphers aes enable 1
config wlan radius_server auth add 1 <wlan-id>
config wlan aaa-override enable 1
config wlan enable 1
```

#### WLAN 2 — Estudiantes (PSK)

```
config wlan create 2 Estudiantes Estudiantes
config wlan security wpa akm psk enable 2
config wlan security wpa akm psk set-key ascii <password> 2
config wlan security wpa wpa2 enable 2
config wlan security wpa wpa2 ciphers aes enable 2
config wlan enable 2
```

#### WLAN 3 — Eduroam (PSK)

```
config wlan create 3 Eduroam Eduroam
config wlan security wpa akm psk enable 3
config wlan security wpa akm psk set-key ascii <password> 3
config wlan security wpa wpa2 enable 3
config wlan security wpa wpa2 ciphers aes enable 3
config wlan enable 3
```

#### WLAN 4 — Invitados (Open)

```
config wlan create 4 Invitados Invitados
config wlan security wpa disable 4
config wlan broadcast-ssid enable 4
config wlan enable 4
```

### 3. Vincular SSID a Interface/VLAN

```
config wlan interface <wlan-id> <interface-name>
```

Ejemplo para VLAN 10:
```
config interface create vlan10 10
config wlan interface 1 management
config wlan interface 2 vlan10
config wlan interface 3 vlan10
config wlan interface 4 vlan20
```

### 4. Configuración de RADIUS Server

```
config radius auth add <server-index> <server-ip> <port> <ascii/hex> <shared-secret>
config radius auth enable <server-index>
```

Ejemplo:
```
config radius auth add 1 192.168.1.100 1812 ascii ClaveRADIUS123
config radius auth enable 1
```

### 5. Comandos de Verificación

```
show wlan summary
show wlan id <wlan-id>
show client summary
show radius auth statistics
```

---

## Comandos para Catalyst 9800 (IOS-XE) — Referencia

```
! Crear WLAN
wlan Docentes 1 Docentes
wlan Estudiantes 2 Estudiantes
wlan Eduroam 3 Eduroam
wlan Invitados 4 Invitados

! Configurar seguridad por WLAN
wlan Docentes 1
 security dot1x authentication-list RADIUS-AUTH
 security wpa wpa2
 security wpa wpa2 ciphers aes
 no shutdown

wlan Estudiantes 2
 security wpa akm psk
 security wpa akm psk set-key ascii <password>
 security wpa wpa2
 no shutdown

wlan Invitados 4
 security wpa disable
 no shutdown
```

---

## Configuración de APs en WLC

### Habilitar Radio

```
config 802.11a enable network
config 802.11b enable network
```

### Asignar AP a WLAN

```
config wlan apgroup <group-name> <ap-name> <wlan-id>
```

### Ver Estado de APs

```
show ap summary
show ap config general <ap-name>
```

---

## Integración con AAA Server (RADIUS)

### Configuración AAA

```
config aaa auth add <server-index>
config aaa auth server-timeout <server-index> <timeout-seconds>
config aaa auth accounting enable <wlan-id> <server-index>
```

### Atributos RADIUS para VLAN Dinámica

El RADIUS puede devolver:
- `Tunnel-Type` = VLAN (13)
- `Tunnel-Medium-Type` = 802 (6)
- `Tunnel-Private-Group-ID` = <VLAN-ID>

---

## Mapeo de Seguridad

| WLAN | Nombre | Seguridad | Auth | VLAN sugerida |
|------|--------|-----------|------|---------------|
| 1 | Docentes | WPA2-Enterprise | RADIUS (AAA) | 10 |
| 2 | Estudiantes | WPA2-PSK | Clave compartida | 20 |
| 3 | Eduroam | WPA2-PSK | Clave compartida | 20 |
| 4 | Invitados | Open | Sin auth | 99 |

---

## Comandos para Packet Tracer (Automatización)

Dado que `cisco-auto` usa el terminal engine para ejecutar comandos IOS en PT, el workflow sería:

```typescript
// Pseudocódigo para crear WLAN en WLC via pt-runtime
const wlcTerminal = wlcDevice.getCommandLine();

// Esperar prompt
await waitForPrompt(wlcTerminal, /.*\(Cisco Controller\).*>/);

// Entrar a modo config
wlcTerminal.enterCommand("config");
await waitForPrompt(wlcTerminal, /.*\(Cisco Controller\)(config).*>/);

// Crear WLAN 1 - Docentes
wlcTerminal.enterCommand("wlan create 1 Docentes Docentes");
wlcTerminal.enterCommand("wlan security wpa akm 802.1x enable 1");
wlcTerminal.enterCommand("wlan security wpa wpa2 enable 1");
wlcTerminal.enterCommand("wlan radius_server auth add 1 1");
wlcTerminal.enterCommand("wlan enable 1");
```

---

## Notas Importantes

1. **PT Simulator WLC:** El WLC en Packet Tracer tiene CLI limitado. No todos los comandos de AireOS están disponibles.

2. **Modelo de datos pendiente:** Agregar al schema Zod (`src/core/types`):
   - `WlanConfig`
   - `WlanSecurity` (open | psk | enterprise)
   - `RadiusServer`

3. **Verificación:** Antes de implementar, verificar en PT los comandos exactos disponibles en el CLI del WLC-3504.

---

## Referencias

- Cisco WLC 3504 Release 8.5 Deployment Guide
- Cisco Wireless Controller Command Reference, Release 8.10
- IronWiFi Cisco WLC RADIUS Setup Guide (2026)
- networkwords.com - Cisco WLC CLI useful commands