import { generateDispatcherTemplate } from './packages/pt-runtime/src/templates/dispatcher-template.ts';

const template = generateDispatcherTemplate();
console.log('Template length:', template.length);
console.log('Has execPc:', template.includes('execPc'));
console.log('Has handleExecPc:', template.includes('handleExecPc'));

// Show the switch statement
const switchMatch = template.match(/switch \(payload\.type\) \{[^}]+\}/);
if (switchMatch) {
  console.log('\nSwitch statement:\n', switchMatch[0]);
}