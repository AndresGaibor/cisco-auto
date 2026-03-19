# Tareas Prioritarias: Simulador + TUI

Estado auditado: 2026-03-18

## Convenciones

- `P0`: bloquea la extraccion del simulador.
- `P1`: necesario para el MVP.
- `P2`: valor alto, pero puede esperar.
- `Done` para una tarea de implementacion significa codigo, tests y docs alineados.

## Hitos

- Hito A: core nuevo extraido y repo estable.
- Hito B: simulacion headless determinista de L2/L3 basico.
- Hito C: TUI operativa sobre runtime vivo.
- Hito D: activity engine y adapters externos desacoplados.

## EPIC 0. Estabilizacion del repo actual

- [ ] SIM-001 Corregir los tests rojos actuales.
Prioridad: P0
Dependencias: ninguna
Resultado esperado: `bun test` verde.
Aceptacion: resueltos los fallos en `tests/unit/api.test.ts` y `src/core/crypto/__tests__/twofish.test.ts`.

- [ ] SIM-002 Documentar formalmente el legado que queda congelado.
Prioridad: P0
Dependencias: SIM-001
Resultado esperado: nota clara sobre `src/core/models/*`, parser PKA actual y menus `inquirer`.
Aceptacion: existe documentacion que impide seguir agregando features nuevas ahi.

- [ ] SIM-003 Alinear la documentacion historica con el estado real.
Prioridad: P0
Dependencias: SIM-002
Resultado esperado: eliminar afirmaciones de "completado" en simulacion/TUI cuando no corresponda.
Aceptacion: no queda ninguna doc de roadmap afirmando que existe motor de simulacion real.

## EPIC 1. Extraccion de la nueva arquitectura

- [ ] SIM-010 Convertir el repo a Bun workspaces.
Prioridad: P0
Dependencias: SIM-001
Resultado esperado: raiz con `apps/` y `packages/` sin romper la CLI actual.
Aceptacion: build y test siguen funcionando tras el split inicial.

- [ ] SIM-011 Crear `packages/lab-model`.
Prioridad: P0
Dependencias: SIM-010
Resultado esperado: nuevo `LabDefinition`, `DeviceDefinition`, `ConnectionDefinition`, `ActivityDefinition`.
Aceptacion: el paquete no depende de `Packet Tracer`, `inquirer`, SSH ni XML.

- [ ] SIM-012 Crear `packages/device-catalog`.
Prioridad: P0
Dependencias: SIM-010
Resultado esperado: mover y limpiar el catalogo reutilizable desde `src/core/catalog/*`.
Aceptacion: el catalogo se puede consumir desde CLI, API y futuro runtime sin importar legacy.

- [ ] SIM-013 Crear `packages/topology`.
Prioridad: P0
Dependencias: SIM-011
Resultado esperado: grafo fisico/logico, dominios de broadcast y utilidades de conectividad.
Aceptacion: las utilidades de topologia dejan de vivir mezcladas con render ASCII.

- [ ] SIM-014 Crear adapters temporales entre `LabSpec` y `LabDefinition`.
Prioridad: P0
Dependencias: SIM-011
Resultado esperado: compatibilidad de entrada/salida durante la migracion.
Aceptacion: CLI y API pueden cargar labs actuales mientras el nuevo core madura.

- [ ] SIM-015 Mover deploy SSH y wrappers Packet Tracer a `legacy-automation`.
Prioridad: P1
Dependencias: SIM-014
Resultado esperado: el nuevo core no depende de SSH ni XML PT.
Aceptacion: `src/core/models/*` deja de ser parte del camino principal.

## EPIC 2. Motor DES

- [ ] SIM-020 Crear `packages/sim-engine` con scheduler determinista.
Prioridad: P0
Dependencias: SIM-011
Resultado esperado: `SimEvent`, `schedule`, `cancel`, `step`, `runUntil`.
Aceptacion: existen tests de orden total por `at`, `priority` y `sequence`.

- [ ] SIM-021 Crear `packages/sim-runtime`.
Prioridad: P0
Dependencias: SIM-020
Resultado esperado: `RuntimeState`, `DeviceRuntime`, `LinkRuntime`, `ServiceRuntime`.
Aceptacion: el estado vivo esta separado del modelo declarativo.

- [ ] SIM-022 Implementar snapshots y restore.
Prioridad: P1
Dependencias: SIM-021
Resultado esperado: snapshot serializable y restauracion exacta.
Aceptacion: test de replay reproduce el mismo estado final con misma semilla.

- [ ] SIM-023 Implementar trazas de eventos y paquetes.
Prioridad: P1
Dependencias: SIM-020
Resultado esperado: buffers consultables por TUI y API.
Aceptacion: cada evento procesado deja un registro observable.

- [ ] SIM-024 Agregar tests de determinismo y property-based testing.
Prioridad: P1
Dependencias: SIM-020
Resultado esperado: base de calidad para el motor.
Aceptacion: hay tests que fallan si el orden de eventos o snapshots deja de ser reproducible.

## EPIC 3. Protocolos MVP

- [ ] SIM-030 Implementar Ethernet y forwarding L2 basico.
Prioridad: P0
Dependencias: SIM-021
Resultado esperado: frame tx/rx, flooding y MAC learning.
Aceptacion: un switch sencillo reenvia correctamente broadcast y unicast conocidos.

- [ ] SIM-031 Implementar VLAN access/trunk.
Prioridad: P1
Dependencias: SIM-030
Resultado esperado: forwarding por VLAN y validacion de allowed VLANs.
Aceptacion: dos hosts en VLAN distinta no se alcanzan sin L3.

