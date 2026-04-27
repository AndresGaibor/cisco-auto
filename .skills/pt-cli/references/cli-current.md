# CLI actual: comandos, patrones y sustituciones seguras

## Fuente de verdad

La CLI pública se registra en `apps/pt-cli/src/commands/command-registry.ts`. Antes de usar un comando dudoso, confirma con:

```bash
bun run pt --help
bun run pt <comando> --help
```

Usa `--json` siempre que el resultado vaya a ser leído por un agente.

## Salud del sistema

```bash
bun run pt doctor --json
bun run pt runtime status --json
bun run pt runtime logs --json
bun run pt runtime reload
```

Uso:
- `doctor`: primero ante fallos, timeouts o PT no conectado.
- `runtime status`: confirmar bridge/runtime antes de construir labs.
- `runtime logs`: investigar timeouts o errores del runtime.
- `runtime reload`: regenerar/recargar runtime cuando el código cambió o PT quedó desincronizado.

## Inventario y topología

```bash
bun run pt device list --json --links
bun run pt device list --xml --json
bun run pt device get R1 --json --xml
bun run pt device ports R1 --json --refresh
bun run pt device add R1 2911 -x 100 -y 100 --json
bun run pt device move R1 300 200 --json
bun run pt device remove R1 --force --json
```

Reglas:
- El orden real de `device add` es `<name> <model>`.
- No asumas puertos: usa `device ports` o `link suggest`.
- Verifica después de add/move/remove con `device list --json`.

## Módulos físicos

```bash
bun run pt device module slots R1 --json
bun run pt device module add R1 WIC-2T --slot auto --json
bun run pt device module add R1 HWIC-4ESW --slot 1 --plan
```

Reglas:
- Primero lista slots.
- Usa `--plan` si no estás seguro.
- Después valida con `device module slots` y `device ports --refresh`.

## Enlaces

```bash
bun run pt link suggest PC1 SW1 --json
bun run pt link add PC1:FastEthernet0 SW1:FastEthernet0/1 --type auto --wait-green 30000 --json
bun run pt link add R1 GigabitEthernet0/0 SW1 GigabitEthernet0/1 --type straight --json
bun run pt link list --json
bun run pt link verify --json
bun run pt link doctor --json
bun run pt link remove PC1:FastEthernet0 SW1:FastEthernet0/1 --force --json
```

Reglas:
- Prefiere formato endpoint `Device:Port` para evitar ambigüedad.
- Usa `--wait-green` cuando haya STP/boot/convergencia.
- Si no está verde, revisa tipo de cable, power, boot, shutdown y STP.

## Terminal universal

```bash
bun run pt cmd R1 "show ip interface brief" --json
bun run pt cmd SW1 "show vlan brief" --json
bun run pt cmd PC1 "ipconfig" --json
bun run pt cmd PC1 "ping 192.168.10.1" --mode interactive --json
bun run pt cmd each --devices R1,R2,SW1 "show ip interface brief" --json
```

Para configurar IOS:

```bash
bun run pt cmd R1 --config \
  "interface g0/0" \
  "ip address 192.168.10.1 255.255.255.0" \
  "no shutdown" \
  --json
```

Flags útiles:
- `--config`: envuelve comandos en modo configuración.
- `--save`: guarda `write memory` después de configuración.
- `--file <path>` o `--stdin`: aplicar bloques largos.
- `--mode safe|interactive|raw|strict`: usa `safe` por defecto; `interactive` para ping/paginación/confirmaciones.
- `--raw`: salida cruda del dispositivo cuando necesitas parsear manualmente.

## Hosts PC/Server por API

```bash
bun run pt set host PC1 ip 192.168.10.10/24 --gateway 192.168.10.1 --dns 8.8.8.8 --json
bun run pt set host PC1 ip 192.168.10.10 --mask 255.255.255.0 --gateway 192.168.10.1 --json
bun run pt set host PC1 dhcp --json
bun run pt cmd PC1 "ipconfig" --json
```

Regla: `set host` es para PCs/servers; routers/switches se configuran con IOS mediante `cmd --config`.

## Verificación

```bash
bun run pt verify ping PC1 192.168.10.1 --json
bun run pt verify vlan SW1 10 --json
bun run pt verify ios R1 "show ip interface brief" --json
```

`verify` no reemplaza todos los `show`. Combínalo con evidencias IOS/host.

## Omni

```bash
bun run pt omni status --json
bun run pt omni inspect env --json
bun run pt omni topology physical --json
bun run pt omni device genome R1 --json
bun run pt omni device port SW1 FastEthernet0/1 --json
bun run pt omni capability list --json
bun run pt omni raw --dry-run "n.getDeviceCount()"
bun run pt omni raw "n.getDeviceCount()" --yes --json
```

Reglas:
- `omni` es forense/experimental, no primera opción.
- Antes de `raw --yes`, ejecuta `--dry-run`.
- No uses `--unsafe` sin confirmación humana.

## Historial

| Versión | Fecha | Cambios |
|--------|-------|--------|
| 1.0 | 2026-04 | Initial: CLI commands reference |