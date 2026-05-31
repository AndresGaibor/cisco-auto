import type { HostProcessPort } from "../ports/host-process.port.js";

export class PacketTracerProcessService {
  constructor(private readonly port: HostProcessPort) {}

  async launch(appPath: string, pktPath?: string): Promise<{ ok: boolean }> {
    const platform = this.port.platform();
    if (platform === "darwin") {
      const argv = ["-a", appPath];
      if (pktPath) argv.push(pktPath);
      await this.port.spawn("open", argv);
      return { ok: true };
    }
    if (platform === "win32") {
      function psQuote(value: string): string {
        return `'${value.replace(/'/g, "''")}'`;
      }
      const script = pktPath
        ? `Start-Process -FilePath ${psQuote(appPath)} -ArgumentList ${psQuote(pktPath)}`
        : `Start-Process -FilePath ${psQuote(appPath)}`;
      await this.port.spawn("powershell", ["-NoProfile", "-Command", script]);
      return { ok: true };
    }
    return { ok: false };
  }

  async closeGraceful(appName: string, timeoutMs?: number): Promise<{ ok: boolean }> {
    const platform = this.port.platform();
    if (platform === "darwin") {
      const script = `tell application "${appName}" to close`;
      await this.port.spawn("osascript", ["-e", script], { timeoutMs });
      return { ok: true };
    }
    if (platform === "win32") {
      await this.port.spawn("powershell", [
        "-Command",
        `$p = Get-Process -Name "${appName}" -ErrorAction SilentlyContinue; if ($p) { $p.CloseMainWindow() }`,
      ], { timeoutMs });
      return { ok: true };
    }
    return { ok: false };
  }

  async closeForce(appName: string, timeoutMs?: number): Promise<{ ok: boolean }> {
    const platform = this.port.platform();
    if (platform === "darwin") {
      await this.port.spawn("pkill", ["-9", "-f", appName], { timeoutMs });
      return { ok: true };
    }
    if (platform === "win32") {
      await this.port.spawn("powershell", [
        "-Command",
        `Stop-Process -Name "${appName}" -Force -ErrorAction SilentlyContinue`,
      ], { timeoutMs });
      return { ok: true };
    }
    return { ok: false };
  }

  async isRunning(appName: string): Promise<boolean> {
    const platform = this.port.platform();
    if (platform === "darwin") {
      const result = await this.port.spawn("pgrep", ["-f", appName]);
      return result.exitCode === 0;
    }
    if (platform === "win32") {
      const names = [
        appName,
        "PacketTracer",
        "Cisco Packet Tracer",
        "CiscoPacketTracer",
      ];
      const psNames = names.map((n) => `'${n}'`).join(",");
      const script =
        `$names=@(${psNames}); ` +
        `$count=0; foreach($n in $names){ ` +
        `$count += (Get-Process -Name $n -ErrorAction SilentlyContinue | Measure-Object).Count ` +
        `}; $count`;
      const result = await this.port.spawn("powershell", ["-NoProfile", "-Command", script]);
      return result.stdout.trim() !== "0";
    }
    return false;
  }
}