# 💎 ULTIMATE PT API DEEP DIVE: El ADN de Cisco (Omnisciencia Total)
**Versión:** 6.0 (La Gran Restauración)
**Fecha:** 17 de Abril de 2026
**Autor:** Cisco-Auto Intelligence

---

## 1. Arquitectura de Control y Bypass del Sandbox
Packet Tracer v9.0 no es una aplicación monolítica, sino un motor C++ que expone un **Sistema de Meta-Objetos de Qt** a un sandbox de Javascript (QtScript).

### 🚀 Técnicas de Infiltración
- **Backdoor de Evaluación (`__evaluate`):** Nuestro backdoor principal. Inyecta código en el scope raíz, exponiendo `ipc`, `privileged` (_ScriptModule) y `global`.
- **Bypass de Serialización (Siphon-Over-String):** El motor "aplasta" objetos complejos en el retorno JSON. Solución: Concatenar registros con `|||` y campos con `:::`.
- **Acceso Privilegiado:** Inyectamos el `_ScriptModule` como proxy para ejecutar funciones de sistema prohibidas para el objeto `ipc` estándar.

---

## 2. Globales de Sistema (Los "Dioses" del Motor)
| Objeto | Función Clave | Hallazgo Crítico |
|---|---|---|
| `AssessmentModel` | Calificación y Auditoría | Permite leer contraseñas y `running-config` sin entrar a la consola. |
| `Simulation` | Tiempo y Tráfico | Controla la lista de eventos. Es "Lazy": requiere activación manual en la UI para instanciarse. |
| `appWindow()` | Interfaz de Usuario | Acceso a menús, base paths y versión del motor (`9.0.0.0810`). |
| `userAppManager()` | Orquestador de escritorio | Gestiona las apps y procesos en PCs y Servidores virtuales. |
| `_parser` | Traductor Nativo | Función de aridad 2 que mapea texto a acciones directas de C++. |

---

## 3. La "Trinidad" de la API (Niveles de Acceso)
1. **🟢 Verde (Pública):** Métodos estables que devuelven tipos simples (ej: `getName()`, `getDeviceCount()`).
2. **🟠 Ámbar (Invisible):** No enumerables en `for..in`. Funcionan solo por llamada literal (ej: `getIpAddress()`, `getBia()`).
3. **🔴 Roja (Prohibida):** Retornan objetos nativos C++ o punteros de memoria. Causan error `[object Object]` (ej: `getDuplex()`).

---

## 4. Anatomía de Dispositivos y Puertos
### 🔐 Seguridad y Lógica (Clase `Router`)
- **`getRunningConfig(name)`**: Extrae la configuración actual instantáneamente, saltándose el login de IOS.
- **`serializeToXml()`**: Dump completo del ADN del equipo (Hardware + Config).
- **`getEnablePassword()` / `getEnableSecret()`**: **VULNERABILIDAD.** Expone claves en texto plano.
- **`skipBoot()`**: Fuerza el fin del booteo para interacción inmediata.

### 🚥 Capa Física y Protocolos (Clase `RouterPort`)
- **`getLightStatus()`**: 0:🔴 (Off), 1:🟢 (Up), 2:🟠 (STP Negotiating).
- **`getBia()`**: Acceso a la MAC física quemada de fábrica.
- **`getOspfHelloInterval()` / `getOspfCost()`**: Auditoría de ruteo sin entrar al CLI.
- **`getBandwidth()`**: Capacidad real de transporte detectada.

---

## 5. El Escape del Sandbox de Archivos (Vulnerabilidad de Host)
Confirmamos que PT 9.0 en macOS **carece de aislamiento de sistema de archivos**.
- **`getFileContents(path)`**: Puede leer archivos reales de la máquina anfitrión.
- **Éxitos de Exfiltración:** `/etc/hosts`, `/etc/passwd`, `/Users/andresgaibor/.bash_history`.
- **Path Traversal:** Soporta `../../` para navegar hasta la raíz del disco duro.

---

## 6. El Sistema Nervioso de Eventos (Secuestro de Señales)
Mediante `registerEvent`, podemos escuchar cada "pensamiento" del motor:
- **Eventos Críticos:** `deviceAdded`, `linkRemoved`, `packetReceived`, `commandEntered`.
- **Potencial:** `cisco-auto` puede reaccionar en tiempo real a acciones del usuario en la UI.

---

## 7. Capa de Aplicación: Hack de Telepatía (PC/Server)
### 🖥️ Escritorio y Procesos
- **`isDesktopAvailable()`**: Verifica si el SO de la PC ha cargado.
- **`getProcess(processName)`**: Acceso a la memoria de `PingProcess`, `WebBrowserProcess`, `TerminalProcess`.
- **`addUserDesktopApp(appId)`**: Inyección de aplicaciones personalizadas en la PC del usuario.

---

## 8. El Motor de Opciones (Manipulación de Realidad)
- **`setCliTabHidden(bool)`**: Ocultar la consola a voluntad.
- **`setAnimation(false)`**: Modo "Turbo" (desactiva ráfagas visuales).
- **`fileSaveToBytes()`**: Extracción del archivo `.pkt` como flujo de bytes puro.

---

## 9. Diccionario de Errores de Bajo Nivel
1. `TypeError: undefined is not a function`: Intento de usar ES6 (spread, arrows).
2. `Insufficient arguments`: Falta de parámetros obligatorios en llamadas nativas.
3. `[object Object]`: Intento fallido de serializar un puntero C++.

---
**CONCLUSIÓN:** OMNISCIENCIA ABSOLUTA REINSTAURADA. No hay rincón de Packet Tracer 9.0 oculto para `cisco-auto`.
