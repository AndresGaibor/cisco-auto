# Plan de Arquitectura: Simulador + TUI

Estado auditado: 2026-03-18  
**Ultima actualizacion: 2026-03-19**

## 0. Estado de implementacion

### Completado

| Fase | Estado | Commits |
|------|--------|---------|
| Fase 0: Estabilizacion | ✅ Completado | `b2eb03c` |
| Fase 1: Extraccion nucleo canonico | ✅ Completado | `fad2a12`, `383504a` |
| Fase 2: Motor DES minimo | ✅ Completado | `fad2a12`, `b47023d` |
| Fase 3: Protocolo MVP util | ✅ Completado | `b47023d` |
| Fase 4: TUI MVP | ✅ Completado | `4ef3a9c`, `34f1548` |

### Estructura actual del repo

```txt
apps/
  tui/                    ✅ Ink TUI con 4-paneles

packages/
  lab-model/              ✅ Tipos canonicos (DeviceSpec, LinkSpec)
  device-catalog/         ✅ Catalogo de routers, switches, PCs
  topology/               ✅ Visualizacion ASCII, grafo, matriz
  sim-engine/             ✅ Motor DES determinista
  sim-runtime/            ✅ Estado runtime + protocolos L2/L3
  crypto/                 ✅ Twofish para PKA (legacy)
  import-pka/             ✅ Parser .pka
  import-yaml/            ✅ Parser .yaml labs
  legacy/                 ✅ Codigo legacy temporal
```

### Protocolos implementados

| Capa | Protocolo | Archivo |
|------|-----------|---------|
| L2 | Ethernet (frames, MAC, FCS) | `sim-runtime/src/protocols/ethernet.ts` |
| L2 | VLAN (802.1Q, trunk/access) | `sim-runtime/src/protocols/vlan.ts` |
| L2 | MAC Learning (aging, forwarding) | `sim-runtime/src/protocols/mac-learning.ts` |
| L3 | ARP (request/reply, cache) | `sim-runtime/src/protocols/arp.ts` |
| L3 | IPv4 (packets, checksum) | `sim-runtime/src/protocols/ipv4.ts` |
| L3 | ICMP (echo, errors) | `sim-runtime/src/protocols/icmp.ts` |
| L3 | Routing (static, connected) | `sim-runtime/src/protocols/routing.ts` |

### Tests

- **362 pass, 7 skip, 0 fail**
- 159 tests nuevos de protocolos L2/L3

### TUI Layout implementado

```
┌──────────────┐ ┌─────────────────────┐ ┌──────────────────┐
│ Device List  │ │ Topology View       │ │ Device Inspector │
│ [↑↓] Nav     │ │ [4 devices, 3 links]│ │ Interfaces       │
│              │ │                     │ │ MAC/ARP Tables   │
│ ▶ Router1 ●  │ │ ▶ ╔════════╗        │ │ Routing Table    │
│   Switch1 ●  │ │   ║ R Router1 ║      │ │                  │
│   PC1     ●  │ │   ╚════════╝        │ │                  │
└──────────────┘ └─────────────────────┘ └──────────────────┘
┌────────────────────────────────────────────────────────────┐
│ Events [4] Sim: 3ms   [l] Auto-scroll [↑↓] Scroll          │
│ [   0ms] + device_add   Router1 added to topology          │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│ ✏ EDIT   Time: 3ms   Speed: 1x   ⏸ PAUSED                 │
│ [Tab] Switch mode [i] Init [?] Help    [q/Esc] Quit        │
└────────────────────────────────────────────────────────────┘
```

### Pendiente

| Fase | Estado | Descripcion |
|------|--------|-------------|
| Fase 5: Activity engine | ⏳ Pendiente | Validator, activity-engine, DSL de objetivos |
| Fase 6: Adapters avanzados | ⏳ Pendiente | import-pka/export-pka robustos, deploy SSH |

## 1. Objetivo

Transformar `cisco-auto` de editor/automatizador de labs Packet Tracer a una plataforma con:

- un simulador de red determinista como producto central;
- una TUI persistente como interfaz principal de trabajo;
- una CLI y una API construidas sobre el mismo core;
- adapters externos para YAML, `.pka`, `.pkt`, deploy SSH y exportaciones.

## 2. Estado actual verificado (actualizado 2026-03-19)

### Lo que ya existe y se puede reutilizar

- Modelo canonico en `packages/lab-model/` con tipos puros.
- Catalogo de dispositivos en `packages/device-catalog/`.
- Visualizacion ASCII/Mermaid en `packages/topology/`.
- Motor DES determinista en `packages/sim-engine/`.
- Estado runtime vivo en `packages/sim-runtime/`.
- Protocolos L2/L3 implementados (Ethernet, VLAN, MAC learning, ARP, IPv4, ICMP, Routing).
- TUI funcional en `apps/tui/` con Ink (React para CLI).
- Adapters PKA y YAML funcionales.

### Lo que ya NO falta (completado)

- ✅ `sim-engine` - scheduler determinista con cola de eventos.
- ✅ `RuntimeState` vivo por dispositivo.
- ✅ Cola de eventos futuros con prioridad.
- ✅ Tiempo de simulacion explicito.
- ✅ Snapshots, restore y trazas de eventos.
- ✅ Protocolos de runtime (L2: Ethernet, VLAN, MAC; L3: ARP, IPv4, ICMP, Routing).
- ✅ TUI real con workspace, inspector y panel de eventos.

### Lo que aun falta

- Activity engine y DSL de objetivos.
- Validator que consume evidencia del runtime.
- Adapters PKA robustos (round-trip).
- Protocolos adicionales (DHCP, OSPF, BGP).
- CLI de dispositivo como proyeccion del estado.

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

