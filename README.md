# cisco-auto 🚀

**cisco-auto** es una potente herramienta de automatización diseñada para simplificar y acelerar la configuración de laboratorios y talleres de **Cisco Packet Tracer**. 

Ideal para estudiantes de Redes de Computadores (especialmente de la ESPOCH), esta herramienta reduce el tiempo de configuración manual de 45 minutos a menos de 2 minutos, minimizando errores humanos y asegurando que la topología cumpla con los estándares requeridos.

---

## ✨ Características Principales

- **⚙️ Configuración Automática**: Despliegue de comandos vía SSH/Telnet directamente a dispositivos Cisco.
- **🏗️ Topologías Declarativas**: Define tu red usando archivos **YAML** o **JSON** fáciles de leer.
- **🔍 Análisis de Archivos PKA/PKT**: Capacidad para extraer y decodificar información de archivos de Packet Tracer (versiones compatibles).
- **🌐 Soporte Multitarea**: Configuración paralela de múltiples dispositivos para máxima velocidad.
- **🛠️ Protocolos Soportados**:
  - **L2**: VLANs, VTP, STP, EtherChannel (LACP/PAgP).
  - **L3**: OSPF (Multi-área), EIGRP, BGP.
  - **Seguridad**: ACLs (Estándar/Extendidas), NAT (Estático/Dinámico/Overload), VPN IPsec.
- **✅ Validación Automática**: Verifica conectividad (ping) y estado de interfaces tras el despliegue.
- **🤖 Asistente IA Integrado**: Skill de Cisco Networking Assistant para guía interactiva.

---

## 📥 Instalación y Configuración

### Requisitos Previos

