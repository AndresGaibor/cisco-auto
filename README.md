# cisco-auto / PT Control

CLI y runtime para controlar Cisco Packet Tracer desde Bun/TypeScript.

Este repo permite crear, inspeccionar, cablear, configurar y validar laboratorios de Packet Tracer usando una CLI llamada `pt`. El objetivo principal es que un humano o un agente de IA pueda operar Packet Tracer con evidencia reproducible: comandos, JSON, logs, timings y diagnósticos.

> Estado actual: el flujo principal es `bun run pt`. Los flujos legacy basados en YAML/lab antiguo no son la superficie pública recomendada.

---

## Qué puedes hacer

Con `pt` puedes:

- Diagnosticar si Packet Tracer, el bridge y el runtime están listos.
- Generar y desplegar `main.js`, `runtime.js`, `catalog.js` y `manifest.json`.
- Listar, crear, mover y eliminar dispositivos en Packet Tracer.
- Crear, listar, sugerir y remover enlaces físicos.
- Ejecutar comandos IOS y comandos de PC/Server desde terminal, con lectura explícita `pt cmd read` para IOS.
- Configurar propiedades que normalmente son de UI/API, como IP/DHCP de hosts.
- Validar conectividad, VLANs, routing, servicios y protocolos.
- Inspeccionar logs, eventos y resultados del bridge.
- Usar `omni` para inspección avanzada del motor interno de Packet Tracer cuando la CLI normal no alcance.

---

## Requisitos

- Bun.
- Cisco Packet Tracer instalado.
- Acceso a la función de scripting de Packet Tracer.
- Un directorio de desarrollo compartido entre la CLI y Packet Tracer:
  - macOS/Linux: `~/pt-dev`
  - Windows: `%USERPROFILE%\pt-dev`
  - Personalizado: variable `PT_DEV_DIR`

Cisco distribuye Packet Tracer desde NetAcad Resource Hub. Está disponible para Windows, Linux y macOS. No está disponible para móviles.

---

## Instalación rápida

```bash
git clone https://github.com/AndresGaibor/cisco-auto.git
cd cisco-auto

bun install
bun run pt --help

Verifica que la CLI responda:

bun run pt doctor
Setup de Packet Tracer
1. Crear el directorio de bridge

macOS/Linux:

mkdir -p ~/pt-dev

Windows PowerShell:

mkdir $env:USERPROFILE\pt-dev

Ruta personalizada:

export PT_DEV_DIR=/ruta/absoluta/pt-dev
2. Generar los artefactos para Packet Tracer
bun run pt build
```

Este comando genera/despliega los artefactos que Packet Tracer necesita:

| Archivo | Rol |
|---------|-----|
| main.js | Kernel mínimo: lifecycle, polling, jobs, heartbeat, hot-reload |
| runtime.js | Runtime de handlers, validación, dispatch y planes |
| catalog.js | Constantes/catálogos para dispositivos, cables y módulos |
| manifest.json | Metadata del build/runtime |

### 3. Cargar main.js en Packet Tracer

En Packet Tracer:

`Extensions / Scripting / Open`

o la opción equivalente de scripting según tu versión.

Carga:

`~/pt-dev/main.js`

En Windows:

`%USERPROFILE%\pt-dev\main.js`

Después de cargar main.js, normalmente los cambios en runtime.js se actualizan por hot-reload. Si main.js cambia, Packet Tracer puede requerir recargar el script.

### 4. Validar bridge/runtime
```bash
bun run pt doctor
bun run pt runtime status --json
```

Si algo falla, revisa:

```bash
bun run pt logs
bun run pt runtime logs
```

---

## Quickstart real
```bash
# Diagnóstico inicial
bun run pt doctor

# Construir/deploy runtime para Packet Tracer
bun run pt build

# Listar dispositivos existentes
bun run pt device list --json

# Crear dispositivos
bun run pt device add R1 2911
bun run pt device add SW1 2960-24TT

# Ver puertos de un dispositivo
bun run pt device ports R1 --json
bun run pt device ports SW1 --json

# Sugerir un enlace físico
bun run pt link suggest R1 SW1 --json

# Crear un enlace
bun run pt link add R1 GigabitEthernet0/0 SW1 FastEthernet0/1

# Ejecutar IOS
bun run pt cmd R1 "show version"
bun run pt cmd R1 "show ip interface brief" --json

# Ejecutar configuración IOS multilínea
bun run pt cmd R1 "configure terminal" "interface g0/0" "no shutdown"

# Ejecutar comando en PC/Server
bun run pt cmd PC1 "ipconfig"

# Configurar host por API/UI cuando aplique
bun run pt set host PC1 ip 192.168.1.10 255.255.255.0 192.168.1.1
bun run pt set host PC1 dhcp

# Validar conectividad
bun run pt verify ping PC1 192.168.1.1
```

