import { createDefaultPTController } from '@cisco-auto/pt-control';

const ctrl = createDefaultPTController();
await ctrl.start();

// Test ping first
console.log('=== PING TEST ===');
try {
  const pingResult = await ctrl.execIos('S1', 'ping 192.168.10.20 repeat 2', true, 10000);
  console.log('Ping result - ok:', pingResult.ok, 'raw:', pingResult.raw?.substring(0, 200));
} catch (e) {
  console.error('Ping error:', e);
}

// Now test show mac after ping (to generate traffic)
console.log('\n=== SHOW MAC AFTER PING ===');
try {
  const macResult = await ctrl.execIos('S1', 'show mac address-table', true, 10000);
  console.log('MAC result - ok:', macResult.ok, 'raw len:', macResult.raw?.length);
  console.log('First 500 chars:', macResult.raw?.substring(0, 500));
} catch (e) {
  console.error('MAC error:', e);
}

await ctrl.stop();