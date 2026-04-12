import { createDefaultPTController } from '@cisco-auto/pt-control';

const ctrl = createDefaultPTController();
await ctrl.start();

// Try show ip interface brief instead
console.log('=== SHOW IP INTERFACE BRIEF ===');
try {
  const result = await ctrl.execIos('S1', 'show ip interface brief', true, 10000);
  console.log('ok:', result.ok);
  console.log('raw length:', result.raw?.length);
  console.log('raw:', result.raw);
  console.log('session:', JSON.stringify(result.session, null, 2));
} catch (e) {
  console.error('Error:', e);
}

await ctrl.stop();