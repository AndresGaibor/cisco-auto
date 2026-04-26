# Arquitectura General — cisco-auto

## ¿Qué es este proyecto?

`cisco-auto` es un toolkit Bun-first para controlar Cisco Packet Tracer, automatizar laboratorios, ejecutar comandos IOS/Command Prompt y validar resultados reales mediante un puente de archivos.

El objetivo principal es permitir que la CLI controle Packet Tracer de forma reproducible, observable y verificable.

## Estado actual del monorepo

```
cisco-auto/
├── apps/
│   └── pt-cli/                 # CLI principal
│
├── packages/
│   ├── file-bridge/            # IPC por filesystem CLI ↔ Packet Tracer
│   ├── ios-domain/             # Dominio IOS puro: parsers, builders, operations
│   ├── ios-primitives/         # Value objects IOS compartidos (si Fase 2 fue aplicada)
│   ├── kernel/                 # Casos de uso/core abstractions/plugins/backend interfaces
│   ├── network-intent/         # Intenciones declarativas de red
│   ├── pt-control/             # Orquestación Packet Tracer desde Bun/CLI
│   ├── pt-memory/              # Persistencia SQLite (si Fase 3 fue aplicada)
│   ├── pt-runtime/             # Runtime JavaScript PT-safe para Packet Tracer
│   ├── terminal-contracts/     # Contratos puros de terminal
│   └── types/                  # Tipos y schemas compartidos
│
├── docs/                       # Documentación activa
├── docs/archive/               # Documentación histórica/legacy
├── labs/                       # Laboratorios de ejemplo
├── configs/                    # Configuración auxiliar
└── scripts/                   # Scripts operativos
```

> Nota: `@cisco-auto/core` / `packages/core` no existe como workspace activo. Cualquier referencia histórica debe vivir en `docs/archive/legacy-core/`.

## Capas principales

### `@cisco-auto/types`

Contratos compartidos y schemas. No debe contener lógica de runtime ni IO.

### `@cisco-auto/ios-primitives`

Value objects IOS reutilizables, por ejemplo VLAN, IP, máscara e interfaces.

Regla:

```
ios-domain -> ios-primitives
kernel     -> ios-primitives
pt-control -> ios-primitives
```

### `@cisco-auto/ios-domain`

Dominio IOS puro:

* parsers de comandos `show`
* builders de configuración IOS
* operations IOS
* capabilities por modelo

No debe depender de:

```
@cisco-auto/kernel
@cisco-auto/pt-control
@cisco-auto/pt-runtime
@cisco-auto/pt-memory
bun:sqlite
node:fs
```

### `@cisco-auto/pt-memory`

Persistencia SQLite para auditoría, historial, preferencias y topología.

No pertenece a `ios-domain`.

### `@cisco-auto/file-bridge`

IPC por filesystem:

* comandos
* resultados
* lease
* heartbeat
* crash recovery
* queue/dead-letter

No debe contener lógica IOS ni lógica de escenarios.

### `@cisco-auto/pt-runtime`

Código TypeScript que se transforma a JavaScript compatible con Packet Tracer/QtScript.

Responsabilidades:

* handlers PT-safe
* dispatcher runtime
* terminal engine
* acceso bajo a API Packet Tracer

Regla:

```
runtime estable != omni/experimental
```

Los handlers `omni`, `evaluate`, `siphon`, `exfiltrate`, etc. deben estar detrás de opt-in explícito.

### `@cisco-auto/pt-control`

Orquestación desde Bun:

* `PTController`
* servicios de aplicación
* adapters hacia runtime/file-bridge
* casos de uso de CLI
* verificación y diagnóstico

La API pública debe entrar por subpaths:

```ts
import { createDefaultPTController } from "@cisco-auto/pt-control/controller";
import { executeVlanApply } from "@cisco-auto/pt-control/application/vlan";
```

Evitar usar el root como god barrel.

### `apps/pt-cli`

CLI delgada:

* parsea argumentos
* pide confirmación o datos interactivos
* llama casos de uso
* renderiza resultados

No debe contener lógica profunda de dominio, parsing de logs, builders IOS ni lectura directa de internals de otros paquetes.

## Flujo de ejecución Packet Tracer

```
pt-cli
  -> pt-control
  -> file-bridge
  -> main.js dentro de Packet Tracer
  -> runtime.js dentro de Packet Tracer
  -> API Packet Tracer
  -> result.json
  -> pt-cli renderiza/verifica
```

## Reglas de arquitectura

| Capa             | Puede depender de         | No puede depender de                                      |
| ---------------- | ------------------------- | --------------------------------------------------------- |
| `ios-primitives` | nada de negocio           | `kernel`, `pt-control`, `pt-runtime`, `apps`              |
| `ios-domain`     | `ios-primitives`, `types` | `kernel`, `pt-control`, `pt-runtime`, `pt-memory`, SQLite |
| `pt-memory`      | `ios-domain`             | `pt-control`, `pt-runtime`, `apps`                        |
| `pt-runtime`     | contratos PT-safe         | Node APIs en runtime estable                              |
| `pt-control`     | paquetes inferiores       | `apps/pt-cli`                                             |
| `apps/pt-cli`    | APIs públicas de paquetes | `src/` internos de paquetes                               |

## Validaciones

```bash
bun run architecture:check
bun run typecheck
bun test
```