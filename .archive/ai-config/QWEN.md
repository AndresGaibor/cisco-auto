## Qwen Added Memories
- Fixed critical CIDR to subnet mask conversion bug in NetworkUtils.cidrToMask - replaced unsafe 32-bit signed bitwise operations with safe arithmetic method. Also fixed cidrToWildcard and added comprehensive unit tests. Files: packages/core/src/config-generators/utils.ts, packages/core/src/canonical/types.ts
- Fixed ACL generation for standard named ACLs - removed incorrect protocol inclusion in standard ACL rules. Standard ACLs only filter by source address, never by protocol. File: packages/core/src/config-generators/security-generator.ts
- Fixed VirtualTopology + ValidationEngine critical issues:
1. getSnapshot() now returns structuredClone(snapshot) directly - removed buggy caching
2. ValidationEngine.run() has try/catch for rule errors, produces RULE_ERROR diagnostics
3. ValidationEngine has automatic caching with TTL=5s, MAX_SIZE=100
4. Added metadata to ValidationResult (durationMs, rulesExecuted, cacheHit)
5. Issue #2 (device type inference) was already implemented via inferDeviceType()
Test bug noted: validation-engine.test.ts line 137 compares full results but metadata differs between cache hit/miss - should only compare diagnostics.
- Implemented Router ID validation for OSPF, EIGRP, and BGP protocols. Added RoutingGenerator.validate() method that checks IPv4 format for router IDs and warns when OSPF has no explicit router-id. File: packages/core/src/config-generators/routing-generator.ts
- Created PortTemplateGenerator for switch port configurations by model. Provides templates for access, trunk, voice, guest, management, server, uplink, and shutdown ports. Includes validation and port discovery from switch catalog. Files: packages/core/src/config-generators/port-template.generator.ts + tests
- Added customizable IOS section ordering with SectionOrderConfig class. Default order follows Cisco best practices: basic, vlans, vtp, interfaces, routing, security, lines. Supports custom order, validation, and programmatic reordering. File: packages/core/src/config-generators/ios-generator.ts
- Implemented ConfigDiffer for incremental configuration deployment. Compares running-config vs desired-config, generates added/removed commands, rollback scripts, and identifies affected sections. Supports ignore comments/blank/case options. File: packages/core/src/config-generators/config-differ.ts
- Implementación completa de TODOS los problemas del análisis VirtualTopology + ValidationEngine:

**Issues #1-3 (críticos):**
1. getSnapshot() ahora usa structuredClone() directo - sin caching bug
2. inferDeviceType() ya existía - funciona correctamente
3. ValidationEngine.run() tiene try/catch - errores como RULE_ERROR diagnostics

**Issues #4-10 (resto):**
4. vlanExistsRule: getDeviceVlans() verifica config.global + puertos + SVIs
5. replaceSnapshot: usa calculateDeltaFrom optimizado
6. calculateDeltaFrom: early exit, detectDeviceChanges(), detectLinkChanges()
7. ValidationEngine: caching automático con TTL=5s, MAX_SIZE=100, metadata
8. gatewayReachabilityRule: verifica subnet, existe gateway, path BFS, links L2
9. loopDetectionRule: DFS para ciclos, detecta L2 devices, verifica STP
10. ReactiveTopology: auto-validación con debounce, ValidationEngine integrado

**Archivos nuevos:**
- src/validation/rules/loop-detection.rule.ts (222 líneas)
- src/validation/reactive-topology.ts (308 líneas)

**Archivos modificados:**
- src/vdom/index.ts: getSnapshot(), calculateDeltaFrom optimizado
- src/validation/validation-engine.ts: caching, error handling, metadata
- src/validation/rules/vlan-exists.rule.ts: getDeviceVlans()
- src/validation/rules/gateway-reachability.rule.ts: ipToInt(), hasPath(), subnet check
- src/validation/rules/index.ts: exporta loopDetectionRule
- Implemented DeviceSpecValidator for comprehensive pre-generation device validation. Validates interfaces (names, IPs, VLANs), VLANs (IDs, duplicates, names), routing (OSPF/EIGRP/BGP router IDs, ASNs), security (ACL rules), and topology (duplicate IPs/router IDs across devices). File: packages/core/src/validation/device-spec.validator.ts with 32 tests
