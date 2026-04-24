#!/usr/bin/env bun

import { runRealVerification } from "../real-verification-runner.js";

interface CliOptions {
  profile: string;
  label?: string;
  baselineLabel?: string;
  scenario?: string;
  continueOnError?: boolean;
  attemptRecovery?: boolean;
  maxRecoveryAttempts?: number;
  excludeScenario?: string[];
  repeat?: number;
  compareBaseline?: boolean;
  tags?: string[];
  commandTimeoutMs?: number;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    profile: "smoke",
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--profile" || arg === "-p") {
      options.profile = argv[++i] ?? "smoke";
    } else if (arg === "--label" || arg === "-l") {
      options.label = argv[++i];
    } else if (arg === "--scenario") {
      options.scenario = argv[++i];
    } else if (arg === "--continue-on-error") {
      options.continueOnError = argv[++i] === "true";
    } else if (arg === "--attempt-recovery") {
      options.attemptRecovery = argv[++i] === "true";
    } else if (arg === "--max-recovery-attempts") {
      options.maxRecoveryAttempts = parseInt(argv[++i] ?? "2", 10);
    } else if (arg === "--exclude-scenario") {
      if (!options.excludeScenario) options.excludeScenario = [];
      options.excludeScenario.push(argv[++i] ?? "");
    } else if (arg === "--baseline-label") {
      options.baselineLabel = argv[++i];
    } else if (arg === "--compare-baseline") {
      options.compareBaseline = true;
    } else if (arg === "--repeat") {
      options.repeat = parseInt(argv[++i] ?? "1", 10);
    } else if (arg === "--tag" || arg === "-t") {
      if (!options.tags) options.tags = [];
      options.tags.push(argv[++i] ?? "");
    } else if (arg === "--command-timeout" || arg === "-ct") {
      options.commandTimeoutMs = parseInt(argv[++i] ?? "20000", 10);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
 pt-real-verify - Ejecutor de verification real contra Packet Tracer

 Uso:
   bun run pt-real-verify [opciones]

 Opciones:
   --profile <perfil>       Perfil de ejecucion (default: smoke)
   --label <label>          Label opcional para la corrida
   --baseline-label <label> Guardar baseline con nombre especifico
   --compare-baseline       Comparar contra baseline guardado
   --scenario <id>          Ejecutar un escenario especifico
   --continue-on-error      Continuar aunque fallen escenarios (default: true)
   --attempt-recovery       Intentar recovery ante fallos (default: true)
   --max-recovery-attempts  Maximo de intentos de recovery (default: 2)
   --exclude-scenario <id>  Excluir un escenario especifico
   --repeat <N>             Ejecutar N veces (default: 1)
   --tag, -t <tag>          Filtrar por tag (puede repetirse)
   --help, -h               Mostrar esta ayuda

 Perfiles disponibles:
   smoke                - Escenarios basicos de smoke
   network-core         - Switching, VLAN, MAC learning
   ios-core             - Sesion IOS, show commands
   interactive-core     - Pagination, dialogs interactivos
   host                 - Command prompt de PC/Server
   full                 - Todos los perfiles

   # Fase 3 - Perfiles avanzados
   switching-advanced   - STP, EtherChannel, troubleshooting avanzado
   routing-intervlan     - Inter-VLAN routing, router-on-stick
   dhcp-core            - DHCP server, relay, pools
   interactive-resilience - Escenarios de recuperacion interactiva

# Fase 4 - Perfiles de resiliencia y stability
    switching-resilience  - RSTP, MSTP, portfast, BPDU guard
    etherchannel-core    - PAgP, LACP, EtherChannel troubleshooting
    dynamic-routing-core  - OSPF, EIGRP, routing redistribution
    acl-nat-core          - ACLs extendidas, NAT, seguridad
    services-advanced    - DNS, HTTP, SMTP server config
    stability-regression  - Regression testing para estabilidad

    # Fase 5 - Perfiles de seguridad, IPv6, HSRP y wireless
    security-core        - Port Security, DHCP Snooping, ARP Inspection
    ipv6-core            - IPv6, SLAAC, DHCPv6, OSPFv3
    hsrp-core            - HSRP, GLBP, failover gateway
    wireless-core        - WLAN, AP, WLC, guest access

  Tags disponibles para filtrado:
    trunk, stp, rstp, etherchannel, pagp, lacp
    vlan, inter-vlan, router-stick
    dhcp, dhcp-relay, dhcp-pool
    ospf, eigrp, routing, redistribution
    acl, nat, security, firewall
    dns, http, email, server
    recovery, resilience, regression

    # Phase 5 Tags
    port-security, dhcp-snooping, arp-inspection
    ipv6, slaac, ospf
    hsrp, wireless, email

 Ejemplos:
   bun run pt-real-verify --profile smoke
   bun run pt-real-verify --profile switching-advanced --tag stp --tag etherchannel
   bun run pt-real-verify --profile dynamic-routing-core --compare-baseline
   bun run pt-real-verify --profile full --repeat 3 --label stress-test
   bun run pt-real-verify --profile dhcp-core --baseline-label baseline-dhcp
   `);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);

  console.log(`\n🚀 Iniciando corrida real: ${options.profile}`);
  console.log(`   Continuar en error: ${options.continueOnError ?? true}`);
  console.log(`   Attempt recovery: ${options.attemptRecovery ?? true}`);
  if (options.repeat && options.repeat > 1) console.log(`   Repetir: ${options.repeat}x`);
  if (options.tags && options.tags.length > 0) console.log(`   Tags: ${options.tags.join(", ")}`);
  if (options.baselineLabel) console.log(`   Baseline: ${options.baselineLabel}`);
  if (options.compareBaseline) console.log(`   Comparar baseline: enabled`);
  if (options.commandTimeoutMs) console.log(`   Command timeout: ${options.commandTimeoutMs}ms`);
  console.log();

  try {
    const summary = await runRealVerification({
      profile: options.profile,
      label: options.label,
      baselineLabel: options.baselineLabel,
      compareBaseline: options.compareBaseline,
      includeScenarioIds: options.scenario ? [options.scenario] : undefined,
      excludeScenarioIds: options.excludeScenario,
      continueOnError: options.continueOnError ?? true,
      attemptRecovery: options.attemptRecovery ?? true,
      maxRecoveryAttempts: options.maxRecoveryAttempts ?? 2,
      repeat: options.repeat,
      tags: options.tags,
      commandTimeoutMs: options.commandTimeoutMs,
    });

    console.log(`\n✅ Corrida completada: ${summary.runId}`);
    console.log(`   Status: ${summary.status}`);
    console.log(`   Escenarios: ${summary.scenarioCounts.passed}/${summary.scenarioCounts.total} pasados`);
    console.log(`   Duracion: ${(summary.durationMs / 1000).toFixed(1)}s`);
    console.log(`   Artefactos: ${summary.artifactsRoot}\n`);

    if (summary.scenarioCounts.failed > 0) {
      console.log(`⚠️  Escenarios fallidos: ${summary.scenarioCounts.failed}`);
    }
    if (summary.fatalErrors.length > 0) {
      console.log(`🚨 Errores fatales:`);
      for (const err of summary.fatalErrors) {
        console.log(`   - ${err}`);
      }
    }

    process.exit(summary.scenarioCounts.failed > 0 ? 1 : 0);
  } catch (e) {
    console.error(`\n🚨 Error en corrida: ${e}`);
    process.exit(1);
  }
}

main();