# Guía de VLANs y Switching

Guía completa para configuración de VLANs, trunking, VTP, STP y funcionalidades avanzadas de switching.

## Tabla de Contenidos

1. [Conceptos Fundamentales](#conceptos-fundamentales)
2. [Configuración de VLANs Básicas](#configuración-de-vlans-básicas)
3. [Inter-VLAN Routing](#inter-vlan-routing)
4. [Trunking (802.1Q)](#trunking-8021q)
5. [VTP (VLAN Trunking Protocol)](#vtp-vlan-trunking-protocol)
6. [Spanning Tree Protocol (STP)](#spanning-tree-protocol-stp)
7. [EtherChannel](#etherchannel)
8. [Port Security](#port-security)
9. [Troubleshooting VLANs](#troubleshooting-vlans)

---

## Conceptos Fundamentales

### ¿Qué son las VLANs?

Las VLANs (Virtual Local Area Networks) permiten crear múltiples redes lógicas aisladas dentro de una misma infraestructura física.

**Beneficios:**
- **Segmentación**: Separar tráfico por departamento, función o seguridad
- **Seguridad**: El tráfico de una VLAN no es visible en otra sin un router
- **Rendimiento**: Reducir dominios de broadcast
- **Flexibilidad**: Mover usuarios entre VLANs sin cambiar cableado físico
- **Costo**: Menos switches necesarios

### Tipos de Puertos

| Tipo | Descripción | Uso |
|------|-------------|-----|
| **Access** | Pertenece a una sola VLAN | Conexión a endpoints (PCs, servidores) |
| **Trunk** | Transporta múltiples VLANs | Conexión entre switches o a routers |
| **Hybrid** | Combinación (poco común) | Casos especiales |

### VLANs Predeterminadas

- **VLAN 1**: VLAN por defecto, no se puede eliminar
- **VLAN 1002-1005**: Reservadas para FDDI/Token Ring
- **VLAN 1006-4094**: VLANs extendidas (VTP 3+)

---

## Configuración de VLANs Básicas

### Crear VLANs

```cisco
! Modo configuración global
configure terminal

! Crear VLAN con nombre
vlan 10
 name VENTAS
 exit

! Crear otra VLAN
vlan 20
 name CONTABILIDAD
 exit

! Crear VLAN para management
vlan 99
 name MANAGEMENT
 exit
```

### Asignar Puertos a VLANs (Modo Access)

```cisco
! Configurar un puerto individual
interface FastEthernet0/1
 switchport mode access
 switchport access vlan 10
 no shutdown
 exit

! Configurar rango de puertos
interface range FastEthernet0/1-12
 switchport mode access
 switchport access vlan 10
 no shutdown
 exit

! Configurar puertos no consecutivos
interface range FastEthernet0/1-6, FastEthernet0/13-18
 switchport mode access
 switchport access vlan 20
 no shutdown
 exit
```

### Configuración de Voice VLAN

```cisco
! Para puertos con teléfonos IP
interface FastEthernet0/1
 switchport mode access
 switchport access vlan 10
 switchport voice vlan 100
 no shutdown
 exit
```

---

## Inter-VLAN Routing

Las VLANs están aisladas por diseño. Para comunicación entre VLANs se necesita un dispositivo de Capa 3.

### Método 1: Router-on-a-Stick

Un router con una interfaz física conectada a un switch trunk.

**Ventajas:**
- Solo necesita una interfaz física en el router
- Económico

**Desventajas:**
- Cuello de botella si hay mucho tráfico inter-VLAN
- Punto único de fallo

**Configuración en Router:**

```cisco
! Subinterface para VLAN 10
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
 description Gateway VLAN 10 - VENTAS
 exit

! Subinterface para VLAN 20
interface GigabitEthernet0/0.20
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
 description Gateway VLAN 20 - CONTABILIDAD
 exit

! Interfaz física (no IP address)
interface GigabitEthernet0/0
 no shutdown
 exit
```

**Configuración en Switch:**

```cisco
! Puerto hacia el router
interface GigabitEthernet0/1
 switchport mode trunk
 switchport trunk allowed vlan 10,20,99
 switchport trunk native vlan 99
 no shutdown
 exit
```

### Método 2: Switch Layer 3 (SVIs)

Usar un switch multicapa con capacidad de routing.

**Ventajas:**
- Más rápido (switching en hardware)
- Sin cuellos de botella
- Menos latencia

**Configuración:**

```cisco
! Habilitar routing IP
ip routing

! Crear SVI para VLAN 10
interface vlan 10
 ip address 192.168.10.1 255.255.255.0
 no shutdown
 exit

! Crear SVI para VLAN 20
interface vlan 20
 ip address 192.168.20.1 255.255.255.0
 no shutdown
 exit

! Puerto en modo access hacia el router (si es necesario)
interface GigabitEthernet0/1
 no switchport
 ip address 10.0.0.2 255.255.255.252
 no shutdown
 exit

! Ruta por defecto hacia el router
ip route 0.0.0.0 0.0.0.0 10.0.0.1
```

---

## Trunking (802.1Q)

### Conceptos de Trunking

Los enlaces trunk transportan tráfico de múltiples VLANs entre switches agregando una etiqueta (tag) de 4 bytes a cada frame.

**Campos del tag 802.1Q:**
- **TPID**: Tag Protocol Identifier (0x8100)
- **PCP**: Priority Code Point (QoS)
- **DEI**: Drop Eligible Indicator
- **VID**: VLAN Identifier (12 bits = 4094 VLANs)

### Native VLAN

- VLAN cuyo tráfico NO lleva tag en un enlace trunk
- Por defecto: VLAN 1
- Debe coincidir en ambos extremos del trunk

### Configuración de Trunking

```cisco
! Configurar puerto como trunk
interface GigabitEthernet0/1
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,30,99
 no shutdown
 exit

! Forzar modo trunk (desactivar DTP)
interface GigabitEthernet0/1
 switchport mode trunk
 switchport nonegotiate
 no shutdown
 exit
```

### Configuración Dinámica (DTP)

```cisco
! Desactivar DTP en todas las interfaces
interface range FastEthernet0/1-24
 switchport mode access
 switchport nonegotiate
 exit

! O configurar como trunk estático
interface GigabitEthernet0/1
 switchport mode trunk
 switchport nonegotiate
 exit
```

**Modos DTP:**

| Modo Local | Modo Remoto | Resultado |
|------------|-------------|-----------|
| Access | Cualquiera | Access |
| Trunk | Cualquiera | Trunk |
| Dynamic Auto | Dynamic Auto | Access |
| Dynamic Auto | Dynamic Desirable | Trunk |
| Dynamic Desirable | Dynamic Desirable | Trunk |

**Mejor práctica**: Desactivar DTP y configurar trunk/access estáticamente.

---

## VTP (VLAN Trunking Protocol)

VTP permite propagar información de VLANs entre switches automáticamente.

### Modos VTP

| Modo | Función |
|------|---------|
| **Server** | Puede crear/modificar/eliminar VLANs. Propaga cambios. |
| **Client** | No puede modificar VLANs. Recibe actualizaciones. |
| **Transparent** | No participa en VTP. Solo reenvía mensajes. Mantiene su propia base de datos. |
| **Off** | Desactivado completamente (IOS 15+). |

### Configuración VTP

```cisco
! Configurar VTP Server
vtp domain EMPRESA
vtp mode server
vtp version 2
vtp pruning
! (Opcional) vtp password cisco123

! Configurar VTP Client
vtp domain EMPRESA
vtp mode client
vtp version 2

! Configurar VTP Transparent
vtp domain EMPRESA
vtp mode transparent
vtp version 2
```

### VTP Pruning

Evita enviar tráfico broadcast por trunks innecesarios:

```cisco
! Habilitar pruning global
vtp pruning

! O por interfaz
interface GigabitEthernet0/1
 switchport trunk pruning vlan 10-20
```

### Seguridad VTP

```cisco
! Configurar contraseña
vtp password SECRET_PASSWORD

! Ver configuración
show vtp status
show vtp password

! Resetear número de revisión (evitar propagación accidental)
! Cambiar a transparent y luego a client/server
vtp mode transparent
vtp mode server
```

**⚠️ Advertencia de seguridad**: Un switch con número de revisión mayor puede sobrescribir toda la configuración de VLANs de la red.

---

## Spanning Tree Protocol (STP)

### Conceptos STP

STP previene loops en topologías redundantes bloqueando puertos estratégicamente.

**Roles de puertos:**
- **Root Port (RP)**: Mejor camino hacia el root bridge
- **Designated Port (DP)**: Mejor camino para un segmento
- **Non-Designated**: Bloqueado para prevenir loops

**Estados de puertos:**
- **Blocking**: No reenvía tráfico, escucha BPDUs
- **Listening**: Preparándose, no reenvía
- **Learning**: Aprende MACs, no reenvía
- **Forwarding**: Operación normal
- **Disabled**: Administrativamente apagado

### Tipos de STP

| Protocolo | Estándar | Convergencia | Características |
|-----------|----------|--------------|-----------------|
| **STP** | 802.1D | 30-50s | Legacy |
| **PVST+** | Cisco | 30-50s | Una instancia por VLAN |
| **RSTP** | 802.1w | 1-10s | Rapid STP |
| **Rapid PVST+** | Cisco | 1-10s | RSTP por VLAN |
| **MST** | 802.1s | 1-10s | Múltiples spanning trees |

### Configuración STP/RSTP

```cisco
! Ver versión actual
show spanning-tree summary

! Cambiar a Rapid PVST+
spanning-tree mode rapid-pvst

! Configurar root bridge primario
spanning-tree vlan 10,20 root primary
! (Equivalente a: spanning-tree vlan 10,20 priority 24576)

! Configurar root bridge secundario
spanning-tree vlan 10,20 root secondary
! (Equivalente a: spanning-tree vlan 10,20 priority 28672)

! Configurar prioridad manualmente
spanning-tree vlan 10 priority 4096
```

### PortFast y BPDU Guard

**PortFast**: Salta estados listening/learning en puertos de acceso (convergencia inmediata).

```cisco
! Habilitar PortFast en un puerto
interface FastEthernet0/1
 spanning-tree portfast
 exit

! Habilitar en todos los puertos de acceso
spanning-tree portfast default
```

**BPDU Guard**: Desactiva el puerto si recibe un BPDU (protege contra switches no autorizados).

```cisco
! Habilitar BPDU Guard global
spanning-tree portfast bpduguard default

! O por interfaz
interface FastEthernet0/1
 spanning-tree bpduguard enable
 exit

! Recuperar puerto err-disabled
errdisable recovery cause bpduguard
errdisable recovery interval 300
```

### BPDU Filter

Evita enviar/recibir BPDUs en un puerto:

```cisco
! Por interfaz (no recomendado)
interface FastEthernet0/1
 spanning-tree bpdufilter enable
 exit
```

### Root Guard

Protege la posición de root bridge:

```cisco
interface GigabitEthernet0/1
 spanning-tree guard root
 exit
```

---

## EtherChannel

EtherChannel agrupa múltiples enlaces físicos en uno lógico para aumentar ancho de banda y redundancia.

### Protocolos de Negociación

| Protocolo | Modo Activo | Modo Pasivo | Tipo |
|-----------|-------------|-------------|------|
| **PAgP** | Desirable | Auto | Cisco propietario |
| **LACP** | Active | Passive | Estándar IEEE 802.3ad |
| **Static** | On | On | Sin negociación |

### Configuración PAgP

```cisco
! Configurar EtherChannel con PAgP
interface range GigabitEthernet0/1-2
 switchport mode trunk
 channel-group 1 mode desirable
 no shutdown
 exit

! Verificar
show etherchannel summary
show etherchannel port-channel
```

### Configuración LACP

```cisco
! Configurar EtherChannel con LACP
interface range GigabitEthernet0/1-2
 switchport mode trunk
 channel-group 1 mode active
 no shutdown
 exit

! Verificar
show lacp neighbor
show lacp internal
```

### Configuración Estática

```cisco
interface range GigabitEthernet0/1-2
 switchport mode trunk
 channel-group 1 mode on
 no shutdown
 exit
```

### Balanceo de Carga

```cisco
! Configurar método de balanceo
port-channel load-balance src-dst-mac

! Opciones:
! - src-mac: Origen MAC
! - dst-mac: Destino MAC
! - src-dst-mac: Origen y destino MAC (default)
! - src-ip: Origen IP
! - dst-ip: Destino IP
! - src-dst-ip: Origen y destino IP

! Verificar
show etherchannel load-balance
```

---

## Port Security

### Conceptos

Port Security restringe qué dispositivos pueden conectarse a un puerto.

**Modos de violación:**
- **Protect**: Descarta tráfico de MACs no autorizadas, no notifica
- **Restrict**: Descarta tráfico, incrementa contador, envía SNMP trap
- **Shutdown**: Pone el puerto en estado err-disabled (default)

### Configuración Básica

```cisco
! Habilitar port security
interface FastEthernet0/1
 switchport mode access
 switchport access vlan 10
 switchport port-security
 switchport port-security maximum 2
 switchport port-security mac-address sticky
 switchport port-security violation shutdown
 exit
```

### Configuración Avanzada

```cisco
! Configurar MACs estáticas específicas
interface FastEthernet0/1
 switchport port-security
 switchport port-security mac-address 0001.0002.0003
 switchport port-security mac-address 0001.0002.0004
 exit

! Configurar aging time
switchport port-security aging time 120
switchport port-security aging type inactivity
```

### Recuperar Puerto Err-disabled

```cisco
! Método 1: Shutdown/no shutdown
interface FastEthernet0/1
 shutdown
 no shutdown
 exit

! Método 2: Configurar recuperación automática
errdisable recovery cause psecure-violation
errdisable recovery interval 300
```

---

## Troubleshooting VLANs

### Comandos Esenciales

```cisco
! Ver VLANs configuradas
show vlan brief
show vlan id 10
show vlan name VENTAS

! Ver configuración de puertos
show interfaces switchport
show interfaces FastEthernet0/1 switchport

! Ver trunks
show interfaces trunk

! Ver MAC address table
show mac address-table
show mac address-table vlan 10
show mac address-table interface FastEthernet0/1

! Ver VTP
show vtp status
show vtp password
show vtp counters

! Ver STP
show spanning-tree
show spanning-tree vlan 10
show spanning-tree root
show spanning-tree blockedports

! Ver EtherChannel
show etherchannel summary
show etherchannel port-channel
show lacp neighbor

! Ver port security
show port-security
show port-security interface FastEthernet0/1
show port-security address
```

### Problemas Comunes y Soluciones

#### Problema 1: PCs no se comunican en la misma VLAN

**Síntomas**: PCs en la misma VLAN no se hacen ping

**Verificaciones**:
1. `show vlan brief` - ¿El puerto está en la VLAN correcta?
2. `show interfaces status` - ¿El puerto está up/up?
3. Verificar configuración IP en las PCs

**Solución**:
```cisco
! Verificar VLAN del puerto
show interfaces FastEthernet0/1 switchport

! Corregir si es necesario
interface FastEthernet0/1
 switchport access vlan 10
 no shutdown
```

#### Problema 2: No hay comunicación entre VLANs

**Síntomas**: PCs en VLANs diferentes no se comunican

**Verificaciones**:
1. ¿Hay un router o switch L3?
2. ¿Las subinterfaces/SVIs están configuradas?
3. ¿El enlace al router es trunk?

**Solución** (Router-on-a-stick):
```cisco
! En el router
show ip interface brief
show ip route

! En el switch
show interfaces trunk
show interfaces GigabitEthernet0/1 switchport
```

#### Problema 3: VTP no propaga VLANs

**Síntomas**: VLANs creadas en el server no aparecen en clients

**Verificaciones**:
```cisco
! Verificar dominio y modo
show vtp status

! Verificar versión
show vtp status | include V2

! Verificar número de revisión
show vtp status | include Revision
```

**Causas comunes**:
- Dominios VTP diferentes
- No hay enlace trunk entre switches
- El client tiene número de revisión mayor

#### Problema 4: Puerto en err-disabled

**Síntomas**: Puerto apagado por violación de seguridad

**Verificación**:
```cisco
show interfaces status err-disabled
show port-security interface FastEthernet0/1
```

**Solución**:
```cisco
! Recuperar puerto
interface FastEthernet0/1
 shutdown
 no shutdown
 exit

! Verificar causa
show port-security interface FastEthernet0/1
```

#### Problema 5: STP bloquea enlaces

**Síntomas**: Enlaces redundantes no reenvían tráfico

**Verificación**:
```cisco
show spanning-tree blockedports
show spanning-tree vlan 10
```

**Solución**: Es comportamiento normal. Si se necesita más ancho de banda, usar EtherChannel.

---

## Checklist de Configuración

### Pre-configuración
- [ ] Documentar topología planificada
- [ ] Asignar rangos de VLANs
- [ ] Definir esquema de direccionamiento IP
- [ ] Identificar puertos trunk vs access
- [ ] Planificar redundancia si es necesario

### Configuración VLANs
- [ ] Crear todas las VLANs necesarias
- [ ] Asignar nombres descriptivos
- [ ] Configurar puertos en modo access
- [ ] Asignar VLANs correctas a puertos
- [ ] Configurar voice VLAN si aplica

### Configuración Trunking
- [ ] Configurar enlaces entre switches como trunk
- [ ] Especificar VLANs permitidas explícitamente
- [ ] Configurar native VLAN consistente
- [ ] Desactivar DTP (switchport nonegotiate)

### Configuración Inter-VLAN Routing
- [ ] Configurar subinterfaces en router (router-on-a-stick) O
- [ ] Configurar SVIs en switch L3
- [ ] Verificar IPs de gateway en todas las VLANs
- [ ] Configurar IPs en PCs con gateway correcto

### Seguridad
- [ ] Configurar Port Security en puertos de acceso
- [ ] Habilitar PortFast y BPDU Guard
- [ ] Configurar contraseña VTP si se usa
- [ ] Documentar MACs autorizadas si son estáticas

### Verificación
- [ ] `show vlan brief` - Todas las VLANs presentes
- [ ] `show interfaces trunk` - Trunks configurados
- [ ] Ping entre PCs en misma VLAN
- [ ] Ping entre PCs en diferentes VLANs
- [ ] `show spanning-tree` - Sin loops
- [ ] `show port-security` - Sin violaciones

---

## Ejemplo Completo: Configuración de Red con VLANs

### Escenario

- 2 departamentos: VENTAS (VLAN 10) y CONTABILIDAD (VLAN 20)
- Management en VLAN 99
- 2 switches con enlace trunk entre ellos
- Router conectado para Inter-VLAN routing

### Configuración SW-CORE

```cisco
hostname SW-CORE

! VLANs
vlan 10
 name VENTAS
vlan 20
 name CONTABILIDAD
vlan 99
 name MANAGEMENT

! Trunk hacia SW-ACCESS
interface GigabitEthernet0/1
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,99
 switchport nonegotiate
 spanning-tree guard root

! Trunk hacia Router
interface GigabitEthernet0/2
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,99
 switchport nonegotiate

! Management SVI
interface vlan 99
 ip address 192.168.99.2 255.255.255.0
 no shutdown

! Default gateway
ip default-gateway 192.168.99.1

! STP
spanning-tree mode rapid-pvst
spanning-tree vlan 10,20,99 root primary
```

### Configuración SW-ACCESS

```cisco
hostname SW-ACCESS

! VLANs (aprendidas por VTP o configuradas manualmente)
vlan 10
 name VENTAS
vlan 20
 name CONTABILIDAD
vlan 99
 name MANAGEMENT

! Puertos de acceso VLAN 10
interface range FastEthernet0/1-12
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast
 spanning-tree bpduguard enable
 switchport port-security
 switchport port-security maximum 2
 switchport port-security mac-address sticky
 switchport port-security violation shutdown

! Puertos de acceso VLAN 20
interface range FastEthernet0/13-24
 switchport mode access
 switchport access vlan 20
 spanning-tree portfast
 spanning-tree bpduguard enable
 switchport port-security
 switchport port-security maximum 2
 switchport port-security mac-address sticky

! Trunk hacia SW-CORE
interface GigabitEthernet0/1
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,99
 switchport nonegotiate

! Management
interface vlan 99
 ip address 192.168.99.3 255.255.255.0
 no shutdown

ip default-gateway 192.168.99.1

! STP
spanning-tree mode rapid-pvst
```

### Configuración Router

```cisco
hostname R1

! Subinterface VLAN 10
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
 description Gateway VENTAS

! Subinterface VLAN 20
interface GigabitEthernet0/0.20
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
 description Gateway CONTABILIDAD

! Subinterface VLAN 99 (Management)
interface GigabitEthernet0/0.99
 encapsulation dot1Q 99
 ip address 192.168.99.1 255.255.255.0
 description Management

! Interfaz física
interface GigabitEthernet0/0
 no shutdown
 description Trunk hacia SW-CORE

! Ruta por defecto (si hay conexión a Internet)
ip route 0.0.0.0 0.0.0.0 [next-hop]
```

### Configuración PCs

**PC en VLAN 10:**
- IP: 192.168.10.10
- Mask: 255.255.255.0
- Gateway: 192.168.10.1

**PC en VLAN 20:**
- IP: 192.168.20.10
- Mask: 255.255.255.0
- Gateway: 192.168.20.1
