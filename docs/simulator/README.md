# Simulador y TUI

Estado auditado: 2026-03-18

Este directorio define el roadmap para convertir `cisco-auto` en una plataforma `simulator-first`.

La idea central es simple:

- El producto principal pasa a ser el simulador.
- La TUI se construye sobre ese runtime observable.
- `.pka` y `.pkt` se tratan como adaptadores de import/export, no como el centro del dominio.
- La automatizacion SSH, el parser PKA actual y los wrappers XML quedan como periferia o compatibilidad.

## Documentos

- [PLAN.md](./PLAN.md): arquitectura objetivo, estrategia de migracion y fases.
- [TAREAS.md](./TAREAS.md): backlog priorizado con dependencias y criterios de aceptacion.

## Hallazgos que motivan este plan

- El repo actual es una app Bun de un solo paquete; no es un monorepo ni tiene un core de simulacion separado.
- Ya existen piezas reutilizables: `src/core/canonical/*`, `src/core/catalog/*`, `src/core/topology/*`, `src/core/validation/*`.
- No existe un motor DES real: faltan `scheduler`, `runtime`, `event queue`, `snapshot`, `replay` y `packet tracing`.
- La experiencia interactiva actual es un menu con `inquirer`, no una TUI persistente con workspace, inspector y modo simulacion.
- `bun test` da `184` tests pasando y `8` fallando; la base actual necesita estabilizacion antes de extraer el nuevo nucleo.

## Alcance

Este roadmap reemplaza, para la parte de simulacion/TUI, la narrativa optimista de [FASE-5-VALOR-AGREGADO.md](../FASE-5-VALOR-AGREGADO.md). Ese documento queda como referencia historica; el plan operativo vigente para simulador y terminal UI es este.
