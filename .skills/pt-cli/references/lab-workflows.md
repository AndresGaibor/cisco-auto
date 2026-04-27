# Flujos autónomos para talleres de redes

## Flujo base para cualquier laboratorio

1. Entender objetivo: qué debe funcionar, qué debe fallar, qué restricciones hay.
2. Inventariar estado actual:
   ```bash
   bun run pt doctor --json
   bun run pt runtime status --json
   bun run pt device list --json --links
   ```
3. Diseñar tabla mínima:
   - Dispositivos/modelos.
   - Puertos físicos.
   - VLANs y nombres.
   - Subredes, gateways y DHCP.
   - Routing esperado.
   - Pruebas de validación.
4. Crear/mover dispositivos con `device add/move`.
5. Cablear con `link suggest` + `link add --wait-green`.
6. Configurar hosts con `set host`.
7. Configurar IOS con `cmd --config`.
8. Verificar por capas.
9. Documentar evidencias y gaps.

## Checklist de diseño antes de mutar

Pregunta al usuario si falta alguno de estos datos y no se puede inferir de archivos reales:

- ¿Topología esperada o número de sedes/departamentos?
- ¿Modelos de router/switch/PC/server requeridos?
- ¿VLAN IDs, nombres y puertos de acceso?
- ¿Puertos trunk y VLAN nativa?
- ¿Subredes, gateways y pools DHCP?
- ¿Routing estático o dinámico?
- ¿Servicios: DHCP, DNS, HTTP, EMAIL, AAA, NTP, Syslog?
- ¿Políticas ACL/NAT/security?
- ¿Criterios de éxito: pings, servicios, show outputs, assessment?

## Patrón: crear LAN con VLANs

1. `device add` switches/hosts.
2. `device ports` para nombres reales.
3. `link add` PC↔SW y SW↔SW.
4. En switches:
   ```bash
   bun run pt cmd SW1 --config \
     "vlan 10" "name USERS" \
     "vlan 20" "name ADMIN" \
     "interface fa0/1" "switchport mode access" "switchport access vlan 10" \
     "interface fa0/24" "switchport mode trunk" "switchport trunk allowed vlan 10,20" \
     --json
   ```
5. Validar:
   ```bash
   bun run pt cmd SW1 "show vlan brief" --json
   bun run pt cmd SW1 "show interfaces trunk" --json
   bun run pt verify vlan SW1 10 --json
   ```

## Patrón: inter-VLAN routing router-on-a-stick

1. Trunk entre switch y router.
2. Subinterfaces en router:
   ```bash
   bun run pt cmd R1 --config \
     "interface g0/0" "no shutdown" \
     "interface g0/0.10" "encapsulation dot1Q 10" "ip address 192.168.10.1 255.255.255.0" \
     "interface g0/0.20" "encapsulation dot1Q 20" "ip address 192.168.20.1 255.255.255.0" \
     --json
   ```
3. Hosts con gateways correctos.
4. Validar `show ip interface brief`, `show interfaces trunk`, ping inter-VLAN.

## Patrón: DHCP en router IOS

1. Excluir gateways y estáticos.
2. Crear un pool por VLAN/subred.
3. Si DHCP está en otra red, agregar `ip helper-address` en la SVI/subinterfaz gateway.
4. Activar DHCP en PC con `set host PC dhcp`.
5. Validar binding y lease.

## Patrón: routing dinámico OSPF

1. Interfaces up/up con IPs correctas.
2. `router ospf <pid>` y `network <network> <wildcard> area <area>`.
3. Validar vecinos antes de validar rutas.
4. Validar rutas aprendidas y ping extremo a extremo.

## Patrón: troubleshooting

Orden obligatorio:

1. Físico: `link verify`, `device ports`, `show ip interface brief`.
2. L2: `show vlan brief`, `show interfaces trunk`, `show mac address-table`, `show spanning-tree`.
3. L3: `ipconfig`, `show ip route`, `show arp`, ping gateway.
4. Servicios: DHCP pool/binding, DNS lookup, HTTP/email según el caso.
5. Políticas: ACL counters, NAT translations, direction inside/outside.

## Historial

| Versión | Fecha | Cambios |
|--------|-------|--------|
| 1.0 | 2026-04 | Initial: Autonomous lab flows |