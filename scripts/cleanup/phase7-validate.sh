#!/bin/bash
# =============================================================================
# FASE 7: Tests y Validación
# =============================================================================
set -e

echo "🚀 FASE 7: Tests y Validación"
echo "============================="

ERRORS=0

echo "🧪 Ejecutando tests..."
bun test 2>&1 | tee /tmp/test-output.txt && echo "  ✅ Tests OK" || { echo "  ❌ Tests FAIL"; ERRORS=$((ERRORS+1)); }

echo ""
echo "🔨 Ejecutando build..."
bun run build 2>&1 | tee /tmp/build-output.txt && echo "  ✅ Build OK" || { echo "  ❌ Build FAIL"; ERRORS=$((ERRORS+1)); }

echo ""
echo "🔍 Verificando CLI..."
bun run cisco-auto --help > /dev/null 2>&1 && echo "  ✅ cisco-auto CLI OK" || { echo "  ❌ cisco-auto CLI FAIL"; ERRORS=$((ERRORS+1)); }

echo ""
echo "🔗 Verificando symlinks..."
for skill in .skills/*; do
    [ -d "$skill" ] || continue
    skill_name=$(basename "$skill")
    for dir in .iflow .gemini .agents; do
        link="$dir/skills/$skill_name"
        [ -L "$link" ] && [ -e "$link" ] && echo "  ✅ $link" || echo "  ❌ $link ROTO"
    done
done

echo ""
[ $ERRORS -eq 0 ] && echo "✅ TODAS LAS VALIDACIONES PASARON" || echo "❌ $ERRORS error(es)"
echo "✅ Fase 7 completada"
