
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

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
# 1. Instalar módulo de scripting en PT (requiere PT abierto)
cd packages/pt-control && bun run scripts/setup-pt-control.sh

# 2. Dentro de PT: cargar el script desde File > Open > select pt-scripts/main.ts
```

### Comandos principales
```bash
# Listar dispositivos
cd packages/pt-control && bun run scripts/topologia-apply.ts

# Aplicar VLANs
bun run pt vlan apply <SWITCH> <VLAN_ID>...

# Configurar puertos trunk
bun run pt trunk apply <SWITCH> <PORT>...

# Setup SSH en routers
bun run pt ssh setup <ROUTER> --domain <DOMAIN> --user <USER> --pass <PASS>

# Aplicar topología completa (config JSON)
cp topology-config.example.json topology-config.json
bun run scripts/topologia-apply.ts --config topology-config.json

# Con flags adicionales
bun run scripts/topologia-apply.ts --vlans 10,20,30 --ssh-domain cisco.local --dry-run --verbose
```

### Requisitos
- Packet Tracer debe estar corriendo
- Módulo de scripting cargado en PT (ver setup-pt-control.sh)
- Timeout default: 120s para descubrimiento de dispositivos

### Archivos clave
- `src/cli/commands/device/list.ts` - Listar dispositivos
- `src/vdom/index.ts` - Motor de topología virtual
- `topology-config.example.json` - Plantilla de configuración
- `scripts/topologia-apply.ts` - Script de automatización completa
