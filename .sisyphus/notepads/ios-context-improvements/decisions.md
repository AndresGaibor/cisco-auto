# Decisions

1. The generator contract remains minimal and type-only: `GeneratedCommand` exposes `text`, `mode`, and `rollback`, while `CommandGenerator` is a plain `(config: unknown) => GeneratedCommand[]` function type.
