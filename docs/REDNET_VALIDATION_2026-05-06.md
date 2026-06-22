# RedNET Validation Review 2026-05-06

## Resultado corto

La topologia esta bien encaminada, pero la guia pegada por el usuario no estaba 100% correcta.

### Correcciones clave

- El dominio correcto es `www.rednet.com`, no `www.rednet.local`.
- `show telephony-service` no es un comando valido en este IOS/PT; usar `show running-config | section telephony-service`.
- `show ephone registered` tampoco resolvio en esta imagen; para validar CME usar `show ephone`, `show ip dhcp binding` y `show running-config | section ephone`.
- La validacion de WLC por `pt cmd` no esta disponible de forma confiable en esta sesion; validar por GUI y `device get`.
- El fallo de `pt cmd` en PCs (`HOST_EXEC_FAILED`) parece del runtime/bridge actual del proyecto, no del taller.
- En este laboratorio, `telephony-service` puede colgar o devolver `IOS_EXEC_FAILED` aunque el lab este abierto. No insistir por CLI: terminar la parte de telefonia en la GUI de Packet Tracer y validar los phones desde sus ventanas.

## Evidencia verificada

### VLAN / trunks / STP / EtherChannel

- `show vlan brief` en `MLS-CORE-1` muestra VLAN 10,20,30,40,50,55,60,65,70,80,120,130,140 y tambien 200-250.
- `show interfaces trunk` en `SW-ACC-P1` y `MLS-CORE-1` muestra trunks activos.
- `show etherchannel summary` en `MLS-CORE-1` muestra `Po1(SU)` con LACP y `Po2(SU)` con PAgP.
- `show spanning-tree summary` confirma `rapid-pvst`.
- `show running-config | include spanning-tree portfast` confirma PortFast en puertos de acceso.

### IPv4 / IPv6 / HSRP

- `show ip interface brief` en `MLS-CORE-1/2` muestra SVIs `up/up`.
- `show running-config | section interface Vlan` muestra `ip routing`, `ip helper-address`, HSRP v2 e IPv6 por SVI.
- `show standby brief` en `MLS-CORE-1/2` confirma Active/Standby por VLAN.
- `show ipv6 interface brief` y `show ipv6 route` confirman dual-stack en ambos MLS.

### DHCP / voz

- `show ip dhcp binding` en `Router0` muestra leases para VLAN 80.
- `show running-config | section ip dhcp` muestra `option 150 ip 192.168.80.4`.
- `show running-config | section telephony-service` confirma CME.
- `show interfaces fa0/11 switchport` en `SW-ACC-P1` muestra `Voice VLAN: 80`.
- Si `show running-config | section telephony-service` falla o queda vacio, el siguiente paso es GUI, no más `pt cmd`.

### WLAN / WLC

- `device get` confirma `Wireless LAN Controller0` arriba.
- `device get` confirma `LWAP-1..4` arriba y con IPs en VLAN 120.
- `device get` confirma `AP-1` y `AP-2` arriba y con IPs en VLAN 140.
- Los clientes wireless (`Laptop_WLAN`, `Smartphone_WLAN`, `Tablet_WLAN`) tienen IP asignada.

## Puntos que siguen sin cierre perfecto

- La verificacion de hosts desde `pt cmd PC1` falla con `HOST_EXEC_FAILED` en esta sesion.
- La resolucion DNS desde el router no sirve como prueba de la guia porque el router no tenia `show hosts` preparado para ese dominio.
- La validacion funcional de llamadas VoIP y autenticacion WLC sigue dependiendo de pruebas GUI / cliente final.

## Comandos que si deben quedar en la guia

```ios
show running-config | section telephony-service
show ephone
show ip dhcp binding
show standby brief
show ipv6 interface brief
show ipv6 route
```

## Comandos que deben corregirse o evitarse

```ios
show telephony-service
show ephone registered
www.rednet.local
```

Reemplazos recomendados:

```text
www.rednet.com
show running-config | section telephony-service
show ephone
```
