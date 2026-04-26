import { Command } from 'commander';
import * as fs from 'fs';
// @ts-ignore - js-yaml lacks type declarations
import * as yaml from 'js-yaml';

export function createInitCommand(): Command {
  return new Command('init')
    .description('Crear un archivo de lab de ejemplo')
    .argument('[name]', 'Nombre del lab', 'mi-lab')
    .action(async (name) => {
      const exampleLab = {
        metadata: {
          name: name,
          description: 'Laboratorio de ejemplo creado con cisco-auto',
          version: '1.0',
          difficulty: 'beginner'
        },
        topology: {
          devices: [
            {
              name: 'Router-1',
              type: 'router',
              hostname: 'R1',
              management: {
                ip: '192.168.1.1',
                subnetMask: '255.255.255.0'
              },
              interfaces: [
                {
                  name: 'GigabitEthernet0/0',
                  ip: '192.168.1.1/24',
                  description: 'LAN'
                }
              ]
            }
          ],
          connections: []
        }
      };
      
      const filename = `${name}.yaml`;
      fs.writeFileSync(filename, yaml.dump(exampleLab));
      console.log(`✅ Archivo de ejemplo creado: ${filename}`);
    });
}