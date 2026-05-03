# Packet Tracer setup para PT Control

Esta guía explica cómo preparar Cisco Packet Tracer para usarlo con `cisco-auto / PT Control`.

El flujo normal es:

```text
instalar Packet Tracer
crear PT_DEV_DIR
ejecutar bun run pt build
cargar main.js en Packet Tracer
validar con pt doctor / runtime status
usar pt device / link / cmd / verify
```

---

## 1. Instalar Cisco Packet Tracer

Descarga Packet Tracer desde el Resource Hub oficial de Cisco Networking Academy / NetAcad.

Según la guía oficial de Cisco:

- Packet Tracer está disponible para Windows, Linux y macOS.
- Packet Tracer no está disponible para teléfonos o tablets.
- En Linux se instala desde el paquete `.deb`.
- En macOS se instala desde `.dmg`.
- En Windows se instala desde el instalador `.exe`.

No descargues Packet Tracer desde mirrors no oficiales si quieres evitar binarios modificados o versiones incompatibles.

---

## 2. Crear el directorio PT_DEV_DIR

PT Control usa un directorio compartido entre la CLI y Packet Tracer.

Ese directorio contiene:

```
main.js
runtime.js
catalog.js
manifest.json
commands/
in-flight/
results/
logs/
```

Rutas recomendadas:

```
macOS/Linux: ~/pt-dev
Windows:     %USERPROFILE%\pt-dev
Custom:      PT_DEV_DIR=/ruta/absoluta/pt-dev
```

### macOS/Linux

```bash
mkdir -p ~/pt-dev
```

### Windows PowerShell

```powershell
mkdir $env:USERPROFILE\pt-dev
```

### Ruta personalizada

macOS/Linux:

```bash
export PT_DEV_DIR=/ruta/absoluta/pt-dev
```

Windows PowerShell:

```powershell
$env:PT_DEV_DIR="C:\Users\<usuario>\pt-dev"
```

Para evitar confusión, usa rutas absolutas.

---

## 3. Generar runtime para Packet Tracer

Desde la raíz del repo:

```bash
bun install
bun run pt build
```

`bun run pt build` genera y despliega los artefactos necesarios.

### Archivos principales

| Archivo | Rol |
|---------|-----|
| `main.js` | Kernel mínimo: lifecycle, polling, heartbeat, hot-reload |
| `runtime.js` | Dispatcher y handlers de runtime |
| `catalog.js` | Catálogos de dispositivos, cables, módulos y constantes |
| `manifest.json` | Metadata del build/runtime |

### Regla importante:

- No edites los archivos generados en `PT_DEV_DIR`.
- Edita TypeScript fuente y vuelve a ejecutar `bun run pt build`.

---

## 4. Cargar main.js en Packet Tracer

Abre Packet Tracer.

Carga el script generado desde el menú de scripting de Packet Tracer, por ejemplo:

`Extensions / Scripting / Open`

Selecciona:

macOS/Linux:
```
~/pt-dev/main.js
```

Windows:
```
%USERPROFILE%\pt-dev\main.js
```

Si usas `PT_DEV_DIR` personalizado, carga el `main.js` de esa ruta.

---

## 5. Validar que el bridge funciona

Con Packet Tracer abierto y `main.js` cargado:

```bash
bun run pt doctor
bun run pt runtime status --json
```

También puedes revisar logs:

```bash
bun run pt logs
bun run pt runtime logs
```

Un estado sano normalmente debe indicar que el bridge/runtime está listo, con heartbeat reciente y sin errores críticos.

---

## 6. Primer smoke real

Lista dispositivos:

```bash
bun run pt device list --json
```

Ejecuta un comando IOS si tienes un router/switch:

```bash
bun run pt cmd R1 "show version" --json
```

Ejecuta un comando en PC/Server si tienes un host:

```bash
bun run pt cmd PC1 "ipconfig" --json
```

Valida conectividad:

```bash
bun run pt verify ping PC1 192.168.1.1
```

---

## 7. Cuándo recargar main.js

Después de:

