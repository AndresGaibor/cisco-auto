import { describe, expect, it } from "bun:test";
import { IosVerificationService } from "../ios-verification-service.js";

function createExec(rawByCommand: Record<string, string>) {
  return async (device: string, command: string) => {
    void device;
    return { raw: rawByCommand[command] ?? "" };
  };
}

describe("IosVerificationService", () => {
  it("verifica interface ip", async () => {
    const svc = new IosVerificationService(
      createExec({
        "show ip interface brief": `
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     192.168.1.1     YES manual up                    up
`,
      }),
    );

    const result = await svc.verifyInterfaceIp("R1", "GigabitEthernet0/0", "192.168.1.1");
    expect(result.executed).toBe(true);
    expect(result.verified).toBe(true);
  });

  it("verifica vlan exists", async () => {
    const svc = new IosVerificationService(
      createExec({
        "show vlan brief": `
VLAN Name                             Status    Ports
1    default                          active    Fa0/1, Fa0/2
10   USERS                            active    Fa0/3
`,
      }),
    );

    const result = await svc.verifyVlanExists("SW1", 10);
    expect(result.executed).toBe(true);
    expect(result.verified).toBe(true);
  });

  it("verifica running-config contains", async () => {
    const svc = new IosVerificationService(
      createExec({
        "show running-config": `
hostname R1
ip route 10.0.0.0 255.255.255.0 192.168.1.254
`,
      }),
    );

    const result = await svc.verifyRunningConfigContains("R1", [
      "hostname R1",
      "ip route 10.0.0.0 255.255.255.0 192.168.1.254",
    ]);

    expect(result.executed).toBe(true);
    expect(result.verified).toBe(true);
  });
});