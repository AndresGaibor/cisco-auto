# Instalación

## Requisitos
- Bun instalado
- Cisco Packet Tracer disponible
- Permisos para escribir en `~/pt-dev`

## Setup local
```bash
bun run pt setup
```

## Build manual
```bash
bun run pt:build
```

## Validación
```bash
bun run pt:validate
```

## Completions
```bash
bun run pt completion bash
bun run pt completion zsh
```

## Notas
- `pt setup` prepara el runtime local y deja `main.js`/`runtime.js` en `~/pt-dev`
- `pt runtime releases` lista snapshots locales
- `pt runtime rollback --last` restaura la última release local
