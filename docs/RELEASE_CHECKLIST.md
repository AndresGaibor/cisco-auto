# Release Checklist

## Pre-release (Local)

### 1. Código y Calidad
- [ ] `bun run typecheck` pasa en todos los paquetes
- [ ] `bun run lint` pasa sin errores
- [ ] `bun test` pasa todos los tests unitarios
- [ ] `bun run architecture:check` pasa

### 2. Build y Validación PT
- [ ] `bun run build` en packages/pt-runtime genera main.js y runtime.js
- [ ] `bun run validate-pt-safe` pasa (valida que runtime.js sea seguro para PT)

### 3. Telemetry y Observabilidad
- [ ] Schemas de telemetry en packages/types/src/telemetry/ están exportados
- [ ] commandId presente en logs y results
- [ ] sessionId presente en history, logs y reports

### 4. Pre-release Script
- [ ] `bun run scripts/pre-release-check.ts` pasa todos los checks

## Release (CI/CD)

### 5. GitHub Actions CI (.github/workflows/ci.yml)
- [ ] Job typecheck: verifica tipos en todos los paquetes
- [ ] Job lint: verifica linting
- [ ] Job test: ejecuta `bun test`
- [ ] Job architecture: ejecuta `bun run architecture:check`

### 6. GitHub Actions Release (.github/workflows/release.yml)
- [ ] Job release: tipo, lint, test, build, PT-safe validation
- [ ] Usa changesets para versionado automático

## Post-release

### 7. Deployment
- [ ] `bun run pt:deploy` despliega main.js y runtime.js a ~/pt-dev/
- [ ] Verificar que Packet Tracer carga sin errores
- [ ] Verificar que los comandos básicos funcionan

### 8. Monitoreo post-release
- [ ] Verificar logs en ~/pt-dev/logs/
- [ ] Verificar que commandId correlation funciona
- [ ] Verificar que sessionId aparece en history

## Rollback
```bash
bun run pt runtime releases
bun run pt runtime rollback --last
```

## Notas
- El script `scripts/pre-release-check.ts` automatiza los checks locales
- CI bloquea merges si typecheck, lint o test fallan
- PT-safe validation previene errores en runtime de Packet Tracer
