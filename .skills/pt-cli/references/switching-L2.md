# Switching L2: VLANs, trunks, STP y EtherChannel

## VLANs

Una VLAN separa dominios de broadcast. En switches Cisco, crea la VLAN y luego asigna puertos access o trunks.

Configurar VLAN y access port:

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
bun run pt verify vlan SW1 10 --json
bun run pt cmd SW1 "show vlan brief" --json
bun run pt cmd SW1 "show interfaces fa0/1 switchport" --json
```

## Trunks

Un trunk transporta varias VLANs por 802.1Q. La VLAN nativa debe coincidir en ambos extremos.

```bash
bun run pt cmd SW1 --config \
  "interface g0/1" \
  "switchport mode trunk" \
  "switchport trunk native vlan 99" \
  "switchport trunk allowed vlan 10,20,99" \
  --json
```

Verificar en ambos switches:

```bash
bun run pt cmd SW1 "show interfaces trunk" --json
bun run pt cmd SW2 "show interfaces trunk" --json
```

## MAC learning

La tabla MAC aprende direcciones cuando recibe tráfico. Si está vacía:

```bash
bun run pt verify ping PC1 192.168.10.2 --json
bun run pt cmd SW1 "show mac address-table" --json
```

## STP / Rapid PVST+

STP evita loops L2. En Packet Tracer, enlaces pueden verse ámbar mientras convergen.

```bash
bun run pt cmd SW1 --config \
  "spanning-tree mode rapid-pvst" \
  "spanning-tree vlan 10 root primary" \
  --json
```

Verificar:

```bash
bun run pt cmd SW1 "show spanning-tree" --json
bun run pt cmd SW1 "show spanning-tree vlan 10" --json
```

## EtherChannel

Ambos lados deben coincidir en modo, velocidad, dúplex, trunk/access y VLANs permitidas.

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
bun run pt cmd SW1 "show interfaces port-channel 1 switchport" --json
```

## Troubleshooting L2 rápido

1. `link verify --json`.
2. `device ports SW1 --json --refresh`.
3. `show vlan brief`.
4. `show interfaces trunk`.
5. `show spanning-tree vlan X`.
6. Genera ping y revisa `show mac address-table`.

## Historial

| Versión | Fecha | cambios |
|--------|-------|--------|
| 2.0 | 2026-04 | Rewrite: CLI commands, format unified |
| 1.0 | 2024-... | Original CCNA/CCNP content |