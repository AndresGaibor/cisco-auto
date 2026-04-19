# ADR: pt-runtime Thin Kernel

## ADR-001: Separar pt-runtime (kernel) de pt-control (orchestration)

### Estado

**Aceptado** | Fecha: 2026-04-19

### Contexto

El proyecto `cisco-auto` actualmente tiene una arquitectura híbrida que mezcla responsabilidades:

1. **Runtime demasiado grueso**: `pt-runtime` contiene lógica de negocio que debería estar en `pt-control` (handlers de VLAN,DHCP, workflows completos).

2. **Control tiene inteligencia duplicada**: `pt-control` ya re-implementa planning y workflows que podrían consumir primitives runtime.

3. **Docs de hacks/omni sin frontera**: Los discoverimientos de hacks en `docs/PT_EVALUATE_HACKING_GUIDE.md` son valiosos pero no tienen una frontera operacional clara.

4. **Diseño legacy coexiste con diseño objetivo**: El asset desplegado sigue corriendo con `command.json` + polling simple + hot-reload de `runtime.js`, cuando el diseño objetivo habla de cola real.

### Problemas Identificados

- **Falsos positivos**: La capa IOS actual trata `enterCommand()` como síncrono, devolviendo resultados antes de que el comando termine.
- **Éxito sintético**: Comandos que "funcionan" en tests pero fallan en producción porque no hay evidencia real.
- **Hot reload como lifecycle**: El sistema usa hot-reload de `runtime.js` como reemplazo del lifecycle real, lo que oculta bugs.
- **Mezcla de responsabilidades**: Handlers de negocio (VLAN, DHCP) viven en runtime cuando deberían ser workflows en control.

### Decisión

Adoptamos la siguiente arquitectura:

#### 1. `pt-runtime` será thin kernel

**Solo contiene**:
- Kernel lifecycle (boot, shutdown, lease, heartbeat)
- Dispatch primitivo
- Command queue polling y claim
- Terminal engine (apertura, ejecución, parsing)
- Primitives PT-safe (device CRUD, link CRUD, module ops, host config)
- Adapters `omni` de bajo nivel (evaluation raw, assessment read, env inspect)
- Catálogo de modelos/capacidades
- Build y validación ES5/PT-safe

**No contiene**:
- workflows semánticos altos
- validadores de escenarios
- parsers complejos de outputs
- lógica de negocio compuesta

#### 2. `pt-control` será orchestration brain

**Contiene**:
- Intent resolution y planners
- Orchestration de multi-dispositivo
- Diagnosis y verification
- Policy management
- Fallback strategies
- Harness `omni` (capability runner)
- Evidence evaluation

#### 3. `omni` será harness oficial

- Todo hack debe ser una capability registrada
- Cada capability tiene contrato (risk, preconditions, setup, cleanup)
- Control decide cuándo usar capabilities
- Runtime implementa adapters

#### 4. Success sin evidencia queda prohibido

- Todo resultado debe incluir evidencia verificable
- No se acepta `ok: true` sin parsing de output
- Assessment values deben confirmarse con CLI

### Consecuencias

#### Buenas

| Beneficio | Descripción |
|----------|-------------|
| Testeable | Runtime puro sin efectos secundarios complejos |
| Escalable | Control puede paralelizar, runtime permanece liviano |
| Menos blast radius | Bugs en workflows no rompen kernel |
| Mejor CI |Tests de integración real con omni |

#### Costes

| Costo | Mitigation |
|-------|------------|
| Migrar lógica | Fase 2+分期迁移 |
| Escribir contratos | Documentar primitives y capabilities |
| Reescribir exports |分组发布, backwards compatible |
| Transición temporal | Mantener Ambos paquetes durante migración |

### Alternativas Consideradas

1. **Mantener status quo**: Descartado porque produce falsos positivos y no escala.

2. **Mover todo a runtime**: Descartado porque runtime debe ser PT-safe y simple.

3. **Mover todo a control**: Descartado porque necesito ejecución close-to-metal en PT.

### Plan de Migration

1. **Fase 1 (esta)**: Congelar arquitectura, crear documentos, inventariar archivos
2. **Fase 2**: Terminal engine + contrato de ejecución IOS
3. **Fase 3**: Migrar handlers de negocio a workflows en control
4. **Fase 4**: Reescribir exports y limpiar dependencias
5. **Fase 5**: Deprecaciones y cleanup final

---

## Histórico de Cambios

| Fecha | Versión | Autor | Cambios |
|-------|--------|-------|---------|
| 2026-04-19 | 1.0 | @agibor | Initial ADR |