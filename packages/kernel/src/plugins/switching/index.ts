export { switchingPlugin, validateStpConfig, validateVtpConfig, validateEtherChannelConfig } from './switching.plugin.js';
export {
  generateStpCommands,
  generateVtpCommands,
  generateEtherChannelCommands,
  SWITCHING_VERIFY_COMMANDS,
  verifyShowStpSummary,
  verifyShowVtpStatus,
  verifyShowEtherchannelSummary,
} from './switching.generator.js';
export {
  stpSchema,
  vtpSchema,
  etherChannelSchema,
  type StpConfig,
  type StpConfigInput,
  type VtpConfig,
  type VtpConfigInput,
  type EtherChannelConfig,
  type EtherChannelConfigInput,
} from './switching.schema.js';
