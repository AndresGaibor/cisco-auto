import { describe, it, expect } from "bun:test";
import { buildSshCommands } from "@cisco-auto/ios-domain";

describe("ssh utilities", () => {
  describe("buildSshCommands", () => {
    it("generates SSH commands with default values", () => {
      const commands = buildSshCommands("cisco-lab.local", "admin", "admin");
      expect(commands).toEqual([
        "ip domain-name cisco-lab.local",
        "crypto key generate rsa general-keys modulus 2048",
        "ip ssh version 2",
        "line vty 0 15",
        " transport input ssh",
        " login local",
        " exit",
        "username admin privilege 15 password admin",
      ]);
    });

    it("generates SSH commands with custom domain and credentials", () => {
      const commands = buildSshCommands("mi-red.local", "admin", "C1sco12345");
      expect(commands).toEqual([
        "ip domain-name mi-red.local",
        "crypto key generate rsa general-keys modulus 2048",
        "ip ssh version 2",
        "line vty 0 15",
        " transport input ssh",
        " login local",
        " exit",
        "username admin privilege 15 password C1sco12345",
      ]);
    });

    it("generates correct number of commands", () => {
      const commands = buildSshCommands("test.local", "user", "pass");
      expect(commands.length).toBe(8);
    });
  });
});