- [Bun](https://bun.sh/) (v1.1 o superior) - Runtime de JavaScript/TypeScript
- [Cisco Packet Tracer](https://www.netacad.com/courses/packet-tracer) (para pruebas locales)
- Git (para clonar el repositorio)

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/AndresGaibor/cisco-auto.git
cd cisco-auto
```

### Paso 2: Instalar Dependencias

```bash
bun install
```

### Paso 3: Verificar Instalación

```bash
bun run src/cli/index.ts --help
```

Deberías ver la ayuda de la CLI con los comandos disponibles.

---

## 🚀 Cómo Usar con IA (Skills)

Este proyecto incluye una **skill de Cisco Networking Assistant** que te permite interactuar con asistentes de IA para obtener ayuda experta en tus tareas de redes.

### Opción A: Usar con iFlow CLI (Recomendado)

**iFlow CLI** es el entorno en el que estás interactuando ahora mismo.

#### Instalación de iFlow CLI:

1. Descarga iFlow CLI desde: https://github.com/iflow/cli (o el repositorio oficial)
2. Instala siguiendo las instrucciones del proyecto
3. Abre tu terminal y navega al proyecto:

```bash
cd /Users/andresgaibor/code/javascript/cisco-auto
iflow
```

4. La skill se cargará automáticamente desde `.iflow/skills/cisco-networking-assistant/`

#### Uso:

Simplemente escribe tus preguntas o solicitudes:

```
"Necesito ayuda configurando VLANs en mi taller"
"Analiza este archivo lab-vlans.pka"
"Qué comandos necesito para OSPF?"
"No funciona la conectividad entre VLANs, ayuda con troubleshooting"
```

### Opción B: Usar con Gemini CLI (Google)

**Gemini CLI** es la interfaz de línea de comandos de Google para interactuar con Gemini.

#### Instalación de Gemini CLI:

1. Instala Gemini CLI (requiere Node.js):

```bash
npm install -g @google/gemini-cli
# o
yarn global add @google/gemini-cli
```

2. Autentícate con tu cuenta de Google:

```bash
gemini auth login
```

3. Navega al proyecto:

```bash
cd /Users/andresgaibor/code/javascript/cisco-auto
```

4. Inicia Gemini en el directorio:

```bash
gemini
```

La skill se cargará automáticamente desde `.gemini/skills/cisco-networking-assistant/`

#### Uso:

```
"Ayúdame con este laboratorio de Packet Tracer"
"Genera configuración para Router-on-a-stick"
"Explicame qué es VTP y cómo configurarlo"
```

### Opción C: Usar con Claude Code (Anthropic)

**Claude Code** es el CLI oficial de Anthropic para Claude.

#### Instalación de Claude Code:

1. Instala Claude Code:

```bash
npm install -g @anthropic-ai/claude-code
# o
yarn global add @anthropic-ai/claude-code
```

2. Autentícate:

```bash
claude auth login
```

3. Navega al proyecto e inicia Claude:

```bash
cd /Users/andresgaibor/code/javascript/cisco-auto
claude
```

#### Uso:

Similar a las otras opciones, la skill está disponible en `.claude/skills/` (si está configurado).

---

## 🛠️ Uso de la CLI Directa

Si prefieres usar la CLI sin IA, estos son los comandos disponibles:

### Comandos Principales

```bash
# Analizar un archivo YAML de laboratorio
bun run src/cli/index.ts parse labs/vlan-basico.yaml

# Generar configuraciones IOS
bun run src/cli/index.ts config labs/vlan-basico.yaml --dry-run

# Desplegar configuración a dispositivos
bun run src/cli/index.ts deploy labs/vlan-basico.yaml --save-config

# Validar un archivo de laboratorio
bun run src/cli/index.ts validate labs/vlan-basico.yaml

# Listar dispositivos
bun run src/cli/index.ts devices labs/vlan-basico.yaml

# Parsear archivo PKA de Packet Tracer
bun run src/cli/index.ts parse-pka archivo.pka --yaml --output lab.yaml

# Modificar archivo PKA
bun run src/cli/index.ts mod-test lab.pka --pc PC1 --ip 192.168.1.10 --output modificado.pka

# Modo interactivo
bun run src/cli/index.ts interactive
```

### Scripts Auxiliares

```bash
# Analizar un laboratorio (usando la skill)
bun run .iflow/skills/cisco-networking-assistant/scripts/lab-analyzer.ts archivo.pka

# Wizard de configuración interactivo
bun run .iflow/skills/cisco-networking-assistant/scripts/config-wizard.ts
```

---

## 📁 Estructura del Proyecto

```
cisco-auto/
├── src/
│   ├── cli/                    # Interfaz de línea de comandos
│   │   ├── commands/           # Comandos disponibles
│   │   ├── interactive/        # Menús interactivos
│   │   └── index.ts            # Punto de entrada
│   ├── core/                   # Lógica de negocio
│   │   ├── config-generators/  # Generadores de configuración IOS
│   │   ├── parser/             # Parsers de PKA/YAML
│   │   ├── models/             # Modelos de dispositivos
│   │   └── types/              # Tipos y schemas
│   ├── api/                    # API REST (en desarrollo)
│   └── templates/              # Templates de configuración
├── labs/                       # Ejemplos de laboratorios
├── docs/                       # Documentación técnica
├── .iflow/skills/              # Skills para iFlow CLI
├── .gemini/skills/             # Skills para Gemini CLI
├── .claude/skills/             # Skills para Claude CLI
├── archivos_prueba/            # Archivos de prueba (PKA)
└── tests/                      # Tests unitarios e integración
```

---

## 📚 Documentación de la Skill

La skill incluye guías de referencia completas:

### Guías Disponibles

| Guía | Contenido | Ubicación |
|------|-----------|-----------|
| **VLAN Guide** | VLANs, trunking, VTP, STP, EtherChannel, Port Security | `.iflow/skills/cisco-networking-assistant/references/vlan-guide.md` |
| **Routing Guide** | OSPF, EIGRP, BGP, routing estático | `.iflow/skills/cisco-networking-assistant/references/routing-guide.md` |
| **Security Guide** | ACLs, NAT, VPNs, DHCP Snooping, DAI | `.iflow/skills/cisco-networking-assistant/references/security-guide.md` |
| **Troubleshooting** | Metodología, comandos de diagnóstico | `.iflow/skills/cisco-networking-assistant/references/troubleshooting-guide.md` |

### Templates

- **VLAN Lab Template**: `.iflow/skills/cisco-networking-assistant/assets/templates/vlan-lab-template.yaml`

### Checklists

- **Verification Checklist**: `.iflow/skills/cisco-networking-assistant/assets/checklists/verification.md`

---

## 💡 Ejemplos de Uso con IA

### Ejemplo 1: Modo Guía (Aprendizaje)

**Tú**: "Necesito ayuda configurando VLANs en mi taller, soy principiante"

**IA**:
```
📚 MODO GUIA - NIVEL PRINCIPIANTE
=====================================

Voy a guiarte paso a paso. Primero, dime:
1. ¿Tienes un archivo .pka del taller? 
2. ¿Cuántas VLANs necesitas configurar?

Mientras tanto, aquí está el concepto:
- Las VLANs segmentan una red física en redes lógicas
- Es como tener varios switches dentro de uno

PASOS GENERALES:
1. Crear las VLANs en los switches
2. Asignar puertos a VLANs (modo access)
3. Configurar enlaces trunk entre switches
4. Configurar Router-on-a-stick si hay routing entre VLANs
```

### Ejemplo 2: Modo Automático (Rápido)

**Tú**: "Tengo este archivo lab-vlans.pka, complétalo para que funcione"

**IA**:
```
🤖 MODO AUTOMATICO ACTIVADO
============================

Analizando archivo...
Detectado:
- 2 Switches
- 4 PCs
- Requisito: VLAN 10 y 20 con Inter-VLAN routing

Generando configuración...
✅ Archivo modificado: lab-vlans-completed.pka

Cambios realizados:
- SW-CORE: VLANs 10 y 20 creadas, trunk configurado
- R1: Router-on-a-stick con subinterfaces
- PCs: IPs configuradas en rangos correctos

Comandos clave aplicados:
[Mostrará los comandos específicos]
```

### Ejemplo 3: Troubleshooting

**Tú**: "Las PCs no se hacen ping, qué puede ser?"

**IA**:
```
🔧 MODO TROUBLESHOOTING
========================

Vamos a diagnosticar paso a paso:

PASO 1: Verificar Capa 1 (Física)
- ¿Los cables están conectados? (deben estar verdes en PT)
- ¿Las interfaces están up/up?

Comando: show ip interface brief

PASO 2: Verificar Capa 2 (Enlace de Datos)
- ¿Los puertos están en la VLAN correcta?
- ¿Hay trunk entre switches si es necesario?

Comando: show vlan brief
         show interfaces trunk

[Continúa con árbol de decisión...]
```

---

## 🔧 Desarrollo y Contribución

### Estructura de la Skill

Las skills están organizadas así:

```
.iflow/skills/cisco-networking-assistant/
├── SKILL.md              # Instrucciones principales para la IA
├── references/           # Documentación de referencia
│   ├── vlan-guide.md
│   ├── routing-guide.md
│   ├── security-guide.md
│   └── troubleshooting-guide.md
├── scripts/              # Scripts ejecutables
│   ├── lab-analyzer.ts
│   └── config-wizard.ts
└── assets/               # Recursos adicionales
    ├── templates/
    └── checklists/
```

### Agregar Nueva Guía

1. Crea el archivo `.md` en `references/`
2. Actualiza `SKILL.md` para mencionar la nueva guía
3. La IA automáticamente la usará cuando sea relevante

### Modificar Comportamiento de la Skill

Edita `SKILL.md` para cambiar:
- Cuándo se activa la skill
- Qué hace en cada modo
- Cómo estructura las respuestas

---

## ⚠️ Solución de Problemas

### La skill no se carga

**iFlow**:
```bash
# Verificar que la skill existe
ls -la .iflow/skills/cisco-networking-assistant/

# Verificar skills-lock.json
cat skills-lock.json
```

**Gemini**:
```bash
# Verificar ubicación de skills de Gemini
gemini skills list

# Recargar skills
gemini skills reload
```

### Error al parsear PKA

Los archivos PKA de Packet Tracer 8.x están encriptados y no pueden parsearse completamente. Usa la definición YAML como alternativa.

### Comandos no funcionan

Asegúrate de tener Bun instalado y las dependencias instaladas:

```bash
bun --version  # Debe ser 1.1+
bun install    # Reinstalar dependencias
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

## 🤝 Soporte y Comunidad

- **Issues**: Reporta problemas en GitHub Issues
- **Discussions**: Preguntas y discusiones en GitHub Discussions
- **Documentación**: Revisa la carpeta `docs/` para guías técnicas detalladas

---

Hecho con ❤️ para la comunidad de Redes.

**Autor**: Andrés Gaibor  
**Institución**: ESPOCH - Escuela Superior Politécnica de Chimborazo  
**Carrera**: Ingeniería en Sistemas/Redes
