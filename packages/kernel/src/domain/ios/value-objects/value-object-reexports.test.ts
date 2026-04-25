import { describe, expect, test } from "bun:test";

import {
  VlanId as KernelVlanId,
  InterfaceName as KernelInterfaceName,
  Ipv4Address as KernelIpv4Address,
  SubnetMask as KernelSubnetMask,
} from "./index.js";

import {
  VlanId as PrimitiveVlanId,
  InterfaceName as PrimitiveInterfaceName,
  Ipv4Address as PrimitiveIpv4Address,
  SubnetMask as PrimitiveSubnetMask,
} from "@cisco-auto/ios-primitives/value-objects";

describe("kernel value-object compatibility re-exports", () => {
  test("kernel re-exports the exact primitive classes", () => {
    expect(KernelVlanId).toBe(PrimitiveVlanId);
    expect(KernelInterfaceName).toBe(PrimitiveInterfaceName);
    expect(KernelIpv4Address).toBe(PrimitiveIpv4Address);
    expect(KernelSubnetMask).toBe(PrimitiveSubnetMask);
  });

  test("instances created through kernel are instances of primitive classes", () => {
    expect(new KernelVlanId(10)).toBeInstanceOf(PrimitiveVlanId);
    expect(new KernelInterfaceName("GigabitEthernet0/1")).toBeInstanceOf(PrimitiveInterfaceName);
    expect(new KernelIpv4Address("192.168.1.1")).toBeInstanceOf(PrimitiveIpv4Address);
    expect(new KernelSubnetMask("255.255.255.0")).toBeInstanceOf(PrimitiveSubnetMask);
  });
});