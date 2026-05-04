import { describe, expect, test } from "bun:test";

import { extractCommandOutput, outputHasCommandEvidence } from "./command-output-extractor.js";

describe("extractCommandOutput", () => {
  test("elimina eco, syslog y prompt de la salida IOS limpia", () => {
    const result = extractCommandOutput({
      command: "show version",
      sessionKind: "ios",
      promptBefore: "Router#",
      promptAfter: "Router#",
      eventOutput: [
        "show version",
        "Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.2",
        "%LINK-3-UPDOWN: Interface GigabitEthernet0/1, changed state to up",
        "Router#",
      ].join("\n"),
      snapshotDelta: "",
      commandEndedSeen: true,
      outputEventsCount: 1,
    });

    expect(result.output).toBe(
      "Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.2",
    );
    expect(result.raw).toContain("%LINK-3-UPDOWN");
  });

  test("usa solo el último bloque cuando eventOutput trae dos ejecuciones del mismo comando", () => {
    const result = extractCommandOutput({
      command: "show version",
      sessionKind: "ios",
      promptBefore: "SW-SRV-DIST>",
      promptAfter: "SW-SRV-DIST>",
      eventOutput: [
        "SW-SRV-DIST>show version",
        "OLD VERSION OUTPUT",
        "SW-SRV-DIST>",
        "SW-SRV-DIS  show version",
        "NEW VERSION OUTPUT",
        "SW-SRV-DIST>",
      ].join("\n"),
      snapshotDelta: "",
      commandEndedSeen: true,
    });

    expect(result.raw).toContain("NEW VERSION OUTPUT");
    expect(result.raw).not.toContain("OLD VERSION OUTPUT");
    expect(result.output).toContain("NEW VERSION OUTPUT");
    expect(result.output).not.toContain("OLD VERSION OUTPUT");
  });

  test("puede cortar snapshotDelta cuando eventOutput no trae bloque confiable", () => {
    const result = extractCommandOutput({
      command: "show running-config",
      sessionKind: "ios",
      promptBefore: "SW-SRV-DIST#",
      promptAfter: "SW-SRV-DIST#",
      eventOutput: "",
      snapshotDelta: [
        "SW-SRV-DIST#show running-config",
        "OLD CONFIG",
        "SW-SRV-DIST#",
        "SW-SRV-DIST#  show running-config",
        "NEW CONFIG",
        "SW-SRV-DIST#",
      ].join("\n"),
      commandEndedSeen: true,
    });

    expect(result.raw).toContain("NEW CONFIG");
    expect(result.raw).not.toContain("OLD CONFIG");
    expect(result.output).toContain("NEW CONFIG");
    expect(result.output).not.toContain("OLD CONFIG");
  });

  test("prefiere snapshot-after-sliced sobre output crudo con error IOS stale", () => {
    const staleEventOutput = [
      "SW-SRV-DIST(config-if-range)#channel-group 7 mode active",
      "                                           ^",
      "% Invalid input detected at '^' marker.",
      "SW-SRV-DIST(config-if-range)#end",
      "SW-SRV-DIST#",
    ].join("\n");

    const snapshotAfterRaw = [
      "SW-SRV-DIST(config-if-range)#channel-group 7 mode active",
      "                                           ^",
      "% Invalid input detected at '^' marker.",
      "SW-SRV-DIST(config-if-range)#end",
      "SW-SRV-DIST#",
      "SW-SRV-DIST#show version",
      "Cisco IOS Software, C2960 Software",
      "Configuration register is 0xF",
      "SW-SRV-DIST#",
    ].join("\n");

    const result = extractCommandOutput({
      command: "show version",
      sessionKind: "ios",
      promptBefore: "SW-SRV-DIST#",
      promptAfter: "SW-SRV-DIST#",
      eventOutput: staleEventOutput,
      snapshotDelta: "",
      snapshotAfter: {
        raw: snapshotAfterRaw,
        source: "test",
      },
      commandEndedSeen: true,
      outputEventsCount: 1,
    });

    expect(result.source).toBe("snapshot-after-sliced (test)");
    expect(result.raw).toContain("SW-SRV-DIST#show version");
    expect(result.raw).toContain("Cisco IOS Software");
    expect(result.raw).not.toContain("channel-group 7 mode active");
    expect(result.output).toContain("Cisco IOS Software");
    expect(result.output).not.toContain("% Invalid input detected");
  });

  test("marca show interfaces como parcial cuando empieza en medio del bloque sin eco", () => {
    const result = extractCommandOutput({
      command: "show interfaces",
      sessionKind: "ios",
      promptBefore: "SW-SRV-DIST#",
      promptAfter: "SW-SRV-DIST#",
      eventOutput: [
        "Queueing strategy: fifo",
        "Output queue: 0/40",
        "ARP type: ARPA, ARP Timeout 04:00:00",
        "SW-SRV-DIST#",
      ].join("\n"),
      snapshotDelta: "",
      commandEndedSeen: true,
      outputEventsCount: 1,
    });

    expect(result.output).toContain("Queueing strategy");
    expect(result.warnings).toContain(
      "Output posiblemente parcial: el comando largo terminó sin eco ni encabezado inicial esperado.",
    );
  });

  test("marca show interfaces como parcial aunque exista eco si el primer contenido real es tail", () => {
    const result = extractCommandOutput({
      command: "show interfaces",
      sessionKind: "ios",
      promptBefore: "SW-SRV-DIST>",
      promptAfter: "SW-SRV-DIST>",
      eventOutput: [
        "SW-SRV-DIST>show interfaces",
        "2357 packets output, 263570 bytes, 0 underruns",
        "     0 output errors, 0 collisions, 10 interface resets",
        "",
        "FastEthernet0/22 is down, line protocol is down (disabled)",
        "SW-SRV-DIST>",
      ].join("\n"),
      snapshotDelta: "",
      commandEndedSeen: true,
      outputEventsCount: 1,
    });

    expect(result.output).toContain("2357 packets output");
    expect(result.warnings).toContain(
      "Output posiblemente parcial: el comando largo terminó sin eco ni encabezado inicial esperado.",
    );
  });

  test("no marca show interfaces como parcial cuando empieza con encabezado de interfaz", () => {
    const result = extractCommandOutput({
      command: "show interfaces",
      sessionKind: "ios",
      promptBefore: "SW-SRV-DIST#",
      promptAfter: "SW-SRV-DIST#",
      eventOutput: [
        "FastEthernet0/1 is up, line protocol is up (connected)",
        "  Hardware is Lance, address is 0060.5c93.4501",
        "SW-SRV-DIST#",
      ].join("\n"),
      snapshotDelta: "",
      commandEndedSeen: true,
      outputEventsCount: 1,
    });

    expect(result.output).toContain("FastEthernet0/1 is up");
    expect(result.warnings).not.toContain(
      "Output posiblemente parcial: el comando largo terminó sin eco ni encabezado inicial esperado.",
    );
  });
});

