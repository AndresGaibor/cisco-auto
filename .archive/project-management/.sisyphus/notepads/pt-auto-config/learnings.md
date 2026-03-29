
## T9: Documentación del workflow CLI (pt-control-v2)

- Se crearon/actualizaron los archivos `docs/PT_CONTROL_QUICKSTART.md` y `packages/pt-control-v2/README.md` para reflejar el flujo moderno basado en la CLI.
- Los comandos `pt vlan apply`, `pt trunk apply`, `pt ssh setup` y el script `scripts/topologia-apply.ts` están documentados explícitamente como el camino recomendado.
- Se advierte claramente que YAML/.pka son legacy y solo para migraciones puntuales.
- El script de topología se menciona como punto de entrada para automatización total.
- La documentación está en español y orientada a nuevos usuarios.
- No se detectaron errores LSP en los archivos modificados tras los cambios.

## T10-FINAL: Correcciones de compliance del audit final

### Cambios realizados

1. **trunk/apply.ts - VLANs por defecto**: Se cambió el default de "todas las VLANs (1-4094)" a [10,20,30,40,50] según lo requerido por el audit T3.

2. **import-pka/src/index.ts - JSDoc @deprecated**: Se添加到 package entry y funciones públicas (`parsePKA`, `parsePKASync`) el tag `@deprecated` indicando uso de pt-control-v2.

3. **README.md raíz - Deprecation language**: Se actualizó la descripción de "Topologías Declarativas" para indicar claramente que es LEGACY y no debe usarse en flujos nuevos. Se añadieron comentarios `LEGACY` en las secciones de comandos YAML/.pka.

4. **docs/PT_CONTROL_QUICKSTART.md y packages/pt-control-v2/README.md**: Se corrigieron los ejemplos de CLI para usar argumentos posicionales en lugar de flags `--device`, `--vlans`, `--ports`. Las firmas correctas son:
   - `pt vlan apply <device> <vlan_id>...`
   - `pt trunk apply <device> <port>...`
   - `pt ssh setup <device> [--domain <value>] [--user <value>] [--pass <value>]`

### Verificación

- Build exitoso (`bun run build`)
- LSP diagnostics limpios en los archivos modificados
- CLI help muestra las firmas correctas con argumentos posicionales
