#!/bin/bash
# =============================================================================
# SCRIPT MAESTRO: Ejecutar todas las fases de cleanup
# =============================================================================

echo "================================================"
echo "🔧 CISCO-AUTO: LIMPIEZA ARQUITECTURAL"
echo "================================================"
echo ""
echo "⚠️  AVISO: Este script ejecuta operaciones destructivas"
echo "   Se recomienda ejecutar las fases manualmente la primera vez"
echo ""
read -p "¿Ejecutar todas las fases automáticamente? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Abortado. Ejecuta las fases individualmente:"
    echo "  bash scripts/cleanup/phase1-backup.sh"
    exit 1
fi

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📍 Directorio de scripts: $SCRIPT_DIR"
echo ""

# Ejecutar fases en orden
"$SCRIPT_DIR/phase1-backup.sh"
echo ""
"$SCRIPT_DIR/phase2-unify-skills.sh"
echo ""
"$SCRIPT_DIR/phase3-archive-deprecated.sh"
echo ""
"$SCRIPT_DIR/phase4-consolidate-catalog.sh"
echo ""
"$SCRIPT_DIR/phase5-archive-sisyphus.sh"
echo ""
"$SCRIPT_DIR/phase6-reorganize-examples.sh"
echo ""
"$SCRIPT_DIR/phase7-validate.sh"
echo ""
"$SCRIPT_DIR/phase8-commit.sh"

echo ""
echo "================================================"
echo "✅ LIMPIEZA ARQUITECTURAL COMPLETADA"
echo "================================================"
