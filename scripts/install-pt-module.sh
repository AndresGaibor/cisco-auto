#!/usr/bin/env bash

# Automatic PT Control Module Installer
# This script registers the PT Control module with Packet Tracer automatically

set -e

echo "=== Automatic PT Module Installer ==="
echo

# Check PT is running
if ! pgrep -f "Cisco Packet Tracer" > /dev/null; then
    echo "❌ Cisco Packet Tracer is not running"
    echo "Please start Packet Tracer first"
    exit 1
fi

echo "✓ Packet Tracer is running"

# Setup file structure
DEV_DIR="$HOME/pt-dev"
GENERATED_DIR="packages/pt-control/generated"
MAIN_JS="$GENERATED_DIR/main.js"

if [ ! -f "$MAIN_JS" ]; then
    echo "❌ main.js not found at $MAIN_JS"
    exit 1
fi

# Ensure pt-dev structure
mkdir -p "$DEV_DIR/results"
mkdir -p "$DEV_DIR/in-flight"
mkdir -p "$DEV_DIR/commands"

# Copy files
cp "$MAIN_JS" "$DEV_DIR/main.js"
cp "$GENERATED_DIR/runtime.js" "$DEV_DIR/runtime.js"
echo "✓ Files copied to $DEV_DIR"

# Create AppleScript to register module with PT
APPLESCRIPT='
tell application "Cisco Packet Tracer"
    activate
    delay 2
    
    -- Open Extensions menu
    tell application "System Events"
        -- Click Extensions menu
        click menu item "Extensions" of menu "Cisco Packet Tracer" of menu bar 1
        delay 1
        
        -- Click Scripting submenu
        click menu item "Scripting" of menu item "Extensions" of menu "Cisco Packet Tracer" of menu bar 1
        delay 1
        
        -- Click "New PT Script Module"
        click menu item "New PT Script Module" of menu item "Scripting" of menu item "Extensions" of menu "Cisco Packet Tracer" of menu bar 1
        delay 2
        
        -- Fill in module ID
        keystroke "pt-control-module"
        delay 0.5
        
        -- Tab to startup mode dropdown
        key code 48 -- Tab
        delay 0.5
        
        -- Select "On Startup"
        keystroke "On Startup"
        delay 0.5
        
        -- Tab to security privileges
        key code 48 -- Tab
        delay 0.5
        
        -- Enable File System
        key code 49 -- Space
        delay 0.5
        
        -- Tab to Network
        key code 48 -- Tab
        delay 0.5
        
        -- Enable Network
        key code 49 -- Space
        delay 0.5
        
        -- Tab to Add File button
        key code 48 -- Tab
        delay 0.5
        
        -- Click Add File
        key code 49 -- Space
        delay 2
        
        -- Select main.js from file browser
        keystroke "main.js"
        delay 1
        
        -- Press Return to select
        key code 36 -- Return
        delay 2
        
        -- Save module
        keystroke "S" using {command down}
        delay 1
        
        -- Restart PT
        keystroke "Q" using {command down}
        delay 1
        
        -- Click Restart when prompted
        click button "Restart" of sheet 1 of window 1
        delay 10
        
    end tell
    
end tell
'

echo
echo "📋 Automating PT module registration via AppleScript..."
echo "⚠️  Please do NOT interact with Packet Tracer during this process"
echo

osascript <<EOF
$APPLESCRIPT
EOF

if [ $? -eq 0 ]; then
    echo "✓ Module registration initiated"
else
    echo "⚠️  AppleScript execution had issues"
    echo "Please manually register the module:"
    echo "1. Go to Extensions > Scripting > New PT Script Module"
    echo "2. Module ID: pt-control-module"
    echo "3. Startup Mode: On Startup"
    echo "4. Add File: packages/pt-control/generated/main.js"
    echo "5. Save and restart PT"
fi

# Wait for PT to restart
echo
echo "⏳ Waiting for Packet Tracer to restart..."
sleep 15

# Verify module is loaded
echo
echo "🔍 Verifying module installation..."

# Check for heartbeat file (indicates module is running)
if [ -f "$DEV_DIR/heartbeat.json" ]; then
    echo "✓ PT Control Module is responding!"
    cat "$DEV_DIR/heartbeat.json"
else
    echo "⏳ Waiting for first heartbeat..."
    sleep 5
    if [ -f "$DEV_DIR/heartbeat.json" ]; then
        echo "✓ PT Control Module is responding!"
        cat "$DEV_DIR/heartbeat.json"
    else
        echo "❌ Module not responding yet"
        echo "Check Extensions > Scripting > Debug in Packet Tracer"
    fi
fi

echo
echo "=== Installation Complete ==="
echo
echo "Test the CLI:"
echo "  bun run pt device list"
echo
