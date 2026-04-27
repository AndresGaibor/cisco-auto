# CLAUDE.md — cisco-auto

Contexto mínimo para Claude Code. La fuente compartida es `AGENTS.md`; no dupliques manuales largos aquí.

## Primero lee

1. `AGENTS.md` en la raíz.
2. El `AGENTS.md` del paquete que vas a tocar.
3. Para tareas de Packet Tracer/redes: `.skills/pt-cli/SKILL.md` y `docs/CLI_AGENT_SKILL.md`.
4. Para límites de arquitectura: `docs/ARCHITECTURE_BOUNDARIES.md` y `docs/architecture/runtime-control-boundary.md`.

## Forma de trabajo

- No asumas. Inspecciona código/docs reales antes de proponer cambios.
- Para cambios multi-archivo, primero presenta plan breve y después aplica.
- Usa subagentes cuando la tarea no sea trivial:
  - investigación/root cause: debugger o code-search
  - refactor/arquitectura: architect/planner
  - seguridad: security-reviewer
  - tests: tdd
  - revisión final: code-reviewer
- Mantén diffs pequeños. No mezcles refactor masivo con feature/bugfix.
- Si falta Packet Tracer real, deja los comandos exactos para validar y no declares éxito real.

## Comandos esenciales

```bash
bun run lint
bun run typecheck
bun test
bun run architecture:check
bun run quality:check
```

CLI PT actual:

```bash
bun run pt --help
bun run pt doctor
bun run pt runtime status --json
bun run pt device list --json
bun run pt device ports <device> --json
bun run pt link suggest <a> <b> --json
bun run pt cmd <device> "<command>"
bun run pt set host <device> ip <ip/cidr> --gateway <gw> --dns <dns>
bun run pt verify ping <source> <target>
bun run pt omni list --json
```

Runtime/deploy local:

```bash
bun run "pt build"
bun run pt runtime reload
bun run pt doctor
```

## Reglas críticas

- Bun primero; no npm/yarn/pnpm/node/ts-node salvo motivo explícito.
- No escribas lógica de negocio en `pt-runtime`; vive en `pt-control`.
- No importes internals entre paquetes si no hay export público.
- No edites `~/pt-dev/` como source.
- No documentes comandos legacy como públicos sin verificar `apps/pt-cli/src/commands/command-registry.ts`.
- Después de mutar topología/configuración, valida con `device list`, `link verify`, `cmd show...` o `verify`.

## Respuesta final esperada

Resume cambios, archivos tocados, validaciones ejecutadas/no ejecutadas y riesgos pendientes. Si una validación requiere PT abierto, dilo explícitamente.