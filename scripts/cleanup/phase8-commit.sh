#!/bin/bash
# =============================================================================
# FASE 8: Commit y Documentación
# =============================================================================
set -e

echo "🚀 FASE 8: Commit y Documentación"
echo "==================================="

git status

cat > MIGRATION.md << 'EOF'
# Migration Guide: v2.x → v3.0

## Paquetes Eliminados

| Paquete Anterior | Estado | Alternativa |
|------------------|--------|-------------|
| `@cisco-auto/api` | ❌ Eliminado | Usar `@cisco-auto/pt-control-v2` |
| `@cisco-auto/bridge` | ❌ Eliminado | Usar `@cisco-auto/pt-control-v2/FileBridgeV2` |
| `@cisco-auto/device-catalog` | ❌ Eliminado | Usar `@cisco-auto/core/catalog` |

## AI Skills

Skills ahora unificadas en `.skills/` con symlinks.

## Pasos de Migración

1. Actualizar imports
2. Ejecutar tests: `bun test`
3. Build: `bun run build`
EOF

echo "✅ MIGRATION.md creado"

git add -A
git status --short

read -p "¿Confirmar commit? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "refactor: architecture cleanup

- Unified AI skills (.skills/ with symlinks)
- Archived deprecated packages
- Reorganized examples/

BREAKING CHANGES:
- @cisco-auto/bridge → @cisco-auto/pt-control-v2
- @cisco-auto/device-catalog → @cisco-auto/core/catalog

Co-Authored-By: Claude <noreply@anthropic.com>"
    echo "✅ Commit creado"
fi

echo "✅ Fase 8 completada"
