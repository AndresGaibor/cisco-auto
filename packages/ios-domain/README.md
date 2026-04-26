# @cisco-auto/ios-domain

Paquete especializado en el dominio de Cisco IOS. Se encarga de la generación de comandos, el parsing de outputs de consola y la validación de configuraciones específicas de IOS.

## Responsabilidades

- Generar bloques de comandos IOS.
- Parsear outputs de comandos `show`.
- Validar operaciones IOS.
- Resolver capabilities por modelo/plataforma.
- Mantener lógica IOS pura sin dependencias de infraestructura.

## Consumidores principales

- `@cisco-auto/pt-control`
- `@cisco-auto/kernel`
- `apps/pt-cli`, solo indirectamente mediante `pt-control`

## No debe depender de

```
@cisco-auto/kernel
@cisco-auto/pt-control
@cisco-auto/pt-runtime
@cisco-auto/pt-memory
bun:sqlite
node:fs
```

## Ejemplo

```ts
import { planConfigureVlan } from "@cisco-auto/ios-domain/operations";
import { resolveCapabilitySet } from "@cisco-auto/ios-domain/capabilities";
import { VlanId } from "@cisco-auto/ios-primitives/value-objects";

const caps = resolveCapabilitySet("2960");
const plan = planConfigureVlan(caps, {
  vlan: VlanId.from(10),
  name: "USERS",
});
```

Para más información, consulta la documentación global del proyecto en `docs/README.md`.