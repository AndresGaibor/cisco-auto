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

| Method | Description |
|---|---|
| `start()` | Start HTTP server |
| `stop()` | Stop HTTP server |
| `isListening()` | → boolean |
| `addRouteHandler(method, path, handler)` | Add HTTP route |
| `addWebSocketRouteHandler(path, handler)` | Add WebSocket route |
| `cleanUp()` | Cleanup resources |
| `setWsMaxAllowedIncomingFrameSize(size)` | Set max frame size |
| `setWsMaxAllowedIncomingMessageSize(size)` | Set max message size |
| `objectNameChanged` | Event |

### Events

```javascript
httpServer.objectNameChanged(handler)  // Fired when object name changes
```

---

## $createTcpServer()

TCP server for accepting connections.

### Methods

| Method | Description |
|---|---|
| `listen(port, ip?)` | Start listening on port (default all interfaces) |
| `close()` | Close server |
| `isListening()` | → boolean |
| `hasPendingConnections()` | → boolean |
| `nextPendingConnection()` | → TCP Socket (client) |
| `getServerIP()` | → string IP |
| `getServerPort()` | → number port |
| `getError()` | → number error code |
| `getErrorString()` | → string |
| `cleanUp()` | Cleanup |
| `objectNameChanged` | Event |
| `newConnection` | Event fired when client connects |

### Events

```javascript
tcpServer.newConnection(handler)  // (socket) => {}
tcpServer.objectNameChanged(handler)
```

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

| Method | Description |
|---|---|
| `connect(host, port)` | Connect to remote host |
| `disconnect()` | Disconnect |
| `sendData(data)` | Send string data |
| `getState()` | → "CONNECTED" / "DISCONNECTED" / "CONNECTING" |
| `getLocalIP()` | → string |
| `getLocalPort()` | → number |
| `getRemoteIP()` | → string |
| `getRemoteHost()` | → string hostname |
| `getRemotePort()` | → number |
| `getError()` | → number |
| `getErrorString()` | → string |
| `cleanUp()` | Cleanup |
| `objectNameChanged` | Event |
| `dataReceived` | Event (data: string) |
| `stateChanged` | Event (state: string) |

### Events

```javascript
socket.dataReceived(function(data) { ... })
socket.stateChanged(function(state) { ... })
socket.objectNameChanged(handler)
```

---

## $createUdpSocket()

UDP socket for datagram communication.

### Methods

| Method | Description |
|---|---|
| `begin(port)` | Start UDP on port |
| `stop()` | Stop UDP |
| `sendData(data, host, port)` | Send datagram |
| `getLocalIP()` | → string |
| `getLocalPort()` | → number |
| `getError()` | → number |
| `getErrorString()` | → string |
| `joinMulticastGroup(mcastAddr)` | Join multicast group |
| `leaveMulticastGroup(mcastAddr)` | Leave multicast group |
| `cleanUp()` | Cleanup |
| `objectNameChanged` | Event |
| `dataReceived` | Event |

### Events

```javascript
udp.dataReceived(function(data, host, port) { ... })
```

---

## $createWebSocket()

WebSocket client.

### Methods

| Method | Description |
|---|---|
| `connect(url)` | Connect to WebSocket URL |
| `disconnect()` | Disconnect |
| `sendData(data)` | Send string data |
| `sendBinaryData(data)` | Send binary data |
| `getState()` | → "CONNECTED" / "DISCONNECTED" / "CONNECTING" |
| `getLocalIP()` | → string |
| `getLocalPort()` | → number |
| `getRemoteIP()` | → string |
| `getRemoteHost()` | → string |
| `getRemotePort()` | → number |
| `getError()` | → number |
| `getErrorString()` | → string |
| `setWsMaxAllowedIncomingFrameSize(size)` | Set max frame |
| `setWsMaxAllowedIncomingMessageSize(size)` | Set max message |
| `cleanUp()` | Cleanup |
| `objectNameChanged` | Event |
| `dataReceived` | Event (string) |
| `binaryDataReceived` | Event (binary) |
| `stateChanged` | Event |

### Events

```javascript
ws.dataReceived(function(data) { ... })
ws.binaryDataReceived(function(data) { ... })
ws.stateChanged(function(state) { ... })
```

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