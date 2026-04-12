import { createDefaultPTController } from '@cisco-auto/pt-control';

const ctrl = createDefaultPTController();
await ctrl.start();

console.log('=== EXEC IOS TEST ===');
try {
  const macResult = await ctrl.execIos('S1', 'show mac address-table', true, 10000);
  console.log('Result:', JSON.stringify(macResult, null, 2));
} catch (e) {
  console.error('Error:', e);
}

// Also try show version as comparison
console.log('\n=== SHOW VERSION ===');
try {
  const verResult = await ctrl.execIos('S1', 'show version', true, 10000);
  console.log('Version output:', verResult.raw?.substring(0, 500));
} catch (e) {
  console.error('Error:', e);
}

await ctrl.stop();