describe("outputHasCommandEvidence", () => {
  test("show version con output genuino devuelve true", () => {
    const output = [
      "Cisco IOS Software, Version 15.2",
      "System image file is \"flash:c2960-lanbasek9-mz.152-2.EA.bin\"",
      "Configuration register is 0xF",
    ].join("\n");
    expect(outputHasCommandEvidence(output, "show version")).toBe(true);
  });

  test("show version con output de otro comando devuelve false", () => {
    const output = [
      "Interface IP-Address OK? Method Status Protocol",
      "GigabitEthernet0/0 192.168.1.1 YES manual up up",
    ].join("\n");
    expect(outputHasCommandEvidence(output, "show version")).toBe(false);
  });

  test("show running-config con Building configuration devuelve true", () => {
    const output = [
      "Building configuration...",
      "Current configuration: 123 bytes",
      "version 15.2",
      "hostname Router",
      "end",
    ].join("\n");
    expect(outputHasCommandEvidence(output, "show running-config")).toBe(true);
  });

  test("show running-config sin evidencia de configuracion devuelve false", () => {
    const output = [
      "Cisco IOS Software, Version 15.2",
      "System image file is \"flash:c2960-lanbasek9-mz.152-2.EA.bin\"",
      "Configuration register is 0xF",
    ].join("\n");
    expect(outputHasCommandEvidence(output, "show running-config")).toBe(false);
  });

  test("show ip interface brief con header correcto devuelve true", () => {
    const output = [
      "Interface IP-Address OK? Method Status Protocol",
      "GigabitEthernet0/0 192.168.1.1 YES manual up up",
    ].join("\n");
    expect(outputHasCommandEvidence(output, "show ip interface brief")).toBe(true);
  });

  test("show ip interface brief con output de show version devuelve false", () => {
    const output = [
      "Cisco IOS Software, Version 15.2",
      "System image file",
      "Configuration register is 0xF",
    ].join("\n");
    expect(outputHasCommandEvidence(output, "show ip interface brief")).toBe(false);
  });

  test("show interfaces con encabezado de interfaz valido devuelve true", () => {
    const output = [
      "FastEthernet0/1 is up, line protocol is up (connected)",
      "  Hardware is Lance, address is 0060.5c93.4501",
    ].join("\n");
    expect(outputHasCommandEvidence(output, "show interfaces")).toBe(true);
  });

  test("show interfaces sin encabezado valido devuelve false", () => {
    const output = [
      "Interface IP-Address OK? Method Status Protocol",
      "GigabitEthernet0/0 192.168.1.1 YES manual up up",
    ].join("\n");
    expect(outputHasCommandEvidence(output, "show interfaces")).toBe(false);
  });

  test("comando desconocido devuelve true por defecto", () => {
    expect(outputHasCommandEvidence("some output", "show something-odd")).toBe(true);
  });
});

