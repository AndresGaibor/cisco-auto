# Plan: Preparar proyecto cisco-auto para GitHub

Este plan detalla los pasos para limpiar la estructura del proyecto, mejorar la documentación y asegurar que el repositorio esté listo para ser compartido en GitHub siguiendo las mejores prácticas.

## Objetivos
- Limpiar archivos temporales, de depuración y muestras de gran tamaño.
- Actualizar el `README.md` con información relevante del PRD.
- Refinar el `.gitignore` para evitar subir archivos accidentales.
- Organizar los scripts y archivos de prueba.

## Cambios Propuestos

### 1. Limpieza de Archivos
- **Eliminar archivos XML/YAML raíz**: `debug_pc.xml`, `lab_modificado.xml`, `middle_sample.xml`, `sample_structure.xml`, `xml_1.xml`, `yaml_1.yaml`, `yaml_2.yaml`, `yaml_3.yaml`, `yaml_4_v2.yaml`, `yaml_4.yaml`, `imported_lab.yaml`. (Se mantendrán ejemplos en `labs/`).
- **Eliminar archivos PKA raíz**: `hacked_lab.pka`, `osi_modificado.pka`.
- **Eliminar archivos de texto temporales**: `line_num.txt`.
- **Eliminar carpetas de agentes redundantes**: `.agent`, `.agents`, `.claude`, `.iflow`, `.qwen` (si no son necesarias para el entorno local del usuario, se asume que son rastro de herramientas de IA).
- **Mover archivos de prueba**: Asegurar que `test-validation.ts` esté en la carpeta `tests/`.

### 2. Actualización de Documentación
- **README.md**:
    - Descripción clara del proyecto.
    - Características principales (VLANs, OSPF, SSH, etc.).
    - Requisitos previos (Bun, Packet Tracer).
    - Instrucciones de instalación y uso rápido.
    - Guía de comandos CLI.
    - Referencia al PRD para detalles técnicos.
- **LICENSE**: Crear archivo de licencia (MIT sugerida).

### 3. Configuración de Repositorio
- **.gitignore**:
    - Añadir patrones para archivos `.pka`, `.pkt`, `.xml` de depuración.
    - Añadir carpetas de herramientas de IA (`.agent/`, `.claude/`, etc.).
    - Añadir `bun.lock` (opcional, pero recomendado mantener para consistencia).

## Pasos de Implementación

### Fase 1: Limpieza
1. Eliminar archivos XML pesados en la raíz.
2. Eliminar archivos PKA y YAML temporales en la raíz.
3. Eliminar carpetas de configuración de agentes IA.
4. Mover `test-validation.ts` a `tests/unit/`.

### Fase 2: Documentación
1. Reescribir `README.md` basándose en el `PRD.md`.
2. Crear un archivo `LICENSE`.
3. Revisar y actualizar `package.json` (scripts, versión, descripción).

### Fase 3: Configuración Git
1. Actualizar `.gitignore` con exclusiones específicas de Packet Tracer y depuración.

## Verificación
- Ejecutar `ls -R` para confirmar la estructura limpia.
- Validar que los scripts en `package.json` funcionen correctamente.
- Revisar que el `README.md` se visualice correctamente (Markdown).

---
*Nota: Este plan no elimina la carpeta `archivos_prueba/` ya que contiene material útil para el desarrollo, pero se recomienda no subirla a GitHub si contiene material con derechos de autor de Cisco.*
