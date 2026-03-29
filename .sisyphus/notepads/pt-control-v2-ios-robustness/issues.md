# Issues: pt-control-v2-ios-robustness

## Bug Fix: SVI planner missing `ip routing` for L3 switches

**Date:** 2026-03-29
**Severity:** Bug

**Problem:** The `planSviConfig()` function had a logic error that excluded 3560-class switches from receiving the `ip routing` command:

```typescript
// BUGGY - excluded 3560 from ip routing
if (caps.supportsIpRouting && !caps.model.startsWith("3560")) {
  commands.push("ip routing");
}
```

**Root cause:** The condition `!caps.model.startsWith("3560")` was backwards - it was blocking the very devices (L3 switches) that need `ip routing` enabled.

**Fix:** Removed the incorrect model check:

```typescript
// FIXED - emit ip routing for all devices that support it
if (caps.supportsIpRouting) {
  commands.push("ip routing");
}
```

**Files changed:**
- `packages/pt-control-v2/src/ios/operations/command-planner.ts` (line 57)
- `packages/pt-control-v2/tests/ios-command-planner.test.ts` (added assertion)
