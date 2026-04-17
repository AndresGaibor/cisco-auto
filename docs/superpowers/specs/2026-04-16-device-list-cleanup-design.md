# Device List Cleanup Design

## Context
`bun run pt device list` ya responde, pero la salida sigue mostrando demasiado ruido y algunos dispositivos móviles aparecen sin puertos útiles. El objetivo es mejorar la experiencia por defecto sin tocar el comportamiento base del runtime más de lo necesario.

## Goals
- Reducir ruido en la salida normal de `pt device list`.
- Mostrar puertos solo cuando aporten información útil.
- Mantener una vista completa con `--verbose`.
- Evitar cambios innecesarios en el runtime si el filtrado puede resolverse en la capa CLI.

## Non-Goals
- No cambiar el modelo de datos de Packet Tracer.
- No inventar puertos que PT no expone.
- No alterar el comando `device list` fuera del formato de salida.

## Proposed Design

### 1. Vista por defecto
La vista normal mostrará solo:
- nombre del dispositivo
- tipo y modelo
- puertos con conexión real o estado útil

Se ocultarán secciones vacías y bloques de puertos sin señal útil.

### 2. Vista `--verbose`
La vista verbose seguirá mostrando todos los puertos disponibles, incluyendo los que no tienen conexión visible.

### 3. Regla para puertos en dispositivos móviles
Para `Laptop0`, `Smartphone0` y `Tablet PC0`, la vista normal solo mostrará puertos si:
- el runtime los reporta con conexión,
- o el puerto tiene atributos mínimos útiles.

Si no, se omiten en la salida normal para evitar ruido.

## Architecture
- `packages/pt-runtime/src/handlers/device.ts` seguirá siendo la fuente de verdad de los datos.
- `apps/pt-cli/src/application/device-list.ts` aplicará el filtrado final para la vista normal.
- `apps/pt-cli/src/commands/device/list.ts` decidirá entre salida resumida y verbose.

## Error Handling
- Si el bridge falla, se conserva el comportamiento actual de fallback.
- Si un dispositivo no expone puertos, no se trata como error.
- Si un puerto viene incompleto, se omiten solo los campos vacíos.

## Testing
- Regresión para salida normal sin bloques de puertos vacíos.
- Regresión para `--verbose` mostrando todos los puertos.
- Regresión específica para dispositivos móviles sin puertos visibles.

## Acceptance Criteria
- `pt device list` muestra menos ruido en la salida por defecto.
- `pt device list --verbose` conserva la información completa.
- Los dispositivos móviles sin puertos útiles no muestran bloques vacíos.
- No se rompe la lista de dispositivos ya visible.
