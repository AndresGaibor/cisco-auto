# cisco-auto — Product Requirements Document

## 1. Visión General

### 1.1 Propósito
cisco-auto es una herramienta de automatización para configurar laboratorios y talleres de Cisco Packet Tracer. Permite a estudiantes de redes (específicamente de ESPOCH) automatizar la configuración de dispositivos Cisco mediante análisis de archivos de laboratorio o definición declarativa de topologías.

### 1.2 Objetivos
- Reducir el tiempo de configuración de labs complejos de 30-45 minutos a menos de 2 minutos
- Minimizar errores humanos en configuraciones repetitivas
- Proveer validación automática de que un lab está correctamente configurado
- Soportar tanto CLI como API para integración con otros sistemas

### 1.3 Alcance
**Incluido:**
- Configuración automática de dispositivos Cisco vía SSH/Telnet
- Soporte para protocolos: VLANs, STP, VTP, EtherChannel, OSPF, EIGRP, BGP, ACLs, NAT, VPN
- Parseo de archivos .pkt (versiones descomprimibles)
- Definición de topologías vía YAML/JSON
- Validación de configuraciones aplicadas
- Reportes de estado y configuraciones

**Excluido:**
- Edición directa de archivos .pka encriptados (limitación técnica de Packet Tracer 8.x)
- Interfaz gráfica (GUI) — CLI y API REST únicamente
- Simulación de tráfico de red

### 1.4 Stakeholders
- **Usuario principal:** Estudiantes de Redes de Computadores (ESPOCH)
- **Usuario secundario:** Instructores que necesitan verificar labs
- **Mantenedor:** Desarrollador del proyecto

---

## 2. Requisitos Funcionales

### 2.1 Categoría: Parseo de Laboratorios

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| F1.1 | El sistema debe parsear archivos `.pkt` de Packet Tracer (versiones 7.x y anteriores) | Alta |
| F1.2 | El sistema debe soportar definición de topología vía archivos YAML | Alta |
| F1.3 | El sistema debe detectar dispositivos (routers, switches, PCs) y sus propiedades | Alta |
| F1.4 | El sistema debe detectar conexiones entre dispositivos | Media |
| F1.5 | El sistema debe extraer instrucciones del lab si están disponibles | Baja |

### 2.2 Categoría: Generación de Configuraciones

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| F2.1 | Generar configuraciones VLAN (creación, asignación de puertos, trunking) | Alta |
| F2.2 | Generar configuraciones VTP (server, client, transparent, dominio) | Alta |
| F2.3 | Generar configuraciones EtherChannel (PAgP, LACP) | Media |
| F2.4 | Generar configuraciones STP (Root bridge, PortFast, BPDU Guard) | Media |
| F2.5 | Generar configuraciones OSPF (single area, multi-area, stub, NSSA) | Alta |
| F2.6 | Generar configuraciones EIGRP (AS, autenticación, summarization) | Alta |
| F2.7 | Generar configuraciones BGP (peerings, atributos, route-maps) | Media |
| F2.8 | Generar ACLs (standard, extended, named, reflexive) | Alta |
| F2.9 | Generar configuraciones NAT (static, dynamic, PAT, NAT overload) | Alta |
| F2.10 | Generar configuraciones VPN (IPsec site-to-site, GRE tunnels) | Media |
| F2.11 | Generar configuraciones IPv6 (direccionamiento, routing) | Media |
| F2.12 | Soportar templates de comandos versionados por IOS (12.x, 15.x, 16.x) | Media |

### 2.3 Categoría: Despliegue

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| F3.1 | Conectar a dispositivos vía SSH (puerto 22) | Alta |
| F3.2 | Fallback a Telnet si SSH no está disponible | Media |
| F3.3 | Aplicar configuraciones en paralelo a múltiples dispositivos | Alta |
| F3.4 | Manejar errores de conexión y timeout | Alta |
| F3.5 | Guardar configuración en NVRAM después de aplicar (`write memory`) | Alta |
| F3.6 | Soportar modo dry-run (mostrar comandos sin ejecutar) | Media |

### 2.4 Categoría: Validación

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| F4.1 | Verificar conectividad básica (ping entre dispositivos) | Alta |
| F4.2 | Verificar estado de interfaces (up/down) | Alta |
| F4.3 | Verificar tablas de routing | Media |
| F4.4 | Verificar VLANs configuradas correctamente | Media |
| F4.5 | Verificar vecinos OSPF/EIGRP/BGP establecidos | Media |
| F4.6 | Verificar ACLs aplicadas correctamente | Baja |
| F4.7 | Generar reporte de validación con checkmarks | Media |

