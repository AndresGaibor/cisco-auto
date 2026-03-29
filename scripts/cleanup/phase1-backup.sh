#!/bin/bash
# =============================================================================
# FASE 1: Backup y Setup
# =============================================================================
set -e

echo "🚀 FASE 1: Backup y Setup"
echo "=========================="

# 1. Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. ¿Estás en el directorio correcto?"
    exit 1
fi

# 2. Crear branch para los cambios
echo "📌 Creando branch refactor/architecture-cleanup..."
git checkout -b refactor/architecture-cleanup 2>/dev/null || echo "⚠️  Branch ya existe o hay cambios pendientes"

# 3. Crear snapshot pre-refactor
echo "💾 Creando snapshot pre-refactor..."
git add -A
git commit -m "chore: pre-refactor snapshot" --allow-empty

# 4. Crear directorio .archive/
echo "📁 Creando directorio .archive/..."
mkdir -p .archive/{packages,project-management,skills}

# 5. Actualizar .gitignore
echo "📝 Actualizando .gitignore..."
cat >> .gitignore << 'EOF'

# === Arquitectura Cleanup ===
.archive/
logs/
pt-logs/
tmp/
generated/
*.log
*.ndjson
EOF

echo "✅ Fase 1 completada"
