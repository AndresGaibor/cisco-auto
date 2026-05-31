# PT Collab — Guía de uso

PT Collab permite sincronizar cambios de configuración IOS entre múltiples instancias de Packet Tracer en tiempo real, usando Tailscale Funnel para exponer el servidor.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        HOST (Mac/Linux)                     │
│  bun run pt collab start                                    │
│       │                                                     │
│       ├── PT abierto + main.js cargado                       │
│       ├── Funnel: puerto 8443 → localhost:3937               │
│       └── URL pública: https://host.ts.net:8443/collab/s/xxx │
└─────────────────────────────────────────────────────────────┘
                    ▲ sync (delta.ack / delta.commit)
                    │
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Windows)                         │
│  bun run pt collab connect <url>                            │
│       │                                                     │
│       ├── PT abierto + main.js cargado                       │
│       └── Mismo lab abierto localmente                       │
└─────────────────────────────────────────────────────────────┘
```

El servidor NO abre automáticamente el checkpoint en el cliente. Ambos peers deben tener Packet Tracer abierto con el mismo laboratorio antes de sincronizar.

---

## Requisitos

- Packet Tracer instalado en todos los peers
- Tailscale instalado y autenticado en la máquina host (para Funnel)
- `bun run pt build` ejecutado previamente
- Red entre peers (mismo Tailscale network o acceso a la URL del host)

---

## Flujo: Host

### 1. Abre Packet Tracer y carga main.js

```
File → Extensions → Scripting → Open → ~/pt-dev/main.js
```

### 2. Verifica que el bridge está listo

```bash
bun run pt doctor
bun run pt device list --json
```

### 3. Inicia el servidor collab

```bash
bun run pt collab start
```

Verás algo como:

```
PT Collab iniciado.

Comparte esta URL con los colaboradores:

  https://andress-macbook-air.tail4a8b59.ts.net:8443/collab/s/ijjhtmlldmig

Cuando terminen, cierra esta terminal con Ctrl+C.
```

### 4. Comparte la URL

Envía la URL al colaborador. Esta URL es pública a través de Tailscale Funnel.

---

## Flujo: Cliente (Windows/Linux/Mac)

### 1. Abre Packet Tracer y carga main.js

Igual que en el host — abre PT y carga `~/pt-dev/main.js` (o `%USERPROFILE%\pt-dev\main.js` en Windows).

### 2. Verifica que el bridge está listo

```bash
bun run pt doctor
bun run pt device list --json
```

### 3. Conecta a la sesión

```bash
bun run pt collab connect https://andress-macbook-air.tail4a8b59.ts.net:8443/collab/s/ijjhtmlldmig
```

Si es la primera vez, la URL se guarda. Las siguientes veces puedes usar:

```bash
bun run pt collab connect  # usa la URL guardada
```

Para cambiar la URL guardada:

```bash
bun run pt collab connect <nueva-url> --reset-url
```

### 4. Mensaje de confirmación

```
Conectado a PT Collab.
Checkpoint inicial: abierto cp_xxx
Peers: 1
Sincronización: activa
```

Si ves `Checkpoint inicial: error`, revisa la sección de errores comunes abajo.

---

## Requisitos del laboratorio

**Importante**: Ambos peers (host y cliente) deben tener el mismo archivo `.pkt` abierto en Packet Tracer ANTES de conectar.

PT Collab sincroniza **comandos IOS** (cambios de configuración), no la topología ni los archivos `.pkt` directamente. Si un peer tiene un laboratorio diferente, los comandos IOS aplicados pueden no tener efecto o generar errores.

### Opción recomendada

1. Host abre su laboratorio en PT
2. Host ejecuta `bun run pt collab start`
3. Cliente abre el mismo laboratorio en PT (mismo `.pkt`)
4. Cliente ejecuta `bun run pt collab connect <url>`
5. Ambos peers editan configuración IOS y ven los cambios sincronizados

---

## Errores comunes

### `project.open failed`

**Causa**: El cliente intenta abrir un checkpoint pero el bridge no está listo o PT no está abierto.

**Solución**:
1. Verifica que PT esté abierto con `main.js` cargado
2. Ejecuta `bun run pt doctor` para confirmar que el bridge está listo
3. Si PT está cerrado, ábrelo y vuelve a intentar

### `Packet Tracer no encontrado`

**Causa**: La ruta de Packet Tracer no se encontró en el sistema.

**Solución**:
1. Instala Packet Tracer correctamente
2. Verifica que la instalación de Cisco Packet Tracer esté completa
3. En Windows, verifica que el ejecutable esté en `C:\Program Files\Cisco Packet Tracer\bin\PacketTracer.exe` o similar

### `topology.snapshot primitive failed: Timeout`

**Causa**: El servidor no pudo obtener un snapshot de la topología dentro del timeout de 4 segundos.

**Solución**:
1. Esto es normal cuando Packet Tracer está ocupado procesando comandos
2. El sync sigue funcionando — los deltas se siguen aplicando
3. Si los errores persisten, verifica que PT no esté sobrecargado

### `checkpoint no disponible en el servidor`

**Causa**: El servidor no tiene checkpoints guardados todavía.

**Solución**:
1. Esto es normal al inicio de la sesión — los checkpoints se crean automáticamente
2. Los deltas se sincronizan directamente sin necesidad de checkpoint

---

## Comandos útiles

```bash
# Servidor: iniciar collab
bun run pt collab start

