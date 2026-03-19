# Plan de Arquitectura: Simulador + TUI

Estado auditado: 2026-03-18

## 1. Objetivo

Transformar `cisco-auto` de editor/automatizador de labs Packet Tracer a una plataforma con:

- un simulador de red determinista como producto central;
- una TUI persistente como interfaz principal de trabajo;
- una CLI y una API construidas sobre el mismo core;
- adapters externos para YAML, `.pka`, `.pkt`, deploy SSH y exportaciones.

## 2. Estado actual verificado

### Lo que ya existe y se puede reutilizar

- Modelo canonico relativamente rico en `src/core/canonical/*`.
- Catalogo de dispositivos y modulos en `src/core/catalog/*`.
- Validacion estructural/fisica/logica basica en `src/core/validation/*`.
- Visualizacion ASCII/Mermaid y analisis de grafo en `src/core/topology/*`.
- Servicio de sesion para editar labs en `src/core/application/services/lab-session.service.ts`.
- CLI con `commander` y menus por `inquirer` en `src/cli/*`.
- API basica sobre `bun.serve` en `src/api/*`.
- Adapters/parsers PKA y wrappers XML de Packet Tracer en `src/core/parser/pka/*` y `src/core/models/*`.

### Lo que falta para hablar de simulador real

- No existe `sim-engine`.
- No existe `RuntimeState` vivo por dispositivo.
- No existe una cola de eventos futuros.
- No existe tiempo de simulacion explicito.
- No existen snapshots, replay ni trazas de eventos/paquetes.
- Los protocolos actuales viven como generadores IOS o validaciones, no como procesos de runtime.
- La experiencia interactiva es wizard-driven; no existe TUI real.

### Senales de deuda que hay que resolver antes de extraer el core

- La documentacion historica afirma completitud en areas no implementadas.
- `bun test` reporta `184` tests pasando y `8` fallando.
- Los fallos visibles hoy estan en `src/core/crypto/__tests__/twofish.test.ts` y en `tests/unit/api.test.ts`.
- El adapter `.pka` actual sigue acoplado a supuestos de Packet Tracer y a crypto inestable.

## 3. Principios no negociables

### 3.1 Simulator-first

No se agregan mas capacidades importantes dentro de `src/core/models/*` ni de los menus actuales, salvo correcciones puntuales. Toda capacidad nueva relevante para simulacion debe nacer en el nuevo nucleo.

### 3.2 `.pka` es adapter, no dominio

`.pka` y `.pkt` solo entran y salen por adapters. Ninguna decision del runtime depende del XML interno de Packet Tracer.

### 3.3 DES determinista

El corazon del producto es un simulador de eventos discretos con:

- tiempo virtual;
- orden total de eventos;
- scheduler determinista;
- replay reproducible con la misma semilla.

### 3.4 Separacion estricta entre definicion y ejecucion

Debe existir una diferencia clara entre:

- `LabDefinition`: lo autoral/declarativo;
- `RuntimeState`: lo vivo;
- `Snapshot`: congelacion serializable;
- `Observation`: lo que la UI puede ver;
- `Evidence`: lo que consume el validador.

### 3.5 La TUI es cliente del runtime

La TUI no implementa logica de protocolos. Solo inspecciona, edita definiciones, dispara acciones y observa el runtime.

## 4. Arquitectura objetivo

## 4.1 Estructura deseada del repo

```txt
apps/
  cli/
  tui/
  api/
  worker/

packages/
  lab-model/
  device-catalog/
  topology/
  sim-runtime/
  sim-engine/
  event-bus/
  tracing/
  validator/
  activity-engine/
  protocol-ethernet/
  protocol-vlan/
  protocol-arp/
  protocol-ipv4/
  protocol-icmp/
  protocol-routing-static/
  protocol-ospf/
  service-dhcp/
  import-yaml/
  export-yaml/
  import-pka/
  export-pka/
  legacy-automation/
```

## 4.2 Responsabilidades por paquete

`lab-model/`
: modelo canonico puro del laboratorio, sin dependencias de UI, red ni Packet Tracer.

`device-catalog/`
: definiciones versionadas de equipos, puertos, slots, modulos y capacidades.

