import { expect, test, describe } from "bun:test";
import { collectPorts } from "../../utils/helpers.js";

class MinimalPort {
  getName() {
    return "FastEthernet0";
  }
  getIpAddress() {
    return "10.0.0.2";
  }
  getSubnetMask() {
    return "255.255.255.0";
  }
  getMacAddress() {
    return "aa:bb:cc:dd:ee:ff";
  }
  isPortUp() {
    return true;
  }
  isProtocolUp() {
    return true;
  }
}

class MinimalDevice {
  getPortCount() {
    return 1;
  }
  getPortAt() {
    return new MinimalPort();
  }
}

describe("collectPorts", () => {
  test("ignora fallos de campos opcionales del puerto", () => {
    const ports = collectPorts(new MinimalDevice() as any);

    expect(ports).toHaveLength(1);
    expect(ports[0].name).toBe("FastEthernet0");
    expect(ports[0].macAddress).toBe("aa:bb:cc:dd:ee:ff");
    expect(ports[0].status).toBe("up");
    expect(ports[0].protocol).toBe("up");
  });
});
