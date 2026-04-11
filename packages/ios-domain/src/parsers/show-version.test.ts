import { describe, test, expect } from "bun:test";
import { parseShowVersion } from "./show-version";

describe("parseShowVersion", () => {
  test("parses basic version output", () => {
    const output = `
      Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.2(4)M5, RELEASE SOFTWARE (fc2)
      Technical Support: http://www.cisco.com/techsupport
      Copyright (c) 1986-2015 by Cisco Systems, Inc.
      Compiled Thu 22-Oct-15 17:00 by prod_rel_team

      ROM: Bootstrap program is C2900 boot loader
      BOOTLDR: C2900 Boot Loader (C2900-HBOOT-M) Version 15.0(1r)M12, RELEASE SOFTWARE (fc1)

      Router uptime is 3 weeks, 2 days, 3 hours, 45 minutes
      System returned to ROM by power-on
      System image file is "flash0:c2900-universalk9-mz.SPA.152-4.M5.bin"
      Last reload type: Normal Reload
      Last reload reason: Reload Command

      This product contains cryptographic features and is subject to United States and local country laws governing import, export, transfer and use. Delivery of Cisco cryptographic products does not imply third-party authority to import, export, distribute and use encryption.
      Importer Exporter Code: N/A

      License Level: ipbase
      License Type: Permanent
      Next reload license Level: ipbase

      cisco C2901 (2RU) processor with 491520K/61440K bytes of memory.
      Processor board ID FTX1524A0JK
      2 Gigabit Ethernet interfaces
      2 Serial (sync/async) interfaces
      1 Virtual Private Network (VPN) Module
      DRAM configuration is 64 bits wide with parity disabled.
      125K bytes of NVRAM.
      250880K bytes of ATA System CompactFlash 0.
      Configuration register is 0x2102
    `;

    const result = parseShowVersion(output);

    expect(result.version).toBe("15.2(4)M5");
    expect(result.hostname).toBe("Router");
    expect(result.uptime).toBe("3 weeks, 2 days, 3 hours, 45 minutes");
    expect(result.image).toBe("flash0:c2900-universalk9-mz.SPA.152-4.M5.bin");
    expect(result.processor).toBe("cisco C2901 (2RU)");
    expect(result.configRegister).toBe("0x2102");
  });

  test("handles minimal version output", () => {
    const output = `
      Router>show version
      Cisco IOS Software, C880 Software (C880DATA-UNIVERSALK9-M), Version 15.0(1)M, RELEASE SOFTWARE (fc1)
      Technical Support: http://www.cisco.com/techsupport
      Copyright (c) 1986-2010 by Cisco Systems, Inc.
      Compiled Fri 29-Jan-10 16:08 by alandeva

      ROM: System Bootstrap, Version 12.4(13r)XN3, RELEASE SOFTWARE (fc1)
      Router uptime is 5 minutes
      System returned to ROM by power-on
      System image file is "flash:c880data-universalk9-mz.SPA.150-1.M.bin"
      Configuration register is 0x2102
    `;

    const result = parseShowVersion(output);

    expect(result.version).toBe("15.0(1)M");
    expect(result.hostname).toBe("Router");
    expect(result.uptime).toBe("5 minutes");
    expect(result.image).toBe("flash:c880data-universalk9-mz.SPA.150-1.M.bin");
    expect(result.configRegister).toBe("0x2102");
  });

  test("handles version output without uptime", () => {
    const output = `
      Switch>show version
      Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 12.2(55)SE9, RELEASE SOFTWARE (fc1)
      Technical Support: http://www.cisco.com/techsupport
      Copyright (c) 1986-2011 by Cisco Systems, Inc.
      Compiled Thu 21-Jul-11 20:46 by alandeva

      ROM: Bootstrap program is C2960 boot loader
      System returned to ROM by power-on
      System image file is "flash:c2960-lanbasek9-mz.122-55.SE9.bin"
      Configuration register is 0xF
    `;

    const result = parseShowVersion(output);

    expect(result.version).toBe("12.2(55)SE9");
    expect(result.hostname).toBe("Switch");
    expect(result.uptime).toBeUndefined();
    expect(result.image).toBe("flash:c2960-lanbasek9-mz.122-55.SE9.bin");
    expect(result.configRegister).toBe("0xF");
  });
});