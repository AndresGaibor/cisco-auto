# Learnings
Created schema directory structure for Area A: packages/ios-domain/src/schemas/{routing,security,switching,services}
Reusable IOS value objects already exist and should be composed instead of duplicated: Ipv4Address, WildcardMask, InterfaceName, VlanId, AutonomousSystemNumber.
Canonical barrel style in ios-domain is explicit `export *`/named exports from `src/index.ts` and `src/value-objects/index.ts`.
Core validation already centralizes reusable helpers and error codes under `packages/core/src/validation/`, so new schemas should align with that pattern.
- ios-domain already centralizes reusable value objects for IPv4, wildcard masks, interface names, VLAN IDs, and ASN with parse/isValid helpers in src/value-objects/.
- Export style is split by package: ios-domain uses wildcard barrel re-exports from submodule indexes, while packages/types/src/schemas/index.ts uses explicit grouped named exports per domain.
- Validation layering already exists in packages/core/src/validation/ with shared ValidationCodes, ValidationResult helpers, and validator classes; interface/IP/VLAN checks are duplicated there and should be reused, not reinvented.
- Current OSPF-related Zod schema in packages/types/src/schemas/protocols.ts is still loose (strings/numbers), so future ios-domain schema work should compose around shared value objects rather than hardcoding network rules.
- Zod 4 `z.record()` needs an explicit string key schema when the value schema is an object; otherwise it can treat the object schema as the key schema and reject valid JSON object keys.
- OSPF schema implementation requires Zod 4 superRefine for custom error messages to properly surface validation errors from value objects.
- InterfaceName validation accepts names like GigabitEthernet0/0 but rejects invalid formats like GigabitEthernet0/0/ (trailing slash) or names starting with numbers.
- Test cases must use actually invalid strings that fail the underlying value object validation, not just semantically invalid ones.
- Final implementation uses Zod 4 `refine(..., { error: ... })` with value objects and `z.record(z.string(), ...)` for optional area settings; this produced the intended custom messages and valid record parsing.
- EIGRP schema implemented reusing existing value objects (Ipv4Address, WildcardMask, InterfaceName, ASN parseAsn). Confirmed patterns from OSPF schema are reusable. (2026-04-09)
- BGP schema can stay minimal: device/type/autonomousSystem/neighbors/networks was enough, and `parseAsn` plus `isValidIpWithPrefix` were sufficient for validation without extra fields.

17. - ACL schema implementation reutiliza los value objects existentes (Ipv4Address, WildcardMask) para validación de direcciones IP y wildcard masks, siguiendo el patrón establecido en OSPF/EIGRP/BGP schemas.
18. - Los tests de schemas en ios-domain siguen el patrón: parseX() para safeParse (con result.success/result.data/result.error.issues) y parseXStrict() para parsing directo que lanza excepciones en entradas inválidas.
19. - En Zod 4, los errores de validación se encuentran en result.error.issues[0] (no en result.error.errors[0]), y el código de error varía según el tipo de validación (invalid_value, invalid_literal, invalid_union, etc.).
20. - El campo protocol en ACLs puede aceptar tanto nombres de protocolos literales ('ip', 'tcp', 'udp', 'icmp') como números de protocolo (0-255), lo cual se implementa con z.union([z.literal('ip'), ..., z.number().int().min(0).max(255)]).
21. - Las especificaciones de puertos en ACLs siguen patrones como 'eq 80', 'lt 1024', 'gt 1023', 'neq 80', 'range 8000 8080', los cuales se validan con expresiones regulares en refine().

22. - Los tests de validación de schemas siguen el patrón establecido: usar parseX() para safeParse (verificando result.success y accediendo a result.data) y parseXStrict() dentro de expect(() => ...).toThrow() para casos inválidos.
23. - En Zod 4, los errores de validación se acceden mediante result.error.issues[0] (no result.error.errors[0]), y el código de error depende del tipo de validación (invalid_value, invalid_literal, invalid_union, etc.).
24. - Los mensajes de error personalizados en refine() se preservan correctamente cuando se usan con value objects como Ipv4Address y WildcardMask.


## NAT Schema Implementation Learnings

25. - NAT schema implementation reutiliza el value object InterfaceName para validación de nombres de interfaces, siguiendo el patrón establecido en ACL/OSPF/EIGRP/BGP schemas.
26. - El schema NAT es minimalista y se enfoca únicamente en los campos requeridos por el plan: type (static/dynamic/pat), insideInterface y outsideInterface.
27. - Los tests de validación siguen el mismo patrón que los schemas anteriores: usando parseNatConfig() para safeParse y parseNatConfigStrict() para casos que deben lanzar excepciones.
28. - En Zod 4, los errores de validación se acceden mediante result.error.issues[0], y el código de error para refine() es 'custom' cuando se proporciona un mensaje de error personalizado.
29. - Los mensajes de error personalizados en refine() se preservan correctamente cuando se usan con value objects como InterfaceName.

## DHCP Schema Implementation Learnings

30. - DHCP schema implementation reutiliza los value objects existentes (Ipv4Address, IpWithPrefix) para validación de direcciones IP y redes, siguiendo el patrón establecido en otros schemas.
31. - El schema DHCP es minimalista y se enfoca únicamente en los campos requeridos por el plan: poolName (string), network (IP/prefix), defaultRouter (IP), dnsServer (IP opcional).
32. - Los tests de validación siguen el mismo patrón que los schemas anteriores: usando parseDhcpConfig() para safeParse y parseDhcpConfigStrict() para casos que deben lanzar excepciones.
33. - En Zod 4, los errores de validación se acceden mediante result.error.issues[0], y el código de error para refine() es 'custom' cuando se proporciona un mensaje de error personalizado.
34. - Los mensajes de error personalizados en refine() se preservan correctamente cuando se usan con value objects como Ipv4Address y IpWithPrefix.
35. - Para rechazar campos extra en Zod 4, es necesario usar .strict() en el schema, lo cual hace que safeParse() falle cuando hay campos no reconocidos.
36. - El valor object IpWithPrefix ya incluye validación completa para formato CIDR (IP/prefix), por lo que no se necesita validación adicional de máscara o prefijo.
37. - Los tests deben verificar que los mensajes de error contengan las cadenas esperadas de los refine() de los value objects subyacentes.

## Barrel Exports Implementation Learnings

38. - Created barrel exports for iOS schemas following the established pattern: one index.ts per subdirectory (routing, security, switching, services) and a root schemas/index.ts that re-exports all schemas.
39. - Barrel exports only export the Zod schemas (OspfConfigSchema, etc.) NOT the parser functions, keeping parser functions at individual file level as required.
40. - Used explicit named exports rather than wildcard exports for better clarity and maintainability.
41. - Verified that imports work correctly: `import { OspfConfigSchema, EigrpConfigSchema } from '@cisco-auto/ios-domain/schemas'` succeeds.
42. - All schema tests pass (78 tests) confirming barrel exports don't break existing functionality.
43. - Followed the existing pattern in the codebase where schemas use `.ts` extensions and value objects are composed from existing reusable objects.
44. - Task 12 base generator contract was added in `packages/ios-domain/src/generators/types.ts` with a minimal `GeneratedCommand` interface and `CommandGenerator` function type, and the file type-checks in isolation.
