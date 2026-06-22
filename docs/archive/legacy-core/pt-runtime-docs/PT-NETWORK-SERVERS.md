# PT 9.0 Network Server APIs

> Documented: 2026-04-15
> Source: Live extraction from PT 9.0.0.0810 console
> Status: 🔴 CRITICAL — Full network stack available from scripts

---

## ⚠️ ADVERTENCIA IMPORTANTE (Experimentos 37-43, Junio 2026)

Los servidores creados con `$createHttpServer()` y `$createTcpServer()` se ejecutan en el **contexto del motor de scripts de PT**, NO en la red simulada. Esto significa:

- El servidor TCP/HTTP escucha en `0.0.0.0` (host) pero **NO es accesible desde la red simulada de PT** (dispositivos como PC1 no pueden hacer telnet/conexión).
- Para comunicación entre dispositivos PT, usar servicios nativos (HTTP de SRV1, telnet entre routers, etc.)
- `addRouteHandler()` de HttpServer **NO funciona** — todas las combinaciones de argumentos probadas fallan con "Insufficient arguments" (probablemente bug de PT o tipos Qt no expuestos al script engine).
- `addWebSocketRouteHandler(path, method, handler)` **SÍ funciona** con 3 argumentos.

---

## Network Server Factories

All accept **0 arguments** — call without parameters:

```javascript
$createHttpServer()   // → HTTP server object
$createTcpServer()    // → TCP server object
$createTcpSocket()    // → TCP client socket
$createUdpSocket()     // → UDP socket
$createWebSocket()     // → WebSocket client
```

---

## $createHttpServer()

Full HTTP server in PT scripting.

### Methods

| Method | Signature | Description |
|---|---|---|
| `start()` | `(port?: number, callback?: function, ip?: string): string` | Start HTTP server. Retorna "OK". |
| `stop()` | `(): void` | Stop HTTP server |
| `isListening()` | `(): boolean` | Check if server is listening |
| `addRouteHandler(path, method, handler)` | `(path: string, method: string, handler: function): void` | ❌ **NO FUNCIONA** — "Insufficient arguments" |
| `addWebSocketRouteHandler(path, method, handler)` | `(path: string, method: string, handler: function): void` | ✅ **FUNCIONA** con 3 argumentos |
| `cleanUp()` | `(): void` | Cleanup resources |
| `__S0setDevice(device)` | `(device: Device): void` | Set device context |
| `setWsMaxAllowedIncomingFrameSize(size)` | `(size: number): void` | Set max WebSocket frame size |
| `setWsMaxAllowedIncomingMessageSize(size)` | `(size: number): void` | Set max WebSocket message size |
| `objectNameChanged` | `(handler: function): void` | Event — fired when object name changes |

### Detalles de implementación (Experimentos 37-43)

```javascript
var http = $createHttpServer();

// --- start() ---
// 3 firmas probadas:
http.start(80);                    // OK, isListening = false
http.start(8080, function(){});    // OK, isListening = true
http.start(8080, callback, "0.0.0.0");  // OK, isListening = true

// --- addRouteHandler ---
// TODAS fallan con "Insufficient arguments" o "TypeError: Passing incompatible arguments":
http.addRouteHandler("/api", "GET", handler);              // ❌
http.addRouteHandler("/api", "GET", handler, errHandler); // ❌ (incompatible args)
http.addRouteHandler({path:"/api", method:"GET"}, handler);// ❌

// --- addWebSocketRouteHandler ---
// Solo funciona con 3 argumentos:
http.addWebSocketRouteHandler("/ws", "GET", handler);      // ✅ "OK"

// --- __S0setDevice ---
// Asocia el server a un dispositivo:
http.__S0setDevice(ipc.network().getDevice("R1"));         // ✅

// --- isListening ---
// Retorna true DESPUÉS de start(port, callback)
// NOTA: Aunque isListening=true, el puerto NO está accesible desde el host (curl localhost:8080 falla)
http.isListening();  // → true (pero el server está en el espacio de PT, no en el host)

// NOTA: addRouteHandler falla incluso después de __S0setDevice()
```

### Notas de conectividad

- El server escucha **dentro del entorno de simulación de PT** (no en la interfaz de red del host)
- `isListening()=true` pero `curl localhost:8080` → Connection refused (desde host)
- Dispositivos PT (PC1, etc.) tampoco pueden conectarse vía telnet (el server no está en la red simulada)
- **Uso práctico limitado** a menos que se descubra cómo enrutar tráfico desde la simulación

---

## $createTcpServer()

TCP server for accepting connections.

### Methods

| Method | Signature | Description |
|---|---|---|
| `listen(port, ip?)` | `(port: number, ip?: string): void` | Start listening on port |
| `close()` | `(): void` | Close server |
| `isListening()` | `(): boolean` | Check if listening |
| `hasPendingConnections()` | `(): boolean` | Check for pending connections |
| `nextPendingConnection()` | `(): TcpSocket` | Get next pending client socket |
| `getServerIP()` | `(): string` | Get server IP address |
| `getServerPort()` | `(): number` | Get server port |
| `getError()` | `(): number` | Get error code |
| `getErrorString()` | `(): string` | Get error string |
| `cleanUp()` | `(): void` | Cleanup resources |
| `objectNameChanged` | `(handler: function): void` | Event |
| `newConnection` | `(handler: function): void` | Event — fired when client connects |

