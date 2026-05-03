# CLAUDE.md — cisco-auto / PT Control

Contexto mínimo para Claude Code.

La fuente canónica es `AGENTS.md`. No dupliques documentación extensa aquí.

---

## Qué leer primero

1. `AGENTS.md` en la raíz.
2. `AGENTS.md` del paquete que vas a modificar si existe.
3. `README.md` para onboarding humano.

---

## Comandos esenciales

```bash
bun run pt --help
bun run pt doctor
bun run pt build
bun test
```

Para comandos específicos de Packet Tracer, consulta `AGENTS.md` → *CLI pública actual* y *Packet Tracer real: cómo validar*.

---

## Reglas críticas

- Bun primero; no uses `npm`, `yarn`, `pnpm`, `node` sin motivo explícito.
- No escribas lógica de negocio en `pt-runtime`; vive en `pt-control`.
- No edites artefactos generados en `~/pt-dev/` como si fuera source.
- Si una tarea toca Packet Tracer real, valida con evidencia de CLI (`pt doctor`, `pt cmd`, `pt verify`, `pt logs`).
- Mantén diffs pequeños y atómicos.

---

## Respuesta esperada

Resume cambios, archivos tocados, validaciones ejecutadas/no ejecutadas y riesgos pendientes. Si algo requiere PT abierto, dilo explícitamente.
