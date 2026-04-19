# pt-runtime: refactorización con Ports + Registry

## Objetivo
Reducir `packages/pt-runtime/src/templates/runtime.ts` y `main-kernel.ts` a archivos de orquestación, separando responsabilidades en ports, core, handlers y templates para facilitar extensibilidad y mantenimiento.

## Contexto
`pt-runtime` hoy concentra demasiada lógica en templates grandes que concatenan JavaScript para Packet Tracer. El proyecto ya tiene handlers y templates modulares, pero no existe una capa estable de contratos que permita registrar nuevas capacidades sin tocar el core.

## Decisión de arquitectura
Se adopta una arquitectura de plugins con registry:

1. `ports/` define contratos puros.
2. `core/` implementa el registry, el dispatcher y el ensamblador del runtime.
3. `handlers/` contiene implementaciones concretas de cada dominio.
4. `templates/` conserva los generadores de string existentes, pero aislados y consumidos por el builder.

La compatibilidad exigida es de comportamiento equivalente. No se requiere preservar el output byte a byte.

Importante: el registry y el dispatcher viven en TypeScript para organizar y probar la generación del runtime. El runtime que se carga en Packet Tracer sigue siendo JavaScript generado a partir de templates.

## Alcance
Incluye:

- Crear ports para handlers, dispatcher y registry.
- Implementar `HandlerRegistry` y `RuntimeDispatcher`.
- Extraer handlers a clases que implementen `HandlerPort`.
- Reducir `runtime.ts` y `main-kernel.ts` a ensamblado del runtime.
- Mantener los templates existentes como piezas reutilizables.

No incluye:

- Cambios funcionales al comportamiento del runtime.
- Rediseño de `pt-control`, `core` o `pt-cli` en esta fase.
- Reescritura completa de todos los templates en un solo paso.

## Estructura objetivo

```text
packages/pt-runtime/src/
├── ports/
│   ├── handler.port.ts
│   ├── dispatcher.port.ts
│   ├── registry.port.ts
│   └── index.ts
├── core/
│   ├── registry.ts
│   ├── dispatcher.ts
│   ├── runtime-builder.ts
│   └── index.ts
├── handlers/
│   ├── device.handler.ts
│   ├── link.handler.ts
│   ├── config.handler.ts
│   ├── inspect.handler.ts
│   ├── canvas.handler.ts
│   ├── module.handler.ts
│   └── index.ts
├── templates/
│   ├── runtime.ts
│   └── main-kernel.ts
└── index.ts
```

## Contratos

### `HandlerPort`
Un handler debe declarar:

- `name`: identificador único.
- `supportedTypes`: tipos de payload soportados.
- `execute(payload, deps)`: ejecución del comando.

### `HandlerRegistryPort`
El registry debe permitir:

- registrar handlers;
- obtener handlers por nombre;
- obtener handlers por tipo de payload;
- listar tipos soportados.

### `DispatcherPort`
El dispatcher debe:

- validar `payload` y `payload.type`;
- resolver el handler correspondiente;
- capturar errores y devolver `HandlerResult` seguro.

## Flujo de ejecución

1. `HandlerRegistry` registra handlers disponibles en TypeScript.
2. `RuntimeBuilder` y `TemplateRegistry` generan las secciones string necesarias.
3. `runtime.ts` y `main-kernel.ts` consumen el builder para exponer sus templates ensamblados.
4. `RuntimeDispatcher` se usa para validar y probar el ruteo del lado TypeScript; el runtime generado mantiene su propio `dispatch` en JavaScript.

## Migración de handlers
Cada handler actual se transforma en una clase concreta que implementa `HandlerPort` y delega a las funciones puras ya existentes cuando aplique.

Orden sugerido:

1. `device`
2. `link`
3. `config`
4. `inspect`
5. `canvas`
6. `module`

## Estrategia para templates
Los templates existentes no se eliminan de inmediato. Se conservan como funciones generadoras y el nuevo builder las compone en un solo punto. Esto minimiza riesgo durante la migración.

## Criterios de aceptación

- `runtime.ts` y `main-kernel.ts` dejan de contener lógica extensa y quedan como orquestación.
- Existe una capa `ports/` con contratos estables.
- El registry permite agregar un nuevo handler sin modificar el dispatcher central.
- Los handlers se pueden probar de forma aislada.
- El runtime generado mantiene comportamiento equivalente en Packet Tracer.

## Pruebas esperadas

- Pruebas unitarias del registry.
- Pruebas unitarias del dispatcher.
- Pruebas unitarias de al menos un handler migrado.
- Validación de que el runtime generado sigue respondiendo a los payloads existentes.

## Riesgos

- El dispatcher podría duplicar lógica que hoy está distribuida en templates si la migración se hace demasiado rápido.
- Algunos templates pueden depender de variables globales del runtime y requerir adaptación gradual.
- La separación entre handlers y templates debe mantenerse clara para evitar mezclar generación de código con ejecución de lógica.

## Resultado esperado
Un `pt-runtime` más pequeño, extensible y testeable, con una estructura lista para incorporar nuevos handlers sin tocar el núcleo del dispatcher.
