# Checklist Manual de Validación – Packet Tracer V2

---

## Objetivo
Validar, de forma manual y binaria, que Packet Tracer está usando el flujo V2 correcto, con los archivos y layout esperados, y que no quedan rutas legacy activas.

---

### 1. Verifica que el módulo cargado en PT es el V2

- **Acción:** Abre Packet Tracer y ve a `Extensions > Scripting > Debug`.
- **Debes ver:**  
  ```
  === PT Control Module Starting ===
  [OK] PT Control Module initialized
  [INFO] Watching: ~/pt-dev
  [INFO] Runtime: ~/pt-dev/runtime.js
  [INFO] Commands: ~/pt-dev/commands/
  [INFO] In-Flight: ~/pt-dev/in-flight/
  [INFO] Results: ~/pt-dev/results/
  [INFO] Logs: ~/pt-dev/logs/events.current.ndjson
  ```
- **Resultado esperado:** Todas las rutas apuntan a `~/pt-dev/` y muestran los subdirectorios `commands/`, `in-flight/`, `results/`, `logs/`.

---

### 2. Confirma que existen los archivos V2 en `~/pt-dev/`

- **Acción:** En tu terminal, ejecuta:
  ```bash
  ls -la ~/pt-dev/
  ```
- **Debes ver:**  
  - `main.js` y `runtime.js` presentes.
  - Directorios: `commands/`, `in-flight/`, `results/`, `logs/`.

---

### 3. Verifica que el layout de comandos es V2 (no legacy)

- **Acción:**  
  - Abre `~/pt-dev/commands/` y verifica que contiene archivos tipo `*.json` (uno por comando).
  - Abre `~/pt-dev/in-flight/` y `~/pt-dev/results/` (pueden estar vacíos si no hay comandos activos).
- **No debe existir:**  
  - Archivo `command.json` suelto en `~/pt-dev/` (esto es legacy y NO debe estar).
- **Resultado esperado:**  
  - Solo existen archivos individuales por comando en `commands/`, nunca un único `command.json`.

---

### 4. Valida eventos y logs activos

- **Acción:**  
  - Abre el archivo `~/pt-dev/logs/events.current.ndjson`.
- **Debes ver:**  
  - Líneas tipo:  
    ```json
    {"seq":1,"ts":...,"type":"command-enqueued","id":"cmd_...","commandType":"listDevices"}
    ```
- **Resultado esperado:**  
  - El log crece con cada acción CLI/PT, no está vacío ni estancado.

---

### 5. Edge case: Detecta rutas legacy activas (NEGATIVO)

- **Acción:**  
  - Busca en la consola de debug de PT o en `~/pt-dev/` cualquier referencia a:
    - `pt-extension/main.js`
    - `pt-extension/runtime.js`
    - `command.json` (fuera de `commands/`)
- **Resultado esperado:**  
  - **NO** debe aparecer ninguna referencia a `pt-extension/` ni a `command.json` fuera de la carpeta `commands/`.
  - Si aparece, la instalación NO es válida y debe corregirse.

---

## Criterios de éxito

- Todos los pasos anteriores deben cumplirse sin ambigüedad.
- Si algún paso falla, la instalación NO es válida para V2.
