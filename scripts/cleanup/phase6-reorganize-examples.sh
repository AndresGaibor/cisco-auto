#!/bin/bash
# =============================================================================
# FASE 6: Reorganizar Examples
# =============================================================================
set -e

echo "🚀 FASE 6: Reorganizar Examples"
echo "================================"

mkdir -p examples/configs examples/labs

[ -d "configs" ] && mv configs/*.txt configs/*.example examples/configs/ 2>/dev/null; rmdir configs/ 2>/dev/null || true
[ -d "labs" ] && mv labs/*.yaml labs/*.yml examples/labs/ 2>/dev/null; rmdir labs/ 2>/dev/null || true

echo "📋 examples/configs/:"
ls examples/configs/ 2>/dev/null || echo "  vacío"
echo "📋 examples/labs/:"
ls examples/labs/ 2>/dev/null || echo "  vacío"

echo "✅ Fase 6 completada"
