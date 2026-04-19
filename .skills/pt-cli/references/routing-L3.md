# Expert Knowledge: Routing & Layer 3 Services (Cisco CCNA/CCNP)

## 1. IPv4 Addressing & Subnetting
- **Rule:** A host can only talk to another host in its own subnet directly (via ARP).
- **Default Gateway:** Necessary for any traffic leaving the local subnet. If a PC can't ping the next hop, check Gateway and Mask consistency.
- **PT Quirk:** PCs need their IP configured via the Desktop IPv4 Manager to be persistent and visible to the API.

## 2. Dynamic Routing (OSPF/EIGRP)
- **OSPF:** 
  - Hello/Dead intervals must match. 
  - Areas must be connected to Area 0.
  - Wildcard masks are the inverse of subnets (e.g., /24 -> 0.0.0.255).
- **EIGRP:** 
  - AS number must match. 
  - K-values must match.

## 3. DHCP (Dynamic Host Configuration Protocol)
- **Process:** DORA (Discover, Offer, Request, Acknowledge).
- **Relay Agent:** If clients and server are in different VLANs, the Router/MLS interface for that VLAN needs `ip helper-address <DHCP_SERVER_IP>`.
- **Exclusions:** Always exclude Gateways and Static IPs before defining the pool to avoid conflicts.

## 4. NAT (Network Address Translation)
- **Inside/Outside:** You MUST define which interfaces are `ip nat inside` and `ip nat outside`.
- **PAT (Overload):** Map multiple private IPs to one public IP using `ip nat inside source list <ACL> interface <OUTSIDE_INT> overload`.
- **Static NAT:** 1-to-1 mapping for servers. `ip nat inside source static <LOCAL> <GLOBAL>`.