describe("extractCommandOutput - blindaje de output contaminado", () => {
  test("no completa running-config con historial viejo de show version", () => {
    const staleOutput = [
      "SW-SRV-DIST#show running-config",
      "Cisco IOS Software, Version 15.2",
      "System image file is \"flash:c2960-lanbasek9-mz.152-2.EA.bin\"",
      "Configuration register is 0xF",
      "SW-SRV-DIST#",
    ].join("\n");

    const result = extractCommandOutput({
      command: "show running-config",
      sessionKind: "ios",
      promptBefore: "SW-SRV-DIST#",
      promptAfter: "SW-SRV-DIST#",
      eventOutput: staleOutput,
      snapshotDelta: "",
      commandEndedSeen: true,
      outputEventsCount: 1,
    });

    expect(result.warnings).toContain(
      'El output no contiene evidencia del comando actual ("show running-config"). Output puede pertenecer a otra ejecución.',
    );
  });

  test("sí completa show running-config si contiene evidencia real", () => {
    const genuineOutput = [
      "SW-SRV-DIST#show running-config",
      "Building configuration...",
      "Current configuration: 123 bytes",
      "version 15.2",
      "hostname SW-SRV-DIST",
      "end",
      "SW-SRV-DIST#",
    ].join("\n");

    const result = extractCommandOutput({
      command: "show running-config",
      sessionKind: "ios",
      promptBefore: "SW-SRV-DIST#",
      promptAfter: "SW-SRV-DIST#",
      eventOutput: genuineOutput,
      snapshotDelta: "",
      commandEndedSeen: true,
      outputEventsCount: 1,
    });

    expect(result.output).toContain("Building configuration");
    expect(result.warnings).not.toContain(
      'El output no contiene evidencia del comando actual ("show running-config"). Output puede pertenecer a otra ejecución.',
    );
  });

  test("no completa show version con output de ip interface brief", () => {
    const wrongOutput = [
      "SW-SRV-DIST#show version",
      "Interface IP-Address OK? Method Status Protocol",
      "GigabitEthernet0/0 192.168.1.1 YES manual up up",
      "SW-SRV-DIST#",
    ].join("\n");

    const result = extractCommandOutput({
      command: "show version",
      sessionKind: "ios",
      promptBefore: "SW-SRV-DIST#",
      promptAfter: "SW-SRV-DIST#",
      eventOutput: wrongOutput,
      snapshotDelta: "",
      commandEndedSeen: true,
      outputEventsCount: 1,
    });

    expect(result.warnings).toContain(
      'El output no contiene evidencia del comando actual ("show version"). Output puede pertenecer a otra ejecución.',
    );
  });

  test("no completa ip interface brief con output de show version", () => {
    const wrongOutput = [
      "SW-SRV-DIST#show ip interface brief",
      "Cisco IOS Software, Version 15.2",
      "System image file is \"flash:c2960-lanbasek9-mz.152-2.EA.bin\"",
      "Configuration register is 0xF",
      "SW-SRV-DIST#",
    ].join("\n");

    const result = extractCommandOutput({
      command: "show ip interface brief",
      sessionKind: "ios",
      promptBefore: "SW-SRV-DIST#",
      promptAfter: "SW-SRV-DIST#",
      eventOutput: wrongOutput,
      snapshotDelta: "",
      commandEndedSeen: true,
      outputEventsCount: 1,
    });

    expect(result.warnings).toContain(
      'El output no contiene evidencia del comando actual ("show ip interface brief"). Output puede pertenecer a otra ejecución.',
    );
  });
});
