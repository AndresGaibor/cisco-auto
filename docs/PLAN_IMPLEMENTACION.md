# Plan Maestro de Implementación: cisco-auto

> Roadmap para convertir `cisco-auto` de "herramienta prometedora" a "plataforma seria de automatización de Packet Tracer".

## Resumen Ejecutivo

### Estado Actual
- **3 sistemas de tipos independientes** (Zod schemas, Domain entities, PKA models)
- **2 formatos de conexión incompatibles** (fromInterface/fromPort)
- **Serialización con pérdida de datos** (VLANs, routing, ACLs, NAT se pierden al guardar)
- **Catálogo de dispositivos incompleto** (11 tipos vs 50+ de Packet Tracer)
- **Deploy no implementado** (solo dry-run)

### Objetivo
Unificar la arquitectura, expandir el catálogo de dispositivos, y completar las funcionalidades críticas para automatización real de laboratorios Packet Tracer.

---

## Fases de Implementación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 0: Fundamentos (2-3 semanas)                                          │
│  └── Unificación de modelos, corrección de bugs críticos                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 1: Catálogo de Dispositivos (2-3 semanas)                             │
│  └── Expansión de tipos, modelos concretos, capacidades                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 2: Protocolos Avanzados (3-4 semanas)                                 │
│  └── STP, EtherChannel, BGP, RIP, servicios (DHCP, DNS)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 3: Motor de Despliegue (2-3 semanas)                                  │
│  └── SSH/Telnet real, validación, paralelismo                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 4: PKA/PKT Completo (3-4 semanas)                                     │
│  └── Import/export lossless, Activity Wizard, evaluación                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 5: Valor Agregado (2-3 semanas)                                       │
│  └── Simulación básica, templates, colaboración                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Documentos de Plan Detallado

| Documento | Descripción |
|-----------|-------------|
| [FASE-0-FUNDAMENTOS.md](./FASE-0-FUNDAMENTOS.md) | Unificación de modelos y bugs críticos |
| [FASE-1-CATALOGO.md](./FASE-1-CATALOGO.md) | Catálogo de dispositivos Packet Tracer |
| [FASE-2-PROTOCOLOS.md](./FASE-2-PROTOCOLOS.md) | Protocolos L2/L3 y servicios |
| [FASE-3-DEPLOYMENT.md](./FASE-3-DEPLOYMENT.md) | Motor de despliegue SSH/Telnet |
| [FASE-4-PKA-PKT.md](./FASE-4-PKA-PKT.md) | Import/export PKA/PKT completo |
| [FASE-5-VALOR-AGREGADO.md](./FASE-5-VALOR-AGREGADO.md) | Simulación, templates, colaboración |

---

## Priorización por Valor

### Crítico (bloquea todo lo demás)
1. Unificar modelo canónico de `Lab`
2. Corregir inconsistencia de conexiones (fromInterface vs fromPort)
3. Implementar serialización lossless
4. Crear adaptador Domain ↔ PKA Models

### Alto valor (80% del uso)
1. Expandir catálogo de dispositivos (laptop, hub, IP phone, firewall)
2. Implementar STP y EtherChannel
3. Implementar despliegue SSH real
4. Completar round-trip PKA → YAML → PKA

### Medio valor
1. BGP y RIP
2. Servicios DHCP, DNS en servidores
3. Validación real de conectividad
4. Templates de laboratorios

### Bajo valor (nice-to-have)
1. Modo físico (Intercity/City/Building)
2. IoT y Thing Editor
3. Multiuser
4. Simulation mode completo

---

## Arquitectura Objetivo

