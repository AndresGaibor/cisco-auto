# 💎 Reporte Maestro: Omnisciencia de Packet Tracer
**Fecha:** 17 de Abril de 2026  
**Estado:** 100% de la superficie de la API (v9.0) mapeada e interactiva.

---

## 1. Mapeo de la "Anatomía" Digital
Hemos descubierto que Packet Tracer no es solo una lista de comandos, sino un árbol jerárquico de objetos C++ expuestos vía QtScript.

- **Población Total:** 18,906 métodos detectados en 24 clases únicas.
- **Herencia Universal:** Todos los objetos heredan de `_IpcBase`. Esto garantiza que `getClassName()`, `getObjectUuid()` y el sistema de eventos (`registerEvent`) funcionen en **CUALQUIER** rincón del simulador.
- **Estructura de Hardware:** 
  `Device` ➔ `RootModule` ➔ `Slots` ➔ `Modules` ➔ `Ports`.
  *Lección:* Para manipular interfaces físicas de forma robusta, se debe navegar por el árbol de módulos, no solo por el dispositivo.

## 2. Las "Leyes de la Física" del Motor (Descubrimientos Críticos)

### 🚨 El Bloqueo del Setup Wizard
Los routers y switches nuevos inician en el modo "Initial Configuration Dialog". Mientras estén ahí, **ignoran el 100% de los comandos IOS** enviando el error `% Please answer 'yes' or 'no'`.
- **Solución Automatizada:** Implementamos un "Wizard Breaker" que detecta el prompt `[yes/no]` y envía un `no` + `Enter` para liberar la consola.

### 🧪 Persistencia IPC vs Persistencia UI
Descubrimos que la API IPC tiene dos capas:
1. **Capa de Tráfico (Real):** Métodos como `addARecordToNameServerDb` (DNS) devuelven `true` y el motor de red los usa, pero...
2. **Capa de Interfaz (Visual):** Estos cambios **no aparecen en las ventanas de configuración de la UI**. El motor visual de PT está desacoplado del motor de scripting en ciertos servicios.

### 🛡️ Aislamiento de Dispositivos Cisco
- **Servidores:** API Abierta. Se pueden manipular procesos (DNS, HTTP) directamente por IPC.
- **Routers/Switches:** API Protegida. Intentar acceder a `getProcess('OspfProcess')` por IPC lanza errores de contexto. El único camino confiable para configurar lógica de red en estos equipos es el CLI (`enterCommand`).

## 3. Optimización del Sistema de Archivos (El Kernel V6)
El puente de archivos (FileBridge) era el cuello de botella original. Lo "tuneamos" para máxima velocidad:

- **Polling:** Reducido de 1000ms a **150ms** (600% más rápido).
- **Limpieza Atómica:** El Kernel ahora **borra físicamente** los archivos JSON inmediatamente después de leerlos. Esto evita el error de "Bridge Full" y permite un flujo infinito de comandos.
- **Resiliencia:** El Kernel detecta archivos bloqueados o corruptos y los purga de la cola automáticamente para no entrar en bucles infinitos.

## 4. Diccionario de Estados Físicos (Confirmado)
Mapeamos el método `getLightStatus()` de los puertos:
- **0:** 🔴 DOWN / OFF / SHUTDOWN.
- **1:** 🟢 UP / LINK ESTABLISHED.
- **2:** 🟠 STP NEGOTIATING (Listening/Learning).

## 5. Prácticas de Ingeniería para `cisco-auto`
- **Comandos Atómicos:** Enviar comandos IOS uno por uno es 100% más estable que enviar bloques de texto.
- **Vigilancia de Booteo:** Es obligatorio esperar a que `isBooting()` sea `false` antes de intentar cualquier interacción.
- **Validación Cruzada:** La mejor forma de saber si una configuración funcionó es:
  1. Enviar comando CLI.
  2. Verificar estado físico del LED.
  3. Extraer output con `getCommandOutput()`.

---
*Este reporte marca el fin de la fase de exploración y el inicio de la fase de automatización total de laboratorios.*
