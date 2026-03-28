#!/usr/bin/env bun
/**
 * API Server Entry Point
 * Start the cisco-auto REST API server
 */

import { createAPIServer } from '../api/index.ts';

const port = parseInt(process.env.PORT || '3000');
const host = process.env.HOST || '0.0.0.0';

createAPIServer({ port, host });
