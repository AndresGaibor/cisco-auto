# Omni Harness - Fase 5

> Sistema oficial de capabilities, validación, soporte y regresión del proyecto cisco-auto.

## Propósito

`omni` es el harness oficial para:

- **Capability probing**: Descubrir capacidades reales del entorno PT actual
- **Verification**: Validar primitives, terminal plans, omni adapters/hacks y workflows
- **Support classification**: Clasificar soporte de capacidades empíricamente
- **Regression tracking**: Detectar cambios entre corridas, entornos y versiones

## Por qué existe

Packet Tracer ejecuta Script Modules dentro del proceso, con un Script Engine persistente y acceso IPC directo a objetos internos del simulador. Esto significa que:

1. **El comportamiento real debe medirse empíricamente** — no se puede asumir que una API funciona solo porque está documentada
2. **La evidencia es obligatoria** — sin evidencia hay auditing imposible
3. **El soporte varía por entorno** — una capability puede funcionar en un entorno y fallar en otro (versión PT, plataforma host, modelo de dispositivo)

Ver: [Script Modules](https://tutorials.ptnetacad.net/help/default/scriptModules.htm)

## Qué valida omni

Omni valida tres familias de capabilities:

### 1. Primitive Capabilities

Operaciones básicas del kernel/runtime:

- `device.add` — Agregar dispositivos
- `device.move` — Mover dispositivos
- `device.ports.list` — Listar puertos
- `link.add` — Crear enlaces
- `module.add` — Agregar módulos
- `host.dhcp.set` — Configurar DHCP en hosts
- `topology.snapshot` — Obtener snapshot

### 2. Terminal Capabilities

Sesiones IOC y flujo de terminal:

- Apertura de sesión
- TerminalPlan simple
- Paginación (`--More--`)
- Guard de modo (EXEC → privileged → config)
- Wizard break (comandos interactivos)

### 3. Hack/Omni Capabilities

Capabilities descubiertas vía evaluación directa:

- `omni.evaluate.raw` — Evaluar JS en el motor C++
- `omni.assessment.read` — Leer assessment items
- `omni.process.inspect` — Inspeccionar procesos
- `omni.globalscope.inspect` — Acceder a globals de PT
- `omni.environment.probe` — Sondear entorno

## Qué produce omni

Cada corrida de capability produce:

| Campo | Descripción |
|-------|------------|
| `runId` | ID único de la corrida |
| `capabilityId` | ID de la capability ejecutada |
| `timestamp` | Momento de ejecución |
| `environment` | Fingerprint del entorno |
| `ok` | Éxito o fracaso |
| `supportStatus` | Clasificación de soporte |
| `confidence` | Nivel de confianza (0-1) |
| `evidence` | Evidencia raw + normalizada |
| `warnings` | Advertencias detectadas |
| `cleanupStatus` | Resultado del cleanup |

## qué NO es omni

- **No es solo un "debugger"** — Es un sistema formal de validación
- **No es una CLI paralela** — Debe usar la arquitectura de ports/adapters
- **No es un bypass de pt-control** — Debe integrar con workflows
- **No es un lugar para lógica ad hoc** — Todo debe pasar por el modelo de capabilities

## Arquitectura de integración

Omni debe usar:

```
┌─────────────────────────────────────┐
│         CLI (omni commands)           │
└──────────────┬──────────────────────┘
              │
┌──────────────▼──────────────────────┐
│    Capability Registry / Runner     │
└──────────────┬──────────────────────┘
              │
     ┌─────────┼─────────┐
     │         │         │
┌────▼───┐ ┌──▼────┐ ┌──▼────────┐
│Primitive│ │Port  │ │  Hack    │
│  Port  │ │      │ │ Adapter  │
└────────┘ └──────┘ └──────────┘
     │         │         │
┌────▼────────▼────────▼───────────┐
│      pt-runtime (kernel)        │
└───────────────────────────────┘
```

## Workflows soportados

Omni también valida workflows completos:

- VLAN simple (crear → asignar puertos)
- Trunk simple (configurar trunk)
- Router-on-a-stick (subinterfaces)
- DHCP diagnóstico

## Reglas centrales

### Regla 1

Toda capacidad observable del proyecto debe poder representarse como una **capability**.

### Regla 2

Toda capability debe poder: describirse, ejecutarse, limpiarse, producir evidencia, clasificarse, registrarse.

### Regla 3

No se considera "soportado" algo que solo funcionó una vez.
Debe existir política explícita para repetición, flakiness, evidencia mínima y confianza.

### Regla 4

Los hacks no son caminos especiales sueltos.
Se convierten en capabilities de tipo `hack`, con riesgo y prerequisitos explícitos.

### Regla 5

Omni no debe saltarse la arquitectura nueva.
Debe usar: workflows de pt-control, ports/adapters hacia runtime, omni adapters de runtime.