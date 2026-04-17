export type AddLinkPayload = {
  type: "addLink";
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  linkType?: string;
};
