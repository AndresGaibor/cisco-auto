# 🚀 PT Control - Quick Installation Guide

## Prerequisites

- **Cisco Packet Tracer** (8.x or 9.x)
- **Bun** runtime ([install from bun.sh](https://bun.sh))

## Step 1: Install PT Script Module (5 minutes)

### 1.1 Open Packet Tracer

Launch Cisco Packet Tracer.

### 1.2 Create New Script Module

1. Go to **Extensions > Scripting > New PT Script Module**
2. Configure:
   - **Module ID**: `pt-control-module`
   - **Startup Mode**: **On Startup**
   - **Security Privileges**: Check **File System** and **Network**

### 1.3 Add main.js

1. In the **Script Engine** section, click **Add File**
2. Navega a: `cisco-auto/packages/pt-control/generated/main.js`
3. Selecciona el archivo
4. Marca la casilla para definirlo como **main script**

### 1.4 Save and Restart

1. Click **Save Module**
2. Give it a name (e.g., "PTControl")
3. **Restart Packet Tracer**

### 1.5 Verify Installation

1. After restart, go to **Extensions > Scripting > Debug**
2. You should see:
   ```
   === PT Control Module Starting ===
   [OK] PT Control Module initialized
   [INFO] Watching: ~/pt-dev
[INFO] Runtime: ~/pt-dev/runtime.js
[INFO] Main: ~/pt-dev/main.js
[INFO] Commands: ~/pt-dev/commands/
[INFO] In-Flight: ~/pt-dev/in-flight/
[INFO] Results: ~/pt-dev/results/
[INFO] Logs: ~/pt-dev/logs/events.current.ndjson
   ```

✅ **PT Module is now installed!**

## Step 2: Setup CLI (1 minute)

### 2.1 Run Setup Script

```bash
cd cisco-auto
bash scripts/setup-pt-control.sh
```

This will:
- Create `~/pt-dev` directory
- Copia `main.js` y `runtime.js` desde `packages/pt-control/generated/` a `~/pt-dev/`
- Install dependencies

### 2.2 Test CLI

```bash
bun run pt device list
```

Expected output:
```
Devices (0):
```

✅ **CLI is now ready!**

## Step 3: First Commands (2 minutes)

### 3.1 Add Devices

```bash
# Add a router
bun run pt device add R1 2911 100 100

# Add a switch
bun run pt device add S1 2960-24TT 300 100

# Add a PC
bun run pt device add PC1 PC 500 100
```

### 3.2 Create Links

```bash
# Connect router to switch
bun run pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1 straight

# Connect switch to PC
bun run pt link add S1:FastEthernet0/1 PC1:FastEthernet0 straight
```

### 3.3 Configure

```bash
# Configure PC IP
bun run pt config host PC1 192.168.1.10 255.255.255.0 192.168.1.1

# Configure router interface
bun run pt config ios R1 \
  "conf t" \
  "hostname R1" \
  "int g0/0" \
  "ip address 192.168.1.1 255.255.255.0" \
  "no shut" \
  "end"
```

### 3.4 Inspect

```bash
# Get topology snapshot
bun run pt snapshot

# Inspect specific device
bun run pt inspect R1

# List all devices
bun run pt device list
```

✅ **You're now controlling Packet Tracer from CLI!**

## Troubleshooting

### Module not loading

**Symptom**: No output in Debug console

**Solution**:
1. Check **Extensions > Scripting > Configure PT Script Modules**
2. Ensure module is **Enabled** and set to **On Startup**
3. Restart Packet Tracer

### Runtime not found

**Symptom**: `Error: Runtime file not found`

**Solution**:
```bash
cp packages/pt-control/generated/runtime.js ~/pt-dev/runtime.js
cp packages/pt-control/generated/main.js ~/pt-dev/main.js
```

### Commands not executing

**Symptom**: Commands hang or timeout

**Solution**:
1. Open PT **Extensions > Scripting > Debug**
2. Check for error messages
3. Verify module is running: should show "PT Control Module initialized"
4. Check file permissions:
   ```bash
   ls -la ~/pt-dev/
   ```

### FileWatcher not working

**Symptom**: File changes not detected

**Solution**:
1. Verify security privileges are granted
2. Try creating a test file:
   ```bash
   echo "test" > ~/pt-dev/test.txt
   ```
3. Check Debug console for file change events

## Environment Variables

### Custom Dev Directory

```bash
export PT_DEV_DIR=/custom/path
bun run pt device list
```

### Debug Mode

To see more verbose output:
```bash
export PT_DEBUG=1
bun run pt device list
```

## Next Steps

- Read [Quick Start Guide](PT_CONTROL_QUICKSTART.md)
- Check [Implementation Details](PT_CONTROL_IMPLEMENTATION.md)
- Review [API Research](PT_CONTROL_RESEARCH.md)
- Run test suite: `bun run pt:test`

## Need Help?

1. Check Debug console in PT: **Extensions > Scripting > Debug**
2. Check events file: `cat ~/pt-dev/events.ndjson`
3. Review error messages in CLI output
4. See documentation in `docs/` folder

---

**Total Setup Time**: ~8 minutes  
**Status**: Ready to use!

Happy automating! 🎉