### Estado Actual (Fragmentado)

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   Zod Schemas    │   │  Domain Entities │   │   PKA Models     │
│  (core/types/)   │   │ (core/domain/)   │   │  (core/models/)  │
│                  │   │                  │   │                  │
│ - LabSchema      │   │ - Lab            │   │ - Network        │
│ - DeviceSchema   │   │ - Device         │   │ - Router         │
│ - ConnectionSch  │   │ - Connection     │   │ - Switch         │
│                  │   │                  │   │ - PC             │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │                      │                      │
         │   ❌ Sin adaptador   │   ❌ Sin adaptador   │
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CLI Commands                               │
│  (cada comando usa una capa diferente, inconsistente)           │
└─────────────────────────────────────────────────────────────────┘
```

### Estado Objetivo (Unificado)

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODELO CANÓNICO                               │
│                    (core/canonical/)                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  LabSpec                                                     ││
│  │  ├── Device[] (con DeviceType ampliado)                     ││
│  │  ├── Connection[] (formato unificado)                       ││
│  │  ├── Service[]                                              ││
│  │  ├── Protocol[]                                             ││
│  │  ├── Assessment?                                            ││
│  │  └── Metadata                                               ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
         │
         │ Adaptadores (core/adapters/)
         │
    ┌────┴────┬──────────────┬──────────────┬──────────────┐
    ▼         ▼              ▼              ▼              ▼
┌────────┐ ┌────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  YAML  │ │  PKA   │  │   IOS    │  │   SSH    │  │   Web    │
│ Renderer│ │ Renderer│ │ Generator│  │ Executor │  │   API    │
└────────┘ └────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## Estructura de Directorios Objetivo

```
src/
├── core/
│   ├── canonical/                    # ← NUEVO: Modelo canónico único
│   │   ├── lab.spec.ts
│   │   ├── device.spec.ts
│   │   ├── connection.spec.ts
│   │   ├── service.spec.ts
│   │   ├── protocol.spec.ts
│   │   └── assessment.spec.ts
│   │
│   ├── catalog/                      # ← NUEVO: Catálogo de Packet Tracer
│   │   ├── device-catalog.ts
│   │   ├── models/
│   │   │   ├── routers/
│   │   │   ├── switches/
│   │   │   ├── end-devices/
│   │   │   └── wireless/
│   │   └── capabilities/
│   │
│   ├── adapters/                     # ← NUEVO: Adaptadores bidireccionales
│   │   ├── yaml/
│   │   │   ├── yaml-to-canonical.ts
│   │   │   └── canonical-to-yaml.ts
│   │   ├── pka/
│   │   │   ├── pka-to-canonical.ts
│   │   │   └── canonical-to-pka.ts
│   │   └── ios/
│   │       └── canonical-to-ios.ts
│   │
│   ├── generators/                   # Generadores de configuración
│   │   ├── ios/
│   │   │   ├── base.generator.ts
│   │   │   ├── vlan.generator.ts
│   │   │   ├── routing.generator.ts
│   │   │   ├── security.generator.ts
│   │   │   ├── stp.generator.ts          # ← NUEVO
│   │   │   ├── etherchannel.generator.ts # ← NUEVO
│   │   │   └── services.generator.ts     # ← NUEVO
│   │   └── ios-xe/                       # ← NUEVO: IOS-XE support
│   │
│   ├── executor/                     # ← NUEVO: Motor de ejecución
│   │   ├── ssh.executor.ts
│   │   ├── telnet.executor.ts
│   │   ├── validation.executor.ts
│   │   └── batch.executor.ts
│   │
│   └── validation/                   # ← NUEVO: Validación unificada
│       ├── schema.validator.ts
│       ├── semantic.validator.ts
│       └── connectivity.validator.ts
│
├── cli/
│   └── commands/
│       └── ...
│
└── api/                              # ← NUEVO: API REST (opcional)
    └── routes/
```

---

## Métricas de Éxito

### Fase 0 ✅ COMPLETADO
- [x] 100% de tests pasando
- [x] Zero duplicación de tipos (CableType, DeviceType, LinkMedium)
- [x] Round-trip YAML → Canonical → YAML sin pérdida de datos
- [x] Todos los comandos CLI usan el modelo canónico

### Fase 1 ✅ COMPLETADO
- [x] Catálogo con 50+ dispositivos de Packet Tracer
- [x] 15+ modelos de routers específicos
- [x] 10+ modelos de switches específicos
- [x] Todos los end devices de Packet Tracer

### Fase 2 ✅ COMPLETADO
- [x] STP configuración generada correctamente
- [x] EtherChannel configuración generada correctamente
- [x] BGP/RIP configuración generada correctamente
- [x] Servicios DHCP/NTP configurables

### Fase 3 ✅ COMPLETADO
- [x] Deploy real a dispositivos Cisco via SSH
- [x] Validación de conectividad post-deploy
- [x] Orchestrator con despliegue paralelo
- [x] Topology-aware deployment ordering

### Fase 4 ✅ COMPLETADO
- [x] PKA decoder funcional (Twofish EAX)
- [x] PKA encoder implementado
- [x] Adaptador PKA ↔ LabSpec
- [x] Compatible con Packet Tracer 8.x

### Fase 5 ✅ COMPLETADO
- [x] Sistema de validación avanzado
- [x] Templates CCNA (5 plantillas)
- [x] Visualización de topología (ASCII/Mermaid)
- [x] API REST completa (19 endpoints)

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Cambios rompen compatibilidad YAML existente | Alta | Alto | Migración automática con versión |
| PKA encryption cambia en nuevas versiones | Media | Alto | Detectar versión y usar decoder apropiado |
| SSH library inestable | Baja | Medio | Usar node-ssh con reintentos |
| Catálogo muy grande para mantener | Media | Medio | Generar catálogo desde documentación PT |

---

## Dependencias Externas a Añadir

```json
{
  "dependencies": {
    "node-ssh": "^13.0.0",      // SSH client para deploy
    "telnet-client": "^2.0.0",  // Telnet client para legacy
    "ping": "^0.4.0",           // Validación de conectividad
    "p-retry": "^6.0.0",        // Reintentos con backoff
    "p-map": "^6.0.0"           // Procesamiento paralelo
  },
  "devDependencies": {
    "@types/node-ssh": "^...",
    "msw": "^2.0.0"             // Mock SSH para tests
  }
}
```

---

## Comandos de Desarrollo

```bash
# Ejecutar tests
bun test

# Tests con coverage
bun test:coverage

# Build
bun run build

# Lint
bun run lint

# Ver estructura
bun run tree

# Generar catálogo desde PKA files
bun run catalog:generate
```

---

## Próximos Pasos Inmediatos

1. **Crear rama de desarrollo**: `git checkout -b feature/canonical-model`
2. **Leer FASE-0-FUNDAMENTOS.md** para tareas específicas
3. **Implementar modelo canónico** en `src/core/canonical/`
4. **Migrar un comando** (empezar con `validate`) para validar el enfoque
5. **Escribir tests** de round-trip

---

## Referencias

- [AUDITORIA_COBERTURA.md](./AUDITORIA_COBERTURA.md) - Estado actual del proyecto
- [MAPA_PACKET_TRACER.md](./MAPA_PACKET_TRACER.md) - Catálogo completo de Packet Tracer
- [PRD.md](../PRD.md) - Requerimientos originales del producto
