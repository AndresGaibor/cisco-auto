import { describe, expect, test } from "bun:test";
import {
  type ArtifactKind,
  buildArtifactPage,
  pageFromContent,
} from "../artifacts/artifact-page";
import {
  DefaultArtifactFactory,
  type ArtifactFactoryDeps,
} from "../artifacts/artifact-factory";

describe("ArtifactPage - modelado Page Object", () => {
  test("Test 1: buildArtifactPage retorna objeto con kind, content, checksum, normalized, contract correctos", () => {
    const input = {
      kind: "main" as ArtifactKind,
      content: "// main content",
      contract: { hasKernel: true } as const,
      checksum: "abc123",
      normalized: "// main content",
    };
    const page = buildArtifactPage(input);
    expect(page.kind).toBe("main");
    expect(page.content).toBe("// main content");
    expect(page.checksum).toBe("abc123");
    expect(page.normalized).toBe("// main content");
    expect(page.contract).toEqual({ hasKernel: true });
  });

  test("Test 2: pageFromContent produce checksum estable para mismo input", () => {
    const content = "// stable content\nfunction main() {}\n";
    const contract = { ok: true } as const;
    const pageA = pageFromContent("main", content, contract);
    const pageB = pageFromContent("main", content, contract);
    expect(pageA.checksum).toBe(pageB.checksum);
    expect(pageA.checksum.length).toBeGreaterThan(0);
  });

  test("Test 3: pageFromContent ignora líneas de 'PT-SCRIPT v2 active' y 'Generated at:' en normalized", () => {
    const conLineasTemporales =
      "// header\nPT-SCRIPT v2 active (build: 2024-01-01)\nGenerated at: 2024-01-01\nfunction main() {}\nBuild ID: 42\n";
    const sinLineasTemporales = "// header\nfunction main() {}\n";

    const pageCon = pageFromContent("main", conLineasTemporales, {});
    const pageSin = pageFromContent("main", sinLineasTemporales, {});

    expect(pageCon.normalized).toBe(pageSin.normalized);
    expect(pageCon.checksum).toBe(pageSin.checksum);
    expect(pageCon.normalized).not.toContain("PT-SCRIPT v2 active");
    expect(pageCon.normalized).not.toContain("Generated at:");
    expect(pageCon.normalized).not.toContain("Build ID:");
  });

  test("Test 4: equals retorna true para dos páginas con mismo content; false si difieren", () => {
    const a = pageFromContent("main", "// same content", {});
    const b = pageFromContent("main", "// same content", {});
    expect(a.equals(b)).toBe(true);

    const c = pageFromContent("main", "// different content", {});
    expect(a.equals(c)).toBe(false);
  });

  test("Test 5: describe() retorna string con kind, checksum y length", () => {
    const content = "// describe test content";
    const page = pageFromContent("runtime", content, { hasDispatch: true });
    const desc = page.describe();
    expect(desc).toContain("runtime");
    expect(desc).toContain(page.checksum);
    expect(desc).toContain(String(content.length));
  });
});

describe("DefaultArtifactFactory - dispatch por kind", () => {
  function construirFactory(bitacora: { ultimoKind: ArtifactKind | null }): {
    factory: DefaultArtifactFactory;
    bitacora: typeof bitacora;
  } {
    const mainComposer = () => {
      bitacora.ultimoKind = "main";
      return "// main artifact";
    };
    const runtimeComposer = () => {
      bitacora.ultimoKind = "runtime";
      return "// runtime artifact";
    };
    const catalogComposer = () => {
      bitacora.ultimoKind = "catalog";
      return "// catalog artifact";
    };
    const noContract = () => {
      // No-op: contrato válido por defecto para tests
    };
    const deps: ArtifactFactoryDeps = {
      mainComposer,
      runtimeComposer,
      catalogComposer,
      mainContract: noContract,
      runtimeContract: noContract,
      catalogContract: noContract,
      mainMarkers: { ok: true },
      runtimeMarkers: { ok: true },
      catalogMarkers: { ok: true },
    };
    return { factory: new DefaultArtifactFactory(deps), bitacora };
  }

  test("Test 6: DefaultArtifactFactory.page llama al composer correcto por kind", () => {
    const ctx = { srcDir: "/src", outputPath: "/out" };
    const { factory } = construirFactory({ ultimoKind: null });

    const mainPage = factory.page("main", ctx);
    expect(mainPage.kind).toBe("main");
    expect(mainPage.content).toBe("// main artifact");

    const runtimePage = factory.page("runtime", ctx);
    expect(runtimePage.kind).toBe("runtime");
    expect(runtimePage.content).toBe("// runtime artifact");

    const catalogPage = factory.page("catalog", ctx);
    expect(catalogPage.kind).toBe("catalog");
    expect(catalogPage.content).toBe("// catalog artifact");
  });

  test("Test 7: DefaultArtifactFactory.assertContract usa el contract del kind correcto", () => {
    const contratosLlamados: ArtifactKind[] = [];
    const deps: ArtifactFactoryDeps = {
      mainComposer: () => "// main",
      runtimeComposer: () => "// runtime",
      catalogComposer: () => "// catalog",
      mainContract: () => {
        contratosLlamados.push("main");
      },
      runtimeContract: () => {
        contratosLlamados.push("runtime");
      },
      catalogContract: () => {
        contratosLlamados.push("catalog");
      },
      mainMarkers: {},
      runtimeMarkers: {},
      catalogMarkers: {},
    };
    const factory = new DefaultArtifactFactory(deps);

    factory.assertContract("main", "code");
    factory.assertContract("runtime", "code");
    factory.assertContract("catalog", "code");

    expect(contratosLlamados).toEqual(["main", "runtime", "catalog"]);
  });
});