### 2.5 Categoría: Interfaz CLI

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| F5.1 | Comando `parse` para analizar archivo .pkt/yaml | Alta |
| F5.2 | Comando `config` para generar configuraciones | Alta |
| F5.3 | Comando `deploy` para aplicar configuraciones a dispositivos | Alta |
| F5.4 | Comando `verify` para validar lab completado | Alta |
| F5.5 | Flags: `--dry-run`, `--verbose`, `--parallel`, `--timeout` | Media |
| F5.6 | Soporte de colores en salida terminal | Baja |

### 2.6 Categoría: API REST

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| F6.1 | Endpoint POST `/api/labs/parse` - Subir y parsear archivo | Media |
| F6.2 | Endpoint POST `/api/labs/deploy` - Desplegar configuraciones | Media |
| F6.3 | Endpoint GET `/api/labs/:id/status` - Estado del lab | Media |
| F6.4 | Endpoint POST `/api/labs/:id/verify` - Validar lab | Media |
| F6.5 | Documentación OpenAPI/Swagger de los endpoints | Baja |

---

## 3. Requisitos No Funcionales

### 3.1 Rendimiento
- Tiempo de parseo de archivo .pkt < 2 segundos
- Tiempo de generación de configuraciones < 1 segundo por dispositivo
- Conexiones en paralelo a hasta 20 dispositivos simultáneos
- Uso de memoria < 256 MB para labs de 50 dispositivos

### 3.2 Seguridad
- No almacenar contraseñas en texto plano (soportar variables de entorno)
- Soportar autenticación SSH con claves privadas
- Validar inputs antes de enviar a dispositivos
- No exponer información sensible en logs

### 3.3 Usabilidad
- CLI intuitivo con mensajes de error claros
- Documentación de comandos integrada (`--help`)
- Configuración mínima requerida para empezar
- Mensajes en español (usuario objetivo es de Ecuador)

### 3.4 Mantenibilidad
- Código 100% TypeScript con tipado estricto
- Cobertura de tests > 80%
- Documentación JSDoc en funciones públicas
- Arquitectura modular por protocolo

### 3.5 Compatibilidad
- Soportar Bun 1.1+
- Soportar Node.js 18+ (fallback)
- Compatibilidad con Packet Tracer 7.x y 8.x
- Compatibilidad con equipos reales Cisco (IOS 12.x, 15.x, 16.x)

---

## 4. Arquitectura del Sistema

### 4.1 Estructura de Carpetas

```
cisco-auto/
├── src/
│   ├── cli/                    # Interfaz de línea de comandos
│   │   ├── index.ts            # Entry point CLI
│   │   ├── commands/
│   │   │   ├── parse.ts
│   │   │   ├── config.ts
│   │   │   ├── deploy.ts
│   │   │   └── verify.ts
│   │   └── utils/
│   │       └── logger.ts
│   │
│   ├── api/                    # Servidor HTTP REST
│   │   ├── index.ts            # Entry point API
│   │   ├── routes/
│   │   │   └── labs.ts
│   │   └── middleware/
│   │       └── error-handler.ts
│   │
│   ├── core/                   # Lógica de negocio
│   │   ├── parser/
│   │   │   ├── pkt-parser.ts       # Parseo de archivos .pkt
│   │   │   ├── yaml-parser.ts      # Parseo de YAML
│   │   │   └── topology-builder.ts # Construcción de topología
│   │   │
│   │   ├── config-generators/      # Generadores de comandos
│   │   │   ├── vlan-generator.ts
│   │   │   ├── routing-generator.ts
│   │   │   ├── security-generator.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── connector/              # Conexión a dispositivos
│   │   │   ├── ssh-connector.ts
│   │   │   ├── telnet-connector.ts
│   │   │   └── connection-pool.ts
│   │   │
│   │   ├── validator/              # Validación de labs
│   │   │   ├── connectivity-checker.ts
│   │   │   ├── config-validator.ts
│   │   │   └── report-generator.ts
│   │   │
│   │   └── types/                  # Tipos compartidos
│   │       ├── device.ts
│   │       ├── topology.ts
│   │       └── config.ts
│   │
│   ├── templates/              # Plantillas de comandos IOS
│   │   ├── ios-12/
│   │   ├── ios-15/
│   │   ├── ios-16/
│   │   └── common/
│   │
│   └── utils/                  # Utilidades
│       ├── file-utils.ts
│       ├── network-utils.ts
│       └── validation.ts
│
├── labs/                       # Archivos de ejemplo
│   ├── vlan-lab.yaml
│   ├── ospf-lab.yaml
│   └── samples/
│
├── tests/                      # Tests
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── docs/                       # Documentación adicional
│   ├── protocolos/
│   └── ejemplos/
│
├── scripts/                    # Scripts auxiliares
│   └── setup.sh
│
├── bunfig.toml                 # Configuración de Bun
├── tsconfig.json               # Configuración TypeScript
├── package.json                # Dependencias
└── README.md
```

