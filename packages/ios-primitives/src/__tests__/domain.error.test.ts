import { describe, expect, test } from "bun:test";
import { DomainError } from "../domain/shared/errors/domain.error.js";

describe("DomainError", () => {
  test("invalidValue crea error con mensaje apropiado", () => {
    const error = DomainError.invalidValue("VLAN ID", 9999, "out of range");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("DomainError");
    expect(error.code).toBe("INVALID_VALUE");
    expect(error.message).toContain("9999");
    expect(error.message).toContain("out of range");
    expect(error.context).toEqual({ type: "VLAN ID", value: 9999, reason: "out of range" });
  });

  test("invalidValue sin reason", () => {
    const error = DomainError.invalidValue("ASN", 99999);
    expect(error.message).toBe('Invalid ASN: "99999"');
    expect(error.context?.reason).toBeUndefined();
  });

  test("invariantViolation crea error con código INVARIANT_VIOLATION", () => {
    const error = DomainError.invariantViolation("duplicate interface", { iface: "G0/1" });
    expect(error.code).toBe("INVARIANT_VIOLATION");
    expect(error.message).toBe("duplicate interface");
    expect(error.context).toEqual({ iface: "G0/1" });
  });

  test("notFound crea error con código NOT_FOUND", () => {
    const error = DomainError.notFound("Device", "SW1");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe('Device with id "SW1" not found');
    expect(error.context).toEqual({ type: "Device", id: "SW1" });
  });

  test("notAllowed crea error con código NOT_ALLOWED", () => {
    const error = DomainError.notAllowed("delete-vlan", "VLAN 1 is default");
    expect(error.code).toBe("NOT_ALLOWED");
    expect(error.message).toBe('Operation "delete-vlan" not allowed: VLAN 1 is default');
    expect(error.context).toEqual({ operation: "delete-vlan", reason: "VLAN 1 is default" });
  });

  test("conflict crea error con código CONFLICT", () => {
    const error = DomainError.conflict("VLAN ID already exists", { vlanId: 10 });
    expect(error.code).toBe("CONFLICT");
    expect(error.message).toBe("VLAN ID already exists");
    expect(error.context).toEqual({ vlanId: 10 });
  });
});
