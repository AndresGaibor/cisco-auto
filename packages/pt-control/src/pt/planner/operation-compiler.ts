// ============================================================================
// OperationCompiler - Compila OperationIntent a DeferredJobPlan
// ============================================================================

import type {
  OperationIntent,
  OperationIntentType,
  DeferredJobPlan,
  Precheck,
  DeferredStep,
  Checkpoint,
  RollbackConfig,
  ExecutionSurface,
} from './change-planner-types.js';

/**
 * OperationCompiler - compiles high-level operation intents to executable plans
 */
export class OperationCompiler {
  /**
   * Compilar operación a plan
   */
  compile(intent: OperationIntent): DeferredJobPlan {
    switch (intent.type) {
      case 'router-on-a-stick':
        return this.compileRouterOnAStick(intent);
      case 'vlan-segmentation':
        return this.compileVlanSegmentation(intent);
      case 'dhcp-service':
        return this.compileDhcpService(intent);
      case 'routing-protocol':
        return this.compileRoutingProtocol(intent);
      case 'acl-security':
        return this.compileAclSecurity(intent);
      case 'trunk-connection':
        return this.compileTrunkConnection(intent);
      case 'access-layer':
        return this.compileAccessLayer(intent);
      default:
        return this.compileGeneric(intent);
    }
  }

  /**
   * Compilar "router-on-a-stick"
   */
  private compileRouterOnAStick(intent: OperationIntent): DeferredJobPlan {
    const devices = intent.devices;
    const router = devices[0] ?? 'Router1';
    const switch_ = devices[1] ?? 'Switch1';
    const vlans = (intent.parameters['vlans'] as number[]) || [10, 20];
    const subnets = (intent.parameters['subnets'] as string[]) || [];

    const planId = `plan-${Date.now()}-router-on-a-stick`;
    
    // Prechecks
    const prechecks: Precheck[] = [
      { type: 'capability', device: router, check: 'subinterface support', required: true },
      { type: 'capability', device: switch_, check: 'trunk support', required: true },
      { type: 'topology', check: `VLANs ${vlans.join(',')} exist on ${switch_}`, required: true },
    ];

    // Steps
    const steps: DeferredStep[] = [];

    // Step 1: Configure trunk on switch
    steps.push({
      order: 1,
      surface: 'ios',
      device: switch_,
      commands: [
        `interface ${intent.parameters['switchPort'] || 'GigabitEthernet0/1'}`,
        'switchport mode trunk',
        `switchport trunk allowed vlan ${vlans.join(',')}`,
      ],
      verification: {
        command: `show interface ${intent.parameters['switchPort'] || 'GigabitEthernet0/1'} switchport`,
        expectedPattern: 'Mode: trunk',
      },
      timeout: 30000,
      onError: 'abort',
    });

    // Step 2: Configure subinterfaces on router
    let subnetIndex = 0;
    for (const vlan of vlans) {
      const subnet = subnets[subnetIndex] || `192.168.${vlan}.0/24`;
      subnetIndex++;
      
      steps.push({
        order: steps.length + 1,
        surface: 'ios',
        device: router,
        commands: [
          `interface GigabitEthernet0/0.${vlan}`,
          `encapsulation dot1q ${vlan}`,
          `ip address ${this.getGatewayFromSubnet(subnet)}`,
        ],
        verification: {
          command: `show ip interface GigabitEthernet0/0.${vlan}`,
          expectedPattern: `192\\.168\\.${vlan}\\.`,
        },
        timeout: 30000,
        onError: 'continue',
      });
    }

    // Step 3: Verify routing
    steps.push({
      order: steps.length + 1,
      surface: 'ios',
      device: router,
      commands: ['show ip route'],
      verification: {
        command: 'show ip route',
        expectedPattern: 'Connected',
      },
      timeout: 15000,
    });

    // Checkpoints
    const checkpoints: Checkpoint[] = [
      { step: 1, verify: 'Trunk configured', onFail: 'rollback' },
      { step: vlans.length + 1, verify: 'Subinterfaces up', onFail: 'warn' },
      { step: steps.length, verify: 'Routing working', onFail: 'warn' },
    ];

    // Rollback
    const rollback: RollbackConfig = {
      onStepFail: 2,
      actions: vlans.map(vlan => `no interface GigabitEthernet0/0.${vlan}`),
    };

    return {
      id: planId,
      intent,
      prechecks,
      steps,
      checkpoints,
      rollback,
      estimatedDuration: steps.length * 30,
    };
  }

