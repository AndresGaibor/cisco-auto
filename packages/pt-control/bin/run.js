#!/usr/bin/env node
// ============================================================================
// PT Control V2 - CLI Entry Point
// ============================================================================

import { execute } from '@oclif/core';

await execute({
  dir: import.meta.url,
});
