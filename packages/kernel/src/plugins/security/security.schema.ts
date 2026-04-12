import { z } from 'zod';

// Esquema para regla ACL
const aclRuleSchema = z.object({
  action: z.enum(['permit', 'deny']),
  protocol: z.enum(['ip', 'tcp', 'udp', 'icmp']).optional(),
  source: z.string().min(1),
  sourceWildcard: z.string().optional(),
  destination: z.string().optional(),
  destinationWildcard: z.string().optional(),
  destinationPort: z.string().optional(),
});

// Esquema para ACL (numerada o nombrada)
const aclSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['standard', 'extended']),
  rules: z.array(aclRuleSchema).min(1),
  appliedOn: z.string().optional(),
  direction: z.enum(['in', 'out']).optional(),
});

// Patrón para validar direcciones IPv4
const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;

// Esquema para NAT estático
const natStaticSchema = z.object({
  localIp: z.string().regex(ipv4Pattern, 'IP local inválida'),
  globalIp: z.string().regex(ipv4Pattern, 'IP global inválida'),
});

// Esquema para pool NAT
const natPoolSchema = z.object({
  name: z.string().min(1),
  startIp: z.string().regex(ipv4Pattern, 'IP inicial inválida'),
  endIp: z.string().regex(ipv4Pattern, 'IP final inválida'),
  netmask: z.string(),
});

// Esquema principal de configuración de seguridad
export const securitySchema = z.object({
  deviceName: z.string().min(1),
  acls: z.array(aclSchema).optional(),
  natStatic: z.array(natStaticSchema).optional(),
  natPool: natPoolSchema.optional(),
  natInsideInterfaces: z.array(z.string().min(1)).optional(),
  natOutsideInterfaces: z.array(z.string().min(1)).optional(),
});

export type SecurityConfig = z.output<typeof securitySchema>;
export type SecurityConfigInput = z.input<typeof securitySchema>;
