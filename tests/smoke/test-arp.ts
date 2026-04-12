import { createDefaultPTController } from '@cisco-auto/pt-control';

const ctrl = createDefaultPTController();
await ctrl.start();

const bridge = ctrl.getBridge();

console.log('=== ARP TABLE ON PC1 ===');
const arp1 = await bridge.sendCommandAndWait('execPc', {
  device: 'PC1',
  command: 'arp -a',
  timeoutMs: 10000,
});
console.log(arp1?.value?.raw || 'NO OUTPUT');

console.log('\n=== ARP TABLE ON PC2 ===');
const arp2 = await bridge.sendCommandAndWait('execPc', {
  device: 'PC2',
  command: 'arp -a',
  timeoutMs: 10000,
});
console.log(arp2?.value?.raw || 'NO OUTPUT');

await ctrl.stop();