### 4.2 Stack Tecnológico

| Componente | Tecnología | Justificación |
|------------|------------|---------------|
| Runtime | Bun 1.1+ | Performance superior a Node.js, nativo TypeScript |
| Lenguaje | TypeScript 5.x | Tipado estático, mejor DX |
| CLI Framework | Commander.js | Estándar de facto para CLIs en Node.js |
| API Framework | Elysia | Optimizado para Bun, alto rendimiento |
| SSH Client | node-ssh | Basado en ssh2, bien mantenido |
| YAML Parser | js-yaml | Estándar, confiable |
| XML Parser | fast-xml-parser | Rápido, soporta namespaces |
| Validación | Zod | Validación de schemas TypeScript-first |
| Testing | Bun Test | Built-in en Bun, rápido |
| Logging | Pino | Alto rendimiento, JSON logging |

### 4.3 Diagrama de Flujo

```
┌─────────────────┐
│   Input (.pkt   │
│   o .yaml)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parser Module  │
│  - Extrae       │
│    dispositivos │
│  - Detecta      │
│    protocolos   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Config Generator│
│  - Genera       │
│    comandos IOS │
│  - Aplica       │
│    templates    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Connector     │
│  - SSH/Telnet   │
│  - Aplica       │
│    comandos     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Validator     │
│  - Verifica     │
│    conectividad │
│  - Genera       │
│    reporte      │
└─────────────────┘
```

---

## 5. Casos de Uso

### 5.1 UC-01: Configuración de VLANs en Switches

**Actor:** Estudiante de ESPOCH

**Precondiciones:**
- Tener archivo `vlan-lab.yaml` con definición de VLANs
- Switches accesibles vía SSH con credenciales conocidas

**Flujo principal:**
1. Estudiante ejecuta: `cisco-auto deploy labs/vlan-lab.yaml`
2. Sistema parsea el YAML y detecta 3 switches con VLANs 10, 20, 30
3. Sistema genera comandos para:
   - Crear VLANs en modo VTP server
   - Configurar puertos trunk entre switches
   - Asignar puertos de acceso a VLANs correspondientes
4. Sistema se conecta a cada switch vía SSH y aplica configuración
5. Sistema verifica que las VLANs están creadas y puertos asignados
6. Sistema genera reporte de éxito

**Postcondiciones:**
- Los 3 switches tienen VLANs configuradas
- Puertos trunk operativos entre switches
- PCs en VLANs pueden comunicarse intra-VLAN

### 5.2 UC-02: Despliegue de OSPF Multi-Área

**Actor:** Estudiante de ESPOCH

**Precondiciones:**
- Archivo `ospf-lab.yaml` con topología OSPF
- Routers con IPs configuradas en interfaces

**Flujo principal:**
1. Estudiante ejecuta: `cisco-auto deploy labs/ospf-lab.yaml --verify`
2. Sistema detecta 4 routers con áreas 0, 1, 2
3. Sistema genera comandos OSPF con:
   - Router IDs
   - Network statements por área
   - Configuración de área stub en R2
   - Configuración de NSSA en R3
4. Sistema aplica configuraciones en paralelo
5. Sistema verifica:
   - Vecinos OSPF establecidos (`show ip ospf neighbor`)
   - Rutas aprendidas (`show ip route ospf`)
   - Conectividad end-to-end (ping)
6. Sistema reporta: "OSPF convergido correctamente en 12 segundos"

### 5.3 UC-03: Validación de Laboratorio de Seguridad

**Actor:** Instructor de ESPOCH

**Precondiciones:**
- Lab de seguridad ya configurado por estudiante
- Archivo de checklist `security-checks.yaml`

