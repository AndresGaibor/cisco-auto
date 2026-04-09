# Compatibilidad

## Versiones
- CLI: `apps/pt-cli/package.json`
- Runtime: `packages/pt-runtime/package.json`
- Protocolo: `packages/pt-runtime/src/index.ts` (`protocolVersion` en manifest)

## Reglas
- No desplegar artefactos con versiones mezcladas
- Validar antes de copiar a `~/pt-dev`
- Usar `pt doctor` y `pt status` después de cualquier deploy importante

## Soporte
- Esta fase asume deployment local con Bun
- Los snapshots locales son el mecanismo de rollback soportado
