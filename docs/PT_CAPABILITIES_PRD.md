# Especificación Completa de Capacidades: Cisco Packet Tracer

Este documento detalla **todas** las funcionalidades, dispositivos y protocolos que Cisco Packet Tracer (versiones 7.x a 8.x) soporta. El objetivo a largo plazo de `cisco-auto` es poder mapear, abstraer y generar la configuración o infraestructura equivalente a cada uno de estos elementos mediante una definición declarativa (YAML).

---

## 1. Catálogo de Dispositivos (Device Catalog)

Para recrear cualquier topología, el sistema debe ser capaz de instanciar y configurar estos equipos:

### 1.1. Routers
*   **Sucursal/Empresa (ISR):** 1841, 1941, 2811, 2901, 2911, 4321, 4331
*   **Servicios Agregados (ASR):** ASR 1000 series (emulación básica)
*   **Industrial/IoT:** Cisco 819IOX, 829, 1240
*   **PT Empty Routers:** Router-PT, Router-PT-Empty (Completamente modulares)

### 1.2. Switches
*   **Capa 2 (Access):** 2950-24, 2950T-24, 2960-24TT
*   **Capa 3 (Distribution/Core):** 3560-24PS, 3650-24PS
*   **Industriales:** IE2000
*   **Básicos:** Switch-PT, Switch-PT-Empty, Bridge-PT

### 1.3. Seguridad y Firewalls
*   **ASA:** Cisco ASA 5505, ASA 5506-X
*   **Firepower:** En emulaciones más recientes.

### 1.4. Inalámbricos (Wireless)
*   **Controladores (WLC):** WLC-3504, WLC-2504, WLC-PT
*   **Access Points:** LAP-PT, AP-PT, Aironet (Varios modelos)
*   **Routers de Consumo:** Home Router, WRT300N (Linksys)
*   **Antenas:** Cell Tower, Central Office Server (Para redes 3G/4G)

### 1.5. Dispositivos Finales (End Devices)
*   **Computación:** PC, Laptop, Server (Rackeable)
*   **Impresión:** Printer
*   **Telefonía:** IP Phone, Analog Phone
*   **Multimedia:** TV, Wireless Tablet, Smartphone
*   **Especiales:** Sniffer (Capturador de tráfico)

### 1.6. Internet of Things (IoT) & Smart City
*   **Boards:** Microcontroller (MCU-PT), Single Board Computer (SBC-PT)
*   **Sensores (Sensors):** Temperatura, Humedad, Luz, Movimiento, RFID, Fuego, Viento, Nivel de agua, etc.
*   **Actuadores (Actuators):** Motores, Puertas, Luces, Sirenas, Ventiladores, Calefactores, Aspersores, etc.
*   **Componentes de Red IoT:** Home Gateway, IoT Server, Registration Server.

### 1.7. Emulación WAN (Nube)
*   **Clouds:** Cloud-PT, Cloud-PT-Empty
*   **Módems:** DSL Modem, Cable Modem

---

## 2. Tarjetas y Módulos de Expansión (Modules)

El modelo de datos debe soportar la inserción de módulos (Cards) en las ranuras (Slots) de los dispositivos.
*   **Interfaces LAN:** FastEthernet (HWIC-4ESW, NM-1FE-TX), GigabitEthernet (HWIC-1GE-SFP, GLC-LH-SM), Ethernet de Fibra.
*   **Interfaces WAN/Serial:** Serial síncrona/asíncrona (WIC-1T, WIC-2T, HWIC-2T).
*   **Interfaces de Voz/Telefonía:** VIC2-2FXO, VIC2-2FXS.
*   **Módulos Inalámbricos:** WIC-1AM.
*   **Coverturas:** Tapas ciegas (Covers) para slots vacíos.

---

## 3. Tipos de Conexiones (Links / Cables)

La capa de enlace físico en el YAML debe poder definir el medio de transmisión exacto:
1.  **Ethernet Straight-Through** (Cobre Directo - UTP)
2.  **Ethernet Cross-Over** (Cobre Cruzado - UTP)
3.  **Fiber** (Fibra Óptica multi/monomodo)
4.  **Serial DCE** (Provee reloj/clock-rate)
5.  **Serial DTE** (Recibe reloj)
6.  **Console** (Cable de consola / Rollover)
7.  **Coaxial** (Para Cable Modems)
8.  **Phone** (RJ11 para telefonía análoga)
9.  **IoT Custom Cable** (Cableado de sensores)
10. **USB** (Para consolas modernas o transferencias)

---

## 4. Tecnologías y Protocolos a Soportar (El "Cerebro")

### 4.1. Conmutación (Capa 2 / LAN)
*   **VLANs:** Creación, asignación de puertos, Voice VLANs.
*   **Trunking:** 802.1Q, ISL, DTP (Dynamic Trunking Protocol).
*   **VTP:** Modos Server, Client, Transparent, versiones 1-3.
*   **Spanning Tree (STP):** STP tradicional, PVST+, Rapid PVST+. Ajuste de prioridades y PortFast, BPDUGuard.
*   **EtherChannel:** LACP, PAgP, Estático (Layer 2 y Layer 3).
*   **Seguridad L2:** Port Security (Sticky MAC, violation modes), DHCP Snooping, Dynamic ARP Inspection (DAI), IP Source Guard.
*   **PoE:** Power over Ethernet (activación en puertos).

