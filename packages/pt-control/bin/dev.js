#!/usr/bin/env node
// ============================================================================
// PT Control V2 - CLI Dev Entry Point
// ============================================================================

import { execute } from '@oclif/core';

await execute({
  dir: new URL('..', import.meta.url).pathname,
  development: true,
});
