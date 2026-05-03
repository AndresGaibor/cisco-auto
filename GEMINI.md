# GEMINI.md — cisco-auto / PT Control

Contexto mínimo para Gemini CLI.

La fuente canónica es `AGENTS.md`. No dupliques documentación extensa aquí.

---

## Qué leer primero

1. `AGENTS.md` en la raíz.
2. `AGENTS.md` del paquete que vas a modificar si existe.
3. `README.md` para onboarding humano.
4. `docs/CLI_AGENT_SKILL.md` si la tarea es operar talleres de redes con Packet Tracer y el archivo existe.

---

## Identidad del proyecto

`cisco-auto` automatiza Cisco Packet Tracer con:

- CLI pública: `bun run pt`
- Runtime generado para Packet Tracer
- Bridge por filesystem en `PT_DEV_DIR`, normalmente `~/pt-dev`
- Workflows de control en TypeScript/Bun

Paquetes principales:

```text
apps/pt-cli                 CLI pública
packages/pt-control         Orquestación, doctor, verification, planners
packages/pt-runtime         Runtime PT-safe, kernel, handlers
packages/file-bridge        IPC por filesystem con Packet Tracer
packages/terminal-contracts Contratos terminales
packages/ios-domain         IOS puro: parsers/builders
packages/ios-primitives     Value objects IOS
```

---

## Comandos esenciales

```bash
bun run pt --help
bun run pt doctor
bun run pt build
bun test
```

Para comandos específicos de Packet Tracer, consulta `AGENTS.md`:

- CLI pública actual
- Packet Tracer y PT_DEV_DIR
- Packet Tracer real: cómo validar
- Comandos de emergencia

---

## Reglas críticas

- No asumas. Lee archivos reales, busca referencias y valida contratos actuales.
- Bun primero; no uses `npm`, `yarn`, `pnpm`, `node` o `ts-node` sin motivo explícito.
- No documentes comandos que no salgan en `bun run pt --help` o `bun run pt <cmd> --help`.
- No edites artefactos generados en `~/pt-dev` como si fueran source.
- No pongas lógica de negocio o workflows altos en `pt-runtime`; eso vive en `pt-control`.
- No mezcles cambios grandes no relacionados.
- Si una tarea toca Packet Tracer real, valida con evidencia de CLI o deja comandos exactos para que el usuario los ejecute.

---

## Validación mínima

Antes de entregar cambios:

```bash
git status --short
git diff --stat
git diff --check
```

Ejecuta tests focalizados según el archivo tocado.

Para docs:

```bash
git diff -- README.md AGENTS.md CLAUDE.md GEMINI.md
git diff --check
```

Para CLI:

```bash
bun run pt --help
bun run pt <cmd> --help
```

Para Packet Tracer real:

```bash
bun run pt doctor
bun run pt runtime status --json
bun run pt device list --json
bun run pt cmd <device> "show version" --json
bun run pt verify ping <source> <target>
```

---

## Respuesta esperada

Cuando termines, reporta:

```
Cambios:
- archivo 1
- archivo 2

Validación:
- comando A: pass/fail
- comando B: pass/fail

Pendiente:
- qué no se validó
- si requiere Packet Tracer abierto
```

Si algo requiere PT abierto, dilo explícitamente.
