import { z } from "zod";
import { Ipv4Address, IpWithPrefix } from "../../value-objects/index.ts";

const ipv4AddressString = z.string().refine(
	(val): val is string => {
		try {
			new Ipv4Address(val);
			return true;
		} catch {
			return false;
		}
	},
	{
		error: "Invalid IPv4 address",
	},
);

const ipWithPrefixString = z.string().refine(
	(val): val is string => {
		try {
			IpWithPrefix.fromJSON(val);
			return true;
		} catch {
			return false;
		}
	},
	{
		error:
			"Invalid IP with prefix (expected format: IP/prefix, e.g., 192.168.1.0/24)",
	},
);

export const DhcpConfigSchema = z
	.object({
		poolName: z.string().min(1, "DHCP pool name is required"),
		network: ipWithPrefixString,
		defaultRouter: ipv4AddressString,
		dnsServer: ipv4AddressString.optional(),
	})
	.strict();

export type DhcpConfig = z.infer<typeof DhcpConfigSchema>;

export function parseDhcpConfig(input: unknown) {
	return DhcpConfigSchema.safeParse(input);
}

export function parseDhcpConfigStrict(input: unknown): DhcpConfig {
	return DhcpConfigSchema.parse(input);
}
