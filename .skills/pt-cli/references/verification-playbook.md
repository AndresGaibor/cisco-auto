# Playbook de verificación y evidencias

## Regla principal

Una configuración no está terminada hasta que haya evidencia positiva. Un `ok: true` de la CLI solo confirma ejecución; no siempre confirma estado final de red.

## Evidencias mínimas por cambio

| Cambio | Evidencias |
|---|---|
| Agregar dispositivo | `device list --json`, `device get <name> --json` |
| Agregar módulo | `device module slots <dev> --json`, `device ports <dev> --refresh --json` |
| Agregar link | `link list --json`, `link verify --json`, `device list --links --json` |
| IP en host | `cmd PC "ipconfig" --json`, `verify ping PC <gateway>` |
| IP en router/switch | `cmd R1 "show ip interface brief" --json`, `cmd R1 "show run interface X" --json` |
| VLAN | `verify vlan SW VLAN --json`, `cmd SW "show vlan brief" --json` |
| Trunk | `cmd SW "show interfaces trunk" --json` en ambos extremos |
| STP | `cmd SW "show spanning-tree vlan X" --json` |
| DHCP | `cmd router "show ip dhcp pool"`, `show ip dhcp binding`, host `ipconfig` |
| Routing | `show ip route`, vecinos si protocolo dinámico, ping extremo a extremo |
| ACL | `show access-lists`, `show ip interface`, prueba permitida y denegada |
| NAT | `show ip nat translations`, `show ip nat statistics`, ping/tráfico desde inside |
| HSRP | `show standby brief` en ambos routers, ping a VIP |

## Loop de reparación

1. Identifica la prueba fallida exacta.
2. Determina capa probable: física, L2, L3, servicio, política.
3. Ejecuta solo los shows de esa capa.
4. Cambia una cosa.
5. Repite la prueba.
6. Si falla de nuevo, conserva evidencia y escala a `doctor/runtime logs/omni`.

## Comandos base de evidencia

```bash
bun run pt device list --json --links
bun run pt link verify --json
bun run pt cmd each --devices R1,R2,SW1 "show ip interface brief" --json
bun run pt cmd SW1 "show vlan brief" --json
bun run pt cmd SW1 "show interfaces trunk" --json
bun run pt cmd SW1 "show mac address-table" --json
bun run pt cmd R1 "show ip route" --json
bun run pt verify ping PC1 192.168.10.1 --json
```

## Interpretación conservadora

- Link no verde: no asumas fallo IP.
- Ping falla pero gateway responde: revisar routing/ACL/NAT, no VLAN local.
- DHCP sin lease: revisar pool, exclusiones, gateway de pool, relay y conectividad al server.
- Tabla MAC vacía: generar tráfico primero.
- OSPF/EIGRP sin vecinos: revisar interfaces, máscaras, áreas/AS, passive-interface y timers.

## Historial

| Versión | Fecha | Cambios |
|--------|-------|--------|
| 1.0 | 2026-04 | Initial: Verification playbook |