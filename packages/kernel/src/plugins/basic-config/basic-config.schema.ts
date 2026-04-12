import { z } from 'zod';

// Banner
export const bannerSchema = z.object({
  motd: z.string().min(1).describe('Banner MOTD'),
});

export type BannerConfig = z.output<typeof bannerSchema>;
export type BannerConfigInput = z.input<typeof bannerSchema>;

// Lines
const lineTypeSchema = z.enum(['console', 'vty', 'aux']);
export type LineType = z.output<typeof lineTypeSchema>;

const lineEntrySchema = z.object({
  type: lineTypeSchema,
  range: z.string().optional().describe('Rango de líneas (ej: "0 15" para vty)'),
  password: z.string().min(1).optional(),
  loginLocal: z.boolean().optional().default(false),
  transportInput: z.enum(['ssh', 'telnet', 'all', 'none']).optional(),
  execTimeout: z.number().int().positive().optional().describe('Timeout en minutos'),
  loggingSynchronous: z.boolean().optional(),
  loginBlock: z.object({
    attempts: z.number().int().positive(),
    within: z.number().int().positive().describe('Segundos'),
    blockTime: z.number().int().positive().describe('Segundos'),
  }).optional(),
});

export type LineEntry = z.output<typeof lineEntrySchema>;

// SSH
const sshConfigSchema = z.object({
  domainName: z.string().min(1),
  keySize: z.number().int().min(1024).max(4096).default(2048),
  version: z.number().int().min(1).max(2).default(2),
});

export type SshConfig = z.output<typeof sshConfigSchema>;

// Basic Config
export const basicConfigSchema = z.object({
  deviceName: z.string().min(1),
  hostname: z.string().min(1).max(63).regex(/^[a-zA-Z0-9_-]+$/, 'Hostname debe contener solo letras, números, guiones y guiones bajos'),
  banner: bannerSchema.optional(),
  lines: z.array(lineEntrySchema).optional(),
  ssh: sshConfigSchema.optional(),
  passwordEncryption: z.boolean().optional().default(true),
  noIpDomainLookup: z.boolean().optional().default(true),
  loggingSynchronous: z.boolean().optional().default(true),
  timezone: z.object({
    name: z.string().min(1).default('UTC'),
    offset: z.number().int().min(-12).max(14).default(0),
  }).optional(),
});

export type BasicConfig = z.output<typeof basicConfigSchema>;
export type BasicConfigInput = z.input<typeof basicConfigSchema>;
