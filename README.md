# cisco-auto 🚀

[![Bun Version](https://img.shields.io/badge/Bun-%E2%89%A51.1-black?logo=bun)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-%E2%89%A55.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**cisco-auto** es una potente herramienta de automatización diseñada para simplificar y acelerar la configuración de laboratorios y talleres de **Cisco Packet Tracer**. 

Ideal para estudiantes y profesionales de redes, esta herramienta reduce el tiempo de configuración manual de topologías complejas de 45 minutos a menos de 2 minutos. Al estandarizar el despliegue, minimiza los errores humanos y asegura que la topología cumpla con los estándares requeridos para pruebas o evaluación.

---

## ✨ Características Principales

- **⚙️ Configuración Automática**: Despliegue de comandos vía API (Bridge) o scripts simulados directamente a dispositivos Cisco.
- **🏗️ Topologías Declarativas**: Define tu red usando archivos **YAML** intuitivos.
- **🔍 Análisis de Archivos PKA/PKT**: Capacidad para extraer y decodificar información de archivos de Packet Tracer (versiones 7.x y anteriores).
- **🌐 Soporte Multitarea**: Generación de configuraciones paralelas de múltiples dispositivos para máxima velocidad.
- **🛠️ Protocolos Soportados**:
  - **L2**: VLANs, VTP, STP, EtherChannel (LACP/PAgP).
  - **L3**: Routing estático, OSPF (Multi-área), EIGRP, BGP.
  - **Seguridad**: ACLs (Estándar/Extendidas), NAT (Estático/Dinámico/Overload).
- **✅ Validación Automática**: Verifica la correcta estructura del laboratorio antes del despliegue.
- **🤖 Asistente IA Integrado**: Interfaz lista para usar con IA a través de iFlow, Gemini o Claude CLI.

---

## 📥 Instalación y Configuración

### Requisitos Previos

- [Bun](https://bun.sh/) (v1.1 o superior) - Runtime ultrarrápido de JavaScript/TypeScript.
- [Cisco Packet Tracer](https://www.netacad.com/courses/packet-tracer) (opcional, para simulaciones locales).
- Git (para clonar el repositorio).

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/AndresGaibor/cisco-auto.git
cd cisco-auto
```

### Paso 2: Instalar Dependencias

Dado que el proyecto es un **monorepo** gestionado con Bun, simplemente ejecuta:

```bash
bun install
```

### Paso 3: Verificar Instalación

Puedes ejecutar la CLI directamente a través del alias principal de Bun:

```bash
bun run cisco-auto --help
```

Deberías ver la ayuda de la CLI con los comandos disponibles.

---

## 🛠️ Uso de la CLI

**cisco-auto** ofrece una potente interfaz de línea de comandos (CLI) para gestionar el ciclo de vida de tus laboratorios.

### Flujo de Trabajo Principal

1. **Crear o Parsear:** Inicia creando un archivo YAML base.
2. **Validar:** Asegura que la topología y comandos sean correctos.
3. **Desplegar:** (Opcional) Genera scripts o se conecta para aprovisionar los equipos.

### Comandos de Ejemplo

```bash
# Iniciar el asistente interactivo para crear un laboratorio nuevo
bun run cisco-auto lab interactive

# Analizar un archivo de laboratorio (YAML) y ver la topología detectada
bun run cisco-auto lab parse labs/vlan-basico.yaml

# Validar exhaustivamente un laboratorio y sus reglas de negocio
bun run cisco-auto lab validate labs/vlan-basico.yaml

# Listar los dispositivos definidos en el laboratorio
bun run cisco-auto device list labs/vlan-basico.yaml

# Generar configuraciones para los dispositivos definidos (modo dry-run por defecto en legacy)
bun run cisco-auto legacy deploy labs/vlan-basico.yaml

# Extraer y transformar un archivo de Packet Tracer (PKA/PKT) a YAML (solo versiones compatibles)
bun run cisco-auto legacy parse-pka archivo.pka --yaml --output lab.yaml
```

*Para ver la ayuda completa de cada comando, utiliza el flag `--help`, por ejemplo: `bun run cisco-auto lab --help`.*

---

## 🚀 Cómo Usar con IA (Skills)

Este proyecto incluye una **skill de Cisco Networking Assistant** que te permite interactuar con asistentes de IA para obtener ayuda experta, guiada o automática en tus tareas de redes.

### Opción A: Usar con iFlow CLI (Recomendado)

**iFlow CLI** es un entorno optimizado para usar Skills de IA locales.

1. Descarga e instala [iFlow CLI](https://github.com/iflow/cli).
2. Navega al directorio del proyecto `cisco-auto`.
3. Ejecuta `iflow` en tu terminal. La skill se cargará desde `.iflow/skills/cisco-networking-assistant/`.
4. Escribe tu solicitud, por ejemplo:
   > *"Necesito ayuda configurando VLANs en mi taller"*
   > *"Analiza este archivo lab-vlans.yaml y corrígelo"*

### Opción B: Usar con Gemini CLI (Google) o Claude Code (Anthropic)

También puedes usar las interfaces oficiales de Google o Anthropic instaladas globalmente (`@google/gemini-cli` o `@anthropic-ai/claude-code`).

- Inicia sesión con `gemini auth login` o `claude auth login`.
- En el directorio del proyecto, inicia `gemini` o `claude`. La skill correspondiente se detectará en sus carpetas respectivas (ej. `.gemini/skills/`).

**Ejemplos de Prompts:**
- *"Ayúdame con este laboratorio de Packet Tracer"*
- *"Genera configuración para Router-on-a-stick"*
- *"Las PCs no se hacen ping en mi lab, ayúdame con el troubleshooting"*

---

## 📁 Estructura del Monorepo

El proyecto está organizado en un monorepo para separar lógicamente la CLI, los modelos de negocio y las utilidades:

```
cisco-auto/
├── apps/
│   └── cli/                    # Interfaz principal de línea de comandos
├── packages/
│   ├── crypto/                 # Desencriptación de archivos de Packet Tracer (PT 7.x)
│   ├── device-catalog/         # Catálogo de hardware soportado por cisco-auto
│   ├── import-pka/             # Parseo de archivos .pka y .pkt
│   ├── import-yaml/            # Parseo y validación de topologías YAML
│   ├── lab-model/              # Definición base y tipado de los modelos de Lab
│   ├── legacy/                 # Código y comandos heredados (deprecated)
│   ├── sim-engine/             # Motor de simulación para pruebas de estado
│   ├── sim-runtime/            # Entorno de simulación
│   └── topology/               # Validaciones estructurales y modelos de red
├── labs/                       # Ejemplos de laboratorios YAML
├── docs/                       # Documentación técnica, diseño de fases y PRDs
├── scripts/                    # Scripts útiles (ej: instalación del Bridge en MacOS)
└── tests/                      # Pruebas e2e, unitarias y de integración
```

---

## 🔧 Desarrollo y Contribución

Si deseas contribuir, desarrollar nuevas funciones o mejorar las skills de IA, asegúrate de correr los scripts locales.

### Comandos de Desarrollo

```bash
# Construir todas las dependencias del monorepo
bun run build

# Correr pruebas unitarias e integración en todos los paquetes
bun run test

# Verificar el tipado global
bun run typecheck
```

### Agregando contenido a la Skill IA
1. Ve a `.iflow/skills/cisco-networking-assistant/references/`.
2. Crea una guía en Markdown (`.md`).
3. Modifica `.iflow/skills/cisco-networking-assistant/SKILL.md` para que la IA sepa cuándo invocarla.

---

## ⚠️ Solución de Problemas Comunes

- **Error al parsear PKA/PKT:** Los archivos creados con Cisco Packet Tracer 8.x están fuertemente encriptados. `cisco-auto` actualmente solo puede extraer archivos de versiones anteriores o desprotegidos. Usa definiciones YAML directamente como la mejor alternativa.
- **Comandos no encontrados:** Asegúrate de ejecutar `bun install` en la raíz para que los workspaces (`apps/*` y `packages/*`) se vinculen adecuadamente.
- **La skill IA no responde adecuadamente:** Verifica si tu CLI (iFlow, Gemini, Claude) detecta la skill. Puedes revisar el archivo `skills-lock.json`.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

## 🤝 Soporte y Comunidad

- **Problemas (Issues):** Reporta bugs en GitHub Issues.
- **Documentación Avanzada:** Revisa la carpeta `docs/` para detalles de la arquitectura, mapas de PT y PRDs.

---

Hecho con ❤️ para la comunidad de Redes y Telecomunicaciones.

**Autor**: Andrés Gaibor  
**Institución**: ESPOCH - Escuela Superior Politécnica de Chimborazo  
**Carrera**: Ingeniería en Sistemas / Redes de Computadores