`topology/`
: operaciones sobre grafo fisico y logico, dominios de broadcast, conectividad por VLAN y utilidades de layout.

`sim-runtime/`
: estado vivo por dispositivo, tablas MAC/ARP/RIB, contadores, buffers y procesos activos.

`sim-engine/`
: scheduler, tiempo, cola de eventos, snapshots, restore, replay y semilla.

`protocol-*` y `service-*`
: handlers de eventos y maquinas de estado; no generan IOS, simulan comportamiento.

`validator/`
: lectura de runtime, extraccion de evidencia y evaluacion declarativa.

`activity-engine/`
: objetivos, scoring, hints, variables y answer network.

`import-*` y `export-*`
: adaptadores. Nunca contienen reglas del simulador.

`legacy-automation/`
: puente temporal para no romper deploy SSH ni funcionalidades actuales mientras migra el producto.

## 4.3 Modelo de datos minimo

```ts
type LabDefinition = {
  metadata: LabMetadata;
  topology: TopologyDefinition;
  activity?: ActivityDefinition;
  initialConfig?: InitialConfigBundle;
  resources?: ResourceBundle;
};

type RuntimeState = {
  now: number;
  seed: number;
  devices: Record<string, DeviceRuntime>;
  links: Record<string, LinkRuntime>;
  services: Record<string, ServiceRuntime>;
  traces: TraceBuffers;
};

type Snapshot = {
  at: number;
  runtime: RuntimeState;
};

type Observation = {
  events: SimEventView[];
  packets: PacketView[];
  tables: Record<string, unknown>;
};

type Evidence = {
  checks: CheckEvidence[];
  score: number;
};
```

## 4.4 Contrato base del motor

```ts
interface SimEngine {
  now(): number;
  schedule(event: SimEvent): void;
  cancel(eventId: string): void;
  step(): StepResult;
  runUntil(time: number): RunResult;
  snapshot(): Snapshot;
  restore(snapshot: Snapshot): void;
}
```

Claves del orden total:

- `at`
- `priority`
- `sequence`

No se usa tiempo real como fuente de verdad del core.

## 5. Arquitectura de la TUI

## 5.1 Objetivo de UX

La TUI no debe copiar Packet Tracer pixel por pixel. Debe traducir su modelo mental a terminal:

- workspace por grilla;
- seleccion de nodos y enlaces;
- inspector lateral;
- barra de modo `edit` / `realtime` / `simulation`;
- consola de dispositivo;
- panel de eventos y trazas.

## 5.2 Layout del MVP

```txt
┌ Catalogo ┐┌──────────── Topologia ────────────┐┌ Inspector ┐
│ devices  ││ [PC1]-[SW1]-[R1]-[SW2]-[PC2]     ││ iface/rib │
│ cables   ││            |                      ││ arp/mac   │
│ actions  ││          [SRV1]                   ││ config    │
└──────────┘└───────────────────────────────────┘└───────────┘
┌──────────────────── CLI / Eventos / Logs ────────────────────┐
│ mode=simulation  step  filter=arp,icmp                       │
└───────────────────────────────────────────────────────────────┘
```

## 5.3 Capacidades del MVP de TUI

- abrir/guardar lab;
- mover nodos en una grilla;
- crear dispositivos y enlaces por seleccion;
- inspeccionar interfaces, MAC, ARP y rutas;
- ejecutar `step` y `run until`;
- ver lista de eventos y paquetes;
- abrir CLI del dispositivo seleccionado.

## 5.4 Decisiones practicas

- El renderer debe ser reemplazable.
- La primera version puede construirse con una libreria TUI de TypeScript, pero el contrato de UI no debe acoplarse a esa libreria.
- El visualizador ASCII actual puede sobrevivir como salida fallback o export.

## 6. Estrategia de migracion

No se hace un rewrite total de golpe. La migracion debe ser paralela y por estratos.

### Fase 0. Estabilizacion y congelamiento del legado

Objetivo:
dejar de meter logica nueva en el core legacy y sanear la base.

Entregables:

