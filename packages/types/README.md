# @cisco-auto/types

Single Source of Truth (SSoT) para definiciones de tipos TypeScript y esquemas de validación Zod en todo el proyecto **cisco-auto**.

## 📋 Contenido

- **Network Types**: Definiciones para Dispositivos, Puertos, Cables y Topologías.
- **Protocol Schemas**: Esquemas Zod para validar configuraciones de VLAN, OSPF, SSH, etc.
- **FileBridge Types**: Tipos del protocolo de comunicación basado en filesystem.
- **PT Control Types**: Tipos para el motor de control en tiempo real (TopologySnapshot, DeviceState).

## 🚀 Uso

Este paquete es una dependencia fundamental para casi todos los demás paquetes del monorepo.

```typescript
import { Device, Topology } from '@cisco-auto/types';
import { deviceSchema } from '@cisco-auto/types/schemas';
```

## 🏗 Estructura de archivos

- `src/domain/`: Tipos puros del dominio de red.
- `src/schemas/`: Esquemas Zod para validación en runtime.
- `src/pt-control/`: Tipos específicos para la orquestación de Packet Tracer.

---
Para más información, consulta la [documentación global del proyecto](../../docs/README.md).
