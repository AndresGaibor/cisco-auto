export type AddLinkPayload = {
  type: "addLink";
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  linkType?: string;
  cableType?: string;
  strictPorts?: boolean;
  allowAutoFallback?: boolean;
  replaceExisting?: boolean;
};

export type RemoveLinkPayload = {
  type: "removeLink";
  device: string;
  port: string;
  device2?: string;
  port2?: string;
  strict?: boolean;
};

export type VerifyLinkPayload = {
  type: "verifyLink";
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  waitGreenMs?: number;
};
