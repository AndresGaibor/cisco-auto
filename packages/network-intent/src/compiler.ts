import type { NetworkLabIntent } from "./schema.js";

export interface LabStep {
  device: string;
  command: string;
  expectMode?: string;
  verify?: {
    includes?: string[];
    excludes?: string[];
  };
}

export interface LabPrecheck {
  device: string;
  command: string;
  assert: { includes?: string[] };
}

export interface CompiledLabPlan {
  id: string;
  intent: NetworkLabIntent;
  prechecks: LabPrecheck[];
  buildSteps: LabStep[];
  configSteps: LabStep[];
  verificationSteps: LabStep[];
  rollbackSteps: LabStep[];
}

export function compileLabIntent(intent: NetworkLabIntent): CompiledLabPlan {
  const prechecks: LabPrecheck[] = [];
  const buildSteps: LabStep[] = [];
  const configSteps: LabStep[] = [];
  const verificationSteps: LabStep[] = [];
  const rollbackSteps: LabStep[] = [];

  if (intent.vlans) {
    for (const vlan of intent.vlans) {
      const vlanSteps = compileVlanSteps(vlan, intent.devices);
      configSteps.push(...vlanSteps);
      rollbackSteps.push(...compileVlanRollback(vlan));
    }
  }

  if (intent.switching) {
    if (intent.switching.trunks) {
      for (const trunk of intent.switching.trunks) {
        configSteps.push(...compileTrunkSteps(trunk));
        rollbackSteps.push(...compileTrunkRollback(trunk));
      }
    }
    if (intent.switching.accessPorts) {
      for (const port of intent.switching.accessPorts) {
        configSteps.push(...compileAccessPortSteps(port));
        rollbackSteps.push(...compileAccessPortRollback(port));
      }
    }
  }

  if (intent.routing?.interVlan) {
    const ivConfig = intent.routing.interVlan;
    if (ivConfig.mode === "svi" && ivConfig.svi) {
      for (const svi of ivConfig.svi) {
        configSteps.push(...compileSviSteps(ivConfig.device, svi));
        rollbackSteps.push(...compileSviRollback(ivConfig.device, svi));
      }
    }
  }

  if (intent.verification?.connectivity) {
    for (const check of intent.verification.connectivity) {
      verificationSteps.push(...compileConnectivityCheck(check));
    }
  }

  return {
    id: intent.name,
    intent,
    prechecks,
    buildSteps,
    configSteps,
    verificationSteps,
    rollbackSteps,
  };
}

function compileVlanSteps(vlan: { id: number; name: string }, devices: any[]): LabStep[] {
  const switches = devices.filter((d: any) => d.role === "core" || d.role === "access");
  const steps: LabStep[] = [];
  
  for (const sw of switches) {
    steps.push(
      { device: sw.name, command: "conf t", expectMode: "global-config" },
      { device: sw.name, command: `vlan ${vlan.id}`, expectMode: "config-vlan" },
      { device: sw.name, command: `name ${vlan.name}`, expectMode: "config-vlan" },
      { device: sw.name, command: "exit", expectMode: "global-config" },
      { device: sw.name, command: "end", expectMode: "privileged-exec" },
      { 
        device: sw.name, 
        command: "show vlan brief",
        verify: { includes: [`${vlan.id}`, vlan.name] }
      },
    );
  }
  return steps;
}

function compileTrunkSteps(trunk: { device: string; interface: string; allowedVlans: number[]; nativeVlan?: number }): LabStep[] {
  const steps: LabStep[] = [
    { device: trunk.device, command: "conf t", expectMode: "global-config" },
    { device: trunk.device, command: `interface ${trunk.interface}`, expectMode: "config-if" },
    { device: trunk.device, command: "switchport mode trunk", expectMode: "config-if" },
    { device: trunk.device, command: `switchport trunk allowed vlan ${trunk.allowedVlans.join(",")}`, expectMode: "config-if" },
  ];
  if (trunk.nativeVlan) {
    steps.push({ device: trunk.device, command: `switchport trunk native vlan ${trunk.nativeVlan}`, expectMode: "config-if" });
  }
  steps.push({ device: trunk.device, command: "end", expectMode: "privileged-exec" });
  return steps;
}

function compileAccessPortSteps(port: { device: string; interface: string; vlan: number }): LabStep[] {
  return [
    { device: port.device, command: "conf t", expectMode: "global-config" },
    { device: port.device, command: `interface ${port.interface}`, expectMode: "config-if" },
    { device: port.device, command: "switchport mode access", expectMode: "config-if" },
    { device: port.device, command: `switchport access vlan ${port.vlan}`, expectMode: "config-if" },
    { device: port.device, command: "spanning-tree portfast", expectMode: "config-if" },
    { device: port.device, command: "end", expectMode: "privileged-exec" },
  ];
}

function compileSviSteps(device: string, svi: { vlan: number; ip: string }): LabStep[] {
  return [
    { device: device, command: "conf t", expectMode: "global-config" },
    { device: device, command: `interface vlan ${svi.vlan}`, expectMode: "config-if" },
    { device: device, command: `ip address ${svi.ip}`, expectMode: "config-if" },
    { device: device, command: "no shutdown", expectMode: "config-if" },
    { device: device, command: "end", expectMode: "privileged-exec" },
  ];
}

function compileConnectivityCheck(check: { from: string; to: string; type: string }): LabStep[] {
  if (check.type === "ping") {
    return [{ device: check.from, command: `ping ${check.to}`, verify: { includes: ["Success rate"] } }];
  }
  if (check.type === "trace") {
    return [{ device: check.from, command: `traceroute ${check.to}`, verify: { includes: ["Trace complete"] } }];
  }
  return [{ device: check.from, command: `ping ${check.to}`, verify: { includes: ["Success rate"] } }];
}

function compileVlanRollback(vlan: { id: number }): LabStep[] {
  return [
    { device: "", command: "conf t", expectMode: "global-config" },
    { device: "", command: `no vlan ${vlan.id}`, expectMode: "config-vlan" },
    { device: "", command: "end", expectMode: "privileged-exec" },
  ];
}

function compileTrunkRollback(trunk: { device: string; interface: string }): LabStep[] {
  return [
    { device: trunk.device, command: "conf t", expectMode: "global-config" },
    { device: trunk.device, command: `interface ${trunk.interface}`, expectMode: "config-if" },
    { device: trunk.device, command: "no switchport mode trunk", expectMode: "config-if" },
    { device: trunk.device, command: "end", expectMode: "privileged-exec" },
  ];
}

function compileAccessPortRollback(port: { device: string; interface: string }): LabStep[] {
  return [
    { device: port.device, command: "conf t", expectMode: "global-config" },
    { device: port.device, command: `interface ${port.interface}`, expectMode: "config-if" },
    { device: port.device, command: "no switchport access vlan", expectMode: "config-if" },
    { device: port.device, command: "end", expectMode: "privileged-exec" },
  ];
}

function compileSviRollback(device: string, svi: { vlan: number }): LabStep[] {
  return [
    { device: device, command: "conf t", expectMode: "global-config" },
    { device: device, command: `no interface vlan ${svi.vlan}`, expectMode: "config-if" },
    { device: device, command: "end", expectMode: "privileged-exec" },
  ];
}
