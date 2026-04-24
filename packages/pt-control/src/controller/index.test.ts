import { describe, expect, test } from "bun:test";
import { PTController } from "./index.js";

describe("PTController IOS facade", () => {
  test("configIos y showMacAddressTable delegan al facade IOS", async () => {
    const llamadas: string[] = [];
    const controller = new PTController({
      controllerIosService: {
        configIos: async () => {
          llamadas.push("configIos");
        },
        showMacAddressTable: async () => {
          llamadas.push("showMacAddressTable");
          return { raw: "ok", entries: [] };
        },
      },
    } as any);

    await controller.configIos("R1", ["hostname R1"]);
    await controller.showMacAddressTable("Switch1");

    expect(llamadas).toEqual(["configIos", "showMacAddressTable"]);
  });
});
