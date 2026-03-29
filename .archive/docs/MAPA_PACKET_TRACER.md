# Mapa Completo de Packet Tracer: Qué Automatizar

> Análisis basado en documentación oficial de Cisco Packet Tracer. Packet Tracer no es solo "poner routers y switches", sino un entorno integrado de **diseño, configuración, simulación, colaboración, evaluación y extensión**.

**Nota importante:** Packet Tracer **no replica todo Cisco al 100%**. Usa modelos simplificados de protocolos e IOS/ASA y solo cubre un subconjunto de funciones reales.

---

## 1. Interfaz Principal y Canvas Lógico

El espacio lógico donde se crean topologías incluye:

- Colocación de dispositivos
- Agregación de módulos
- Conexión de cables
- Configuración de equipos
- Barra de herramientas
- Caja de componentes
- Búsqueda de dispositivos
- Notas
- Formas
- Clusters
- Manejo de ventanas

**Referencia:** [The Logical Workspace](https://tutorials.ptnetacad.net/help/default/workspace_logical.htm)

---

## 2. Modo Físico

No es solo visual. Modela ubicación y escala en contenedores:

```
Intercity → City → Building → Wiring Closet
```

Además incluye:

- Objetos físicos
- Fondo
- Grid
- Cableado estructurado

**Si quieres replicarlo de verdad, esto es un subsistema aparte.**

**Referencia:** [The Physical Workspace](https://tutorials.ptnetacad.net/help/default/workspace_physical.htm)

---

## 3. Catálogo de Dispositivos y Módulos

Packet Tracer no maneja solo "tipos", sino:

- **Modelos concretos**
- **Módulos intercambiables**

Muchos equipos permiten:
1. Apagar
2. Insertar/quitar módulos
3. Volver a encender

**Necesitas modelar:** slots, compatibilidad y puertos.

**Referencia:** [Devices and Modules](https://tutorials.ptnetacad.net/help/default/devicesAndModules.htm)

---

## 4. Motor de Conexiones

Tipos de enlaces documentados:

| Tipo | Descripción |
|------|-------------|
| Consola | Conexión de administración |
| Cobre straight-through | Conexión estándar |
| Cobre crossover | Conexión directo a directo |
| Fibra single-mode | Larga distancia |
| Fibra multi-mode | Corta distancia |
| Phone | Telefonía |
| Coaxial | Cable coaxial |
| Serial DCE/DTE | WAN serial |
| Octal | Múltiples conexiones |
| Cable IoE | IoT |
| USB | Conexión USB |

**Reglas:** Packet Tracer distingue conexiones físicas incompatibles (ej: fibras de distinto tipo).

**Referencia:** [Connections / Links](https://tutorials.ptnetacad.net/help/default/connectionsLinks.htm)

---

## 5. Capas de Configuración

Packet Tracer soporta varias superficies de configuración:

| Tab | Uso |
|-----|-----|
| **Config tab** | Configuración GUI simplificada |
| **Desktop tab** | Aplicaciones de escritorio (IP config, Command Prompt, etc.) |
| **Services tab** | Servicios del dispositivo |
| **CLI tab** | Línea de comandos IOS |
| **Web config** | Configuración web (ej: Meraki) |

**No basta con una sola UI.**

**Referencia:** [Packet Tracer Official Tutorials](https://tutorials.ptnetacad.net/)

---

## 6. Modo Realtime y Simulation

Dos modos operativos:

### Realtime Mode
- Tiempo real continuo

### Simulation Mode
- Panel de simulación
- Lista de eventos
- Filtros
- ACL filters
- Control de reproducción
- Avance paso a paso
- Backtracking
- Visualización detallada de PDUs y protocolos

**Referencia:** [Operating Modes](https://tutorials.ptnetacad.net/help/default/operatingModes.htm)

---

## 7. PDUs y Trazado

Herramientas disponibles:

- **Simple PDU** - Creación rápida
- **Complex PDU** - Personalización completa
- Registro de eventos
- Visualización de protocolos

### Protocolos visibles documentados

| Capa | Protocolos |
|------|------------|
| L2 | ARP, CDP, STP, VTP |
| L3 | ICMP, OSPF, EIGRP, RIP, BGP |
| L4 | TCP, UDP |
| L7 | HTTP, HTTPS, DNS, DHCP, SMTP, SSH |

**Referencia:** [Interface Overview](https://tutorials.ptnetacad.net/help/default/interfaceOverview.htm)

---

## 8. Sistema de Actividades y Evaluación

Packet Tracer incluye **Activity Wizard**, un sistema completo:

- Red inicial
- Red respuesta
- Pruebas (tests)
- Scoring
- Variables
- External instructions
- Assessment tree
- Shape tests
- Distribución de actividades

**Esto es una segunda aplicación dentro de la primera.**

**Referencia:** [Packet Tracer Official Tutorials](https://tutorials.ptnetacad.net/)

---

## 9. Colaboración Multiuser

Características:

- Conexiones peer-to-peer entre instancias
- Cuando conectado a peer remoto, no puedes entrar directamente en Simulation Mode
- Packet Tracer propone guardar copia offline y abrirla en otra instancia

**Referencia:** [Multiuser](https://tutorials.ptnetacad.net/help/default/multiuser.htm)

---

## 10. IoT, Things y Entorno

### Categorías IoT

| Categoría | Descripción |
|-----------|-------------|
| **Home** | Dispositivos del hogar |
| **Smart City** | Ciudad inteligente |
| **Industrial** | Automatización industrial |
| **Power Grid** | Red eléctrica |

### Componentes IoT

- **Boards** - Placas de desarrollo
- **Actuators** - Actuadores
- **Sensors** - Sensores
- **Thing Editor** - Editor de dispositivos
- Reglas visuales
- Programación
- Plantillas para crear dispositivos propios

### Variables de entorno físico

- Temperatura
- Lluvia
- Nivel de agua
- Viento
- Nieve
- Ciclos temporales

**Referencia:** [Keyboard Shortcuts](https://tutorials.ptnetacad.net/help/default/keyboardShortcuts.htm)

---

## 11. OT / Industrial Automation

La rama 9.0 amplió Packet Tracer para habilidades industriales:

| Componente | Descripción |
|------------|-------------|
| **PLCs** | Controladores lógicos programables |
| **Ladder Logic** | Programación visual |
| **Data Historian** | Registro de datos |
| **PT Industrial Automation App** | Aplicación de automatización |
| **PROFINET** | Protocolo industrial |
| **CIP** | Common Industrial Protocol |
| **Industrial routers/switches** | Networking industrial |
| **Ciberseguridad industrial** | Seguridad OT |

**Referencia:** [What's New](https://tutorials.ptnetacad.net/help/default/whatsNew.htm)

---

## 12. Extensibilidad Oficial

Tres superficies de extensión:

### Script Modules
- JavaScript/ECMAScript

### Extensions API / IPC
- API pública para extensiones

### PT-Python
- Scripting de dispositivos

### API Pública documenta acceso a:

- Red
- Simulación
- Multiuser
- Hardware factory
- Opciones
- Objetos de dispositivos/puertos

**Referencia:** [Script Modules](https://tutorials.ptnetacad.net/help/default/scriptModules_scriptEngine.htm)

---

## 13. Preferencias, Logging y Archivos

Configuraciones adicionales:

- Preferencias de UI
- Etiquetas
- Luces
- Cable length effects
- Logging de comandos IOS
- Idioma
- Color scheme
- Interface locking
- Guardado PKT/PKA/PKZ
- Compatibilidad entre versiones

**Referencia:** [Settings and Preferences](https://tutorials.ptnetacad.net/help/default/preferences.htm)

---

## Catálogo Verificado de Dispositivos

### Categorías Principales

La UI oficial expone estas familias:

| Categoría | Descripción |
|-----------|-------------|
| **Routers** | Enrutadores |
| **Switches** | Conmutadores |
| **Hubs** | Concentradores |
| **Wireless Devices** | Dispositivos inalámbricos |
| **Security** | Seguridad (firewalls, etc.) |
| **WAN Emulation** | Emulación WAN |
| **End Devices** | Dispositivos finales |
| **Home** | Hogar IoT |
| **Smart City** | Ciudad inteligente |
| **Industrial** | Industrial |
| **Power Grid** | Red eléctrica |
| **Boards** | Placas IoT |
| **Actuators** | Actuadores IoT |
| **Sensors** | Sensores IoT |
| **Connections** | Conexiones |
| **Miscellaneous** | Misceláneos |
| **Multiuser Connection** | Conexión multiusuario |
| **Structured Cabling** | Cableado estructurado |

---

### Routers Confirmados

| Modelo | Notas |
|--------|-------|
| ISR4321 | ISR serie 4000 |
| ISR4331 | ISR serie 4000 |
| 1941 | ISR G2 |
| 2901 | ISR G2 |
| 2911 | ISR G2 |
| 819 | Router celular |
| 829 | Router celular |
| CGR1240 | Industrial |
| Router-PT | Genérico |
| 1841 | ISR |
| 2620XM | Serie 2600 |
| 2621XM | Serie 2600 |
| 2811 | ISR |
| IR-8340 | Industrial (v9.0) |
| IR-1101 | Industrial |
| C8200 | Nuevo en v9.0 |

**Referencia:** [Devices and Modules: Routers](https://tutorials.ptnetacad.net/help/default/devicesAndModules_routers.htm)

---

### Switches Confirmados

| Modelo | Notas |
|--------|-------|
| 3560-24PS | Multilayer con PoE |
| 3650-24PS | Multilayer con PoE |
| IE2000 | Industrial |
| 2950-24 | L2 legacy |
| 2950T-24 | L2 legacy |
| IE-3400 | Industrial |
| IE-9320 | Industrial |
| 2960 | Confirmado en FAQ |
| Bridge-PT | Genérico |

**Referencia:** [Devices and Modules: Switches](https://tutorials.ptnetacad.net/help/default/devicesAndModules_switches.htm)

---

### End Devices Confirmados

| Dispositivo | Tipo |
|-------------|------|
| PC-PT | Computadora |
| Laptop-PT | Portátil |
| Server-PT | Servidor |
| Meraki-Server | Servidor cloud |
| Network Controller | Controlador |
| Printer-PT | Impresora |
| 7960 IP Phone | Teléfono IP |
| Home-VoIP-PT | VoIP residencial |
| Analog-Phone-PT | Teléfono analógico |
| TV-PT | Televisión |
| TabletPC-PT | Tablet |
| SMARTPHONE-PT | Smartphone |
| WirelessEndDevice-PT | Dispositivo inalámbrico |
| WiredDevice-PT | Dispositivo cableado |
| Sniffer | Analizador de red |
| DataHistorianServer | Industrial |
| CyberObserver | Seguridad industrial |

**Referencia:** [Devices and Modules: End Devices](https://tutorials.ptnetacad.net/help/default/devicesAndModules_endDevices.htm)

---

### Wireless / Seguridad / WAN / Otros

| Dispositivo | Categoría |
|-------------|-----------|
| Repeater-PT | Wireless |
| CoAxialSplitter-PT | Conectividad |
| Meraki-MX65W | Firewall inalámbrico |
| LAP-PT | Access Point ligero |
| Aironet 3702i | Access Point |
| WLC-PT | Controlador inalámbrico |
| WLC-3504 | Controlador inalámbrico |
| WLC-2504 | Controlador inalámbrico |
| Home Router | Router residencial |
| AccessPoint-PT | AP genérico |
| AccessPoint-PT-A | AP 802.11a |
| AccessPoint-PT-AC | AP 802.11ac |
| AccessPoint-PT-N | AP 802.11n |
| WRT300N | Router inalámbrico |
| Home Gateway | Gateway residencial |
| Cell Tower | Torre celular |
| Central Office Server | Oficina central |
| Cloud-PT | Nube |
| DSL-Modem-PT | Módem DSL |
| Cable-Modem-PT | Módem cable |
| ASA 5505 | Firewall |
| ASA 5506 | Firewall |
| ISA-3000 | Seguridad industrial |

**Referencia:** [Devices and Modules: Other Devices](https://tutorials.ptnetacad.net/help/default/devicesAndModules_others.htm)

---

## Fases de Implementación Recomendadas

### Fase 1 — MVP Útil (80% del valor)

Automatiza primero:

1. **Workspace lógico** - Canvas de topologías
2. **Catálogo de dispositivos** - Inventario con modelos
3. **Motor de puertos/módulos** - Slots y compatibilidad
4. **Conexiones** - Tipos de cable y validación
5. **Configuración mínima GUI/CLI** - IOS básico
6. **Simulador básico PDUs/eventos** - Trazado simple

Esto ya da el **80% del valor práctico** para redes académicas y topologías CCNA.

---

### Fase 2 — Valor Diferencial

Luego añade:

1. **Save/Load tipo PKT/PKZ** - Persistencia
2. **Plantillas** - Reutilización
3. **Filtros** - Depuración
4. **Búsqueda de dispositivos** - Navegación
5. **Compatibilidad de puertos** - Validación avanzada
6. **Modelo de evaluación** - Activity Wizard para enseñanza

---

### Fase 3 — Lo Pesado

Después vendrían:

1. **Modo físico** - Contenedores Intercity/City/Building/Closet
2. **Multiuser** - Conexiones peer-to-peer
3. **IoT/Thing Editor** - Dispositivos personalizados
4. **Industrial/OT** - PLCs, Ladder Logic
5. **Meraki web** - Configuración web
6. **Cyber Observer** - Seguridad
7. **Licensing/PT8200** - Licenciamiento
8. **API de extensiones** - Script modules, PT-Python

**Estas áreas existen y son reales en Packet Tracer, pero son las más caras de replicar.**

---

## Arquitectura por Capas

La propia documentación oficial muestra que Packet Tracer es la suma de varios productos:

```
┌─────────────────────────────────────────────────────────┐
│                    PACKET TRACER                        │
├─────────────────────────────────────────────────────────┤
│  1. Editor de topologías                                │
│  2. Inventario de dispositivos + módulos                │
│  3. Conexiones y validación                             │
│  4. Configuración IP/switch/router                      │
│  5. Simulación/PDU/Event List                          │
│  6. Guardado/carga (PKT/PKA/PKZ)                       │
│  7. Evaluación (Activity Wizard)                       │
│  8. IoT/OT/extensiones                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Limitaciones de la Documentación

**Hallazgo importante:** No existe una sola página oficial plana que enumere uno por uno todos los objetos IoT visuales de Home/Smart City/Power Grid como un inventario completo exportable.

Cisco documenta más las **categorías**, las **herramientas de creación** y **varios ejemplos** que un listado exhaustivo único.

---

## Referencias Oficiales

| Tema | URL |
|------|-----|
| Introduction | https://tutorials.ptnetacad.net/help/default/intro.htm |
| Logical Workspace | https://tutorials.ptnetacad.net/help/default/workspace_logical.htm |
| Physical Workspace | https://tutorials.ptnetacad.net/help/default/workspace_physical.htm |
| Devices and Modules | https://tutorials.ptnetacad.net/help/default/devicesAndModules.htm |
| Connections/Links | https://tutorials.ptnetacad.net/help/default/connectionsLinks.htm |
| Operating Modes | https://tutorials.ptnetacad.net/help/default/operatingModes.htm |
| Interface Overview | https://tutorials.ptnetacad.net/help/default/interfaceOverview.htm |
| Multiuser | https://tutorials.ptnetacad.net/help/default/multiuser.htm |
| Keyboard Shortcuts | https://tutorials.ptnetacad.net/help/default/keyboardShortcuts.htm |
| What's New | https://tutorials.ptnetacad.net/help/default/whatsNew.htm |
| Script Modules | https://tutorials.ptnetacad.net/help/default/scriptModules_scriptEngine.htm |
| Preferences | https://tutorials.ptnetacad.net/help/default/preferences.htm |
| Routers | https://tutorials.ptnetacad.net/help/default/devicesAndModules_routers.htm |
| Switches | https://tutorials.ptnetacad.net/help/default/devicesAndModules_switches.htm |
| End Devices | https://tutorials.ptnetacad.net/help/default/devicesAndModules_endDevices.htm |
| Other Devices | https://tutorials.ptnetacad.net/help/default/devicesAndModules_others.htm |

---

## Conclusión

Packet Tracer es un entorno complejo que combina:

1. **Editor** - Diseño de topologías
2. **Simulador** - Motor de PDUs y eventos
3. **Autor de actividades** - Sistema de evaluación
4. **IoT builder** - Dispositivos inteligentes
5. **Entorno OT** - Automatización industrial
6. **Motor multiusuario** - Colaboración
7. **Plataforma extensible** - APIs y scripts

**Recomendación:** No intentar clonar "todo Packet Tracer" al inicio. Implementar por capas, empezando por el MVP que da el 80% del valor para casos académicos y CCNA.
