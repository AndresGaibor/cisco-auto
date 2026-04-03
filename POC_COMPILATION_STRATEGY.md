/**
 * POC: Runtime Configuration & Compilation Demo
 * 
 * This file shows:
 * 1. The tsconfig.runtime.json configuration
 * 2. Example input (TypeScript)
 * 3. Example output (ES5 for Packet Tracer)
 * 4. Compilation commands
 */

// ============================================================================
// tsconfig.runtime.json
// ============================================================================
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    // ======== TARGET ========
    "target": "ES5",              // Packet Tracer uses old Engine
    "lib": ["ES5"],               // Only ES5 built-ins available
    
    // ======== MODULE SYSTEM ========
    "module": "commonjs",         // Convert to var declarations (for PT)
    "moduleResolution": "node",
    
    // ======== OUTPUT ========
    "outDir": "./packages/generated",
    "removeComments": true,       // Keep output clean
    "declaration": false,         // No .d.ts files needed
    "sourceMap": false,           // No source maps (optional)
    
    // ======== QUALITY ========
    "strict": true,               // Maintain type safety in source
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["packages/pt-runtime/src/runtime/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}

// ============================================================================
// COMPILATION EXAMPLE
// ============================================================================

// INPUT (TypeScript):
// src/runtime/constants.ts
export const DEVICE_TYPES = {
  "router": 0,
  "switch": 1,
  "laptop": 18,
} as const;

export function isValidDeviceType(device: string): boolean {
  return device in DEVICE_TYPES;
}

// COMMAND:
// $ tsc -p tsconfig.runtime.json
// or
// $ bun build ./src/runtime/index.ts --outfile ./packages/generated/runtime.js

// ============================================================================
// OUTPUT (ES5 JavaScript, EXACTLY what runs in PT):
// ============================================================================

// ============================================================================
// Note: ES5 conversion
// ============================================================================
// - TypeScript exports → var declarations
// - as const → removed (it's a TS-only feature)
// - Function types → regular function declarations
// - Type annotations → removed
// - Template literals → string concatenation
// - Arrow functions → function declarations
// - let/const → var
// - Destructuring → manual assignment

// Here's what ACTUALLY gets generated:

var DEVICE_TYPES = {
  "router": 0,
  "switch": 1,
  "laptop": 18,
};

function isValidDeviceType(device) {
  return device in DEVICE_TYPES;
}

// This is PURE JavaScript, readable, typeable in development but at runtime
// is just ES5-compatible code that PT Script Engine understands!

// ============================================================================
// COMPILATION FLOW
// ============================================================================

/*
 * Current (Problematic):
 * 
 *   templates/*.ts (functions that return strings)
 *          ↓
 *    runtime-generator.ts (concatenates strings)
 *          ↓
 *    runtime.js (generated, no type checking)
 *
 *
 * Proposed (Better):
 * 
 *   src/runtime/*.ts (actual TypeScript code)
 *          ↓
 *    tsc / bun build (with tsconfig.runtime.json)
 *          ↓
 *    packages/generated/runtime.js (ES5 compiled, fully typed in development)
 *    
 *    Benefits:
 *    - Full TypeScript type checking during compilation
 *    - IDE intellisense and refactoring tools work
 *    - ESLint can validate code
 *    - Output is the same ES5 for PT, but development is better
 */

// ============================================================================
// BUN BUILD ALTERNATIVE
// ============================================================================

/*
 * Instead of tsc, you can use bun build:
 * 
 * $ bun build ./packages/pt-runtime/src/runtime/index.ts \
 *     --outfile ./packages/generated/runtime.js \
 *     --target=browser \
 *     --format=iife \
 *     --minify
 * 
 * Advantages:
 * - Faster than tsc
 * - Handles TypeScript natively
 * - Can minify automatically
 * - Simpler bundling
 */

// ============================================================================
// PACKAGE.JSON SCRIPTS
// ============================================================================

{
  "scripts": {
    // Compile runtime to ES5 for PT
    "build:runtime": "tsc -p packages/pt-runtime/tsconfig.runtime.json",
    
    // Alternative with bun
    "build:runtime:bun": "bun build packages/pt-runtime/src/runtime/index.ts --outfile packages/generated/runtime.js --target=browser",
    
    // Compile library (with types, dist/)
    "build:lib": "tsc",
    
    // Full build
    "build": "npm run build:lib && npm run build:runtime",
    
    // Development watch
    "dev": "tsc --watch",
    "dev:runtime": "tsc -p packages/pt-runtime/tsconfig.runtime.json --watch",
    
    // Generate and deploy
    "generate": "npm run build:runtime && bun packages/pt-runtime/src/index.ts generate",
    "deploy": "npm run build:runtime && bun packages/pt-runtime/src/index.ts deploy",
    
    // Type check without emitting
    "typecheck": "tsc --noEmit",
    "test": "bun test"
  }
}

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/*
 * ✅ Phase 1: Setup
 *   [ ] Create tsconfig.runtime.json
 *   [ ] Create src/runtime/ directory structure
 *   [ ] Update package.json scripts
 *   
 * ✅ Phase 2: Convert (one module at a time)
 *   [ ] constants-template.ts → runtime/constants.ts
 *   [ ] helpers-template.ts → runtime/helpers.ts
 *   [ ] session-template.ts → runtime/session.ts
 *   [ ] handlers/*.ts → runtime/handlers/*.ts
 *   [ ] dispatcher-template.ts → runtime/index.ts (orchestrator)
 *   
 * ✅ Phase 3: Validation
 *   [ ] Run: npm run build:runtime
 *   [ ] Check generated runtime.js is ES5
 *   [ ] Copy to PT dev directory
 *   [ ] Test in Packet Tracer
 *   [ ] Run: npm run typecheck (all types pass)
 *   [ ] Run: npm run test (all tests pass)
 *   
 * ✅ Phase 4: Cleanup
 *   [ ] Remove template files (after confirming output is correct)
 *   [ ] Remove runtime-generator.ts
 *   [ ] Remove runtime-validator.ts (can add better validation)
 *   [ ] Update documentation
 */

// ============================================================================
// KEY DIFFERENCES (TS Source vs String Templates)
// ============================================================================

/*
 * TEMPLATES (Current):
 * 
 * ❌ No intellisense
 * ❌ Strings are untyped
 * ❌ Error detection only in generated code
 * ❌ Hard to refactor
 * ❌ Two-phase compilation confusing
 * 
 * SOURCE (Proposed):
 * 
 * ✅ Full intellisense
 * ✅ Type-checked during development
 * ✅ Error detection at compile time
 * ✅ Refactor-safe with TypeScript tools
 * ✅ Simple one-phase compilation
 * ✅ Can use TypeScript idioms (interfaces, generics, etc.)
 * ✅ Better testing capabilities
 * ✅ Easier to add new features
 */
