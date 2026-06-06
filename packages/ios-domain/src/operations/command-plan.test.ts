import { describe, expect, test } from "bun:test";
import { CapabilitySet } from "../capabilities/capability-set.js";
import { Ipv4Address, SubnetMask } from "@cisco-auto/ios-primitives/value-objects";
import { CommandPlanBuilder } from "./command-plan.js";
import { planConfigureStaticRoute } from "./configure-static-route.js";

describe("CommandPlanBuilder", () => {
  test("construye rollback y targetMode para una ruta estática", () => {
    const plan = new CommandPlanBuilder()
      .operation("configure-static-route")
      .target("R1")
      .config(
        "ip route 10.10.10.0 255.255.255.0 10.10.10.1",
        "Agregar ruta estática",
        "no ip route 10.10.10.0 255.255.255.0 10.10.10.1",
      )
      .build();

    expect(plan.operation).toBe("configure-static-route");
    expect(plan.target).toBe("R1");
    expect(plan.steps).toHaveLength(1);
    expect(plan.rollback).toHaveLength(1);
    expect(plan.targetMode).toBe("config");
    expect(plan.requiresPrivilege).toBe(true);
    expect(plan.requiresConfig).toBe(true);
  });

  test("planConfigureStaticRoute expone metadata de recovery", () => {
    const caps = CapabilitySet.router("2911");
    const plan = planConfigureStaticRoute(caps, {
      network: new Ipv4Address("10.10.10.0"),
      mask: new SubnetMask("255.255.255.0"),
      nextHop: new Ipv4Address("10.10.10.1"),
    });

    expect(plan).not.toBeNull();
    expect(plan?.recovery).toEqual({
      retryable: true,
      fallbackMode: "privileged-exec",
    });
  });
});
