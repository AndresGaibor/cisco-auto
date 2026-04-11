import { describe, it, expect } from "bun:test";
import { parseDhcpConfig, parseDhcpConfigStrict } from "./dhcp.ts";

describe("DHCP Schema Validation", () => {
	const validConfig = {
		poolName: "POOL1",
		network: "192.168.1.0/24",
		defaultRouter: "192.168.1.1",
		dnsServer: "8.8.8.8",
	};

	it("should parse valid DHCP configuration", () => {
		const result = parseDhcpConfig(validConfig);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(validConfig);
		}
	});

	it("should parse valid DHCP configuration without optional dnsServer", () => {
		const configWithoutDns = {
			poolName: "POOL1",
			network: "192.168.1.0/24",
			defaultRouter: "192.168.1.1",
		};

		const result = parseDhcpConfig(configWithoutDns);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(configWithoutDns);
		}
	});

	it("should throw on empty poolName", () => {
		const invalidConfig = { ...validConfig, poolName: "" };
		expect(() => parseDhcpConfigStrict(invalidConfig)).toThrow();

		const safeResult = parseDhcpConfig(invalidConfig);
		expect(safeResult.success).toBe(false);
		if (!safeResult.success) {
			expect(safeResult.error.issues[0]?.code).toBe("too_small");
			expect(safeResult.error.issues[0]?.message).toContain(
				"DHCP pool name is required",
			);
		}
	});

	it("should throw on invalid IP with prefix in network", () => {
		const invalidConfig = {
			...validConfig,
			network: "192.168.1.0/33",
		};
		expect(() => parseDhcpConfigStrict(invalidConfig)).toThrow();

		const safeResult = parseDhcpConfig(invalidConfig);
		expect(safeResult.success).toBe(false);
		if (!safeResult.success) {
			expect(safeResult.error.issues[0]?.message).toContain(
				"Invalid IP with prefix",
			);
		}
	});

	it("should throw on invalid IPv4 address in defaultRouter", () => {
		const invalidConfig = {
			...validConfig,
			defaultRouter: "999.168.1.1",
		};
		expect(() => parseDhcpConfigStrict(invalidConfig)).toThrow();

		const safeResult = parseDhcpConfig(invalidConfig);
		expect(safeResult.success).toBe(false);
		if (!safeResult.success) {
			expect(safeResult.error.issues[0]?.message).toContain(
				"Invalid IPv4 address",
			);
		}
	});

	it("should throw on invalid IPv4 address in dnsServer", () => {
		const invalidConfig = {
			...validConfig,
			dnsServer: "8.8.8.999",
		};
		expect(() => parseDhcpConfigStrict(invalidConfig)).toThrow();

		const safeResult = parseDhcpConfig(invalidConfig);
		expect(safeResult.success).toBe(false);
		if (!safeResult.success) {
			expect(safeResult.error.issues[0]?.message).toContain(
				"Invalid IPv4 address",
			);
		}
	});

	it("should reject extra fields", () => {
		const invalidConfig = {
			...validConfig,
			extraField: "should not be allowed",
		};
		expect(() => parseDhcpConfigStrict(invalidConfig)).toThrow();

		const safeResult = parseDhcpConfig(invalidConfig);
		expect(safeResult.success).toBe(false);
		if (!safeResult.success) {
			expect(safeResult.error.issues[0]?.code).toBe("unrecognized_keys");
		}
	});

	it("should allow missing optional dnsServer field", () => {
		const minimalConfig = {
			poolName: "POOL1",
			network: "10.0.0.0/8",
			defaultRouter: "10.0.0.1",
		};

		const result = parseDhcpConfig(minimalConfig);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.poolName).toBe("POOL1");
			expect(result.data.network).toBe("10.0.0.0/8");
			expect(result.data.defaultRouter).toBe("10.0.0.1");
			expect(result.data.dnsServer).toBeUndefined();
		}
	});
});
