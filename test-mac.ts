import { createDefaultPTController } from '@cisco-auto/pt-control';

const ctrl = createDefaultPTController();
await ctrl.start();

console.log('=== SHOW MAC ADDRESS-TABLE ===');
const macResult = await ctrl.execIos('S1', 'show mac address-table', true, 5000);
console.log('Raw output:');
console.log(macResult.raw || 'NO OUTPUT');

const lines = (macResult.raw || '').split('\n');
const macLines = lines.filter(l => /^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}/i.test(l.trim()));
console.log('\nMAC lines found:', macLines.length);
macLines.forEach(l => console.log('  ', l.trim()));

await ctrl.stop();