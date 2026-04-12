import { PUBLIC_COMMAND_CATALOG } from './packages/types/src/command-catalog.ts';

const hasExecPc = PUBLIC_COMMAND_CATALOG.some(c => c.type === 'execPc');
console.log('Catalog has execPc:', hasExecPc);
console.log('execPc entry:', JSON.stringify(PUBLIC_COMMAND_CATALOG.find(c => c.type === 'execPc'), null, 2));