# Cliente: conectar a sesión
bun run pt collab connect <url>

# Cliente: conectar con nombre personalizado
bun run pt collab connect <url> --name "PC de Casa"

# Estado de la sesión
bun run pt collab status

# Detener sesión activa
bun run pt collab stop

# Diagnosticar problemas
bun run pt collab doctor

# Reiniciar URL guardada
bun run pt collab reset-url

# Ver peers conectados
bun run pt collab peers --url <url>

# Ver checkpoints del servidor
bun run pt collab checkpoint --room default --list
```

---

## Estructura de archivos

PT Collab crea archivos temporales y de sesión:

```
 Carpeta temporal del sistema (tmpdir)
└── pt-collab-bootstrap/
    └── cp_<timestamp>.pkt    # Checkpoints descargados

 Session file (para reconexiones)
└── .collab-session.json      # URL, puerto, secret, PID

 Host config
└── .collab-host.json         # Secret, última URL, puerto

 Client config
└── .collab-client.json       # Peer ID, nombre, última URL
```

---

## Cómo funciona el sync

El sync se basa en **deltas de comandos IOS**:

1. Cuando aplicas un comando IOS (ej: `configure terminal`, `vlan 10`), se genera un delta
2. El delta se envía al servidor
3. El servidor distribuye el delta a todos los peers conectados
4. Cada peer aplica el delta en su Packet Tracer local
5. El peer envía un `delta.ack` confirmando si se aplicó correctamente

El servidor mantiene un vector de Lamport para ordenar los deltas y detectar conflictos.

---

## Solución de problemas avanzada

### Ver logs de sync

Los logs de sync aparecen en la terminal cuando ejecutas `collab start` o `collab connect`. Busca:

```
[Sync] Enviando cambio local: device.cli.runningConfig.changed
[Sync] Cambio local aceptado y guardado en servidor
[Sync Debug:Query] topology.snapshot primitive failed: Timeout...
```

### Ver estado del bridge

```bash
bun run pt doctor
bun run pt runtime status --json
bun run pt logs
```

### Forzar resync desde checkpoint

```bash
bun run pt collab resync --checkpoint latest --path ./descargados
```

### Diagnosticar problemas de conexión

```bash
bun run pt collab doctor
```

Esto muestra el estado de la sesión, URL guardada, y configuración de Tailscale.

---

## Notas importantes

- El servidor (host) necesita Tailscale para exponer el puerto 8443 públicamente
- El cliente no necesita Tailscale si tiene acceso a la URL pública del host
- PT Collab sincroniza **comandos IOS**, no cambios de topología (agregar/eliminar dispositivos)
- Ambos peers deben tener el mismo `.pkt` abierto para que los comandos tengan efecto
- El checkpoint es opcional — si no hay checkpoint, los deltas se sincronizan directamente