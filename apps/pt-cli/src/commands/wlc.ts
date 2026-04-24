#!/usr/bin/env bun
/**
 * WLC Commands - Automatización de Wireless LAN Controller
 * Usa controller.omniscience.evaluate() para ejecutar JS en el motor PT
 */

import { Command } from "commander";
import chalk from "chalk";
import { createDefaultPTController } from "@cisco-auto/pt-control";

const STATUS_QUERY = `
(function() {
  var net = ipc.network();
  var devs = ['PC0', 'WLC1', 'SW1', 'AAA_Server', 'AP1', 'AP2', 'AP3'];
  var report = [];
  devs.forEach(function(name) {
    var d = net.getDevice(name);
    if (d) {
      var portsUp = [];
      var portsDown = [];
      for (var i = 0; i < d.getPortCount(); i++) {
        var p = d.getPortAt(i);
        if (p) {
          if (p.isPortUp()) portsUp.push(p.getName());
          else portsDown.push(p.getName());
        }
      }
      var ip = '';
      try {
        var mgmt = d.getPort('management') || d.getPort('FastEthernet0') || d.getPort('Vlan1');
        if (mgmt) ip = mgmt.getIpAddress();
      } catch(e) {}
      report.push({ name: name, power: d.getPower(), model: d.getModel(), portsUp: portsUp, portsDown: portsDown, ip: ip });
    }
  });
  return JSON.stringify(report);
})()
`;

const SETUP_CODE = `
(function() {
  var net = ipc.network();
  var devs = ['PC0', 'WLC1', 'SW1', 'AAA_Server', 'AP1', 'AP2', 'AP3'];
  var configured = [];

  devs.forEach(function(name) {
    var d = net.getDevice(name);
    if (d && !d.getPower()) {
      if (d.getModel && d.getModel().includes('LAP')) {
        try { d.getRootModule().addModuleAt('ACCESS_POINT_POWER_ADAPTER', 1); } catch(e) {}
      }
      d.setPower(true);
      configured.push(name + ' (powered)');
    }
  });

  var sw = net.getDevice('SW1');
  ['FastEthernet0/3', 'FastEthernet0/4', 'FastEthernet0/5'].forEach(function(port) {
    try { sw.getPort(port).setPower(true); } catch(e) {}
  });
  configured.push('SW1 PoE (Fa0/3, Fa0/4, Fa0/5)');

  var wlc = net.getDevice('WLC1');
  try {
    var mgmt = wlc.getPort('management');
    mgmt.setIpSubnetMask('192.168.10.2', '255.255.255.0');
    mgmt.setDefaultGateway('192.168.10.1');
    configured.push('WLC1 (192.168.10.2/24)');
  } catch(e) {}

  try {
    var svi = sw.getPort('Vlan10');
    svi.setIpSubnetMask('192.168.10.1', '255.255.255.0');
    configured.push('SW1 Vlan10 (192.168.10.1/24)');
  } catch(e) {}

  return JSON.stringify({ success: true, configured: configured, errors: [] });
})()
`;

