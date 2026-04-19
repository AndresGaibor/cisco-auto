# pt-runtime: plan de implementación

## Estado
Completado.

## Objetivo
Ejecutar la refactorización de `pt-runtime` descrita en la spec, reduciendo los archivos grandes a orquestación y separando contratos, core, handlers y templates.

## Principios de ejecución
- Hacer el cambio mínimo correcto en cada paso.
- Mantener el comportamiento equivalente del runtime generado.
- No mezclar generación de strings con lógica de ejecución.
- Validar cada fase antes de avanzar a la siguiente.

## Orden de trabajo
1. Crear la capa de `ports/`.
2. Implementar `core/` con registry y dispatcher.
3. Migrar handlers uno por uno a clases concretas.
4. Reducir `templates/runtime.ts` y `templates/main-kernel.ts` a orquestación.
5. Actualizar exports públicos y validar el paquete completo.

## Fase 1: Ports
### Entregables
- `src/ports/handler.port.ts`
- `src/ports/dispatcher.port.ts`
- `src/ports/registry.port.ts`
- `src/ports/index.ts`

### Tareas
- Definir `HandlerPort` con `name`, `supportedTypes` y `execute`.
- Definir `HandlerRegistryPort` con registro y consultas por nombre/tipo.
- Definir `DispatcherPort` para validación y ruteo.
- Re-exportar todos los ports desde un `index.ts` único.

### Verificación
- Compilar tipos del paquete.
- Confirmar que no existen dependencias circulares entre ports.

## Fase 2: Core
### Entregables
- `src/core/registry.ts`
- `src/core/dispatcher.ts`
- `src/core/runtime-builder.ts`
- `src/core/index.ts`

### Tareas
- Implementar `HandlerRegistry`.
- Implementar `RuntimeDispatcher`.
- Agregar una estrategia de registro central para los handlers.
- Crear el builder que ensambla templates y dispatcher.

### Verificación
- Pruebas unitarias del registry.
- Pruebas unitarias del dispatcher.
- Caso de error para payload inválido y handler desconocido.

## Fase 3: Handlers
### Entregables
- `src/handlers/*.handler.ts`
- `src/handlers/index.ts`

### Tareas
- Migrar `device` primero.
- Migrar `link`, `config`, `inspect`, `canvas` y `module` después.
- Mantener las funciones puras existentes como helpers internos cuando sea útil.
- Registrar todos los handlers desde un único punto.

### Verificación
- Pruebas unitarias de al menos un handler completo.
- Validación de que cada handler expone los tipos esperados.

## Fase 4: Templates
### Entregables
- `src/templates/runtime.ts`
- `src/templates/main-kernel.ts`
- Ajustes mínimos en templates auxiliares si es necesario

### Tareas
- Reducir ambos archivos a ensamblado/orquestación.
- Mantener los generadores de string existentes como piezas reutilizables.
- Extraer cualquier bloque de ensamblado repetido al builder.

### Verificación
- Revisar que el runtime generado siga incluyendo las secciones esperadas.
- Validación manual del output generado para un caso representativo.

## Fase 5: API pública
### Entregables
- `src/index.ts`

### Tareas
- Re-exportar ports, core, handlers y templates relevantes.
- Mantener una superficie pública clara para consumidores internos.

### Verificación
- Confirmar imports existentes del paquete.
- Ejecutar typecheck del paquete completo.

## Criterios de terminado
- `runtime.ts` y `main-kernel.ts` ya no concentran lógica compleja.
- Los ports existen y son usados por el core.
- Los handlers son sustituibles y testeables de forma aislada.
- El runtime generado conserva comportamiento equivalente.
- No quedan dependencias implícitas entre handlers y el core.

## Riesgos operativos
- Migrar varios handlers a la vez puede mezclar errores de ruteo con errores funcionales.
- Algunos templates dependen de variables globales del runtime y deben tocarse con cuidado.
- El output del runtime puede cambiar en estructura, así que la validación debe enfocarse en comportamiento.

## Checklist final
- [x] Ports creados
- [x] Core implementado
- [x] Handlers migrados
- [x] Templates simplificados
- [x] Exports públicos actualizados
- [x] Typecheck y pruebas relevantes ejecutadas
