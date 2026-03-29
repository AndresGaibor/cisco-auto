#!/bin/bash
# =============================================================================
# FASE 4: Consolidar device-catalog en core/catalog
# =============================================================================
set -e

echo "🚀 FASE 4: Consolidar device-catalog en core/catalog"
echo "===================================================="

DEVICE_CATALOG="packages/device-catalog"
CORE_CATALOG="packages/core/src/catalog"
ARCHIVE_DIR=".archive/packages/device-catalog"

if [ -d "$DEVICE_CATALOG" ] && [ -d "$CORE_CATALOG" ]; then
    echo "🔍 Diferencias:"
    diff -r "$DEVICE_CATALOG" "$CORE_CATALOG" || true
fi

if rg "@cisco-auto/device-catalog" --files-with-matches 2>/dev/null | grep -v ".archive/" | grep "\.ts$" > /tmp/device_catalog_imports.txt; then
    echo "⚠️  Archivos con imports a device-catalog:"
    cat /tmp/device_catalog_imports.txt
fi

read -p "¿Archivar device-catalog? (y/N): " -n 1 -r
echo ""
[[ $REPLY =~ ^[Yy]$ ]] && [ -d "$DEVICE_CATALOG" ] && mkdir -p "$ARCHIVE_DIR" && mv "$DEVICE_CATALOG"/* "$ARCHIVE_DIR/" 2>/dev/null; rm -rf "$DEVICE_CATALOG"

echo "✅ Fase 4 completada"
