import { describe, expect, test } from "bun:test";
import {
  parseDumpFromMdFiles,
  getDeviceTypeIdMap,
  getAvailableMethods,
  getDeviceMethods,
} from "../../harness/pt-script-result/parser";
import { resolve } from "path";

const API_REF_DIR = resolve(__dirname, "../../../docs/api-reference");

describe("pt-script-result parser from MD", () => {
  test("parseDumpFromMdFiles parses the API reference MD files", () => {
    const dump = parseDumpFromMdFiles(API_REF_DIR);

    expect(dump.meta).toBeDefined();
    expect(dump.meta.seedDevices).toBeDefined();
    expect(dump.meta.seedDevices.length).toBeGreaterThan(0);
  });

  test("getDeviceTypeIdMap creates correct mapping", () => {
    const dump = parseDumpFromMdFiles(API_REF_DIR);
    const map = getDeviceTypeIdMap(dump);

    expect(map["2911"]).toBe(0);
    expect(map["2960-24TT"]).toBe(1);
    expect(map["PC-PT"]).toBe(8);
    expect(map["Server-PT"]).toBe(9);
  });

  test("getAvailableMethods returns methods for a class", () => {
    const dump = parseDumpFromMdFiles(API_REF_DIR);
    const methods = getAvailableMethods(dump, "Router");

    expect(methods).toContain("getName");
    expect(methods).toContain("getModel");
    expect(methods).toContain("getType");
  });

  test("getDeviceMethods returns methods for a device model", () => {
    const dump = parseDumpFromMdFiles(API_REF_DIR);
    // Use "Router" as it is the name assigned during MD reconstruction in parseDumpFromMdFiles
    const methods = getDeviceMethods(dump, "Router");

    expect(methods.length).toBeGreaterThan(0);
    expect(methods).toContain("getName");
  });

  test("parseDump extracts surfaces from MD class files", () => {
    const dump = parseDumpFromMdFiles(API_REF_DIR);

    const routerSurface = dump.surfaces.find((s) => s.className === "Router");
    expect(routerSurface).toBeDefined();
    expect(routerSurface?.methods.length).toBeGreaterThan(100);
  });

  test("parseDump extracts globals from MD files", () => {
    const dump = parseDumpFromMdFiles(API_REF_DIR);

    expect(dump.globals).toContain("ipc");
    expect(dump.globals).toContain("_Network");
  });

  test("parseDump extracts summary counts", () => {
    const dump = parseDumpFromMdFiles(API_REF_DIR);

    expect(dump.summary.globalsFound).toBeGreaterThan(0);
    expect(dump.summary.devicesFound).toBeGreaterThan(0);
  });
});
