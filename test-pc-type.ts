import { createDefaultPTController } from '@cisco-auto/pt-control';

const ctrl = createDefaultPTController();
await ctrl.start();
const devs = await ctrl.listDevices();
const pc1 = devs.find(d => d.name === 'PC1');
console.log('PC1 type:', pc1?.type);
await ctrl.stop();