**Flujo principal:**
1. Instructor ejecuta: `cisco-auto verify labs/security-lab.yaml --checklist security-checks.yaml`
2. Sistema verifica:
   - ACLs aplicadas en interfaces correctas
   - NAT funcionando (traducciones activas)
   - VPN IPsec establecida (`show crypto isakmp sa`)
   - No hay acceso no autorizado (escaneo de puertos)
3. Sistema genera reporte:
   ```
   ✅ ACLs: 5/5 aplicadas correctamente
   ✅ NAT: Traducciones funcionando
   ❌ VPN: Túnel no establecido en R2
   ⚠️  Warning: Telnet habilitado (debe usar SSH)
   ```
4. Instructor usa reporte para retroalimentar al estudiante

---

## 6. API y Interfaces

### 6.1 CLI Commands

```bash
# Parseo de laboratorio
cisco-auto parse <archivo> [--format yaml|json]
  - Analiza archivo .pkt o .yaml
  - Muestra dispositivos detectados
  - Exporta topología en formato legible

# Generación de configuraciones
cisco-auto config <archivo> [--output <dir>] [--ios-version <version>]
  - Genera archivos de configuración IOS
  - Guarda en directorio especificado
  - Soporta diferentes versiones de IOS

# Despliegue
cisco-auto deploy <archivo> [opciones]
  --dry-run         # Muestra comandos sin ejecutar
  --parallel <n>    # Número de conexiones paralelas (default: 5)
  --timeout <s>     # Timeout de conexión (default: 30)
  --verbose         # Salida detallada
  --save-config     # Guardar en NVRAM después de aplicar

# Validación
cisco-auto verify <archivo> [--checklist <file>]
  - Verifica que el lab está correctamente configurado
  - Opcionalmente usa checklist personalizado
  - Genera reporte de resultados

# Información
cisco-auto --version
cisco-auto --help
cisco-auto protocols  # Lista protocolos soportados
```

### 6.2 API REST Endpoints

```http
# Parsear laboratorio
POST /api/labs/parse
Content-Type: multipart/form-data
file: <archivo.pkt o .yaml>

Response 200:
{
  "labId": "uuid",
  "devices": [...],
  "topology": {...},
  "protocols": ["vlan", "ospf"]
}

# Desplegar configuraciones
POST /api/labs/deploy
{
  "labId": "uuid",
  "credentials": {
    "username": "admin",
    "password": "${ENV_PASSWORD}",
    "sshKey": "${ENV_SSH_KEY}"
  },
  "options": {
    "parallel": 5,
    "dryRun": false,
    "saveConfig": true
  }
}

Response 200:
{
  "deploymentId": "uuid",
  "status": "in_progress|completed|failed",
  "results": [...]
}

# Obtener estado de despliegue
GET /api/labs/:labId/status

Response 200:
{
  "labId": "uuid",
  "status": "deployed",
  "devicesConfigured": 5,
  "devicesTotal": 5,
  "errors": []
}

# Validar laboratorio
POST /api/labs/:labId/verify
{
  "checklist": "optional-checklist.yaml"
}

Response 200:
{
  "passed": true|false,
  "checks": [
    {"name": "VLANs", "passed": true, "details": "..."},
    {"name": "OSPF", "passed": false, "details": "..."}
  ]
}

# Health check
GET /api/health

Response 200:
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600
}
```

---

## 7. Riesgos y Mitigaciones

| ID | Riesgo | Probabilidad | Impacto | Estrategia de Mitigación |
|----|--------|--------------|---------|-------------------------|
| R1 | Archivos .pka de Packet Tracer 8.x están encriptados y no parseables | Alta | Alto | Implementar YAML como formato de entrada principal; documentar workaround con ptexplorer para .pkt antiguos |
| R2 | Diferencias de sintaxis entre versiones de IOS (12.x vs 15.x vs 16.x) | Media | Alto | Sistema de templates versionados; detectar versión automáticamente o permitir especificarla |
| R3 | Cambios en futuras versiones de Packet Tracer | Baja | Media | Arquitectura modular que permita cambiar el parser sin afectar el resto del sistema |
| R4 | Equipos de laboratorio no accesibles vía SSH (solo consola) | Media | Alto | Implementar fallback a Telnet; documentar cómo habilitar SSH en equipos Cisco |
| R5 | Timeouts en conexiones SSH por red lenta | Media | Medio | Configurar timeouts ajustables; implementar retry con backoff exponencial |
| R6 | Comandos IOS inválidos generados por bug | Baja | Alto | Testing exhaustivo; validación de comandos contra regex conocidos; modo dry-run obligatorio |
| R7 | Fuga de credenciales en logs o archivos | Baja | Crítico | Nunca loggear contraseñas; usar variables de entorno; enmascarar credenciales en output |
| R8 | Race conditions en despliegue paralelo | Media | Medio | Pool de conexiones limitado; orden de dependencias respetado (ej: switches antes que routers) |

