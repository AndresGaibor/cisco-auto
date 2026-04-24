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

## 5. HSRP (Hot Standby Router Protocol)
- **Concept:** First-hop redundancy protocol. Virtual IP (VIP) points to active router.
- **States:** Active, Standby, Listen.
- **Priority:** Higher (110 > 100 > 90). Default 100.
- **Preempt:** Allows higher-priority router to become Active. Configure with `standby <group> preempt`.
- **Authentication:** Prevent spoofing. `standby <group> authentication <text>`.
- **Tracking:** Interface tracking reduces priority on link failure. `standby <group> track <interface> <decrement>`.
- **Timers:** Hello (default 3s), Hold (default 10s). `standby <group> timers <hello> <hold>`.
- **Version:** HSRP v1 (group 0-255) or v2 (0-4095). `standby <group> version <1|2>`.
- **Verification:** `show standby group <N>` shows State, Active router, Standby router, VIP.

### HSRP Configuration Pattern (IOS CLI)
```bash
# En router activo (prioridad más alta)
interface vlan <id>
  ip address <ip> <mask>
  no shutdown
  standby <group> ip <virtual-ip>
  standby <group> priority 110
  standby <group> preempt
  standby <group> authentication <key>
  standby <group> timers <hello> <hold>
  standby <group> track <interface>
  exit

# En router standby (prioridad menor)
interface vlan <id>
  ip address <ip> <mask>
  no shutdown
  standby <group> ip <virtual-ip>
  standby <group> priority 100
  standby <group> preempt
  standby <group> authentication <key>
  exit
```

### HSRP API (cisco-auto)
```typescript
import { SVIStandbyConfig, buildHSRPCommands } from "@cisco-auto/pt-control";

// Configuración HSRP
const standby: SVIStandbyConfig = {
  group: 1,
  virtualIP: "192.168.1.254",
  priority: 110,
  preempt: true,
  authentication: "cisco123",
  helloInterval: 3,
  holdTime: 10,
  trackInterface: "GigabitEthernet0/1",
  trackDecrement: 10,
  version: 1,
};

// Generar comandos IOS
const commands = buildHSRPCommands(vlanId, "192.168.1.10", "255.255.255.0", standby);
// Resultado:
// interface vlan 10
// ip address 192.168.1.10 255.255.255.0
// no shutdown
// standby 1 ip 192.168.1.254
// standby 1 priority 110
// standby 1 preempt
// standby 1 authentication cisco123
// standby 1 timers 3 10
// standby 1 track GigabitEthernet0/1 10
// exit
```

### HSRP Verification
```typescript
import { verifyStandby } from "@cisco-auto/pt-control";

// Verificar estado HSRP
const result = await verifyStandby("R1", 1);
// Verifica: group present, virtual IP, active router, state

// Diagnóstico HSRP
import { diagnoseHSRP, HSRP_INCONSISTENCIES } from "@cisco-auto/pt-control";
const diagnostics = await diagnoseHSRP("R1", 1, (cmd) => exec(cmd));
// Códigos: HSRP_NO_VIP, HSRP_NO_PREAMPT, HSRP_NO_AUTH, HSRP_PRIORITY_CROSS, etc.
```
