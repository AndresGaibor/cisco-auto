# Expert Knowledge: Security & Device Hardening

## 1. Management Access (SSH)
- **Requirements:** 
  1. Hostname.
  2. Domain-name.
  3. RSA Keys (`crypto key generate rsa`).
  4. Local User.
  5. VTY restricted (`transport input ssh`).
- **Automation Tip:** Use `config-ios` to push these in a single batch.

## 2. ACLs (Access Control Lists)
- **Standard:** Only filter by Source. Apply as close to the Destination as possible.
- **Extended:** Filter by Source, Destination, Protocol, and Port. Apply as close to the Source as possible.
- **Implicit Deny:** Remember that every ACL ends with a hidden `deny any any`. If you write a single `deny`, you block EVERYTHING else.

## 3. Port Security (L2 Security)
- **Sticky MAC:** Learns the MAC and records it in the config.
- **Violation Modes:** 
  - Shutdown (Default): Disables the port.
  - Restrict: Blocks traffic, logs the event.
  - Protect: Blocks traffic, no logs.

## 4. HSRP Security
- **Authentication:** Always configure authentication to prevent spoofing attacks.
  ```bash
  standby 1 authentication cisco123
  ```
- **MD5:** For stronger auth, use MD5.
  ```bash
  standby 1 authentication md5 key-chain HSRP-KEYS
  ```
- **Best Practices:**
  - Use different keys per group.
  - Change keys periodically.
  - Monitor for auth failures: `show standby`.
