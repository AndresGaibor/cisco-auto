# Expert Knowledge: Network Troubleshooting (The CCIE Way)

## 1. Bottom-Up Approach (Modelo OSI)
1.  **Physical:** `show ip interface brief`. Are the links UP? 
2.  **Data Link:** `show mac address-table` / `show vlan`. Are MACs learned? Are ports in the right VLAN?
3.  **Network:** `show ip route`. Does the path exist? Is the gateway correct?
4.  **Transport/App:** `telnet <ip> <port>`. Is the service listening?

## 2. Packet Tracer Engine Debugging
- **Timeout:** If the Bridge timeouts, the PT command queue is likely full. Clean the bridge directory.
- **[object Object]:** Native C++ exception. Wrap calls in try/catch and stringify the output inside PT.
- **Ghost Devices:** Devices that exist in memory but not on screen. Use the index-based cleanup method.

## 3. The 100% Rule
A lab is not complete until:
1.  Cables are green.
2.  IPs are assigned and PINGABLE.
3.  MAC tables are populated.
4.  Configs are saved (`copy run start`).
