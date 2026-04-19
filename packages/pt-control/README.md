# pt-control

**pt-control** es el **orchestration brain** del proyecto cisco-auto. Es la CLI profesional para controlar Cisco Packet Tracer en tiempo real desde TypeScript/Bun. Este paquete reemplaza los flujos legacy basados en YAML y .pka para nuevos laboratorios y automatizaciones.

> **FRONTERA ARQUITECTURAL**: `pt-control` es el **orchestration brain** que contiene planners, workflows, diagnosis, verification, policies, y evidence evaluation. Consume primitives de `pt-runtime`. Ver `docs/architecture/runtime-control-boundary.md`.

---

## Arquitectura (Fase 7)

```
┌─────────────────────────────────────────────────────────────┐
│ pt-control                                                │
├─────────────────────────────────────────────────────────────┤
│ [Orchestrator]                                            │
│   - Command routing                                       │
│   - Workflow execution                                   │
│   - Error handling                                       │
├─────────────────────────────────────────────────────────────┤
│ [Planners]                                               │
│   - device-add planner                                   │
│   - link-add planner                                     │
│   - config planner                                      │
│   - lab validation planner                              │
├─────────────────────────────────────────────────────────────┤
│ [Workflows]                                               │
│   - workflow:device-add                                  │
│   - workflow:link-add                                   │
│   - workflow:vlan-config                               │
│   - workflow:dhcp-config                               │
├─────────────────────────────────────────────────────────────┤
│ [Verification]                                           │
│   - Topology verification                                │
│   - Config verification                                │
│   - Connectivity verification                          │
├─────────────────────────────────────────────────────────────┤
│ [Diagnosis]                                              │
│   - Error diagnosis                                     │
│   - Failure analysis                                   │
│   - Root cause identification                          │
├──��──────────────────────────────────────────────────────────┤
│ [Fallback / Omni Harness]                                 │
│   - Omni fallback for failures                          │
│   - Retry logic                                        │
│   - Recovery strategies                               │
├─────────────────────────────────────────────────────────────┤
│ [Quality / Release]                                      │
│   - Quality gates                                     │
│   - Release validation                                │
│   - Baseline verification                            │
└─────────────────────────────────────────────────────────────┘
```

> Ver: `docs/refactor/operational-readiness-phase7.md`

---

## 🚀 Comandos Principales

### VLAN

```bash
bun run pt vlan apply <SWITCH> <VLAN_ID>...
```
- Aplica múltiples VLANs a un switch Cisco en tiempo real.
- Ejemplo: `bun run pt vlan apply Switch1 10 20 30`

### Trunk

```bash
bun run pt trunk apply <SWITCH> <PORT>...
```
- Configura puertos trunk en switches Cisco.
- Ejemplo: `bun run pt trunk apply Switch1 GigabitEthernet0/1 GigabitEthernet0/2`

### SSH

```bash
bun run pt ssh setup <ROUTER> [--domain <DOMAIN>] [--user <USER>] [--pass <PASS>]
```
- Configura SSHv2 en routers Cisco automáticamente.
- Ejemplo: `bun run pt ssh setup Router1 --domain cisco-lab.local --user admin --pass admin`

### Script de Topología (Automatización Completa)

El script `topologia-apply.ts` descubre dispositivos automáticamente y aplica configuración de forma dinámica.

#### Opción 1: Archivo de configuración

```bash
# Crear tu archivo de configuración (basado en el ejemplo)
cp topology-config.example.json topology-config.json

# Editar según tu topología
nano topology-config.json

# Aplicar configuración
bun run scripts/topologia-apply.ts --config topology-config.json
```

El archivo de configuración puede incluir `devices`, `links`, `vlans`, `trunkPorts`, `accessPorts`, `svis`, `dhcpPools` y `hostIpConfig` para levantar una topología completa sin hardcodearla en TypeScript.

#### Opción 2: Argumentos CLI rápidos

```bash
# Solo VLANs
bun run scripts/topologia-apply.ts --vlans 10,20,30

# VLANs + SSH
bun run scripts/topologia-apply.ts --vlans 10,20,30 --ssh-domain cisco.local

# Con credenciales SSH personalizadas
bun run scripts/topologia-apply.ts --vlans 10,20,30 --ssh-domain cisco.local --ssh-user admin --ssh-pass secret
```

#### Opción 3: Solo descubrimiento

```bash
# Sin configuración, solo lista dispositivos detectados
bun run scripts/topologia-apply.ts
```

#### Flags adicionales

- `--dry-run`: Simula sin aplicar cambios
- `--verbose`: Muestra detalles de debugging

**Ejemplo completo:**

```bash
bun run scripts/topologia-apply.ts --config topology-config.json --dry-run --verbose
```

---

## 🏁 Flujo Recomendado

1. Instala y configura el módulo de scripting en Packet Tracer (ver [Guía de Inicio Rápido](./docs/quickstart.md)).
2. Usa los comandos `pt vlan apply`, `pt trunk apply`, `pt ssh setup` para configurar dispositivos individuales.
3. Para automatización total:
   - Copia `topology-config.example.json` → `topology-config.json`
   - Edita según tu topología
   - Ejecuta: `bun run scripts/topologia-apply.ts --config topology-config.json`
4. Evita YAML/.pka para nuevos laboratorios: usa la CLI y scripts dinámicos.

---

## Fase 7 - Consolidación

Ver referencia en README raíz del proyecto: `docs/refactor/future-change-rules-phase7.md`

### Quality Gates Disponibles

```bash
# Regression smoke
bun run pt omni regression-smoke

# Terminal core
bun run pt omni terminal-core

# Device basic
bun run pt omni device-basic

# Link basic
bun run pt omni link-basic

# Workflow basic
bun run pt omni workflow-basic

# Omni safe
bun run pt omni omni-safe
```

### Comandos Oficiales

| Comando | Descripción |
|---------|-------------|
| `bun run pt status` | Ver status general |
| `bun run pt omni regression-smoke` | Smoke test |
| `bun run pt device add <model> <name>` | Agregar dispositivo |
| `bun run pt link add <d1> <p1> <d2> <p2>` | Conectar |
| `bun run pt exec <dev> <cmd>` | Ejecutar comando IOS |
| `bun run pt canvas clear` | Limpiar topología |
| `bun run pt omni raw "<code>"` | Raw execution |
| `bun run pt omni genome <device>` | Genome |

> Ver: `docs/refactor/operational-readiness-phase7.md`

---

## ℹ️ Notas

- El soporte para YAML y .pka es solo para migraciones puntuales. Para nuevos flujos, usa pt-control y scripts.
- Todos los comandos pueden ejecutarse desde cualquier terminal compatible con Bun.
- Consulta la [guía rápida](./docs/quickstart.md) para instalación y troubleshooting.

---

## 📄 Licencia

MIT
