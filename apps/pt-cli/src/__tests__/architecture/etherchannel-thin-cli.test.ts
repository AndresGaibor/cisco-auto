import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("etherchannel CLI boundary", () => {
  const source = readFileSync(
    join(import.meta.dir, "../../commands/etherchannel.ts"),
    "utf8",
  );

  test("etherchannel.ts imports from pt-control application/etherchannel", () => {
    expect(source).toContain("@cisco-auto/pt-control/application/etherchannel");
    expect(source).toContain("createEtherChannel");
    expect(source).toContain("removeEtherChannel");
    expect(source).toContain("listEtherChannel");
  });

  test("etherchannel.ts does NOT contain inline IOS command strings for create/remove", () => {
    // The CLI should delegate command generation to pt-control / kernel plugin
    expect(source).not.toContain("channel-group");
    expect(source).not.toContain("no interface Port-channel");
  });

  test("etherchannel.ts does NOT import generateEtherChannelCommands directly from kernel", () => {
    expect(source).not.toContain("generateEtherChannelCommands");
    expect(source).not.toContain("validateEtherChannelConfig");
    expect(source).not.toContain("@cisco-auto/kernel/plugins/switching");
  });

  test("etherchannel.ts does NOT call ctx.controller methods directly", () => {
    // The CLI should call pt-control use cases, not raw controller methods
    expect(source).not.toContain("ctx.controller.configIosWithResult");
    expect(source).not.toContain("ctx.controller.execIos");
    expect(source).not.toContain("ctx.controller.start()");
    expect(source).not.toContain("ctx.controller.stop()");
  });

  test("etherchannel.ts does NOT fetch device list directly", () => {
    expect(source).not.toContain("fetchDeviceList");
    expect(source).not.toContain("getIOSCapableDevices");
  });

  test("etherchannel.ts keeps ETHERCHANNEL_META", () => {
    expect(source).toContain("ETHERCHANNEL_META");
    expect(source).toContain("id: 'etherchannel'");
  });

  test("etherchannel.ts calls pt-control use cases in execute callbacks", () => {
    expect(source).toContain("createEtherChannel(");
    expect(source).toContain("removeEtherChannel(");
    expect(source).toContain("listEtherChannel(");
  });

  test("etherchannel.ts has under 300 lines", () => {
    const lines = source.split("\n").filter((l) => l.trim() !== "");
    expect(lines.length).toBeLessThan(300);
  });
});
