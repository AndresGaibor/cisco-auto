# Guía de Routing

Guía completa para configuración de routing estático y dinámico (OSPF, EIGRP, BGP).

## Tabla de Contenidos

1. [Fundamentos de Routing](#fundamentos-de-routing)
2. [Routing Estático](#routing-estático)
3. [OSPF (Open Shortest Path First)](#ospf-open-shortest-path-first)
4. [EIGRP (Enhanced Interior Gateway Routing Protocol)](#eigrp-enhanced-interior-gateway-routing-protocol)
5. [BGP (Border Gateway Protocol)](#bgp-border-gateway-protocol)
6. [Redistribution de Rutas](#redistribution-de-rutas)
7. [Troubleshooting de Routing](#troubleshooting-de-routing)

---

## Fundamentos de Routing

### Tipos de Routing

| Tipo | Descripción | Uso |
|------|-------------|-----|
| **Estático** | Rutas configuradas manualmente | Redes pequeñas, rutas por defecto |
| **Dinámico** | Protocolos que aprenden rutas automáticamente | Redes grandes, failover automático |
| **Default** | Ruta de último recurso (0.0.0.0/0) | Conexión a Internet |

### Clasificación de Protocolos de Routing

**Por algoritmo:**
- **Distance Vector**: RIP, EIGRP (básico)
- **Link State**: OSPF, IS-IS
- **Path Vector**: BGP

**Por alcance:**
- **IGP** (Interior Gateway Protocol): OSPF, EIGRP, RIP
- **EGP** (Exterior Gateway Protocol): BGP

### Métricas Comunes

| Protocolo | Métrica | Factor Principal |
|-----------|---------|------------------|
| RIP | Hop Count | Saltos (máx 15) |
| OSPF | Cost | Ancho de banda |
| EIGRP | Composite | Ancho de banda + Delay |
| BGP | Attributes | AS Path, Local Pref, etc. |

### Distance Administrative (AD)

Menor valor = Mayor preferencia:

| Ruta | AD |
|------|-----|
| Conectada | 0 |
| Estática | 1 |
| eBGP | 20 |
| EIGRP (internal) | 90 |
| OSPF | 110 |
| IS-IS | 115 |
| RIP | 120 |
| EIGRP (external) | 170 |
| iBGP | 200 |
| Desconocida | 255 |

---

## Routing Estático

### Configuración Básica

```cisco
! Ruta estática a una red específica
ip route 192.168.2.0 255.255.255.0 10.1.1.2

! Ruta estática con interfaz de salida (para enlaces punto a punto)
ip route 192.168.2.0 255.255.255.0 Serial0/0/0

! Ruta estática con next-hop e interfaz
ip route 192.168.2.0 255.255.255.0 Serial0/0/0 10.1.1.2
```

### Ruta por Defecto

```cisco
! Gateway de último recurso
ip route 0.0.0.0 0.0.0.0 192.168.1.1

! O con interfaz
ip route 0.0.0.0 0.0.0.0 GigabitEthernet0/0 192.168.1.1
```

### Ruta Estática Flotante

Usa AD mayor para failover:

```cisco
! Ruta principal (AD 1 por defecto)
ip route 192.168.2.0 255.255.255.0 10.1.1.2

! Ruta backup (AD 10)
ip route 192.168.2.0 255.255.255.0 10.1.1.6 10
```

Si la primera falla, la segunda entra en la tabla de routing.

### Ruta Estática con Track (IP SLA)

Failover automático basado en estado:

```cisco
! Configurar IP SLA
ip sla 1
 icmp-echo 10.1.1.2 source-ip 10.1.1.1
 frequency 10
 exit

ip sla schedule 1 life forever start-time now

! Crear track
track 1 ip sla 1 reachability

! Aplicar a ruta estática
ip route 192.168.2.0 255.255.255.0 10.1.1.2 track 1
ip route 192.168.2.0 255.255.255.0 10.1.1.6 10
```

### Ruta Estática Null

Descartar tráfico (usado para agregación):

```cisco
ip route 192.168.0.0 255.255.0.0 null0
```

---

## OSPF (Open Shortest Path First)

### Características

- **Algoritmo**: Link State (Dijkstra/SPF)
- **Métrica**: Cost (basado en ancho de banda)
- **Convergencia**: Rápida
- **Escalabilidad**: Muy buena (jerarquía con áreas)
- **Uso**: Enterprise networks, data centers

### Conceptos Clave

- **Áreas**: Segmentación jerárquica de la red
- **Router ID**: Identificador único (manual o automático)
- **LSA (Link State Advertisement)**: Información de estado de enlace
- **LSDB (Link State Database)**: Base de datos de estados
- **SPF Tree**: Árbol de caminos más cortos

### Tipos de Routers OSPF

| Tipo | Función |
|------|---------|
| **Internal** | Todas las interfaces en una área |
| **ABR** (Area Border Router) | Conecta área backbone con otras áreas |
| **ASBR** (AS Boundary Router) | Conecta OSPF con otros protocolos |
| **Backbone** | Routers en área 0 |

### Tipos de Áreas

| Área | Características |
|------|-----------------|
| **Standard** | Normal, recibe todas las rutas |
| **Backbone (0)** | Área central, todas las áreas deben conectar aquí |
| **Stub** | No recibe rutas externas (Tipo 5), usa default |
| **Totally Stubby** | No recibe rutas externas ni inter-área |
| **NSSA** (Not-So-Stubby Area) | Stub que permite ASBR |
| **Totally NSSA** | NSSA que no recibe rutas inter-área |

### Configuración Básica (Single Area)

```cisco
! Habilitar OSPF con Process ID
router ospf 1

! Configurar Router ID (recomendado)
 router-id 1.1.1.1

! Anunciar redes (wildcard mask = inverso de subnet mask)
 network 192.168.1.0 0.0.0.255 area 0
 network 10.1.1.0 0.0.0.3 area 0

! O usar interface específica
 passive-interface GigabitEthernet0/0

! Propagar ruta por defecto
 default-information originate
```

### Configuración Multi-Área

```cisco
! Router ABR conectado a área 0 y área 1
router ospf 1
 router-id 2.2.2.2
 
 ! Interfaces en área 0 (backbone)
 network 10.0.0.0 0.0.0.3 area 0
 
 ! Interfaces en área 1
 network 192.168.1.0 0.0.0.255 area 1

! Opcional: Hacer área 1 stub
area 1 stub

! O Totally Stubby
area 1 stub no-summary
```

### Optimización de Costos

```cisco
! Método 1: Cambiar ancho de banda de referencia
auto-cost reference-bandwidth 10000  ! En Mbps (10 Gbps)

! Método 2: Costo manual por interfaz
interface GigabitEthernet0/0
 ip ospf cost 10
 exit

! Método 3: Ancho de banda manual
interface Serial0/0/0
 bandwidth 1544  ! En Kbps
 exit
```

**Fórmula de Costo**: Cost = Reference-Bandwidth / Interface-Bandwidth

### Autenticación OSPF

```cisco
! Autenticación a nivel de área (MD5)
router ospf 1
 area 0 authentication message-digest

! Configurar clave en interfaz
interface GigabitEthernet0/0
 ip ospf message-digest-key 1 md5 cisco123
 exit

! Autenticación por interfaz
interface GigabitEthernet0/0
 ip ospf authentication message-digest
 ip ospf message-digest-key 1 md5 cisco123
 exit
```

### Timers OSPF

```cisco
! Cambiar timers (Hello y Dead)
interface GigabitEthernet0/0
 ip ospf hello-interval 5
 ip ospf dead-interval 20
 exit

! O en modo broadcast (modificar todos)
ip ospf network broadcast
```

### OSPFv3 (IPv6)

```cisco
! Habilitar OSPFv3
ipv6 router ospf 1
 router-id 1.1.1.1
 exit

! En interfaces
interface GigabitEthernet0/0
 ipv6 ospf 1 area 0
 ipv6 ospf cost 10
 exit
```

---

## EIGRP (Enhanced Interior Gateway Routing Protocol)

### Características

- **Algoritmo**: Advanced Distance Vector (DUAL)
- **Métrica**: Composite (Bandwidth, Delay, Load, Reliability)
- **Convergencia**: Muy rápida (backup paths pre-calculados)
- **Uso**: Redes Cisco enterprise

### Fórmula de Métrica

```
Metric = (K1 * Bandwidth + K3 * Delay) * 256

Default:
- K1 = 1 (Bandwidth)
- K2 = 0 (Load)
- K3 = 1 (Delay)
- K4 = 0 (Reliability)
- K5 = 0 (MTU)
```

### Configuración Básica (EIGRP Classic)

```cisco
! Habilitar EIGRP con Autonomous System
router eigrp 100

! Desactivar auto-summary
 no auto-summary

! Configurar Router ID
 eigrp router-id 1.1.1.1

! Anunciar redes
 network 192.168.1.0 0.0.0.255
 network 10.1.1.0 0.0.0.3

! Interfaz pasiva
 passive-interface GigabitEthernet0/0

! Propagar ruta por defecto
 redistribute static
```

### Configuración EIGRP Named Mode (Recomendado)

```cisco
! Configuración moderna
router eigrp NOMBRE_EIGRP
 ! Crear address-family
 address-family ipv4 autonomous-system 100
  
  ! Configuración AF-specific
  af-interface GigabitEthernet0/0
   passive-interface
   exit-af-interface
  
  ! Topología
  topology base
   redistribute static
   exit-af-topology
  
  ! Networks
  network 192.168.1.0 0.0.0.255
  network 10.1.1.0 0.0.0.3
  exit-address-family
```

### Autenticación EIGRP

```cisco
! Named Mode
router eigrp NOMBRE_EIGRP
 address-family ipv4 autonomous-system 100
  af-interface GigabitEthernet0/0
   authentication mode md5
   authentication key-chain EIGRP_KEY
   exit-af-interface

! Crear key chain
key chain EIGRP_KEY
 key 1
  key-string cisco123
  accept-lifetime 00:00:00 Jan 1 2024 infinite
  send-lifetime 00:00:00 Jan 1 2024 infinite
```

### EIGRP Stub

Limita queries para mejorar escalabilidad:

```cisco
router eigrp 100
 eigrp stub connected summary
```

**Opciones de stub**:
- `connected`: Anuncia redes conectadas
- `summary`: Anuncia rutas summary
- `static`: Anuncia rutas estáticas redistribuidas
- `redistributed`: Anuncia rutas redistribuidas
- `receive-only`: Solo recibe, no anuncia

### EIGRP con IPv6

```cisco
router eigrp NOMBRE
 address-family ipv6 autonomous-system 100
  af-interface default
   shutdown
   exit-af-interface
  af-interface GigabitEthernet0/0
   no shutdown
   exit-af-interface
```

---

## BGP (Border Gateway Protocol)

### Características

- **Algoritmo**: Path Vector
- **Métrica**: Atributos (múltiples criterios)
- **Convergencia**: Lenta (por diseño, para estabilidad)
- **Uso**: Internet, conexiones entre organizaciones

### Conceptos Clave

- **AS** (Autonomous System): Sistema autónomo identificado por número
- **eBGP**: BGP externo (entre AS diferentes)
- **iBGP**: BGP interno (dentro del mismo AS)
- **Path Attributes**: Características de las rutas
- **BGP Table**: Base de datos de rutas BGP

### Atributos BGP Importantes

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| **AS_Path** | Well-known mandatory | Lista de AS que la ruta ha atravesado |
| **Next_Hop** | Well-known mandatory | Siguimo salto para alcanzar la ruta |
| **Origin** | Well-known mandatory | Origen de la ruta (IGP, EGP, Incomplete) |
| **Local_Pref** | Well-known discretionary | Preferencia local (iBGP) |
| **MED** | Optional non-transitive | Métrica externa para influir en vecinos |

### Configuración Básica eBGP

```cisco
! Configurar router BGP
router bgp 65001
 
 ! Router ID
 bgp router-id 1.1.1.1
 
 ! Desactivar sincronización (obsoleto pero recomendado)
 no synchronization
 
 ! Anunciar redes (deben existir en routing table)
 network 192.168.1.0 mask 255.255.255.0
 network 192.168.2.0 mask 255.255.255.0
 
 ! Configurar vecino eBGP
 neighbor 203.0.113.1 remote-as 65002
 neighbor 203.0.113.1 description ISP_Primary
 
 ! Opcional: Timers
 neighbor 203.0.113.1 timers 30 90
 
 ! Opcional: Autenticación MD5
 neighbor 203.0.113.1 password cisco123
```

### Configuración iBGP (Full Mesh)

```cisco
router bgp 65001
 bgp router-id 1.1.1.1
 
 ! Vecinos iBGP (mismo AS)
 neighbor 192.168.1.2 remote-as 65001
 neighbor 192.168.1.2 update-source Loopback0
 neighbor 192.168.1.2 next-hop-self
 
 neighbor 192.168.1.3 remote-as 65001
 neighbor 192.168.1.3 update-source Loopback0
 neighbor 192.168.1.3 next-hop-self
```

### Route Reflectors (Evitar Full Mesh)

```cisco
! Configurar Route Reflector
router bgp 65001
 neighbor 192.168.1.2 remote-as 65001
 neighbor 192.168.1.2 route-reflector-client
 
 neighbor 192.168.1.3 remote-as 65001
 neighbor 192.168.1.3 route-reflector-client
```

### Confederaciones BGP

Dividir un AS en sub-AS:

```cisco
! BGP Confederation
router bgp 65001
 bgp confederation identifier 100
 bgp confederation peers 65002 65003
 
 neighbor 10.1.1.2 remote-as 65002
 neighbor 10.1.1.6 remote-as 65003
```

### Manipulación de Rutas BGP

```cisco
! Usar route-maps para modificar atributos
router bgp 65001
 neighbor 203.0.113.1 route-map SET_LOCAL_PREF in

! Crear route-map
route-map SET_LOCAL_PREF permit 10
 match ip address PREFIX_LIST_1
 set local-preference 200

route-map SET_LOCAL_PREF permit 20
 set local-preference 100

! Definir prefix-list
ip prefix-list PREFIX_LIST_1 seq 5 permit 192.168.0.0/16 le 24
```

### BGP Path Selection (Simplificado)

Orden de preferencia:

1. Weight (Cisco propietario, mayor es mejor)
2. Local Preference (mayor es mejor)
3. Locally originated
4. AS Path (más corto es mejor)
5. Origin type (IGP < EGP < Incomplete)
6. MED (menor es mejor)
7. eBGP sobre iBGP
8. Métrica IGP al next-hop

---

## Redistribution de Rutas

### Conceptos

Redistribution permite que rutas aprendidas por un protocolo se anuncien en otro.

**Consideraciones importantes:**
- **Metric**: Debe configurarse o usar default
- **AD**: Posibles problemas de rutas subóptimas
- **Routing Loops**: Pueden ocurrir sin cuidado

### Redistribution Básica

```cisco
! Redistribuir OSPF en EIGRP
router eigrp 100
 redistribute ospf 1 metric 10000 100 255 1 1500

! Redistribuir EIGRP en OSPF
router ospf 1
 redistribute eigrp 100 subnets metric 50 metric-type 1

! Redistribuir estáticas
 redistribute static
```

### Redistribution con Route-maps

```cisco
! Controlar qué rutas redistribuir
router ospf 1
 redistribute eigrp 100 route-map FILTER_EIGRP subnets

! Crear route-map
route-map FILTER_EIGRP permit 10
 match ip address 10
 set metric 50
 set metric-type type-1

route-map FILTER_EIGRP deny 20
 match ip address 20

! ACLs para matching
access-list 10 permit 192.168.1.0 0.0.0.255
access-list 20 permit 10.0.0.0 0.0.255.255
```

### Evitar Routing Loops

```cisco
! Usar tags para evitar loops
! En OSPF
route-map OSPF_TO_EIGRP
 set tag 100

! En EIGRP
route-map EIGRP_TO_OSPF
 match tag 100
 deny

route-map EIGRP_TO_OSPF 20
 permit
```

---

## Troubleshooting de Routing

### Comandos Esenciales

```cisco
! Ver tabla de routing
show ip route
show ip route ospf
show ip route eigrp
show ip route bgp
show ip route static

! Ver routing específico
show ip route 192.168.1.0
show ip route 192.168.1.0 255.255.255.0

! Ver protocolos habilitados
show ip protocols
show ip protocols summary

! Ver interfaces con IP
show ip interface brief

! Ver CEF (Cisco Express Forwarding)
show ip cef
show ip cef 192.168.1.0

! Ver adjacency
show adjacency
```

### Troubleshooting OSPF

```cisco
! Ver vecinos
show ip ospf neighbor
show ip ospf neighbor detail

! Ver interfaces OSPF
show ip ospf interface
show ip ospf interface brief

! Ver base de datos
show ip ospf database
show ip ospf database router
show ip ospf database summary

! Ver estadísticas
show ip ospf statistics
show ip ospf border-routers

! Debug
debug ip ospf adj
debug ip ospf events
debug ip ospf packet
```

### Troubleshooting EIGRP

```cisco
! Ver vecinos
show ip eigrp neighbors
show ip eigrp neighbors detail

! Ver interfaces
show ip eigrp interfaces
show ip eigrp interfaces detail

! Ver topology table
show ip eigrp topology
show ip eigrp topology all-links

! Ver traffic
show ip eigrp traffic

! Ver accounting
show ip eigrp accounting

! Debug
debug ip eigrp
debug ip eigrp neighbor
```

### Troubleshooting BGP

```cisco
! Ver vecinos
show ip bgp summary
show ip bgp neighbors
show ip bgp neighbors 203.0.113.1

! Ver tabla BGP
show ip bgp
show ip bgp 192.168.0.0
show ip bgp regexp ^65001$

! Ver rutas recibidas/enviadas
show ip bgp neighbors 203.0.113.1 received-routes
show ip bgp neighbors 203.0.113.1 advertised-routes

! Ver updates
show ip bgp neighbors 203.0.113.1 routes

! Ver dampening
show ip bgp dampening
show ip bgp flap-statistics

! Debug
debug ip bgp
debug ip bgp updates
debug ip bgp events
```

### Problemas Comunes y Soluciones

#### Problema 1: OSPF no forma adyacencia

**Verificaciones**:
1. ¿Están en la misma área?
2. ¿Timers de Hello/Dead coinciden?
3. ¿Autenticación coincide?
4. ¿MTU coincide?
5. ¿Network type coincide?

```cisco
! Verificar en ambos routers
show ip ospf interface [interface]
show ip ospf neighbor
```

**Solución**:
```cisco
! Asegurar mismos parámetros
interface GigabitEthernet0/0
 ip ospf hello-interval 10
 ip ospf dead-interval 40
 ip ospf network broadcast
```

#### Problema 2: EIGRP no forma adyacencia

**Verificaciones**:
1. ¿Mismo AS number?
2. ¿K-values coinciden?
3. ¿Autenticación coincide?
4. ¿La red está en network statement?

```cisco
show ip eigrp neighbors
show ip protocols | include EIGRP
```

**Solución**:
```cisco
! Verificar AS
router eigrp 100

! Verificar K-values (deben ser iguales)
show ip protocols

! Si es necesario, configurar explícitamente
metric weights 0 1 0 1 0 0
```

#### Problema 3: BGP en estado Active/Idle

**Verificaciones**:
1. ¿Conectividad IP con el vecino?
2. ¿Número de AS correcto?
3. ¿Puerto 179/tcp abierto?

```cisco
! Verificar conectividad
ping 203.0.113.1

! Verificar estado
show ip bgp summary
show tcp brief

! Verificar ACLs
show ip access-lists
```

**Solución**:
```cisco
! Verificar configuración
router bgp 65001
 neighbor 203.0.113.1 remote-as 65002

! Resetear sesión BGP si es necesario
clear ip bgp 203.0.113.1

! O suave (sin cortar conexión)
clear ip bgp 203.0.113.1 soft
```

#### Problema 4: Rutas no aparecen en tabla de routing

**Verificaciones**:
```cisco
! Verificar que existen en protocolo
show ip ospf database
show ip eigrp topology
show ip bgp

! Verificar filtrado
show ip protocols | include filter
show route-map

! Verificar AD
show ip route [network]
```

**Causas comunes**:
- Filtros (distribute-list, route-map)
- Mayor AD que otra ruta
- Red no incluida en network statement
- Next-hop no alcanzable (BGP)

#### Problema 5: Suboptimal routing

**Verificaciones**:
```cisco
! Verificar múltiples rutas
show ip route [network]
show ip cef [network]

! Verificar AD
show ip protocols
```

**Solución**:
- Ajustar métricas (cost, delay, bandwidth)
- Modificar AD si es necesario
- Usar policy routing

---

## Ejemplos Completos

### Escenario 1: Single Area OSPF

```cisco
! R1 - Central router
hostname R1

interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown

interface GigabitEthernet0/1
 ip address 192.168.2.1 255.255.255.0
 no shutdown

interface GigabitEthernet0/2
 ip address 192.168.3.1 255.255.255.0
 no shutdown

router ospf 1
 router-id 1.1.1.1
 network 192.168.0.0 0.0.255.255 area 0
 auto-cost reference-bandwidth 1000
```

### Escenario 2: Multi-Area OSPF con Stub

```cisco
! R2 - ABR entre área 0 y área 1
hostname R2-ABR

! Interfaces
interface GigabitEthernet0/0
 ip address 10.0.0.2 255.255.255.252
 description Link to Area 0
 no shutdown

interface GigabitEthernet0/1
 ip address 172.16.0.1 255.255.255.0
 description Link to Area 1
 no shutdown

! OSPF
router ospf 1
 router-id 2.2.2.2
 network 10.0.0.0 0.0.0.3 area 0
 network 172.16.0.0 0.0.0.255 area 1
 area 1 stub no-summary

! Ruta por defecto
ip route 0.0.0.0 0.0.0.0 10.0.0.1
router ospf 1
 default-information originate
```

### Escenario 3: EIGRP con Autenticación

```cisco
! Configuración EIGRP con seguridad
hostname R3

! Key chain
key chain EIGRP_AUTH
 key 1
  key-string SECURE_KEY_123
  cryptographic-algorithm hmac-sha-256

! Interfaces
interface GigabitEthernet0/0
 ip address 10.1.1.1 255.255.255.252
 no shutdown

interface GigabitEthernet0/1
 ip address 192.168.10.1 255.255.255.0
 no shutdown

! EIGRP Named Mode
router eigrp CORP_EIGRP
 address-family ipv4 autonomous-system 100
  af-interface GigabitEthernet0/0
   authentication mode hmac-sha-256
   authentication key-chain EIGRP_AUTH
   hello-interval 3
   hold-time 9
  af-interface GigabitEthernet0/1
   passive-interface
  topology base
   redistribute static
  network 10.1.1.0 0.0.0.3
  network 192.168.10.0 0.0.0.255
```

### Escenario 4: BGP Dual-Homed

```cisco
! Router con conexiones a dos ISPs
hostname R4-Edge

! Interfaces
interface GigabitEthernet0/0
 ip address 203.0.113.2 255.255.255.252
 description ISP_Primary
 no shutdown

interface GigabitEthernet0/1
 ip address 198.51.100.2 255.255.255.252
 description ISP_Backup
 no shutdown

! Loopback para BGP
interface Loopback0
 ip address 1.1.1.1 255.255.255.255

! BGP
router bgp 65001
 bgp router-id 1.1.1.1
 
 ! Networks locales
 network 192.168.0.0 mask 255.255.0.0
 
 ! Vecinos
 neighbor 203.0.113.1 remote-as 65002
 neighbor 203.0.113.1 description ISP_Primary
 neighbor 203.0.113.1 route-map PRIMARY_IN in
 neighbor 203.0.113.1 route-map PRIMARY_OUT out
 
 neighbor 198.51.100.1 remote-as 65003
 neighbor 198.51.100.1 description ISP_Backup
 neighbor 198.51.100.1 route-map BACKUP_IN in
 neighbor 198.51.100.1 route-map BACKUP_OUT out

! Route Maps para influenciar routing
route-map PRIMARY_IN permit 10
 set local-preference 200

route-map BACKUP_IN permit 10
 set local-preference 100

route-map PRIMARY_OUT permit 10
 set as-path prepend 65001 65001 65001

route-map BACKUP_OUT permit 10
```

---

## Checklist de Configuración

### Pre-configuración
- [ ] Documentar esquema de direccionamiento IP
- [ ] Definir protocolo de routing apropiado
- [ ] Planificar áreas/jerarquía (OSPF)
- [ ] Asignar AS numbers (BGP/EIGRP)
- [ ] Documentar Router IDs planificados
- [ ] Definir políticas de routing si aplica

### Configuración OSPF
- [ ] Configurar Router ID explícito
- [ ] Anunciar todas las redes necesarias
- [ ] Configurar autenticación si es requerida
- [ ] Ajustar reference-bandwidth según enlaces
- [ ] Configurar áreas stub si aplica
- [ ] Propagar ruta por defecto si es ABR/ASBR

### Configuración EIGRP
- [ ] Usar AS number correcto
- [ ] Desactivar auto-summary
- [ ] Configurar Router ID
- [ ] Verificar K-values consistentes
- [ ] Configurar interfaces pasivas
- [ ] Configurar autenticación si es requerida

### Configuración BGP
- [ ] Configurar Router ID
- [ ] Anunciar redes con máscara correcta
- [ ] Configurar vecinos con AS correcto
- [ ] Verificar conectividad IP con vecinos
- [ ] Configurar timers según requerimientos
- [ ] Implementar route-maps para políticas

### Verificación
- [ ] `show ip route` - Rutas aprendidas
- [ ] `show ip protocols` - Protocolos configurados
- [ ] Ping entre todas las redes
- [ ] Traceroute verifica path correcto
- [ ] Convergencia ante falla
- [ ] Documentación actualizada
