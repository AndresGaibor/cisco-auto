#!/bin/bash
# =============================================================================
# FASE 2: Unificar AI Skills (Symlinks)
# =============================================================================
set -e

echo "🚀 FASE 2: Unificar AI Skills"
echo "=============================="

SKILLS_DIR=".skills"

# 1. Crear directorio unificado
echo "📁 Creando directorio unificado .skills/..."
mkdir -p "$SKILLS_DIR"

# 2. Mover contenido canónico (desde .iflow que es la fuente)
echo "📦 Moviendo skills desde .iflow..."
[ -d ".iflow/skills/cisco-networking-assistant" ] && mv .iflow/skills/cisco-networking-assistant "$SKILLS_DIR/"
[ -d ".iflow/skills/skill-creator" ] && mv .iflow/skills/skill-creator "$SKILLS_DIR/"

# 3. Función para crear symlinks
create_symlink() {
    local target="$1"
    local link_path="$2"
    local link_dir=$(dirname "$link_path")
    mkdir -p "$link_dir"
    [ -d "$link_path" ] && [ ! -L "$link_path" ] && rm -rf "$link_path"
    [ ! -L "$link_path" ] && ln -s "../../$SKILLS_DIR/$target" "$link_path" && echo "  ✅ Symlink: $link_path"
}

# 4. Recrear symlinks en cada AI tool
echo "🔗 Creando symlinks..."
for skill in "$SKILLS_DIR"/*; do
    [ -d "$skill" ] || continue
    skill_name=$(basename "$skill")
    create_symlink "$skill_name" ".iflow/skills/$skill_name"
    create_symlink "$skill_name" ".gemini/skills/$skill_name"
    create_symlink "$skill_name" ".agents/skills/$skill_name"
done

echo "✅ Fase 2 completada"
