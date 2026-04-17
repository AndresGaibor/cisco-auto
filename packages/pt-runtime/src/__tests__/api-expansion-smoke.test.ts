import { expect, test, describe } from "bun:test";
import { PT_API_METHOD_INDEX } from "../pt-api/index.js";

describe("pt-api expansion smoke test", () => {
  test("el registro reconoce métodos de ruteo avanzados (Fase 1)", () => {
    const routerPortMethods = PT_API_METHOD_INDEX["PTRouterPort"];
    expect(routerPortMethods).toContain("getOspfCost");
    expect(routerPortMethods).toContain("addEntryEigrpPassive");
    expect(routerPortMethods).toContain("getIpv6Addresses");
  });

  test("el registro reconoce métodos de switching (Fase 1)", () => {
    const switchPortMethods = PT_API_METHOD_INDEX["PTSwitchPort"];
    expect(switchPortMethods).toContain("getAccessVlan");
    expect(switchPortMethods).toContain("addTrunkVlans");
    expect(switchPortMethods).toContain("getPortSecurity");
  });

  test("el registro reconoce dispositivos especializados (Fase 2)", () => {
    expect(PT_API_METHOD_INDEX["PTServer"]).toContain("enableCip");
    expect(PT_API_METHOD_INDEX["PTAsa"]).toContain("addBookmark");
    expect(PT_API_METHOD_INDEX["PTCloud"]).toContain("addSubLinkConnection");
  });

  test("el registro reconoce métodos IoT (Fase 3)", () => {
    expect(PT_API_METHOD_INDEX["PTMcu"]).toContain("analogWrite");
    expect(PT_API_METHOD_INDEX["PTMcu"]).toContain("enableIec61850");
  });

  test("el registro reconoce control global y simulación (Fase 4)", () => {
    expect(PT_API_METHOD_INDEX["PTSimulation"]).toContain("backward");
    expect(PT_API_METHOD_INDEX["PTOptions"]).toContain("setAnimation");
    expect(PT_API_METHOD_INDEX["PTCommandLog"]).toContain("getLogCount");
  });
});
