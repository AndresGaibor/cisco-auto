# @cisco-auto/ios-domain

Paquete especializado en el dominio de Cisco IOS. Se encarga de la generación de comandos, el parsing de outputs de consola y la validación de configuraciones específicas de IOS.

## 📋 Responsabilidades

- **IOS Generation**: Transformar modelos de alto nivel en bloques de comandos CLI de IOS (`conf t`, etc.).
- **IOS Parsing**: Analizar el output de comandos `show` para extraer el estado real de los dispositivos.
- **Capability Matrix**: Definir qué comandos y funciones están disponibles según el modelo y versión de IOS.

## 🚀 Uso

Utilizado principalmente por `@cisco-auto/pt-control` y `@cisco-auto/core` para interactuar con la línea de comandos de los dispositivos.

```typescript
import { IosGenerator } from '@cisco-auto/ios-domain';
// ... generar configuración
```

---
Para más información, consulta la [documentación global del proyecto](../../docs/README.md).
