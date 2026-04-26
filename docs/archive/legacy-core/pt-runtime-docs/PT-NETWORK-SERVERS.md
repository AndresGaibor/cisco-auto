# PT 9.0 Network Server APIs

> Documented: 2026-04-15
> Source: Live extraction from PT 9.0.0.0810 console
> Status: 🔴 CRITICAL — Full network stack available from scripts

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
| `start()` | `(): void` | Start HTTP server |
| `stop()` | `(): void` | Stop HTTP server |
| `isListening()` | `(): boolean` | Check if server is listening |
| `addRouteHandler(method, path, handler)` | `(method: string, path: string, handler: function): void` | Add HTTP route |
| `addWebSocketRouteHandler(path, handler)` | `(path: string, handler: function): void` | Add WebSocket route |
| `cleanUp()` | `(): void` | Cleanup resources |
| `setWsMaxAllowedIncomingFrameSize(size)` | `(size: number): void` | Set max WebSocket frame size |
| `setWsMaxAllowedIncomingMessageSize(size)` | `(size: number): void` | Set max WebSocket message size |
| `objectNameChanged` | `(handler: function): void` | Event — fired when object name changes |

### Events

```javascript
httpServer.objectNameChanged(handler)  // Fired when object name changes
```

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

### Example

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