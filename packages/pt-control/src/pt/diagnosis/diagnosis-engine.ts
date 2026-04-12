// ============================================================================
// DiagnosisEngine - Motor de diagnóstico causal
// ============================================================================

import type {
  IDiagnosisEngine,
  Symptom,
  DiagnosisOptions,
  DiagnosisResult,
  DeviceDiagnosis,
  DeviceIssue,
  DiagnosticCheck,
  RootCause,
  Recommendation,
  DiagnosisCategory,
  Severity,
} from './diagnosis-types.js';

/**
 * DiagnosisEngine - causal lab diagnosis engine
 */
export class DiagnosisEngine implements IDiagnosisEngine {
  private commandExecutor?: (device: string, command: string) => Promise<string>;

  /**
   * Set command executor
   */
  setCommandExecutor(executor: (device: string, command: string) => Promise<string>): void {
    this.commandExecutor = executor;
  }

  /**
   * Diagnóstico principal
   */
  async diagnose(symptoms: Symptom[], options: DiagnosisOptions = {}): Promise<DiagnosisResult> {
    const startTime = Date.now();
    const id = `diag-${Date.now()}`;

    // Get affected devices
    const affectedDevices = this.extractAffectedDevices(symptoms);
    
    // Run diagnosis on each device
    const deviceDiagnoses: DeviceDiagnosis[] = [];
    for (const device of affectedDevices.slice(0, options.maxDevices || 10)) {
      const diagnosis = await this.checkDevice(device, symptoms);
      deviceDiagnoses.push(diagnosis);
    }

    // Analyze root causes
    const rootCauses = this.analyzeRootCauses(symptoms, deviceDiagnoses);

    // Generate recommendations
    const recommendations = this.generateRecommendations(rootCauses);

    // Calculate resolution probability
    const resolutionProbability = this.calculateProbability(rootCauses, recommendations);

    const executionTimeMs = Date.now() - startTime;

    return {
      id,
      timestamp: new Date(),
      symptoms,
      deviceDiagnoses,
      rootCauses,
      recommendations,
      resolutionProbability,
      executionTimeMs,
    };
  }

  /**
   * Diagnóstico de dispositivo específico
   */
  async checkDevice(device: string, symptoms: Symptom[]): Promise<DeviceDiagnosis> {
    const issues: DeviceIssue[] = [];
    const checks: DiagnosticCheck[] = [];

    // Run basic checks based on symptoms
    for (const symptom of symptoms) {
      switch (symptom.type) {
        case 'ping-fails':
          checks.push(await this.runCheck(device, 'show ip interface brief', 'Interfaces up?'));
          checks.push(await this.runCheck(device, 'show ip route', 'Routing configured?'));
          issues.push(...this.diagnosePingFailure(device, symptoms));
          break;

        case 'no-dhcp':
          checks.push(await this.runCheck(device, 'show ip dhcp pool', 'DHCP pools?'));
          checks.push(await this.runCheck(device, 'show ip dhcp binding', 'DHCP bindings?'));
          issues.push(...this.diagnoseDhcpIssue(device, symptoms));
          break;

        case 'no-access':
          checks.push(await this.runCheck(device, 'show spanning-tree', 'Spanning Tree?'));
          checks.push(await this.runCheck(device, 'show interface status', 'Port status?'));
          issues.push(...this.diagnoseAccessIssue(device, symptoms));
          break;

        case 'packet-loss':
          checks.push(await this.runCheck(device, 'show interface counters', 'Interface errors?'));
          checks.push(await this.runCheck(device, 'show spanning-tree', 'BPDU?'));
          issues.push(...this.diagnosePacketLoss(device, symptoms));
          break;

        case 'acl-block':
          checks.push(await this.runCheck(device, 'show ip access-lists', 'ACLs?'));
          issues.push(...this.diagnoseAclIssue(device, symptoms));
          break;
      }
    }

    // Add general configuration checks
    checks.push(await this.runCheck(device, 'show running-config | include', 'Config healthy?'));

    return { device, issues, checks };
  }

