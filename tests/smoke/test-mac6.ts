import { createDefaultPTController } from '@cisco-auto/pt-control';

const ctrl = createDefaultPTController();
await ctrl.start();

// Try execInteractive instead
console.log('=== USING EXECINTERACTIVE ===');
try {
  const result = await ctrl.execInteractive('S1', 'show mac address-table', { timeout: 10000 });
  console.log('Result ok:', result.ok);
  console.log('raw length:', result.raw?.length);
  console.log('raw:', result.raw?.substring(0, 500));
} catch (e) {
  console.error('Error:', e);
}

// Try inspecting S1 to see if we can get info
console.log('\n=== INSPECT S1 ===');
try {
  const insp = await ctrl.inspectDevice('S1');
  console.log('Inspect:', JSON.stringify(insp, null, 2).substring(0, 500));
} catch (e) {
  console.error('Inspect error:', e);
}

await ctrl.stop();