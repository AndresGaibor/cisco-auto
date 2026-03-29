#!/bin/bash
# =============================================================================
# FASE 3: Archivar Packages Deprecados
# =============================================================================
set -e

echo "🚀 FASE 3: Archivar Packages Deprecados"
echo "========================================"

ARCHIVE_DIR=".archive/packages"

DEPRECATED_PACKAGES=(packages/api packages/bridge packages/import-yaml packages/import-pka packages/crypto)

echo "📦 Archiving deprecated packages..."
for pkg in "${DEPRECATED_PACKAGES[@]}"; do
    if [ -d "$pkg" ]; then
        pkg_name=$(basename "$pkg")
        echo "  📁 Moviendo $pkg → $ARCHIVE_DIR/$pkg_name"
        mv "$pkg" "$ARCHIVE_DIR/"
    fi
done

echo ""
echo "⚠️  MANUAL: Edita package.json y elimina los workspaces deprecados"
echo "   Packages a eliminar: api, bridge, import-yaml, import-pka, crypto"

echo ""
echo "✅ Fase 3 completada"