  /**
   * Compilar VLAN segmentation
   */
  private compileVlanSegmentation(intent: OperationIntent): DeferredJobPlan {
    const devices = intent.devices;
    const device = devices[0] ?? 'Switch1';
    const vlans = (intent.parameters['vlans'] as number[]) || [];
    const names = (intent.parameters['names'] as string[]) || [];

    const planId = `plan-${Date.now()}-vlan-segmentation`;

    const prechecks: Precheck[] = [
      { type: 'capability', device, check: 'VLAN support', required: true },
    ];

    const steps: DeferredStep[] = [];
    
    for (let i = 0; i < vlans.length; i++) {
      const vlan = vlans[i];
      const name = names[i] || `VLAN${vlan}`;
      
      steps.push({
        order: i + 1,
        surface: 'ios',
        device,
        commands: [`vlan ${vlan}`, `name ${name}`],
        verification: {
          command: `show vlan ${vlan}`,
          expectedPattern: name,
        },
        timeout: 20000,
      });
    }

    const checkpoints: Checkpoint[] = [
      { step: steps.length, verify: 'All VLANs created', onFail: 'abort' },
    ];

    return {
      id: planId,
      intent,
      prechecks,
      steps,
      checkpoints,
      estimatedDuration: steps.length * 20,
    };
  }
  /**
   * Compilar DHCP service
   */
  private compileDhcpService(intent: OperationIntent): DeferredJobPlan {
    const devices = intent.devices;
    const device = devices[0] ?? 'Router1';
    const network = (intent.parameters['network'] as string) || '192.168.1.0';
    const pool = (intent.parameters['pool'] as string) || 'DHCP-POOL';
    const gateway = (intent.parameters['gateway'] as string) || '';

    const planId = `plan-${Date.now()}-dhcp-service`;
    const isServer = intent.parameters['useServer'] === true;

    const prechecks: Precheck[] = [
      isServer 
        ? { type: 'capability', device, check: 'DHCP appliance', required: true }
        : { type: 'capability', device, check: 'DHCP pool support', required: true },
    ];

    const steps: DeferredStep[] = [];

    if (isServer) {
      // Server-PT DHCP appliance
      steps.push({
        order: 1,
        surface: 'dhcp-appliance',
        device,
        commands: [`create-pool ${pool} ${network}`],
        verification: {
          command: `show dhcp pool ${pool}`,
          expectedPattern: pool,
        },
        timeout: 15000,
      });
    } else {
      // IOS DHCP pool
      steps.push({
        order: 1,
        surface: 'ios',
        device,
        commands: [
          `ip dhcp pool ${pool}`,
          `network ${network} 255.255.255.0`,
          gateway ? `default-router ${gateway}` : '',
        ].filter(Boolean),
        verification: {
          command: 'show ip dhcp pool',
          expectedPattern: pool,
        },
        timeout: 20000,
      });
    }

    const checkpoints: Checkpoint[] = [
      { step: 1, verify: 'DHCP pool created', onFail: 'abort' },
    ];

    return {
      id: planId,
      intent,
      prechecks,
      steps,
      checkpoints,
      estimatedDuration: 30000,
    };
  }

  /**
   * Compilar routing protocol
   */
  private compileRoutingProtocol(intent: OperationIntent): DeferredJobPlan {
    const devices = intent.devices;
    const device = devices[0] ?? 'Router1';
    const protocol = (intent.parameters['protocol'] as string) || 'ospf';
    const processId = (intent.parameters['processId'] as number) || 1;
    const networks = (intent.parameters['networks'] as string[]) || [];

    const planId = `plan-${Date.now()}-${protocol}`;

    const prechecks: Precheck[] = devices.map(d => ({
      type: 'capability',
      device: d,
      check: `${protocol} support`,
      required: true,
    }));

    const steps: DeferredStep[] = [];

    // Enable routing
    steps.push({
      order: 1,
      surface: 'ios',
      device,
      commands: [`router ${protocol} ${processId}`],
      verification: {
        command: `show ip ${protocol}`,
        expectedPattern: `Process ${processId}`,
      },
      timeout: 15000,
    });
    // Add networks
    for (let i = 0; i < networks.length; i++) {
      const network = networks[i] ?? '0.0.0.0';
      steps.push({
        order: i + 2,
        surface: 'ios',
        device,
        commands: [`network ${network} 0.0.0.255 area 0`],
        timeout: 10000,
      });
    }

    const checkpoints: Checkpoint[] = [
      { step: 1, verify: 'Routing protocol enabled', onFail: 'abort' },
      { step: steps.length, verify: 'Networks advertised', onFail: 'warn' },
    ];

    return {
      id: planId,
      intent,
      prechecks,
      steps,
      checkpoints,
      estimatedDuration: steps.length * 15,
    };
  }