export function createWlcCommand(): Command {
  const wlc = new Command("wlc")
    .description("Comandos para Wireless LAN Controller y red asociada");

  wlc
    .command("setup")
    .description("Setup completo: power devices, PoE, IPs, gateway")
    .action(async () => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        const omni = controller.omniscience;

        console.log(chalk.blue("=== WLC Network Setup ===\n"));
        console.log(chalk.yellow("1. Ejecutando setup de red..."));

        const result = await omni.evaluate(SETUP_CODE);
        const parsed = JSON.parse(String(result));

        if (parsed.success) {
          console.log(chalk.green("\n✓ Configuración completada:"));
          parsed.configured.forEach((d: string) => console.log(`   - ${d}`));
        } else {
          console.log(chalk.red("\n✗ Errores:"));
          parsed.errors.forEach((e: string) => console.log(`   - ${e}`));
        }

        console.log(chalk.yellow("\n2. Verificando estado final..."));
        const statusResult = await omni.evaluate(STATUS_QUERY);
        const devices = JSON.parse(String(statusResult));

        console.log(chalk.green("\n=== Estado Final ==="));
        console.log(`   Devices: ${devices.length}`);
        console.log(`   All Powered: ${devices.every((d: any) => d.power) ? 'YES' : 'NO'}`);

        for (const dev of devices) {
          const icon = dev.power ? chalk.green("✓") : chalk.red("✗");
          console.log(`   ${icon} ${dev.name} (${dev.model}) - ${dev.ip || 'sin IP'}`);
        }
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  wlc
    .command("status")
    .description("Ver estado de red (devices, ports, IPs)")
    .action(async () => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        const omni = controller.omniscience;

        const result = await omni.evaluate(STATUS_QUERY);
        const devices = JSON.parse(String(result));

        console.log(chalk.blue("\n=== Estado de Red WLC ===\n"));
        console.log(`Dispositivos: ${devices.length}`);
        console.log(`Todos encendidos: ${devices.every((d: any) => d.power) ? 'SI' : 'NO'}`);
        console.log(`Todos conectados: ${devices.every((d: any) => d.portsUp.length > 0) ? 'SI' : 'NO'}`);

        console.log(chalk.yellow("\n--- Detalle por Dispositivo ---\n"));
        for (const dev of devices) {
          const powerIcon = dev.power ? chalk.green("●") : chalk.red("○");
          const linkIcon = dev.portsUp.length > 0 ? chalk.green("✓") : chalk.red("✗");

          console.log(`${powerIcon} ${chalk.cyan(dev.name)} (${dev.model})`);
          console.log(`   IP: ${dev.ip || chalk.gray('N/A')}`);
          console.log(`   Ports UP: ${dev.portsUp.join(', ') || chalk.gray('ninguno')}`);
          if (dev.portsDown.length > 0) {
            console.log(`   Ports DOWN: ${dev.portsDown.join(', ')}`);
          }
          console.log(`   Link Status: ${linkIcon}`);
          console.log();
        }
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  wlc
    .command("ip")
    .description("Configurar IP management del WLC")
    .argument("<ip>", "Dirección IP")
    .argument("<mask>", "Máscara de subred")
    .argument("<gateway>", "Default gateway")
    .action(async (ip: string, mask: string, gateway: string) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        const omni = controller.omniscience;

        const code = `
          (function() {
            var net = ipc.network();
            var wlc = net.getDevice('WLC1');
            var mgmt = wlc.getPort('management');
            mgmt.setIpSubnetMask('${ip}', '${mask}');
            mgmt.setDefaultGateway('${gateway}');
            return 'WLC management set to ${ip}/${mask}, gateway ${gateway}';
          })()
        `;
        await omni.evaluate(code);
        console.log(chalk.green(`\n✓ WLC1 Management IP: ${ip}/${mask}`));
        console.log(chalk.green(`  Gateway: ${gateway}`));
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  wlc
    .command("gateway")
    .description("Configurar default gateway del WLC")
    .argument("<ip>", "Dirección IP del gateway")
    .action(async (ip: string) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        const omni = controller.omniscience;

        const code = `
          (function() {
            var net = ipc.network();
            var wlc = net.getDevice('WLC1');
            var mgmt = wlc.getPort('management');
            mgmt.setDefaultGateway('${ip}');
            return 'WLC gateway set to ${ip}';
          })()
        `;
        await omni.evaluate(code);
        console.log(chalk.green(`\n✓ WLC1 Gateway: ${ip}`));
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  wlc
    .command("poe")
    .description("Habilitar PoE en puerto de switch")
    .argument("<switch>", "Nombre del switch")
    .argument("<port>", "Nombre del puerto")
    .action(async (switchName: string, port: string) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        const omni = controller.omniscience;

        const code = `
          (function() {
            var net = ipc.network();
            var sw = net.getDevice('${switchName}');
            var p = sw.getPort('${port}');
            p.setPower(true);
            return 'PoE enabled on ${switchName}:${port}';
          })()
        `;
        await omni.evaluate(code);
        console.log(chalk.green(`\n✓ PoE habilitado: ${switchName}:${port}`));
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  const apCmd = new Command("ap")
    .description("Comandos para Access Points");

  apCmd
    .command("power-add")
    .description("Agregar power adapter a un AP")
    .argument("<ap-name>", "Nombre del AP (AP1, AP2, AP3)")
    .action(async (apName: string) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        const omni = controller.omniscience;

        const code = `
          (function() {
            var net = ipc.network();
            var d = net.getDevice('${apName}');
            var rm = d.getRootModule();
            var result = rm.addModuleAt('ACCESS_POINT_POWER_ADAPTER', 1);
            return result ? 'success' : 'failed';
          })()
        `;
        const result = await omni.evaluate(code);
        if (String(result).includes('success')) {
          console.log(chalk.green(`\n✓ Power adapter agregado a ${apName}`));
        } else {
          console.log(chalk.red(`\n✗ Fallo al agregar power adapter a ${apName}`));
        }
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  wlc.addCommand(apCmd);

  const swCmd = new Command("sw")
    .description("Comandos para switches");

  swCmd
    .command("svi")
    .description("Configurar SVI en switch")
    .argument("<switch>", "Nombre del switch")
    .argument("<vlan>", "ID de VLAN")
    .argument("<ip>", "Dirección IP")
    .argument("<mask>", "Máscara de subred")
    .action(async (switchName: string, vlan: string, ip: string, mask: string) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        const omni = controller.omniscience;

        const code = `
          (function() {
            var net = ipc.network();
            var sw = net.getDevice('${switchName}');
            var svi = sw.getPort('Vlan${vlan}');
            svi.setIpSubnetMask('${ip}', '${mask}');
            return '${switchName} Vlan${vlan} set to ${ip}/${mask}';
          })()
        `;
        await omni.evaluate(code);
        console.log(chalk.green(`\n✓ ${switchName} Vlan${vlan}: ${ip}/${mask}`));
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  wlc.addCommand(swCmd);

  return wlc;
}