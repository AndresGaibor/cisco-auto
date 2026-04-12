import { z } from 'zod';

// Schema para validar direcciones IPv4
const ipv4Schema = z.string().regex(/^\d{1,3}(\.\d{1,3}){3}$/);

// Schema para validar máscaras de subred
const subnetMaskSchema = z.string().regex(/^\d{1,3}(\.\d{1,3}){3}$/);

// DHCP Pool
const dhcpPoolSchema = z.object({
  name: z.string().min(1),
  network: ipv4Schema,
  mask: subnetMaskSchema,
  defaultRouter: ipv4Schema.optional(),
  dnsServers: z.array(ipv4Schema).optional(),
  domainName: z.string().optional(),
  excludedAddresses: z.array(ipv4Schema).optional(),
  lease: z.number().int().positive().optional(),
});

// NTP
const ntpServerSchema = z.object({
  ip: z.string().min(1),
  prefer: z.boolean().optional(),
  stratum: z.number().int().min(1).max(15).optional(),
});

const ntpSchema = z.object({
  servers: z.array(ntpServerSchema).optional(),
  master: z.boolean().optional(),
  stratum: z.number().int().min(1).max(15).optional(),
});

// DNS
const dnsSchema = z.object({
  domainName: z.string().optional(),
  nameServers: z.array(z.string().min(1)).optional(),
});

// Syslog
const syslogServerSchema = z.object({
  ip: ipv4Schema,
  severity: z.enum([
    'emergencies',
    'alerts',
    'critical',
    'errors',
    'warnings',
    'notifications',
    'informational',
    'debugging',
  ]).optional(),
});

const syslogSchema = z.object({
  servers: z.array(syslogServerSchema),
  trap: z.enum([
    'emergencies',
    'alerts',
    'critical',
    'errors',
    'warnings',
    'notifications',
    'informational',
    'debugging',
  ]).optional(),
});

// SNMP
const snmpCommunitySchema = z.object({
  name: z.string().min(1),
  access: z.enum(['ro', 'rw']),
});

const snmpHostSchema = z.object({
  ip: ipv4Schema,
  community: z.string().min(1),
});

const snmpSchema = z.object({
  communities: z.array(snmpCommunitySchema).optional(),
  hosts: z.array(snmpHostSchema).optional(),
});

// Schema principal de servicios
export const servicesSchema = z.object({
  deviceName: z.string().min(1),
  dhcp: z.array(dhcpPoolSchema).optional(),
  ntp: ntpSchema.optional(),
  dns: dnsSchema.optional(),
  syslog: syslogSchema.optional(),
  snmp: snmpSchema.optional(),
});

export type ServicesConfig = z.output<typeof servicesSchema>;
export type ServicesConfigInput = z.input<typeof servicesSchema>;
export type DhcpPoolConfig = z.output<typeof dhcpPoolSchema>;
export type NtpConfig = z.output<typeof ntpSchema>;
export type DnsConfig = z.output<typeof dnsSchema>;
export type SyslogConfig = z.output<typeof syslogSchema>;
export type SnmpConfig = z.output<typeof snmpSchema>;
