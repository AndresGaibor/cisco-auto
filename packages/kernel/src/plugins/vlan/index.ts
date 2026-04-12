export { vlanPlugin, validateVlanConfig, validateSviConfig } from './vlan.plugin.js';
export { generateVlanCommands, verifyShowVlanBriefOutput, VLAN_VERIFY_COMMANDS, generateSviCommands, verifyShowIpInterfaceBrief, SVI_VERIFY_COMMANDS } from './vlan.generator.js';
export { vlanSchema, type VlanConfig, type VlanConfigInput, sviSchema, sviEntrySchema, type SviConfig, type SviConfigInput } from './vlan.schema.js';
