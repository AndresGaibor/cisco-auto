# CLI Agent Skill — Guía operativa actual

Esta guía debe mantenerse consistente con `.skills/pt-cli/SKILL.md`.

## Fuente de verdad

La CLI pública real se registra en:

- `apps/pt-cli/src/commands/command-registry.ts`
- `apps/pt-cli/src/commands/*`
 
Confirma en runtime con:
 
```bash
bun run pt --help
bun run pt <comando> --help
```

## Comandos públicos actuales

| Comando | Uso |
|---|---|
| `doctor` | Diagnóstico de instalación, bridge, runtime y PT |
| `runtime` | `status`, `logs`, `releases`, `rollback`, `reload` |
| `device` / `dev` | `list`, `get`, `ports`, `add`, `move`, `remove`, `module` |
| `link` / `ln` | `list`, `add`, `remove`, `suggest`, `verify`, `doctor` |
| `cmd` | Terminal universal IOS/PC/Server; también `cmd each` |
| `set` | Configuración GUI/API, hoy especialmente `set host ip|dhcp` |
| `verify` | `ping`, `vlan`, `ios` |
| `omni` / `omniscience` | Forense y raw controlado |
| `completion` | Autocompletado shell |

`lab` está definido pero oculto por defecto; no se debe usar como comando público salvo confirmación explícita.

## Política para agentes

1. Usar `bun run pt ...` como prefijo reproducible dentro del repo.
2. Usar `--json` para decisiones automáticas.
3. No leer `~/pt-dev` directamente para estado operativo.
4. No asumir puertos: usar `device ports` y `link suggest`.
5. No asumir éxito: validar con `verify`, `cmd show`, `device list` y `link verify`.
6. Usar `omni raw` solo como último recurso, con `--dry-run` antes de `--yes`.

## Sustituciones de comandos antiguos

| Antiguo/desactualizado | Actual |
|---|---|
| `pt status` | `bun run pt doctor` + `bun run pt runtime status` |
| `pt config ip PC1 ...` | `bun run pt set host PC1 ip ...` |
| `pt config-ios R1 ...` | `bun run pt cmd R1 --config ...` |
| `pt show ...` | `bun run pt cmd <device> "show ..."` |
| `pt ping PC1 X` | `bun run pt verify ping PC1 X` |
| `pt show-mac SW1` | `bun run pt cmd SW1 "show mac address-table"` |
| `pt omni genome R1` | `bun run pt omni device genome R1` |

## Flujo mínimo de trabajo

```bash
bun run pt doctor --json
bun run pt runtime status --json
bun run pt device list --json --links
bun run pt device ports <device> --json --refresh
bun run pt link suggest <a> <b> --json
bun run pt link add <a>:<port> <b>:<port> --wait-green 30000 --json
bun run pt cmd <device> "show ip interface brief" --json
bun run pt verify ping <source> <target> --json
```

Para teoría, comandos IOS y playbooks de laboratorios, usa `.skills/pt-cli/references/`.

## Historial

| Versión | Fecha | Cambios |
|--------|-------|--------|
| 2.0 | 2026-04 | Rewrite: CLI commands, consistency with skill |
| 1.0 | 2024-... | Original detailed guide |