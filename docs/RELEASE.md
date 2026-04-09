# Release

## Flujo mínimo
1. `bun run pt:generate`
2. `bun run pt:validate`
3. `bun run pt:build`
4. Revisar `packages/pt-runtime/generated/manifest.json`
5. Desplegar con `bun run pt:deploy`

## Artefactos
- `main.js`
- `runtime.js`
- `manifest.json`
- `bridge-lease.json`

## Rollback
```bash
bun run pt runtime releases
bun run pt runtime rollback --last
```

## Compatibilidad
- `cliVersion` y `runtimeArtifactVersion` deben coincidir con el manifest generado
- `protocolVersion` define la compatibilidad con el bridge/runtime
