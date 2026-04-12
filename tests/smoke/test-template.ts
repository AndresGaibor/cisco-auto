import { generateIosExecHandlersTemplate } from './packages/pt-runtime/src/templates/ios-exec-handlers-template.ts';

const template = generateIosExecHandlersTemplate();
console.log('Contains handleExecPc:', template.includes('function handleExecPc'));
console.log('Contains execPc:', template.includes('execPc'));
console.log('Length:', template.length);