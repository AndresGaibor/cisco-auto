# Cookbook de red para Packet Tracer con pt-cli

Todos los comandos se ejecutan con `bun run pt cmd <device> ...`.

## VLANs y puertos access

Configurar:

```bash
bun run pt cmd SW1 --config \
  "vlan 10" "name USERS" \
  "interface fa0/1" \
  "switchport mode access" \
  "switchport access vlan 10" \
  "spanning-tree portfast" \
  --json
```

Verificar:

```bash
bun run pt cmd SW1 "show vlan brief" --json
bun run pt cmd SW1 "show interfaces fa0/1 switchport" --json
bun run pt verify vlan SW1 10 --json
```

## Trunks 802.1Q

Configurar:

```bash
bun run pt cmd SW1 --config \
  "interface g0/1" \
  "switchport mode trunk" \
  "switchport trunk allowed vlan 10,20,99" \
  "switchport trunk native vlan 99" \
  --json
```

Verificar:

```bash
bun run pt cmd SW1 "show interfaces trunk" --json
bun run pt cmd SW1 "show spanning-tree vlan 10" --json
```

## Router-on-a-stick

```bash
bun run pt cmd R1 --config \
  "interface g0/0" "no shutdown" \
  "interface g0/0.10" "encapsulation dot1Q 10" "ip address 192.168.10.1 255.255.255.0" \
  "interface g0/0.20" "encapsulation dot1Q 20" "ip address 192.168.20.1 255.255.255.0" \
  --json
```

Verificar:

```bash
bun run pt cmd R1 "show ip interface brief" --json
bun run pt cmd R1 "show running-config interface g0/0.10" --json
bun run pt verify ping PC10 192.168.20.10 --json
```

## DHCP en router IOS

```bash
bun run pt cmd R1 --config \
  "ip dhcp excluded-address 192.168.10.1 192.168.10.20" \
  "ip dhcp pool VLAN10" \
  "network 192.168.10.0 255.255.255.0" \
  "default-router 192.168.10.1" \
  "dns-server 8.8.8.8" \
  --json
```

Cliente:

```bash
bun run pt set host PC1 dhcp --json
bun run pt cmd PC1 "ipconfig" --json
```

Verificar servidor:

```bash
bun run pt cmd R1 "show ip dhcp pool" --json
bun run pt cmd R1 "show ip dhcp binding" --json
```

## DHCP relay

En la interfaz gateway de la VLAN cliente:

```bash
bun run pt cmd R1 --config \
  "interface g0/0.10" \
  "ip helper-address 192.168.100.10" \
  --json
```

## Routing estático

```bash
bun run pt cmd R1 --config "ip route 192.168.20.0 255.255.255.0 10.0.0.2" --json
bun run pt cmd R1 "show ip route" --json
bun run pt verify ping PC1 192.168.20.10 --json
```

## OSPF básico

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

## EIGRP clásico

```bash
bun run pt cmd R1 --config \
  "router eigrp 100" \
  "no auto-summary" \
  "network 10.0.0.0 0.0.0.3" \
  "network 192.168.10.0 0.0.0.255" \
  --json
```

Verificar:

```bash
bun run pt cmd R1 "show ip eigrp neighbors" --json
bun run pt cmd R1 "show ip route eigrp" --json
```

## ACL extendida

```bash
bun run pt cmd R1 --config \
  "ip access-list extended BLOCK_WEB" \
  "deny tcp 192.168.10.0 0.0.0.255 host 192.168.20.10 eq 80" \
  "permit ip any any" \
  "interface g0/0.10" \
  "ip access-group BLOCK_WEB in" \
  --json
```

Verificar:

```bash
bun run pt cmd R1 "show access-lists" --json
bun run pt cmd R1 "show ip interface g0/0.10" --json
```

## NAT/PAT

```bash
bun run pt cmd R1 --config \
  "access-list 1 permit 192.168.10.0 0.0.0.255" \
  "interface g0/0" "ip nat inside" \
  "interface s0/0/0" "ip nat outside" \
  "ip nat inside source list 1 interface s0/0/0 overload" \
  --json
```

Verificar:

```bash
bun run pt cmd R1 "show ip nat translations" --json
bun run pt cmd R1 "show ip nat statistics" --json
```

## STP / Rapid PVST+

```bash
bun run pt cmd SW1 --config \
  "spanning-tree mode rapid-pvst" \
  "spanning-tree vlan 10 root primary" \
  --json
```

Verificar:

```bash
bun run pt cmd SW1 "show spanning-tree vlan 10" --json
```

## EtherChannel LACP trunk

```bash
bun run pt cmd SW1 --config \
  "interface range fa0/1 - 2" \
  "switchport mode trunk" \
  "channel-group 1 mode active" \
  "interface port-channel 1" \
  "switchport mode trunk" \
  --json
```

Verificar:

```bash
bun run pt cmd SW1 "show etherchannel summary" --json
bun run pt cmd SW1 "show interfaces trunk" --json
```

## HSRP

```bash
bun run pt cmd R1 --config \
  "interface g0/0" \
  "ip address 192.168.10.2 255.255.255.0" \
  "standby 1 ip 192.168.10.1" \
  "standby 1 priority 110" \
  "standby 1 preempt" \
  --json

bun run pt cmd R2 --config \
  "interface g0/0" \
  "ip address 192.168.10.3 255.255.255.0" \
  "standby 1 ip 192.168.10.1" \
  "standby 1 priority 100" \
  "standby 1 preempt" \
  --json
```

Verificar:

```bash
bun run pt cmd R1 "show standby brief" --json
bun run pt cmd R2 "show standby brief" --json
bun run pt verify ping PC1 192.168.10.1 --json
```

## Historial

| Versión | Fecha | Cambios |
|--------|-------|--------|
| 1.0 | 2026-04 | Initial: Complete cookbook |