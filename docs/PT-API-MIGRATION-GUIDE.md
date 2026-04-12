# PT API Migration Guide

This document describes the process for updating `@cisco-auto/pt-runtime` when Cisco releases a new version of Packet Tracer with API changes.

## Overview

When a new PT version changes, adds, or removes methods in the scripting API, the runtime must be updated to:

1. Detect the new PT version
2. Adapt handlers to use new methods when available
3. Provide graceful degradation for older PT versions
4. Update capability probes and feature flags

## Step 1: Update PT API Registry

1. Open PT's Script Module documentation or probe via QtScript console
2. Compare new methods against `packages/types/src/pt-api/pt-native-interfaces.ts`
3. Add new methods as optional (with `?`) to preserve backward compatibility
4. Remove or deprecate methods that no longer exist

## Step 2: Update Capability Probes

Update `packages/pt-runtime/src/runtime/pt-version.ts`:

```typescript
// Add new capabilities to KNOWN_CAPABILITIES
registerCapability("NewMethodName", "9.0", "Fallback behavior");

// Update detectPtVersion() if the new version has distinctive features

// Update probeCapabilities() to detect new methods
```

## Step 3: Update Feature Flags

Add new feature flags to `packages/pt-runtime/src/runtime/feature-flags.ts`:

```typescript
flags["new-feature"] = {
  name: "new-feature",
  minVersion: "9.0",
  enabled: capabilities["NewCapability"] || false,
  reason: capabilities["NewCapability"] ? undefined : "NewCapability not available",
};
```

## Step 4: Update Handlers

For methods that changed signature:
- Update handler code to use the new signature
- Add backward-compatible fallback

For methods that were removed:
- Add fallback logic using `PtSafeCall`
- Log warnings when fallback is used

For new methods:
- Add new handlers or extend existing ones
- Use `withFeature()` to enable only on supported versions

## Step 5: Update Tests

1. Add capability test fixtures for the new PT version in `tests/fixtures/pt-capabilities.ts`
2. Update snapshot baselines
3. Add regression tests for changed behavior

## Step 6: Update CommandPayloadTypeMap

1. Add new command types to `packages/types/src/pt-api/command-payload-map.ts`
2. Add new `CommandCatalogEntry` entries
3. Register new handlers in `HANDLER_MAP`

## Step 7: Validate

1. Run `bun run pre-release-check`
2. Test against the new PT version manually
3. Verify that older PT versions still work (graceful degradation)

## Capability Detection Example

```typescript
// In pt-version.ts
export function probeCapabilities(ipc: PtIpc): Record<string, boolean> {
  const results = {};
  
  // Probe new capability
  if (sampleDevice) {
    results["NewMethod"] = typeof sampleDevice.newMethod === "function";
  }
  
  return results;
}
```

## Feature Flag Usage

```typescript
// In handler
import { isFeatureEnabled, withFeature } from "../runtime/feature-flags";

function handleNewFeature(payload, api) {
  return withFeature("new-feature", 
    () => {
      // Use native PT API
      device.newMethod();
    },
    () => {
      // Fallback to old method
      device.oldMethodFallback();
    }
  );
}
```

## Known PT Version Capabilities

| Capability | Since PT | Fallback |
|------------|---------|----------|
| PTDevice.getPort | 8.0 | getPortAt() iteration |
| PTDevice.moveToLocation | 7.3 | moveToLocationCentered |
| PTDevice.setDhcpFlag | 7.2 | port.setDhcpClientFlag |
| PTPort.setIpv6Enabled | 7.3 | No IPv6 support |
| PTLogicalWorkspace.deleteDevice | 8.0 | removeDevice |