### Estado actual (implementado)

```txt
apps/
  tui/                    ✅ TUI con Ink (React for CLI)

packages/
  lab-model/              ✅ Modelos canonicos
  device-catalog/         ✅ Catalogo de dispositivos
  topology/               ✅ Analisis de grafo y visualizacion
  sim-engine/             ✅ Motor DES determinista
  sim-runtime/            ✅ Estado vivo + protocolos L2/L3
  crypto/                 ✅ Twofish (legacy PKA)
  import-pka/             ✅ Parser .pka
  import-yaml/            ✅ Parser .yaml
  legacy/                 ✅ Codigo legacy temporal
```

### Estructura objetivo (pendiente)

```txt
apps/
  cli/                    ⏳ CLI refactorizada sobre nuevo core
  tui/                    ✅ COMPLETADO
  api/                    ⏳ API refactorizada sobre nuevo core
  worker/                 ⏳ Worker para simulaciones largas

packages/
  event-bus/              ⏳ Bus de eventos para IPC
  tracing/                ⏳ Trazas avanzadas
  validator/              ⏳ Evaluacion declarativa
  activity-engine/        ⏳ Objetivos y scoring
  protocol-ospf/          ⏳ OSPF
  service-dhcp/           ⏳ DHCP server simulation
  export-yaml/            ⏳ Exportacion YAML
  export-pka/             ⏳ Exportacion PKA
  legacy-automation/      ⏳ Bridge SSH deploy
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

### Fase 0. Estabilizacion y congelamiento del legado ✅ COMPLETADO

**Commits:** `b2eb03c`

Objetivo:
dejar de meter logica nueva en el core legacy y sanear la base.

Entregables:

- ✅ resolver los tests rojos (362 pass, 7 skip, 0 fail);
- ✅ marcar `src/core/models/*` y el parser PKA actual como compatibilidad;
- ✅ agregar nota de alcance en docs historicas;
- ✅ definir criterios de salida del legacy.

Salida:

- ✅ rama principal verde;
- ✅ backlog aprobado;
- ✅ arquitectura nueva documentada.

### Fase 1. Extraccion del nucleo canonico ✅ COMPLETADO

**Commits:** `fad2a12`, `383504a`

Objetivo:
crear los paquetes base sin mover todavia protocolos.

Entregables:

- ✅ Bun workspaces;
- ✅ `packages/lab-model`;
- ✅ `packages/device-catalog`;
- ✅ `packages/topology`;
- ✅ `packages/legacy`;
- ⏳ adapters desde el `LabSpec` actual al nuevo `LabDefinition` (parcial).

Salida:

- ✅ CLI y API siguen funcionando;
- ✅ el nuevo modelo ya existe y esta versionado.

### Fase 2. Motor DES minimo ✅ COMPLETADO

**Commits:** `fad2a12`, `b47023d`

Objetivo:
introducir el scheduler y el runtime vivo.

Entregables:

- ✅ `packages/sim-engine`;
- ✅ `packages/sim-runtime`;
- ⏳ `packages/event-bus` (no necesario para MVP);
- ✅ cola de eventos determinista;
- ✅ `snapshot` y `restore`;
- ✅ trazas minimas de eventos.

Salida:

- ✅ un laboratorio pequeno puede correr en modo headless con replay determinista.

### Fase 3. Protocolo MVP util ✅ COMPLETADO

**Commits:** `b47023d`

Objetivo:
tener conectividad educativa minima util.

Entregables:

- ✅ Ethernet;
- ✅ switching basico (MAC learning);
- ✅ VLAN access/trunk;
- ✅ ARP;
- ✅ IPv4;
- ✅ ICMP echo;
- ✅ routing estatico;
- ⏳ evidence extractors simples (pendiente para Fase 5).

Salida:

- ✅ un lab L2/L3 pequeno puede demostrar reachability sin equipo externo.

### Fase 4. TUI MVP ✅ COMPLETADO

**Commits:** `4ef3a9c`, `34f1548`

Objetivo:
poner una interfaz de trabajo real sobre el nuevo core.

Entregables:

- ✅ `apps/tui`;
- ✅ workspace por grilla (layout 4-paneles);
- ✅ inspector (interfaces, MAC/ARP/Routing tables);
- ✅ panel de eventos;
- ✅ modo `step-by-step` (Play/Pause/Step/Reset);
- ⏳ CLI de dispositivo como proyeccion del estado (pendiente).

Salida:

- ✅ ya no dependes del menu `inquirer` para editar y observar labs.

### Fase 5. Activity engine y control plane ⏳ PENDIENTE

Objetivo:
cerrar el ciclo autoria -> simulacion -> evaluacion.

Entregables:

- `packages/validator`;
- `packages/activity-engine`;
- DSL de objetivos y checks;
- API de control para cargar labs, correr simulacion y consultar observaciones.

Salida:

- un lab puede evaluarse usando runtime interno y no solo deploy externo.

### Fase 6. Adapters avanzados ⏳ PENDIENTE

Objetivo:
volver a conectar el ecosistema Packet Tracer y las capacidades legacy sin contaminar el core.

Entregables:

- `import-pka` y `export-pka` robustos;
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

| Criterio | Estado |
|----------|--------|
| el simulador corre sin depender de Packet Tracer | ✅ Cumplido |
| la misma semilla produce el mismo resultado | ✅ Cumplido (LCG determinista) |
| la TUI observa estado vivo y no solo YAML | ✅ Cumplido |
| `.pka` puede romperse sin romper el core | ✅ Cumplido (adapter separado) |
| la validacion usa evidencia del runtime interno | ⏳ Pendiente (Fase 5) |
| CLI, API y TUI comparten contratos del mismo nucleo | ✅ Cumplido |

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
