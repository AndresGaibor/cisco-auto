import { test, expect, describe } from "bun:test";
import { 
  IosCommandStrategy, 
  RouterStrategy, 
  SwitchStrategy, 
  PcStrategy,
  getStrategy,
  IosDeviceType 
} from "./ios-commands";

describe("IosCommandStrategy", () => {
  describe("RouterStrategy", () => {
    const strategy = new RouterStrategy();
    
    test("deviceType es router", () => {
      expect(strategy.deviceType).toBe("router");
    });

    test("dismissSetupCommand devuelve 'no'", () => {
      expect(strategy.dismissSetupCommand()).toBe("no");
    });

    test("pressReturnCommand devuelve ''", () => {
      expect(strategy.pressReturnCommand()).toBe("");
    });
    
    test("confirmationCommand devuelve 'y'", () => {
      expect(strategy.confirmationCommand()).toBe("y");
    });

    test("supportedCommands incluye comandos de router", () => {
      expect(strategy.supportedCommands).toContain("show");
      expect(strategy.supportedCommands).toContain("config");
      expect(strategy.supportedCommands).toContain("interface");
    });
  });

  describe("SwitchStrategy", () => {
    const strategy = new SwitchStrategy();
    
    test("deviceType es switch", () => {
      expect(strategy.deviceType).toBe("switch");
    });

    test("dismissSetupCommand devuelve 'no'", () => {
      expect(strategy.dismissSetupCommand()).toBe("no");
    });

    test("pressReturnCommand devuelve ''", () => {
      expect(strategy.pressReturnCommand()).toBe("");
    });

    test("confirmationCommand devuelve 'y'", () => {
      expect(strategy.confirmationCommand()).toBe("y");
    });

    test("supportedCommands incluye comandos de switch", () => {
      expect(strategy.supportedCommands).toContain("show");
      expect(strategy.supportedCommands).toContain("vlan");
      expect(strategy.supportedCommands).toContain("spanning-tree");
    });
  });

  describe("PcStrategy", () => {
    const strategy = new PcStrategy();
    
    test("deviceType es pc", () => {
      expect(strategy.deviceType).toBe("pc");
    });

    test("PC no tiene setup dialog - devuelve null", () => {
      expect(strategy.dismissSetupCommand()).toBeNull();
    });

    test("pressReturnCommand devuelve ''", () => {
      expect(strategy.pressReturnCommand()).toBe("");
    });

    test("confirmationCommand devuelve 'y'", () => {
      expect(strategy.confirmationCommand()).toBe("y");
    });

    test("supportedCommands incluye comandos de PC", () => {
      expect(strategy.supportedCommands).toContain("ipconfig");
      expect(strategy.supportedCommands).toContain("ping");
    });
  });

  describe("getStrategy", () => {
    test("devuelve RouterStrategy para 'router'", () => {
      expect(getStrategy("router")).toBeInstanceOf(RouterStrategy);
    });

    test("devuelve SwitchStrategy para 'switch'", () => {
      expect(getStrategy("switch")).toBeInstanceOf(SwitchStrategy);
    });

    test("devuelve PcStrategy para 'pc'", () => {
      expect(getStrategy("pc")).toBeInstanceOf(PcStrategy);
    });
    
    test("throw para tipo desconocido", () => {
      expect(() => getStrategy("unknown" as any)).toThrow();
    });
  });
});