  /**
   * Ejecutar verificación de diagnóstico
   */
  async runDiagnosticChecks(device: string, checkNames: string[]): Promise<DiagnosticCheck[]> {
    const checks: DiagnosticCheck[] = [];

    for (const checkName of checkNames) {
      const check = await this.runCheck(device, checkName, checkName);
      checks.push(check);
    }

    return checks;
  }

  /**
   * Ejecutar verificación individual
   */
  private async runCheck(device: string, command: string, name: string): Promise<DiagnosticCheck> {
    try {
      if (this.commandExecutor) {
        const output = await this.commandExecutor(device, command);
        return {
          name,
          passed: output.length > 0 && !output.includes('error'),
          output: output.substring(0, 500),
        };
      }
      return { name, passed: false, output: 'No executor configured' };
    } catch (error) {
      return {
        name,
        passed: false,
        output: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extraer dispositivos afectados
   */
  private extractAffectedDevices(symptoms: Symptom[]): string[] {
    const deviceSet = new Set<string>();
    for (const symptom of symptoms) {
      if (symptom.devices) {
        for (const d of symptom.devices) {
          deviceSet.add(d);
        }
      }
    }
    return Array.from(deviceSet);
  }

  /**
   * Diagnosticar falla de ping
   */
  private diagnosePingFailure(device: string, symptoms: Symptom[]): DeviceIssue[] {
    const issues: DeviceIssue[] = [];

    issues.push({
      category: 'connectivity',
      severity: 'high',
      description: 'Connectivity issue detected',
      likelyCause: 'Interface down, no route, or firewall blocking',
      evidence: symptoms.map(s => s.details || '').filter(Boolean),
      recommendedAction: 'Check interface status and routing table',
    });

    return issues;
  }

  /**
   * Diagnosticar problema DHCP
   */
  private diagnoseDhcpIssue(device: string, symptoms: Symptom[]): DeviceIssue[] {
    const issues: DeviceIssue[] = [];

    issues.push({
      category: 'dhcp',
      severity: 'high',
      description: 'DHCP service not working',
      likelyCause: 'DHCP pool not configured or exhausted',
      evidence: symptoms.map(s => s.details || '').filter(Boolean),
      recommendedAction: 'Verify DHCP pool configuration and available addresses',
    });

    return issues;
  }

  /**
   * Diagnosticar problema de acceso
   */
  private diagnoseAccessIssue(device: string, symptoms: Symptom[]): DeviceIssue[] {
    const issues: DeviceIssue[] = [];

    issues.push({
      category: 'switching',
      severity: 'medium',
      description: 'Access layer issue detected',
      likelyCause: 'Port not in correct VLAN, STP blocking, or port disabled',
      evidence: symptoms.map(s => s.details || '').filter(Boolean),
      recommendedAction: 'Check port VLAN assignment and STP status',
    });

    return issues;
  }

  /**
   * Diagnosticar pérdida de paquetes
   */
  private diagnosePacketLoss(device: string, symptoms: Symptom[]): DeviceIssue[] {
    const issues: DeviceIssue[] = [];

    issues.push({
      category: 'interface',
      severity: 'medium',
      description: 'Packet loss detected',
      likelyCause: 'Interface errors, congestion, or duplex mismatch',
      evidence: symptoms.map(s => s.details || '').filter(Boolean),
      recommendedAction: 'Check interface statistics and settings',
    });

    return issues;
  }

  /**
   * Diagnosticar problema de ACL
   */
  private diagnoseAclIssue(device: string, symptoms: Symptom[]): DeviceIssue[] {
    const issues: DeviceIssue[] = [];

    issues.push({
      category: 'acl',
      severity: 'high',
      description: 'ACL blocking traffic',
      likelyCause: 'ACL rule denying required traffic',
      evidence: symptoms.map(s => s.details || '').filter(Boolean),
      recommendedAction: 'Review ACL rules and apply correct permit statements',
    });

    return issues;
  }

  /**
   * Analizar causas raíz
   */
  private analyzeRootCauses(symptoms: Symptom[], diagnoses: DeviceDiagnosis[]): RootCause[] {
    const rootCauses: RootCause[] = [];

    for (const diagnosis of diagnoses) {
      for (const issue of diagnosis.issues) {
        const confidence = this.calculateConfidence(issue.severity, diagnosis.checks);
        
        rootCauses.push({
          device: diagnosis.device,
          category: issue.category,
          description: issue.likelyCause,
          confidence,
          relatedSymptoms: symptoms.map(s => s.type),
        });
      }
    }

    return rootCauses;
  }

  /**
   * Calcular confianza de diagnóstico
   */
  private calculateConfidence(severity: Severity, checks: DiagnosticCheck[]): number {
    let base = 0.5;
    
    switch (severity) {
      case 'critical': base = 0.9; break;
      case 'high': base = 0.7; break;
      case 'medium': base = 0.5; break;
      case 'low': base = 0.3; break;
    }

    const passedChecks = checks.filter(c => c.passed).length;
    const checkBonus = passedChecks > 0 ? passedChecks / checks.length * 0.2 : 0;

    return Math.min(1, base + checkBonus);
  }

  /**
   * Generar recomendaciones
   */
  private generateRecommendations(rootCauses: RootCause[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    let priority = 1;

    // Group by category
    const byCategory = new Map<DiagnosisCategory, RootCause[]>();
    for (const cause of rootCauses) {
      if (!byCategory.has(cause.category)) {
        byCategory.set(cause.category, []);
      }
      byCategory.get(cause.category)!.push(cause);
    }

    // Generate recommendations based on root causes
    for (const [category, causes] of Array.from(byCategory.entries())) {
      const topCause = causes.reduce((a, b) => a.confidence > b.confidence ? a : b);
      
      recommendations.push({
        priority: priority++,
        description: `Fix ${category} issue on ${topCause.device}`,
        action: this.getActionForCategory(category),
        expectedOutcome: `Resolve ${category} problem`,
        risk: this.getRiskForCategory(category),
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Obtener acción para categoría
   */
  private getActionForCategory(category: DiagnosisCategory): string {
    const actions: Record<DiagnosisCategory, string> = {
      connectivity: 'Check interface status and IP routing',
      routing: 'Verify routing protocol and routes',
      switching: 'Check VLAN and spanning-tree status',
      dhcp: 'Review DHCP pool configuration',
      acl: 'Audit and adjust ACL rules',
      interface: 'Check interface errors and configuration',
      configuration: 'Review device configuration',
    };
    return actions[category];
  }

  /**
   * Obtener riesgo para categoría
   */
  private getRiskForCategory(category: DiagnosisCategory): 'low' | 'medium' | 'high' {
    const risks: Record<DiagnosisCategory, 'low' | 'medium' | 'high'> = {
      connectivity: 'medium',
      routing: 'high',
      switching: 'medium',
      dhcp: 'low',
      acl: 'high',
      interface: 'medium',
      configuration: 'medium',
    };
    return risks[category];
  }

  /**
   * Calcular probabilidad de resolución
   */
  private calculateProbability(rootCauses: RootCause[], recommendations: Recommendation[]): number {
    if (rootCauses.length === 0) return 0;
    
    const avgConfidence = rootCauses.reduce((a, b) => a + b.confidence, 0) / rootCauses.length;
    const recommendationBonus = recommendations.length > 0 ? 0.1 : 0;
    
    return Math.min(0.95, avgConfidence + recommendationBonus);
  }
}

/**
 * Factory
 */
export function createDiagnosisEngine(): DiagnosisEngine {
  return new DiagnosisEngine();
}