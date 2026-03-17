import { Command } from 'commander';
import { parsePKA, isPka2XmlAvailable } from '../../core/parser/pka/index.ts';
import { PKAtoYAML } from '../../core/parser/pka-to-yaml.ts';
import { writeFileSync } from 'fs';
import * as yaml from 'js-yaml';

export function createParsePKACommand(): Command {
  const cmd = new Command('parse-pka')
    .description('Parsear archivo PKA de Packet Tracer y extraer XML o YAML')
    .argument('<file>', 'Archivo .pka a parsear')
    .option('-o, --output <file>', 'Guardar resultado en archivo')
    .option('-y, --yaml', 'Exportar a formato declarativo YAML de cisco-auto')
    .option('-i, --info', 'Solo mostrar información')
    .action(async (file, options) => {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('  PARSER PKA');
      console.log('═══════════════════════════════════════════════════════════\n');
      
      if (!isPka2XmlAvailable()) {
        console.log('⚠️  pka2xml no está disponible.');
        return;
      }
      
      console.log(`📁 Archivo: ${file}`);
      console.log(`🔄 Formato: ${options.yaml ? 'YAML' : 'XML'}\n`);
      
      const startTime = Date.now();
      const result = await parsePKA(file);
      const totalTime = Date.now() - startTime;
      
      if (result.success && result.xml) {
        let finalContent = result.xml;
        let summary = `📄 XML: ${result.xml.length.toLocaleString()} caracteres`;

        if (options.yaml) {
          const converter = new PKAtoYAML();
          const lab = converter.convert(result.xml);
          finalContent = yaml.dump(lab);
          summary = `📄 YAML: ${lab.topology.devices.length} dispositivos, ${lab.topology.connections?.length} conexiones`;
        }

        console.log('\n✅ ÉXITO');
        console.log(`⏱️  Tiempo: ${totalTime}ms`);
        console.log(summary);
        
        if (options.output) {
          writeFileSync(options.output, finalContent, 'utf-8');
          console.log(`\n💾 Guardado en: ${options.output}`);
        } else if (!options.info) {
          console.log('\n--- PREVIEW ---\n');
          console.log(finalContent.substring(0, 1000));
          console.log('\n--- ... ---');
        }
      } else {
        console.log('❌ FALLÓ');
        console.log(`💥 Error: ${result.error}`);
      }
    });
  
  return cmd;
}
