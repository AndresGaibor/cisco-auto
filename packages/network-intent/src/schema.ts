import { z } from "zod";

// Device definition
export const DeviceSchema = z.object({
  name: z.string(),
  model: z.string(),
  role: z.enum(["core", "access", "edge-router", "services", "client", "wireless-ap", "wlc"]),
});

// Link definition  
export const LinkSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.enum(["trunk", "access", "virtual"]),
  vlan: z.number().optional(),
});

// VLAN definition
export const VlanSchema = z.object({
  id: z.number(),
  name: z.string(),
  subnet: z.string().optional(),
  gateway: z.string().optional(),
});

// Switching config
export const SwitchingConfigSchema = z.object({
  trunks: z.array(z.object({
    device: z.string(),
    interface: z.string(),
    allowedVlans: z.array(z.number()),
    nativeVlan: z.number().optional(),
  })).optional(),
  accessPorts: z.array(z.object({
    device: z.string(),
    interface: z.string(),
    vlan: z.number(),
    portSecurity: z.object({
      maximum: z.number().optional(),
      violation: z.enum(["restrict", "protect", "shutdown"]).optional(),
    }).optional(),
  })).optional(),
});

// Routing config
export const RoutingConfigSchema = z.object({
  interVlan: z.object({
    mode: z.enum(["svi", "router-on-stick"]),
    device: z.string(),
    svi: z.array(z.object({
      vlan: z.number(),
      ip: z.string(),
    })).optional(),
  }).optional(),
  staticRoutes: z.array(z.object({
    network: z.string(),
    nextHop: z.string(),
  })).optional(),
  ospf: z.array(z.object({
    processId: z.string(),
    network: z.string(),
    area: z.string(),
  })).optional(),
});

// DHCP config
export const DhcpConfigSchema = z.object({
  server: z.string(),
  pools: z.array(z.object({
    name: z.string(),
    vlan: z.number().optional(),
    network: z.string(),
    gateway: z.string(),
    start: z.string(),
    end: z.string(),
    dns: z.string().optional(),
    maxUsers: z.number().optional(),
  })),
});

// Services config
export const ServicesConfigSchema = z.object({
  dns: z.array(z.object({
    server: z.string(),
    records: z.array(z.object({
      name: z.string(),
      ip: z.string(),
    })),
  })).optional(),
  http: z.array(z.object({
    server: z.string(),
    enabled: z.boolean().optional(),
  })).optional(),
});

// Security config
export const SecurityConfigSchema = z.object({
  portSecurity: z.array(z.object({
    device: z.string(),
    interfaces: z.array(z.string()),
    maximum: z.number().optional(),
    violation: z.enum(["restrict", "protect", "shutdown"]).optional(),
  })).optional(),
  dhcpSnooping: z.object({
    vlans: z.array(z.number()),
    trustedPorts: z.array(z.string()),
  }).optional(),
});

// Verification config
export const VerificationSchema = z.object({
  connectivity: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.enum(["ping", "dns", "http", "trace"]),
  })).optional(),
});

// Main lab intent schema
export const NetworkLabIntentSchema = z.object({
  name: z.string(),
  devices: z.array(DeviceSchema),
  links: z.array(LinkSchema).optional(),
  vlans: z.array(VlanSchema).optional(),
  switching: SwitchingConfigSchema.optional(),
  routing: RoutingConfigSchema.optional(),
  dhcp: DhcpConfigSchema.optional(),
  services: ServicesConfigSchema.optional(),
  security: SecurityConfigSchema.optional(),
  verification: VerificationSchema.optional(),
});

export type NetworkLabIntent = z.infer<typeof NetworkLabIntentSchema>;
