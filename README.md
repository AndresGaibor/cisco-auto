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

---

## 🚀 Inicio Rápido

### Requisitos Previos

- [Bun](https://bun.sh/) (v1.1 o superior)
- [Cisco Packet Tracer](https://www.netacad.com/courses/packet-tracer) (para pruebas locales)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/cisco-auto.git
cd cisco-auto

# Instalar dependencias
bun install
```

### Uso Básico

1. **Analizar un laboratorio**:
   ```bash
   bun run src/cli/index.ts parse labs/vlan-basico.yaml
   ```

2. **Desplegar configuración**:
   ```bash
   bun run src/cli/index.ts deploy labs/vlan-basico.yaml --save-config
   ```

---

## 🛠️ Comandos CLI

El sistema provee una interfaz intuitiva con los siguientes comandos:

- `parse <archivo>`: Analiza archivos `.pkt` o `.yaml` y muestra los dispositivos detectados.
- `config <archivo>`: Genera los archivos de configuración de IOS basados en la topología.
- `deploy <archivo>`: Conecta a los dispositivos y aplica las configuraciones generadas.
- `verify <archivo>`: Realiza pruebas de conectividad y valida la configuración aplicada.

Usa `--help` en cualquier comando para ver más opciones (ej: `deploy --dry-run`).

---

## 📁 Estructura del Proyecto

- `src/core`: Lógica de negocio, generadores de configuración y parsers.
- `src/cli`: Interfaz de línea de comandos.
- `src/api`: (En desarrollo) API REST para integración externa.
- `labs/`: Ejemplos de topologías en YAML.
- `docs/`: Documentación técnica detallada y guías de protocolos.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

Hecho con ❤️ para la comunidad de Redes.