---

## 8. Roadmap

### Fase 1: Fundamentos (Semanas 1-2)
- [ ] Setup del proyecto Bun + TypeScript
- [ ] Configuración de testing y CI
- [ ] Estructura de carpetas modular
- [ ] Sistema de logging

**Entregable:** Proyecto base funcional con tests pasando

### Fase 2: Parser y Topología (Semanas 3-4)
- [ ] Parser de archivos YAML
- [ ] Modelado de topología (dispositivos, conexiones)
- [ ] Validación de schemas con Zod
- [ ] Tests unitarios del parser

**Entregable:** Sistema que puede parsear archivos YAML y construir topología en memoria

### Fase 3: VLANs y Switching (Semanas 5-6)
- [ ] Generador de configuraciones VLAN
- [ ] Generador de configuraciones VTP
- [ ] Generador de EtherChannel
- [ ] Templates de comandos IOS para switching

**Entregable:** Soporte completo para configuración de VLANs

### Fase 4: Conectividad SSH (Semanas 7-8)
- [ ] Módulo de conexión SSH
- [ ] Módulo de conexión Telnet (fallback)
- [ ] Pool de conexiones paralelas
- [ ] Manejo de errores y retries

**Entregable:** Capacidad de conectar y ejecutar comandos en dispositivos reales

### Fase 5: CLI Interfaz (Semanas 9-10)
- [ ] Comando `parse`
- [ ] Comando `config`
- [ ] Comando `deploy`
- [ ] Flags y opciones de CLI

**Entregable:** CLI funcional que permite desplegar configuraciones

### Fase 6: Routing Protocols (Semanas 11-12)
- [ ] Generador OSPF (single y multi-area)
- [ ] Generador EIGRP
- [ ] Generador BGP (básico)
- [ ] Templates de routing

**Entregable:** Soporte para OSPF, EIGRP y BGP

### Fase 7: Seguridad (Semanas 13-14)
- [ ] Generador de ACLs
- [ ] Generador de NAT
- [ ] Generador de VPN IPsec
- [ ] Validaciones de seguridad

**Entregable:** Soporte para ACLs, NAT y VPN

### Fase 8: API REST (Semanas 15-16)
- [ ] Servidor HTTP con Elysia
- [ ] Endpoints REST
- [ ] Documentación OpenAPI
- [ ] Tests de integración

**Entregable:** API REST funcional

### Fase 9: Validación y Testing (Semana 17)
- [ ] Sistema de validación de labs
- [ ] Reportes de verificación
- [ ] Tests de integración end-to-end
- [ ] Documentación completa

**Entregable:** v1.0 completa con todas las funcionalidades

---

## 9. Métricas de Éxito

| Métrica | Objetivo | Cómo Medir |
|---------|----------|------------|
| Tiempo de configuración de VLANs | < 2 minutos (vs 30 min manual) | Benchmark con labs de referencia |
| Tasa de éxito en configuraciones | > 95% | Logs de despliegue |
| Cobertura de tests | > 80% | Reporte de cobertura |
| Tiempo de respuesta API | < 500ms | Monitoring |
| Usuarios activos | > 10 estudiantes | Feedback de ESPOCH |

---

## 10. Glosario

- **ACL:** Access Control List - Lista de control de acceso
- **BPDU:** Bridge Protocol Data Unit
- **EIGRP:** Enhanced Interior Gateway Routing Protocol
- **ESPOCH:** Escuela Superior Politécnica de Chimborazo
- **IOS:** Internetwork Operating System (sistema operativo Cisco)
- **NAT:** Network Address Translation
- **OSPF:** Open Shortest Path First
- **PAgP:** Port Aggregation Protocol
- **PAT:** Port Address Translation
- **STP:** Spanning Tree Protocol
- **VLAN:** Virtual Local Area Network
- **VTP:** VLAN Trunking Protocol

---

**Documento version:** 1.0  
**Fecha:** 2026-03-16  
**Autor:** iFlow CLI / Claude
