import { createDefaultPTController } from '@cisco-auto/pt-control';

const ctrl = createDefaultPTController();
await ctrl.start();

// Try using bridge directly like the PC ping does
console.log('=== USING BRIDGE DIRECTLY FOR S1 ===');
const bridge = ctrl.getBridge();
try {
  const result = await bridge.sendCommandAndWait('execIos', {
    device: 'S1',
    command: 'show mac address-table',
    ensurePrivileged: true
  }, 10000);
  console.log('Result ok:', result.ok);
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (e) {
  console.error('Error:', e);
}

await ctrl.stop();