  /**
   * Compilar ACL security
   */
  private compileAclSecurity(intent: OperationIntent): DeferredJobPlan {
    const device = intent.devices[0] ?? 'Router1';
    const name = (intent.parameters['name'] as string) || 'ACL-SECURITY';
    const type = (intent.parameters['type'] as string) || 'extended';
    const rules = (intent.parameters['rules'] as string[]) || [];

    const planId = `plan-${Date.now()}-acl-security`;

    const prechecks: Precheck[] = [
      { type: 'capability', device, check: 'ACL support', required: true },
    ];

    const steps: DeferredStep[] = [];

    // Create ACL
    steps.push({
      order: 1,
      surface: 'ios',
      device,
      commands: [`ip access-list ${type} ${name}`],
      verification: {
        command: `show ip access-lists ${name}`,
        expectedPattern: name,
      },
      timeout: 15000,
    });

    // Add rules
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (!rule) continue;
      steps.push({
        order: i + 2,
        surface: 'ios',
        device,
        commands: [rule],
        timeout: 10000,
      });
    }

    const checkpoints: Checkpoint[] = [
      { step: steps.length, verify: 'ACL configured', onFail: 'abort' },
    ];

    return {
      id: planId,
      intent,
      prechecks,
      steps,
      checkpoints,
      estimatedDuration: steps.length * 15,
    };
  }

  /**
   * Compilar trunk connection
   */
  private compileTrunkConnection(intent: OperationIntent): DeferredJobPlan {
    const switchA = intent.devices[0] ?? 'SwitchA';
    const switchB = intent.devices[1] ?? 'SwitchB';
    const vlans = (intent.parameters['vlans'] as number[]) || [];
    const portA = (intent.parameters['portA'] as string) || 'GigabitEthernet0/1';
    const portB = (intent.parameters['portB'] as string) || 'GigabitEthernet0/1';

    const planId = `plan-${Date.now()}-trunk-connection`;

    const prechecks: Precheck[] = [
      { type: 'capability', device: switchA, check: 'trunk support', required: true },
      { type: 'capability', device: switchB, check: 'trunk support', required: true },
    ];

    const steps: DeferredStep[] = [
      {
        order: 1,
        surface: 'ios',
        device: switchA,
        commands: [
          `interface ${portA}`,
          'switchport mode trunk',
          vlans.length > 0 ? `switchport trunk allowed vlan ${vlans.join(',')}` : '',
        ].filter(Boolean),
        verification: { command: `show interface ${portA} switchport`, expectedPattern: 'Mode: trunk' },
        timeout: 20000,
      },
      {
        order: 2,
        surface: 'ios',
        device: switchB,
        commands: [
          `interface ${portB}`,
          'switchport mode trunk',
          vlans.length > 0 ? `switchport trunk allowed vlan ${vlans.join(',')}` : '',
        ].filter(Boolean),
        verification: { command: `show interface ${portB} switchport`, expectedPattern: 'Mode: trunk' },
        timeout: 20000,
      },
    ];

    const checkpoints: Checkpoint[] = [
      { step: 1, verify: 'Trunk on switchA', onFail: 'rollback' },
      { step: 2, verify: 'Trunk on switchB', onFail: 'rollback' },
    ];

    const rollback: RollbackConfig = {
      onStepFail: 2,
      actions: [`no interface ${portA}`, `no interface ${portB}`],
    };

    return {
      id: planId,
      intent,
      prechecks,
      steps,
      checkpoints,
      rollback,
      estimatedDuration: 45000,
    };
  }

  /**
   * Compilar access layer
   */
  private compileAccessLayer(intent: OperationIntent): DeferredJobPlan {
    const switch_ = intent.devices[0] ?? 'Switch1';
    const ports = (intent.parameters['ports'] as string[]) || [];
    const vlan = (intent.parameters['vlan'] as number) || 1;

    const planId = `plan-${Date.now()}-access-layer`;

    const prechecks: Precheck[] = [
      { type: 'topology', check: `VLAN ${vlan} exists`, required: true },
    ];

    const steps: DeferredStep[] = ports.map((port, i) => ({
      order: i + 1,
      surface: 'ios',
      device: switch_,
      commands: [
        `interface ${port}`,
        'switchport mode access',
        `switchport access vlan ${vlan}`,
      ],
      verification: {
        command: `show interface ${port} switchport`,
        expectedPattern: `Access Mode: Access.*VLAN ${vlan}`,
      },
      timeout: 15000,
    }));

    const checkpoints: Checkpoint[] = [
      { step: steps.length, verify: 'All ports configured', onFail: 'warn' },
    ];

    return {
      id: planId,
      intent,
      prechecks,
      steps,
      checkpoints,
      estimatedDuration: steps.length * 20,
    };
  }

  /**
   * Compilar genérico
   */
  private compileGeneric(intent: OperationIntent): DeferredJobPlan {
    return {
      id: `plan-${Date.now()}-generic`,
      intent,
      prechecks: [],
      steps: [],
      checkpoints: [],
    };
  }
  /**
   * Extraer gateway de subred
   */
  private getGatewayFromSubnet(subnet: string): string {
    const [network = '0.0.0.0'] = subnet.split('/');
    const parts = network.split('.');
    parts[3] = '1';
    return parts.join('.');
  }
}

/**
 * Factory
 */
export function createOperationCompiler(): OperationCompiler {
  return new OperationCompiler();
}