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

# Copy runtime
RUNTIME_SRC="pt-extension/runtime.js"
RUNTIME_DEST="$DEV_DIR/runtime.js"

if [ -f "$RUNTIME_SRC" ]; then
    cp "$RUNTIME_SRC" "$RUNTIME_DEST"
    echo "✓ Copied runtime.js"
else
    echo "❌ Runtime source not found: $RUNTIME_SRC"
    exit 1
fi

# Install dependencies
echo
echo "Installing dependencies..."
bun install

echo
echo "=== Setup Complete ==="
echo
echo "Next steps:"
echo
echo "1. Install PT Script Module:"
echo "   - Open Packet Tracer"
echo "   - Go to Extensions > Scripting > New PT Script Module"
echo "   - Add pt-extension/main.js as main script"
echo "   - Save and restart PT"
echo
echo "2. Verify installation:"
echo "   - Open Extensions > Scripting > Debug"
echo "   - Look for 'PT Control Module initialized'"
echo
echo "3. Test the CLI:"
echo "   bun run pt device list"
echo
echo "4. See quick start guide:"
echo "   cat docs/PT_CONTROL_QUICKSTART.md"
echo
