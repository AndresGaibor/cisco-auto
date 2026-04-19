# @cisco-auto/kernel

El corazón del sistema **cisco-auto**. Este paquete encapsula la lógica de negocio pura, el dominio de red y los contratos de extensibilidad (plugins) del proyecto.

## 🏗 Arquitectura

El kernel sigue los principios de **Clean Architecture** y **Hexagonal Architecture**:

- **Dominio (`src/domain/`)**: Contiene las entidades, agregados y objetos de valor que representan conceptos de red (Dispositivo, Puerto, Topología, VLAN, etc.). Es código puro sin dependencias externas.
- **Aplicación (`src/application/`)**: Define los casos de uso (ej. `DeployLab`, `ConfigureDevice`) y los puertos (interfaces) para comunicación con el mundo exterior (Backends, Repositorios).
- **Plugin API (`src/plugin-api/`)**: Define el contrato para extender las capacidades del sistema. Cualquier protocolo (Routing, Switching) se implementa como un plugin que se registra en el kernel.
- **Backends (`src/backends/`)**: Implementaciones concretas de los puertos de salida. El backend principal es `packet-tracer`.

## 🔌 Sistema de Plugins

Toda la lógica específica de protocolos de red vive en plugins independientes:
- `vlan`: Gestión de dominios de broadcast.
- `routing`: OSPF, BGP, rutas estáticas.
- `security`: ACLs, SSH, port-security.
- `services`: DHCP, DNS, NAT.

## 🚀 Uso

El kernel no se ejecuta solo; es utilizado por `apps/pt-cli` o scripts de automatización para orquestar la lógica.

```typescript
import { Kernel } from '@cisco-auto/kernel';
// ... configuración y arranque
```

## 📚 Documentación Técnica

- [**Bounded Contexts**](./docs/bounded-contexts.md): Definición de los límites de dominio.
- [**Plugin System**](./docs/plugin-system.md): Guía para desarrollar nuevos plugins.
- [**Security Hardening**](./docs/security-hardening.md): Guía de configuraciones de seguridad base.

---
Para más información, consulta la [documentación global del proyecto](../../docs/README.md).
