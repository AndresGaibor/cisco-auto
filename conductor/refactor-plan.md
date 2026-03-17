# Plan de Refactorización y Limpieza (cisco-auto)

## Antecedentes y Motivación
Actualmente, el proyecto `cisco-auto` tiene archivos muy grandes (`src/cli/index.ts`, `src/core/config-generators/ios-generator.ts`, y `src/core/types/topology.ts`) que agrupan demasiadas responsabilidades. Esto dificulta el mantenimiento, la adición de nuevas funcionalidades y rompe los principios de diseño modular descritos en el PRD del proyecto (Arquitectura del Sistema 4.1). Además, existen numerosos scripts de prueba y archivos temporales creados durante el desarrollo del parser PKA que ensucian el directorio de trabajo.

## Alcance e Impacto
Este refactor afectará casi todo el código base existente, pero **no alterará el comportamiento actual del sistema ni su funcionalidad**. Se trata de un refactor puramente estructural y de organización:
- **Módulo CLI (`src/cli`)**: Modularización de comandos de Commander.js.
- **Módulo de Configuración (`src/core/config-generators`)**: División por áreas de dominio (VLAN, Routing, Seguridad, etc.).
- **Módulo de Tipos (`src/core/types`)**: Separación de las interfaces y esquemas Zod.
- **Limpieza de raíz y scripts**: Reubicación y eliminación de scripts obsoletos.

## Solución Propuesta
1. **Tipos (Types):** Crear archivos separados para redes (`common.ts`), dispositivos (`device.ts`), protocolos (`protocols.ts`), seguridad (`security.ts`) y la definición completa del lab (`lab.ts`). Centralizar las exportaciones en `index.ts`.
2. **Generadores (Config Generators):** Dividir `ios-generator.ts` en `base-generator.ts`, `vlan-generator.ts`, `routing-generator.ts` y `security-generator.ts`. El archivo principal actuará como orquestador.
3. **CLI:** Extraer la lógica de `parse`, `config`, `validate`, `devices`, `deploy`, y `init` a sus propios archivos dentro de `src/cli/commands/`.
4. **Limpieza (Cleanup):**
   - Eliminar `test-parser.ts` en la raíz.
   - Mover todos los scripts en `scripts/` (relacionados con investigación y PKA) a un subdirectorio `scripts/experiments/`.
   - Limpiar importaciones no utilizadas a lo largo de todo el proyecto.

## Plan de Implementación por Fases

### Fase 1: Limpieza del Repositorio
1. Mover los archivos de prueba en `scripts/` (ej. `test_pka_decoder.ts`, `twofish-complete.ts`, etc.) a `scripts/experiments/`.
2. Eliminar los archivos sueltos como `test-parser.ts` o el `index.ts` en la raíz si no pertenecen al flujo del CLI de producción.

### Fase 2: Refactor de Tipos y Esquemas (Types)
1. Crear `src/core/types/common.ts`, `protocols.ts`, `security.ts`, `device.ts`, y `lab.ts`.
2. Migrar los esquemas Zod correspondientes desde `topology.ts` a los nuevos archivos.
3. Crear un archivo `src/core/types/index.ts` para exportar todos los esquemas e interfaces.
4. Actualizar las importaciones en todo el proyecto que dependen de `topology.ts`.

### Fase 3: Refactor de Generadores (Config Generators)
1. Crear `base-generator.ts`, `vlan-generator.ts`, `routing-generator.ts`, y `security-generator.ts`.
2. Extraer las funciones generadoras desde `ios-generator.ts` a estas nuevas clases/archivos.
3. Actualizar `ios-generator.ts` para que invoque a las funciones especializadas.

### Fase 4: Refactor del CLI
1. Crear `src/cli/commands/parse.ts`, `config.ts`, `validate.ts`, `devices.ts`, `deploy.ts`, y `init.ts`.
2. Trasladar la implementación desde `src/cli/index.ts` a estos archivos.
3. Modificar `src/cli/index.ts` para importar y registrar los comandos modulares.
