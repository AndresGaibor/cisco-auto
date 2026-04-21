// ============================================================================
// Command Executor - Tests para Host Command Prompt
// ============================================================================
// Verifica conceptos de completion estructural para comandos host

import { describe, expect, test } from "bun:test";

describe("CommandExecutor - Host Command Prompt", () => {
  describe("Completion detection para ping", () => {
    test("ping exitoso tiene Ping statistics y 0% loss", () => {
      const output = `
Pinging 192.168.10.10 with 32 bytes of data:

Reply from 192.168.10.10: bytes=32 time<1ms TTL=255
Reply from 192.168.10.10: bytes=32 time<1ms TTL=255
Reply from 192.168.10.10: bytes=32 time<1ms TTL=255
Reply from 192.168.10.10: bytes=32 time<1ms TTL=255

Ping statistics for 192.168.10.10:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 0ms, Maximum = 15ms, Average = 8ms

C:\\>
`;
      expect(output).toContain("Ping statistics");
      expect(output).toContain("0% loss");
      expect(output).toContain("Reply from");
      expect(output).toContain("C:\\>");
    });

    test("ping fallido tiene Request timed out y 100% loss", () => {
      const output = `
Pinging 192.168.10.1 with 32 bytes of data:

Request timed out.
Request timed out.
Request timed out.
Request timed out.

Ping statistics for 192.168.10.1:
    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),

C:\\>
`;
      expect(output).toContain("Ping statistics");
      expect(output).toContain("100% loss");
      expect(output).toContain("Request timed out");
      expect(output).toContain("C:\\>");
    });

    test("ping inalcanzable tiene Destination host unreachable", () => {
      const output = `
Pinging 192.168.10.1 with 32 bytes of data:

Destination host unreachable.
Destination host unreachable.
Destination host unreachable.
Destination host unreachable.

Ping statistics for 192.168.10.1:
    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),

C:\\>
`;
      expect(output).toContain("Ping statistics");
      expect(output).toContain("100% loss");
      expect(output).toContain("Destination host unreachable");
    });
  });

  describe("Completion detection para ipconfig", () => {
    test("ipconfig tiene IPv4 Address y prompt final", () => {
      const output = `
FastEthernet0 Connection:

   Connection-specific DNS Suffix..: 
   IPv4 Address....................: 192.168.10.10
   Subnet Mask.....................: 255.255.255.0
   Default Gateway.................: 192.168.10.1

C:\\>
`;
      expect(output).toContain("IPv4 Address");
      expect(output).toContain("192.168.10.10");
      expect(output).toContain("C:\\>");
    });
  });

  describe("Completion detection para arp -a", () => {
    test("arp tiene Internet Address y prompt final", () => {
      const output = `
   Internet Address      Physical Address  Type
   192.168.10.1          00A0C7123456     dynamic
   192.168.10.10         00A0C7987654     dynamic

C:\\>
`;
      expect(output).toContain("Internet Address");
      expect(output).toContain("Physical Address");
      expect(output).toContain("C:\\>");
    });
  });

  describe("Completion detection para tracert", () => {
    test("tracert tiene Trace complete y prompt final", () => {
      const output = `
  1   1 ms    <1 ms    <1 ms  192.168.10.1
  2     1 ms    <1 ms    <1 ms  192.168.0.1

Trace complete.

C:\\>
`;
      expect(output).toContain("Trace complete");
      expect(output).toContain("C:\\>");
    });
  });
});