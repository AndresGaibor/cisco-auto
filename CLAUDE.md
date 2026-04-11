
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## Arquitectura TypeScript

**Código fuente es TypeScript puro (.ts)** - Bun ejecuta TypeScript directamente sin compilación.

### Archivos NO trackeados en git
El repositorio excluye del tracking estos archivos compilados:
```
*.js          (compilado de TypeScript)
*.d.ts        (declaraciones TypeScript)
*.js.map      (source maps)
*.d.ts.map    (declaration maps)
```

Estos se generan en tiempo de desarrollo pero no deben commitearse. El código fuente es `.ts`.

### Paquetes npm workspace
```json
"dependencies": {
  "@cisco-auto/types": "workspace:*",
  "@cisco-auto/core": "workspace:*",
  "@cisco-auto/pt-control": "workspace:*",
  "@cisco-auto/pt-runtime": "workspace:*"
}
```

Los paquetes usan exports directos a `.ts`:
```json
"exports": {
  ".": "./src/index.ts",
  "./schemas": "./src/schemas/index.ts"
}
```

### Importante: No ejecutar `tsc` para compilar
- El proyecto usa TypeScript source directo
- Bun ejecuta `.ts` sin compilación
- Si necesitas verificar tipos: `bun run typecheck` (solo lectura, no emite archivos)
- NO usar `tsc` sin `-p` (emitiría archivos en el source)

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## PT Control (Cisco Packet Tracer)

**PT Control** es la CLI profesional para controlar Cisco Packet Tracer en tiempo real. Ubicación: `/packages/pt-control/`

### Setup Inicial
```bash
# 1. Build y deploy de archivos a ~/pt-dev/ (automático)
bun run pt:build

# 2. Dentro de PT: cargar el script desde File > Open > selecciona ~/pt-dev/main.js
```

### Comandos principales
```bash
# Ver ayuda completa
bun run pt --help

# Gestión de dispositivos
bun run pt device list              # Listar dispositivos en PT
bun run pt device add R1 2911      # Agregar dispositivo
bun run pt device remove R1         # Remover dispositivo
bun run pt device move R1 --xpos 300 --ypos 200  # Mover dispositivo

# Comandos show
bun run pt show ip-int-brief R1   # Mostrar interfaces IPs
bun run pt show vlan Switch1       # Mostrar VLANs
bun run pt show ip-route R1        # Mostrar rutas
bun run pt show run-config R1      # Mostrar configuración

# Configuración
bun run pt config-host R1 --ip 192.168.1.1 --mask 255.255.255.0 --gateway 192.168.1.254
bun run pt config-ios R1 interface GigabitEthernet0/0 ip address 192.168.1.1 255.255.255.0

# VLANs
bun run pt vlan apply Switch1 10 20 30

# Trunk
bun run pt trunk apply Switch1 GigabitEthernet0/1

# SSH
bun run pt ssh setup Router1 --domain cisco.local --user admin --pass admin
```

### Ruta de archivos
- **macOS/Linux**: `~/pt-dev/`
- **Windows**: `%USERPROFILE%\pt-dev\`
- Override: `PT_DEV_DIR` environment variable

### Requisitos
- Packet Tracer debe estar corriendo
- Módulo de scripting cargado en PT
- Timeout default: 120s para descubrimiento de dispositivos
