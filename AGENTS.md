# AGENTS.md — cisco-auto

Guía raíz para agentes que modifican este repo. Mantén este archivo corto: el detalle vive en docs y en los `AGENTS.md` de cada paquete.

## Principio operativo

No supongas. Antes de cambiar algo:

1. Inspecciona los archivos reales involucrados.
2. Revisa la documentación canónica indicada abajo.
3. Si la tarea toca Packet Tracer real, valida con CLI/evidencia o deja explícito qué debe ejecutar el usuario en PT.
4. Si encuentras conflicto entre docs y código, el código registrado gana y la doc debe corregirse.

## Fuentes de verdad

| Tema | Fuente primaria |
|---|---|
| CLI pública `pt` | `apps/pt-cli/src/program.ts` y `apps/pt-cli/src/commands/command-registry.ts` |
| Metadata/catálogo legacy | `apps/pt-cli/src/commands/command-catalog.ts` solo si sigue conectado al flujo actual |
| Skill de talleres/redes | `.skills/pt-cli/SKILL.md` y `docs/CLI_AGENT_SKILL.md` |
| Arquitectura entre paquetes | `docs/ARCHITECTURE_BOUNDARIES.md` |
| Frontera runtime/control | `docs/architecture/runtime-control-boundary.md` |
| Internals Packet Tracer / Omni | `docs/PT_ENGINE_INTERNALS.md` y `docs/PT_EVALUATE_HACKING_GUIDE.md` |
| Setup, tests y troubleshooting | `docs/INSTALL.md`, `docs/TESTS.md`, `docs/TROUBLESHOOTING.md` |

Para tareas dentro de un paquete, lee también el `AGENTS.md` más cercano, por ejemplo `packages/pt-control/AGENTS.md`.

## Mapa rápido del repo

- `apps/pt-cli`: CLI pública `bun run pt`.
- `packages/pt-control`: cerebro de orquestación, planners, workflows, verificación, diagnóstico y policies.
- `packages/pt-runtime`: kernel PT-safe, lifecycle, dispatch, terminal engine y primitives de bajo nivel.
- `packages/file-bridge`: IPC por archivos entre CLI y Packet Tracer.
- `packages/ios-domain` / `ios-primitives`: lógica IOS pura, parsers, builders y capabilities.
- `packages/types`: contratos y schemas compartidos.
- `.skills/pt-cli`: skill para operar talleres Cisco/PT de forma autónoma.

## CLI actual que no debes inventar

La superficie pública actual registrada es compacta:

```bash
bun run pt doctor
bun run pt runtime <status|logs|releases|rollback|reload>
bun run pt device <list|add|get|interactive|module|ports|move|remove>
bun run pt link <add|list|remove|suggest|verify|doctor>
bun run pt cmd <device> "<command>"
bun run pt cmd --config <device> "<ios config line>" ...
bun run pt set host <device> <ip|dhcp>
bun run pt verify <ping|vlan>
bun run pt omni <env|scope|process|physical|genome|port|running-config|item|correct|time|set|list|show|run|raw>
bun run pt completion <shell>
```

`lab` existe en código pero está oculto salvo `PT_CLI_LEGACY=1`. No documentes comandos legacy como públicos sin verificar que estén registrados.

## Workflow para cambios

1. Haz cambios pequeños y enfocados.
2. No introduzcas dependencias nuevas sin necesidad clara.
3. No modifiques artefactos generados de `~/pt-dev/`; modifica source y regenera cuando aplique.
4. Si cambias CLI pública, actualiza en la misma tarea:
   - `apps/pt-cli/src/commands/command-registry.ts`
   - ayuda/examples del comando afectado
   - `.skills/pt-cli/SKILL.md` o referencias relacionadas
   - tests/documentación que dependan del comando
5. Si cambias runtime PT, valida compatibilidad ES5/PT-safe y no uses APIs Node dentro del código que corre en Packet Tracer.

## Reglas de arquitectura

- `pt-runtime` es thin kernel: PT lifecycle, dispatch, terminal engine, primitives y adapters Omni de bajo nivel. No pongas semántica de VLAN/DHCP/routing/labs ahí.
- `pt-control` es orchestration brain: planes, diagnóstico, verification, policies y evaluación de evidencia.
- `apps/pt-cli` debe consumir APIs públicas; no importes internals de paquetes si no existe subpath p��blico.
- `ios-domain` y `ios-primitives` deben seguir siendo puros y testeables sin Packet Tracer.

## Packet Tracer: protocolo seguro

Para operar o validar un lab:

1. Diagnóstico inicial: `bun run pt doctor` y, si hace falta, `bun run pt runtime status --json`.
2. Inventario: `bun run pt device list --json`; no asumas nombres, modelos ni puertos.
3. Puertos/enlaces: `bun run pt device ports <device> --json` o `bun run pt link suggest <a> <b> --json` antes de cablear.
4. Terminal: usa `bun run pt cmd ...` para IOS, PCs, servers, WLC o ASA.
5. Hosts GUI/API: usa `bun run pt set host ...` y valida con `bun run pt cmd <host> "ipconfig"`.
6. Verificación: usa `bun run pt verify ...` y comandos `show`/`ping` con evidencia. No declares éxito solo porque una mutación respondió `ok`.
7. Omni: úsalo como último recurso. Prefiere `pt omni list/show/run`; `pt omni raw` requiere justificación, `--dry-run` cuando sea posible y confirmación `--yes` solo para código revisado.

## Comandos de calidad

Ejecuta el subconjunto más pequeño suficiente y reporta qué sí/no pudiste correr:

```bash
bun run lint
bun run typecheck
bun test
bun run architecture:check
bun run quality:check
```

Para runtime/deploy local:

```bash
bun run "pt build"
bun run pt doctor
```

## Estilo del proyecto

- Usa Bun: `bun run`, `bun test`, `bun install`, `bunx`.
- No uses `npm`, `yarn`, `pnpm`, `node` o `ts-node` salvo razón explícita.
- TypeScript source directo; no ejecutes `tsc` para emitir archivos. Para tipos usa `bun run typecheck`.
- Mensajes de CLI, errores accionables y docs para usuario: español.
- Mantén nombres/patrones existentes; no hagas renombramientos masivos cosméticos.
- Prefiere resultados estructurados `--json` cuando el consumidor sea un agente.

## Al entregar

Incluye:

- Archivos cambiados.
- Validaciones ejecutadas y resultado.
- Validaciones no ejecutadas y motivo.
- Riesgos o pasos que requieren Packet Tracer real.