---

## CLI pública actual

La CLI pública actual está organizada así:

`pt <comando> [subcomando] [args] [flags]`

### Base
```bash
bun run pt build
bun run pt doctor
bun run pt completion fish
bun run pt completion zsh
bun run pt completion bash
```

### Topología
```bash
bun run pt device --help
bun run pt device list --json
bun run pt device add R1 2911
bun run pt device remove R1
bun run pt device move R1 --x 300 --y 200
bun run pt device ports R1 --json
bun run pt device module catalog --json

bun run pt link --help
bun run pt link list --json
bun run pt link suggest PC1 SW1 --json
bun run pt link add PC1 FastEthernet0 SW1 FastEthernet0/1
bun run pt link remove PC1 FastEthernet0
```

### Terminal universal
```bash
bun run pt cmd R1 "show version"
bun run pt cmd R1 "show running-config" --json
bun run pt cmd SW1 "show interfaces" --complete --json
bun run pt cmd PC1 "ipconfig"
bun run pt cmd PC1 "ping 192.168.1.1"
bun run pt cmd read R1 "show running-config"
bun run pt cmd read SW1 "show ip route"
```

`pt cmd` es el camino principal para IOS, switches, routers, PCs y servers. La CLI detecta configuración multilínea cuando corresponde.
Usa `pt cmd read` cuando sólo quieres lectura IOS y no quieres depender de preámbulos de paginador.
El orden correcto es `pt cmd read <device> "show ..."`; `pt cmd R1 read` no es una sintaxis válida.

### Limitaciones conocidas

- En algunos labs, la parte de CME/telefonía IP (`telephony-service`, `ephone`, `show ephone`) puede bloquear `pt cmd` con `IOS_EXEC_FAILED` o timeout.
- Si eso pasa, no sigas probando la misma secuencia por CLI: confirma el proyecto activo con `pt project status --json`, deja la config de datos/voz ya aplicada y termina la parte telefónica desde la GUI de Packet Tracer.
- Cuando documentes o depures VoIP, anota claramente si la validación quedó pendiente de GUI para que el siguiente agente no repita el intento.

### Configuración API/GUI
```bash
bun run pt set --help
bun run pt set host PC1 ip 192.168.1.10 255.255.255.0 192.168.1.1
bun run pt set host PC1 dhcp
```

Usa `set` para cosas que normalmente Packet Tracer expone por UI/API y que no siempre son terminal IOS.

### Validación
```bash
bun run pt verify --help
bun run pt verify ping PC1 192.168.1.1
bun run pt verify vlan SW1 10
```

No declares un laboratorio como correcto solo porque una mutación respondió ok:true. Valida con verify, ping, show, logs o JSON.

### Runtime y logs
```bash
bun run pt runtime --help
bun run pt runtime status --json
bun run pt runtime logs
bun run pt logs
```

### Omni
```bash
bun run pt omni --help
bun run pt omni list
bun run pt omni show <capability>
bun run pt omni run <capability>
bun run pt omni raw --dry-run "<script>"
```

`omni` es para inspección avanzada o forense del motor interno de Packet Tracer. Usa `omni raw` solo cuando la CLI normal no alcance y con evidencia clara.

---

## Arquitectura del repo

```
cisco-auto/
├── apps/
│   └── pt-cli/              # CLI pública: bun run pt
├── packages/
│   ├── pt-control/          # Orquestación, servicios, planners, doctor, verification
│   ├── pt-runtime/          # Runtime PT-safe, kernel, handlers, terminal engine
│   ├── file-bridge/         # IPC por filesystem entre CLI y Packet Tracer
│   ├── terminal-contracts/  # Contratos de terminal/planes
│   ├── ios-domain/          # Parsers/builders IOS puros
│   ├── ios-primitives/      # Value objects y primitives IOS
│   ├── types/               # Tipos compartidos
│   └── kernel/              # Núcleo/plugin system legacy o experimental
├── docs/                    # Documentación técnica
└── tests/                   # Tests transversales
```

### Responsabilidades

