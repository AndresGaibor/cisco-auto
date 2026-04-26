# 📚 Centro de Documentación — cisco-auto

Bienvenido al centro de documentación del proyecto **cisco-auto**. Este repositorio está organizado como un monorepo, y la documentación sigue una estructura jerárquica: guías generales aquí en `docs/` y detalles técnicos dentro de cada paquete en `packages/*/docs/`.

## 🌐 Documentación General

| Documento | Descripción |
|-----------|-------------|
| [**Arquitectura**](./ARCHITECTURE.md) | Visión general del sistema, patrones (Hexagonal, DDD) y estructura del monorepo. |
| [**Instalación**](./INSTALL.md) | Requisitos previos (Bun v1.1+) y pasos para configurar el entorno de desarrollo. |
| [**Guía de Migración**](./MIGRATION_GUIDE.md) | Instrucciones para migrar de versiones anteriores o despliegues manuales. |
| [**Estrategia de Pruebas**](./architecture/TESTING_STRATEGY.md) | Cómo probamos el sistema, desde unit tests hasta validación real en Packet Tracer. |
| [**Troubleshooting**](./TROUBLESHOOTING.md) | Soluciones a problemas comunes de conexión, permisos y ejecución. |
| [**Compatibilidad**](./COMPATIBILITY.md) | Matriz de versiones soportadas de Cisco Packet Tracer y sistemas operativos. |
| [**Lecciones Aprendidas**](./LESSONS_LEARNED.md) | Conocimiento acumulado durante el desarrollo sobre el motor QtScript de PT. |

## 📦 Documentación por Paquetes

Cada paquete contiene su propia documentación técnica específica para su dominio:

### [**@cisco-auto/kernel**](../packages/kernel/docs/)
El núcleo del sistema. Contiene el dominio puro, lógica de negocio, puertos de aplicación y el sistema de plugins de protocolos (VLAN, OSPF, etc.).
- [Hardening de Seguridad](../packages/kernel/docs/security-hardening.md)

### [**@cisco-auto/pt-control**](../packages/pt-control/docs/)
Motor de control en tiempo real. Gestiona el estado de la topología y la orquestación de comandos hacia Packet Tracer.
- [Guía de Inicio Rápido](../packages/pt-control/docs/quickstart.md)
- [Arquitectura de Control](../packages/pt-control/docs/architecture.md)
- [Modelos de Datos](../packages/pt-control/docs/models.md)

### [**@cisco-auto/pt-runtime**](../packages/pt-runtime/docs/)
El entorno de ejecución que vive dentro de Packet Tracer. Genera código JS compatible con QtScript.
- [Arquitectura del Runtime](../packages/pt-runtime/docs/architecture.md)
- [Exploración de la API de PT](../packages/pt-runtime/docs/api-exploration/)
- [Modelo de Evaluación (Assessment)](../packages/pt-runtime/docs/assessment-model.md)

### [**@cisco-auto/file-bridge**](../packages/file-bridge/docs/)
El puente de comunicación basado en sistema de archivos (IPC).
- [Gestión de Archivos Reales](../packages/file-bridge/docs/real-files.md)
- [Guía del Runtime Bridge](../packages/file-bridge/docs/runtime-complete-guide.md)

### [**@cisco-auto/types**](../packages/types/)
Tipos y schemas compartidos.

### [**@cisco-auto/ios-domain**](../packages/ios-domain/)
Dominio IOS puro: parsers, builders, capabilities y operaciones IOS.

### [**@cisco-auto/ios-primitives**](../packages/ios-primitives/)
Value objects IOS compartidos, si la Fase 2 fue aplicada.

### [**@cisco-auto/pt-control**](../packages/pt-control/docs/)
Motor de control en tiempo real. Gestiona orquestación, servicios, casos de uso y adapters hacia Packet Tracer.
- [Guía de Inicio Rápido](../packages/pt-control/docs/quickstart.md)
- [Arquitectura de Control](../packages/pt-control/docs/architecture.md)
- [Modelos de Datos](../packages/pt-control/docs/models.md)

### [**@cisco-auto/pt-runtime**](../packages/pt-runtime/docs/)
Runtime JavaScript PT-safe que vive dentro de Packet Tracer.
- [Arquitectura del Runtime](../packages/pt-runtime/docs/architecture.md)
- [Exploración de la API de PT](../packages/pt-runtime/docs/api-exploration/)
- [Modelo de Evaluación](../packages/pt-runtime/docs/assessment-model.md)

### [**@cisco-auto/file-bridge**](../packages/file-bridge/docs/)
Puente de comunicación basado en filesystem.
- [Gestión de Archivos Reales](../packages/file-bridge/docs/real-files.md)
- [Guía del Runtime Bridge](../packages/file-bridge/docs/runtime-complete-guide.md)

### [**@cisco-auto/network-intent**](../packages/network-intent/)
Intenciones declarativas de red y escenarios.

### [**@cisco-auto/terminal-contracts**](../packages/terminal-contracts/)
Contratos puros para interacción con terminales.

---

## 🛠 Recursos para Desarrolladores
- [**CLI Agent Skill**](./CLI_AGENT_SKILL.md): Guía para asistentes de IA sobre cómo usar la CLI del proyecto.
- [**PRD de Capacidades**](./PT_CAPABILITIES_PRD.md): Documento de requerimientos de producto.
- [**Arquitectura de Plugins**](./architecture/PLUGIN_SYSTEM.md): Cómo extender el sistema con nuevos protocolos.
