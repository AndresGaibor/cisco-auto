# 🚀 cisco-auto

**cisco-auto** es una potente y moderna herramienta de automatización diseñada para simplificar y acelerar la configuración, despliegue y validación de laboratorios y talleres de **Cisco Packet Tracer** y equipos reales. 

Diseñado especialmente para estudiantes de Redes de Computadores (con enfoque en ESPOCH), este proyecto busca reducir drásticamente el tiempo de configuración manual (de 45 a menos de 2 minutos), minimizar errores humanos y garantizar el cumplimiento de los estándares de topología mediante un enfoque declarativo.

[![Bun](https://img.shields.io/badge/Bun-1.1%2B-black?logo=bun)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Características Principales

- **🎮 Control en Tiempo Real de Packet Tracer**: CLI para controlar PT desde TypeScript/Bun sin dependencias externas.
- **⚙️ Despliegue Automático**: Configuración directa a dispositivos Cisco vía SSH/Telnet con ejecución paralela para máxima velocidad.
- **🏗️ Topologías Declarativas**: Define la arquitectura usando archivos **YAML** o **JSON** validados con Zod.
- **🔍 Análisis PKA/PKT**: Ingeniería inversa para decodificar archivos de Packet Tracer (XOR + Twofish CBC + zlib), extrayendo dispositivos y topologías.
- **🛠️ Protocolos Soportados**:
  - **L2 (Switching)**: VLANs, VTP, STP, EtherChannel (LACP/PAgP).
  - **L3 (Routing)**: OSPF (Single/Multi-área, Stub, NSSA), EIGRP, BGP.
  - **Seguridad y Servicios**: ACLs, NAT (Static, Dynamic, Overload), VPN IPsec, IPv6.
- **✅ Validación Automática**: Verificación post-despliegue de conectividad (ping), estado de interfaces, tablas de enrutamiento y vecinos.

---

## 🏗️ Arquitectura y Tecnologías

El proyecto está construido priorizando el rendimiento, la seguridad y la mantenibilidad:

- **Runtime Principal:** [Bun](https://bun.sh/) (Rendimiento superior, TypeScript nativo, obligatorio).
- **Lenguaje:** TypeScript estricto.
- **Validación y Tipado:** Zod.
- **Conectividad:** `node-ssh` (SSH) y Telnet como fallback.
- **Criptografía (PKA):** Implementación personalizada de XOR + Twofish CBC + zlib.

---

## 📥 Instalación

### Requisitos Previos

- [Bun](https://bun.sh/) (v1.1 o superior) instalado en tu sistema. *No uses Node.js/npm.*
- [Cisco Packet Tracer](https://www.netacad.com/courses/packet-tracer) (opcional, para visualización de labs).

### Pasos de Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/AndresGaibor/cisco-auto.git
cd cisco-auto

# 2. Instalar dependencias con Bun
bun install

# 3. Verificar instalación
bun run cisco-auto --help
```

---

## 💻 Uso de la Interfaz de Línea de Comandos (CLI)

La CLI proporciona acceso rápido a todas las funcionalidades principales.

### 🎮 Control en Tiempo Real de Packet Tracer

```bash
# Setup inicial (solo una vez)
bash scripts/setup-pt-control.sh

# Controlar PT en tiempo real
bun run pt device add R1 2911 100 100
bun run pt device add S1 2960-24TT 300 100
bun run pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1 straight
bun run pt config host PC1 192.168.1.10 255.255.255.0 192.168.1.1
bun run pt snapshot

# Ver guía completa
cat docs/PT_CONTROL_QUICKSTART.md
```

### Analizar Laboratorios

```bash
# Parsear la definición YAML de un laboratorio
bun run cisco-auto lab parse labs/vlan-basico.yaml

# Generar archivos de configuración IOS basados en YAML
bun run cisco-auto config labs/vlan-basico.yaml --output ./configs

# Desplegar las configuraciones a los dispositivos reales/virtuales en paralelo
bun run cisco-auto topology deploy labs/vlan-basico.yaml --save-config

# Validar un archivo de laboratorio
bun run cisco-auto lab validate labs/vlan-basico.yaml

# Listar dispositivos de un laboratorio
bun run cisco-auto device list labs/vlan-basico.yaml
```

---

## 📝 Logging, Autonomía y Confirmación

La CLI de cisco-auto (basada en pt-control) implementa:

- **Logging estructurado:** Cada comando ejecutado queda registrado en archivos NDJSON, permitiendo auditoría y análisis histórico. Puedes consultar logs con `pt logs` o desde la skill de IA.
- **Autonomía proactiva:** El sistema ejecuta pasos seguros automáticamente y sugiere acciones recomendadas, minimizando la intervención manual y acelerando flujos repetitivos.
- **Confirmación de acciones destructivas:** Antes de eliminar dispositivos, enlaces o limpiar snapshots, la CLI solicita confirmación interactiva. Para automatización, usa el flag global `--yes` para registrar la aprobación en el log sin prompt.

---

## 🤖 Uso con Asistentes de IA (Skills)

`cisco-auto` incluye la skill especializada **Cisco Networking Assistant**, que convierte a tu CLI de IA favorita en un experto en Packet Tracer y redes Cisco. Esta skill te permite solicitar modificaciones a archivos, consultar teoría de redes, y diagnosticar problemas directamente desde tu terminal.

### Entornos Soportados

1. **[iFlow CLI](https://github.com/iflow/cli) (Recomendado):**
   ```bash
   cd cisco-auto
   iflow
   # La skill se carga automáticamente desde .iflow/skills/cisco-networking-assistant/
   ```

2. **[Gemini CLI](https://www.npmjs.com/package/@google/gemini-cli):**
   ```bash
   cd cisco-auto
   gemini
   # La skill se carga automáticamente desde .gemini/skills/cisco-networking-assistant/
   ```

3. **[Claude Code](https://www.npmjs.com/package/@anthropic-ai/claude-code):**
   ```bash
   cd cisco-auto
   claude
   # La skill se carga automáticamente desde .claude/skills/
   ```

### Ejemplos de Interacción
- *"Necesito ayuda configurando VLANs en mi taller. Soy principiante, guíame paso a paso."*
- *"Analiza este archivo lab-vlans.pka y complétalo en modo automático para que las PCs tengan conectividad."*
- *"Genera la configuración de Router-on-a-stick para este proyecto."*
- *"Las PCs de la VLAN 10 no pueden hacer ping a la VLAN 20, ayúdame a realizar un troubleshooting."*

---

## 📁 Estructura del Proyecto (Monorepo)

```text
cisco-auto/
├── apps/
│   └── pt-cli/             # CLI principal (Commander.js)
├── packages/
│   ├── core/               # Lógica de negocio y orquestadores
│   ├── pt-control/         # 🎮 Control en tiempo real de Packet Tracer
│   ├── file-bridge/        # Bridge para comunicación CLI ↔ Packet Tracer
│   └── pt-runtime/         # Generador de runtime para Packet Tracer
├── labs/                   # Archivos YAML de topologías de ejemplo
├── docs/                   # Documentación técnica y guías
└── scripts/                # Scripts de utilidad
```

---

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Sigue estos pasos:

1. Realiza un Fork del repositorio.
2. Crea una rama para tu feature (`git checkout -b feature/NuevaCaracteristica`).
3. Sigue las convenciones establecidas en `CLAUDE.md`. Recuerda usar siempre `bun` (nunca `npm` o `node`).
4. Ejecuta los tests localmente (`bun test`).
5. Abre un Pull Request.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

<p align="center">
Hecho con ❤️ para la comunidad de Redes.<br>
<b>Autor:</b> Andrés Gaibor | <b>Institución:</b> ESPOCH (Escuela Superior Politécnica de Chimborazo)
</p>
