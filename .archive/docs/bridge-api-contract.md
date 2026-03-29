# Bridge Server API Contract

## Overview

El Bridge Server proporciona una interfaz HTTP para comunicación bidireccional entre CLI tools y Cisco Packet Tracer. Funciona en puerto 54321 (configurable via `BRIDGE_PORT` env var).

## Base URL

```
http://127.0.0.1:54321
```

## CORS

Todos los endpoints incluyen headers CORS para permitir acceso desde el WebView de Packet Tracer:

```
Access-Control-Allow-Origin: http://localhost/*
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Endpoints

### 1. Health Check

Verifica que el bridge server esté funcionando.

**Request:**
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-03-25T15:12:00.000Z"
}
```

**Error Response:**
```json
{
  "error": "Internal server error"
}
```

---

### 2. Get Next Command

Obtiene el siguiente comando pendiente de la cola. Usado por Packet Tracer para polling.

**Request:**
```http
GET /next
```

**Response - Command Available:**
```json
{
  "hasCommand": true,
  "command": {
    "id": "1711378321000-abc123",
    "tipo": "configurar",
    "args": ["router1", "interface", "gig0/0"],
    "timestamp": 1711378321000
  }
}
```

**Response - No Commands:**
```json
{
  "hasCommand": false,
  "command": null
}
```

**Notas:**
- El comando se remueve de la cola al ser retornado
- Polling interval recomendado: 500ms

---

### 3. Execute Command

Encola un comando para ser ejecutado por Packet Tracer.

**Request:**
```http
POST /execute
Content-Type: application/json

{
  "tipo": "configurar",
  "args": ["router1", "interface", "gig0/0"]
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tipo | string | Yes | Tipo de comando: `agregarDispositivo`, `conectar`, `configurar`, `eliminarDispositivo` |
| args | array | Yes | Argumentos del comando (varía según tipo) |

**Response - Success:**
```json
{
  "success": true,
  "commandId": "1711378321000-abc123",
  "message": "Comando encolado: configurar"
}
```

**Response - Error:**
```json
{
  "error": "Falta campo requerido: tipo o args"
}
```

---

### 4. Bridge Client Script

Retorna el script de bootstrap que se inyecta en Packet Tracer.

**Request:**
```http
GET /bridge-client.js
```

**Response:**
```javascript
Content-Type: application/javascript

(function() {
  // Script de bootstrap para PT
  // Polls /next cada 500ms
  // Ejecuta comandos via evaluateJavaScriptAsync
})();
```

**Uso:**
```javascript
// Inyectar en PT Builder Code Editor
fetch('http://127.0.0.1:54321/bridge-client.js')
  .then(r => r.text())
  .then(code => evaluateJavaScriptAsync(code));
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created (command queued) |
| 204 | No Content (OPTIONS) |
| 400 | Bad Request (invalid JSON or missing fields) |
| 403 | Forbidden (non-localhost request) |
| 404 | Not Found |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "error": "Human readable error message"
}
```

---

## Polling Protocol

### Client (PT) Side

```javascript
async function poll() {
  const response = await fetch('http://127.0.0.1:54321/next');
  const data = await response.json();
  
  if (data.hasCommand && data.command) {
    await executeCommand(data.command);
  }
  
  setTimeout(poll, 500); // 500ms interval
}
```

### Timeout Handling

- Connection timeout: 5s
- Response timeout: 10s
- Retry on error: 3 attempts with exponential backoff

---

## Security

### Localhost Only

El bridge server solo acepta conexiones desde:
- `127.0.0.1`
- `::1`
- `::ffff:127.0.0.1`
- `localhost`

### CORS Origins

Permitido: `http://localhost/*`

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| BRIDGE_PORT | 54321 | Puerto del bridge server |

### Example

```bash
BRIDGE_PORT=55555 bun run src/bridge/server.ts
```

---

## TypeScript Types

```typescript
interface ComandoPT {
  id: string;
  tipo: 'agregarDispositivo' | 'conectar' | 'configurar' | 'eliminarDispositivo';
  args: unknown[];
  timestamp: number;
}

interface NextResponse {
  hasCommand: boolean;
  command: ComandoPT | null;
}

interface ExecuteResponse {
  success: boolean;
  commandId: string;
  message: string;
}

interface HealthResponse {
  status: 'ok' | 'error';
  version: string;
  timestamp: string;
}
```
