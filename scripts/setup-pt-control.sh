#!/usr/bin/env bash

# PT Control Setup Script

set -e

echo "=== PT Control Setup ==="
echo

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed"
    echo "Install it from: https://bun.sh"
    exit 1
fi

echo "✓ Bun found: $(bun --version)"

# Create dev directory
DEV_DIR="${PT_DEV_DIR:-$HOME/pt-dev}"
echo
echo "Setting up dev directory: $DEV_DIR"

if [ ! -d "$DEV_DIR" ]; then
    mkdir -p "$DEV_DIR"
    echo "✓ Created $DEV_DIR"
else
    echo "✓ Directory exists"
fi

# Copy V2 runtime files from generated source-of-truth
GENERATED_DIR="packages/pt-control/generated"

for FILE in main.js runtime.js; do
    SRC="$GENERATED_DIR/$FILE"
    DEST="$DEV_DIR/$FILE"
    
    if [ -f "$SRC" ]; then
        cp "$SRC" "$DEST"
        echo "✓ Copied $FILE"
    else
        echo "❌ Source not found: $SRC"
        exit 1
    fi
done

# Install dependencies
echo
echo "Installing dependencies..."
bun install

echo
echo "=== Setup Complete ==="
echo
echo "🚀 Starting automatic PT module installation..."
echo

# Make install script executable
chmod +x scripts/install-pt-module.sh

# Run the automatic module installer
bash scripts/install-pt-module.sh