# GEMINI.md — cisco-auto

Contexto mínimo para Gemini CLI. Mantén este archivo corto; usa `AGENTS.md` como guía compartida.

## Lectura obligatoria según tarea

- Siempre: `AGENTS.md`.
- Si trabajas dentro de un paquete: `packages/<paquete>/AGENTS.md`.
- CLI/talleres Cisco/PT: `.skills/pt-cli/SKILL.md` y `docs/CLI_AGENT_SKILL.md`.
- Arquitectura: `docs/ARCHITECTURE_BOUNDARIES.md`.
- Runtime vs control: `docs/architecture/runtime-control-boundary.md`.
- Packet Tracer internals/Omni: `docs/PT_ENGINE_INTERNALS.md` y `docs/PT_EVALUATE_HACKING_GUIDE.md`.

## Identidad del proyecto

`cisco-auto` automatiza Cisco Packet Tracer con una CLI Bun-first (`bun run pt`) y un runtime JavaScript cargado dentro de PT.

Paquetes clave:

- `apps/pt-cli`: comandos públicos.
- `packages/pt-control`: orquestación, diagnóstico, verification, policies.
- `packages/pt-runtime`: kernel PT-safe y primitives de bajo nivel.
- `packages/file-bridge`: IPC con Packet Tracer.
- `packages/ios-domain` / `packages/ios-primitives`: IOS puro.
- `.skills/pt-cli`: guía para operar labs de redes.

## Reglas de trabajo

- No supongas: confirma con archivos reales o pregunta por evidencia.
- Antes de modificar CLI, verifica `apps/pt-cli/src/program.ts` y `apps/pt-cli/src/commands/command-registry.ts`.
- No uses comandos legacy si no están registrados públicamente.
- No edites artefactos generados en `~/pt-dev/` como si fueran source.
- No pongas semántica de red/lab en `pt-runtime`; debe vivir en `pt-control`.
- Usa `--json` cuando necesites que otro agente parsee resultados.
- Todo éxito de Packet Tracer debe tener evidencia posterior: `verify`, `cmd show...`, `ping`, `device list`, `link verify`.

## Comandos frecuentes

```bash
bun run pt --help
bun run pt doctor
bun run pt runtime status --json
bun run pt device list --json
bun run pt device ports <device> --json
bun run pt link suggest <a> <b> --json
bun run pt cmd <device> "<command>"
bun run pt set host <device> ip <ip/cidr> --gateway <gw>
bun run pt verify ping <source> <target>
```

Calidad:

```bash
bun run lint
bun run typecheck
bun test
bun run architecture:check
bun run quality:check
```

## Entrega

Indica archivos cambiados, validaciones ejecutadas, validaciones pendientes y si algo requiere Packet Tracer real.