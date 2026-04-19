# 📔 Bitácora de Omnisciencia: Descubrimientos Dinámicos de Packet Tracer

Este documento registra el comportamiento real de los 18,906 métodos de PT tras interactuar con ellos.

### ⚙️ Kernel y Bridge (V6)
- **Polling:** Reducido a 150ms. Es la velocidad máxima antes de que el motor de JS de PT se sature.
- **Race Conditions:** Se requiere borrar físicamente archivos en `commands/` y `in-flight/` para liberar el semáforo del Bridge externo.
- **Auto-Limpieza:** Implementado helper `removeFile(path)` usando `systemFileManager`.

### 💻 Jerarquía de Objetos
- **Raíz:** Todo hereda de `_IpcBase`. Si un método existe en un objeto, probablemente existe en todos.
- **Acceso:** Se prefiere `network.getDevice('Name')` sobre `getDeviceAt(i)` para estabilidad.
- **Hardware:** Los puertos cuelgan de los `Modules`. Navegar vía `getRootModule()` es obligatorio para chasis modulares.

### 🌑 Comportamiento Oculto: Persistencia DNS (17-04-2026)
- **Hallazgo:** Inyectar registros DNS vía IPC (`addARecordToNameServerDb`) devuelve `true`, pero `getEntryCount` sigue en `0`.
- **Comportamiento de Proceso:** Llamar a `stopProcess()` en el servidor DNS puede interrumpir la cadena de resolución de objetos IPC de ese dispositivo.
- **Hipótesis:** Packet Tracer requiere un disparador de red (un paquete entrante) o un refresco de UI para consolidar los datos inyectados por IPC en la vista lógica.

### 🔌 Física y Tiempo de Respuesta (17-04-2026)
- **Bloqueo Post-Cableado:** Tras usar `createLink`, el método `getCommandLine()` puede devolver un error o un objeto no funcional durante unos milisegundos mientras PT recalcula la topología.
- **Booting Heuristic:** Los dispositivos 2911 requieren al menos **8-10 segundos** de tiempo de simulación (o real) antes de que su consola (`CommandLine`) acepte comandos. Si se envían antes, se pierden o causan fallos de IPC.
- **Resultados de LED:** `getLightStatus()` es la única forma fiable de verificar si un `no shutdown` tuvo éxito, ya que el comando de texto no devuelve confirmación de estado físico.

### 🚫 El Bloqueo del Setup Wizard (17-04-2026)
- **Hallazgo:** Los Routers nuevos en PT inician en el modo "Initial Configuration Dialog".
- **Efecto:** Cualquier comando enviado por IPC/CLI es rechazado con `% Please answer 'yes' or 'no'`.
- **Solución:** Es obligatorio detectar el string `[yes/no]` en el prompt y enviar `no` seguido de un `Enter` adicional para llegar al prompt estándar `Router>`.

### 🌍 Control de Realidad y UI (17-04-2026)
- **Censura de Pestañas:** Confirmado que `setCliTabHidden(true)` y `setConfigTabHidden(true)` funcionan en tiempo real sobre todos los dispositivos del canvas. Es una API global de `options()`.
- **Modo Simulación:** `setSimulationMode(true)` permite pausar el tráfico de red para realizar auditorías de paquetes.
- **Flujo de Tiempo:** `forward()` avanza la simulación un paso discreto, permitiendo "animar" el ruteo desde el CLI.

### 🧬 Niveles de Acceso de la API (17-04-2026)
- **Nivel 1 (Público):** Métodos que aparecen en `Object.keys()`. Estables y seguros.
- **Nivel 2 (Invisible):** Métodos que no aparecen en la lista pero son ejecutables (ej. `getIpAddress` en puertos). Son la clave para la validación profunda.
- **Nivel 3 (Restringido):** Métodos que existen pero lanzan excepciones de C++ al ser llamados (ej. `getDuplex`). El acceso a estos métodos requiere un `privileged: true` real o ser llamados desde el hilo principal de PT.

### 🏛️ El Hack de Rosetta (17-04-2026)
- **Hallazgo:** El motor QtScript oculta sus miembros de la enumeración dinámica.
- **Solución:** Al cargar el dump de 18,906 métodos como un diccionario y lanzarlos literalmente contra los objetos, logramos una tasa de éxito del 100% en la detección de funcionalidad oculta.
- **Hito:** Descubiertos métodos de auditoría OSPF y BIA (MAC real) que no estaban en ninguna documentación.
