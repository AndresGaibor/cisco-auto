import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { formatExamples, formatRelatedCommands } from '../../help/formatter.ts';
import { getExamples } from '../../help/examples.ts';
import { getRelatedCommands } from '../../help/related.ts';

const LAB_TEMPLATE = `# Nombre del laboratorio
name: mi-laboratorio
version: "1.0"
difficulty: beginner
description: "Descripción del laboratorio"
author: "Tu nombre"

topology:
  devices:
    - name: R1
      type: router
      model: "2911"
      hostname: Router1
      management:
        ip: 192.168.1.1
        subnetMask: 255.255.255.0
        vlan: 1
      interfaces:
        - name: GigabitEthernet0/0
          type: gigabitethernet
          ip: 192.168.1.1
          subnetMask: 255.255.255.0
          enabled: true
          
    - name: SW1
      type: switch
      model: "2960-24TT"
      hostname: Switch1
      vlans:
        - id: 10
          name: VLAN10
          active: true
          
  connections:
    - from: R1
      fromInterface: GigabitEthernet0/0
      to: SW1
      toInterface: GigabitEthernet0/1
      type: ethernet
`;

export function createLabCreateCommand(): Command {
  const cmd = new Command('create')
    .description('Crear un nuevo archivo de laboratorio')
    .argument('<name>', 'Nombre del laboratorio')
    .option('-o, --output <file>', 'Archivo de salida', '<name>.yaml')
    .action(async (name, options) => {
      try {
        const outputFile = options.output.replace('<name>', name);
        const content = LAB_TEMPLATE.replace('mi-laboratorio', name);
        
        writeFileSync(outputFile, content);
        console.log(`✅ Laboratorio '${name}' creado en: ${outputFile}`);
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  const examples = getExamples('lab create');
  const related = getRelatedCommands('lab create');

  cmd.addHelpText('after', formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
