# Routing L3, direccionamiento y servicios

## IPv4 y gateways

Un host solo llega fuera de su subred si tiene gateway. Valida siempre IP, máscara y gateway:

```bash
bun run pt cmd PC1 "ipconfig" --json
bun run pt verify ping PC1 192.168.10.1 --json
```

Configurar host:

```bash
bun run pt set host PC1 ip 192.168.10.10/24 --gateway 192.168.10.1 --dns 8.8.8.8 --json
```

Configurar router:

```bash
bun run pt cmd R1 --config \
  "interface g0/0" \
  "ip address 192.168.10.1 255.255.255.0" \
  "no shutdown" \
  --json
```

## Router-on-a-stick

Usa subinterfaces con `encapsulation dot1Q` para inter-VLAN routing.

```bash
bun run pt cmd R1 --config \
  "interface g0/0" "no shutdown" \
  "interface g0/0.10" "encapsulation dot1Q 10" "ip address 192.168.10.1 255.255.255.0" \
  --json
```

## DHCP IOS

Reglas:
- Excluye gateway y estáticos antes del pool.
- El `network` del pool debe coincidir con la subred del gateway.
- Para clientes en otra VLAN, agrega `ip helper-address` en el gateway de esa VLAN.

```bash
bun run pt cmd R1 --config \
  "ip dhcp excluded-address 192.168.10.1 192.168.10.20" \
  "ip dhcp pool VLAN10" \
  "network 192.168.10.0 255.255.255.0" \
  "default-router 192.168.10.1" \
  "dns-server 8.8.8.8" \
  --json
```

Verificar:

```bash
bun run pt set host PC1 dhcp --json
bun run pt cmd PC1 "ipconfig" --json
bun run pt cmd R1 "show ip dhcp binding" --json
```

## Rutas estáticas

```bash
bun run pt cmd R1 --config "ip route 192.168.20.0 255.255.255.0 10.0.0.2" --json
bun run pt cmd R1 "show ip route" --json
```

## OSPF

OSPF usa wildcard masks y áreas. Para labs CCNA normalmente área 0.

```bash
bun run pt cmd R1 --config \
  "router ospf 1" \
  "router-id 1.1.1.1" \
  "network 10.0.0.0 0.0.0.3 area 0" \
  "network 192.168.10.0 0.0.0.255 area 0" \
  --json
```

Verificar:

```bash
bun run pt cmd R1 "show ip ospf neighbor" --json
bun run pt cmd R1 "show ip route ospf" --json
```

## EIGRP

El AS debe coincidir entre routers vecinos.

```bash
bun run pt cmd R1 --config \
  "router eigrp 100" \
  "no auto-summary" \
  "network 10.0.0.0 0.0.0.3" \
  --json
```

Verificar:

```bash
bun run pt cmd R1 "show ip eigrp neighbors" --json
bun run pt cmd R1 "show ip route eigrp" --json
```

## HSRP

HSRP usa una IP virtual como gateway. Mayor prioridad gana; `preempt` permite recuperar el rol activo.

```bash
bun run pt cmd R1 --config \
  "interface g0/0" \
  "standby 1 ip 192.168.10.254" \
  "standby 1 priority 110" \
  "standby 1 preempt" \
  --json
```

Verificar:

```bash
bun run pt cmd R1 "show standby brief" --json
bun run pt cmd R2 "show standby brief" --json
```

## Historial

| Versión | Fecha | cambios |
|--------|-------|--------|
| 2.0 | 2026-04 | Rewrite: CLI commands, format unified |
| 1.0 | 2024-... | Original CCNA/CCNP content |
```