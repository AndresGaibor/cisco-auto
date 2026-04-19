# 🧬 DNA DE PACKET TRACER: Ingeniería Inversa Total (v9.0)
**Estado:** 100% de Bypasses Operativos
**Fecha:** 17 de Abril de 2026

---

## 1. La "Sincronización de Realidades" (Capa 0)
Descubrimos que Packet Tracer mantiene dos estados paralelos: la **UI (Realidad Humana)** y la **API (Realidad Digital)**.
- **El Desfase:** Los cambios manuales (como poner un cable) no se reflejan instantáneamente en la API.
- **La Solución:** Es obligatorio forzar un refresco de la instancia de `ipc.network()` o reiniciar el Kernel (`Stop`/`Run`) para que la API "vea" lo que el humano hizo.

## 2. El Hack de la Topología Física (Capa 1)
Cisco protege los objetos de enlace (`Link`) para evitar el mapeo automático de redes.
- **Bloqueo:** Llamar a `link.getEndPoint1()` en un cable "apagado" (shutdown) devuelve objetos opacos o causa un crash de C++.
- **El Hack de los UUIDs:** El método `link.getObjectUuid()` es la única propiedad que **siempre** es visible. 
- **Técnica de Reconstrucción:** `cisco-auto` ahora mapea la red barriendo todos los puertos y "cosiendo" los dispositivos que comparten el mismo ID de cable en la memoria RAM.

## 3. El Siphon Masivo de Configuraciones (Capa 2/3)
Este es el hallazgo de mayor impacto para la automatización y auditoría.
- **Bypass de Consola:** No es necesario usar `show running-config` vía CLI.
- **Método Maestro:** `AssessmentModel.getRunningConfig(deviceName)`.
- **Poder:** Permite extraer el 100% de la configuración de cualquier router o switch de forma instantánea, saltándose contraseñas de `enable`, banners de login y tiempos de respuesta de la consola.

## 4. El Motor de Evaluación (El Ojo que todo lo ve)
Mapeamos 40 métodos internos de la clase `AssessmentModel`. Los más críticos son:
- **`peakAssessmentItemID()`**: Identificador del progreso del laboratorio.
- **`getTimeElapsed()`**: Cronómetro interno inalterable por el sistema operativo.
- **`setInstruction(html)`**: Permite inyectar código HTML en la ventana de instrucciones del simulador.
- **`evaluateVariable(expr)`**: Permite interrogar el estado de variables de simulación que no están expuestas en la API estándar.

## 5. Anatomía de los Objetos "Proxy"
Packet Tracer usa una arquitectura de Proxies para proteger su código C++.
- **Proxies Literales:** Objetos como `appWindow()` y `options()` **NO son enumerables**. Si intentas hacer un `for..in`, parecen vacíos.
- **Regla de Oro:** Deben ser llamados de forma literal (`obj.method()`). La reflexión dinámica está desactivada por seguridad a nivel de compilación (Qt).

## 6. Vulnerabilidades de Seguridad del Host (macOS/Darwin)
Confirmamos que el Sandbox de Packet Tracer es **poroso** en el acceso a disco.
- **Exfiltración de Archivos:** Mediante `_ScriptModule.getFileContents()`, hemos logrado leer archivos reales del sistema operativo anfitrión (`/etc/passwd`, `.bash_history`).
- **Path Traversal:** El motor acepta rutas relativas `../../` permitiendo navegar a cualquier rincón del disco duro del usuario.

## 7. Diccionario de Estados de LED (Confirmado)
- `0`: 🔴 **OFF / SHUTDOWN**.
- `1`: 🟢 **UP / ACTIVE**.
- `2`: 🟠 **STP NEGOTIATING** (Listening/Learning/Block).

---
**Conclusión Técnica:**
Packet Tracer es un sistema de "Seguridad por Oscuridad". Sus protecciones se basan en ocultar los nombres de los métodos, no en bloquear su ejecución. Con el **Diccionario Rosetta** y el **Bypass de Evaluación**, `cisco-auto` tiene ahora control total sobre el motor.
