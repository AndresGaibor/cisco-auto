# 📚 Escenarios CCNA para cisco-auto (Parte 1 y 2)

Este documento contiene la lista maestra de los 76 escenarios para el desarrollo, depuración e iteración de laboratorios mediante la CLI.

---

## Parte 1: Fundamentos, Switching, VLANs, STP, EtherChannel y DHCP (1-38)

### 1. Fundamentos y Conectividad Básica
1. **LAN mínima de 2 PCs y 1 switch**: Validar conectividad L2/L3 básica.
2. **3 PCs y 1 switch con prueba de ARP**: Entender aprendizaje MAC y flooding.
3. **Router entre dos redes simples**: Validar forwarding L3 entre interfaces.
4. **Gateway mal configurado**: Detectar fallos de salida a redes externas.
5. **Máscara incorrecta en un host**: Detectar errores de subnetting lógico.
6. **IP duplicada en servidores o PCs**: Identificar conflictos de red clásicos.
7. **Switch de acceso documentado**: Ordenar nombres, etiquetas y puertos.
8. **Subnetting básico con dos LANs pequeñas**: Diseño de direccionamiento (/26).

### 2. VLANs y Trunks
9. **Dos VLANs en un solo switch**: Segmentación L2 básica (VLAN 10 y 20).
10. **VLANs extendidas entre dos switches**: Enlaces troncales (Trunks).
11. **Native VLAN distinta**: Validar consistencia de la VLAN nativa (VLAN 99).
12. **Allowed VLANs restringidas**: Controlar qué VLANs cruzan el trunk.
13. **VLAN de administración**: Separar management (SVI) de usuarios.
14. **Puerto access mal asignado**: Validación de asignación puerto a puerto.
15. **VLAN de impresoras**: Segmentación de recursos compartidos.
16. **VLAN por departamentos**: Diseño empresarial (Ventas, RRHH, TI).

### 3. Spanning Tree Protocol (STP)
17. **Redundancia L2 con 3 switches**: Ver STP bloqueando caminos para evitar loops.
18. **Elegir root bridge manualmente**: Ajuste de prioridad de STP.
19. **Root secundario**: Preparar contingencia para el Root Bridge.
20. **PortFast en puertos de usuario**: Convergencia rápida para hosts finales.
21. **BPDU Guard**: Protección contra switches no autorizados.
22. **Fallo de enlace redundante**: Verificar reconvergencia tras caída.

### 4. EtherChannel
23. **EtherChannel LACP básico**: Agregación de enlaces dinámica (Standard).
24. **EtherChannel PAgP básico**: Agregación de enlaces propietaria (Cisco).
25. **EtherChannel troncal**: Combinar Trunking sobre un Port-Channel.
26. **EtherChannel con mismatch de trunk**: Diagnóstico de parámetros inconsistentes.
27. **EtherChannel con allowed VLANs distintas**: Detección de errores sutiles de trunk.
28. **EtherChannel + STP**: Validar el bundle como una sola ruta lógica.

### 5. Inter-VLAN Routing
29. **Router-on-a-stick básico**: Subinterfaces dot1Q en Router.
30. **Tres VLANs con router-on-a-stick**: Escalado de subinterfaces.
31. **VLAN de management separada**: Acceso administrativo inter-VLAN.
32. **Multilayer switch con SVIs**: Ruteo L3 sin router externo.
33. **Migración de Router-on-a-stick a Switch L3**: Comparativa de rendimiento.
34. **Inter-VLAN con una VLAN caída**: Troubleshooting de SVIs/Subinterfaces.

### 6. DHCPv4 Básico
35. **Router como servidor DHCP**: Automatización de IPs en una LAN.
36. **DHCP con excluded addresses**: Protección de IPs estáticas.
37. **DHCP por VLAN con router-on-a-stick**: Pools dinámicos por segmento.
38. **DHCP relay hacia servidor central**: Uso de `ip helper-address`.

---

## Parte 2: DHCP Avanzado, ACLs, NAT/PAT, SSH, HSRP y WLAN (39-76)

### 7. DHCP Avanzado
39. **DHCP por VLAN usando switch capa 3**: Pools en MLS.
40. **DHCP centralizado con relay**: Un solo server para todo el campus.
41. **DHCP con DNS entregado**: Resolución de nombres automática.
42. **DHCP con exclusiones correctas**: Evitar conflictos con impresoras/APs.
43. **DHCP mal entregando gateway**: Diagnóstico de "IP recibida pero sin internet".
44. **DHCP con máscara incorrecta**: Errores de lógica en el pool.
45. **DHCP agotado por rango pequeño**: Validación de capacidad.
46. **DHCP por VLAN en puerto equivocado**: El puerto determina la IP.

### 8. ACLs IPv4 (Standard & Extended)
47. **ACL estándar bloqueando red origen**: Filtrado básico.
48. **ACL estándar solo TI a management**: Restringir VTY.
49. **ACL extendida bloqueando HTTP**: Filtrado por protocolo (TCP/80).
50. **ACL extendida bloqueando FTP**: Separación de aplicaciones.
51. **ACL inbound vs outbound**: Entender la dirección del tráfico.
52. **ACL para proteger VTY**: Hardening de acceso remoto.
53. **ACL entre VLANs**: Políticas internas en Router-on-a-stick.
54. **ACL de invitados**: Internet permitido, red interna prohibida.
55. **ACL con deny implícito**: Interiorizar el comportamiento final de la lista.
56. **ACL de troubleshooting puro**: Corregir una red rota por reglas mal puestas.

### 9. NAT y PAT
57. **PAT básico (Overload)**: Muchos hosts, una sola IP pública.
58. **NAT estático para servidor web**: Publicación de servicios internos.
59. **NAT estático + PAT simultáneos**: Escenario de borde real.
60. **NAT dinámico con pool**: Uso de varias IPs públicas sin overload.
61. **NAT con ACL incorrecta**: Tráfico no seleccionado para traducir.
62. **NAT con inside/outside invertidos**: Error de configuración en interfaces.
63. **NAT con DNS y servidor publicado**: Acceso por nombre desde el exterior.
64. **PAT para varias VLANs**: Salida segmentada.
65. **NAT + ACL perimetral**: Seguridad en el borde de la red.
66. **NAT de diagnóstico completo**: Corregir un borde totalmente roto.

### 10. SSH y Hardening
67. **SSH básico en un router**: Hostname, domain, RSA keys, VTY.
68. **SSH en switch de acceso**: Administración segura en L2.
69. **Solo SSH, sin Telnet**: Restringir `transport input`.
70. **Hardening básico de router**: Passwords, banner, service encryption.
71. **Hardening básico de switch**: SVI segura y bloqueo de puertos.
72. **Acceso administrativo solo desde TI**: ACL + SSH combinados.

### 11. HSRP (First Hop Redundancy)
73. **HSRP básico con dos routers**: IP virtual como gateway.
74. **HSRP con preempt**: Recuperación del rol activo.
75. **HSRP con fallo del activo**: Validación de convergencia.
76. **HSRP + diagnóstico**: Corregir implementación con IPs inconsistentes.

---

## Plantilla Universal de Validación
1. **Física**: Enlaces verdes, interfaces UP/UP.
2. **Capa 2**: Tabla MAC poblada, VLANs creadas, Trunks activos.
3. **Capa 3**: IPs configuradas, Gateway alcanzable, Tabla de ruteo.
4. **Servicios**: DHCP Lease exitoso, DNS resolviendo, HTTP respondiendo.
5. **Funcional**: Lo que debe pasar, pasa. Lo que no, está bloqueado.
