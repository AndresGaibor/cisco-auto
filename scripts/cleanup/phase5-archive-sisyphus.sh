#!/bin/bash
# =============================================================================
# FASE 5: Archivar Sisyphus
# =============================================================================
set -e

echo "🚀 FASE 5: Archivar Sisyphus"
echo "============================="

SISYPHUS_DIR=".sisyphus"
ARCHIVE_DIR=".archive/project-management"

if [ ! -d "$SISYPHUS_DIR" ]; then
    echo "ℹ️  .sisyphus/ no existe"
    exit 0
fi

echo "📋 Contenido de .sisyphus/:"
ls -la "$SISYPHUS_DIR/"

mkdir -p .github/ISSUE_TEMPLATE
cat > .github/ISSUE_TEMPLATE/cleanup-todos.md << 'EOF'
---
name: Cleanup TODO
about: Migrar un TODO de Sisyphus a GitHub Issues
title: "[TODO]"
labels: todo
---

## Descripción
[Describe el TODO]
EOF

echo "✅ Template creado"
echo ""
read -p "¿Archivar .sisyphus/? (y/N): " -n 1 -r
echo ""
[[ $REPLY =~ ^[Yy]$ ]] && mv "$SISYPHUS_DIR" "$ARCHIVE_DIR/"

echo "✅ Fase 5 completada"