### Notas de conectividad (Experimentos 37-43)

```javascript
var srv = $createTcpServer();
srv.listen(7070);

srv.getServerIP();    // → "0.0.0.0"
srv.getServerPort();  // → 7070
srv.isListening();    // → true
srv.hasPendingConnections();  // → false

// ⚠️ No se pudo conectar desde un PC de la simulación:
var pc1 = ipc.network().getDevice("PC1");
var cli = pc1.getCommandLine();
cli.enterCommand("telnet 127.0.0.1 7070");  // comando enviado pero no hay conexión

// NOTA: newConnection es un signal de Qt (event), NO una propiedad asignable:
srv.newConnection = function(socket){ ... };  // ❌ TypeError: read-only property
```

### Example (from PT docs, no verificado)

```javascript
var srv = $createTcpServer();
srv.newConnection(function(socket) {
  socket.dataReceived(function(data) {
    dprint("Received: " + data);
  });
});
srv.listen(8080);
dprint("TCP server on 8080");
```

---

## $createTcpSocket()

TCP client socket (also returned by `tcpServer.nextPendingConnection()`).

### Methods

| Method | Signature | Description |
|---|---|---|
| `connect(host, port)` | `(host: string, port: number): void` | Connect to remote host |
| `disconnect()` | `(): void` | Disconnect |
| `sendData(data)` | `(data: string): void` | Send string data |
| `getState()` | `(): string` | → "CONNECTED" / "DISCONNECTED" / "CONNECTING" |
| `getLocalIP()` | `(): string` | Local IP address |
| `getLocalPort()` | `(): number` | Local port |
| `getRemoteIP()` | `(): string` | Remote IP address |
| `getRemoteHost()` | `(): string` | Remote hostname |
| `getRemotePort()` | `(): number` | Remote port |
| `getError()` | `(): number` | Error code |
| `getErrorString()` | `(): string` | Error string |
| `cleanUp()` | `(): void` | Cleanup resources |
| `objectNameChanged` | `(handler: function): void` | Event |
| `dataReceived` | `(handler: function): void` | Event — data: string |
| `stateChanged` | `(handler: function): void` | Event — state: string |

---

## $createUdpSocket()

UDP socket for datagram communication.

### Methods

| Method | Signature | Description |
|---|---|---|
| `begin(port)` | `(port: number): void` | Start UDP on port |
| `stop()` | `(): void` | Stop UDP |
| `sendData(data, host, port)` | `(data: string, host: string, port: number): void` | Send datagram |
| `getLocalIP()` | `(): string` | Local IP address |
| `getLocalPort()` | `(): number` | Local port |
| `getError()` | `(): number` | Error code |
| `getErrorString()` | `(): string` | Error string |
| `joinMulticastGroup(mcastAddr)` | `(addr: string): void` | Join multicast group |
| `leaveMulticastGroup(mcastAddr)` | `(addr: string): void` | Leave multicast group |
| `cleanUp()` | `(): void` | Cleanup resources |
| `objectNameChanged` | `(handler: function): void` | Event |
| `dataReceived` | `(handler: (data: string, host: string, port: number) => void): void` | Event — UDP datagram received |
### Events

```javascript
udp.dataReceived(function(data, host, port) { ... })
```

---

## $createWebSocket()

WebSocket client.

### Methods

| Method | Signature | Description |
|---|---|---|
| `connect(url)` | `(url: string): void` | Connect to WebSocket URL |
| `disconnect()` | `(): void` | Disconnect |
| `sendData(data)` | `(data: string): void` | Send string data |
| `sendBinaryData(data)` | `(data: ArrayBuffer): void` | Send binary data |
| `getState()` | `(): string` | → "CONNECTED" / "DISCONNECTED" / "CONNECTING" |
| `getLocalIP()` | `(): string` | Local IP address |
| `getLocalPort()` | `(): number` | Local port |
| `getRemoteIP()` | `(): string` | Remote IP address |
| `getRemoteHost()` | `(): string` | Remote hostname |
| `getRemotePort()` | `(): number` | Remote port |
| `getError()` | `(): number` | Error code |
| `getErrorString()` | `(): string` | Error string |
| `setWsMaxAllowedIncomingFrameSize(size)` | `(size: number): void` | Set max WebSocket frame size |
| `setWsMaxAllowedIncomingMessageSize(size)` | `(size: number): void` | Set max WebSocket message size |
| `cleanUp()` | `(): void` | Cleanup resources |
| `objectNameChanged` | `(handler: function): void` | Event |
| `dataReceived` | `(handler: function): void` | Event — data: string |
| `binaryDataReceived` | `(handler: function): void` | Event — data: binary |
| `stateChanged` | `(handler: function): void` | Event |

---

## Architecture Implications

**PT can act as:**
- HTTP server (serve REST APIs from PT)
- TCP server (accept socket connections)
- TCP client (connect to external servers)
- UDP sender/receiver (datagrams)
- WebSocket client (real-time communication)

**Use cases:**
- PT as REST API server for external tools
- PT as IoT hub (connect to MQTT brokers via TCP)
- PT as WebSocket client (receive real-time commands)
- Cross-lab communication via TCP

---

## See Also

- `docs/PT-GLOBAL-SCOPE.md` — All 42 undocumented globals
- `docs/PT-API-COMPLETE.md` — Full PT API reference
- `src/pt-api/pt-api-registry.ts` — Type definitions