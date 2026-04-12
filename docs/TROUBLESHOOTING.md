# PT Runtime Troubleshooting Guide

## Common Issues and Solutions

### Handler Returns "Unknown command type"

**Cause**: The command type is not registered in `HANDLER_MAP`

**Solution**: 
1. Check if the handler is registered in `runtime-handlers.ts`
2. Verify the payload has `type` field set correctly
3. Check the handler exists in the manifest

### Payload Validation Fails

**Cause**: Payload exceeds size limits or contains invalid data

**Solution**:
- Check payload size is under 64KB
- Verify all required fields are present
- Ensure no prototype pollution keys (`__proto__`, `constructor`, `prototype`)

### PT-Safe Validation Fails

**Cause**: Generated JavaScript contains ES6+ syntax

**Common issues**:
- Template literals: Use string concatenation instead
- Arrow functions: Use `function() {}` instead
- `??` operator: Use `||` instead
- `?.` operator: Use `&&` instead

### Device Not Found

**Cause**: Device name doesn't exist in PT workspace

**Solution**:
1. Verify the device exists in the topology
2. Check spelling/capitalization matches
3. Ensure device is powered on

### Command Timeout

**Cause**: IOS command didn't complete within timeout

**Solutions**:
- Increase `commandTimeoutMs` in payload
- Check if device is in correct mode (privileged exec)
- Verify no "More" pagination is blocking

### Deferred Job Never Completes

**Cause**: Polling for wrong ticket or job state lost

**Solution**:
1. Verify ticket is correct
2. Check if PT process was restarted (jobs are ephemeral)
3. Ensure heartbeat is running

### Logging Output Not Appearing

**Cause**: dprint not configured or filtered

**Solution**:
1. Verify dprint function is available
2. Check log level is not "silent"
3. Look for JSON logs in PT Debug Console

## Debugging Tips

### Enable Debug Logging

```typescript
initializeLogger({ level: "debug" });
```

### Check Bundle Size

```bash
bun --eval "
const { renderRuntimeV2Sync } = require('./src/build/render-runtime-v2.ts');
const r = renderRuntimeV2Sync({ srcDir: './src', outputPath: '' });
console.log('Bundle size:', r.length, 'chars');
"
```

### Validate PT-Safety

```bash
bun --eval "
const { renderRuntimeV2Sync } = require('./src/build/render-runtime-v2.ts');
const { validatePtSafe } = require('./src/build/validate-pt-safe.ts');
const r = renderRuntimeV2Sync({ srcDir: './src', outputPath: '' });
const v = validatePtSafe(r);
console.log('Valid:', v.valid);
console.log('Errors:', v.errors.length);
"
```

### Test Handlers in Isolation

```typescript
import { handleConfigIos } from './handlers/runtime-handlers';
import { createMockApi } from './test/utils';

// Create mock API
const api = createMockApi({
  getDeviceByName: () => ({ hasTerminal: true }),
  dprint: console.log,
});

// Execute handler
const result = handleConfigIos({
  type: 'configIos',
  device: 'Router1',
  commands: ['interface GigabitEthernet0/0'],
}, api);

console.log(result);
```

## Error Codes

| Code | Meaning |
|------|---------|
| `DEVICE_NOT_FOUND` | Device name doesn't exist |
| `NO_TERMINAL` | Device has no CLI (still booting) |
| `INVALID_PAYLOAD` | Payload validation failed |
| `RATE_LIMITED` | Too many commands per minute |
| `UNKNOWN_HANDLER` | Command type not registered |
| `HANDLER_EXCEPTION` | Unexpected error in handler |

## Performance Issues

### Bundle Too Large

- Enable tree-shaking (default)
- Enable minification for production
- Remove unused handlers from manifest

### Slow Command Execution

- Check network latency to PT
- Verify no blocking I/O in handler
- Consider async/deferred execution

## Known Limitations

1. **No support for PT file I/O** - Use file-bridge instead
2. **No WebSocket/network** - Use IPC only
3. **Limited memory** - Keep bundle under 200KB
4. **ES5 only** - No modern JavaScript features