```bash
bun run pt build
```

lee el mensaje final.

Casos comunes:

| Caso | Acción |
|------|--------|
| Cambió `runtime.js` solamente | Normalmente basta el hot-reload |
| Cambió `main.js` | Recarga `main.js` en Packet Tracer |
| Packet Tracer se cerró | Abre PT y vuelve a cargar `main.js` |
| `pt doctor` dice bridge no listo | Revisa si `main.js` está cargado y si `PT_DEV_DIR` coincide |

---

## 8. macOS/Linux/Windows

### macOS

Ruta típica:

```
~/pt-dev
```

Si Packet Tracer no puede acceder al archivo, revisa permisos de la carpeta y vuelve a cargar `main.js`.

### Linux

Ruta típica:

```
~/pt-dev
```

Si instalaste Packet Tracer vía `.deb`, valida que el comando o launcher de Packet Tracer abra correctamente antes de probar la CLI.

### Windows

Ruta típica:

```
%USERPROFILE%\pt-dev
```

Si controlas Packet Tracer en Windows desde otro sistema, usa una carpeta compartida o sincronizada con cuidado. La CLI y Packet Tracer deben ver el mismo `PT_DEV_DIR`.

No mezcles rutas como estas dentro del repo:

```
packages/pt-control/C:/Users/...
apps/pt-cli/C:/Users/...
```

Eso es estado generado accidental y debe ignorarse/eliminarse.

---

## 9. Troubleshooting rápido

### `pt doctor` dice que el bridge no está listo

Ejecuta:

```bash
bun run pt build
bun run pt runtime status --json
bun run pt logs
```

Verifica:

- Packet Tracer está abierto
- `main.js` está cargado
- `PT_DEV_DIR` apunta a la misma carpeta que cargaste en PT
- `main.js`/`runtime.js` existen en `PT_DEV_DIR`

### `runtime status` no responde

Prueba:

```bash
bun run pt logs
```

Luego recarga `main.js` en Packet Tracer.

### El comando IOS devuelve output vacío

Prueba con JSON:

```bash
bun run pt cmd R1 "show version" --json
```

Si es un comando largo:

```bash
bun run pt cmd SW1 "show interfaces" --complete --json
```

Revisa en el JSON: `ok`, `status`, `error`, `warnings`, `evidence`, `timings`.

### Packet Tracer muestra el comando, pero la CLI no captura output

Revisa logs:

```bash
bun run pt logs
bun run pt runtime logs
```

Luego valida un comando pequeño:

```bash
bun run pt cmd R1 "show clock" --json
```

Si el comando pequeño funciona y el largo no, usa `--complete` cuando aplique.

### Cambié código y nada cambió en PT

Ejecuta:

```bash
bun run pt build
```

Si `main.js` cambió, recárgalo en Packet Tracer.

Si solo cambió `runtime.js`, espera hot-reload o revisa `runtime status`.

---

## 10. Checklist de setup

- [ ] Packet Tracer instalado desde Cisco/NetAcad
- [ ] Repo instalado con `bun install`
- [ ] `PT_DEV_DIR` creado
- [ ] `bun run pt build` ejecutado
- [ ] `main.js` cargado en Packet Tracer
- [ ] `bun run pt doctor` pasa o explica el problema
- [ ] `bun run pt runtime status --json` responde
- [ ] `bun run pt device list --json` responde
- [ ] `bun run pt cmd <device> "show version" --json` responde

---

## 11. Comandos útiles

```bash
bun run pt --help
bun run pt build
bun run pt doctor
bun run pt runtime status --json
bun run pt logs
bun run pt runtime logs
bun run pt device list --json
bun run pt link list --json
bun run pt cmd <device> "show version" --json
bun run pt verify ping <source> <target>
```

---

## 12. Regla de oro

No declares que Packet Tracer está funcionando solo porque `bun test` pasa.

Para validar Packet Tracer real necesitas evidencia de:

- `pt doctor`
- `pt runtime status`
- `pt device list`
- `pt cmd`
- `pt verify`
- `logs`
