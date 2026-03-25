import { Command } from 'commander';
import * as fs from 'fs';
import { loadLab } from '../../../../../src/core/parser/yaml-parser.ts';
import { generateMermaidDiagram } from '../../../../../src/core/topology/index.ts';
import type { LabSpec } from '../../../../../src/core/canonical/index.ts';
import { formatExamples, formatRelatedCommands } from '../../help/formatter.ts';
import { getExamples } from '../../help/examples.ts';
import { getRelatedCommands } from '../../help/related.ts';

function toLabSpec(parsed: any): LabSpec {
  return {
    metadata: {
      name: parsed.lab?.metadata?.name || 'Lab',
      version: parsed.lab?.metadata?.version || '1.0',
      author: parsed.lab?.metadata?.author || 'unknown',
      createdAt: new Date().toISOString()
    },
    devices: (parsed.lab?.topology?.devices || []).map((d: any) => ({
      id: d.name,
      name: d.name,
      type: d.type,
      hostname: d.hostname || d.name,
      managementIp: d.management?.ip,
      interfaces: (d.interfaces || []).map((i: any) => ({
        id: i.name,
        name: i.name,
        description: i.description,
        ipAddress: i.ip,
        shutdown: i.shutdown,
        switchport: i.mode ? { mode: i.mode, accessVlan: i.vlan } : undefined
      })),
      security: d.security,
      vlans: d.vlans,
      routing: d.routing,
      services: d.services
    })),
    connections: (parsed.lab?.topology?.connections || []).map((c: any) => ({
      id: `${c.from}-${c.to}`,
      from: { deviceName: c.from?.device || c.from, portName: c.from?.port || c.fromInterface || 'unknown' },
      to: { deviceName: c.to?.device || c.to, portName: c.to?.port || c.toInterface || 'unknown' },
      cableType: c.cable || c.type || 'ethernet'
    }))
  };
}

export function createTopologyExportCommand(): Command {
  const cmd = new Command('export')
    .description('Exportar topología a diferentes formatos')
    .argument('<file>', 'Archivo YAML del lab')
    .option('-f, --format <format>', 'Formato de salida (mermaid|json)', 'mermaid')
    .option('-o, --output <file>', 'Archivo de salida')
    .action(async (file, options) => {
      try {
        const parsedLab = loadLab(file);
        const labSpec = toLabSpec(parsedLab);
        const output = generateMermaidDiagram(labSpec);

        if (options.output) {
          fs.writeFileSync(options.output, output);
          console.log(`✅ Topología exportada a: ${options.output}`);
        } else {
          console.log(output);
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  const examples = getExamples('topology export');
  const related = getRelatedCommands('topology');

  cmd.addHelpText('after', formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
