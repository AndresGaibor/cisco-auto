// ============================================================================
// WirelessService - Gestiona WLAN y APs en Wireless LAN Controller (WLC)
// ============================================================================

/**
 * Interfaz de configuración SSID
 */
export interface WirelessSsidConfig {
  wlc: string;
  ssid: string;
  vlan: number;
  security: {
    type: "none" | "wpa" | "wpa2" | "wpa2-enterprise";
    password?: string;
  };
  enabled?: boolean;
}

/**
 * Interfaz de configuración AP
 */
export interface WirelessApConfig {
  apName: string;
  wlc: string;
  mode: "local" | "flexconnect" | "bridge";
  radio?: "80211a" | "80211b" | "both";
}

/**
 * Interfaz de estado de cliente wireless
 */
export interface WirelessClientStatus {
  clientMac: string;
  ssid: string;
  ap: string;
  vlan: number;
  ipAddress?: string;
}

/**
 * Causa de fallo de join AP
 */
export type ApJoinFailureCause =
  | "auth-failed"
  | "controller-unreachable"
  | "not-licensed"
  | "image-mismatch"
  | "unknown";

/**
 * Resultado de diagnóstico de join AP
 */
export interface ApJoinFailureDiagnosis {
  cause: ApJoinFailureCause;
  suggestions: string[];
}

/**
 * WirelessService - gestión de red wireless en WLC
 *
 * Maneja WLAN/SSID, asociación de APs, y diagnóstico de clientes.
 */
export class WirelessService {
  private commandExecutor: ((device: string, command: string) => Promise<string>) | null = null;

  /**
   * Crear WLAN/SSID en WLC
   */
  async createSsid(config: WirelessSsidConfig): Promise<void> {
    this.ensureExecutor();

    const wlanId = this.generateWlanId(config.ssid);
    const commands: string[] = [
      `conf t`,
      `wlan ${wlanId}`,
      `ssid ${config.ssid}`,
    ];

    if (config.security.type === "none") {
      commands.push(`security open`);
    } else if (config.security.type === "wpa") {
      const password = config.security.password ?? "";
      commands.push(`security wpa`);
      commands.push(`wpa akm psk set-key ${password}`);
    } else if (config.security.type === "wpa2") {
      const password = config.security.password ?? "";
      commands.push(`security wpa wpa2`);
      commands.push(`wpa akm psk set-key ${password}`);
    } else if (config.security.type === "wpa2-enterprise") {
      commands.push(`security wpa wpa2 eap`);
    }

    commands.push(`interface group vlan ${config.vlan}`);

    if (config.enabled === false) {
      commands.push(`shutdown`);
    }

    await this.executeCommands(config.wlc, commands);
  }

  /**
   * Unir AP al WLC via CAPWAP
   */
  async joinAp(apName: string, wlc: string): Promise<void> {
    this.ensureExecutor();

    const commands: string[] = [
      `conf t`,
      `ap name ${apName}`,
      `join manager ${wlc}`,
    ];

    await this.executeCommands(wlc, commands);
  }

  /**
   * Verificar conexión de cliente wireless
   */
  async verifyClientConnection(clientMac: string): Promise<WirelessClientStatus | null> {
    this.ensureExecutor();

    const output = await this.commandExecutor!(
      "WLC",
      `show wireless client mac-address ${clientMac}`
    );

    return this.parseClientStatus(clientMac, output);
  }

  /**
   * Diagnosticar fallo de join de AP
   */
  async diagnoseApJoinFailure(apName: string): Promise<ApJoinFailureDiagnosis> {
    this.ensureExecutor();

    const output = await this.commandExecutor!(
      "WLC",
      `show ap join info summary`
    );

    return this.parseApJoinFailure(apName, output);
  }

  /**
   * Establecer executor de comandos (inyectado desde outside)
   */
  setCommandExecutor(executor: (device: string, command: string) => Promise<string>): void {
    this.commandExecutor = executor;
  }

  /**
   * Generar ID de WLAN basado en SSID
   */
  private generateWlanId(ssid: string): string {
    let hash = 0;
    for (let i = 0; i < ssid.length; i++) {
      const char = ssid.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return String(Math.abs(hash % 100) + 1);
  }

  /**
   * Parsear estado de cliente wireless
   */
  private parseClientStatus(
    clientMac: string,
    output: string
  ): WirelessClientStatus | null {
    const lines = output.split('\n');
    let ssid = "";
    let ap = "";
    let vlan = 0;
    let ipAddress: string | undefined;

    for (const line of lines) {
      if (line.includes('SSID')) {
        const match = line.match(/SSID\s+(\S+)/);
        if (match && match[1]) ssid = match[1];
      }
      if (line.includes('AP')) {
        const match = line.match(/AP\s+(\S+)/);
        if (match && match[1]) ap = match[1];
      }
      if (line.includes('VLAN')) {
        const match = line.match(/VLAN\s+(\d+)/);
        if (match && match[1]) vlan = parseInt(match[1], 10);
      }
      if (line.includes('IP Address')) {
        const match = line.match(/IP Address\s+(\d+\.\d+\.\d+\.\d+)/);
        if (match && match[1]) ipAddress = match[1];
      }
    }

    if (!ssid && !ap) {
      return null;
    }

    return { clientMac, ssid, ap, vlan, ipAddress };
  }

  /**
   * Parsear diagnóstico de join AP
   */
  private parseApJoinFailure(
    apName: string,
    output: string
  ): ApJoinFailureDiagnosis {
    const lines = output.split('\n');
    let cause: ApJoinFailureCause = "unknown";
    const suggestions: string[] = [];

    for (const line of lines) {
      if (line.includes(apName) || line.includes('AP Name')) {
        if (line.includes('Auth Failed') || line.includes('Authentication')) {
          cause = "auth-failed";
          suggestions.push("Verificar credentials de AP en WLC");
          suggestions.push("Verificar fecha/hora del sistema");
        } else if (line.includes('Unreachable') || line.includes('timeout')) {
          cause = "controller-unreachable";
          suggestions.push("Verificar conectividad de red entre AP y WLC");
          suggestions.push("Verificar que el WLC esté activo");
        } else if (line.includes('License') || line.includes('licensed')) {
          cause = "not-licensed";
          suggestions.push("Verificar licencia de AP en WLC");
          suggestions.push("Activar licencia de AP");
        } else if (line.includes('Image') || line.includes('mismatch')) {
          cause = "image-mismatch";
          suggestions.push("Actualizar firmware del AP");
          suggestions.push("Verificar compatibilidad de versiones");
        }
      }
    }

    if (cause === "unknown") {
      suggestions.push("Verificar logs del WLC para más detalles");
      suggestions.push("Revisar configuración de red del AP");
    }

    return { cause, suggestions };
  }

  /**
   * Asegurar que existe executor de comandos
   */
  private ensureExecutor(): void {
    if (!this.commandExecutor) {
      throw new Error(
        "WirelessService: commandExecutor no está configurado. Use setCommandExecutor()."
      );
    }
  }

  /**
   * Ejecutar secuencia de comandos
   */
  private async executeCommands(device: string, commands: string[]): Promise<void> {
    for (const cmd of commands) {
      await this.commandExecutor!(device, cmd);
    }
  }
}

/**
 * Factory
 */
export function createWirelessService(): WirelessService {
  return new WirelessService();
}