- resolver los tests rojos;
- marcar `src/core/models/*` y el parser PKA actual como compatibilidad;
- agregar nota de alcance en docs historicas;
- definir criterios de salida del legacy.

Salida:

- rama principal verde;
- backlog aprobado;
- arquitectura nueva documentada.

### Fase 1. Extraccion del nucleo canonico

Objetivo:
crear los paquetes base sin mover todavia protocolos.

Entregables:

- Bun workspaces;
- `packages/lab-model`;
- `packages/device-catalog`;
- `packages/topology`;
- `packages/legacy-automation`;
- adapters desde el `LabSpec` actual al nuevo `LabDefinition`.

Salida:

- CLI y API siguen funcionando;
- el nuevo modelo ya existe y esta versionado.

### Fase 2. Motor DES minimo

Objetivo:
introducir el scheduler y el runtime vivo.

Entregables:

- `packages/sim-engine`;
- `packages/sim-runtime`;
- `packages/event-bus`;
- cola de eventos determinista;
- `snapshot` y `restore`;
- trazas minimas de eventos.

Salida:

- un laboratorio pequeno puede correr en modo headless con replay determinista.

### Fase 3. Protocolo MVP util

Objetivo:
tener conectividad educativa minima util.

Entregables:

- Ethernet;
- switching basico;
- VLAN access/trunk;
- ARP;
- IPv4;
- ICMP echo;
- routing estatico;
- evidence extractors simples.

Salida:

- un lab L2/L3 pequeno puede demostrar reachability sin equipo externo.

### Fase 4. TUI MVP

Objetivo:
poner una interfaz de trabajo real sobre el nuevo core.

Entregables:

- `apps/tui`;
- workspace por grilla;
- inspector;
- panel de eventos;
- modo `step-by-step`;
- CLI de dispositivo como proyeccion del estado.

Salida:

- ya no dependes del menu `inquirer` para editar y observar labs.

### Fase 5. Activity engine y control plane

Objetivo:
cerrar el ciclo autoria -> simulacion -> evaluacion.

Entregables:

- `packages/validator`;
- `packages/activity-engine`;
- DSL de objetivos y checks;
- API de control para cargar labs, correr simulacion y consultar observaciones.

Salida:

- un lab puede evaluarse usando runtime interno y no solo deploy externo.

### Fase 6. Adapters avanzados

Objetivo:
volver a conectar el ecosistema Packet Tracer y las capacidades legacy sin contaminar el core.

Entregables:

- `import-pka` y `export-pka`;
- strategy por version de Packet Tracer;
- bridge con deploy SSH solo como adapter;
- round-trip tests y differential tests basicos.

Salida:

- `.pka` deja de ser bloqueo arquitectonico y pasa a ser compatibilidad.

## 7. No objetivos del primer ciclo

- Paridad completa con Packet Tracer.
- Vista fisica tipo workspace realista.
- Multiusuario.
- Emulacion de IOS real.
- Soporte inmediato para todo el catalogo IoT/OT.
- BGP, NAT, ACL complejas y wireless en el MVP.

## 8. Criterios de exito

El cambio va bien si se cumple esto:

- el simulador corre sin depender de Packet Tracer;
- la misma semilla produce el mismo resultado;
- la TUI observa estado vivo y no solo YAML;
- `.pka` puede romperse sin romper el core;
- la validacion usa evidencia del runtime interno;
- CLI, API y TUI comparten contratos del mismo nucleo.

## 9. Riesgos principales

- Intentar migrar el repo completo en una sola PR.
- Confundir generacion de IOS con simulacion.
- Acoplar la TUI directamente a estructuras legacy.
- Reusar demasiado `src/core/models/*` y heredar deuda de Packet Tracer XML.
- Dejar el control plane definido antes de fijar el contrato del motor.

## 10. Decision operativa

Desde este punto, cualquier trabajo nuevo de simulacion o TUI debe preguntarse primero:

1. `Esto vive en el nuevo sim core o es legado?`
2. `Esto modela comportamiento o solo transforma archivos?`
3. `Esto depende de Packet Tracer o solo lo adapta?`

Si la respuesta cae del lado del legado o del adapter, no debe contaminar el nuevo nucleo.
