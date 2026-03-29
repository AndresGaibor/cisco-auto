# Guía de Seguridad en Redes

Guía completa para configuración de ACLs, NAT, VPNs y otras funcionalidades de seguridad.

## Tabla de Contenidos

1. [ACLs (Access Control Lists)](#acls-access-control-lists)
2. [NAT (Network Address Translation)](#nat-network-address-translation)
3. [VPNs IPsec](#vpns-ipsec)
4. [DHCP Snooping](#dhcp-snooping)
5. [Dynamic ARP Inspection](#dynamic-arp-inspection)
6. [SSH y Acceso Seguro](#ssh-y-acceso-seguro)

---

## ACLs (Access Control Lists)

### Tipos de ACLs

| Tipo | Número/Nombre | Función |
|------|---------------|---------|
| **Standard** | 1-99, 1300-1999 | Filtra por IP origen |
| **Extended** | 100-199, 2000-2699 | Filtra por IP origen/destino, puerto, protocolo |
| **Named** | Nombre personalizado | Standard o Extended con nombre descriptivo |
| **Reflexive** | Named | Stateful filtering |
| **Time-based** | Named | Activa en horarios específicos |

### ACLs Standard

```cisco
! Crear ACL Standard numerada
access-list 10 permit 192.168.1.0 0.0.0.255
access-list 10 deny any log

! Crear ACL Standard named
ip access-list standard ALLOW_MGMT
 permit 192.168.10.0 0.0.0.255
 permit 10.0.0.0 0.0.255.255
 deny any log

! Aplicar a interfaz
interface GigabitEthernet0/0
 ip access-group 10 in
 exit
```

### ACLs Extended

```cisco
! Sintaxis básica
access-list [100-199] [permit|deny] [protocol] [source] [destination] [opciones]

! Ejemplos:

! Permitir HTTP desde red interna a Internet
access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 80

! Permitir HTTPS
access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 443

! Permitir DNS
access-list 100 permit udp 192.168.1.0 0.0.0.255 any eq 53
access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 53

! Permitir retorno de conexiones establecidas
access-list 100 permit tcp any any established

! Denegar todo lo demás y loggear
access-list 100 deny ip any any log
```

### ACLs Extended Named

```cisco
! Crear ACL Extended named
ip access-list extended INTERNET_ACCESS

 ! Permitir ping
 permit icmp any any echo
 permit icmp any any echo-reply

 ! Permitir tráfico HTTP/HTTPS
 permit tcp 192.168.1.0 0.0.0.255 any eq www
 permit tcp 192.168.1.0 0.0.0.255 any eq 443

 ! Permitir DNS
 permit udp 192.168.1.0 0.0.0.255 any eq domain
 permit tcp 192.168.1.0 0.0.0.255 any eq domain

 ! Permitir SSH desde red de administración
 permit tcp 192.168.100.0 0.0.0.255 any eq 22

 ! Denegar telnet (inseguro)
 deny tcp any any eq 23 log

 ! Denegar todo lo demás
 deny ip any any log

! Aplicar a interfaz
interface GigabitEthernet0/1
 ip access-group INTERNET_ACCESS out
 exit
```

### ACLs para Tráfico Específico

```cisco
! Permitir acceso a servidor web específico
ip access-list extended WEB_SERVER_ACCESS
 permit tcp any host 192.168.1.10 eq 80
 permit tcp any host 192.168.1.10 eq 443
 deny ip any host 192.168.1.10 log
 permit ip any any

! Restringir acceso SSH a hosts específicos
ip access-list standard SSH_ACCESS
 permit host 192.168.100.10
 permit host 192.168.100.11
 deny any log

! Aplicar a líneas VTY
line vty 0 4
 access-class SSH_ACCESS in
 transport input ssh
```

### Wildcard Masks (Máscaras de Wildcard)

| Dirección | Wildcard | Descripción |
|-----------|----------|-------------|
| 192.168.1.0 0.0.0.255 | /24 | Toda la red clase C |
| 192.168.1.0 0.0.0.15 | /28 | 16 direcciones |
| 192.168.1.0 0.0.0.3 | /30 | 4 direcciones (enlace punto a punto) |
| 192.168.1.1 0.0.0.0 | /32 | Host específico |
| any | 255.255.255.255 | Cualquier dirección |

**Cálculo**: Wildcard = 255.255.255.255 - Subnet Mask

### Reglas Importantes de ACLs

1. **Orden de procesamiento**: Secuencial de arriba hacia abajo
2. **Implicit deny**: Al final de toda ACL hay un `deny any` invisible
3. **Aplicación**: Una ACL por interfaz, por dirección (in/out)
4. **Colocación**: Standard cerca del destino, Extended cerca del origen

---

## NAT (Network Address Translation)

### Tipos de NAT

| Tipo | Descripción | Uso |
|------|-------------|-----|
| **Static NAT** | 1:1 mapeo fijo | Servidores accesibles desde Internet |
| **Dynamic NAT** | Pool de direcciones | Muchos hosts, varias IPs públicas |
| **PAT/NAT Overload** | Muchos:1 (con puertos) | Acceso a Internet (más común) |

### Static NAT

```cisco
! Mapeo 1:1 interno:externo
ip nat inside source static 192.168.1.10 203.0.113.10

! Configurar interfaces
interface GigabitEthernet0/0
 description LAN
 ip address 192.168.1.1 255.255.255.0
 ip nat inside
 no shutdown

interface GigabitEthernet0/1
 description WAN
 ip address 203.0.113.1 255.255.255.252
 ip nat outside
 no shutdown
```

### Dynamic NAT

```cisco
! Definir pool de direcciones públicas
ip nat pool PUBLIC_POOL 203.0.113.10 203.0.113.20 netmask 255.255.255.0

! Definir redes internas que pueden usar NAT
access-list 1 permit 192.168.1.0 0.0.0.255
access-list 1 permit 192.168.2.0 0.0.0.255

! Configurar NAT
ip nat inside source list 1 pool PUBLIC_POOL

! Interfaces
interface GigabitEthernet0/0
 ip nat inside

interface GigabitEthernet0/1
 ip nat outside
```

### PAT / NAT Overload

```cisco
! Método 1: Usar interfaz
access-list 1 permit 192.168.0.0 0.0.255.255

ip nat inside source list 1 interface GigabitEthernet0/1 overload

! Método 2: Usar pool
ip nat pool PUBLIC_POOL 203.0.113.10 203.0.113.10 netmask 255.255.255.0

ip nat inside source list 1 pool PUBLIC_POOL overload

! Interfaces
interface GigabitEthernet0/0
 ip nat inside

interface GigabitEthernet0/1
 ip address 203.0.113.1 255.255.255.252
 ip nat outside
```

### NAT con Servidores Internos (Port Forwarding)

```cisco
! Redirigir puertos específicos
ip nat inside source static tcp 192.168.1.10 80 203.0.113.10 80
ip nat inside source static tcp 192.168.1.10 443 203.0.113.10 443
ip nat inside source static tcp 192.168.1.11 25 203.0.113.11 25

! PAT para usuarios
access-list 1 permit 192.168.0.0 0.0.0.255
ip nat inside source list 1 interface GigabitEthernet0/1 overload
```

### Troubleshooting NAT

```cisco
! Ver traducciones activas
show ip nat translations
show ip nat translations verbose

! Ver estadísticas
show ip nat statistics

! Debug
debug ip nat

! Limpiar traducciones
clear ip nat translation *
clear ip nat translation inside 192.168.1.10

! Verificar configuración
show run | include ip nat
```

---

## VPNs IPsec

### Conceptos IPsec

| Componente | Función |
|------------|---------|
| **IKE** (Internet Key Exchange) | Negociación de parámetros y claves |
| **ISAKMP** | Marco para autenticación y negociación |
| **ESP** (Encapsulating Security Payload) | Encriptación y autenticación |
| **AH** (Authentication Header) | Autenticación (sin encriptación) |

### Fases de IPsec

**Fase 1 (IKE)**: Establece túnel seguro para negociación
- Autenticación de peers
- Intercambio de claves
- Negociación de parámetros

**Fase 2 (IPsec)**: Establece túnel para datos
- Negociación de transform sets
- Establecimiento de SA (Security Associations)

### Configuración VPN Site-to-Site

```cisco
! === R1 (Local: 192.168.1.0/24, Public: 203.0.113.1) ===

! Política ISAKMP (Fase 1)
crypto isakmp policy 10
 encr aes 256
 hash sha
 authentication pre-share
 group 14
 lifetime 86400

! Clave pre-shared
crypto isakmp key SECRET_KEY address 198.51.100.1

! Transform Set (Fase 2)
crypto ipsec transform-set MY_TRANSFORM_SET esp-aes 256 esp-sha-hmac
 mode tunnel

! ACL para tráfico interesante
access-list 100 permit ip 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255

! Crypto Map
crypto map MY_CRYPTO_MAP 10 ipsec-isakmp
 set peer 198.51.100.1
 set transform-set MY_TRANSFORM_SET
 match address 100

! Aplicar a interfaz
interface GigabitEthernet0/1
 crypto map MY_CRYPTO_MAP
```

```cisco
! === R2 (Local: 192.168.2.0/24, Public: 198.51.100.1) ===

! Política ISAKMP
crypto isakmp policy 10
 encr aes 256
 hash sha
 authentication pre-share
 group 14
 lifetime 86400

! Clave pre-shared
crypto isakmp key SECRET_KEY address 203.0.113.1

! Transform Set
crypto ipsec transform-set MY_TRANSFORM_SET esp-aes 256 esp-sha-hmac
 mode tunnel

! ACL para tráfico interesante
access-list 100 permit ip 192.168.2.0 0.0.0.255 192.168.1.0 0.0.0.255

! Crypto Map
crypto map MY_CRYPTO_MAP 10 ipsec-isakmp
 set peer 203.0.113.1
 set transform-set MY_TRANSFORM_SET
 match address 100

! Aplicar a interfaz
interface GigabitEthernet0/1
 crypto map MY_CRYPTO_MAP
```

### Troubleshooting VPN

```cisco
! Ver SA establecidas
show crypto isakmp sa
show crypto ipsec sa

! Ver políticas
show crypto isakmp policy
show crypto ipsec transform-set

! Ver crypto maps
show crypto map

! Debug
debug crypto isakmp
debug crypto ipsec
debug crypto engine

! Limpiar SA
clear crypto sa
clear crypto sa peer 198.51.100.1
clear crypto isakmp
```

---

## DHCP Snooping

### Conceptos

- **Trusted Ports**: Puertos donde se conectan servidores DHCP legítimos
- **Untrusted Ports**: Puertos de acceso hacia clientes
- **Binding Database**: Registro de asignaciones IP-MAC

### Configuración

```cisco
! Habilitar DHCP Snooping global
ip dhcp snooping

! Habilitar en VLANs específicas
ip dhcp snooping vlan 10,20,99

! Configurar puerto trusted (hacia servidor DHCP)
interface GigabitEthernet0/1
 description Link to DHCP Server
 ip dhcp snooping trust
 exit

! Opcional: Limitar requests por segundo (protección DoS)
interface FastEthernet0/1
 ip dhcp snooping limit rate 10
 exit

! Verificar
show ip dhcp snooping
show ip dhcp snooping binding
show ip dhcp snooping statistics
```

### Opciones Adicionales

```cisco
! Habilitar Option 82 (información de circuito)
ip dhcp snooping information option

! Verificar source MAC en solicitudes DHCP
ip dhcp snooping verify mac-address
```

---

## Dynamic ARP Inspection

### Conceptos

- **DAI**: Valida ARP packets contra DHCP snooping binding database
- Previene ARP spoofing/poisoning

### Configuración

```cisco
! Habilitar DAI en VLANs
ip arp inspection vlan 10,20,99

! Configurar puerto trusted
interface GigabitEthernet0/1
 ip arp inspection trust
 exit

! Configurar ARP ACL para hosts estáticos
arp access-list STATIC_HOSTS
 permit ip host 192.168.1.10 mac host 0001.0002.0003

! Aplicar ACL
ip arp inspection filter STATIC_HOSTS vlan 10

! Verificar
show ip arp inspection
show ip arp inspection statistics
show ip arp inspection interfaces
```

### Rate Limiting

```cisco
! Limitar ARP requests por segundo
interface FastEthernet0/1
 ip arp inspection limit rate 15
 exit
```

---

## SSH y Acceso Seguro

### Configuración SSH

```cisco
! Configurar hostname y domain
hostname SW1
ip domain-name empresa.local

! Generar claves RSA
crypto key generate rsa general-keys modulus 2048

! Crear usuario
username admin privilege 15 secret cisco123

! Configurar líneas VTY
line vty 0 15
 login local
 transport input ssh
 exec-timeout 5 0
 exit

! Versión SSH 2 solamente
ip ssh version 2

! Opcional: Limitar intentos de login
ip ssh authentication-retries 3
ip ssh time-out 60

! Desactivar Telnet (inseguro)
no service telnet
```

### Banner de Seguridad

```cisco
! Banner al iniciar sesión
banner motd ^
************************************************************
*                        WARNING                           *
*                                                          *
*  This system is for authorized use only.                 *
*  Unauthorized access is prohibited.                      *
*  All activities are monitored and logged.                *
************************************************************
^
```

### AAA Básico (Autenticación Local)

```cisco
! Habilitar nuevo modelo AAA
aaa new-model

! Configurar autenticación por defecto
aaa authentication login default local
aaa authorization exec default local

! O usar método alternativo si local falla
aaa authentication login default local none
```

### Control de Acceso al Switch

```cisco
! ACL para acceso de administración
ip access-list standard MGMT_ACCESS
 permit 192.168.99.0 0.0.0.255
 permit host 10.0.0.100
 deny any log

! Aplicar a líneas VTY
line vty 0 15
 access-class MGMT_ACCESS in
 transport input ssh
 exit

! Proteger puerto de consola
line con 0
 exec-timeout 5 0
 password SECURE_CONSOLE_PASS
 login
 exit
```

### Seguridad de Puertos Adicional

```cisco
! Desactivar servicios innecesarios
no service pad
no ip http server
no ip http secure-server

! Protección contra CDP/LLDP spoofing
no cdp run
no lldp run

! O habilitar solo en interfaces específicas
cdp run
interface FastEthernet0/1
 cdp enable
```

---

## Troubleshooting de Seguridad

### Comandos Útiles

```cisco
! Ver ACLs
show access-lists
show ip access-lists
show ip interface GigabitEthernet0/0 | include access

! Ver NAT
show ip nat translations
show ip nat statistics

! Ver VPN
show crypto isakmp sa
show crypto ipsec sa

! Ver DHCP Snooping
show ip dhcp snooping
show ip dhcp snooping binding

! Ver ARP Inspection
show ip arp inspection
show ip arp inspection statistics

! Ver sesiones activas
show users
show sessions
```

### Problemas Comunes

#### NAT no funciona

```cisco
! Verificar configuración
show run | section ip nat

! Verificar inside/outside
show ip interface brief

! Verificar ACL
show access-list 1

! Debug
debug ip nat
```

#### VPN no establece

```cisco
! Verificar ISAKMP SA
show crypto isakmp sa

! Si está en MM_NO_STATE o AG_NO_STATE: problema Fase 1
! Si está en QM_IDLE pero no IPsec SA: problema Fase 2

! Verificar políticas coinciden
show crypto isakmp policy

! Verificar peer alcanzable
ping 198.51.100.1

! Verificar ACL mirror
show access-list 100
```

#### DHCP Snooping bloquea clientes legítimos

```cisco
! Verificar binding
show ip dhcp snooping binding

! Si no hay entrada, verificar:
! - Puerto hacia servidor es trusted
! - DHCP snooping habilitado en VLAN correcta

! Verificar interfaces
show ip dhcp snooping interface FastEthernet0/1
```

---

## Checklist de Seguridad

### Configuración Básica
- [ ] Hostname configurado
- [ ] Banner de seguridad MOTD
- [ ] Enable secret en lugar de password
- [ ] Usuarios locales configurados
- [ ] Líneas VTY protegidas con login local
- [ ] SSH habilitado, Telnet desactivado
- [ ] Timeout en líneas configurado
- [ ] Servicios innecesarios desactivados

### ACLs
- [ ] ACLs definidas según política de seguridad
- [ ] ACLs aplicadas en interfaces correctas
- [ ] Orden de reglas optimizado (más específico primero)
- [ ] Logging habilitado para denies

### NAT
- [ ] Tipo de NAT apropiado (Static/Dynamic/PAT)
- [ ] Interfaces inside/outside correctamente identificadas
- [ ] ACL define tráfico a traducir
- [ ] Verificar traducciones funcionan

### VPN
- [ ] Políticas ISAKMP coinciden en ambos lados
- [ ] Transform sets coinciden
- [ ] Clave pre-shared correcta
- [ ] ACLs mirror (tráfico interesante)
- [ ] SA establecidas

### Switch Security
- [ ] Port security en puertos de acceso
- [ ] DHCP snooping habilitado
- [ ] DAI habilitado
- [ ] BPDU Guard en puertos de acceso
- [ ] Root Guard en enlaces a otros switches
