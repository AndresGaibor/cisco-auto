# Contributing to @cisco-auto/pt-runtime

## Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/AndresGaibor/cisco-auto.git
cd cisco-auto

# Install dependencies
bun install

# Run tests
bun test packages/pt-runtime

# Build runtime bundle
cd packages/pt-runtime && bun run build
```

## Project Structure

```
cisco-auto/
├── packages/
│   └── pt-runtime/           # Main runtime package
│       └── src/
│           ├── handlers/     # Command handlers
│           ├── core/         # Dispatcher, middleware
│           ├── runtime/      # Utilities (logger, metrics)
│           └── build/        # Build pipeline
├── docs/                    # Documentation
├── tests/                  # Integration tests
└── scripts/               # Build scripts
```

## Adding a New Handler

### 1. Create the handler file

```typescript
// packages/pt-runtime/src/handlers/myfeature.handler.ts
import type { HandlerPayload, HandlerResult, HandlerDeps } from "../ports";

export interface MyFeaturePayload {
  type: "myFeature";
  param1: string;
  param2: number;
}

export function handleMyFeature(payload: MyFeaturePayload, deps: HandlerDeps): HandlerResult {
  // Implementation
  return { ok: true };
}
```

### 2. Register in HANDLER_MAP

Edit `packages/pt-runtime/src/handlers/runtime-handlers.ts`:

```typescript
import { handleMyFeature } from "./myfeature.handler";

registerHandler("myFeature", handleMyFeature);
```

### 3. Add to manifest (if needed)

If the handler should be included in the bundle, ensure its parent module is in `runtime-manifest.ts`.

### 4. Add tests

```typescript
// packages/pt-runtime/src/__tests__/myfeature.test.ts
import { handleMyFeature } from "../handlers/myfeature.handler";

describe("handleMyFeature", () => {
  it("should process valid payload", () => {
    const result = handleMyFeature(
      { type: "myFeature", param1: "test", param2: 42 },
      createMockDeps(),
    );
    expect(result.ok).toBe(true);
  });
});
```

## Adding Middleware

```typescript
// packages/pt-runtime/src/core/my-middleware.ts
import type { MiddlewareFn, MiddlewareContext } from "./middleware";

export const myMiddleware: MiddlewareFn = function (ctx, next) {
  // Pre-processing
  console.log("Before handler");

  const result = next();

  // Post-processing
  console.log("After handler");

  return result;
};
```

Register in the pipeline (usually in `runtime/index.ts`).

## Code Style

- Use **English** for code and comments
- Use **Spanish** for business logic naming when appropriate
- Follow existing patterns in the codebase
- Run `bun run format` before committing

## Testing

```bash
# Run all tests
bun test packages/pt-runtime

# Run specific test file
bun test packages/pt-runtime/src/__tests__/myfeature.test.ts

# Run with coverage
bun test --coverage
```

## Building

```bash
# Build runtime bundle
cd packages/pt-runtime && bun run build

# Validate PT-safety
bun run validate

# Deploy to PT
bun run deploy
```

## Pull Request Process

1. Create a new branch: `git checkout -b feature/my-feature`
2. Make changes with tests
3. Ensure `bun run pre-release-check` passes
4. Update documentation if needed
5. Open PR with description of changes
6. Wait for code review

## Release Process

1. Create changeset: `bunx changeset`
2. Update version: `bun run changeset version`
3. Publish: `bun run changeset publish`

For more details, see `.changeset/config.json`.

## Resources

- [Architecture Documentation](docs/ARCHITECTURE.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [PT API Migration Guide](docs/PT-API-MIGRATION-GUIDE.md)
