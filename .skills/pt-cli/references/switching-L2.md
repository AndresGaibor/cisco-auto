# Expert Knowledge: Switching & Layer 2 (Cisco CCNA/CCNP)

## 1. MAC Address Learning
- **Process:** When a frame enters a port, the switch records the Source MAC and the port ID.
- **Aging:** Entries typically last 300 seconds.
- **Troubleshooting:** If `show mac address-table` is empty, check if the device has sent any traffic. Use a dummy ping to force ARP and populate the table.

## 2. VLANs & Trunks (802.1Q)
- **Access Ports:** Carry traffic for a single VLAN. Untagged.
- **Trunk Ports:** Carry multiple VLANs using tags. 
- **Native VLAN:** Untagged traffic on a trunk. MUST match on both ends to avoid "Native VLAN Mismatch" errors and potential security leaks (VLAN hopping).
- **VTP:** Use only if necessary. Prefer "Transparent" mode or manual configuration for automation stability.

## 3. Spanning Tree Protocol (STP)
- **Root Bridge Selection:** Lowest Priority + Lowest MAC.
- **Port States:** Blocking -> Listening -> Learning -> Forwarding.
- **Convergence:** Standard STP takes 50s. Rapid-PVST+ takes < 2s.
- **Packet Tracer Quirk:** Ports start in Amber (2). They won't pass traffic until they turn Green (1). Force simulation time if they are stuck.

## 4. EtherChannel (Aggregation)
- **LACP (802.3ad):** Standard protocol. Modes: Active/Passive.
- **PAgP:** Cisco proprietary. Modes: Desirable/Auto.
- **Rule:** Both sides must have matching speed, duplex, and allowed VLANs.
- **STP Interaction:** STP sees a Port-Channel as a single logical interface.
