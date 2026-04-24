#!/usr/bin/env bun
/**
 * WLC Network Setup Script
 * Automates power, links, and network configuration for WLC lab
 */

import { Command } from 'commander';
import chalk from 'chalk';

interface DeviceStatus {
  name: string;
  power: boolean;
  portsUp: string[];
  portsDown: string[];
  ip?: string;
  model: string;
}

interface NetworkReport {
  devices: DeviceStatus[];
  linksWorking: number;
  linksTotal: number;
  allPowered: boolean;
  allConnected: boolean;
}

async function getNetworkStatus(): Promise<NetworkReport> {
  const { execSync } = await import('child_process');

  const result = execSync(
    `cd /Users/andresgaibor/code/javascript/cisco-auto && bun run pt omni raw "(function() {
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
          report.push({
            name: name,
            power: d.getPower(),
            model: d.getModel(),
            portsUp: portsUp,
            portsDown: portsDown,
            ip: ip
          });
        }
      });
      return JSON.stringify(report);
    })();"`,
    { encoding: 'utf-8', timeout: 30000 }
  );

  const jsonMatch = result.match(/🚀 RESULTADO: ([\s\S]*?)$/m);
  if (!jsonMatch) throw new Error('Failed to get network status');

  const devices: DeviceStatus[] = JSON.parse(jsonMatch[1]);

  const allPowered = devices.every(d => d.power);
  const allConnected = devices.every(d => d.portsUp.length > 0);

  return {
    devices,
    linksWorking: devices.reduce((sum, d) => sum + d.portsUp.length, 0),
    linksTotal: devices.reduce((sum, d) => sum + d.portsUp.length + d.portsDown.length, 0),
    allPowered,
    allConnected
  };
}

async function ensurePowerOnDevice(deviceName: string): Promise<boolean> {
  const { execSync } = await import('child_process');

  try {
    execSync(
      `cd /Users/andresgaibor/code/javascript/cisco-auto && bun run pt omni raw "(function() {
        var net = ipc.network();
        var d = net.getDevice('${deviceName}');
        if (d && !d.getPower()) {
          d.setPower(true);
          return '${deviceName} powered on';
        }
        return '${deviceName} already powered';
      })();"`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return true;
  } catch (e) {
    return false;
  }
}

async function addPowerAdapter(deviceName: string): Promise<boolean> {
  const { execSync } = await import('child_process');

  try {
    const result = execSync(
      `cd /Users/andresgaibor/code/javascript/cisco-auto && bun run pt omni raw "(function() {
        var net = ipc.network();
        var d = net.getDevice('${deviceName}');
        var rm = d.getRootModule();
        var result = rm.addModuleAt('ACCESS_POINT_POWER_ADAPTER', 1);
        return result ? 'success' : 'failed';
      })();"`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return result.toString().includes('success');
  } catch (e) {
    return false;
  }
}

async function enablePoE(switchName: string, portName: string): Promise<boolean> {
  const { execSync } = await import('child_process');

  try {
    execSync(
      `cd /Users/andresgaibor/code/javascript/cisco-auto && bun run pt omni raw "(function() {
        var net = ipc.network();
        var sw = net.getDevice('${switchName}');
        var p = sw.getPort('${portName}');
        p.setPower(true);
        return 'PoE enabled on ${switchName}:${portName}';
      })();"`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return true;
  } catch (e) {
    return false;
  }
}

async function setWLCManagementIP(ip: string, mask: string, gateway: string): Promise<boolean> {
  const { execSync } = await import('child_process');

  try {
    execSync(
      `cd /Users/andresgaibor/code/javascript/cisco-auto && bun run pt omni raw "(function() {
        var net = ipc.network();
        var wlc = net.getDevice('WLC1');
        var mgmt = wlc.getPort('management');
        mgmt.setIpSubnetMask('${ip}', '${mask}');
        mgmt.setDefaultGateway('${gateway}');
        return 'WLC management set to ${ip}';
      })();"`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return true;
  } catch (e) {
    return false;
  }
}

async function runFullSetup(): Promise<void> {
  console.log(chalk.blue('=== WLC Network Setup Script ===\n'));

  console.log(chalk.yellow('1. Checking current network status...'));
  const status = await getNetworkStatus();

  console.log(chalk.green('\nCurrent Status:'));
  console.log(`   Devices: ${status.devices.length}`);
  console.log(`   Links UP: ${status.linksWorking}/${status.linksTotal}`);
  console.log(`   All Powered: ${status.allPowered ? 'YES' : 'NO'}`);
  console.log(`   All Connected: ${status.allConnected ? 'YES' : 'NO'}`);

  console.log(chalk.yellow('\n2. Ensuring devices are powered...'));

  for (const dev of status.devices) {
    if (!dev.power) {
      console.log(`   ${chalk.red('✗')} ${dev.name}: OFFLINE - needs power`);
      if (dev.model.includes('LAP')) {
        console.log(`     ${chalk.blue('→')} Adding power adapter...`);
        await addPowerAdapter(dev.name);
      } else {
        await ensurePowerOnDevice(dev.name);
      }
    } else {
      console.log(`   ${chalk.green('✓')} ${dev.name}: powered`);
    }
  }

  console.log(chalk.yellow('\n3. Enabling PoE on switch ports...'));
  await enablePoE('SW1', 'FastEthernet0/3');
  await enablePoE('SW1', 'FastEthernet0/4');
  await enablePoE('SW1', 'FastEthernet0/5');
  console.log('   PoE enabled on Fa0/3, Fa0/4, Fa0/5');

  console.log(chalk.yellow('\n4. Configuring WLC management IP...'));
  await setWLCManagementIP('192.168.10.2', '255.255.255.0', '192.168.10.1');
  console.log('   WLC management: 192.168.10.2/24');

  console.log(chalk.yellow('\n5. Final verification...'));
  const finalStatus = await getNetworkStatus();

  console.log(chalk.green('\n=== Final Network Status ==='));
  for (const dev of finalStatus.devices) {
    const statusIcon = dev.portsUp.length > 0 ? chalk.green('✓') : chalk.red('✗');
    console.log(`\n${statusIcon} ${dev.name} (${dev.model})`);
    console.log(`   IP: ${dev.ip || 'N/A'}`);
    console.log(`   Ports UP: ${dev.portsUp.join(', ') || 'none'}`);
    if (dev.portsDown.length > 0) {
      console.log(`   Ports DOWN: ${dev.portsDown.join(', ')}`);
    }
  }

  console.log(chalk.yellow('\n=== WLAN Configuration Required ==='));
  console.log('The WLC WLANs must be configured manually via GUI:');
  console.log('1. Open WLC1 in Packet Tracer');
  console.log('2. Go to Config > WLANs');
  console.log('3. Create 4 WLANs:');
  console.log('   - WLAN 1: Docentes (RADIUS auth)');
  console.log('   - WLAN 2: Estudiantes (PSK)');
  console.log('   - WLAN 3: Eduroam (PSK)');
  console.log('   - WLAN 4: Invitados (Open)');
}

export function createWlcSetupCommand(): Command {
  return new Command('wlc-setup')
    .description('Setup WLC network with power, PoE, and basic configuration')
    .action(runFullSetup);
}
