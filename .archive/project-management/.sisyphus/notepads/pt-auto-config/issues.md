
## T9: Documentación del workflow CLI (pt-control-v2)

- No se detectaron issues técnicos ni errores LSP en los archivos modificados (`docs/PT_CONTROL_QUICKSTART.md`, `packages/pt-control-v2/README.md`).
- El flujo de comandos modernos y el script de topología están claros y alineados con la arquitectura actual.
- El riesgo principal sigue siendo confusión de usuarios legacy, pero los avisos deprecados son explícitos.

## T10-FINAL: Issues del audit final

### Issues identificados y resueltos

1. **T3 - trunk default VLANs**: El audit señaló que `trunk apply` usaba "todas las VLANs" como default cuando `--vlans` era omitido. Se corrigió a [10,20,30,40,50].

2. **JSDoc @deprecated faltante**: `packages/import-pka/src/index.ts` no tenía标记 de deprecated en el package entry ni en exports públicos. Se添加到 `@deprecated` en el módulo y las funciones `parsePKA` y `parsePKASync`.

3. **README.md - Lenguaje deprecation ambiguo**: La sección "Topologías Declarativas" presentaba YAML como flujo normal para trabajo nuevo. Se actualizó con lenguaje claro deprecation y advertencias LEGACY.

4. **CLI docs - Firmas incorrectas**: Los ejemplos en `docs/PT_CONTROL_QUICKSTART.md` y `packages/pt-control-v2/README.md` usaban flags (`--device`, `--vlans`, `--ports`) pero la CLI real usa argumentos posicionales. Se corrigieron las firmas y ejemplos.

### Estado final

- Todos los items del audit final fueron resueltos
- Build pasa sin errores
- LSP diagnostics limpios en archivos modificados
- CLI help verificado con firmas correctas
