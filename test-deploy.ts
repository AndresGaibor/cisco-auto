import { RUNTIME_JS_TEMPLATE } from './packages/pt-runtime/src/templates/runtime.ts';
import * as fs from 'fs';
import * as path from 'path';

const runtime = RUNTIME_JS_TEMPLATE;
console.log('handleExecPc in template:', runtime.includes('handleExecPc'));
console.log('execPc in template:', runtime.includes('case "execPc"'));

// Write to pt-dev
const devDir = process.env.PT_DEV_DIR || path.join(process.env.HOME || '', 'pt-dev');
const runtimePath = path.join(devDir, 'runtime.js');
fs.writeFileSync(runtimePath, runtime, 'utf-8');
console.log('Written to:', runtimePath);
console.log('File size:', fs.statSync(runtimePath).size);