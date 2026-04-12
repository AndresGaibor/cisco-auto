import { createDefaultPTController } from '@cisco-auto/pt-control';

const ctrl = createDefaultPTController();
await ctrl.start();
const devs = await ctrl.listDevices();
console.log('Devices:', devs.map(d => ({ name: d.name, type: d.type })));
await ctrl.stop();