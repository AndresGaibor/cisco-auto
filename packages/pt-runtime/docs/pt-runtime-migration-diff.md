# PT Runtime Migration Diff

> Generated: 2026-04-14
> Status: BASELINE vs CURRENT — Fully Implemented

## Build Pipeline Status

All components complete and generating output in `dist-qtscript/`:

| Component | Status | File |
|---|---|---|
| AST transform | ✅ Complete | `src/build/ast-transform.ts` |
| PT-safe validator (regex) | ✅ Complete | `src/build/validate-pt-safe.ts` |
| PT-safe validator (AST) | ✅ Complete | `src/build/ast-pt-safe-validator.ts` |
| render-main-v2.ts | ✅ Complete | Generates main.js kernel |
| render-runtime-v2.ts | ✅ Complete | Generates runtime.js handler dispatcher |
| render-catalog.ts | ✅ Complete | Generates catalog.js static constants |
| Kernel implementation | ✅ Complete | `src/pt/kernel/main.ts` + components |
| Terminal engine | ✅ Complete | `src/pt/terminal/terminal-engine.ts` |
| Job executor | ✅ Complete | `src/pt/kernel/job-executor.ts` |
| Runtime hot-reload | ✅ Complete | `src/pt/kernel/runtime-loader.ts` |
| dist-qtscript/ output | ✅ Present | main.js ~45KB, runtime.js ~15KB, catalog.js ~2.5KB |

## Artifact Comparison

Compare against baseline files in `generated/baseline/`:

### main.js baseline comparison

**Baseline:** `generated/baseline/main.js.baseline`
**Current:** `dist-qtscript/main.js`

Check:
1. PT-unsafe patterns: run `validatePtSafe()` on artifact
2. Kernel functions present: `main()`, `cleanUp()`, `_ptLoadModule()`, `createKernel()`
3. No business logic in kernel (handlers, dispatch)
4. Size should be ~45KB

### runtime.js baseline comparison

**Baseline:** `generated/baseline/runtime.js.baseline`
**Current:** `dist-qtscript/runtime.js`

Check:
1. PT-unsafe patterns: run `validatePtSafe()` on artifact
2. Handlers present: `configIos`, `execIos`, `addDevice`, `configHost`, etc.
3. No lifecycle management (filesystem, queue, intervals)
4. `dispatch(payload, api)` entry point

### catalog.js baseline comparison

**Baseline:** `generated/baseline/catalog.js.baseline` (if exists)
**Current:** `dist-qtscript/catalog.js`

Check:
1. `PT_DEVICE_TYPE_MAP` present (router=0, switch=1, pc=8, server=9)
2. `PT_CABLE_TYPE_MAP` present
3. Size ~2.5KB

## Migration Checklist

When updating PT Runtime to a new version:

- [ ] Run `bun run generate` to produce new artifacts
- [ ] Run `bun run validate` to check PT-safe patterns
- [ ] Compare checksums against previous `manifest.json`
- [ ] Diff main.js against baseline: `generated/baseline/main.js.baseline`
- [ ] Diff runtime.js against baseline: `generated/baseline/runtime.js.baseline`
- [ ] Review `docs/ARCHITECTURE.md` for any architectural changes
- [ ] If new device models added: update `src/verified-models.ts` → run `bun run generate-models`
- [ ] Test in Packet Tracer: load `main.js`, run a command, verify output

## Behavioral Changes (document as they occur)

### v0.3.0 (current)
- `ios-engine.ts` removed from build (replaced by TerminalEngine + JobExecutor)
- `ios-session.ts` removed from build (replaced by prompt-parser.ts)
- `catalog.js` split from runtime.js (static constants now separate artifact)
- Three-file output: main.js + runtime.js + catalog.js
- `_ptLoadModule()` added to kernel for modular loading

### Pre-v0.3.0
- Two-file output: main.js + runtime.js
- ios-engine.ts included in runtime.js
- All constants bundled in runtime.js

## PT-Safety Validation

```bash
# Validate all artifacts
bun run validate

# Individual validation
bun run src/index.ts validate

# Type check
bun run typecheck

# API validation
bun run validate:api
```

## Regenerate Baseline

After verifying a stable build is correct:

```bash
cp dist-qtscript/main.js generated/baseline/main.js.baseline
cp dist-qtscript/runtime.js generated/baseline/runtime.js.baseline
cp dist-qtscript/catalog.js generated/baseline/catalog.js.baseline
cp dist-qtscript/manifest.json generated/baseline/manifest.json.baseline
```

Then commit as baseline for future migration comparisons.