### 4.2. Enrutamiento (Capa 3 / WAN)
*   **Direccionamiento:** IPv4, IPv6 (Dual Stack), EUI-64.
*   **Enrutamiento Estático:** IPv4, IPv6, Rutas por defecto, Rutas flotantes.
*   **RIP:** RIPv1, RIPv2, RIPng (IPv6).
*   **EIGRP:** Para IPv4 e IPv6, sumarización manual/automática, autenticación MD5.
*   **OSPF:** OSPFv2 (IPv4) Single/Multi-Area, OSPFv3 (IPv6), autenticación, virtual links, ajustes de costo/timers.
*   **BGP:** eBGP básico, iBGP, vecinos, publicación de redes.
*   **Redundancia (FHRP):** HSRP, VRRP, GLBP (IPv4 e IPv6, prioridades, preempt, tracking).
*   **Inter-VLAN Routing:** Router-on-a-stick (Subinterfaces 802.1Q) y SVI (Switch Virtual Interfaces en switches L3).

### 4.3. Servicios de Red (Network Services)
*   **DHCP:** Servidor DHCPv4 y DHCPv6 (Stateless/Stateful), DHCP Relay (IP Helper-Address), exclusiones.
*   **NAT/PAT:** NAT Estático, NAT Dinámico, NAT con Overload (PAT), Port Forwarding.
*   **NTP:** Network Time Protocol (Client y Server).
*   **DNS:** Resolución de nombres, ip domain-lookup.
*   **CDP / LLDP:** Descubrimiento de vecinos.

### 4.4. Seguridad de Dispositivo y Tráfico (Security)
*   **Gestión:** SSHv2, Telnet, Líneas VTY y Consola, Exec-timeout.
*   **Autenticación Base:** Passwords locales, enable secret, service password-encryption.
*   **AAA:** RADIUS, TACACS+ (Autenticación, Autorización, Contabilidad).
*   **ACLs:** Standard, Extended, Named, Numbered, IPv4 e IPv6, Time-based ACLs.
*   **VPN / Criptografía:** IPSec Site-to-Site, ISAKMP, Transform-sets, Crypto Maps. (ASA configuration y Routers).
*   **ZBF:** Zone-Based Policy Firewall.

### 4.5. Calidad de Servicio (QoS)
*   Clasificación y Marcado (CoS, DSCP, ToS).
*   Colas (Queuing) básicas: CBWFQ, LLQ.
*   Auto QoS en switches y routers (orientado a Voz IP).

### 4.6. Servidores y Aplicaciones (Servicios de End Devices)
Los PCs y Servidores en Packet Tracer tienen demonios configurables:
*   HTTP / HTTPS (Web).
*   DHCP, TFTP (Almacenamiento de configs/IOS), DNS.
*   NTP, SYSLOG, AAA.
*   Email (SMTP / POP3).
*   IoT Registration Server.

### 4.7. Automatización y Control
*   **Python / MCU:** Ejecución de código Python en los Single Board Computers para automatización IoT.
*   **SDA / APIC-EM:** Emulación del Controlador SDN (Network Controller) accesible vía web y API.

---

## 5. Hoja de Ruta para la Implementación en `cisco-auto`

Para que nuestra herramienta alcance la paridad con Packet Tracer, debemos evolucionar iterativamente la estructura Zod (`src/core/types`) y los generadores (`src/core/config-generators`).

### Fase 1: Enrutamiento Avanzado y Alta Disponibilidad (Próximo paso)
- Expandir el YAML para soportar Router-on-a-stick (subinterfaces).
- Implementar BGP básico.
- Implementar FHRP (HSRP, VRRP).
- Implementar soporte para IPv6 completo.

### Fase 2: Conmutación Avanzada y Seguridad L2
- STP, RSTP, PortFast.
- EtherChannel (LACP/PAgP).
- Port Security y DHCP Snooping.

### Fase 3: Seguridad WAN y AAA
- Servidores RADIUS/TACACS+.
- VPNs IPSec Site-to-Site.
- ZBF (Zone-Based Firewall).

### Fase 4: Servidores, Dispositivos Finales e IoT
- Capacidad de pre-configurar servicios en los Servidores PT (HTTP, TFTP, DNS).
- Generar scripts o metadata adicional que el convertidor XML de Packet Tracer pueda incrustar.
- Conexiones Wireless y Controladores WLC.

---

## 6. Conclusión de Requisitos

Modelar **absolutamente todo** requiere un esquema Zod masivo y profundamente anidado. La ventaja de la arquitectura modular que hemos creado (donde se dividieron los esquemas y los generadores de IOS) es que nos permite atacar un bloque a la vez. 

El parser inverso que hemos desarrollado (`PKAtoYAML`) tendrá que evolucionar paralelamente para saber interpretar las líneas de configuración del XML y extraer estos elementos avanzados hacia el YAML.