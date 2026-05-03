# AGENTS.md — cisco-auto / PT Control

Guía raíz para agentes de IA que modifican este repo.

Este archivo es la fuente canónica de comportamiento para agentes. Manténlo corto, operativo y verificable. La documentación humana empieza en `README.md`.

---

## Principio principal

No asumas.

Antes de proponer o aplicar cambios:

1. Lee los archivos reales involucrados.
2. Busca referencias con `grep`, `rg`, tests o la CLI antes de inferir.
3. Si falta contexto, pide el archivo, reporte o comando exacto.
4. Si la tarea toca Packet Tracer real, valida con evidencia de CLI o deja comandos exactos para que el usuario los ejecute.
5. Si código y documentación se contradicen, el código/tests actuales ganan y la documentación debe corregirse.

---

## Estado actual del proyecto

`cisco-auto` automatiza Cisco Packet Tracer con:

- CLI pública: `bun run pt`
- Runtime generado para Packet Tracer: `main.js`, `runtime.js`, `catalog.js`, `manifest.json`
- Bridge por filesystem en `PT_DEV_DIR`, normalmente `~/pt-dev`
- Workflows de control en TypeScript/Bun
- Evidencia reproducible vía JSON, logs, timings y tests

El flujo recomendado actual es `bun run pt`. No documentes ni restaures flujos legacy YAML/lab como superficie pública sin validar primero que siguen conectados al CLI actual.

---

## Fuentes de verdad

| Tema | Fuente primaria |
|---|---|
| Onboarding humano | `README.md` |
| CLI pública real | `bun run pt --help` y `bun run pt <cmd> --help` |
| CLI source | `apps/pt-cli/src` |
| Orquestación/control | `packages/pt-control` |
| Runtime Packet Tracer | `packages/pt-runtime` |
| Bridge filesystem | `packages/file-bridge` |
| Contratos terminales | `packages/terminal-contracts` |
| IOS puro/parsers/builders | `packages/ios-domain`, `packages/ios-primitives` |
| Reglas específicas de paquete | `packages/<paquete>/AGENTS.md` cuando exista |
| Skill de talleres PT/CLI | `docs/CLI_AGENT_SKILL.md` si existe |

Cuando modifiques un paquete, lee primero el `AGENTS.md` más cercano si existe.

---

## Mapa rápido del repo

```text
apps/
  pt-cli/                 CLI pública `bun run pt`

packages/
  pt-control/             Orquestación, servicios, planners, doctor, verificación
  pt-runtime/             Runtime PT-safe, kernel, handlers, terminal engine
  file-bridge/            IPC por filesystem entre CLI y Packet Tracer
  terminal-contracts/     Contratos compartidos de terminal/planes
  ios-domain/             Lógica IOS pura: parsers, builders, capabilities
  ios-primitives/         Value objects y helpers IOS
  types/                  Tipos compartidos
  kernel/                 Núcleo/plugin system legacy o experimental

docs/                      Documentación técnica
tests/                     Tests transversales
```

---

## CLI pública actual

No inventes comandos. Verifica con --help.

Comandos raíz esperados en la CLI moderna:

```bash
bun run pt --help
bun run pt build
bun run pt doctor
bun run pt completion
bun run pt device
bun run pt link
bun run pt cmd
bun run pt set
bun run pt verify
bun run pt runtime
bun run pt logs
bun run pt omni
```

Comandos comunes para validar estado real:

```bash
bun run pt doctor
bun run pt runtime status --json
bun run pt device list --json
bun run pt link list --json
bun run pt cmd <device> "<command>" --json
bun run pt verify ping <source> <target>
bun run pt logs
```

Para inspeccionar subcomandos:

```bash
bun run pt device --help
bun run pt link --help
bun run pt cmd --help
bun run pt runtime --help
bun run pt omni --help
```

---

## Packet Tracer y PT_DEV_DIR

El runtime se despliega en PT_DEV_DIR.

Rutas típicas:

```
macOS/Linux: ~/pt-dev
Windows:     %USERPROFILE%\pt-dev
Custom:      PT_DEV_DIR=/ruta/absoluta/pt-dev
```

Artefactos esperados:

```
main.js
runtime.js
catalog.js
manifest.json
commands/
in-flight/
results/
logs/
```

Reglas:

- No edites ~/pt-dev como si fuera source.
- Modifica TypeScript fuente y ejecuta bun run pt build.
- Si main.js cambia, Packet Tracer puede requerir recargar el script.
- Si solo cambia runtime.js, normalmente el hot-reload debe bastar.
- No guardes artefactos generados dentro del repo.

---

## Reglas de arquitectura

### apps/pt-cli

Debe contener UX, parsing de argumentos, salida humana/JSON y wiring de comandos.

No debe contener lógica profunda de Packet Tracer ni workflows complejos.

### packages/pt-control

Debe contener orquestación, servicios de aplicación, doctor, verification, planners y políticas.

Aquí viven workflows de alto nivel como configurar, validar, inspeccionar y coordinar acciones.

### packages/pt-runtime

Debe contener código que corre en Packet Tracer o se genera para Packet Tracer.

Debe ser PT-safe cuando termina en main.js o runtime.js.

Evita en código generado:

- `import`/`export`
- `const`/`let`
- arrow functions
- `class`
- `async`/`await`
- optional chaining
- template literals
- `globalThis`
- `console.*`
- `require()`
- `node:*`

