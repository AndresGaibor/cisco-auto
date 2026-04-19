export interface VerificationCheck {
  name: string;
  ok: boolean;
  details?: Record<string, unknown>;
}

export interface VerificationResult {
  executed: boolean;
  verified: boolean;
  partiallyVerified?: boolean;
  verificationSource?: string[];
  warnings?: string[];
  checks?: VerificationCheck[];
}

export type ExecFn = (device: string, command: string, parse?: boolean, timeout?: number) => Promise<{ raw: string; parsed?: any }>;

export class IosVerificationService {
  constructor(private exec: ExecFn) {}

  private makeResult(executed: boolean, verified: boolean, checks?: VerificationCheck[], warnings?: string[], sources?: string[]): VerificationResult {
    const partial = checks ? checks.some((c) => !c.ok) && checks.some((c) => c.ok) : false;
    return {
      executed,
      verified,
      partiallyVerified: partial ? true : undefined,
      verificationSource: sources,
      warnings,
      checks,
    };
  }

  async verifyInterfaceIp(device: string, interfaceName: string, expectedIp: string): Promise<VerificationResult> {
    const sources: string[] = ["show ip interface brief"];
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      const out = await this.exec(device, "show ip interface brief", true, 3000);
      const parsed = out.parsed;
      const raw = out.raw || "";

      // Try to use parsed entries if available
      const entries = (parsed && parsed.entries) ? parsed.entries : null;

      if (entries && Array.isArray(entries)) {
        // find by exact match or suffix match (handle Gi0/1 vs GigabitEthernet0/1)
        const found = entries.find((e: any) => {
          if (!e) return false;
          const name = (e.interface || e.name || e.iface || "").toString();
          if (!name) return false;
          if (name.toLowerCase() === interfaceName.toLowerCase()) return true;
          if (name.toLowerCase().endsWith(interfaceName.toLowerCase())) return true;
          return false;
        });

        if (found) {
          const ip = (found.ipAddress || found.ip || "").toString();
          const ok = ip === expectedIp;
          checks.push({ name: "interface-ip-match", ok, details: { interface: interfaceName, expected: expectedIp, found: ip } });
          return this.makeResult(true, ok, checks, warnings, sources);
        } else {
          warnings.push("Interface not found in parsed show ip interface brief");
          checks.push({ name: "interface-present", ok: false, details: { interface: interfaceName } });
          return this.makeResult(true, false, checks, warnings, sources);
        }
      }

      const interfaceBlock = raw.match(new RegExp('interface\\s+' + interfaceName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + '[\\s\\S]*?(?=^interface\\s+|^!)', 'im'))?.[0] ?? '';
      if (interfaceBlock) {
        const ipMatch = interfaceBlock.match(/ip address\s+(\S+)/i);
        const foundIp = ipMatch ? ipMatch[1] : '';
        const ok = foundIp === expectedIp;
        checks.push({ name: 'interface-ip-match', ok, details: { interface: interfaceName, expected: expectedIp, found: foundIp } });
        return this.makeResult(true, ok, checks, warnings, sources);
      }

      // Fallback: regex parse raw output
      const re = new RegExp("^" + interfaceName.replace(/[-/\\\\^$*+?.()|[\]{}]/g, "\\$&") + "\\s+(\\S+)", "mi");
      const m = raw.match(re);
      if (m) {
        const foundIp = m[1];
        const ok = foundIp === expectedIp;
        checks.push({ name: "interface-ip-match", ok, details: { interface: interfaceName, expected: expectedIp, found: foundIp } });
        return this.makeResult(true, ok, checks, warnings, sources);
      }

      warnings.push("Could not parse output for show ip interface brief");
      return this.makeResult(true, false, checks, warnings, sources);
    } catch (err) {
      return this.makeResult(false, false, checks, [String(err)], sources);
    }
  }

  async verifyVlanExists(device: string, vlanId: number): Promise<VerificationResult> {
    const sources = ["show vlan brief"];
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      const out = await this.exec(device, "show vlan brief", true, 3000);
      const parsed = out.parsed;
      const raw = out.raw || "";
      const entries = (parsed && parsed.entries) ? parsed.entries : null;

      if (entries && Array.isArray(entries)) {
        const found = entries.find((v: any) => Number(v.id) === Number(vlanId));
        if (found) {
          checks.push({ name: "vlan-exists", ok: true, details: { vlan: vlanId, entry: found } });
          return this.makeResult(true, true, checks, warnings, sources);
        } else {
          checks.push({ name: "vlan-exists", ok: false, details: { vlan: vlanId } });
          warnings.push("VLAN not present in show vlan brief parsed output");
          return this.makeResult(true, false, checks, warnings, sources);
        }
      }

      // fallback raw search
      var re = new RegExp("^\\s*" + vlanId + "\\s+", "m");
      if (re.test(raw)) {
        checks.push({ name: "vlan-exists", ok: true, details: { vlan: vlanId } });
        return this.makeResult(true, true, checks, warnings, sources);
      }

      checks.push({ name: "vlan-exists", ok: false, details: { vlan: vlanId } });
      warnings.push("Could not locate VLAN in raw output");
      return this.makeResult(true, false, checks, warnings, sources);
    } catch (err) {
      return this.makeResult(false, false, checks, [String(err)], sources);
    }
  }

  async verifyAccessPort(device: string, portName: string, expectedVlan?: number): Promise<VerificationResult> {
    const sources = ["show running-config", "show interfaces"]; 
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      const rc = await this.exec(device, "show running-config", true, 3000);
      const parsed = rc.parsed;
      const raw = rc.raw || "";

      // parsed.running-config may present interface blocks
      if (parsed && parsed.entries && parsed.entries.interfaces) {
        const ifaces = parsed.entries.interfaces;
        const found = ifaces[portName] || Object.keys(ifaces).find((k) => k.toLowerCase().endsWith(portName.toLowerCase()));
        if (found) {
          const body = ifaces[found];
          const cfg = typeof body === 'string' ? body : JSON.stringify(body ?? '');
          const hasAccess = JSON.stringify(cfg).toLowerCase().indexOf('switchport access vlan') >= 0 || JSON.stringify(cfg).toLowerCase().indexOf('switchport mode access') >= 0;
          checks.push({ name: 'access-port-mode', ok: !!hasAccess, details: { interface: found } });
          if (expectedVlan) {
            const m = JSON.stringify(cfg).match(/switchport access vlan\s+(\d+)/i);
            const foundVlan = m ? parseInt(m[1]!) : null;
            checks.push({ name: 'access-port-vlan', ok: foundVlan === expectedVlan, details: { expected: expectedVlan, found: foundVlan } });
            const verified = !!hasAccess && (foundVlan === expectedVlan);
            return this.makeResult(true, verified, checks, warnings, sources);
          }
          return this.makeResult(true, !!hasAccess, checks, warnings, sources);
        }
      }

      // fallback: regex in running-config raw
      var re = new RegExp('interface\\s+' + portName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), 'i');
      if (re.test(raw)) {
        // attempt to extract the interface block
        var blockRe = new RegExp('interface\\s+' + portName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + '[\\s\\S]*?(?=^interface\\s+|^!)', 'im');
        var bm = raw.match(blockRe);
        var block = bm ? bm[0] : '';
        var hasAccess = /switchport access vlan/i.test(block) || /switchport mode access/i.test(block);
        checks.push({ name: 'access-port-mode', ok: !!hasAccess, details: { interface: portName } });
        if (expectedVlan) {
          var vm = block.match(/switchport access vlan\s+(\d+)/i);
          var fv = vm ? parseInt(vm[1]!) : null;
          checks.push({ name: 'access-port-vlan', ok: fv === expectedVlan, details: { expected: expectedVlan, found: fv } });
          return this.makeResult(true, !!hasAccess && fv === expectedVlan, checks, warnings, sources);
        }
        return this.makeResult(true, !!hasAccess, checks, warnings, sources);
      }

      warnings.push('Interface block not found in running-config');
      return this.makeResult(true, false, checks, warnings, sources);
    } catch (err) {
      return this.makeResult(false, false, checks, [String(err)], sources);
    }
  }

  async verifyTrunkPort(device: string, portName: string, expectedVlans?: number[]): Promise<VerificationResult> {
    const sources = ["show running-config", "show interfaces"]; 
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      const rc = await this.exec(device, "show running-config", true, 3000);
      const parsed = rc.parsed;
      const raw = rc.raw || "";

      // Look for interface config
      var blockRe = new RegExp('interface\\s+' + portName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + '[\\s\\S]*?(?=^interface\\s+|^!)', 'im');
      var bm = raw.match(blockRe);
      var block = bm ? bm[0] : '';
      var isTrunk = /switchport mode trunk/i.test(block) || /switchport trunk encapsulation/i.test(block);
      checks.push({ name: 'trunk-mode', ok: !!isTrunk, details: { interface: portName } });
      if (!isTrunk) return this.makeResult(true, false, checks, warnings, sources);

      if (expectedVlans && expectedVlans.length > 0) {
        var m = block.match(/switchport trunk allowed vlan\s+(.+)/i);
        var allowed = m ? (m[1] ?? "").trim() : "";
        var allowedSet = new Set<number>();
        if (allowed) {
          allowed.split(/[,\s]+/).forEach(function(p){ if(p) { if(p.indexOf('-')>=0) { var r = p.split('-'); var a = parseInt(r[0] ?? ""); var b = parseInt(r[1] ?? ""); for(var x=a;x<=b;x++) allowedSet.add(x); } else allowedSet.add(parseInt(p)); } });
        }
        var allPresent = expectedVlans.every(function(v){ return allowedSet.has(v); });
        checks.push({ name: 'trunk-allowed-vlans', ok: allPresent, details: { expected: expectedVlans, allowed: Array.from(allowedSet) } });
        return this.makeResult(true, allPresent, checks, warnings, sources);
      }

      return this.makeResult(true, true, checks, warnings, sources);
    } catch (err) {
      return this.makeResult(false, false, checks, [String(err)], sources);
    }
  }

  async verifyStaticRoute(device: string, network: string, mask: string, nextHop: string): Promise<VerificationResult> {
    const sources = ["show ip route"];
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      const out = await this.exec(device, "show ip route", true, 3000);
      const parsed = out.parsed;
      const raw = out.raw || "";
      const entries = (parsed && parsed.entries) ? parsed.entries : null;

      if (entries && Array.isArray(entries)) {
        const found = entries.find((r: any) => {
          if (!r || !r.network) return false;
          return (r.network === network || (r.network && r.network.indexOf(network) >= 0)) && (r.nextHop === nextHop || r.interface === nextHop);
        });
        checks.push({ name: 'static-route-present', ok: !!found, details: { network, mask, nextHop, found } });
        return this.makeResult(true, !!found, checks, warnings, sources);
      }

      // fallback raw
      var re = new RegExp('^S\\s+' + network.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\b.*via\\s+" + nextHop.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), 'im');
      if (re.test(raw)) {
        checks.push({ name: 'static-route-present', ok: true, details: { network, nextHop } });
        return this.makeResult(true, true, checks, warnings, sources);
      }

      checks.push({ name: 'static-route-present', ok: false, details: { network, nextHop } });
      warnings.push('Static route not found');
      return this.makeResult(true, false, checks, warnings, sources);
    } catch (err) {
      return this.makeResult(false, false, checks, [String(err)], sources);
    }
  }

  async verifySubinterface(device: string, subinterfaceName: string, expectedIp: string): Promise<VerificationResult> {
    const sources = ["show ip interface brief", "show running-config"]; 
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      // check brief
      const brief = await this.exec(device, "show ip interface brief", true, 3000);
      const entries = (brief.parsed && brief.parsed.entries) ? brief.parsed.entries : null;
      if (entries && Array.isArray(entries)) {
        const found = entries.find((e: any) => {
          const name = (e.interface || e.name || '').toString();
          return name.toLowerCase() === subinterfaceName.toLowerCase() || name.toLowerCase().endsWith(subinterfaceName.toLowerCase());
        });
        if (found) {
          const ip = (found.ipAddress || found.ip || '').toString();
          checks.push({ name: 'subinterface-ip', ok: ip === expectedIp, details: { expected: expectedIp, found: ip } });
          return this.makeResult(true, ip === expectedIp, checks, warnings, sources);
        }
      }

      // fallback to running-config
      const rc = await this.exec(device, "show running-config", true, 3000);
      var raw = rc.raw || "";
      var re = new RegExp('^interface\\s+' + subinterfaceName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + '[\\s\\S]*?(?=^interface\\s+|^!)', 'im');
      var m = raw.match(re);
      if (m) {
        var block = m[0];
        var ipm = block.match(/ip address\s+(\S+)/i);
        var foundIp = ipm ? ipm[1] : null;
        checks.push({ name: 'subinterface-ip', ok: foundIp === expectedIp, details: { expected: expectedIp, found: foundIp } });
        return this.makeResult(true, foundIp === expectedIp, checks, warnings, sources);
      }

      warnings.push('Subinterface not found in brief or running-config');
      return this.makeResult(true, false, checks, warnings, sources);
    } catch (err) {
      return this.makeResult(false, false, checks, [String(err)], sources);
    }
  }

  async verifyDhcpRelay(device: string, interfaceName: string, helperAddress: string): Promise<VerificationResult> {
    const sources = ["show running-config"];
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      const rc = await this.exec(device, "show running-config", true, 3000);
      var raw = rc.raw || "";
      var blockRe = new RegExp('interface\\s+' + interfaceName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + '[\\s\\S]*?(?=^interface\\s+|^!)', 'im');
      var bm = raw.match(blockRe);
      var block = bm ? bm[0] : '';
      if (!block) {
        warnings.push('Interface not found in running-config');
        return this.makeResult(true, false, checks, warnings, sources);
      }
      var m = block.match(new RegExp('ip helper-address\\s+' + helperAddress.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), 'i'));
      var ok = !!m;
      checks.push({ name: 'dhcprelay-helper', ok: ok, details: { interface: interfaceName, helper: helperAddress } });
      return this.makeResult(true, ok, checks, warnings, sources);
    } catch (err) {
      return this.makeResult(false, false, checks, [String(err)], sources);
    }
  }

  async verifyDhcpPool(device: string, poolName: string): Promise<VerificationResult> {
    const sources = ["show running-config"];
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      const rc = await this.exec(device, "show running-config", true, 5000);
      const raw = rc.raw || "";
      const hasPool = raw.includes(`ip dhcp pool ${poolName}`);
      checks.push({ name: 'dhcp-pool-present', ok: hasPool, details: { poolName } });
      if (!hasPool) warnings.push(`DHCP pool '${poolName}' not found in running-config`);
      return this.makeResult(true, hasPool, checks, warnings, sources);
    } catch (err) {
      return this.makeResult(false, false, checks, [String(err)], sources);
    }
  }

  async verifyOspf(device: string, processId?: number): Promise<VerificationResult> {
    const sources = ["show ip protocols"];
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      const out = await this.exec(device, "show ip protocols", true, 5000);
      const raw = out.raw || "";
      const hasOspf = raw.toLowerCase().includes("ospf");
      checks.push({ name: 'ospf-visible', ok: hasOspf, details: { processId } });

      if (!hasOspf) {
        warnings.push('OSPF not visible in show ip protocols');
        return this.makeResult(true, false, checks, warnings, sources);
      }

      if (processId !== undefined) {
        const hasProcess = raw.includes(`Routing Protocol is "ospf ${processId}"`) || raw.includes(`Routing Protocol is "ospf"`);
        checks.push({ name: 'ospf-process-id', ok: hasProcess, details: { processId } });
        if (!hasProcess) warnings.push(`OSPF process ${processId} not found`);
        return this.makeResult(true, hasProcess, checks, warnings, sources);
      }

      if (raw.toLowerCase().includes('ospf')) {
        return this.makeResult(true, true, checks, warnings, sources);
      }

      return this.makeResult(true, true, checks, warnings, sources);
    } catch (err) {
      return this.makeResult(false, false, checks, [String(err)], sources);
    }
  }

  async verifyAcl(device: string, aclNumber: number): Promise<VerificationResult> {
    const sources = ["show access-lists"];
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      const out = await this.exec(device, "show access-lists", true, 5000);
      const raw = out.raw || "";
      const hasAcl = raw.includes(`${aclNumber} `) || raw.includes(`access-list ${aclNumber}`);
      checks.push({ name: 'acl-present', ok: hasAcl, details: { aclNumber } });
      if (!hasAcl) warnings.push(`ACL ${aclNumber} not found in show access-lists`);
      return this.makeResult(true, hasAcl, checks, warnings, sources);
    } catch (err) {
      return this.makeResult(false, false, checks, [String(err)], sources);
    }
  }

  async verifyRunningConfigContains(device: string, snippets: string[]): Promise<VerificationResult> {
    const sources = ["show running-config"];
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      const out = await this.exec(device, "show running-config", false, 15000);
      const raw = out.raw || "";

      for (const snippet of snippets) {
        const ok = raw.toLowerCase().includes(snippet.toLowerCase());
        checks.push({
          name: "running-config-contains",
          ok,
          details: { snippet },
        });
        if (!ok) warnings.push(`No se encontró snippet en running-config: ${snippet}`);
      }

      const verified = checks.length > 0 && checks.every((c) => c.ok);
      return this.makeResult(true, verified, checks, warnings, sources);
    } catch (err) {
      return this.makeResult(false, false, checks, [String(err)], sources);
    }
  }
}
