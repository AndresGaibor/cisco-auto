# Seguridad, ACL, NAT y hardening

## SSH básico

```bash
bun run pt cmd R1 --config \
  "hostname R1" \
  "ip domain-name lab.local" \
  "username admin privilege 15 secret Cisco123" \
  "crypto key generate rsa modulus 1024" \
  "line vty 0 4" \
  "login local" \
  "transport input ssh" \
  --json
```

Verificar:

```bash
bun run pt cmd R1 "show ip ssh" --json
bun run pt cmd R1 "show running-config | section line vty" --json
```

## ACLs

Reglas:
- Standard ACL filtra por origen; aplícala cerca del destino.
- Extended ACL filtra origen, destino, protocolo y puerto; aplícala cerca del origen.
- Siempre recuerda el `deny any` implícito. Agrega `permit ip any any` si corresponde.

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

## Port security

```bash
bun run pt cmd SW1 --config \
  "interface fa0/1" \
  "switchport mode access" \
  "switchport port-security" \
  "switchport port-security maximum 1" \
  "switchport port-security mac-address sticky" \
  "switchport port-security violation restrict" \
  --json
```

Verificar:

```bash
bun run pt cmd SW1 "show port-security interface fa0/1" --json
bun run pt cmd SW1 "show port-security address" --json
```

## NAT/PAT

Reglas:
- Marca correctamente `ip nat inside` y `ip nat outside`.
- La ACL debe coincidir con las redes internas que harán NAT.
- Genera tráfico después de configurar para ver translations.

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

## Hardening mínimo de labs

```bash
bun run pt cmd R1 --config \
  "service password-encryption" \
  "enable secret Class123" \
  "banner motd #Acceso autorizado solamente#" \
  "line console 0" "password Cisco123" "login" \
  "line vty 0 4" "password Cisco123" "login" \
  --json
```

## Historial

| Versión | Fecha | cambios |
|--------|-------|--------|
| 2.0 | 2026-04 | Rewrite: CLI commands, format unified |
| 1.0 | 2024-... | Original CCNA/CCNP content |