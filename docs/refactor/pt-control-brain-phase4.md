# pt-control-brain-phase4.md

## Section 1: Problema actual

Describe que hoy:
- Parte de la lógica está duplicada entre runtime y control
- Control ya tiene planners/servicios útiles pero sin frontera única
- Algunos flujos siguen dependiendo de handlers de runtime demasiado gruesos
- Omni aún no actúa como harness central del sistema

## Section 2: Rol nuevo de control

Declare que `pt-control` es responsable de:
- Resolver intención
- Elegir estrategia
- Planificar
- Orquestar
- Validar
- Diagnosticar
- Seleccionar entre primitive / terminal / hack
- Consolidar evidencia
- Emitir veredicto final

## Section 3: Lo que control no debe hacer

- No tocar internals PT directamente
- No abrir `ipc` por su cuenta
- No usar evaluate/hacks saltándose adapters runtime
- No parsear éxito desde respuestas ambiguas sin evidencia

## Section 4: Patrón base

Fija literalmente:
**Intent → Plan → Primitive Calls / Terminal Plans / Omni Adapters → Evidence → Verdict**