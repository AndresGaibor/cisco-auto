import { describe, expect, test } from "bun:test";
import {
  InterfaceName,
  parseInterfaceName,
  parseOptionalInterfaceName,
  isValidInterfaceName,
} from "../domain/ios/value-objects/interface-name.vo.js";

describe("InterfaceName", () => {
  describe("construcción", () => {
    test("crea InterfaceName para GigabitEthernet0/0", () => {
      const iface = new InterfaceName("GigabitEthernet0/0");
      expect(iface.value).toBe("GigabitEthernet0/0");
    });

    test("crea InterfaceName para FastEthernet0/1", () => {
      const iface = new InterfaceName("FastEthernet0/1");
      expect(iface.value).toBe("FastEthernet0/1");
    });

    test("crea InterfaceName para Serial0/0/0", () => {
      const iface = new InterfaceName("Serial0/0/0");
      expect(iface.value).toBe("Serial0/0/0");
    });

    test("crea InterfaceName para VLAN100", () => {
      const iface = new InterfaceName("VLAN100");
      expect(iface.value).toBe("VLAN100");
    });

    test("crea InterfaceName para subinterfaz GigabitEthernet0/0.100", () => {
      const iface = new InterfaceName("GigabitEthernet0/0.100");
      expect(iface.value).toBe("GigabitEthernet0/0.100");
    });

    test("lanza DomainError para string vacío", () => {
      expect(() => new InterfaceName("")).toThrow("empty");
    });

    test("lanza DomainError para formato inválido", () => {
      expect(() => new InterfaceName("invalid_interface")).toThrow("expected format");
      expect(() => new InterfaceName("123iface")).toThrow("expected format");
    });
  });

  describe("factory methods", () => {
    test("fromJSON crea desde string", () => {
      const iface = InterfaceName.fromJSON("GigabitEthernet0/1");
      expect(iface.value).toBe("GigabitEthernet0/1");
    });
  });

  describe("shortForm", () => {
    test("GigabitEthernet0/0 -> Gi0/0", () => {
      expect(new InterfaceName("GigabitEthernet0/0").shortForm).toBe("Gi0/0");
    });

    test("FastEthernet0/1 -> Fa0/1", () => {
      expect(new InterfaceName("FastEthernet0/1").shortForm).toBe("Fa0/1");
    });

    test("Serial0/0/0 -> Se0/0/0", () => {
      expect(new InterfaceName("Serial0/0/0").shortForm).toBe("Se0/0/0");
    });

    test("Loopback0 -> Lo0", () => {
      expect(new InterfaceName("Loopback0").shortForm).toBe("Lo0");
    });

    test("VLAN100 -> Vl100", () => {
      expect(new InterfaceName("VLAN100").shortForm).toBe("Vl100");
    });

    test("PortChannel1 -> Po1", () => {
      expect(new InterfaceName("PortChannel1").shortForm).toBe("Po1");
    });

    test("Tunnel0 -> Tu0", () => {
      expect(new InterfaceName("Tunnel0").shortForm).toBe("Tu0");
    });

    test("término desconocido no se abrevia", () => {
      expect(new InterfaceName("VPC1").shortForm).toBe("VPC1");
    });
  });

  describe("subinterface", () => {
    test("isSubinterface true para GigabitEthernet0/0.100", () => {
      const iface = new InterfaceName("GigabitEthernet0/0.100");
      expect(iface.isSubinterface).toBe(true);
    });

    test("isSubinterface false para interfaz normal", () => {
      const iface = new InterfaceName("GigabitEthernet0/0");
      expect(iface.isSubinterface).toBe(false);
    });

    test("parentInterface retorna la interfaz padre", () => {
      const iface = new InterfaceName("GigabitEthernet0/0.100");
      expect(iface.parentInterface?.value).toBe("GigabitEthernet0/0");
    });

    test("parentInterface retorna null para interfaz normal", () => {
      const iface = new InterfaceName("GigabitEthernet0/0");
      expect(iface.parentInterface).toBeNull();
    });
  });

  describe("equals, toString, toJSON", () => {
    test("equals compara por valor", () => {
      const a = new InterfaceName("GigabitEthernet0/0");
      const b = new InterfaceName("GigabitEthernet0/0");
      const c = new InterfaceName("FastEthernet0/1");
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    test("toString retorna el nombre", () => {
      expect(new InterfaceName("GigabitEthernet0/0").toString()).toBe("GigabitEthernet0/0");
    });

    test("toJSON retorna el string", () => {
      expect(new InterfaceName("GigabitEthernet0/0").toJSON()).toBe("GigabitEthernet0/0");
    });
  });

  describe("helper functions", () => {
    test("parseInterfaceName crea InterfaceName", () => {
      expect(parseInterfaceName("GigabitEthernet0/0").value).toBe("GigabitEthernet0/0");
    });

    test("parseOptionalInterfaceName retorna undefined para null/undefined", () => {
      expect(parseOptionalInterfaceName(null)).toBeUndefined();
      expect(parseOptionalInterfaceName(undefined)).toBeUndefined();
    });

    test("parseOptionalInterfaceName parsea valor válido", () => {
      expect(parseOptionalInterfaceName("GigabitEthernet0/0")?.value).toBe("GigabitEthernet0/0");
    });

    test("isValidInterfaceName sin lanzar error", () => {
      expect(isValidInterfaceName("GigabitEthernet0/0")).toBe(true);
      expect(isValidInterfaceName("")).toBe(false);
      expect(isValidInterfaceName("invalid!")).toBe(false);
    });
  });
});