| Paquete | Responsabilidad |
|---------|-----------------|
| apps/pt-cli | UX de comandos, parsing de flags, salida humana/JSON |
| packages/pt-control | Cerebro de control: workflows, servicios, doctor, verificación |
| packages/pt-runtime | Código que corre o se genera para Packet Tracer |
| packages/file-bridge | Comunicación por archivos, colas, resultados, logs |
| packages/terminal-contracts | Contratos compartidos para planes terminales |
| packages/ios-domain | Lógica IOS pura, testeable sin Packet Tracer |
| packages/ios-primitives | Value objects y helpers IOS puros |

### Regla importante:

- `pt-runtime` no debe contener workflows altos de VLAN/DHCP/routing.
- `pt-control` orquesta.
- `pt-cli` presenta la UX.

---

## Cómo funciona el bridge

El flujo general es:

```
CLI
  ↓
pt-control
  ↓
file-bridge
  ↓
~/pt-dev/commands, in-flight, results, logs
  ↓
main.js en Packet Tracer
  ↓
runtime.js / handlers
  ↓
Packet Tracer
```

El filesystem permite auditar lo que ocurrió aunque Packet Tracer se cierre o el runtime tarde en responder.

---

## Desarrollo

### Comandos principales
```bash
bun install
bun run pt build
bun run pt doctor
```

### Ejecución de Tests

Para evitar tiempos de espera largos, se recomienda usar los scripts focalizados o testear archivos específicos en lugar de ejecutar `bun test` en la raíz.

```bash
# Tests por área
bun run test:cli     # Solo tests del CLI
bun run test:control # Solo tests de la capa de control
bun run test:runtime # Solo tests del runtime
bun run test:ios     # Solo tests de IOS/parsers

# Validaciones específicas
bun test apps/pt-cli/src/__tests__/ux/help.test.ts
bun test tests/architecture/check-architecture-boundaries.test.ts
bun test packages/pt-runtime/tests/main-runtime-boundary.test.ts
bun test packages/pt-control/src/application/services/terminal-command-service.plan-run.test.ts
```

### Reglas de runtime PT-safe

El código que termina dentro de `main.js` o `runtime.js` debe ser compatible con el motor QTScript/ES5 de Packet Tracer. Evita en código generado:

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

Modifica TypeScript fuente, no los artefactos generados en `~/pt-dev`.

---

## Troubleshooting rápido

### `pt doctor` dice que el bridge no está listo

Revisa:

```bash
bun run pt build
bun run pt runtime status --json
bun run pt logs
```

Asegúrate de que Packet Tracer esté abierto y de que `main.js` esté cargado.

### Cambié código y Packet Tracer no lo toma

Ejecuta:

```bash
bun run pt build
```

Si el output dice que `main.js` cambió, recarga `main.js` en Packet Tracer. Si solo cambió `runtime.js`, normalmente el hot-reload debería bastar.

### `pt cmd` no devuelve output completo

Usa JSON para ver evidencia:

```bash
bun run pt cmd SW1 "show interfaces" --complete --json
```

Revisa campos como `evidence`, `timings`, `completeInterfaces`, `retryCount`, `failed` y `logs`.

### Un comando respondió ok:true, pero el lab no funciona

Valida con comandos observables:

```bash
bun run pt verify ping PC1 192.168.1.1
bun run pt cmd SW1 "show vlan brief" --json
bun run pt cmd R1 "show ip route" --json
```

---

## Para agentes de IA

Antes de tocar el repo:

1. Lee `AGENTS.md`.
2. Lee el `AGENTS.md` del paquete que vas a modificar.
3. Inspecciona archivos reales antes de proponer cambios.
4. No asumas comandos: ejecuta `bun run pt --help` y `bun run pt <cmd> --help`.
5. No edites artefactos generados en `~/pt-dev`.
6. Si una tarea toca Packet Tracer real, pide evidencia o valida con `pt doctor`, `pt runtime status`, `pt device list`, `pt cmd`, `pt verify` y logs.
7. Cambios grandes deben dividirse en fases pequeñas con tests focalizados.

---

## Documentación relacionada

- `AGENTS.md`: reglas para agentes IA.
- `CLAUDE.md`: contexto corto para Claude Code.
- `GEMINI.md`: contexto corto para Gemini CLI.
- `docs/CLI_AGENT_SKILL.md`: guía para operar talleres con la CLI.
- `packages/pt-control/README.md`: detalles de pt-control.
- `packages/pt-runtime/README.md`: detalles del runtime generado para Packet Tracer.

---

## Licencia

MIT.
