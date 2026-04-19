export const INTERACTIVE_VERIFICATION_BASELINES = {
  "interactive-smoke": [
    "terminal.show-version",
    "terminal.show-running-config",
    "terminal.show-ip-interface-brief",
    "host.ipconfig",
  ],
  "interactive-network": [
    "host.ping",
    "host.tracert",
    "host.arp",
    "terminal.show-cdp-neighbors",
  ],
  "interactive-switching": [
    "terminal.show-vlan-brief",
    "terminal.show-cdp-neighbors",
    "terminal.show-ip-interface-brief",
  ],
} as const;

export type InteractiveVerificationBaselineName =
  keyof typeof INTERACTIVE_VERIFICATION_BASELINES;