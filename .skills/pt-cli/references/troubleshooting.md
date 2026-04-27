# Troubleshooting PT/Red con evidencia

## Orden OSI obligatorio

1. **Runtime/PT**: `doctor`, `runtime status`, `runtime logs`.
2. **Físico**: dispositivos existen, power, puertos, links verdes.
3. **L2**: VLAN, trunk, STP, MAC learning.
4. **L3**: IP/máscara/gateway, ARP, rutas, vecinos.
5. **Servicios**: DHCP, DNS, HTTP, email, AAA.
6. **Políticas**: ACL, NAT, port-security.

## Runtime/PT no responde

```bash
bun run pt doctor --json
bun run pt runtime status --json
bun run pt runtime logs --json
```

No leas `~/pt-dev` directamente para tomar decisiones operativas. Usa CLI/controlador. Si el bridge no responde tras reload, pide reiniciar Packet Tracer.

## Link no queda verde

```bash
bun run pt device list --json --links
bun run pt device ports R1 --json --refresh
bun run pt link verify --json
bun run pt link doctor --json
```

Causas típicas:
- Puerto equivocado o ocupado.
- Cable incompatible.
- Interfaz shutdown.
- Dispositivo todavía booteando.
- STP convergiendo.

## Ping falla

1. En origen:
   ```bash
   bun run pt cmd PC1 "ipconfig" --json
   ```
2. Gateway:
   ```bash
   bun run pt verify ping PC1 192.168.10.1 --json
   ```
3. Switch:
   ```bash
   bun run pt cmd SW1 "show vlan brief" --json
   bun run pt cmd SW1 "show interfaces trunk" --json
   ```
4. Router:
   ```bash
   bun run pt cmd R1 "show ip interface brief" --json
   bun run pt cmd R1 "show ip route" --json
   ```

## DHCP no asigna IP

```bash
bun run pt cmd R1 "show ip dhcp pool" --json
bun run pt cmd R1 "show ip dhcp binding" --json
bun run pt cmd R1 "show running-config | section dhcp" --json
bun run pt cmd PC1 "ipconfig" --json
```

Revisa:
- Pool coincide con subred.
- Gateway excluido.
- `default-router` correcto.
- Cliente en VLAN correcta.
- Relay `ip helper-address` si el servidor está en otra red.

## VLAN/trunk falla

```bash
bun run pt verify vlan SW1 10 --json
bun run pt cmd SW1 "show vlan brief" --json
bun run pt cmd SW1 "show interfaces trunk" --json
bun run pt cmd SW1 "show spanning-tree vlan 10" --json
```

Revisa:
- VLAN existe en todos los switches necesarios.
- Puerto de PC en access VLAN correcta.
- Trunk permite la VLAN.
- VLAN nativa coincide.
- STP no bloquea inesperadamente.

## Routing dinámico falla

OSPF:

```bash
bun run pt cmd R1 "show ip ospf neighbor" --json
bun run pt cmd R1 "show ip protocols" --json
bun run pt cmd R1 "show ip route ospf" --json
```

EIGRP:

```bash
bun run pt cmd R1 "show ip eigrp neighbors" --json
bun run pt cmd R1 "show ip protocols" --json
bun run pt cmd R1 "show ip route eigrp" --json
```

Revisa red/wildcard, área/AS, interfaces up/up, passive-interface y máscaras.

## ACL/NAT bloquea tráfico

```bash
bun run pt cmd R1 "show access-lists" --json
bun run pt cmd R1 "show ip interface g0/0" --json
bun run pt cmd R1 "show ip nat translations" --json
bun run pt cmd R1 "show ip nat statistics" --json
```

Revisa dirección `in/out`, orden de reglas, `permit ip any any`, inside/outside y ACL de NAT.

## Omni como último recurso

```bash
bun run pt omni status --json
bun run pt omni inspect env --json
bun run pt omni topology physical --json
bun run pt omni device genome R1 --json
bun run pt omni raw --dry-run "n.getDeviceCount()"
```

Solo ejecuta `raw --yes` con autorización o cuando el usuario ya autorizó ese nivel de intervención.

## Historial

| Versión | Fecha | cambios |
|--------|-------|--------|
| 2.0 | 2026-04 | Rewrite: CLI commands, format unified |
| 1.0 | 2024-... | Original CCIE troubleshooting |