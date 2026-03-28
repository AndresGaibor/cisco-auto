# PT Script Module Installation

This directory contains the Packet Tracer Script Module that enables real-time control from the CLI.

## Installation Steps

### 1. Open Packet Tracer

Launch Cisco Packet Tracer.

### 2. Open Script Module Editor

Go to: **Extensions > Scripting > New PT Script Module**

### 3. Configure Module

- **Module ID**: `pt-control-module`
- **Startup Mode**: Select **On Startup**
- **Security Privileges**: Check all necessary privileges (File System, Network)

### 4. Add main.js

In the Script Engine section:
1. Click **Add File**
2. Select `main.js` from this directory
3. Mark it as the **main script**

### 5. Save Module

Click **Save Module** and give it a name like `PTControl`.

### 6. Restart Packet Tracer

Close and reopen Packet Tracer to load the module.

## Verification

1. Open **Extensions > Scripting > Debug**
2. Look for the module in the list
3. Check debug output for initialization messages:
   ```
   === PT Control Module Starting ===
   [OK] PT Control Module initialized
   [INFO] Watching: ~/pt-dev
   ```

## Directory Structure

After installation, the module will watch:
```
~/pt-dev/
  ├── runtime.js      # Runtime code (auto-loaded)
  ├── command.json    # Commands from CLI
  └── events.ndjson   # Events to CLI
```

## Default Runtime

Copy `runtime.js` to `~/pt-dev/runtime.js` to use the default implementation:

```bash
mkdir -p ~/pt-dev
cp pt-extension/runtime.js ~/pt-dev/runtime.js
```

## Testing

After installation, test with the CLI:

```bash
bun run packages/pt-control/test.ts
```

## Troubleshooting

### Module not loading

- Check **Extensions > Scripting > Configure PT Script Modules**
- Ensure the module is enabled
- Check for errors in Debug dialog

### FileWatcher not working

- Ensure `~/pt-dev` directory is writable
- Check Security Privileges are granted
- Look for errors in Debug console

### Commands not executing

- Verify `runtime.js` is in `~/pt-dev/`
- Check `events.ndjson` for error messages
- Ensure PT has file system permissions

## Advanced Configuration

You can customize the watched directory by editing `main.js`:

```javascript
var DEV_DIR = "/your/custom/path/pt-dev";
```

Then reinstall the module.
