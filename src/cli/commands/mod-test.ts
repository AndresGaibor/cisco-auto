import { Command } from 'commander';
import { parsePKA, isPka2XmlAvailable, encodePKAExternal } from '../../core/parser/pka/index.ts';
import { Network, PC, Switch, Router, Server } from '../../core/models/index.ts';
import { writeFileSync } from 'fs';

export function createModTestCommand(): Command {
  return new Command('mod-test')
    .description('Prueba de concepto: Leer PKA, modificar parámetros y reempaquetar a .pka real')
    .argument('<file>', 'Archivo .pka original')
    .option('-o, --output <file>', 'Archivo .pka de salida', 'lab_modificado.pka')
    .option('--pc <name>', 'Nombre del PC a modificar', 'PC1')
    .option('--ip <ip>', 'Nueva IP para el PC', '192.168.99.99')
    .option('--mask <mask>', 'Nueva Máscara', '255.255.255.0')
    .action(async (file, options) => {
      console.log('🧪 Iniciando prueba de modificación y reempaquetado...');
      
      if (!isPka2XmlAvailable()) {
        console.error('❌ Error: pka2xml no disponible');
        return;
      }

      try {
        // 1. Extraer XML
        console.log(`\n📂 [1/5] Desempaquetando archivo original: ${file}`);
        const pkaResult = await parsePKA(file);
        
        if (!pkaResult.success || !pkaResult.xml) {
          console.error(`❌ Error al extraer XML: ${pkaResult.error}`);
          return;
        }

        // 2. Cargar en el Modelo de Entidades
        console.log('🧠 [2/5] Cargando topología en el motor de entidades en memoria...');
        const network = new Network(pkaResult.xml);
        
        // 3. Modificaciones Programáticas
        console.log('\n✨ [3/5] Aplicando modificaciones programáticas...');
        
        // Ejemplo A: Modificar el PC solicitado
        const pc = network.getDevice<PC>(options.pc);
        if (pc) {
          console.log(`   -> Configurando IP ${options.ip} en ${pc.getName()}`);
          pc.setIpAddress(options.ip, options.mask);
          pc.setGateway(options.ip.split('.').slice(0, 3).join('.') + '.1');
        } else {
          console.warn(`   -> ⚠️ No se encontró el PC "${options.pc}"`);
        }

        // Ejemplo B: Añadir Banner a un Switch (si existe S1)
        const sw = network.getDevice<Switch>('S1');
        if (sw) {
          console.log(`   -> Añadiendo Banner MOTD y VLAN 99 en Switch S1`);
          sw.appendRunningConfig('banner motd # HACKED BY CISCO-AUTO #');
          sw.addVlan(99, 'HackedVLAN');
        }

        // Ejemplo C: Configurar un Router (si existe Router0)
        const rtr = network.getDevice<Router>('Router0');
        if (rtr) {
          console.log(`   -> Configurando NAT PAT y ACLs en ${rtr.getName()}`);
          rtr.addStandardACL(1, 'permit', '192.168.0.0', '0.0.255.255');
          rtr.setupNATOverload(1, 'GigabitEthernet0/0');
          rtr.applyACLToInterface('GigabitEthernet0/1', 1, 'in');
        }

        // Ejemplo D: Configurar un Server (si existe Web Server)
        const srv = network.getDevice<Server>('Web Server');
        if (srv) {
          console.log(`   -> Configurando DNS, FTP y Email en ${srv.getName()}`);
          srv.addDnsRecord('www.cisco-auto.test', '10.0.0.100');
          srv.addFtpAccount('admin', 'cisco123');
          srv.setEmailService('cisco-auto.test');
          srv.addEmailAccount('alumno', 'pass123');
        }

        // 4. Reconstruir XML
        console.log('\n💾 [4/5] Reconstruyendo XML interno...');
        const finalXml = network.toXML();
        
        // 5. Empaquetar a .PKA
        console.log(`📦 [5/5] Reempaquetando a formato Packet Tracer (${options.output})...`);
        const packResult = await encodePKAExternal(finalXml, options.output);

        if (packResult.success) {
          console.log(`\n✅ ¡ÉXITO! Laboratorio modificado generado: ${options.output}`);
          console.log('💡 Abre este archivo en Cisco Packet Tracer para ver los cambios aplicados directamente al modelo 3D y CLI de los equipos.');
        } else {
          console.error(`\n❌ Error al empaquetar: ${packResult.error}`);
        }

      } catch (error) {
        console.error('\n💥 Error inesperado:', error instanceof Error ? error.message : error);
      }
    });
}