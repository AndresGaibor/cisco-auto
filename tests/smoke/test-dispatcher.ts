import { generateDispatcherTemplate } from './packages/pt-runtime/src/templates/dispatcher-template.ts';

const template = generateDispatcherTemplate();
console.log('Contains execPc:', template.includes('execPc'));
console.log('Contains handleExecPc:', template.includes('handleExecPc'));