No metas workflows altos en pt-runtime por rapidez. Si una feature necesita razonar sobre VLAN/DHCP/routing/labs completos, probablemente pertenece a pt-control.

### packages/file-bridge

Debe manejar colas, resultados, logs, leases y comunicación por filesystem.

No debe conocer detalles de CLI UX ni lógica IOS profunda.

### packages/ios-domain y packages/ios-primitives

Deben mantenerse puros y testeables sin Packet Tracer real.

---

## Reglas de trabajo

### Antes de editar

Ejecuta o pide evidencia equivalente:

```bash
git status --short
git diff --stat
git diff --check
```

Para investigar:

```bash
grep -R "texto-o-simbolo" apps packages tests --include='*.ts' -n
bun run pt --help
bun run pt <cmd> --help
```

### Durante el cambio

- Mantén cambios pequeños y atómicos.
- No mezcles documentación, refactor, bugfix y feature en el mismo patch si se puede evitar.
- No cambies producción para hacer pasar un test viejo sin confirmar el contrato actual.
- Si un test parece legacy, primero demuestra cuál es el contrato actual.
- Si algo depende de Packet Tracer abierto, dilo explícitamente.

### Después de editar

Mínimo:

```bash
git diff --check
```

Ejecuta tests focalizados según el cambio.

Ejemplos:

```bash
bun test apps/pt-cli/src/__tests__/ux/help.test.ts
bun test tests/architecture/check-architecture-boundaries.test.ts
bun test packages/pt-runtime/tests/main-runtime-boundary.test.ts
bun test packages/pt-control/src/application/services/terminal-command-service.plan-run.test.ts
```

Para cambios de runtime/build:

```bash
bun run pt build
bun test packages/pt-runtime/tests/main-runtime-boundary.test.ts
bun test packages/pt-runtime/src/__tests__/build/preflight-validation.test.ts
```

Para cambios de CLI:

```bash
bun run pt --help
bun run pt <cmd> --help
bun test apps/pt-cli/src/__tests__/ux/help.test.ts
bun test apps/pt-cli/src/__tests__/ux/completion.test.ts
```

Para cambios con PT real:

```bash
bun run pt doctor
bun run pt runtime status --json
bun run pt device list --json
bun run pt cmd <device> "show version" --json
```

---

## Packet Tracer real: cómo validar

No declares éxito real solo porque un test unitario pasó.

Usa evidencia observable:

```bash
bun run pt doctor
bun run pt runtime status --json
bun run pt device list --json
bun run pt link list --json
bun run pt cmd SW1 "show version" --json
bun run pt cmd SW1 "show interfaces" --complete --json
bun run pt verify ping PC1 192.168.1.1
```

Si el usuario debe ejecutar algo, da comandos completos y pide el output completo.

---

## Estilo de respuesta para agentes

Cuando entregues un plan:

1. Di qué archivo tocar.
2. Di qué bloque buscar.
3. Di qué bloque reemplazar.
4. Di por qué.
5. Da validación focalizada.
6. No digas "debería funcionar" sin evidencia.
7. No pidas confirmación si puedes dar el siguiente paso seguro y pequeño.

Cuando entregues un reporte final:

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

---

## Manejo de tests legacy

Puede haber tests o docs legacy de fases anteriores.

Antes de borrar o actualizar:

1. Confirma si el comando/API existe en la CLI actual.
2. Busca referencias productivas.
3. Verifica si el test cubre contrato actual o comportamiento removido.
4. Si es legacy, muévelo/renómbralo de forma que no contamine bun test global, pero deja trazabilidad si aún aporta contexto.

No uses tests/legacy/*.test.ts si no deben correr en bun test.

---

## Reglas para documentación

- README debe ser onboarding rápido.
- AGENTS.md debe ser la guía raíz para agentes.
- CLAUDE.md y GEMINI.md deben ser cortos y apuntar a AGENTS.md.
- No documentes comandos que no salgan en bun run pt --help.
- No documentes rutas absolutas locales de un usuario como si fueran generales.
- No mezcles planes históricos con onboarding actual.
- Si un documento histórico sigue siendo útil, márcalo como histórico o refactor plan.

---

## Prohibiciones prácticas

No hagas esto salvo que el usuario lo pida explícitamente y entiendas el impacto:

- editar artefactos generados en ~/pt-dev
- agregar YAML legacy a la CLI pública
- crear comandos raíz sin actualizar help/completion/tests
- meter lógica de orquestación en pt-runtime
- importar internals privados entre paquetes
- hacer commits gigantes con cambios no relacionados
- declarar validación real de PT sin output de PT

---

## Comandos de emergencia

Si el bridge/runtime parece roto:

```bash
bun run pt build
bun run pt doctor
bun run pt runtime status --json
bun run pt logs
```

Si un comando IOS parece truncado o contaminado:

```bash
bun run pt cmd <device> "show version" --json
bun run pt cmd <device> "show interfaces" --complete --json
```

Si necesitas inspección avanzada:

```bash
bun run pt omni --help
bun run pt omni raw --dry-run "<script>"
```

---

## Resumen

Trabaja con evidencia, no con suposiciones.

El orden correcto es:

**leer → buscar → validar contrato actual → cambiar poco → test focalizado → reportar**