- [ ] SIM-032 Implementar ARP.
Prioridad: P0
Dependencias: SIM-030
Resultado esperado: cache ARP, requests, replies y cola de paquetes pendientes.
Aceptacion: un `ping` local requiere resolver ARP antes de ICMP.

- [ ] SIM-033 Implementar IPv4 e ICMP.
Prioridad: P0
Dependencias: SIM-032
Resultado esperado: envio IP, TTL e echo request/reply.
Aceptacion: existe prueba end-to-end host a host en la misma red.

- [ ] SIM-034 Implementar routing estatico.
Prioridad: P0
Dependencias: SIM-033
Resultado esperado: longest prefix match y next-hop.
Aceptacion: existe prueba end-to-end entre subredes a traves de router.

- [ ] SIM-035 Crear oraculos de evidencia basados en runtime.
Prioridad: P1
Dependencias: SIM-033
Resultado esperado: extractores de tablas y checks de conectividad.
Aceptacion: el validador puede leer runtime interno sin depender de SSH.

## EPIC 4. TUI MVP

- [ ] TUI-001 Seleccionar y encapsular el renderer terminal.
Prioridad: P0
Dependencias: SIM-020
Resultado esperado: contrato de renderer desacoplado del core.
Aceptacion: existe `apps/tui` con bootstrap y sin dependencias del legacy.

- [ ] TUI-002 Implementar layout persistente.
Prioridad: P0
Dependencias: TUI-001
Resultado esperado: panel de catalogo, topologia, inspector y logs/eventos.
Aceptacion: la app renderiza sin prompts secuenciales tipo `inquirer`.

- [ ] TUI-003 Implementar workspace por grilla.
Prioridad: P0
Dependencias: TUI-002, SIM-013
Resultado esperado: mover nodos, seleccionar enlaces y crear dispositivos.
Aceptacion: una topologia simple puede editarse solo desde la TUI.

- [ ] TUI-004 Implementar inspector de runtime.
Prioridad: P1
Dependencias: TUI-002, SIM-021
Resultado esperado: ver interfaces, MAC, ARP, rutas y counters.
Aceptacion: cambiar la seleccion refresca el panel sin reiniciar la app.

- [ ] TUI-005 Implementar modo simulacion.
Prioridad: P1
Dependencias: TUI-004, SIM-023
Resultado esperado: `step`, `run`, filtros y lista de eventos.
Aceptacion: el usuario puede seguir un `ping` evento por evento desde terminal.

- [ ] TUI-006 Integrar consola de dispositivo.
Prioridad: P2
Dependencias: TUI-004
Resultado esperado: shell de comandos canonicos y `show` projections.
Aceptacion: no depende de emular IOS completo para el MVP.

## EPIC 5. Validator y activity engine

- [ ] VAL-001 Redefinir el DSL de objetivos.
Prioridad: P1
Dependencias: SIM-035
Resultado esperado: objetivos, pesos, hints y checks declarativos.
Aceptacion: un lab puede calificarse sin comandos externos.

- [ ] VAL-002 Implementar `packages/validator`.
Prioridad: P1
Dependencias: VAL-001
Resultado esperado: evidencia, scoring y diff entre actual vs esperado.
Aceptacion: existe salida consumible por CLI, API y TUI.

- [ ] VAL-003 Implementar `packages/activity-engine`.
Prioridad: P2
Dependencias: VAL-002
Resultado esperado: answer network, variables y feedback.
Aceptacion: una actividad puede evaluarse con puntaje reproducible.

## EPIC 6. Adapters externos

- [ ] ADP-001 Reescribir el adapter YAML sobre `LabDefinition`.
Prioridad: P1
Dependencias: SIM-011
Resultado esperado: import/export estable y versionado.
Aceptacion: round-trip de YAML sin perdida relevante.

- [ ] ADP-002 Reubicar el parser PKA como adapter versionado.
Prioridad: P1
Dependencias: SIM-015
Resultado esperado: `import-pka` y `export-pka` fuera del core.
Aceptacion: si el adapter falla, el simulador sigue intacto.

- [ ] ADP-003 Crear estrategia de compatibilidad por version PT.
Prioridad: P2
Dependencias: ADP-002
Resultado esperado: limites claros de soporte y warnings por version.
Aceptacion: cada import/export declara su cobertura y degradaciones.

- [ ] ADP-004 Mantener bridge temporal a deploy SSH.
Prioridad: P2
Dependencias: SIM-015
Resultado esperado: seguir usando automatizacion real como periferia.
Aceptacion: el bridge consume contratos del nuevo core y no al reves.

## Orden recomendado de ejecucion

1. SIM-001 a SIM-003
2. SIM-010 a SIM-015
3. SIM-020 a SIM-024
4. SIM-030 a SIM-035
5. TUI-001 a TUI-005
6. VAL-001 a VAL-003
7. ADP-001 a ADP-004

## Primeras 3 entregas recomendadas

### Entrega 1

- SIM-001
- SIM-002
- SIM-010
- SIM-011
- SIM-014

Resultado:
repo estable y nuevo modelo base listo para convivir con el legado.

### Entrega 2

- SIM-020
- SIM-021
- SIM-022
- SIM-030
- SIM-032
- SIM-033

Resultado:
primer simulador headless minimo con eventos, ARP e ICMP.

### Entrega 3

- SIM-034
- SIM-035
- TUI-001
- TUI-002
- TUI-003
- TUI-004

Resultado:
TUI util para editar topologia y observar runtime vivo en labs pequenos.
